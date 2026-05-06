// lcdParts="static" に対応するオブジェクトクラス
// getElement は参照渡し。テンプレート保護のためクローンはコンストラクタで一度だけ行う。
class StaticObj {
    constructor(svgDom, drawParams = null, colorOverride = null, args = {}) {
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
        this.x      = 0;
        this.y      = parseFloat(svgDom.getAttribute('y'))      || 0;
        this.height = parseFloat(svgDom.getAttribute('height')) || 0;

        // アニメーション状態管理フィールド
        this._domEl        = null;
        this._prevVisible  = true;
        this._resolveValue = null;
        this._exprParser   = null;

        // arrangeの配下で使用されるレイアウト属性（LcdPartsObjと同じ属性名で読み取る）
        this.fitX            = svgDom.getAttribute('lcd-fitX')        === 'true';
        this.fitY            = svgDom.getAttribute('lcd-fitY')        === 'true';
        this.flexible        = svgDom.getAttribute('lcd-flex')        === 'true';
        const mcr            = parseFloat(svgDom.getAttribute('lcd-minComRatio'));
        this.minComRatio     = isNaN(mcr) ? 0 : mcr;
        this.margin          = parseFloat(svgDom.getAttribute('lcd-margin')) || 0;
        this.verticalAlign   = svgDom.getAttribute('lcd-verAlign')   || 'top';
        this.horizontalAlign = svgDom.getAttribute('lcd-holAlign')   || 'left';

        // <g>要素配下のvisible属性を持つ子孫要素を収集する
        this._visibleItems = [];
        const tagName = svgDom.tagName ? svgDom.tagName.toLowerCase() : '';
        if (tagName === 'g') this._collectVisibleItems(this._node);

        // lcd-color属性によるfill設定
        // colorOverrideが渡された場合はそれを優先し、なければlcd-color属性をdrawParams/argsで解決する
        const lcdColorAttr = svgDom.getAttribute('lcd-color');
        if (colorOverride !== null) {
            this._applyColor(colorOverride);
        } else if (lcdColorAttr && drawParams !== null) {
            const resolved = StaticObj._resolveLcdColor(lcdColorAttr, drawParams, args);
            if (Array.isArray(resolved)) {
                // 配列の場合は先頭要素のみ使用（配列展開はArrangeObj側で処理）
                if (resolved.length > 0) this._applyColor(resolved[0]);
            } else if (resolved) {
                this._applyColor(resolved);
            }
        }
    }

    // 実際の描画サイズを返す（StaticObjはサイズなし）
    getRealSize() {
        return { width: 0, height: 0 };
    }

    // 座標を更新する（ArrangeObjから呼ばれる）
    setCoordinate(x, y) {
        this.x = x;
        this.y = y;
    }

    // StaticObjはサイズ変形をサポートしない（GroupObjのgroupAreaを使用すること）
    setSize(width, height) {
        return { width: 0, height: 0 };
    }

    // lcd-color属性値を解決する静的メソッド
    // CSS色リテラルはそのまま返し、$始まりはargs参照、それ以外はdrawParams変数名として解決する
    static _resolveLcdColor(attr, drawParams, args = {}) {
        if (!attr) return null;
        const trimmed = attr.trim();
        if (/^#|^rgb\(|^rgba\(|^hsl\(|^hsla\(/i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('$')) return LcdPartsObj.resolveArgToken(trimmed, args);
        return LcdPartsObj.resolveDrawParam(trimmed, drawParams);
    }

    // this._nodeにcolorをfillとして適用する
    // <g>なら配下の全図形要素に、それ以外なら要素自身に設定する
    _applyColor(color) {
        const tag = this._node.tagName ? this._node.tagName.toLowerCase() : '';
        if (tag === 'g') {
            this._applyColorToShapes(this._node, color);
        } else {
            this._node.setAttribute('fill', color);
        }
    }

    // containerEl配下の全図形要素にfillを設定する（再帰）
    _applyColorToShapes(containerEl, color) {
        const SHAPE_TAGS = new Set(['rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'path']);
        const walk = (el) => {
            if (SHAPE_TAGS.has(el.tagName ? el.tagName.toLowerCase() : '')) {
                el.setAttribute('fill', color);
            }
            for (const child of el.children) walk(child);
        };
        for (const child of containerEl.children) walk(child);
    }

    // containerEl配下の全shape要素にbaseColorを適用する静的メソッド（再帰・階層優先）
    // 内側の要素が自身のlcd-color属性を持つ場合は階層が深い方を優先してcurrentColorを上書きする
    static _applyColorToDOM(containerEl, baseColor, drawParams, args = {}) {
        const SHAPE_TAGS = new Set(['rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'path']);
        const walk = (el, currentColor) => {
            // 自身のlcd-color属性があれば解決してcurrentColorを上書き（内側が優先）
            const ownColorAttr = el.getAttribute ? el.getAttribute('lcd-color') : null;
            if (ownColorAttr) {
                const resolved = StaticObj._resolveLcdColor(ownColorAttr, drawParams, args);
                const ownColor = Array.isArray(resolved) ? (resolved[0] || null) : (resolved || null);
                if (ownColor) currentColor = ownColor;
            }
            if (SHAPE_TAGS.has(el.tagName ? el.tagName.toLowerCase() : '')) {
                el.setAttribute('fill', currentColor);
            }
            for (const child of el.children) walk(child, currentColor);
        };
        for (const child of containerEl.children) walk(child, baseColor);
    }

    // visible属性を持つ子孫要素を再帰的に収集して _visibleItems に格納する
    _collectVisibleItems(containerEl) {
        const walk = (el) => {
            const expr = el.getAttribute ? el.getAttribute('visible') : null;
            if (expr !== null) this._visibleItems.push({ el, expr });
            for (const child of el.children) walk(child);
        };
        for (const child of containerEl.children) walk(child);
    }

    // _visibleItems の各要素の visible 式を評価して style.visibility を設定する
    _applyChildVisible() {
        if (!this._resolveValue || !this._exprParser) return;
        for (const { el, expr } of this._visibleItems) {
            const isVisible = !!this._exprParser.eval(expr, this._resolveValue);
            el.style.visibility = isVisible ? '' : 'hidden';
        }
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

        // 表示/非表示を visibility で制御する（display:noneではなくanimation対応のため）
        this._node.style.visibility = isVisible ? '' : 'hidden';

        // 子孫要素のvisible属性を評価して表示・非表示を設定
        this._applyChildVisible();

        this._domEl = this._node;
        return this._node;
    }

    // visible を再評価してアニメーションを適用し、子孫要素のvisibleも再評価する
    langChange(transTime, gapTime) {
        // 子孫要素のvisible属性を再評価（langIdなど描画パラメータ変化に追従）
        this._applyChildVisible();

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
