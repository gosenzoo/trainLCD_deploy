class IndexClass {
    constructor(stationList, isLoop) {
        this.stationList = stationList; //停車駅リスト
        this._nowStationId = 0; //stationList中での現在駅id（外部から直接アクセスしない）
        //this.upStationId = 0; //上部に表示される駅のid
        this.dispStationList = []; //路線図に表示する駅のリスト
        this.dispStationListStart = 0; //表示駅リスト左端の駅の、stationList上でのid
        this.drawPos = 0; //画面上での現在位置id
        this.isLoop= isLoop; //環状運転するか
        this.dispStartNumber = stationList.length > 7 ? 0 : 8 - stationList.length; //路線図表示の左端位置
        
        //dispStationListを初期化
        for(let i = 0; i < 8 - this.dispStartNumber; i++){
            this.dispStationList.push(stationList[i])
        }
    }

    get nowStationId() {
        return this._nowStationId;
    }

    set nowStationId(value) {
        this._nowStationId = value;
        this.dispStationList = [];
        this.drawPos = 0;
        // nowStationIdの値が変更されたときに、yの値も条件に応じて変更する
        if (!this.isLoop) { //非環状運転時
            //コーナーケース処理
            if(value < 0){ this._nowStationId = 0; }
            if(value >= stationList.length){ this._nowStationId = stationList.length - 1; }
            if(value >= stationList.length - 1 && runState != 0){ this._nowStationId = stationList.length - 2; }
            
            if(this._nowStationId < stationList.length - 7){ //終点近くでない場合、nowStationId対応をdispに入れていく
                for(let i = 0; i < 8; i++){
                    this.dispStationList.push(stationList[this._nowStationId + i])
                }
                this.dispStationListStart = this._nowStationId;
            }
            else{ //終点近くの場合、stationListの末尾部分をdispに入れていき、drawPosを更新
                for(let i = 0; i < 8 - this.dispStartNumber; i++){
                    this.dispStationList.push(stationList[stationList.length - 8 + this.dispStartNumber + i])
                }
                this.drawPos = this._nowStationId - (stationList.length - 8);
                this.dispStationListStart = stationList.length - 8 + this.dispStartNumber;
            }
        } else { //環状運転時
            if(value < 0){ this._nowStationId = stationList.length - 1; }
            if(value >= stationList.length){ this._nowStationId = 0; }
            for(let i = 0; i < 8; i++){
                this.dispStationList.push(this.getCircularItem(stationList, this._nowStationId + i))
            }
        }
    }

    getCircularItem(arr, index) {
        // 配列の長さで割った剰余を計算することでインデックスを配列の範囲内に収める
        const circularIndex = ((index % arr.length) + arr.length) % arr.length;
        return arr[circularIndex];
      }
}