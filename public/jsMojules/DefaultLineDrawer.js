class DefaultLineDrawer{
    constructor(mapSVG, iconDict){
        this.mapSVG = mapSVG
        this.iconDict = iconDict;

        this.lineX = parseFloat(this.mapSVG.querySelector("#lineStart").getAttribute("x"));
        this.lineY = parseFloat(this.mapSVG.querySelector("#lineStart").getAttribute("y"));
        this.stationStartX = this.lineX + parseFloat(this.mapSVG.querySelector("#lineStart").getAttribute("width"));
        this.lenStartToEnd = parseFloat(this.mapSVG.querySelector("#stationEnd").getAttribute("x")) - parseFloat(this.mapSVG.querySelector("#stationStart").getAttribute("x"));

        console.log("DefaultLineDrawer初期化完了");
    }

    createAll(drawParams, size){
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        group.appendChild(this.createLine(drawParams.stationFrameNum, drawParams.colorList, drawParams.passStationList)) //線

        let d = drawParams.hereDrawPos * (this.lenStartToEnd / (drawParams.stationFrameNum - 1));
        group.appendChild(this.createHereIcon(this.stationStartX + d, this.lineY));

        return group;
    }
    createStationParts(){

    }
    // 線組み立て
    createLine(stationFrameNum, colorList, passStationList){
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
            let sectionObj = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            sectionObj.setAttribute("x", `${startX + sectionWidth * (i-1) + parseInt(lineStart.getAttribute("width")) - buf}`);
            sectionObj.setAttribute("y", lineStart.getAttribute("y"));
            sectionObj.setAttribute("width", `${sectionWidth + 2*buf}`);
            sectionObj.setAttribute("height", lineStart.getAttribute("height"));
            sectionObj.setAttribute("fill", colorList[i]);
            line.appendChild(sectionObj);
            }
            else{ //最後は、線先端をコピー、設定して追加
                let sectionObj = lineEnd.cloneNode(true);
                sectionObj = movePolygonTo(sectionObj, startX + parseInt(lineStart.getAttribute("width")) + sectionWidth * (sectionNum-2), parseInt(lineStart.getAttribute("y")));
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