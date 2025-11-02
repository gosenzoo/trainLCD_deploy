class OverLineController {
    constructor(setting, overLineDrawer){
        this.setting = setting;
        this.overLineDrawer = overLineDrawer;

        console.log("OverLineController初期化完了");
    }

    extractDrawParams(progressParams){
        return {

        }
    }

    createAll(progressParams){
        let drawParams = this.extractDrawParams(progressParams);
        return this.overLineDrawer.createAll(drawParams, 1);
    }
}