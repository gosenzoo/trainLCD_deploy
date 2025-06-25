class TextDrawer{
    constructor(iconDict){
        this.iconDict = iconDict; //アイコン辞書を保存
    }

    createByRectObj(text, rectObj, lang, spacing=0){
        const x = parseFloat(rectObj.getAttribute("x"));
        const y = parseFloat(rectObj.getAttribute("y"));
        const width = parseFloat(rectObj.getAttribute("width"));
        const height = parseFloat(rectObj.getAttribute("height"));
        const color = rectObj.getAttribute("data-color"); //色を取得
        const fontFamily = rectObj.getAttribute("data-fontFamily"); //フォントファミリーを取得
        const fontWeight = rectObj.getAttribute("data-fontWeight"); //フォントウェイトを取得
        const textAnchor = rectObj.getAttribute("data-textAnchor"); //テキストアンカーを取得

        const textObj = this.createByRect(
            text, x, y, width, height, color, fontFamily, fontWeight, textAnchor, lang, spacing
        );

        return textObj;
    }
    createByRect(text, x, y, width, height, color, fontFamily, fontWeight, textAnchor="middle", lang="ja", spacing=0){
        const capHeightRatio = this.measureCapHeightRatio(fontFamily, lang);
        const fontSize = height / capHeightRatio;
        
        let yOffset = height; 
        if(lang === "ja"){ yOffset -= fontSize * 0.08 }// ←この 0.15 は経験的に調整（フォント依存）

        const textElem = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElem.textContent = text;
        if(textAnchor === "middle"){
            textElem.setAttribute("x", String(x + width / 2));
        }
        else if(textAnchor === "start"){
            textElem.setAttribute("x", String(x));
        }
        else if(textAnchor === "end"){
            textElem.setAttribute("x", String(x + width));
        }
        textElem.setAttribute("y", String(y + yOffset));
        textElem.setAttribute("fill", color);
        textElem.setAttribute("font-family", fontFamily);
        textElem.setAttribute("font-size", fontSize.toString());
        textElem.setAttribute("font-weight", fontWeight);
        textElem.setAttribute("text-anchor", textAnchor);
        textElem.setAttribute("dominant-baseline", "alphabetic");
        textElem.setAttribute("letter-spacing", `${spacing}px`); //文字間隔を設定
        
        if(this.measureTextWidth(textElem.textContent, fontSize, fontFamily, fontWeight) > width){
            textElem.setAttribute("textLength", `${width}px`); //テキストの長さを設定
            textElem.setAttribute("lengthAdjust", "spacingAndGlyphs"); //文字間隔とグリフの調整を有効にする
        }

        return textElem;
    }
    createTextWithIcon(text, x, y, width, height, color, fontFamily, fontWeight){
        const textList = text.split(":"); //テキストと、絵文字IDに分割
        if(textList.length % 2 === 0){ //:での分割数が偶数の場合、:が奇数となる。つまり構文エラーなのでnullを返す
            return null; 
        }

        //空文字を除いたテキスト、絵文字IDの数をそれぞれ計算
        let textCnt = 0;
        let iconCnt = 0;
        for(let i = 0; i < textList.length; i++){
            if(textList[i] === ""){ continue; } //空文字ならスキップ
            if(i % 2 === 0){ //テキストなら
                textCnt++;
            }
            else{ //アイコンなら
                iconCnt++;
            }
        }
        //テキストに割り振れる幅を計算
        const allTextWidth = width - height * iconCnt;
        if(allTextWidth < 0){ return null; } //アイコンの幅がテキストの幅を超える場合、nullを返す
        let textWidth = allTextWidth / textCnt; //アイコンを除いたテキストの幅を計算

        const iconTextElem = document.createElementNS("http://www.w3.org/2000/svg", "g");
        let nowX = x; //現在のx座標
        for(let i = 0; i < textList.length; i++){
            if(i % 2 === 0){ //テキストなら
                if(textList[i] === ""){ continue; } //空文字ならスキップ
                const textElem = this.createByRect(
                    textList[i], nowX, y, textWidth, height, color, fontFamily, fontWeight, "start"
                );
                iconTextElem.appendChild(textElem);
                nowX += textWidth; //次のテキストのx座標を更新
            }
            else{ //アイコンなら
                if(textList[i] === ""){ continue; } //空文字ならスキップ
                const iconElem = document.createElementNS("http://www.w3.org/2000/svg", "image");
                iconElem.setAttribute("href", this.iconDict[textList[i]]); //アイコンのURLを設定
                iconElem.setAttribute("x", String(nowX));
                iconElem.setAttribute("y", String(y));
                iconElem.setAttribute("width", String(height));
                iconElem.setAttribute("height", String(height));
                iconTextElem.appendChild(iconElem);
                nowX += height; //次のアイコンのx座標を更新
            }
        }
        return iconTextElem;
    }
    createKurukuruSvg(svgList, kuruTop, kuruBottom, dispTime, transTime, gapTime){
        const kuruGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

        //1周期の時間[s]
        let periodTime = (dispTime + transTime + gapTime) * svgList.length / 1000;

        let keyTimeText, scaleInValuesText, scaleOutValuesText, opacityValuesText;
        for(let i = 0; i < svgList.length; i++){
            keyTimeText = this.getKeyTime(dispTime, transTime, gapTime, i, svgList.length);
            scaleInValuesText = this.getInScaleValues(i, svgList.length);
            scaleOutValuesText = this.getOutScaleValues(i, svgList.length);
            opacityValuesText = this.getOpacityValues(i, svgList.length);

            let kurukuruSvgInnerText = `
                <!-- 上端からスケールアップ -->
                <animateTransform attributeName="transform"
                                type="scale"
                                additive="sum"
                                values="${scaleInValuesText}"
                                keyTimes="${keyTimeText}"
                                dur="${periodTime}s"
                                repeatCount="indefinite" />

                <!-- fill-opacity アニメーション（透明度） -->
                <animate attributeName="fill-opacity"
                        values="${opacityValuesText}"
                        keyTimes="${keyTimeText}"
                        dur="${periodTime}s"
                        repeatCount="indefinite" />`;

            svgList[i].innerHTML += kurukuruSvgInnerText;
            svgList[i].setAttribute("y", `${parseFloat(svgList[i].getAttribute("y")) - kuruTop}`); //y座標を調整

            let kurukuruSvgOuterText = `
                <!-- フェードアウト -->
                <g transform="translate(0,${kuruBottom})">
                    <!-- フェードイン -->
                    <g transform="translate(0,${kuruTop - kuruBottom})">
                        ${svgList[i].outerHTML}
                    </g>

                    <!-- 下端でスケールダウン -->
                    <animateTransform attributeName="transform"
                                    type="scale"
                                    additive="sum"
                                    values="${scaleOutValuesText}"
                                    keyTimes="${keyTimeText}"
                                    dur="${periodTime}s"
                                    repeatCount="indefinite" />
                </g>`;
            kuruGroup.innerHTML += kurukuruSvgOuterText;
        }
        return kuruGroup;
    }
    measureCapHeightRatio(fontFamily, lang){
        // Canvas 要素を作成（DOMに追加しない）
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const fontSize = 100; // 比率を安定させるために大きめ
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.textBaseline = 'top';
        ctx.font = `${fontSize}px ${fontFamily}`;
        if(lang == "en"){
            ctx.fillText('H', 50, 50);
        }
        else if(lang === "ja"){
            ctx.fillText('寺', 50, 50);
        }
        else{
            ctx.fillText('H', 50, 50); // デフォルトは英語のH
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let top = null;
        let bottom = null;
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                const alpha = data[idx + 3];
                if (alpha > 0) {
                    if (top === null) top = y;
                    bottom = y;
                    break; // この行で1ピクセルでも描画されていればそのyを記録
                }
            }
        }

        if (top !== null && bottom !== null) {
            return (bottom - top + 1) / fontSize;
        }
        return null; // 何も描画されていなかった場合
    }
    measureTextWidth(text, fontSize, fontFamily, fontWeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // フォントスタイルを正確に組み立て
        ctx.font = `${fontSize}px '${fontFamily}'`; // フォントファミリーを 'sans-serif' に設定
        //if(text === "湘南新宿ライン"){ console.log(ctx.font); }

        const metrics = ctx.measureText(text);
        return metrics.width;
    }

    getKeyTime(dispTime, transTime, gapTime, textInd, textNum){
        let periodTime = (dispTime + transTime + gapTime) * textNum;
        let keyTimeText = "0";
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        for(let i = 0; i < textNum; i++){
            let now = i * (dispTime + transTime + gapTime);
            if(i === inInd){
            //フェードイン開始
            now += dispTime + gapTime;
            keyTimeText += `;${now / periodTime}`;
            //フェードイン終了
            now += transTime;
            keyTimeText += `;${now / periodTime}`;
            }
            else if(i === outInd){
            //フェードアウト開始
            now += dispTime;
            keyTimeText += `;${now / periodTime}`;
            //フェードアウト終了
            now += transTime;
            keyTimeText += `;${now / periodTime}`;
            }
        }
        if(0 < textInd && textInd < textNum - 1){ keyTimeText += `;1`; } //最後の要素は1で終わる
        return keyTimeText;
    }
    getOpacityValues(textInd, textNum){
        let valueText = "";
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        if(textInd === 0){ valueText += "1"; }
        else{ valueText += "0"; }
        for(let i = 0; i < textNum; i++){
            if(i === inInd){
            //フェードイン開始
            valueText += `;0`;
            //フェードイン終了
            valueText += `;1`;
            }
            else if(i === outInd){
            //フェードアウト開始
            valueText += `;1`;
            //フェードアウト終了
            valueText += `;0`;
            }
        }
        if(0 < textInd && textInd < textNum - 1){ valueText += `;0`; } //最後の要素は1で終わる
        return valueText;
    }
    getInScaleValues(textInd, textNum){
        let scaleText = "";
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        if(textInd === 0){ scaleText += "1,1"; }
        else{ scaleText += "1,0"; }
        for(let i = 0; i < textNum; i++){
            if(i === inInd){
            //フェードイン開始
            scaleText += `;1,0`;
            //フェードイン終了
            scaleText += `;1,1`;
            }
            else if(i === outInd){
            //フェードアウト開始
            scaleText += `;1,1`;
            //フェードアウト終了
            scaleText += `;1,1`;
            }
        }
        if(0 < textInd && textInd < textNum - 1){ scaleText += `;1,1`; }
        return scaleText;
    }
    getOutScaleValues(textInd, textNum){
        let scaleText = "";
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        if(textInd === 0){ scaleText += "1,1"; }
        else{ scaleText += "1,0"; }
        for(let i = 0; i < textNum; i++){
            if(i === inInd){
            //フェードイン開始
            scaleText += `;1,1`;
            //フェードイン終了
            scaleText += `;1,1`;
            }
            else if(i === outInd){
            //フェードアウト開始
            scaleText += `;1,1`;
            //フェードアウト終了
            scaleText += `;1,0`;
            }
        }
        if(0 < textInd && textInd < textNum - 1){ scaleText += `;1,1`; }
        return scaleText;
    }
}