class OverLineController {
    constructor(setting, overLineDrawer){
        this.setting = setting;
        this.overLineDrawer = overLineDrawer;

        console.log("OverLineController初期化完了");
    }

    extractDrawParams(progressParams, operation){
        return {

        }
    }

    createAll(progressParams, operation){
        let drawParams = this.extractDrawParams(progressParams, operation);
        return this.overLineDrawer.createAll(drawParams, 1);
    }
}