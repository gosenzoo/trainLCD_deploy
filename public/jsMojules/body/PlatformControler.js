class PlatformController {
    constructor(setting, platformDrawer){
        this.setting = setting;
        this.platformDrawer = platformDrawer;

        console.log("PlatformController初期化完了");
    }

    extractDrawParams(progressParams){
        return {

        }
    }

    createAll(progressParams){
        let drawParams = this.extractDrawParams(progressParams);
        return this.platformDrawer.createAll(drawParams, 1);
    }
}