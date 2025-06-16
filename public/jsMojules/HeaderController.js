class HeaderController{
    constructor(headerSVG){
        this.trainTypeObject = null; //列車種別オブジェクト
        this.destinationText = null; //行先・経由地のテキスト
        this.viaText = null; //経由地のテキスト
        this.carNumText = null; //号車のテキスト
        this.headerStation = null; //ヘッダーの駅オブジェクト
        console.log(headerSVG);
    }

    update(params){
        this.trainTypeObject = params.trainTypeObject; //列車種別オブジェクトを更新
        this.destinationText = params.destinationText; //行先・経由地のテキストを更新
        this.viaText = params.viaText; //経由地のテキストを更新
        this.carNumText = params.carNumText; //号車のテキストを更新
        this.headerStation = params.station; //ヘッダーの駅オブジェクトを更新
    }
    getHeaderParams(){
        return {
            trainType: this.trainTypeObject, //列車種別オブジェクト
            destinationText: this.destinationText, //行先・経由地のテキスト
            viaText: this.viaText, //経由地のテキスト
            carNumText: this.carNumText, //号車のテキスト
            headerStation: this.headerStation //ヘッダーの駅オブジェクト
        }
    }
}