class ProgressController{
    constructor(passList, isLoop){
        this.passList = passList; //通過する駅のリスト(通過なら1)
        this.isLoop = isLoop; //環状運転かどうか
        this.stationNum = this.passList.length; //移動可能範囲の駅数
        this.statesPerStation = 3; //1駅あたりの状態数
        this.stateIndNum = this.statesPerStation * this.stationNum; //全状態数(1駅あたりの状態数 * 駅数)

        this.onLongStop = null; //長時間停車イベント時に呼び出す関数
        this.isLongStop = false; //長時間停車中かどうか

        this.stopTimerId = null; //停車時間計測用タイマー
        this.stopTimeLimit = 30000; //長時間停車とみなすまでの停車時間(ミリ秒)

        if(!this.isLoop){ //非環状運転時の状態インデックスの範囲を設定
            this.stationIndMin = this.statesPerStation - 1; //最小値
            this.stationIndMax = 3 * this.stationNum - 1; //最大値
        }
        else{ //環状運転時の状態インデックスの範囲を設定
            this.stationIndMin = 0; //最小値
            this.stationIndMax = 3 * this.stationNum - 1; //最大値
        }
        this._stateInd = this.statesPerStation - 1; //状態インデックス(状態数-1(1駅目の停車状態)で初期化)
        this.stateInd = this._stateInd; //セッターを通して初期化
    }

    set onLongStop(func){
        this._onLongStop = func; //長時間停車イベント時に呼び出す関数を設定
    }

    set stateInd(ind){
        //長時間停車タイマーリセット
        this.isLongStop = false;
        if(this.stopTimerId){ clearTimeout(this.stopTimerId); }
        this.stopTimer = null;

        if(!this.isLoop){ //環状運転でない場合、範囲外は端の値に設定
            if(ind < this.stationIndMin){ ind = this.stationIndMin; }
            if(this.stationIndMax < ind){ ind = this.stationIndMax; }
        }
        else{ //環状運転の場合、範囲外は循環する
            ind = ((ind % this.stateIndNum) + this.stateIndNum) % this.stateIndNum;
        }

        //移動先が通過駅かつ、駅手前だった場合。通過駅に駅手前の状態は存在しないので、線路上か駅の上に移動する。
        if(this.passList[parseInt(ind / this.statesPerStation)] && ind % 3 === 1){
            if(!this.posState){ ind++; } //現在線路上なら、通過駅の上に移動  
            else{ ind--; } //現在駅の上なら、通過駅の手前の線路に移動 
        }

        this._stateInd = ind; //状態インデックスを設定

        //変更後の状態が終点以外に停車中の場合、長時間停車タイマーを開始
        if((this.runState === 1) && !this.isTerminal){
            this.stopTimerId = setTimeout(() => {
                this.isLongStop = true;
                if(this._onLongStop){ 
                    this._onLongStop(); //長時間停車イベントを発火
                }
                clearTimeout(this.stopTimerId);
                this.stopTimer = null;
            }, this.stopTimeLimit);
        }
    }
    get stateInd(){
        return this._stateInd; //状態インデックスを取得
    }

    moveState(step){
        this.stateInd += step;
    }
    moveStation(step){
        this.stateInd += 3 * step;
    }
    get progressParams(){
        return {
            currentStationInd: this.currentStationInd,
            posState: this.posState,
            runState: this.runState,
            isCurrentStationPass: this.isCurrentStationPass,
            isLongStop: this.isLongStop,
            isTerminal: this.isTerminal //終着駅かどうか
        }
    }
    get currentStationInd(){
        return parseInt(this.stateInd / this.statesPerStation); //状態インデックスを駅インデックスに変換
    }
    get posState(){
        return this.stateInd % this.statesPerStation; //状態インデックスを位置状態に変換
    }
    get runState(){ //状態インデックスを走行状態に変換
        //現在駅が通過駅なら走行中を返す
        if(this.passList[this.currentStationInd]){ return 0; }

        //現在駅が停車駅なら
        if(this.posState == 2){ return 1; } //位置状態が駅の上の場合、停車中を返す
        else{ return 0; } //位置状態が駅の上でない場合、走行中を返す
    }
    get isCurrentStationPass(){
        return this.passList[this.currentStationInd];
    }
    get isTerminal(){ //終着駅かどうか
        if(!this.isLoop){
            if(this.currentStationInd === this.stationNum - 1){ return true; }
            else{ return false; }
        }
        else{ return false; }
    }
}