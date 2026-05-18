// ============================================================
// IconDrawer
// iconDict に登録されたプリセット型アイコン（{presetType, symbol, color}）を
// SVG要素として描画するクラス。NumIconDrawer と同様の仕組みで、
// /iconPresets/{presetType}.svg を事前にフェッチしてキャッシュしておく。
// ============================================================
class IconDrawer {
    /**
     * @param {object} iconPresets - presetType → SVGElement のマップ（事前フェッチ済み）
     */
    constructor(iconPresets) {
        // presetType → SVGElement のキャッシュ
        this._iconPresets = iconPresets || {};
        // symbolArea へのテキスト描画用（iconDict参照なし・空のTextDrawer）
        this._textDrawer = new TextDrawer({}, null);
    }

    /**
     * iconParamsType（{presetType, symbol, color}）から SVG グループ要素を生成する。
     * NumIconDrawer.createNumIconFromPreset と同等の変換を行うが、
     * numberArea は持たず symbolArea と lineColor のみを対象とする。
     *
     * @param {string} presetType  - SVGプリセットキー（例: "I_tokyu"）
     * @param {string} symbol      - 路線記号テキスト（例: "TY"）
     * @param {string} color       - 路線カラー（例: "#e60012"）
     * @param {object} geometry    - 描画先の矩形 { x, y, width, height }
     * @returns {SVGGElement|null}
     */
    createIcon(presetType, symbol, color, geometry = { x: 0, y: 0, width: 0, height: 0 }) {
        const presetSVG = this._iconPresets[presetType];
        if (!presetSVG) {
            console.warn(`アイコンプリセットが見つかりません: ${presetType}`);
            return null;
        }

        const svgClone = presetSVG.cloneNode(true);
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

        // viewBox からデフォルト座標系を取得
        const viewBoxValues = (svgClone.getAttribute("viewBox") || "0 0 225 225").split(/[\s,]+/);
        const defaultGeometry = {
            x:      parseFloat(viewBoxValues[0]),
            y:      parseFloat(viewBoxValues[1]),
            width:  parseFloat(viewBoxValues[2]),
            height: parseFloat(viewBoxValues[3])
        };

        // <svg>直下の子要素を group に移動し、symbolArea だけ別途保持する
        let symbolArea = null;
        for (const child of Array.from(svgClone.children)) {
            const id = child.getAttribute("id");
            if (id === "symbolArea") {
                symbolArea = child;
            } else {
                group.appendChild(child);
            }
        }

        // id="lineColor" の fill に路線カラーを適用する
        const lineColorEl = group.querySelector("#lineColor");
        if (lineColorEl && color) {
            lineColorEl.setAttribute("fill", color);
        }

        // symbolArea に路線記号テキストを描画する
        if (symbolArea && symbol) {
            const textResult = this._textDrawer.create(symbol, symbolArea);
            if (textResult) group.appendChild(textResult.element);
        }

        // geometry に合わせてアフィン変換を適用する（NumIconDrawer と同一ロジック）
        const src = defaultGeometry;
        const dst = geometry;
        const sx = src.width  !== 0 ? dst.width  / src.width  : 1;
        const sy = src.height !== 0 ? dst.height / src.height : 1;
        const tx = dst.x - src.x * sx;
        const ty = dst.y - src.y * sy;
        group.setAttribute("transform", `matrix(${sx} 0 0 ${sy} ${tx} ${ty})`);

        return group;
    }
}
