class FooterDrawer{
    constructor(mapSVG, iconDict, animator){
        this.mapSVG = mapSVG;
        this.iconDict = iconDict;
        this.textDrawer = new TextDrawer(this.iconDict); //テキスト描画用のインスタンスを生成
        this.animator = animator;

        console.log("FooterDrawer初期化完了");
    }

    createAll(drawParams, size){ //全てのフッター要素を組み立て
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        group.appendChild(this.createEstimateTimeTextEng("Estimated time required."));

        return group;
    }
    createEstimateTimeTextEng(text){
        const estimateTextEngRect = this.mapSVG.getElementById("footer-estimateTimeText").cloneNode(true); //テンプレートをクローン
        const estimateTextEng = this.textDrawer.createByAreaEl(text, estimateTextEngRect).element;
        return estimateTextEng;
    }
}