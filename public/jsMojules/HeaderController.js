class HeaderController{
    constructor(setting, headerDrawer){
        this.setting = setting;
        this.headerDrawer = headerDrawer;

        console.log("HeaderController初期化完了");
    }

    //進行パラメータから描画用パラメータを抽出
    extractDrawParams(progressParams, operation){
        let arrivingTextType;
        if(progressParams.posState === 1){ arrivingTextType = 1; } //停車駅駅手前状態は、まもなく
        else if(progressParams.runState === 1){ arrivingTextType = 2; } //停車中は、ただいま
        else{ arrivingTextType = 0; } //それ以外は、つぎは

        let dispStation;
        let i = 0;
        do{
            dispStation = this.setting.stationList[progressParams.currentStationInd + i];
            i++;
        }while(dispStation.isPass);

        return {
            dispStation: dispStation,
            arrivingTextType: arrivingTextType,
            dispCarNum: operation.carNumber,
            destinationText: operation.destination,
            destinationKana: operation.destinationKana,
            destinationEng: operation.destinationEng,
            destinationNum: operation.destinationNum,
            destinationColor: operation.destinationColor,
            destinationNumIconKey: operation.destinationNumIconKey,
            viaText: operation.direction,
            trainType: {text: operation.trainType, color: operation.trainTypeColor},
            trainTypeEng: operation.trainTypeEng,
            trainTypeSub: operation.trainTypeSub,
            trainTypeSubEng: operation.trainTypeSubEng,
            isLongStop: progressParams.isLongStop, //長時間停車中かどうか
            isTerminal: progressParams.isTerminal, //終着駅かどうか（終着駅表示を出すかどうか）
        }
    }

    createAll(progressParams, operation){
        let drawParams = this.extractDrawParams(progressParams, operation);
        return this.headerDrawer.createAll(drawParams, 1);
    }
}