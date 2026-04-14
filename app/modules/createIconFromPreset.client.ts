// Canvas でフォントのキャップハイト比を計測し、領域高さに合わせたフォントサイズを返す
function getFontSize(height: number, fontFamily: string, lang: string): number {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    if (!ctx) return height * 0.8

    const testSize = 100
    ctx.clearRect(0, 0, 200, 200)
    ctx.fillStyle = 'black'
    ctx.textBaseline = 'top'
    ctx.font = `${testSize}px ${fontFamily}`
    ctx.fillText(lang === 'ja' ? '寺' : 'H', 50, 50)

    const data = ctx.getImageData(0, 0, 200, 200).data
    let top: number | null = null
    let bottom: number | null = null
    for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 200; x++) {
            if (data[(y * 200 + x) * 4 + 3] > 0) {
                if (top === null) top = y
                bottom = y
                break
            }
        }
    }
    if (top !== null && bottom !== null) {
        return height / ((bottom - top + 1) / testSize)
    }
    return height * 0.8 // 計測失敗時のフォールバック
}

// Canvas でテキスト描画幅を計測する
function getTextWidth(text: string, fontSize: number, fontWeight: string, fontFamily: string): number {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 0
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    return ctx.measureText(text).width
}

// styleJson オブジェクトを CSS インラインスタイル文字列に変換する
function styleJsonToCss(styleJson: Record<string, string>): string {
    return Object.entries(styleJson)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, s => '-' + s.toLowerCase())}:${v}`)
        .join(';')
}

// symbolArea / numberArea の <rect> 要素属性をもとに SVG <text> 要素を生成する
// 表示ソフト側の TextDrawer.createByAreaEl と同等のロジック
function createTextFromArea(text: string, areaEl: Element): SVGElement | null {
    if (!text) return null
    const x      = parseFloat(areaEl.getAttribute('x')      ?? '0')
    const y      = parseFloat(areaEl.getAttribute('y')      ?? '0')
    const width  = parseFloat(areaEl.getAttribute('width')  ?? '0')
    const height = parseFloat(areaEl.getAttribute('height') ?? '0')
    const styleJsonStr = areaEl.getAttribute('data-style')
    if (!styleJsonStr) return null
    const styleJson: Record<string, string> = JSON.parse(styleJsonStr)
    const lang = areaEl.getAttribute('lang') ?? 'ja'

    const fontFamily = styleJson.fontFamily ?? 'sans-serif'
    const fontWeight = styleJson.fontWeight ?? 'normal'
    const fontSize   = getFontSize(height, fontFamily, lang)
    const textWidth  = getTextWidth(text, fontSize, fontWeight, fontFamily)

    const textElem = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElem.textContent = text

    // テキストが領域幅を超える場合は自動縮小
    if (textWidth > width) {
        textElem.setAttribute('textLength', String(width))
        textElem.setAttribute('lengthAdjust', 'spacingAndGlyphs')
    }

    // textAnchor に応じて x 座標を設定
    if (styleJson.textAnchor === 'middle')     textElem.setAttribute('x', String(x + width / 2))
    else if (styleJson.textAnchor === 'end')   textElem.setAttribute('x', String(x + width))
    else                                        textElem.setAttribute('x', String(x))

    // y 座標: TextDrawer と同じ計算（日本語フォントは微調整）
    const yOffset = lang === 'ja' ? height - fontSize * 0.08 : height
    textElem.setAttribute('y', String(y + yOffset))
    textElem.setAttribute('font-size', String(fontSize))
    textElem.setAttribute('style', styleJsonToCss(styleJson))

    return textElem as unknown as SVGElement
}

export default function createIconFromPreset(
    numIconPresets: Record<string, string>,
    key: string,
    symbolText: string,
    numberText: string,
    lineColor: string,
    outlineWidth = 0
) {
    if (typeof window === "undefined" || typeof DOMParser === "undefined") {
        // SSR / Node.js 環境ではパースしない
        return null;
    }

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

    // 1) <svg>直下の子要素をgroupに移動。ただし symbolArea / numberArea は移動せず保持
    let symbolArea: Element | null = null;
    let numberArea: Element | null = null;

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

    // 3) symbolArea / numberArea の rect 属性をもとに SVG <text> を生成して追加する
    if (symbolArea) {
        const textEl = createTextFromArea(symbolText, symbolArea)
        if (textEl) group.appendChild(textEl)
    }
    if (numberArea) {
        const textEl = createTextFromArea(numberText, numberArea)
        if (textEl) group.appendChild(textEl)
    }

    return group;
}
