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
        group.appendChild(this.createTrainType(drawParams.trainType.text, drawParams.trainType.color)) //種別
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
        group.appendChild(this.createDestination(drawParams.destinationText, drawParams.viaText)); //行先・経由地

        //group.appendChild(this.textDrawer.createTextWithIcon(":jk::js:JR線", 300, 500, 300, 50, "rgb(0,0,0)", "sans-serif", "bold"));

        return group;
    }
    createBack(){ //背景を組み立て
        const back = (this.mapSVG).querySelector("#header-back").cloneNode(true); //背景SVGを複製
        return back;
    }
    createTrainType(trainTypeText, trainTypeColor){ //列車種別を組み立て
        console.log(trainTypeText, trainTypeColor);
        const trainType = (this.mapSVG).querySelector("#header-trainType").cloneNode(true); //種別SVGを複製
        const back = trainType.querySelector("#trainTypeBackColor");
        back.setAttribute("fill", trainTypeColor); //種別背景色を設定
        const trainTypeTextRect = trainType.querySelector("#trainTypeText"); //種別テキストを取得
        trainType.appendChild(this.textDrawer.createByRectObj(trainTypeText, trainTypeTextRect, "jp"));
        //trainTypeTextRect.remove(); //種別テキスト矩形を削除
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

        const carText = carNum.querySelector("#carText");
        carNum.appendChild(this.textDrawer.createByRectObj("号車", carText, "ja")); //「号車」テキストを追加
        carText.remove(); //「号車」テキスト矩形を削除

        return carNum;
    }
    createDestination(destinationText, viaText){ //行先・経由地を描画
        if(destinationText == null || destinationText == ""){ return null; }

        const destination = document.createElementNS("http://www.w3.org/2000/svg", "g"); //行先・経由地グループを作成

        const viaTextRect = (this.mapSVG).querySelector("#header-viaText"); //経由地テキストrectを取得
        const destinationTextRect = (this.mapSVG).querySelector("#header-destinationText"); //行先テキストrectを取得

        const fontFamily = destinationTextRect.getAttribute("data-fontFamily"); //フォントファミリーを取得
        const fontWeight = destinationTextRect.getAttribute("data-fontWeight"); //フォントウェイトを取得
        const startX = parseFloat(viaTextRect.getAttribute("x")); //行先テキストの開始位置
        const textSpan = parseFloat(destinationTextRect.getAttribute("x")) - (startX + parseFloat(viaTextRect.getAttribute("width"))); //テキスト間の間隔
        const desTextHeight = parseFloat(destinationTextRect.getAttribute("height")); //行先テキストの高さ
        const desTextWidth = this.textDrawer.measureTextWidth(destinationText, desTextHeight, fontFamily, fontWeight); //行先テキストの幅
        const yukiWidth = this.textDrawer.measureTextWidth("ゆき", desTextHeight, fontFamily, fontWeight); //行先テキストの幅
        const maxWidth = (parseFloat(destinationTextRect.getAttribute("x")) + parseFloat(destinationTextRect.getAttribute("width"))) - startX - yukiWidth - textSpan; //行先テキストの最大幅

        let x = startX;
        //経由地テキストが存在する場合
        if(viaText != "" && viaText != null){
            const viaTextHeight = parseFloat(viaTextRect.getAttribute("height")); //経由地テキストの高さ

        }
        //経由地テキストが存在しない場合
        else{
            const desTextRect = destinationTextRect.cloneNode(true); //行先テキスト矩形を複製
            desTextRect.setAttribute("width", `${maxWidth}`);
            desTextRect.setAttribute("x", `${startX}`);
            destination.appendChild(this.textDrawer.createByRectObj(destinationText, desTextRect, "ja")); //行先テキストを追加
            x += desTextWidth + textSpan; //次のテキストの開始位置を更新
        }
        const desTextRect = destinationTextRect.cloneNode(true); //行先テキスト矩形を複製
        desTextRect.setAttribute("width", `${yukiWidth}`);
        desTextRect.setAttribute("x", `${x}`);
        destination.appendChild(this.textDrawer.createByRectObj("ゆき", desTextRect, "ja"));

        return destination;
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