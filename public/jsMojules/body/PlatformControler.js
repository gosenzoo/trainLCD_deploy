class PlatformController {
    constructor(setting, platformDrawer){
        this.setting = setting;
        this.platformDrawer = platformDrawer;

        console.log("PlatformController初期化完了");
    }

    extractDrawParams(progressParams){
        let dispStation;
        let i = 0;
        do{
            dispStation = this.setting.stationList[progressParams.currentStationInd + i];
            i++;
        }while(dispStation.isPass);

        const headOffset = parseInt(this.setting.operation.headOffset);//仮データ
        const backOffset = parseInt(this.setting.operation.backOffset);//仮データ
        const gap = 5;
        const wholeLength = 1920 - headOffset - backOffset;

        const carLabelText = this.setting.operation.carNumberList;//仮データ
        const carLabels = carLabelText.split(",");
        const highlightCarId = carLabels.findIndex(label => label.includes("*"));
        const cars = carLabels.length;

        const carLength = (wholeLength - (cars - 1) * gap) / (cars);
        const labelWidth = carLength - 10;

        let baseX;
        if(this.setting.operation.leftOrRight === "right"){
            baseX = 1920 - headOffset;
        }
        else{
            baseX = headOffset;
        }

        if(highlightCarId !== -1){
            carLabels[highlightCarId] = carLabels[highlightCarId].replace("*", "");
        }
        let trainParams = {
            cars: cars,
            carLength: carLength,
            highlightCarId: highlightCarId,
            carLabels: carLabels,
            labelWidth: labelWidth,
            baseX: baseX
        }

        return {
            leftOrRight: this.setting.operation.leftOrRight,
            dispStation: dispStation,
            trainParams: trainParams,
            lineDict: this.setting.lineDict,
            isDrawLine: this.setting.operation.isDrawLine,
            carLineColor: this.setting.operation.carLineColor
        }
    }

    createAll(progressParams){
        let drawParams = this.extractDrawParams(progressParams);
        return this.platformDrawer.createAll(drawParams, 1);
    }
}