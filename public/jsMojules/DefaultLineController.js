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
        let dispStationListStartInd; //表示駅リスト左端駅の、全体リスト上でのインデックス
        let hereDrawPos;
        if(!this.setting.info.isLoop){ //環状運転でない場合
            if(startInd < this.setting.stationList.length - (stationFrameNum - 1)){ //終点近くでない場合、現在駅対応をdispに入れていく
                dispStationListStartInd = startInd;
                for(let i = startInd; i < startInd + stationFrameNum; i++){
                    dispStationList.push(this.setting.stationList[i])
                }
                hereDrawPos = 0; //終点近くでない場合は現在地が常に根本端に位置する
                if(progressParams.posState === 0 || progressParams.posState === 1){ hereDrawPos += 0.5; } //駅間にいる場合は半駅分進める
            }
            else{ //終点近くの場合、残りを入れていく
                //console.log("終点近くです")
                dispStationListStartInd = this.setting.stationList.length - stationFrameNum;
                for(let i = this.setting.stationList.length - stationFrameNum; i < this.setting.stationList.length; i++){
                    dispStationList.push(this.setting.stationList[i]);
                }
                //現在地アイコンの位置を決める
                hereDrawPos = progressParams.currentStationInd - (this.setting.stationList.length - stationFrameNum);
                if(progressParams.posState === 0 || progressParams.posState === 1){ hereDrawPos -= 0.5; } //駅間にいる場合は半駅分戻る
            }
        }
        else{ //環状運転の場合
            for(let i = 0; i < stationFrameNum; i++){
                dispStationList.push(getCircularItem(this.setting.stationList, startInd + i))
            }
            hereDrawPos = 0; //環状運転では常に根本端に位置する
            if(progressParams.posState === 0 || progressParams.posState === 1){ hereDrawPos += 0.5; } //駅間にいる場合は半駅分進める
        }

        //dispStationListを最小描画数に対応させ、端折り位置を取得
        let minVisibleNum = 2;
        let lineLeapPosList = [];
        let stopCnt = 0;
        let ind;
        for(ind = 1; ind < stationFrameNum - minVisibleNum; ind++){
            if(!dispStationList[ind].isPass){ stopCnt++; } //停車駅をカウント
        }
        let listInd = dispStationListStartInd + ind;
        let needNum = 1;
        while(stopCnt < minVisibleNum){
            dispStationList[ind] = null;
            dispStationList[ind] = this.setting.stationList[listInd];
            //もともと停車駅ならカウントアップ
            if(!dispStationList[ind].isPass){ stopCnt++; }

            if(stopCnt < needNum){ //その時点での必要個数に達していなかったら、波線を入れて停車駅をたどっていく
                lineLeapPosList.push(ind);
                while(this.setting.stationList[listInd].isPass){ //最初に停車駅に当たるまで
                    listInd++;
                }
                dispStationList[ind] = this.setting.stationList[listInd];
                stopCnt++;
            }
            ind++;
            needNum++;
            listInd++;
        }

        //線色を、現在駅番号から駅枠数+1個取得
        let colorList = [];
        for(let i = 0; i < stationFrameNum + 1; i++){
            if(i === stationFrameNum){ //最後なら
                colorList.push(dispStationList[i-1].lineColor);
                continue;
            }
            colorList.push(dispStationList[i].lineColor);
        }

        //通過駅リストを抽出
        let passStationList = dispStationList.map(station => {
            return station.isPass;
        });
        //通った駅リストを抽出
        let leftStationList = [];
        for(let i = 0; i < stationFrameNum; i++){
            if(i < hereDrawPos){ leftStationList.push(1); }
            else{ leftStationList.push(0); }
        }

        //始点端・終点端かどうか
        const isStart = (!this.setting.info.isLoop) && (dispStationListStartInd === 0);
        const isEnd = (!this.setting.info.isLoop) && (dispStationListStartInd + stationFrameNum === this.setting.stationList.length);

        return {
            dispStationList: dispStationList,
            stationFrameNum: stationFrameNum,
            colorList: colorList,
            passStationList: passStationList,
            leftStationList: leftStationList,
            hereDrawPos: hereDrawPos,
            lineDict: this.setting.lineDict,
            lineLeapPosList: lineLeapPosList,
            isStart: isStart,
            isEnd: isEnd,
            leftOrRight: this.setting.info.leftOrRight
        }
    }

    createAll(progressParams){
        let drawParams = this.extractDrawParams(progressParams);
        return this.defaultLineDrawer.createAll(drawParams, 1);
    }
}