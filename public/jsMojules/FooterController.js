class FooterController{
    constructor(setting, footerDrawer){
        this.setting = setting;
        this.footerDrawer = footerDrawer;

        console.log("FooterController初期化完了")
    }

    //進行パラメータから描画用パラメータを抽出
    extractDrawParams(progressParams, operation){
        //表示駅取得
        let dispStation;
        let i = 0;
        do{
            dispStation = this.setting.stationList[progressParams.currentStationInd + i];
            i++;
        }while(dispStation.isPass);
        let dispStationInd = i  + progressParams.currentStationInd;

        //時間関連
        operation.isDrawTime;

        //〇〇のつぎは△△にとまります関連
        let isDrawStopText = operation.isDrawStopText;
        if(progressParams.isTerminal){
            //次が終点なら描画しない（するものがないので）
            isDrawStopText = 0;
        }
        let currentStationName;
        let nextStationName;
        if(isDrawStopText){
            //描画するなら、必要なパラメータ取得
            currentStationName = dispStation.name;

            //dispStationの次の駅取得
            let nextStation;
            let i = 0;
            do{
                nextStation = this.setting.stationList[dispStationInd + i];
                i++;
            }while(nextStation.isPass);

            nextStationName = nextStation.name;
        }

        return {
            isDrawStopText: isDrawStopText,
            currentStationName: currentStationName,
            nextStationName: nextStationName
        }
    }

    createAll(progressParams, operation){
        let drawParams = this.extractDrawParams(progressParams, operation);
        return this.footerDrawer.createAll(drawParams, 1);
    }
}