class HeaderDrawer{
    constructor(mapSVG, iconDict) {
        this.mapSVG = mapSVG;
        this.iconDict = iconDict;
        this.textDrawer = new TextDrawer(this.iconDict); //テキスト描画用のインスタンスを生成
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

        //駅名（デバッグ用）
        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.textContent = drawParams.dispStation.name;
        text.setAttribute("x", "600");
        text.setAttribute("y", "280");
        text.setAttribute("font-size", "180px");
        text.setAttribute("fill", "rgb(255, 255, 255)");
        group.appendChild(text);
        //つぎは、まもなく、ただいま（デバッグ用）
        let text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
        if(drawParams.arrivingTextType === 0){ text2.textContent = "つぎは"; }
        else if(drawParams.arrivingTextType === 1){ text2.textContent = "まもなく"; }
        else if(drawParams.arrivingTextType === 2){ text2.textContent = "ただいま"; }
        text2.setAttribute("x", "300");
        text2.setAttribute("y", "300");
        text2.setAttribute("font-size", "70px");
        text2.setAttribute("fill", "rgb(255, 255, 255)");
        group.appendChild(text2);

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
        const stationNameText = (this.mapSVG).querySelector("#header-stationNameText").cloneNode(true); //駅名テキストを複製

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
}