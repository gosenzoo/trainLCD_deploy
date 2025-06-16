class ProgressController{
    constructor(stationNum, stopList, isLoop){
        this.statesPerStation = 3; //1駅あたりの状態数
        this.stateIndNum = this.statesPerStation * stationNum; //状態数(1駅あたりの状態数 * 駅数)
        this.stopList = stopList;
        this.isLoop = isLoop; //環状運転かどうか

        if(!this.isLoop){ //非環状運転時の状態インデックスの範囲を設定
            this.stationIndMin = this.statesPerStation - 1; //最小値
            this.stationIndMax = 3 * stationNum - 1; //最大値
        }
        else{ //環状運転時の状態インデックスの範囲を設定
            this.stationIndMin = 0; //最小値
            this.stationIndMax = 3 * stationNum - 1; //最大値
        }
        this._stateInd = this.statesPerStation - 1; //状態インデックス(状態数-1(1駅目の停車状態)で初期化)
    }

    set stateInd(ind){
        if(!this.isLoop){ //環状運転でない場合、範囲外は端の値に設定
            if(ind < this.stationIndMin){ ind = this.stationIndMin; }
            if(this.stationIndMax < ind){ ind = this.stationIndMax; }
        }
        else{ //環状運転の場合、範囲外は循環する
            ind = ((ind % this.stateIndNum) + this.stateIndNum) % this.stateIndNum;
        }

        //移動先が通過駅かつ、駅手前だった場合。通過駅に駅手前の状態は存在しないので、線路上か駅の上に移動する。
        if(!this.stopList[parseInt(ind / this.statesPerStation)] && ind % 3 === 1){
            if(!this.posState){ ind++; } //現在線路上なら、通過駅の上に移動  
            else{ ind--; } //現在駅の上なら、通過駅の手前の線路に移動 
        }

        this._stateInd = ind; //状態インデックスを設定
    }
    get stateInd(){
        return this._stateInd; //状態インデックスを取得
    }

    setProgress(run, station){
        this.stateInd = run + 3 * station;
    }
    moveState(step){
        this.stateInd += step;
    }
    moveStation(step){
        this.stateInd += 3 * step;
    }
    get currentStationInd(){
        return parseInt(this.stateInd / this.statesPerStation); //状態インデックスを駅インデックスに変換
    }
    get posState(){
        return this.stateInd % this.statesPerStation; //状態インデックスを位置状態に変換
    }
    get runState(){ //状態インデックスを走行状態に変換
        //現在駅が通過駅なら走行中を返す
        if(!this.stopList[this.currentStationInd]){ return 0; }

        //現在駅が停車駅なら
        if(this.posState == 2){ return 1; } //位置状態が駅の上の場合、停車中を返す
        else{ return 0; } //位置状態が駅の上でない場合、走行中を返す
    }
    get isCurrentStationStop(){
        return this.stopList[this.currentStationInd];
    }
}