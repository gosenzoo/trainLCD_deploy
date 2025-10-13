class HeaderDrawer{
    constructor(mapSVG, iconDict, animator){
        this.mapSVG = mapSVG;
        this.iconDict = iconDict;
        this.textDrawer = new TextDrawer(this.iconDict); //テキスト描画用のインスタンスを生成
        this.animator = animator;

        console.log("HeaderDrawer初期化完了");
    }

    createAll(drawParams, size){ //全てのヘッダー要素を組み立て
        let t0 = performance.now();
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        group.appendChild(this.createBack()) //背景
        group.appendChild(this.createTrainType(drawParams.trainType.text, drawParams.trainType.color)) //種別
        group.appendChild(this.createCarNum(drawParams.dispCarNum)) //号車
        group.appendChild(this.createRunstateText(drawParams.arrivingTextType)); //つぎは、まもなく、ただいま
        group.appendChild(this.createStationNameText(drawParams.dispStation)); //駅名
        group.appendChild(this.createNumbering(drawParams.dispStation)); //ナンバリング
        group.appendChild(this.createDestination(drawParams.destinationText, drawParams.viaText)); //行先・経由地

        let t1 = performance.now();
        console.log(`HeaderDrawer.createAll: ${t1 - t0} ms`);
        return group;
    }
    createBack(){ //背景を組み立て
        const back = (this.mapSVG).querySelector("#header-back").cloneNode(true); //背景SVGを複製
        return back;
    }
    createTrainType(trainTypeText, trainTypeColor){ //列車種別を組み立て
        const trainType = (this.mapSVG).querySelector("#header-trainType").cloneNode(true); //種別SVGを複製
        const back = trainType.querySelector("#trainTypeBackColor");
        back.setAttribute("fill", trainTypeColor); //種別背景色を設定
        const trainTypeTextRect = trainType.querySelector("#trainTypeText"); //種別テキストを取得
        trainType.appendChild(this.textDrawer.createByAreaEl(trainTypeText, trainTypeTextRect).element);
        trainTypeTextRect.remove(); //種別テキスト矩形を削除
        return trainType;
    }
    createStationNameText(station){ //表示駅の駅名を描画
        const stationNameTextRect = (this.mapSVG).querySelector("#header-stationNameText"); //駅名テキストを複製
        const stationNameTextEngRect = (this.mapSVG).querySelector("#header-stationNameTextEng");

        const kuruTop = parseFloat(stationNameTextRect.getAttribute("y")); //くるくるアニメーションの上端
        const kuruBottom = kuruTop + parseFloat(stationNameTextRect.getAttribute("height")) + 10; //くるくるアニメーションの下端

        // アニメーション付き駅名テキスト組み立て
        const stationNameText = this.animator.createKurukuruSvg([
            this.textDrawer.createByAreaEl(station.name, stationNameTextRect).element,
            this.textDrawer.createByAreaEl(station.kana, stationNameTextRect).element,
            this.textDrawer.createByAreaEl(station.eng, stationNameTextEngRect).element
        ], kuruTop, kuruBottom, 4000, 500, 10);

        return stationNameText;
    }
    createNumbering(station){ //表示駅のナンバリングを描画
        const numbering = (this.mapSVG).querySelector("#header-numbering").cloneNode(true); //ナンバリングSVGを複製
        const lineColorRect = numbering.querySelector("#icon-lineColor");
        const symbolRect = numbering.querySelector("#icon-symbol");
        const numberRect = numbering.querySelector("#icon-number");

        lineColorRect.setAttribute("fill", station.lineColor); //線色を設定
        numbering.appendChild(this.textDrawer.createByAreaEl(station.number.split(" ")[0], symbolRect).element); //路線記号テキストを追加
        numbering.appendChild(this.textDrawer.createByAreaEl(station.number.split(" ")[1], numberRect).element); //ナンバリングテキストを追加
        symbolRect.remove(); //記号矩形を削除
        numberRect.remove(); //ナンバリング矩形を削除

        return numbering;
    }
    createCarNum(num){ //号車を描画
        const carNum = (this.mapSVG).querySelector("#header-carNum").cloneNode(true); //種別SVGを複製

        const carNumText = carNum.querySelector("#carNumText");
        carNum.appendChild(this.textDrawer.createByAreaEl(num, carNumText).element); //号車テキストを追加
        carNumText.remove(); //号車テキスト矩形を削除

        const carText = carNum.querySelector("#carText");
        const carTextEng = carNum.querySelector("#carTextEng");
        const carTexts = this.animator.createKurukuruSvg([
            this.textDrawer.createByAreaEl("号車", carText).element,
            this.textDrawer.createByAreaEl("Car No.", carTextEng).element
        ], 0, 200, 4000, 500, 10);
        carNum.appendChild(carTexts); //「号車」テキストを追加
        carText.remove(); //「号車」テキスト矩形を削除
        carTextEng.remove(); //Car No.テキスト矩形を削除

        return carNum;
    }
    createDestination(destinationText, viaText){ //行先・方面を描画
        if(destinationText == null || destinationText == ""){ return null; }

        const destination = document.createElementNS("http://www.w3.org/2000/svg", "g"); //行先・方面地グループを作成

        const viaTextRect = (this.mapSVG).querySelector("#header-viaText"); //方面テキストrectを取得
        const destinationTextRect = (this.mapSVG).querySelector("#header-destinationText"); //行先テキストrectを取得

        const viaStyle = JSON.parse(viaTextRect.getAttribute("data-style"));
        const desStyle = JSON.parse(destinationTextRect.getAttribute("data-style"));

        const startX = parseFloat(viaTextRect.getAttribute("x")); //行先方面テキストの開始位置
        const desY = parseFloat(destinationTextRect.getAttribute("y"));
        const textSpan = parseFloat(destinationTextRect.getAttribute("x")) - (startX + parseFloat(viaTextRect.getAttribute("width"))); //テキスト間の間隔
        const desTextHeight = parseFloat(destinationTextRect.getAttribute("height")); //行先テキストの高さ
        const desTextWidth = this.textDrawer.measureTextWidth(destinationText, desTextHeight, viaStyle); //行先テキストの本来の幅
        const yukiWidth = this.textDrawer.getTextWidth("ゆき", desTextHeight, desStyle); //「ゆき」テキストの幅
        const maxWidth = (parseFloat(destinationTextRect.getAttribute("x")) + parseFloat(destinationTextRect.getAttribute("width"))) - startX - yukiWidth - textSpan; //行先方面テキストの最大幅

        let x = startX;
        //方面テキストが存在する場合
        if(viaText != "" && viaText != null){
            const viaTextY = parseFloat(viaTextRect.getAttribute("y"))
            const viaTextHeight = parseFloat(viaTextRect.getAttribute("height")); //方面テキストの高さ
            const viaTextWidth = this.textDrawer.getTextWidth(viaText, viaTextHeight, viaStyle); //方面テキストの本来の幅

            if(viaTextWidth + desTextWidth > maxWidth - textSpan){ //行先方面テキスト全体幅がmaxwidthを超える場合
                const scale = (maxWidth - textSpan) / (viaTextWidth + desTextWidth);
                
                const viaTextObj = this.textDrawer.createByArea(viaText, startX, viaTextY, viaTextWidth * scale, viaTextHeight, viaStyle, "ja");
                destination.appendChild(viaTextObj.element);
                x += viaTextObj.width + textSpan;

                const desTextObj = this.textDrawer.createByArea(destinationText, x, desY, desTextWidth * scale, desTextHeight, desStyle, "ja");
                destination.appendChild(desTextObj.element);
                x += desTextObj.width + textSpan;
            }
            else{ //超えない場合
                const viaTextObj = this.textDrawer.createByArea(viaText, startX, viaTextY, maxWidth, viaTextHeight, viaStyle, "ja");
                destination.appendChild(viaTextObj.element);
                x += viaTextObj.width + textSpan;

                const desTextObj = this.textDrawer.createByArea(destinationText, x, desY, maxWidth, desTextHeight, desStyle, "ja");
                destination.appendChild(desTextObj.element);
                x += desTextObj.width + textSpan;
            }
        }
        //方面テキストが存在しない場合
        else{
            const desTextObj = this.textDrawer.createByArea(destinationText, startX, desY, maxWidth, desTextHeight, desStyle, "ja");
            destination.appendChild(desTextObj.element); //行先テキストを追加
            x += desTextObj.width + textSpan; //次のテキストの開始位置を更新
        }
        //「ゆき」テキストを描画
        destination.appendChild(this.textDrawer.createByArea("ゆき", x, desY, yukiWidth, desTextHeight, desStyle, "ja").element);
        //destination.appendChild(destinationTextRect)

        return destination;
    }
    createRunstateText(type){ //つぎは、まもなく、ただいまを描画
        const runStateTextRect = (this.mapSVG).querySelector("#header-runStateText"); //状態テキストを複製
        let text;
        if(type === 0){ text = "つぎは"; }
        else if(type === 1){ text = "まもなく"; }
        else if(type === 2){ text = "ただいま"; }
        const runStateText = this.textDrawer.createByAreaEl(text, runStateTextRect).element; //状態テキストを追加

        return runStateText;
    }
}