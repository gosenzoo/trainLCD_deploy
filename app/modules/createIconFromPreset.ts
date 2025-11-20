export default function createIconFromPreset(
    numIconPresets: Record<string, string>,
    key: string,
    symbolText: string,
    numberText: string,
    lineColor: string,
    outlineWidth = 0
) {
    let presetSVGText = numIconPresets[key];
    if (!presetSVGText) {
        console.error(`ナンバリング記号プリセットが見つかりません: ${key}`);
        return null;
    }

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(presetSVGText, "image/svg+xml");
    const presetSVG = svgDoc.documentElement;

    const numIconSVG = presetSVG;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const viewBox = numIconSVG.getAttribute("viewBox");
    if(viewBox === null){ return; }
    const viewBoxValues = viewBox.split(" ");

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
        } else if((id === "outline") && (outlineWidth <= 0)) {
            //アウトラインがない場合、outline要素は追加しない
        }
        else {
            group.appendChild(child);
        }
    }

    // 2) groupに移動した要素のうち、id="lineColor" の fill を引数 lineColor に
    const lineColorEl = group.querySelector("#lineColor");
    if (lineColorEl) {
        lineColorEl.setAttribute("fill", lineColor);
    }

    if(symbolArea){
        //group.appendChild(this.textDrawer.createByAreaEl(symbolText, symbolArea).element);
    }
    if(numberArea){
        //group.appendChild(this.textDrawer.createByAreaEl(numberText, numberArea).element);
    }

    return group;
}