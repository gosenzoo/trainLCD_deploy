// lcdParts="numbering" に対応するオブジェクトクラス
class NumIconObj extends LcdPartsObj {
    constructor(svgDom, drawParams, args, numIconDrawer) {
        super(svgDom, drawParams, args);

        this._numIconDrawer = numIconDrawer;

        // rect属性から位置・サイズを取得
        this.x      = parseFloat(svgDom.getAttribute('x'))      || 0;
        this.y      = parseFloat(svgDom.getAttribute('y'))      || 0;
        this.width  = parseFloat(svgDom.getAttribute('width'))  || 0;
        this.height = parseFloat(svgDom.getAttribute('height')) || 0;

        // 各属性をdrawParams/argsでテンプレート展開
        this._numKey       = LcdPartsObj.resolveTemplate(svgDom.getAttribute('lcd-numKey')    || '', drawParams, args);
        this._symbol       = LcdPartsObj.resolveTemplate(svgDom.getAttribute('symbolText')    || '', drawParams, args);
        this._number       = LcdPartsObj.resolveTemplate(svgDom.getAttribute('numberText')    || '', drawParams, args);
        this._lineColor    = LcdPartsObj.resolveTemplate(svgDom.getAttribute('lineColor')     || '', drawParams, args);
        this._outlineWidth = parseFloat(LcdPartsObj.resolveTemplate(svgDom.getAttribute('outlineWidth') || '0', drawParams, args)) || 0;

        // 自然サイズ = 短辺×短辺の正方形（flexible=false と同様に縮小のみ）
        this._naturalSize  = Math.min(this.width, this.height);
        this.realWidth     = this._naturalSize;
        this.realHeight    = this._naturalSize;
    }

    getRealSize() {
        return { width: this.realWidth, height: this.realHeight };
    }

    // 指定サイズで再計算（flexible=false と同様、縮小のみ・正方形を維持）
    setSize(width, height) {
        const iconSize    = Math.min(width, height);
        const scale       = this._naturalSize > 0 ? Math.min(iconSize / this._naturalSize, 1) : 1;
        this.realWidth    = this._naturalSize * scale;
        this.realHeight   = this._naturalSize * scale;
        return { width: this.realWidth, height: this.realHeight };
    }

    // ctx: { resolveValue, exprParser, debug } | null
    getElement(ctx = null) {
        if (ctx) {
            if (ctx.resolveValue !== undefined) this._resolveValue = ctx.resolveValue;
            if (ctx.exprParser   !== undefined) this._exprParser   = ctx.exprParser;
        }

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        // numIconDrawer または numKey が未設定の場合は空グループを返す
        if (this._numIconDrawer && this._numKey) {
            // realWidthをアイコンのサイズとして渡す（setSize後も正方形）
            const geometry = {
                x:      this.x,
                y:      this.y,
                width:  this.realWidth,
                height: this.realHeight,
            };
            const icon = this._numIconDrawer.createNumIconFromPreset(
                this._numKey, this._symbol, this._number, this._lineColor, geometry, this._outlineWidth
            );
            if (icon) g.appendChild(icon);
        }

        // デバッグ境界矩形（赤破線）
        if (ctx && ctx.debug) {
            const dbgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            dbgRect.setAttribute('x',              this.x);
            dbgRect.setAttribute('y',              this.y);
            dbgRect.setAttribute('width',          this.realWidth);
            dbgRect.setAttribute('height',         this.realHeight);
            dbgRect.setAttribute('fill',           'none');
            dbgRect.setAttribute('stroke',         '#ff4422');
            dbgRect.setAttribute('stroke-width',   '1');
            dbgRect.setAttribute('stroke-dasharray', '4,2');
            dbgRect.setAttribute('pointer-events', 'none');
            g.appendChild(dbgRect);
        }

        // 表示/非表示を visibility で制御する（アニメーション対応）
        const isVisible   = this._evalVisible();
        this._prevVisible = isVisible;
        g.style.visibility = isVisible ? '' : 'hidden';
        this._domEl = g;
        return this._wrapTransform(g);
    }

    // visible を再評価してアニメーションを適用する
    langChange(transTime, gapTime) {
        this._applyVisibleAnim(transTime, gapTime);
    }
}
