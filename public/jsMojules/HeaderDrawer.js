class HeaderDrawer{
    constructor(mapSVG, iconDict) {
        this.mapSVG = mapSVG;
        this.iconDict = iconDict;
        /*
        //headerSVGから、idをもとに各SVG要素を取得
        this.backSVG = headerSVG.queryselector("#header-back");
        this.trainTypeSVG = headerSVG.queryselector("#header-trainType");
        this.numberingSVG = headerSVG.queryselector("#header-numbering");
        this.carNumSVG = headerSVG.queryselector("#header-carNum");
        this.destinationSVG = headerSVG.queryselector("#header-destination");
        this.runStateTextSVG = headerSVG.queryselector("#header-runStateText");

        this.langTimer = null; //言語切り替えタイマーを管理する変数
        this._langState = 0; //言語状態を管理する変数
        */
       console.log("HeaderDrawer初期化完了");
    }

    createAll(drawParams, size){ //全てのヘッダー要素を組み立て
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        group.appendChild(this.createBack()) //背景
        group.appendChild(this.createTrainType()) //種別
        group.appendChild(this.createCarNum()) //号車

        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.textContent = drawParams.dispStation.name;
        text.setAttribute("x", "300");
        text.setAttribute("y", "200");
        text.setAttribute("font-size", "70px");
        text.setAttribute("fill", "rgb(255, 255, 255)");
        group.appendChild(text);

        return group;
    }
    createBack(){ //背景を組み立て
        const back = (this.mapSVG).querySelector("#header-back").cloneNode(true); //背景SVGを複製
        return back;
    }
    createTrainType(){ //列車種別を組み立て
        const trainType = (this.mapSVG).querySelector("#header-trainType").cloneNode(true); //種別SVGを複製
        return trainType;
    }
    createStationNameText(name){ //表示駅の駅名を描画
        return 
    }
    createNumbering(){ //表示駅のナンバリングを描画

    }
    createCarNum(){ //号車を描画
        const carNum = (this.mapSVG).querySelector("#header-carNum").cloneNode(true); //種別SVGを複製
        return carNum;
    }
    createDestination(){ //行先・経由地を描画

    }
    createRunstateText(){ //つぎは、まもなく、ただいまを描画

    }


    setLangTimer(interval){ //言語切り替えタイマーを設定
        clearInterval(this.langTimer); //既存のタイマーをクリア
        this.langTimer = setInterval(() => {
            this.langState++;
        }, interval);
    }
    set langState(state){
        if(state < 0){
            state = 2
        }
        else if(2 < state){
            state = 0
        }
        this._langState = state;
    }
    get langState(){
        return this._langState;
    }
}