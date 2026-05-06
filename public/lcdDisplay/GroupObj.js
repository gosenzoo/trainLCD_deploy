// lcdParts="group" または <svg> ルートに対応するオブジェクトクラス
// 子 LcdPartsObj / StaticObj / GroupObj を保持し、getElement で連結して返す。
// groupArea を持つ場合、SVG transform で配下の全子要素をまとめてスケールする。
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

        // kuruデフォルト値算出用のy/height（groupAreaで上書きされる場合あり）
        this.y      = svgDom ? (parseFloat(svgDom.getAttribute('y'))      || 0) : 0;
        this.height = svgDom ? (parseFloat(svgDom.getAttribute('height')) || 0) : 0;

        // filter属性を保持（getElementで出力<g>に移す）
        this._filter = svgDom ? svgDom.getAttribute('filter') : null;

        // アニメーション状態管理フィールド
        this._domEl        = null;
        this._prevVisible  = true;
        this._resolveValue = null;
        this._exprParser   = null;

        // arrangeの配下で使用されるレイアウト属性（LcdPartsObjと同じ属性名で読み取る）
        this.fitX            = svgDom ? svgDom.getAttribute('lcd-fitX')      === 'true' : false;
        this.fitY            = svgDom ? svgDom.getAttribute('lcd-fitY')      === 'true' : false;
        this.flexible        = svgDom ? svgDom.getAttribute('lcd-flex')      === 'true' : false;
        const mcr            = svgDom ? parseFloat(svgDom.getAttribute('lcd-minComRatio')) : NaN;
        this.minComRatio     = isNaN(mcr) ? 0 : mcr;
        this.margin          = svgDom ? (parseFloat(svgDom.getAttribute('lcd-margin')) || 0) : 0;
        this.verticalAlign   = svgDom ? (svgDom.getAttribute('lcd-verAlign') || 'top')  : 'top';
        this.horizontalAlign = svgDom ? (svgDom.getAttribute('lcd-holAlign') || 'left') : 'left';

        // groupArea関連フィールド
        this._hasGroupArea  = false;
        this._areaX         = 0;
        this._areaY         = 0;
        this._naturalWidth  = 0;
        this._naturalHeight = 0;
        this.x              = 0;
        this.realWidth      = 0;
        this.realHeight     = 0;
        this._sx            = 1;
        this._sy            = 1;

        // <g lcdParts="group"> の直接子に groupArea rect がある場合、範囲を取得する
        const tagName = svgDom ? (svgDom.tagName ? svgDom.tagName.toLowerCase() : '') : '';
        if (svgDom && tagName === 'g') {
            const areaEl = Array.from(svgDom.children).find(
                c => c.getAttribute('lcdParts') === 'groupArea'
            );
            if (areaEl) {
                this._hasGroupArea  = true;
                this._areaX         = parseFloat(areaEl.getAttribute('x'))      || 0;
                this._areaY         = parseFloat(areaEl.getAttribute('y'))      || 0;
                this._naturalWidth  = parseFloat(areaEl.getAttribute('width'))  || 0;
                this._naturalHeight = parseFloat(areaEl.getAttribute('height')) || 0;
                // 初期配置座標・サイズはgroupAreaの値で設定
                this.x          = this._areaX;
                this.y          = this._areaY;
                this.height     = this._naturalHeight;
                this.realWidth  = this._naturalWidth;
                this.realHeight = this._naturalHeight;
            }
        }
    }

    addChild(child) {
        this.children.push(child);
    }

    // 実際の描画サイズを返す（groupAreaなしの場合は {0, 0}）
    getRealSize() {
        return { width: this.realWidth, height: this.realHeight };
    }

    // 座標を更新する（ArrangeObjから呼ばれる）
    setCoordinate(x, y) {
        this.x = x;
        this.y = y;
    }

    // 指定サイズへ拡大縮小する（groupAreaが定義されている場合のみ有効）
    // スケールは getElement の SVG transform で適用する（子要素の属性は書き換えない）
    setSize(width, height) {
        if (!this._hasGroupArea || !this._naturalWidth || !this._naturalHeight) {
            return { width: this.realWidth, height: this.realHeight };
        }
        this._sx        = width  / this._naturalWidth;
        this._sy        = height / this._naturalHeight;
        this.realWidth  = width;
        this.realHeight = height;
        return { width, height };
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
            // ArrangeObjは { debug } のみを渡す場合があるため、undefinedで上書きしない
            if (ctx.resolveValue !== undefined) this._resolveValue = ctx.resolveValue;
            if (ctx.exprParser   !== undefined) this._exprParser   = ctx.exprParser;
        }

        const isVisible   = this._evalVisible();
        this._prevVisible = isVisible;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (this._filter) g.setAttribute('filter', this._filter);

        // 表示/非表示を visibility で制御する（display:noneではなくanimation対応のため）
        g.style.visibility = isVisible ? '' : 'hidden';
        this._domEl = g;

        // groupAreaがある場合、translate+scaleでまとめてスケール・位置移動する
        // 式: translate(x - areaX*sx, y - areaY*sy) scale(sx, sy)
        if (this._hasGroupArea) {
            const tx = this.x - this._areaX * this._sx;
            const ty = this.y - this._areaY * this._sy;
            g.setAttribute('transform', `translate(${tx},${ty}) scale(${this._sx},${this._sy})`);
        }

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
