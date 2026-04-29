// lcdParts="static" に対応するオブジェクトクラス
// getElement は参照渡し。テンプレート保護のためクローンはコンストラクタで一度だけ行う。
class StaticObj {
    constructor(svgDom) {
        // visible属性を文字列のまま保持（getElementで評価）
        this.visible = svgDom.getAttribute('visible');
        // テンプレート要素を保護しつつ参照渡しできるよう、構築時に一度だけクローン
        this._node = svgDom.cloneNode(true);

        // アニメーション属性の読み取り
        this._animType   = svgDom.getAttribute('lcd-animType') || 'nothing';
        const _kt        = parseFloat(svgDom.getAttribute('lcd-kuruTop'));
        const _kb        = parseFloat(svgDom.getAttribute('lcd-kuruBottom'));
        this._kuruTop    = isNaN(_kt) ? null : _kt;
        this._kuruBottom = isNaN(_kb) ? null : _kb;

        // kuruデフォルト値算出用のy/height
        this.y      = parseFloat(svgDom.getAttribute('y'))      || 0;
        this.height = parseFloat(svgDom.getAttribute('height')) || 0;

        // アニメーション状態管理フィールド
        this._domEl        = null;
        this._prevVisible  = true;
        this._resolveValue = null;
        this._exprParser   = null;
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

        // 表示/非表示を visibility で制御する（display:noneではなくanimation対応のため）
        this._node.style.visibility = isVisible ? '' : 'hidden';

        this._domEl = this._node;
        return this._node;
    }

    // visible を再評価してアニメーションを適用する（子要素なし）
    langChange(transTime, gapTime) {
        if (this.visible === null || !this._domEl) return;
        const newVisible = this._evalVisible();
        if (newVisible === this._prevVisible) return;
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
