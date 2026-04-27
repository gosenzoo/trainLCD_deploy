// lcdParts="static" に対応するオブジェクトクラス
// svgDom をそのまま cloneNode して返す。visible属性による表示制御のみサポート。
class StaticObj {
    constructor(svgDom) {
        // visible属性を文字列のまま保持（getElementで評価）
        this.visible = svgDom.getAttribute('visible');
        this._svgDom = svgDom;
    }

    // ctx: { resolveValue, exprParser } | null
    getElement(ctx = null) {
        // visible属性がある場合、式を評価して非表示なら null を返す
        if (this.visible !== null && ctx && ctx.exprParser) {
            if (!ctx.exprParser.eval(this.visible, ctx.resolveValue)) return null;
        }
        return this._svgDom.cloneNode(true);
    }
}
