class DefaultLineDrawer{
    constructor(mapSVG, iconDict){
        this.mapSVG = mapSVG
        this.iconDict = iconDict;
        this.textDrawer = new TextDrawer(this.iconDict); //テキスト描画用のインスタンスを作成

        this.lineX = parseFloat(mapSVG.querySelector("#lineStart").getAttribute("x"));
        this.lineY = parseFloat(mapSVG.querySelector("#lineStart").getAttribute("y"));
        this.stationStartX = this.lineX + parseFloat(mapSVG.querySelector("#lineStart").getAttribute("width"));
        this.lenStartToEnd = parseFloat(mapSVG.querySelector("#stationEnd").getAttribute("x")) - parseFloat(mapSVG.querySelector("#stationStart").getAttribute("x"));

        console.log("DefaultLineDrawer初期化完了");

        this.stationTextBase = mapSVG.querySelector("#body-defaultLine-stationText").getAttribute("data-basePoint");
        
        // 駅名
        const stationNameRect = mapSVG.querySelector("#body-defaultLine-stationName"); //駅名テキストrect
        this.stationNameParams = getObjByRectEL(stationNameRect);

        // ナンバリング
        const numRect = mapSVG.querySelector("#body-defaultLine-numRect").cloneNode(true); //ナンバリング用矩形
        this.numParams = getObjByRectEL(numRect);

        //乗換路線
        this.params = this.getParams(mapSVG); //パラメータを取得
    }

    getParams(mapSVG){
        const transferArea = (mapSVG).querySelector("#body-defaultLine-transferArea"); //乗換路線用矩形
        const transferLine = (mapSVG).querySelector("#body-defaultLine-transferLine"); //乗換路線用線

        const params = {
            styleJson: JSON.parse(transferLine.getAttribute("data-style")),
            ctextHeightRatio: parseFloat(transferLine.getAttribute("data-textHeightRatio")),
            left: parseFloat(transferArea.getAttribute("x")),
            top: parseFloat(transferArea.getAttribute("y")),
            width: parseFloat(transferArea.getAttribute("width")),
            areaHeight: parseFloat(transferArea.getAttribute("height")),
            lineHeight: parseFloat(transferLine.getAttribute("height")),
        };

        return params;
    }

