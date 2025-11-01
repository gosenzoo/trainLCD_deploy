class LCDController{
    constructor(setting, mapSVG, displaySVG){
        for(let i = 0; i < setting.stationList.length; i++){
            setting.stationList[i]._id = i;
        }
        console.log(setting);
        this.setting = setting; //設定を保存
        this.mapSVG = mapSVG; //フォーマットSVG
        this.displaySVG = displaySVG; //描画先SVG
        this.animator = new Animator(); //アニメーターを初期化

        this.stopStationList = getStopStation(this.setting.stationList, this.setting.info.isLoop); //停車駅リストを保存
        //進行状況コントローラーを初期化
        this.progressController = new ProgressController(this.setting.stationList.map(station => station.isPass), this.setting.info.isLoop);
        this.progressController.onLongStop = () => { this.setLCDToDisplay(); console.log("長時間停車!") }; //長時間停車イベント時にLCDを更新
        //ヘッダーコントローラーを初期化
        this.headerController = new HeaderController(setting, new HeaderDrawer(mapSVG, setting.iconDict, this.animator)); //ヘッダーコントローラーを初期化
        //フッターコントローラを初期化
        this.footerController = new FooterController(setting, new FooterDrawer(mapSVG, setting.iconDict, this.animator)); //フッターコントローラーを初期化
        
        //デフォルト線路コントローラーを初期化
        this.defaultLineController = new DefaultLineController(setting, new DefaultLineDrawer(mapSVG, setting.iconDict, this.animator));

        //[つぎは、まもなく、ただいま]の順
        this.pageList = [
            [[this.defaultLineController, 8000]],
            [[this.defaultLineController, 8000]],
            [[this.defaultLineController, 8000]]
        ];

        this.pageRotator = new PageRotator(() => {
            this.setLCDToDisplay();
        });

        this.pageRotator.restart(this.pageList[this.progressController.posState]);
    }

    moveStation(step){
        this.progressController.moveStation(step); //現在の駅インデックスを更新
        this.pageRotator.restart(this.pageList[this.progressController.posState]);
    }
    moveState(step){
        this.progressController.moveState(step); //進行状態を更新
        this.pageRotator.restart(this.pageList[this.progressController.posState]);
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

        //LCD要素を組み立てて追加
        this.animator.resetNum(); //アニメーターの番号をリセット
        tempSVG.appendChild(this.pageRotator.getCurrentPage().createAll(this.progressController.progressParams));
        tempSVG.appendChild(this.headerController.createAll(this.progressController.progressParams));
        //tempSVG.appendChild(this.footerController.createAll(this.progressController.progressParams));

        return tempSVG;
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