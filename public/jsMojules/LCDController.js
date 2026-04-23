class LCDController{
    constructor(setting, defsSVG, headerSVG, defaultLineSVG, platformSVG, numIconPresets, displaySVG){
        for(let i = 0; i < setting.stationList.length; i++){
            setting.stationList[i]._id = i;
        }
        console.log(setting);
        this.setting = setting; //設定を保存
        this.defsSVG = defsSVG; //グラデーション・フィルター定義SVG（全Drawer共通）
        this.headerSVG = headerSVG; //ヘッダー・フッター用SVG
        this.defaultLineSVG = defaultLineSVG; //標準路線図ボディ用SVG
        this.platformSVG = platformSVG; //ホーム案内ボディ用SVG
        this.displaySVG = displaySVG; //描画先SVG
        this.animator = new Animator(); //アニメーターを初期化
        this.numIconDrawer = new NumIconDrawer(numIconPresets); //ナンバリング記号ドロワーを初期化

        this.stopStationList = getStopStation(this.setting.stationList, this.setting.info.isLoop); //停車駅リストを保存
        //進行状況コントローラーを初期化
        this.progressController = new ProgressController(this.setting.stationList.map(station => station.isPass), this.setting.info.isLoop);
        this.progressController.onLongStop = () => { this.setLCDToDisplay(); console.log("長時間停車!") }; //長時間停車イベント時にLCDを更新
        //ヘッダーコントローラーを初期化
        this.headerController = new HeaderController(setting, new HeaderDrawer(headerSVG, setting.iconDict, this.animator, this.numIconDrawer));
        //フッターコントローラを初期化（フッターはdefaultLine.svgに含まれる）
        this.footerController = new FooterController(setting, new FooterDrawer(defaultLineSVG, setting.iconDict, this.animator, this.numIconDrawer));

        //デフォルト線路コントローラーを初期化
        this.defaultLineController = new DefaultLineController(setting, new DefaultLineDrawer(defaultLineSVG, setting.iconDict, this.animator, this.numIconDrawer));
        //全体路線コントローラを初期化
        this.overLineController = new OverLineController(setting, new OverLineDrawer(defaultLineSVG, setting.iconDict, this.animator, this.numIconDrawer));
        //ホーム案内コントローラーを初期化
        this.platformController = new PlatformController(setting, new PlatformDrawer(platformSVG, setting.iconDict, this.animator, this.numIconDrawer));
        //乗換案内画面コントローラーを初期化
        this.transferController = new TrasnferController(setting, new TransferDrawer(platformSVG, setting.iconDict, this.animator, this.numIconDrawer));

        //[つぎは、まもなく、ただいま、駅通過中]の順
        this.pageList = [
            [[this.defaultLineController, 8000]],
            [[this.platformController, 8000]],
            [[this.defaultLineController, 8000]],
            [[this.defaultLineController, 8000]]
        ];

        this.pageRotator = new PageRotator(() => {
            this.setLCDToDisplay();
        });

        this.pageRotator.restart(this.selectPage());
    }

    moveStation(step){
        this.progressController.moveStation(step); //現在の駅インデックスを更新
        this.pageRotator.restart(this.selectPage());
    }
    moveState(step){
        this.progressController.moveState(step); //進行状態を更新
        this.pageRotator.restart(this.selectPage());
    }

    //描画先にLCDをレンダリング
    setLCDToDisplay(){
        this.setTempToDisplay(this.createLCD());
    }
    //描画先に仮描画先の内容を反映（レンダリング）
    setTempToDisplay(tempSVG){
        this.displaySVG.innerHTML = ""; // 既存の内容をクリア
        this.displaySVG.innerHTML = tempSVG.outerHTML;
        this.restartAnimations(this.displaySVG); //アニメーションを再起動
    }
    //tempSVGに、現在状態を反映したLCDを描画
    createLCD(){
        const tempSVG = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
        
        //仮描画先に、defs.svgからフィルタ定義を、header.svgから背景を追加
        tempSVG.appendChild(this.defsSVG.getElementById("defs").cloneNode(true))
        tempSVG.appendChild(this.headerSVG.getElementById("background").cloneNode(true));

        //現在のoperationオブジェクトを取得
        const operation = this.getOperation(this.setting.operationList, this.progressController.progressParams.sectionInd);
        console.log(operation)
        //LCD要素を組み立てて追加
        this.animator.resetNum(); //アニメーターの番号をリセット
        tempSVG.appendChild(this.pageRotator.getCurrentPage().createAll(this.progressController.progressParams, operation));
        tempSVG.appendChild(this.headerController.createAll(this.progressController.progressParams, operation));
        tempSVG.appendChild(this.footerController.createAll(this.progressController.progressParams, operation));

        return tempSVG;
    }

    getOperation(operaionList, ind){
        // operationListは、[開始駅 startStationInd]パラメータを持つ。
        // startStationに停車中の状態から、最後の駅のまもなく状態までの表示

        // ソート
        operaionList.sort((a, b) => a.startStationInd - b.startStationInd);

        let nowOperation = null;
        operaionList.forEach(operation => {
            if(operation.startStationInd <= ind){
                nowOperation = operation;
            }
            else{
                return;
            }
        })

        // isPass が false の最後の駅を末尾停車駅とする。なければ stationList の最終要素を使用
        const stationList = this.setting.stationList;
        const lastStopStation = [...stationList].reverse().find(s => !s.isPass) ?? stationList[stationList.length - 1];

        // ① 運用データ自体が未設定の場合、デフォルト値で operation オブジェクトを生成する
        if(nowOperation === null){
            console.warn("この区間の運用情報が定義されていません。末尾停車駅をフォールバック行先として使用します。");
            nowOperation = {
                destination:          "",
                destinationKana:      "",
                destinationEng:       "",
                destinationNum:       "",
                destinationColor:     "",
                destinationNumIconKey:"",
                direction:        "",
                trainType:        "",
                trainTypeEng:     "",
                trainTypeSub:     "",
                trainTypeSubEng:  "",
                trainTypeColor:   "",
                lineLogo:         "",
                lineColor:        "",
                carNumber:        "",
                leftOrRight:      "right",
                isDispTime:       true,
                isDispLineName:   true,
                carNumberList:    "1*,2,3,4,5,6,7,8",
                headOffset:       "170",
                backOffset:       "170",
                isDrawStopText:   false,
                isDrawLine:       false,
                carLineColor:     "#FFFFFF",
                startStationInd:  "0"
            };
        }

        // ② 行先パラメータが空の場合、末尾停車駅の対応する値で補完する
        const destFallbackMap = [
            ['destination',           'name'],
            ['destinationKana',       'kana'],
            ['destinationEng',        'eng'],
            ['destinationNum',        'number'],
            ['destinationColor',      'lineColor'],
            ['destinationNumIconKey', 'numIconPresetKey'],
        ];
        destFallbackMap.forEach(([opField, stationField]) => {
            if(!nowOperation[opField] && lastStopStation?.[stationField]){
                nowOperation[opField] = lastStopStation[stationField];
            }
        });

        // ③ その他パラメータが空の場合、固定のデフォルト値で補完する
        const fixedFallbackMap = [
            ['carNumber',      '1'],
            ['trainType',      '普通'],
            ['trainTypeEng',   'Local'],
            ['trainTypeColor', '#0185ff'],
        ];
        fixedFallbackMap.forEach(([opField, defaultVal]) => {
            if(!nowOperation[opField]){
                nowOperation[opField] = defaultVal;
            }
        });

        return nowOperation;
    }

    selectPage(){
        switch(this.progressController.posState){
            case 0: //つぎは
                return this.pageList[0];
            case 1: //まもなく
                return this.pageList[1];
            case 2: //ただいま
                if(this.progressController.runState === 1){ //停車中
                    return this.pageList[2];
                }
                else{ //駅通過中
                    return this.pageList[3];
                }
            default:
                console.warn("不明な進行状態:", this.progressController.posState);
                break;
        }
    }

    //指定したSVG親要素内のすべてのアニメーション要素に対して beginElement() を適用する関数
    restartAnimations(parentNode) {
        const animTags = ["animate", "animateTransform", "animateMotion"];
        animTags.forEach(tag => {
            const animElements = parentNode.querySelectorAll(tag);
            animElements.forEach(el => {
                try {
                    el.beginElement();
                } catch (e) {
                    console.warn(`beginElement failed on`, el, e);
                }
            });
        });
    }
}