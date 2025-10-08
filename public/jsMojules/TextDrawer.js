class TextDrawer{
    constructor(iconDict){
        this.iconDict = iconDict; //アイコン辞書を保存
        this.capRatioCache = {};
    }

    //矩形領域にフィットするよう文字を配置（領域はElementで渡す）
    createByAreaEl2(text, areaParams){
        let textEl;
        if(areaParams.axis === "vertical"){
            textEl = this.createByAreaVertical(text, areaParams.x, areaParams.y, areaParams.width, areaParams.height, areaParams.styleJson, areaParams.spacing, areaParams.base);
        }
        else{
            textEl = this.createByArea(text, areaParams.x, areaParams.y, areaParams.width, areaParams.height, areaParams.styleJson, areaParams.lang);
        }
        return textEl;
    }

    //矩形領域にフィットするよう文字を配置（領域はElementで渡す）
    createByAreaEl(text, areaEl){
        const x = parseFloat(areaEl.getAttribute("x"));
        const y = parseFloat(areaEl.getAttribute("y"));
        const width = parseFloat(areaEl.getAttribute("width"));
        const height = parseFloat(areaEl.getAttribute("height"));
        const styleJson = JSON.parse(areaEl.getAttribute("data-style"));
        const lang = areaEl.getAttribute("lang");
        const axis = areaEl.getAttribute("axis");
        const spacing = parseFloat(areaEl.getAttribute("spacing"));
        const base = areaEl.getAttribute("base");

        let textEl;
        if(axis === "vertical"){
            textEl = this.createByAreaVertical(text, x, y, width, height, styleJson, spacing, base);
        }
        else{
            textEl = this.createByArea(text, x, y, width, height, styleJson, lang);
        }
        return textEl;
    }
    //矩形領域にフィットするよう文字を配置（領域はパラメータで定める）
    createByArea(text, x, y, maxWidth, height, styleJson, lang='ja'){
        //return { element: document.createElementNS("http://www.w3.org/2000/svg", "text"), width: 100 }; //ダミー
        if(lang === null){ lang = "ja"; }

        //文字間隔がJSONなら、適する値を取り出す
        if(this.isObject(styleJson.letterSpacing)){
            if(Object.keys(styleJson.letterSpacing).includes(`${text.length}`)){
                styleJson.letterSpacing = styleJson.letterSpacing[text.length];
            }
            else{
                styleJson.letterSpacing = "0px";
            }
        }

        const textElem = document.createElementNS("http://www.w3.org/2000/svg", "text");
        const fontSize = this.getFontSize(height, styleJson.fontFamily, lang);

        let textWidth = this.getTextWidth(text, fontSize, styleJson);
        if(textWidth > maxWidth){ //テキスト描画時の長さがmaxSizeを超えていたら、圧縮
            textElem.setAttribute("textLength", `${maxWidth}px`); //テキストの長さを設定
            textElem.setAttribute("lengthAdjust", "spacingAndGlyphs"); //文字間隔とグリフの調整を有効にする
            textWidth = maxWidth;
        }
        //各パラメータを設定
        textElem.textContent = text;
        if(styleJson.textAnchor === "middle"){ textElem.setAttribute("x", String(x + maxWidth / 2)); }
        else if(styleJson.textAnchor === "start"){ textElem.setAttribute("x", String(x)); }
        else if(styleJson.textAnchor === "end"){ textElem.setAttribute("x", String(x + maxWidth)); }

        let yOffset = height; 
        if(lang === "ja"){ yOffset -= fontSize * 0.08 }// ←この 0.15 は経験的に調整（フォント依存）
        textElem.setAttribute("y", String(y + yOffset));
        textElem.setAttribute("font-size", fontSize.toString());
        textElem.setAttribute("style", this.styleTextFromJson(styleJson));

        return {element: textElem, width: textWidth};
    }
    createByAreaVertical(text, x, y, width, height, styleJson, spacing=5, base="bottom"){
        if(spacing === null){ spacing = 5; }
        if(base === null){ base = "bottom"; }

        const stationName = document.createElementNS("http://www.w3.org/2000/svg", "g"); //駅名テキスト用グループ

        const areaBottomY = y + height; //駅名矩形の下端Y座標を取得
        let mojiX = x;
        let mojiY = areaBottomY - width;
        for(let i = 0; i < text.length; i++){ //1文字ずつ設置
            stationName.appendChild(this.createByArea(text[text.length-1 - i], mojiX, mojiY, width, width, styleJson, "ja").element);
            mojiY -= width + spacing;
        }
        //駅名の高さが矩形の高さを超える場合、圧縮
        const stationNameHeight = text.length * width + (text.length-1) * spacing; //駅名の高さを計算
        const maxHeight = height; //矩形の高さを取得
        if(stationNameHeight > maxHeight){
            const scale = maxHeight / stationNameHeight; //圧縮率を計算
            stationName.setAttribute("transform", ` translate(0,${areaBottomY}) scale(1,${scale}) translate(0,${-areaBottomY})`); //駅名を圧縮
        }
        return {element: stationName};
    }
    createIconTextByArea(text, x, y, width, height, styleJson, lang='ja', textHeightRatio=1){
        if(lang == null){ lang = 'ja'; }
        if(textHeightRatio == null){ textHeightRatio = 1; }

        const textList = text.split(":"); //テキストと、絵文字IDに分割
        if(textList.length % 2 === 0){ //:での分割数が偶数の場合、:が奇数となる。つまり構文エラーなのでnullを返す
            return null; 
        }

        const spacing = 1;

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
        const allTextWidth = width - (height + spacing) * iconCnt;
        if(allTextWidth < 0){ return null; } //アイコンの幅がテキストの幅を超える場合、nullを返す
        let textWidth = allTextWidth / textCnt; //アイコンを除いたテキストの幅を計算

        const iconTextElem = document.createElementNS("http://www.w3.org/2000/svg", "g");
        let nowX = x; //現在のx座標
        for(let i = 0; i < textList.length; i++){
            if(i % 2 === 0){ //テキストなら
                if(textList[i] === ""){ continue; } //空文字ならスキップ
                const textObj = this.createByArea(
                    textList[i], nowX, y + (height * (1 - textHeightRatio) / 2), textWidth, height * textHeightRatio, styleJson, lang
                );
                iconTextElem.appendChild(textObj.element);
                nowX += textObj.width; //次のテキストのx座標を更新
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
                nowX += height + spacing; //次のアイコンのx座標を更新
            }
        }
        return iconTextElem;
    }

    getTextWidth(text, fontSize, styleJson){
        //return 100;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // フォントスタイルを正確に組み立て
        ctx.font = `${fontSize}px '${styleJson.fontFamily}'`;
        //if(text === "湘南新宿ライン"){ console.log(ctx.font); }

        const metrics = ctx.measureText(text);
        let width;
        if(styleJson.letterSpacing != null){
            width = metrics.width + (text.length - 1) * parseInt(styleJson.letterSpacing);
        }
        else{
            width = metrics.width;
        }
        //console.log(metrics.width)
        return width;
    }
    styleTextFromJson(styleJson){
        let styleText = "";
        for (let key in styleJson) {
            let keyCss = this.toSnake(key);
            styleText += `${keyCss}:${styleJson[key]};`
        }
        return styleText;
    }
    toSnake(str){
        return str.replace(/([A-Z])/g, (s) => {return '-' + s.charAt(0).toLowerCase();})
    }
    isObject(value) {
        return value !== null && typeof value === 'object';
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

    createKurukuruSvg2(svgList, kuruTop, kuruBottom, dispTime, transTime, gapTime){
        const kuruGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

        //1周期の時間[s]
        let periodTime = (dispTime + transTime + gapTime) * svgList.length / 1000;

        let styleText = "";
        for(let i = 0; i < svgList.length; i++){
            styleText +=  `
                .kuru${i} { 
                    animation-name: kuru${i}Cycle;
                    animation-duration:${periodTime}s;
                    animation-iteration-count: infinite;
                    animation-timing-function: linear;    
                }
                @keyframes kuru${i}Cycle {
                    ${this.getKeyframeText(dispTime, transTime, gapTime, i, svgList.length, kuruTop, kuruBottom)}
                }
            `;
            
            let elem = svgList[i].cloneNode(true);
            //elem.setAttribute("id", `kuru${i}`);
            elem.classList.add(`kuru${i}`);
            kuruGroup.appendChild(elem);
        }
        let styleDom = document.createElement("style");
        styleDom.innerHTML = styleText;
        kuruGroup.appendChild(styleDom);
        return kuruGroup;
    }
    getFontSize(height, fontFamily, lang){
        //return 100;
        const capHeightRatio = this.measureCapHeightRatio(fontFamily, lang);
        const fontSize = height / capHeightRatio;
        return fontSize;
    }
    measureCapHeightRatio(fontFamily, lang){
        //キャッシュを確認
        const key = `${fontFamily}-${lang}`;
        if (this.capRatioCache[key]) return this.capRatioCache[key];

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
            const ratio = (bottom - top + 1) / fontSize;
            this.capRatioCache[key] = ratio; // キャッシュに保存
            return ratio;
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

    getKeyframeText(dispTime, transTime, gapTime, textInd, textNum, kuruTop, kuruBottom){
        let periodTime = (dispTime + transTime + gapTime) * textNum;
        let keyframesText = "0%, ";
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        for(let i = 0; i < textNum; i++){
            let now = i * (dispTime + transTime + gapTime);
            if(i === inInd){
                //フェードイン開始
                now += dispTime + gapTime;
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                    transform-origin: 0px ${kuruTop}px;
                    transform: scaleY(0);
                }\n`;
                //フェードイン終了
                now += transTime;
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                    transform-origin: 0px ${kuruTop}px;
                    transform: scaleY(1);
                }\n`;;
            }
            else if(i === outInd){
                //フェードアウト開始
                now += dispTime;
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                    transform-origin: 0px ${kuruBottom}px;
                    transform: scaleY(1);
                }\n`;
                //フェードアウト終了
                now += transTime;
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                    transform-origin: 0px ${kuruBottom}px;
                    transform: scaleY(0);
                }\n`;
            }
        }
        if(0 < textInd){ keyframesText += 
            `100% {
                opacity: 0;
                transform-origin: 0px ${kuruBottom}px;
                transform: scaleY(0);
            }\n`;
        } //最後の要素は1で終わる
        return keyframesText;
    }
    getOpacityValues2(textInd, textNum){
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
    getInScaleValues2(textInd, textNum){
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
    getOutScaleValues2(textInd, textNum){
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