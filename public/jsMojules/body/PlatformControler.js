class PlatformController {
    constructor(setting, platformDrawer){
        this.setting = setting;
        this.platformDrawer = platformDrawer;

        console.log("PlatformController初期化完了");
    }

    extractDrawParams(progressParams, operation){
        let dispStation;
        let i = 0;
        do{
            dispStation = this.setting.stationList[progressParams.currentStationInd + i];
            i++;
        }while(dispStation.isPass);

        const displayWidth = 1920;
        const headOffset = parseInt(operation.headOffset);//仮データ
        const backOffset = parseInt(operation.backOffset);//仮データ
        const gap = 5;
        const wholeLength = displayWidth - headOffset - backOffset;

        const carLabelText = operation.carNumberList;//仮データ
        const carLabels = carLabelText.split(",");
        const highlightCarId = carLabels.findIndex(label => label.includes("*"));
        const cars = carLabels.length;

        const carLength = (wholeLength - (cars - 1) * gap) / (cars);
        const labelWidth = carLength - 10;

        let baseX;
        if(operation.leftOrRight === "right"){
            baseX = displayWidth - headOffset;
        }
        else{
            baseX = headOffset;
        }

        if(highlightCarId !== -1){
            carLabels[highlightCarId] = carLabels[highlightCarId].replace("*", "");
        }
        //自分の列車
        let trainParams = {
            cars: cars,
            carLength: carLength,
            highlightCarId: highlightCarId,
            carLabels: carLabels,
            labelWidth: labelWidth,
            baseX: baseX
        }

        //向かい側の列車求める
        let ratio; //消失点基準の拡大率
        let myY, otherY;
        const vanishY = -2000;
        const centerX = displayWidth / 2;
        if(operation.leftOrRight === dispStation.doorSide){
            //自分が奥なら
            myY = 480;//仮
            otherY = 804;//仮
        }
        else{
            //自分が手前なら
            myY = 818;
            otherY = 463;
        }
        ratio = (otherY - vanishY) / (myY - vanishY);

        //向かい側の列車
        let otherTrainParams = {
            cars: cars,
            carLength: carLength * ratio,
            baseX: (baseX - centerX) * ratio + centerX
        }

        //路線オブジェクトを求める
        const otherLineInd = dispStation.otherLineInd;
        let otherLineParams;
        if(Object.keys(this.setting.lineDict).includes(otherLineInd)){
            otherLineParams = this.setting.lineDict[otherLineInd];
        }
        else{
            otherLineParams = null;
        }

        return {
            leftOrRight: operation.leftOrRight,
            dispStation: dispStation,
            trainParams: trainParams,
            lineDict: this.setting.lineDict,
            isDrawLine: operation.isDrawLine,
            carLineColor: operation.carLineColor,
            otherTrainParams: otherTrainParams,
            otherLineParams: otherLineParams
        }
    }

    createAll(progressParams, operation){
        let drawParams = this.extractDrawParams(progressParams, operation);
        return this.platformDrawer.createAll(drawParams, 1);
    }
}