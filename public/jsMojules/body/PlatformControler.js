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

        let slotNum = parseInt(dispStation.slotNum); //スロット数
        let leftSlotInd = parseInt(dispStation.leftSlotInd); //自列車の左端スロット
        let otherCarNum = parseInt(dispStation.otherCarNum); //対面列車の両数
        let otherLeftSlotInd = parseInt(dispStation.otherLeftSlotInd); //対面列車の左端スロット
        console.log(slotNum, leftSlotInd, otherCarNum, otherLeftSlotInd);

        const displayWidth = 1920;
        const headOffset = parseInt(operation.headOffset); //自列車スロットの左端オフセット
        const backOffset = parseInt(operation.backOffset); //自列車スロットの右端オフセット
        const gap = 5; //自列車の車両同士の間隔
        const wholeLength = displayWidth - headOffset - backOffset; //自列車スロットの全長

        //号車番号
        const carLabelText = operation.carNumberList;//仮データ
        const carLabels = carLabelText.split(",");
        const highlightCarId = carLabels.findIndex(label => label.includes("*"));
        const cars = carLabels.length;

        //パラメータが初期値だった時の初期化
        if(slotNum <= 0){
            slotNum = cars;
        }
        if(otherCarNum <= 0){
            otherCarNum = cars;
        }

        const slotLength = (wholeLength - (slotNum - 1) * gap) / (slotNum); //自列車スロットの１スロット長
        const labelWidth = slotLength - 10;

        let baseX0 = headOffset; //セクションの左端

        //自列車の左端座標
        let myLeft;
        if(leftSlotInd !== 0){
            myLeft = baseX0 + (Math.abs(leftSlotInd) * slotLength + (Math.abs(leftSlotInd) - 1) * gap) * (leftSlotInd / Math.abs(leftSlotInd));
        }
        else{
            myLeft = baseX0;
        }
        //自列車の全長
        let myWholeLength = slotLength * cars + gap * (slotNum - 1);
        //自列車のbaseX
        let baseX;
        if(operation.leftOrRight === "right"){
            baseX = myLeft + myWholeLength;
        }
        else{
            baseX = myLeft;
        }
        console.log(myLeft, myWholeLength)

        if(highlightCarId !== -1){
            carLabels[highlightCarId] = carLabels[highlightCarId].replace("*", "");
        }
        //自分の列車
        let trainParams = {
            cars: cars, //両数
            carLength: slotLength, //車両長
            highlightCarId: highlightCarId, //ハイライト車両
            carLabels: carLabels, //号車番号テキスト
            labelWidth: labelWidth, //号車番号ラベル幅
            baseX: baseX, //先端座標
            gap: gap //車両間間隔
        }

        //対面列車の比率求める
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

        //対面列車の左端座標
        let otherLeft;
        if(otherLeftSlotInd !== 0){
            otherLeft = baseX0 + (Math.abs(otherLeftSlotInd) * slotLength + (Math.abs(otherLeftSlotInd) - 1) * gap) * (otherLeftSlotInd / Math.abs(otherLeftSlotInd));
        }
        else{
            otherLeft = baseX0;
        }
        //対面列車の全長
        let otherWholeLength = slotLength * otherCarNum + gap * (slotNum - 1);
        //対面列車のbaseX
        let otherbaseX;
        if(operation.leftOrRight === "right"){
            otherbaseX = otherLeft + otherWholeLength;
        }
        else{
            otherbaseX = otherLeft;
        }
        console.log(otherLeft, otherWholeLength)

        //向かい側の列車
        let otherTrainParams = {
            cars: otherCarNum,
            carLength: slotLength * ratio,
            baseX: (otherbaseX - centerX) * ratio + centerX,
            wholeLength: otherWholeLength * ratio,
            gap: gap * ratio
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