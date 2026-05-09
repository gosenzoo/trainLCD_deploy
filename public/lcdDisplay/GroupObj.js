// lcdParts="group" または <svg> ルートに対応するオブジェクトクラス
// 子 LcdPartsObj / StaticObj / GroupObj を保持し、getElement で連結して返す。
// groupArea を持つ場合、SVG transform で配下の全子要素をまとめてスケールする。
// GObj（LcdPartsObj継承）を基底クラスとして filter 分割描画機能を活用する。
class GroupObj extends GObj {
    // svgDom: 対応するDOM要素（ルートの場合は null）
    constructor(svgDom, colorOverride = null) {
        // GObj→LcdPartsObjの初期化（visible/noFilter/colorOverride等の属性読み取り。drawParams/argsはnull可）
        super(svgDom, null, null, colorOverride);

        this.children = [];

        // LcdPartsObjのy/heightは0初期化のため、svgDom属性値で上書きする（kuruデフォルト値に使用）
        this.y      = svgDom ? (parseFloat(svgDom.getAttribute('y'))      || 0) : 0;
        this.height = svgDom ? (parseFloat(svgDom.getAttribute('height')) || 0) : 0;

        // groupArea関連フィールド
        this._hasGroupArea  = false;
        this._areaX         = 0;
        this._areaY         = 0;
        this._naturalWidth  = 0;
        this._naturalHeight = 0;
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
        // filterはfilteredGに移すため gには設定しない（lcd-noFilter子がfilterを回避できるようにする）
        g.style.visibility = isVisible ? '' : 'hidden';
        this._domEl = g;

        // groupAreaがある場合、translate+scaleでまとめてスケール・位置移動する
        // 式: translate(x - areaX*sx, y - areaY*sy) scale(sx, sy)
        let transformStr = null;
        if (this._hasGroupArea) {
            const tx = this.x - this._areaX * this._sx;
            const ty = this.y - this._areaY * this._sy;
            transformStr = `translate(${tx},${ty}) scale(${this._sx},${this._sy})`;
            g.setAttribute('transform', transformStr);
        }

        // ctx.noFilterSinkがある場合、transformをラップしたプロキシsinkを生成して子へ渡す
        const { childCtx, flushProxy } = this._proxyChildSink(ctx, transformStr);

        const filteredG = this._createFilteredG();
        for (const child of this.children) {
            const el = child.getElement(childCtx);
            if (!el) continue;
            this._placeChild(el, child, filteredG, g, childCtx);
        }
        this._finalizeFilterSplit(g, filteredG);
        // proxySinkの要素をtransformラッパーで包んで親sinkへ転送する
        if (flushProxy) flushProxy();
        return this._wrapTransform(g);
    }

    // visible を再評価してアニメーションを適用し、子要素へ伝播する
    langChange(transTime, gapTime) {
        this._applyVisibleAnim(transTime, gapTime);
        for (const child of this.children) {
            if (child.langChange) child.langChange(transTime, gapTime);
        }
    }
}
