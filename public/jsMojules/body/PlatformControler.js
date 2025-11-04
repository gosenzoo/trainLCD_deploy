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

        return {
            leftOrRight: this.setting.info.leftOrRight,
            dispStation: dispStation,
        }
    }

    createAll(progressParams){
        let drawParams = this.extractDrawParams(progressParams);
        return this.platformDrawer.createAll(drawParams, 1);
    }
}