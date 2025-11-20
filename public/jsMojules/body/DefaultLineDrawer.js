class DefaultLineDrawer{
    constructor(mapSVG, iconDict, animator, numIconDrawer){
        this.mapSVG = mapSVG
        this.iconDict = iconDict;
        this.textDrawer = new TextDrawer(this.iconDict, numIconDrawer); //テキスト描画用のインスタンスを作成
        this.animator = animator;
        this.numIconDrawer = numIconDrawer;

        this.lineX = parseFloat(mapSVG.querySelector("#lineStart").getAttribute("x"));
        this.lineY = parseFloat(mapSVG.querySelector("#lineStart").getAttribute("y"));
        this.stationStartX = this.lineX + parseFloat(mapSVG.querySelector("#lineStart").getAttribute("width"));
        this.lenStartToEnd = parseFloat(mapSVG.querySelector("#stationEnd").getAttribute("x")) - parseFloat(mapSVG.querySelector("#stationStart").getAttribute("x"));
        this.stationEndX = this.stationStartX + this.lenStartToEnd;

        console.log("DefaultLineDrawer初期化完了");

        this.stationTextBase = mapSVG.querySelector("#body-defaultLine-stationText").getAttribute("data-basePoint");
        
        // 駅名
        const stationNameRect = mapSVG.querySelector("#body-defaultLine-stationName"); //駅名テキストrect
        this.stationNameParams = getObjByRectEL(stationNameRect);

        // ナンバリング
        const numRect = mapSVG.querySelector("#body-defaultLine-numRect").cloneNode(true); //ナンバリング用矩形
        this.numParams = getObjByRectEL(numRect);

        //乗換路線
        const re = this.getParams(mapSVG);
        this.params = re.params;
        this.paramsEng = re.paramsEng; //パラメータを取得
    }

    getParams(mapSVG){
        const transferArea = (mapSVG).querySelector("#body-defaultLine-transferArea"); //乗換路線用矩形
        const transferLine = (mapSVG).querySelector("#body-defaultLine-transferLine"); //乗換路線用線
        const transferLineEng = (mapSVG).querySelector("#body-defaultLine-transferLineEng"); //乗換路線用線(英語)

        const params = {
            styleJson: JSON.parse(transferLine.getAttribute("data-style")),
            textHeightRatio: parseFloat(transferLine.getAttribute("data-textHeightRatio")),
            left: parseFloat(transferArea.getAttribute("x")),
            top: parseFloat(transferArea.getAttribute("y")),
            width: parseFloat(transferArea.getAttribute("width")),
            areaHeight: parseFloat(transferArea.getAttribute("height")),
            lineHeight: parseFloat(transferLine.getAttribute("height")),
        };

        const paramsEng = {
            styleJson: JSON.parse(transferLineEng.getAttribute("data-style")),
            textHeightRatio: parseFloat(transferLineEng.getAttribute("data-textHeightRatio")),
            left: parseFloat(transferArea.getAttribute("x")),
            top: parseFloat(transferArea.getAttribute("y")),
            width: parseFloat(transferArea.getAttribute("width")),
            areaHeight: parseFloat(transferArea.getAttribute("height")),
            lineHeight: parseFloat(transferLineEng.getAttribute("height")),
        }

        return {params: params, paramsEng: paramsEng};
    }

    createAll(drawParams, size){
        let t0 = performance.now();
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        // 線と現在地アイコン
        const lineObj = document.createElementNS("http://www.w3.org/2000/svg", "g");
        // 線
        lineObj.appendChild(this.createLine(drawParams.stationFrameNum, drawParams.colorList, drawParams.passStationList, drawParams.hereDrawPos, drawParams.lineLeapPosList, drawParams.isStart, drawParams.isEnd)) //線
        // 現在地アイコン
        let d = drawParams.hereDrawPos * (this.lenStartToEnd / (drawParams.stationFrameNum - 1));
        lineObj.appendChild(this.createHereIcon(this.stationStartX + d, this.lineY));
        if(drawParams.leftOrRight === "left"){ lineObj.setAttribute("transform", "scale(-1, 1)"); }
        lineObj.setAttribute("transform-origin", `${this.stationStartX + (this.lenStartToEnd) / 2} 0`);
        group.appendChild(lineObj);

        // 日本語
        // 駅関連
        const jps = document.createElementNS("http://www.w3.org/2000/svg", "g");
        for(let i = 0; i < drawParams.dispStationList.length; i++){
            if(drawParams.leftOrRight === "right"){ jps.appendChild(this.createStationParts(drawParams.dispStationList[i], this.stationStartX + i * this.lenStartToEnd / (drawParams.stationFrameNum - 1), this.lineY, drawParams.lineDict, drawParams.passStationList[i] || drawParams.leftStationList[i], drawParams.isDispTime)); }
            else{ jps.appendChild(this.createStationParts(drawParams.dispStationList[i], this.stationStartX + (drawParams.stationFrameNum - 1 - i) * this.lenStartToEnd / (drawParams.stationFrameNum - 1), this.lineY, drawParams.lineDict, drawParams.passStationList[i] || drawParams.leftStationList[i], drawParams.isDispTime)); }
        }
        //分
        if(drawParams.isDispTime){
            jps.appendChild(this.createMinute(drawParams.leftOrRight));
        }
        //路線名
        if(drawParams.isDispLineName){
            jps.appendChild(this.createLineName(drawParams.lineNameList, drawParams.leftOrRight));
        }

        // 英語
        // 駅関連
        const engs = document.createElementNS("http://www.w3.org/2000/svg", "g");
        for(let i = 0; i < drawParams.dispStationList.length; i++){
            if(drawParams.leftOrRight === "right"){ engs.appendChild(this.createStationPartsEng(drawParams.dispStationList[i], this.stationStartX + i * this.lenStartToEnd / (drawParams.stationFrameNum - 1), this.lineY, drawParams.lineDict, drawParams.passStationList[i] || drawParams.leftStationList[i])); }
            else{ engs.appendChild(this.createStationPartsEng(drawParams.dispStationList[i], this.stationStartX + (drawParams.stationFrameNum - 1 - i) * this.lenStartToEnd / (drawParams.stationFrameNum - 1), this.lineY, drawParams.lineDict, drawParams.passStationList[i] || drawParams.leftStationList[i])); }
        }
        //(min)
        if(drawParams.isDispTime){
            engs.appendChild(this.createMinuteEng(drawParams.leftOrRight));
        }
        //路線名
        if(drawParams.isDispLineName){
            engs.appendChild(this.createLineNameEng(drawParams.lineNameList, drawParams.leftOrRight));
        }
        
        group.appendChild(this.animator.createStepSVG([jps, engs], [9020, 4510]));

        let t1 = performance.now();
        //console.log(`DefaultLineDrawer.createAll: ${t1 - t0} ms`);
        return group;
    }
    // 駅関連の文字を組み立て
    createStationParts(station, x, y, lineDict, isPass, isDispTime){
        let stationParts = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
        stationParts.setAttribute("data-basePoint", this.stationTextBase); //ベースポイントを設定

        const stNameRect = this.mapSVG.querySelector("#body-defaultLine-stationName").cloneNode(true); //駅名テキストrect
        //駅名下の間隔計算
        const nameGap = this.lineY - (parseFloat(stNameRect.getAttribute("y")) + parseFloat(stNameRect.getAttribute("height"))); //駅名中心から線までの距離を計算

        //ナンバリングの上端位置
        let numIconTop = this.lineY;
        
        // ナンバリング
        if(station.number === ""){
            //ナンバリングがない場合は何もしない

            numIconTop = this.lineY;
        }
        else if(station.lineNumberType === "0"){
            //ナンバリング文字表示の場合
            const numRect = this.mapSVG.querySelector("#body-defaultLine-numRect").cloneNode(true); //ナンバリング用矩形

            stationParts.appendChild(this.textDrawer.createByAreaEl(`${station.number.split(' ')[0]}-${station.number.split(' ')[1]}`, numRect).element); //ナンバリングを追加

            numIconTop = parseFloat(numRect.getAttribute("y"));
        }
        else if(station.lineNumberType === "1"){
            //ナンバリングアイコン表示の場合
            const numIconRect = this.mapSVG.querySelector("#body-defaultLine-numIconRect").cloneNode(true); //ナンバリングアイコン用矩形

            stationParts.appendChild(this.numIconDrawer.createNumIconFromPreset(station.numIconPresetKey, station.number.split(' ')[0], station.number.split(' ')[1], station.lineColor, {
                x: parseFloat(numIconRect.getAttribute("x")),
                y: parseFloat(numIconRect.getAttribute("y")),
                width: parseFloat(numIconRect.getAttribute("width")),
                height: parseFloat(numIconRect.getAttribute("height"))
            })); //ナンバリングアイコンを追加

            numIconTop = parseFloat(numIconRect.getAttribute("y"));
        }

        //駅名下端位置を調整
        const stNameBottom = numIconTop - nameGap; //駅名下端のY座標を計算
        stNameRect.setAttribute("height", stNameBottom - parseFloat(stNameRect.getAttribute("y"))); //駅名rectの高さを調整
        
        //stationParts.appendChild(stNameRect)
        //駅名
        let nameText = station.name;
        if(nameText.length === 1){ nameText = `${nameText}　`; } //駅名が1文字の場合、空文字を追加
        else if(nameText.length === 2){ nameText = `${nameText[0]}　${nameText[1]}`; } //駅名が2文字の場合、空文字を追加
        stationParts.appendChild(this.textDrawer.createByAreaEl(nameText, stNameRect).element);

        //乗換路線
        if((station.transfers.length > 0) || (station.transferText !== "")){
            //路線数、各行テキスト取得
            let transferCnt = 0;
            let lineTexts = []
            if(station.transferText !== ""){ //transferTextがある
                lineTexts = [...station.transferText.split('\n')];
                transferCnt = lineTexts.length;
            }
            else{ //transferTextがない（登録駅リストで対応）
                const transferTextList = station.transfers.split(" ");
                transferCnt = transferTextList.length; //乗換路線の数を取得

                for(let i = 0; i < transferCnt; i++){ 
                    lineTexts.push(`:${lineDict[transferTextList[i]].lineIconKey}:${lineDict[transferTextList[i]].name}`);
                }
            }
            
            //構成、組み立て
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
                transferTexts.appendChild(this.textDrawer.createIconTextByArea(lineTexts[i], this.params.left, y1, this.params.width, height, this.params.styleJson, "ja", this.params.textHeightRatio).element);
                y1 += height + lineSpan; //次の行のY座標を計算
            }
            stationParts.appendChild(transferTexts); //乗換路線を追加
        }

        //所要時間
        if(!isPass && !(station._dispTime < 0) && isDispTime){
            const timeTextRect = (mapSVG).querySelector("#body-defaultLine-timeText");
            stationParts.appendChild(this.textDrawer.createByAreaEl(station._dispTime, timeTextRect).element);
        }

        //指定位置に移動
        stationParts = moveSvgElementByBasePoint(stationParts, x, y);

        //通過ならすべてを灰色に
        if(isPass){
            stationParts.setAttribute("filter", "url(#grayscale)");
        }

        return stationParts;
    }
    createStationPartsEng(station, x, y, lineDict, isPass){
        let stationParts = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
        stationParts.setAttribute("data-basePoint", this.stationTextBase); //ベースポイントを設定

        const stNameRect = this.mapSVG.querySelector("#body-defaultLine-stationName").cloneNode(true); //駅名テキストrect

        //ナンバリングの上端位置
        let numIconTop = this.lineY;
        
        // ナンバリング
        if(station.number === ""){
            //ナンバリングがない場合は何もしない

            numIconTop = this.lineY;
        }
        else if(station.lineNumberType === "0"){
            //ナンバリング文字表示の場合
            const numRect = this.mapSVG.querySelector("#body-defaultLine-numRect").cloneNode(true); //ナンバリング用矩形

            stationParts.appendChild(this.textDrawer.createByAreaEl(`${station.number.split(' ')[0]}-${station.number.split(' ')[1]}`, numRect).element); //ナンバリングを追加

            numIconTop = parseFloat(numRect.getAttribute("y"));
        }
        else if(station.lineNumberType === "1"){
            //ナンバリングアイコン表示の場合
            const numIconRect = this.mapSVG.querySelector("#body-defaultLine-numIconRect").cloneNode(true); //ナンバリングアイコン用矩形

            stationParts.appendChild(this.numIconDrawer.createNumIconFromPreset(station.numIconPresetKey, station.number.split(' ')[0], station.number.split(' ')[1], station.lineColor, {
                x: parseFloat(numIconRect.getAttribute("x")),
                y: parseFloat(numIconRect.getAttribute("y")),
                width: parseFloat(numIconRect.getAttribute("width")),
                height: parseFloat(numIconRect.getAttribute("height"))
            })); //ナンバリングアイコンを追加

            numIconTop = parseFloat(numIconRect.getAttribute("y"));
        }

        //駅名下端位置を調整
        const upLen = (parseFloat(stNameRect.getAttribute("y")) + parseFloat(stNameRect.getAttribute("height"))) - numIconTop; //駅名下端のY座標を計算
        const stationNameEngRect = this.mapSVG.querySelector("#body-defaultLine-stationNameEng").cloneNode(true); //駅名テキストrect
        stationNameEngRect.setAttribute("transform", `translate(0, ${-upLen}) ${stationNameEngRect.getAttribute("transform")}`); //駅名rectの高さを調整
        //駅名横幅を計算
        const transforms = stationNameEngRect.getAttribute("transform").split(" ");
        let degree = 90;
        transforms.forEach((tr) => {
            if(tr.includes("rotate")){ 
                degree = parseFloat(tr.match(/-?\d+(\.\d+)?/)[0]);    
            }
        })
        const jpWidth = parseFloat(stNameRect.getAttribute("height")) - (this.lineY - numIconTop); 
        const enHeight = stationNameEngRect.getAttribute("height");
        const radAbsDegree = Math.abs(Math.PI * degree / 180);
        const width = jpWidth / (Math.sin(radAbsDegree)) - enHeight * Math.cos(radAbsDegree);
        stationNameEngRect.setAttribute("width", width);
        
        //駅名
        stationParts.appendChild(this.textDrawer.createByAreaEl(station.eng, stationNameEngRect).element);

        //乗換路線
        if((station.transfers.length > 0) || (station.transferTextEng !== "")){
            //路線数、各行テキスト取得
            let transferCnt = 0;
            let lineTexts = []
            if(station.transferTextEng !== ""){ //transferTextがある
                lineTexts = [...station.transferTextEng.split('\n')];
                transferCnt = lineTexts.length;
            }
            else{ //transferTextがない（登録駅リストで対応）
                const transferTextList = station.transfers.split(" ");
                transferCnt = transferTextList.length; //乗換路線の数を取得

                for(let i = 0; i < transferCnt; i++){ 
                    lineTexts.push(`:${lineDict[transferTextList[i]].lineIconKey}:${lineDict[transferTextList[i]].eng}`);
                }
            }
            
            //構成、組み立て
            const lineSpan = 3; //行間[px]
            let height = this.params.lineHeight;
            //乗換路線の表示が下端を超える場合、圧縮
            if(transferCnt * (this.params.lineHeight + lineSpan) > this.params.areaHeight){
                const scale = this.params.areaHeight / (transferCnt * (this.params.lineHeight + lineSpan)); //圧縮率を計算
                height = this.params.lineHeight * scale; //乗換路線の高さを圧縮
            }

            const transferTexts = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
            let y1 = this.params.top;
            const transferLineEngRect = (this.mapSVG).querySelector("#body-defaultLine-transferLineEng");
            for(let i = 0; i < transferCnt; i++){
                transferTexts.appendChild(this.textDrawer.createIconTextByArea(lineTexts[i], this.params.left, y1, this.params.width, height, JSON.parse(transferLineEngRect.getAttribute("data-style")), "ja", this.params.textHeightRatio).element);
                y1 += height + lineSpan; //次の行のY座標を計算
            }
            stationParts.appendChild(transferTexts); //乗換路線を追加
        }

        //所要時間
        if(!isPass && !(station._dispTime < 0)){
            const timeTextRect = (mapSVG).querySelector("#body-defaultLine-timeText");
            stationParts.appendChild(this.textDrawer.createByAreaEl(station._dispTime, timeTextRect).element);
        }

        stationParts = moveSvgElementByBasePoint(stationParts, x, y);

        //通過ならすべてを灰色に
        if(isPass){
            stationParts.setAttribute("filter", "url(#grayscale)");
        }

        return stationParts;
    }
    // 線組み立て
    createLine(stationFrameNum, colorList, passStationList, hereDrawPos, lineLeapPosList, isStart, isEnd){
        console.log(hereDrawPos);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー
        line.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "defs"));

        //線の両端の形を決定
        let lineStart, lineEnd;
        if(isStart){ lineStart = (this.mapSVG).querySelector("#lineStartEdge"); } //線根本
        else{ lineStart = (this.mapSVG).querySelector("#lineStart"); }
        if(isEnd){ lineEnd = (this.mapSVG).querySelector("#lineEndEdge"); } //線先端
        else{ lineEnd = (this.mapSVG).querySelector("#lineEnd"); }
        
        const lineBase = (this.mapSVG).querySelector("#lineBase"); //線中間
        const stationStart = (this.mapSVG).querySelector("#stationStart"); //根本駅
        const stationEnd = (this.mapSVG).querySelector("#stationEnd"); //先端駅
        const passStation = (this.mapSVG).querySelector("#passStation"); //通過駅

        const sectionNum = colorList.length; //描画する区間数（両端含む）を取得
        const sectionWidth = (parseInt(stationEnd.getAttribute("x")) - parseInt(stationStart.getAttribute("x"))) / (stationFrameNum - 1);
        const startX = 0; //根本のx座標
        const buf = 2; //区間間の隙間を埋めるための拡張ピクセル数
        let drawWidth = 0; //一度に描画する区間の長さ
        let drawX = 0;
        for(let i = 0; i < sectionNum; i++){
            let section = 1+Math.floor((i-1)/2);
            if(i === 0){ //最初は、線根本をコピー、設定して追加
                let sectionObj = lineStart.cloneNode(true);
                sectionObj.setAttribute("fill", colorList[i]);
                line.appendChild(sectionObj); //線根本
            }
            else if(i < sectionNum-1){ //中間は、各区間に区間の長さ分のrectを設定し追加
                if(lineLeapPosList.includes(section)){ //その区間が端折られていたら
                    if(i % 2 == 1){ //左のほう
                        let lineLeapObj1 = (this.mapSVG).querySelector("#lineLeap1").cloneNode(true);
                        lineLeapObj1.setAttribute("fill", colorList[i]);
                        moveSvgElementByBasePoint(lineLeapObj1, startX + sectionWidth * (section-1) + parseInt(lineBase.getAttribute("x")) - buf, lineBase.getAttribute("y"));
                        line.appendChild(lineLeapObj1);
                    }
                    else{
                        let lineLeapObj2 = (this.mapSVG).querySelector("#lineLeap2").cloneNode(true);
                        lineLeapObj2.setAttribute("fill", colorList[i]);
                        moveSvgElementByBasePoint(lineLeapObj2, startX + sectionWidth * (section-1) + parseInt(lineBase.getAttribute("x")) + buf, lineBase.getAttribute("y"));
                        line.appendChild(lineLeapObj2);
                    }
                }
                else{
                    drawWidth += sectionWidth / 2;
                    //次も同じ色&次が右端じゃない&次が端折られていないなら、後で描画
                    if((colorList[i] === colorList[i+1]) && (i < sectionNum - 2) && (!(lineLeapPosList.includes(section + 1) && (i % 2 == 0)))){
                        continue;
                    }

                    let sectionObj = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    sectionObj.setAttribute("x", `${drawX + parseInt(lineBase.getAttribute("x")) - buf}`);
                    sectionObj.setAttribute("y", lineBase.getAttribute("y"));
                    sectionObj.setAttribute("width", `${drawWidth + 2*buf}`);
                    sectionObj.setAttribute("height", lineBase.getAttribute("height"));
                    sectionObj.setAttribute("fill", colorList[i]);
                    line.appendChild(sectionObj);

                    drawX += drawWidth;
                    drawWidth = 0;
                }
            }
            else{ //最後は、線先端をコピー、設定して追加
                let sectionObj = lineEnd.cloneNode(true);
                sectionObj = moveSvgElementByBasePoint(sectionObj, parseInt(lineBase.getAttribute("x")) + sectionWidth * (section - 1), parseInt(lineBase.getAttribute("y")));
                sectionObj.setAttribute("fill", colorList[i]);
                line.appendChild(sectionObj);
            }
        }

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
        lineShadowShape.setAttribute("y", lineBase.getAttribute("y"));
        lineShadowShape.setAttribute("width", parseFloat(this.mapSVG.getAttribute("viewBox").split(" ")[2]));
        lineShadowShape.setAttribute("height", lineBase.getAttribute("height"));
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
                stationObj = movePolygonTo(stationObj, stationStartX + i * sectionWidth + parseFloat(stationStart.getAttribute("width")) / 2, parseFloat(lineBase.getAttribute("y")) + parseFloat(lineBase.getAttribute("height")) / 2);
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
    createLineName(_lineNameList, leftOrRight){
        let lineNameList = [..._lineNameList]
        if(leftOrRight === "left"){ lineNameList.reverse(); }

        const lineNameObj = document.createElementNS("http://www.w3.org/2000/svg", "g");

        //根本側路線名
        if(lineNameList[0] !== null){
            let lineNameStartTextRect = this.mapSVG.querySelector("#lineNameStartText");
            let lineNameStartText = this.textDrawer.createByAreaEl(lineNameList[0][0], lineNameStartTextRect).element;
            lineNameStartText.setAttribute("fill", lineNameList[0][2]);
            lineNameObj.appendChild(lineNameStartText);
        }

        //先端側路線名
        if(lineNameList[lineNameList.length-1] !== null){
            let lineNameEndTextRect = this.mapSVG.querySelector("#lineNameEndText");
            let lineNameEndText = this.textDrawer.createByAreaEl(lineNameList[lineNameList.length-1][0], lineNameEndTextRect).element;
            lineNameEndText.setAttribute("fill", lineNameList[lineNameList.length-1][2]);
            lineNameObj.appendChild(lineNameEndText);
        }

        return lineNameObj;
    }
    createLineNameEng(_lineNameList, leftOrRight){
        let lineNameList = [..._lineNameList]
        if(leftOrRight === "left"){ lineNameList.reverse(); }

        const lineNameEngObj = document.createElementNS("http://www.w3.org/2000/svg", "g");

        //根本側路線名
        if(lineNameList[0] !== null){
            let lineNameStartTextRect = this.mapSVG.querySelector("#lineNameStartTextEng");
            let lineNameStartText = this.textDrawer.createByAreaEl(lineNameList[0][1], lineNameStartTextRect).element;
            lineNameStartText.setAttribute("fill", lineNameList[0][2]);
            lineNameEngObj.appendChild(lineNameStartText);
        }

        //先端側路線名
        if(lineNameList[lineNameList.length-1] !== null){
            let lineNameEndTextRect = this.mapSVG.querySelector("#lineNameEndTextEng");
            let lineNameEndText = this.textDrawer.createByAreaEl(lineNameList[lineNameList.length-1][1], lineNameEndTextRect).element;
            lineNameEndText.setAttribute("fill", lineNameList[lineNameList.length-1][2]);
            lineNameEngObj.appendChild(lineNameEndText);
        }

        return lineNameEngObj;
    }
    createMinute(leftOrRight){
        let minuteTextRect = this.mapSVG.querySelector("#MinuteText").cloneNode();
        if(leftOrRight === "left"){ 
            let l = this.stationStartX * 2 - (parseInt(minuteTextRect.getAttribute("x")) - this.lenStartToEnd);
            minuteTextRect.setAttribute("x", `${l - parseInt(minuteTextRect.getAttribute("width"))}`)
        }
        return this.textDrawer.createByAreaEl("(分)", minuteTextRect).element;
    }
    createMinuteEng(leftOrRight){
        let minuteTextRect = this.mapSVG.querySelector("#MinuteTextEng").cloneNode();
        if(leftOrRight === "left"){ 
            let l = this.stationStartX * 2 - (parseInt(minuteTextRect.getAttribute("x")) - this.lenStartToEnd);
            minuteTextRect.setAttribute("x", `${l - parseInt(minuteTextRect.getAttribute("width"))}`)
        }
        return this.textDrawer.createByAreaEl("(min)", minuteTextRect).element;
    }
}