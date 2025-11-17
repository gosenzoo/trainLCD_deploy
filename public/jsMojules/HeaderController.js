class HeaderController{
    constructor(setting, headerDrawer){
        this.setting = setting;
        this.headerDrawer = headerDrawer;

        console.log("HeaderController初期化完了");
    }

    //進行パラメータから描画用パラメータを抽出
    extractDrawParams(progressParams){
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
            dispCarNum: this.setting.operation.carNumber,
            destinationText: this.setting.operation.destination,
            destinationKana: this.setting.operation.destinationKana,
            destinationEng: this.setting.operation.destinationEng,
            destinationNum: this.setting.operation.destinationNum,
            destinationColor: this.setting.operation.destinationColor,
            destinationNumIconKey: this.setting.operation.destinationNumIconKey,
            viaText: this.setting.operation.direction,
            trainType: {text: this.setting.operation.trainType, color: this.setting.operation.trainTypeColor},
            trainTypeEng: this.setting.operation.trainTypeEng,
            trainTypeSub: this.setting.operation.trainTypeSub,
            trainTypeSubEng: this.setting.operation.trainTypeSubEng,
            isLongStop: progressParams.isLongStop, //長時間停車中かどうか
            isTerminal: progressParams.isTerminal, //終着駅かどうか（終着駅表示を出すかどうか）
        }
    }

    createAll(progressParams){
        let drawParams = this.extractDrawParams(progressParams);
        return this.headerDrawer.createAll(drawParams, 1);
    }
    /*
    getHeaderParams(){
        return {
            trainType: this.trainTypeObject, //列車種別オブジェクト
            destinationText: this.destinationText, //行先・経由地のテキスト
            viaText: this.viaText, //経由地のテキスト
            carNumText: this.carNumText, //号車のテキスト
            headerStation: this.headerStation //ヘッダーの駅オブジェクト
        }
    }*/
}