    createAll(drawParams, size){
        let t0 = performance.now();
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        // 駅関連の文字
        for(let i = 0; i < drawParams.dispStationList.length; i++){
            group.appendChild(this.createStationParts(drawParams.dispStationList[i], this.stationStartX + i * this.lenStartToEnd / (drawParams.stationFrameNum - 1), this.lineY, drawParams.lineDict, drawParams.passStationList[i] || drawParams.leftStationList[i]));
        }

        // 線
        group.appendChild(this.createLine(drawParams.stationFrameNum, drawParams.colorList, drawParams.passStationList, drawParams.hereDrawPos, drawParams.lineLeapPosList)) //線

        // 現在地アイコン
        let d = drawParams.hereDrawPos * (this.lenStartToEnd / (drawParams.stationFrameNum - 1));
        group.appendChild(this.createHereIcon(this.stationStartX + d, this.lineY));

        let t1 = performance.now();
        console.log(`DefaultLineDrawer.createAll: ${t1 - t0} ms`);
        return group;
    }
    // 駅関連の文字を組み立て
    createStationParts(station, x, y, lineDict, isPass){
        let stationParts = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
        stationParts.setAttribute("data-basePoint", this.stationTextBase); //ベースポイントを設定

        // ナンバリング
        stationParts.appendChild(this.textDrawer.createByAreaEl2(`${station.number.split(' ')[0]}-${station.number.split(' ')[1]}`, this.numParams).element); //ナンバリングを追加

        //駅名
        let nameText = station.name;
        if(nameText.length === 1){ nameText = `${nameText}　`; } //駅名が1文字の場合、空文字を追加
        else if(nameText.length === 2){ nameText = `${nameText[0]}　${nameText[1]}`; } //駅名が2文字の場合、空文字を追加
        stationParts.appendChild(this.textDrawer.createByAreaEl2(nameText, this.stationNameParams).element);

        //乗換路線
        if(station.transfers.length > 0){
            const transferTextList = station.transfers.split(" ");
            const transferCnt = transferTextList.length; //乗換路線の数を取得
            const lineSpan = 3; //行間[px]

            let height = this.params.lineHeight;
            //乗換路線の表示が下端を超える場合、圧縮
            if(transferCnt * (this.params.lineHeight + lineSpan) > this.params.areaHeight){
                const scale = this.params.areaHeight / (transferCnt * (this.params.lineHeight + lineSpan)); //圧縮率を計算
                height = this.params.lineHeight * scale; //乗換路線の高さを圧縮
            }

            const transferTexts = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
            let y1 = this.params.top;
            for(let i = 0; i < transferCnt; i++){
                let text = `:${lineDict[transferTextList[i]].lineIconKey}:${lineDict[transferTextList[i]].name}`;
                transferTexts.appendChild(this.textDrawer.createIconTextByArea(text, this.params.left, y1, this.params.width, height, this.params.styleJson, "ja", this.params.textHeightRatio));
                y1 += height + lineSpan; //次の行のY座標を計算
            }
            stationParts.appendChild(transferTexts); //乗換路線を追加
        }

        stationParts = moveSvgElementByBasePoint(stationParts, x, y);

        //通過ならすべてを灰色に
        if(isPass){
            stationParts.setAttribute("filter", "url(#grayscale)");
        }

        return stationParts;
    }
    // 線組み立て
    createLine(stationFrameNum, colorList, passStationList, hereDrawPos, lineLeapPosList){
        const line = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
        line.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "defs"));

        const lineStart = (this.mapSVG).querySelector("#lineStart"); //線根本
        const lineEnd = (this.mapSVG).querySelector("#lineEnd"); //線先端
        const stationStart = (this.mapSVG).querySelector("#stationStart"); //根本駅
        const stationEnd = (this.mapSVG).querySelector("#stationEnd"); //先端駅
        const passStation = (this.mapSVG).querySelector("#passStation"); //通過駅

        const sectionNum = colorList.length; //描画する区間数（両端含む）を取得
        const sectionWidth = (parseInt(stationEnd.getAttribute("x")) - parseInt(stationStart.getAttribute("x"))) / (stationFrameNum - 1);
        const startX = parseInt(lineStart.getAttribute("x")); //根本のx座標
        const buf = 1; //区間間の隙間を埋めるための拡張ピクセル数
        for(let i = 0; i < sectionNum; i++){
            if(i === 0){ //最初は、線根本をコピー、設定して追加
                let sectionObj = lineStart.cloneNode(true);
                sectionObj.setAttribute("width", `${parseInt(sectionObj.getAttribute("width")) + buf}`);
                sectionObj.setAttribute("fill", colorList[i]);
                line.appendChild(sectionObj); //線根本
            }
            else if(0 < i && i < sectionNum-1){ //中間は、各区間に区間の長さ分のrectを設定し追加
                if(lineLeapPosList.includes(i)){ //その区間が端折られていたら
                    let lineLeapObj1 = (this.mapSVG).querySelector("#lineLeap1").cloneNode(true);
                    let lineLeapObj2 = (this.mapSVG).querySelector("#lineLeap2").cloneNode(true);

                    lineLeapObj1.setAttribute("fill", colorList[i]);
                    lineLeapObj2.setAttribute("fill", colorList[i]);
                    moveSvgElementByBasePoint(lineLeapObj1, startX + sectionWidth * (i-1) + parseInt(lineStart.getAttribute("width")) - buf, lineStart.getAttribute("y"));
                    moveSvgElementByBasePoint(lineLeapObj2, startX + sectionWidth * (i-1) + parseInt(lineStart.getAttribute("width")) + buf, lineStart.getAttribute("y"));
                    line.appendChild(lineLeapObj1);
                    line.appendChild(lineLeapObj2);
                }
                else{
                    let sectionObj = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    sectionObj.setAttribute("x", `${startX + sectionWidth * (i-1) + parseInt(lineStart.getAttribute("width")) - buf}`);
                    sectionObj.setAttribute("y", lineStart.getAttribute("y"));
                    sectionObj.setAttribute("width", `${sectionWidth + 2*buf}`);
                    sectionObj.setAttribute("height", lineStart.getAttribute("height"));
                    sectionObj.setAttribute("fill", colorList[i]);
                    line.appendChild(sectionObj);
                }
            }
            else{ //最後は、線先端をコピー、設定して追加
                let sectionObj = lineEnd.cloneNode(true);
                sectionObj = movePolygonTo(sectionObj, startX + parseInt(lineStart.getAttribute("width")) + sectionWidth * (sectionNum-2), parseInt(lineStart.getAttribute("y")));
                sectionObj.setAttribute("fill", colorList[i]);
                line.appendChild(sectionObj);
            }
        }
        //現在地より前を灰色に
        const grayLine = lineStart.cloneNode(true);
        grayLine.setAttribute("width", `${parseFloat(lineStart.getAttribute("width")) + hereDrawPos * sectionWidth}`);
        line.appendChild(grayLine);

        //線の形が確定したら、乗算影用の要素を作成
        //マスク作成
        const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
        mask.setAttribute("id", "shapeMask");
        const maskShape = line.cloneNode(true);
        maskShape.querySelectorAll("*").forEach(element => {
            element.setAttribute("fill", "rgb(200, 200, 200)");
        });
        mask.appendChild(maskShape);
        line.querySelector("defs").appendChild(mask);
        //マスク適用し、影の形を定義する要素作成
        const lineShadowShape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        lineShadowShape.setAttribute("x", startX);
        lineShadowShape.setAttribute("y", lineStart.getAttribute("y"));
        lineShadowShape.setAttribute("width", parseFloat(this.mapSVG.getAttribute("viewBox").split(" ")[2]));
        lineShadowShape.setAttribute("height", lineStart.getAttribute("height"));
        lineShadowShape.setAttribute("mask", "url(#shapeMask)");

        //1影組み立て、追加
        const lineShadow1 = lineShadowShape.cloneNode(true);
        lineShadow1.setAttribute("fill", "url(#innerGradient)");
        lineShadow1.setAttribute("style", "mix-blend-mode: multiply;");
        line.appendChild(lineShadow1);

        //駅アイコン描画
        let stationStartX = parseFloat(stationStart.getAttribute("x"));
        for(let i = 0; i < passStationList.length; i++){
            if(!passStationList[i]){
                let stationObj = stationStart.cloneNode(true);
                stationObj.setAttribute("x", `${stationStartX + i * sectionWidth}`);
                line.appendChild(stationObj);
            }
            else{
                let stationObj = passStation.cloneNode(true);
                stationObj = movePolygonTo(stationObj, stationStartX + i * sectionWidth + parseFloat(stationStart.getAttribute("width")) / 2, parseFloat(lineStart.getAttribute("y")) + parseFloat(lineStart.getAttribute("height")) / 2);
                line.appendChild(stationObj);
            }
        }
        //2影組み立て、追加
        const lineShadow2 = lineShadowShape.cloneNode(true);
        lineShadow2.setAttribute("fill", "url(#outerGradient)");
        lineShadow2.setAttribute("style", "mix-blend-mode: multiply;");
        line.appendChild(lineShadow2);

        line.setAttribute("filter", "url(#outline)"); //線全体のアウトライン設定

        return line;
    }
    createHereIcon(x, y){ //現在地アイコン描画
        const here = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        let hereIcon = this.mapSVG.querySelector("#hereIcon").cloneNode(true);
        hereIcon = moveSvgElementByBasePoint(hereIcon, x, y);
        here.appendChild(hereIcon);
        return here;
    }
}