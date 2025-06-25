class HeaderDrawer{
    constructor(mapSVG, iconDict) {
        this.mapSVG = mapSVG;
        this.iconDict = iconDict;
        this.textDrawer = new TextDrawer(this.iconDict); //テキスト描画用のインスタンスを生成

        console.log("HeaderDrawer初期化完了");
    }

    createAll(drawParams, size){ //全てのヘッダー要素を組み立て
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        group.appendChild(this.createBack()) //背景
        group.appendChild(this.createTrainType()) //種別
        group.appendChild(this.createCarNum(drawParams.dispCarNum)) //号車

        // //つぎは、まもなく、ただいま（デバッグ用）
        // let text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
        // if(drawParams.arrivingTextType === 0){ text2.textContent = "つぎは"; }
        // else if(drawParams.arrivingTextType === 1){ text2.textContent = "まもなく"; }
        // else if(drawParams.arrivingTextType === 2){ text2.textContent = "ただいま"; }
        // text2.setAttribute("x", "180");
        // text2.setAttribute("y", "300");
        // text2.setAttribute("font-size", "70px");
        // text2.setAttribute("fill", "rgb(255, 255, 255)");
        // group.appendChild(text2);

        group.appendChild(this.createRunstateText(drawParams.arrivingTextType)); //つぎは、まもなく、ただいま
        group.appendChild(this.createStationNameText(drawParams.dispStation)); //駅名
        group.appendChild(this.createNumbering(drawParams.dispStation)); //ナンバリング

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

        const letterSpacingsJson = JSON.parse(stationNameTextRect.getAttribute("data-letterSpacings")); //文字間隔をJSONに変換
        let nameSpacing = 0;
        let kanaSpacing = 0;
        if(Object.keys(letterSpacingsJson).includes(`${station.name.length}`)){
            nameSpacing = letterSpacingsJson[station.name.length];
        }
        if(Object.keys(letterSpacingsJson).includes(`${station.kana.length}`)){
            kanaSpacing = letterSpacingsJson[station.kana.length];
        }

        const kuruTop = parseFloat(stationNameTextRect.getAttribute("y")); //くるくるアニメーションの上端
        const kuruBottom = kuruTop + parseFloat(stationNameTextRect.getAttribute("height")); //くるくるアニメーションの下端

        // アニメーション付き駅名テキスト組み立て
        const stationNameText = this.textDrawer.createKurukuruSvg([
            this.textDrawer.createByRectObj(station.name, stationNameTextRect, "ja", nameSpacing),
            this.textDrawer.createByRectObj(station.kana, stationNameTextRect, "ja", kanaSpacing),
            this.textDrawer.createByRectObj(station.eng, stationNameTextRect, "ja", 0)
        ], kuruTop, kuruBottom, 4000, 500, 0);

        //stationNameText.appendChild(stationNameTextRect.cloneNode(true)); //駅名テキストの矩形を追加
        return stationNameText;
    }
    createNumbering(station){ //表示駅のナンバリングを描画
        const numbering = (this.mapSVG).querySelector("#header-numbering").cloneNode(true); //ナンバリングSVGを複製
        const lineColorRect = numbering.querySelector("#icon-lineColor");
        const symbolRect = numbering.querySelector("#icon-symbol");
        const numberRect = numbering.querySelector("#icon-number");

        lineColorRect.setAttribute("fill", station.lineColor); //線色を設定
        numbering.appendChild(this.textDrawer.createByRectObj(station.number.split(" ")[0], symbolRect, "en")); //路線記号テキストを追加
        numbering.appendChild(this.textDrawer.createByRectObj(station.number.split(" ")[1], numberRect, "en")); //ナンバリングテキストを追加
        symbolRect.remove(); //記号矩形を削除
        numberRect.remove(); //ナンバリング矩形を削除

        return numbering;
    }
    createCarNum(num){ //号車を描画
        const carNum = (this.mapSVG).querySelector("#header-carNum").cloneNode(true); //種別SVGを複製
        const carNumText = carNum.querySelector("#carNumText");
        carNum.appendChild(this.textDrawer.createByRectObj(num, carNumText, "en")); //号車テキストを追加
        carNumText.remove(); //号車テキスト矩形を削除
        return carNum;
    }
    createDestination(){ //行先・経由地を描画

    }
    createRunstateText(type){ //つぎは、まもなく、ただいまを描画
        const runStateTextRect = (this.mapSVG).querySelector("#header-runStateText"); //状態テキストを複製
        let text;
        if(type === 0){ text = "つぎは"; }
        else if(type === 1){ text = "まもなく"; }
        else if(type === 2){ text = "ただいま"; }
        const runStateText = this.textDrawer.createByRectObj(text, runStateTextRect, "ja"); //状態テキストを追加

        return runStateText;
    }
}