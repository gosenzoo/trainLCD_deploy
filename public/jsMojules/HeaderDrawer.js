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

        //つぎは、まもなく、ただいま（デバッグ用）
        let text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
        if(drawParams.arrivingTextType === 0){ text2.textContent = "つぎは"; }
        else if(drawParams.arrivingTextType === 1){ text2.textContent = "まもなく"; }
        else if(drawParams.arrivingTextType === 2){ text2.textContent = "ただいま"; }
        text2.setAttribute("x", "180");
        text2.setAttribute("y", "300");
        text2.setAttribute("font-size", "70px");
        text2.setAttribute("fill", "rgb(255, 255, 255)");
        group.appendChild(text2);

        group.appendChild(this.createStationNameText(drawParams.dispStation)); //駅名
        group.appendChild(this.createNumbering()); //ナンバリング

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
    createStationNameText(station){ //表示駅の駅名を描画
        const stationNameTextRect = (this.mapSVG).querySelector("#header-stationNameText"); //駅名テキストを複製
        const kuruTop = parseFloat(stationNameTextRect.getAttribute("y")); //くるくるアニメーションの上端
        const kuruBottom = kuruTop + parseFloat(stationNameTextRect.getAttribute("height")); //くるくるアニメーションの下端

        // アニメーション付き駅名テキスト組み立て
        const stationNameText = this.textDrawer.createKurukuruSvg([
            this.textDrawer.createByRectObj(station.name, stationNameTextRect, "ja"),
            this.textDrawer.createByRectObj(station.kana, stationNameTextRect, "ja"),
            this.textDrawer.createByRectObj(station.eng, stationNameTextRect, "ja")
        ], kuruTop, kuruBottom, 4000, 500, 0);

        //stationNameText.appendChild(stationNameTextRect.cloneNode(true)); //駅名テキストの矩形を追加
        //stationNameText.appendChild(this.textDrawer.createByRectObj("国分寺", stationNameTextRect, "ja")); //IDを設定
        return stationNameText;
    }
    createNumbering(){ //表示駅のナンバリングを描画
        const numbering = (this.mapSVG).querySelector("#header-numbering").cloneNode(true); //ナンバリングSVGを複製

        return numbering;
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