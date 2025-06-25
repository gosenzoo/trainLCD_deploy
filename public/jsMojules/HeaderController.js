class HeaderController{
    constructor(setting, headerDrawer){
        this.setting = setting;
        this.headerDrawer = headerDrawer;
        /*
        this.trainTypeObject = null; //列車種別オブジェクト
        this.destinationText = null; //行先・経由地のテキスト
        this.viaText = null; //経由地のテキスト
        this.carNumText = null; //号車のテキスト
        this.headerStation = null; //ヘッダーの駅オブジェクト
        */
       console.log("HeaderController初期化完了");
    }

    //進行パラメータから描画用パラメータを抽出
    extractDrawParams(progressParams){
        let arrivingTextType;
        if(progressParams.posState === 1){ arrivingTextType = 1; } //停車駅駅手前状態は、まもなく
        else if(progressParams.runState === 1){ arrivingTextType = 2; } //停車中は、ただいま
        else{ arrivingTextType = 0; } //それ以外は、つぎは

        return {
            dispStation: this.setting.stationList[progressParams.currentStationInd],
            arrivingTextType: arrivingTextType,
            dispCarNum: this.setting.info.carNumber
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