class DefaultLineController{
    constructor(setting, defaultLineDrawer){
        this.setting = setting;
        this.defaultLineDrawer = defaultLineDrawer;

        console.log("DefaultLineController初期化完了")
    }

    //進行パラメータから描画用パラメータを抽出
    extractDrawParams(progressParams){
        let stationFrameNum = 8; //本来settingから取得（setting側未対応）

        //描画対象駅オブジェクトを取得
        let startInd;
        if(progressParams.posState === 2) { startInd = progressParams.currentStationInd; }
        else{ startInd = progressParams.currentStationInd - 1; }
        let dispStationList = []
        let currentStationOnDisp;
        if(!this.setting.info.isLoop){ //環状運転でない場合
            if(startInd < this.setting.stationList.length - (stationFrameNum - 1)){ //終点近くでない場合、現在駅対応をdispに入れていく
                for(let i = startInd; i < startInd + stationFrameNum; i++){
                    dispStationList.push(this.setting.stationList[i])
                }
                currentStationOnDisp = 0; //終点近くでない場合は常に根本端に位置する
                if(progressParams.posState === 0 || progressParams.posState === 1){ currentStationOnDisp += 0.5; } //駅間にいる場合は半駅分進める
            }
            else{ //終点近くの場合、残りを入れていく
                //console.log("終点近くです")
                for(let i = this.setting.stationList.length - stationFrameNum; i < this.setting.stationList.length; i++){
                    dispStationList.push(this.setting.stationList[i]);
                }
                currentStationOnDisp = progressParams.currentStationInd - (this.setting.stationList.length - stationFrameNum);
                if(progressParams.posState === 0 || progressParams.posState === 1){ currentStationOnDisp -= 0.5; } //駅間にいる場合は半駅分戻る
            }
        }
        else{ //環状運転の場合
            for(let i = 0; i < stationFrameNum; i++){
                dispStationList.push(getCircularItem(this.setting.stationList, startInd + i))
            }
            currentStationOnDisp = 0; //環状運転では常に根本端に位置する
            if(progressParams.posState === 0 || progressParams.posState === 1){ currentStationOnDisp += 0.5; } //駅間にいる場合は半駅分進める
        }
        //console.log("dispStationList", dispStationList);

        //線色を、現在駅番号から駅枠数+1個取得
        let colorList = [];
        for(let i = 0; i < stationFrameNum + 1; i++){
            if(i === stationFrameNum){ //最後なら
                colorList.push(dispStationList[i-1].lineColor);
                continue;
            }
            colorList.push(dispStationList[i].lineColor);
        }

        let passStationList = dispStationList.map(station => {
            return station.isPass;
        });

        return {
            dispStationList: dispStationList,
            stationFrameNum: stationFrameNum,
            colorList: colorList,
            passStationList: passStationList,
            hereDrawPos: currentStationOnDisp,
            lineDict: this.setting.lineDict
        }
    }

    createAll(progressParams){
        let drawParams = this.extractDrawParams(progressParams);
        return this.defaultLineDrawer.createAll(drawParams, 1);
    }
}