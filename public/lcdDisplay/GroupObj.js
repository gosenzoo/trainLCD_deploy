// lcdParts="group" または <svg> ルートに対応するオブジェクトクラス
// 子 LcdPartsObj / StaticObj / GroupObj を保持し、getElement で連結して返す。
class GroupObj {
    // svgDom: 対応するDOM要素（ルートの場合は null）
    constructor(svgDom) {
        // visible属性を文字列のまま保持（getElementで評価）
        this.visible  = svgDom ? svgDom.getAttribute('visible') : null;
        this.children = [];

        // アニメーション属性の読み取り
        this._animType   = svgDom ? (svgDom.getAttribute('lcd-animType') || 'nothing') : 'nothing';
        const _kt        = svgDom ? parseFloat(svgDom.getAttribute('lcd-kuruTop'))    : NaN;
        const _kb        = svgDom ? parseFloat(svgDom.getAttribute('lcd-kuruBottom')) : NaN;
        this._kuruTop    = isNaN(_kt) ? null : _kt;
        this._kuruBottom = isNaN(_kb) ? null : _kb;

        // kuruデフォルト値算出用のy/height
        this.y      = svgDom ? (parseFloat(svgDom.getAttribute('y'))      || 0) : 0;
        this.height = svgDom ? (parseFloat(svgDom.getAttribute('height')) || 0) : 0;

        // アニメーション状態管理フィールド
        this._domEl        = null;
        this._prevVisible  = true;
        this._resolveValue = null;
        this._exprParser   = null;
    }

    addChild(child) {
        this.children.push(child);
    }

    // visible属性を評価して真偽値を返す（_resolveValue未設定なら常にtrue）
    _evalVisible() {
        if (this.visible === null || !this._resolveValue || !this._exprParser) return true;
        return !!this._exprParser.eval(this.visible, this._resolveValue);
    }

    // ctx: { resolveValue, exprParser } | null
    // visible=false でも null を返さず visibility:hidden のノードを返す（アニメーション対応）
    getElement(ctx = null) {
        if (ctx) {
            this._resolveValue = ctx.resolveValue;
            this._exprParser   = ctx.exprParser;
        }

        const isVisible   = this._evalVisible();
        this._prevVisible = isVisible;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        // 表示/非表示を visibility で制御する（display:noneではなくanimation対応のため）
        g.style.visibility = isVisible ? '' : 'hidden';
        this._domEl = g;

        // 各子にctxを伝播してvisible評価を行う
        for (const child of this.children) {
            const el = child.getElement(ctx);
            if (el) g.appendChild(el);
        }
        return g;
    }

    // visible を再評価してアニメーションを適用し、子要素へ伝播する
    langChange(transTime, gapTime) {
        if (this.visible !== null && this._domEl) {
            const newVisible = this._evalVisible();
            if (newVisible !== this._prevVisible) {
                const top    = this._kuruTop    !== null ? this._kuruTop    : this.y;
                const bottom = this._kuruBottom !== null ? this._kuruBottom : this.y + this.height;
                if (newVisible) {
                    window.lcdAnimator.applyAppear(this._domEl, this._animType, transTime, gapTime, top, bottom);
                } else {
                    window.lcdAnimator.applyDisappear(this._domEl, this._animType, transTime, gapTime, top, bottom);
                }
                this._prevVisible = newVisible;
            }
        }
        // 子要素へ伝播
        for (const child of this.children) {
            if (child.langChange) child.langChange(transTime, gapTime);
        }
    }
}
