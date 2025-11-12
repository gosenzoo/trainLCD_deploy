class NumIconDrawer {
    constructor(numIconPresets) {
        this.textDrawer = new TextDrawer({});
        this.numIconPresets = numIconPresets;
        console.log(numIconPresets);
    }

    createNumIconFromPreset(key, symbolText, numberText, lineColor, geometory = { x: 0, y: 0, width: 0, height: 0 }, outlineWidth = 0) {
        let presetSVG = this.numIconPresets[key];
        if (!presetSVG) {
            console.error(`ナンバリング記号プリセットが見つかりません: ${key}`);
            return null;
        }

        const numIconSVG = presetSVG.cloneNode(true);
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const viewBoxValues = numIconSVG.getAttribute("viewBox").split(" ");
        const defaultGeomeroty = {
            x: parseFloat(viewBoxValues[0]),
            y: parseFloat(viewBoxValues[1]),
            width: parseFloat(viewBoxValues[2]),
            height: parseFloat(viewBoxValues[3])
        };

        // 1) <svg>直下の子要素をgroupに移動。ただし symbolArea / numberArea は移動せず保持
        let symbolArea = null;
        let numberArea = null;

        // 子ノードを配列化（ライブコレクション対策）
        const children = Array.from(numIconSVG.children);
        for (const child of children) {
            const id = child.getAttribute("id");
            if (id === "symbolArea") {
                symbolArea = child;
            } else if (id === "numberArea") {
                numberArea = child;
            } else {
                group.appendChild(child);
            }
        }

        // 2) groupに移動した要素のうち、id="lineColor" の fill を引数 lineColor に
        const lineColorEl = group.querySelector("#lineColor");
        if (lineColorEl) {
            lineColorEl.setAttribute("fill", lineColor);
        }

        group.appendChild(this.textDrawer.createByAreaEl(symbolText, symbolArea).element);
        group.appendChild(this.textDrawer.createByAreaEl(numberText, numberArea).element);

        // 3) group全体を geometory の範囲に合わせて変形
        //    変形前の範囲は defaultGeomeroty
        const src = defaultGeomeroty;
        const dst = geometory;

        // 幅・高さ 0 回避（0なら元スケール1を採用）
        const sx = (src.width !== 0) ? (dst.width / src.width) : 1;
        const sy = (src.height !== 0) ? (dst.height / src.height) : 1;

        // 平行移動成分：dst原点 = src原点を拡大縮小後に合わせ込む
        // matrix(a b c d e f) = [ a c e
        //                         b d f
        //                         0 0 1 ]
        // a=sx, d=sy, e=tx, f=ty
        const tx = dst.x - src.x * sx;
        const ty = dst.y - src.y * sy;

        //アウトラインの太さを設定
        group.querySelectorAll("#outline").forEach(elem => {
            elem.setAttribute("stroke-width", outlineWidth * 2 / ((sx + sy) / 2)); //平均スケールで補正
        });

        group.setAttribute("transform", `matrix(${sx} 0 0 ${sy} ${tx} ${ty})`);

        return group;
    }
}