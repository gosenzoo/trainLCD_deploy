export default class IndexClass {
    constructor(stationList) {
        this._nowStation = 0;  // 私的な変数（外部から直接アクセスしない）
        this.dispStationList = [];  // 監視されない普通のプロパティ
        this.stationList = stationList;
    }

    get nowStation() {
        return this._nowStation;
    }

    set nowStation(value) {
        this._nowStation = value;
        // nowStationの値が変更されたときに、yの値も条件に応じて変更する
        if (value > 5) {
            this.dispStationList = 100;
        } else {
            this.dispStationList = 10;
        }
    }
}