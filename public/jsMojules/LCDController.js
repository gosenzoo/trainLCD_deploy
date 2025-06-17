class LCDController{
    constructor(setting, mapSVG, displaySVG){
        this.setting = setting; //設定を保存
        this.mapSVG = mapSVG; //フォーマットSVG
        this.displaySVG = displaySVG; //描画先SVG

        this.stopStationList = getStopStation(this.setting.stationList, this.setting.info.isLoop); //停車駅リストを保存
        this.dispPageList = [["defaultLine"], ["defaultLine"], ["defaultLine"]]; //表示ページリストを初期化
        //進行状況コントローラーを初期化
        //stopList決め打ち（要修正）
        this.progressController = new ProgressController(this.setting.stationList.map(station => station.isPass), this.setting.info.isLoop);
        //ヘッダーコントローラーを初期化
        this.headerController = new HeaderController(setting, new HeaderDrawer(mapSVG, setting.iconDict)); //ヘッダーコントローラーを初期化
        /* //コントローラー辞書を初期化
        this.bodyControllerDict = {
            //"defaultLine": new DefaultLineController(displayType)
        };
        
        this.bodyController = null; //使用するボディコントローラーを初期化 */

        this.setLCDToDisplay()
    }

    moveStation(step){
        this.progressController.moveStation(step); //現在の駅インデックスを更新
        this.setLCDToDisplay()
    }
    moveState(step){
        this.progressController.moveState(step); //進行状態を更新
        this.setLCDToDisplay()
    }

    //描画先にLCDをレンダリング
    setLCDToDisplay(){
        this.setTempToDisplay(this.createLCD());
    }
    //描画先に仮描画先の内容を反映（レンダリング）
    setTempToDisplay(tempSVG){
        this.displaySVG.innerHTML = ""; // 既存の内容をクリア
        this.displaySVG.appendChild(tempSVG);
    }
    //tempSVGに、現在状態を反映したLCDを描画
    createLCD(){
        const tempSVG = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
        
        //仮描画先に、フォーマットSVGのフィルタと背景を追加
        tempSVG.appendChild(mapSVG.getElementById("defs").cloneNode(true))
        tempSVG.appendChild(mapSVG.getElementById("background").cloneNode(true));

        //ヘッダーを組み立てて追加
        tempSVG.appendChild(this.headerController.createAll(this.progressController.progressParams));

        return tempSVG;
    }
}