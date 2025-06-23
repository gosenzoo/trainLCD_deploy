class TextDrawer{
    constructor(iconDict){
        this.iconDict = iconDict; //アイコン辞書を保存
    }

    createByRectObj(text, rectObj, lang){
        const x = parseFloat(rectObj.getAttribute("x"));
        const y = parseFloat(rectObj.getAttribute("y"));
        const width = parseFloat(rectObj.getAttribute("width"));
        const height = parseFloat(rectObj.getAttribute("height"));
        const color = rectObj.getAttribute("data-color"); //色を取得
        const fontFamily = rectObj.getAttribute("data-fontFamily"); //フォントファミリーを取得
        const fontWeight = rectObj.getAttribute("data-fontWeight"); //フォントウェイトを取得
        const textAnchor = rectObj.getAttribute("data-textAnchor"); //テキストアンカーを取得

        const textObj = this.createByRect(
            text, x, y, width, height, color, fontFamily, fontWeight, textAnchor, lang //フォント設定
        );

        return textObj;
    }
    createByRect(text, x, y, width, height, color, fontFamily, fontWeight, textAlign, lang){
        const capHeightRatio = this.measureCapHeightRatio(fontFamily, lang);
        const fontSize = height / capHeightRatio;
        let yOffset = height; 
        if(lang === "ja"){ yOffset -= fontSize * 0.15 }// ←この 0.15 は経験的に調整（フォント依存）

        const textElem = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElem.textContent = text;
        textElem.setAttribute("x", String(x + width / 2));
        textElem.setAttribute("y", String(y + yOffset));
        textElem.setAttribute("fill", color);
        textElem.setAttribute("font-family", fontFamily);
        textElem.setAttribute("font-size", fontSize.toString());
        textElem.setAttribute("font-weight", fontWeight);
        textElem.setAttribute("text-anchor", "middle");
        textElem.setAttribute("dominant-baseline", "alphabetic");

        return textElem;
    }
    createTextWithIcon(){

    }
    createAnimationText(){
    
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
            ctx.fillText('国', 50, 50);
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
}