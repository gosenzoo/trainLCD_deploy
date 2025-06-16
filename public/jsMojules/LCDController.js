class LCDController{
    constructor(setting, mapSVG){
        this.setting = setting; //設定を保存
        this.stopStationList = getStopStation(this.setting.stationList, this.setting.info.isLoop); //停車駅リストを保存
        this.dispPageList = [["defaultLine"], ["defaultLine"], ["defaultLine"]]; //表示ページリストを初期化
        //進行状況コントローラーを初期化
        //stopList決め打ち（要修正）
        this.progressController = new ProgressController(this.setting.stationList.length, [1, 1, 0, 0, 1, 0, 1, 0, 1], this.setting.info.isLoop);
        //ヘッダーコントローラーを初期化
        this.headerController = new HeaderController(mapSVG.querySelector("#header")); //ヘッダーコントローラーを初期化
        //コントローラー辞書を初期化
        this.bodyControllerDict = {
            //"defaultLine": new DefaultLineController(displayType)
        };
        
        this.bodyController = null; //使用するボディコントローラーを初期化
    }

    moveStation(step){
        this.progressController.moveStation(step); //現在の駅インデックスを更新
        console.log("runState: " + this.progressController.runState, "posState: " + this.progressController.posState, "駅インデックス: " + this.progressController.currentStationInd, this.progressController.isCurrentStationStop ? "停車":"通過");
    }
    moveState(step){
        this.progressController.moveState(step); //進行状態を更新
        console.log("runState: " + this.progressController.runState, "posState: " + this.progressController.posState, "駅インデックス: " + this.progressController.currentStationInd, this.progressController.isCurrentStationStop ? "停車":"通過");
    }

    getDrawedSVG(){

    }
}