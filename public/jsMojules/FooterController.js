class FooterController{
    constructor(setting, footerDrawer){
        this.setting = setting;
        this.footerDrawer = footerDrawer;

        console.log("FooterController初期化完了")
    }

    //進行パラメータから描画用パラメータを抽出
    extractDrawParams(progressParams){
        this.setting.info.isDrawTime

        return {

        }
    }

    createAll(progressParams){
        let drawParams = this.extractDrawParams(progressParams);
        return this.footerDrawer.createAll(drawParams, 1);
    }
}