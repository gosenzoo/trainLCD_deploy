class TrasnferController {
    constructor(setting, transferDrawer){
        this.setting = setting;
        this.transferDrawer = transferDrawer;

        console.log("TransferDrawerController初期化完了");
    }

    extractDrawParams(progressParams){
        return {

        }
    }

    createAll(progressParams, operation){
        let drawParams = this.extractDrawParams(progressParams, operation);
        return this.transferDrawer.createAll(drawParams, 1);
    }
}