// lcdParts="group" または <svg> ルートに対応するオブジェクトクラス
// 子 LcdPartsObj / StaticObj / GroupObj を保持し、getElement で連結して返す。
class GroupObj {
    // svgDom: 対応するDOM要素（ルートの場合は null）
    constructor(svgDom) {
        // visible属性を文字列のまま保持（getElementで評価）
        this.visible  = svgDom ? svgDom.getAttribute('visible') : null;
        this.children = [];
    }

    addChild(child) {
        this.children.push(child);
    }

    // ctx: { resolveValue, exprParser } | null
    getElement(ctx = null) {
        // visible属性がある場合、式を評価して非表示なら null を返す
        if (this.visible !== null && ctx && ctx.exprParser) {
            if (!ctx.exprParser.eval(this.visible, ctx.resolveValue)) return null;
        }

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        for (const child of this.children) {
            // 各子にctxを伝播してvisible評価を行う
            const el = child.getElement(ctx);
            if (el) g.appendChild(el);
        }
        return g;
    }
}
