// lcdParts="textBox" に対応するオブジェクトクラス
class TextBoxObj extends LcdPartsObj {
    constructor(svgDom, drawParams, args, textDrawer) {
        super(svgDom, drawParams, args);
        // textBoxのデフォルトはtrue。lcd-flex="false"で明示的に無効化できる
        if (svgDom.getAttribute('lcd-flex') === null) this.flexible = true;

        this._textDrawer = textDrawer;
        this._svgDom     = svgDom;

        // 矩形領域をrect属性から取得
        this.x      = parseFloat(svgDom.getAttribute('x'))      || 0;
        this.y      = parseFloat(svgDom.getAttribute('y'))      || 0;
        this.width  = parseFloat(svgDom.getAttribute('width'))  || 0;
        this.height = parseFloat(svgDom.getAttribute('height')) || 0;

        // lcdTextテンプレートをdrawParamsとargsで展開
        const lcdText = svgDom.getAttribute('lcdText') || '';
        this.text = LcdPartsObj.resolveTemplate(lcdText, drawParams, args);

        // data-styleを解析（TextDrawerが内部で変更するためコンストラクタ段階でパース）
        try {
            this._style = JSON.parse(svgDom.getAttribute('data-style'));
        } catch {
            this._style = {};
        }

        // lcd-color属性があればdrawParamsとargsで解決してテキスト色（fill）として適用する
        const lcdColorAttr = svgDom.getAttribute('lcd-color');
        if (lcdColorAttr) {
            const resolved = StaticObj._resolveLcdColor(lcdColorAttr, drawParams, args);
            const color = Array.isArray(resolved) ? (resolved[0] || null) : (resolved || null);
            if (color) this._style.fill = color;
        }

        this._element      = null;
        this._uniformScale = 1;
        // getElement()で再描画する際のサイズを保持する（setSize後に確定）
        this._lastRenderWidth  = null;
        this._lastRenderHeight = null;

        // 初回描画して自然サイズを確定
        this._render(this.width, this.height);
        this._naturalWidth  = this.realWidth;
        this._naturalHeight = this.realHeight;
    }

    // 指定サイズでTextDrawerを呼び出して再描画する
    // 座標はthis.x/this.yを直接渡すことでtransformラッパーを不要にし、kuruアニメーション競合を防ぐ
    _render(width, height) {
        this._lastRenderWidth  = width;
        this._lastRenderHeight = height;

        // 空文字は描画しない（Drawer._createTextと同じ規則）
        if (!this.text) {
            this._element   = null;
            this.realWidth  = 0;
            this.realHeight = 0;
            this._uniformScale = 1;
            return;
        }

        const result = this._textDrawer.create(this.text, {
            x: this.x,  // transformラッパーを使わないため実際の座標をTextDrawerに直接渡す
            y: this.y,
            width,
            height,
            // TextDrawerがstyleJsonを直接変更する場合があるのでディープコピーを渡す
            styleJson:       JSON.parse(JSON.stringify(this._style)),
            lang:            this._svgDom.getAttribute('lang'),
            axis:            this._svgDom.getAttribute('axis'),
            spacing:         parseFloat(this._svgDom.getAttribute('spacing')),
            base:            this._svgDom.getAttribute('base'),
            transform:       null,
            textHeightRatio: parseFloat(this._svgDom.getAttribute('data-text-height-ratio')) || 1,
        });

        if (result) {
            this._element   = result.element;
            // widthはTextDrawerが返す実際の描画幅。heightは与えたheightが常に実サイズ
            this.realWidth  = (result.width != null) ? result.width : width;
            this.realHeight = height;
        } else {
            // 描画失敗時（アイコンが幅に入らない等）もheightは制約として保持する。
            // realHeightを0にすると_childNaturalSizesにheight=0が記録されてしまい、
            // fitX/Yのpass1でcross方向にheight=0が渡されてアイコン等が正しく計算されない。
            this._element   = null;
            this.realWidth  = 0;
            this.realHeight = height;
        }
        this._uniformScale = 1;
    }

    getRealSize() {
        return { width: this.realWidth, height: this.realHeight };
    }

    // 指定サイズで再描画し、実際に設定されたサイズを返す
    setSize(width, height) {
        if (this.flexible) {
            // 比率変更を許可: 渡されたwidth/heightで再描画（axis方向のみ圧縮）
            this._render(width, height);
        } else {
            // 比率を維持したまま縮小し、uniformScaleをgetElementで適用する
            const sw = this._naturalWidth  > 0 ? width  / this._naturalWidth  : 1;
            const sh = this._naturalHeight > 0 ? height / this._naturalHeight : 1;
            this._uniformScale  = Math.min(sw, sh, 1); // 拡大はしない
            this.realWidth      = this._naturalWidth  * this._uniformScale;
            this.realHeight     = this._naturalHeight * this._uniformScale;
        }
        return { width: this.realWidth, height: this.realHeight };
    }

    // 描画済み要素を返す（transformなし、TextDrawerがx/yを直接設定済み）
    // ctx: { resolveValue, exprParser } | null — visible属性の評価に使用
    // 空テキスト（_element=null）は null を返す。それ以外は visible=false でも要素を返す（アニメーション対応）
    getElement(ctx = null) {
        if (ctx) {
            // resolveValue/exprParserはdebugのみのctxでは渡されないため、undefinedの場合は上書きしない
            if (ctx.resolveValue !== undefined) this._resolveValue = ctx.resolveValue;
            if (ctx.exprParser   !== undefined) this._exprParser   = ctx.exprParser;
        }

        if (this.flexible) {
            // setCoordinateで確定した座標で再描画（translate不使用でCSSアニメーションと競合しない）
            const renderW = this._lastRenderWidth  != null ? this._lastRenderWidth  : this.width;
            const renderH = this._lastRenderHeight != null ? this._lastRenderHeight : this.height;
            this._render(renderW, renderH);
        }

        // 空テキストは描画要素なし
        if (!this._element) return null;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        if (!this.flexible && this._uniformScale !== 1) {
            // flexible=false かつ縮小スケールあり（レアケース）: (x,y)を中心にスケール
            const s = this._uniformScale;
            g.setAttribute('transform',
                `translate(${this.x * (1 - s)}, ${this.y * (1 - s)}) scale(${s})`);
        }
        // それ以外はtransform不要（TextDrawerがx/yを直接設定済み）

        g.appendChild(this._element); // _renderで毎回新規生成されるため cloneNode 不要

        // デバッグ境界矩形（ArrangeObj外のtextBox用。ArrangeObj配下は親が描画する）
        if (ctx && ctx.debug) {
            // textAnchorに応じてx座標をオフセット（テキスト実描画領域のstartを算出）
            const anchor  = (this._style && this._style.textAnchor) || 'start';
            const renderW = this._lastRenderWidth != null ? this._lastRenderWidth : this.width;
            let dbgX;
            if (anchor === 'middle') {
                dbgX = this.x + (renderW - this.realWidth) / 2;
            } else if (anchor === 'end') {
                dbgX = this.x + renderW - this.realWidth;
            } else {
                dbgX = this.x;
            }
            const dbgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            dbgRect.setAttribute('x',              dbgX);
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

        // 表示/非表示を visibility で制御する（display:noneではなくanimation対応のため）
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
