class LCDController{
    constructor(setting, mapSVG, numIconPresets, displaySVG){
        for(let i = 0; i < setting.stationList.length; i++){
            setting.stationList[i]._id = i;
        }
        console.log(setting);
        this.setting = setting; //設定を保存
        this.mapSVG = mapSVG; //フォーマットSVG
        this.displaySVG = displaySVG; //描画先SVG
        this.animator = new Animator(); //アニメーターを初期化
        this.numIconDrawer = new NumIconDrawer(numIconPresets); //ナンバリング記号ドロワーを初期化

        this.stopStationList = getStopStation(this.setting.stationList, this.setting.info.isLoop); //停車駅リストを保存
        //進行状況コントローラーを初期化
        this.progressController = new ProgressController(this.setting.stationList.map(station => station.isPass), this.setting.info.isLoop);
        this.progressController.onLongStop = () => { this.setLCDToDisplay(); console.log("長時間停車!") }; //長時間停車イベント時にLCDを更新
        //ヘッダーコントローラーを初期化
        this.headerController = new HeaderController(setting, new HeaderDrawer(mapSVG, setting.iconDict, this.animator, this.numIconDrawer)); //ヘッダーコントローラーを初期化
        //フッターコントローラを初期化
        this.footerController = new FooterController(setting, new FooterDrawer(mapSVG, setting.iconDict, this.animator, this.numIconDrawer)); //フッターコントローラーを初期化
        
        //デフォルト線路コントローラーを初期化
        this.defaultLineController = new DefaultLineController(setting, new DefaultLineDrawer(mapSVG, setting.iconDict, this.animator, this.numIconDrawer));
        //全体路線コントローラを初期化
        this.overLineController = new OverLineController(setting, new OverLineDrawer(mapSVG, setting.iconDict, this.animator, this.numIconDrawer));
        //ホーム案内コントローラーを初期化
        this.platformController = new PlatformController(setting, new PlatformDrawer(mapSVG, setting.iconDict, this.animator, this.numIconDrawer));
        //乗換案内画面コントローラーを初期化
        this.transferController = new TrasnferController(setting, new TransferDrawer(mapSVG, setting.iconDict, this.animator, this.numIconDrawer));

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
        
        //仮描画先に、フォーマットSVGのフィルタと背景を追加
        tempSVG.appendChild(mapSVG.getElementById("defs").cloneNode(true))
        tempSVG.appendChild(mapSVG.getElementById("background").cloneNode(true));

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
        if(nowOperation === null){ console.error("この区間の運用情報が定義されていません"); }

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