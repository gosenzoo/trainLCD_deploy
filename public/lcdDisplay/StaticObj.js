// lcdParts="static" に対応するオブジェクトクラス
// getElement は参照渡し。テンプレート保護のためクローンはコンストラクタで一度だけ行う。
// LcdPartsObjを継承し、共通フィールド・メソッドはsuper()経由で取得する。
class StaticObj extends LcdPartsObj {
    constructor(svgDom, drawParams = null, colorOverride = null, args = {}) {
        // LcdPartsObjの初期化（visible, noFilter, colorOverride, アニメーション属性等を設定）
        super(svgDom, drawParams, args, colorOverride);

        // テンプレート要素を保護しつつ参照渡しできるよう、構築時に一度だけクローン
        this._node = svgDom.cloneNode(true);

        // kuruデフォルト値算出用のy/height（LcdPartsObjはこれらをsvgDom属性から読み取らないため明示設定）
        this.y      = parseFloat(svgDom.getAttribute('y'))      || 0;
        this.height = parseFloat(svgDom.getAttribute('height')) || 0;

        // <g>要素配下のvisible属性を持つ子孫要素を収集する
        this._visibleItems = [];
        const tagName = svgDom.tagName ? svgDom.tagName.toLowerCase() : '';
        if (tagName === 'g') this._collectVisibleItems(this._node);

        // lcd-color属性によるfill設定
        // 自身のlcd-color属性を最優先し、なければcolorOverride（親から伝播）をフォールバックとする
        const lcdColorAttr = svgDom.getAttribute('lcd-color');
        if (lcdColorAttr && drawParams !== null) {
            // 自身のlcd-colorが親のcolorOverrideより優先される
            const resolved = StaticObj._resolveLcdColor(lcdColorAttr, drawParams, args);
            if (Array.isArray(resolved)) {
                // 配列の場合は先頭要素のみ使用（配列展開はArrangeObj側で処理）
                if (resolved.length > 0) this._applyColor(resolved[0]);
            } else if (resolved) {
                this._applyColor(resolved);
            }
        } else if (this.colorOverride !== null) {
            // 自身のlcd-colorがない場合のみ親から伝播した色を使用する
            this._applyColor(this.colorOverride);
        }
    }

    // 実際の描画サイズを返す（StaticObjはサイズなし）
    getRealSize() {
        return { width: 0, height: 0 };
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
        // url(#...)形式のグラデーション参照もリテラルとしてそのまま返す
        if (/^#|^rgb\(|^rgba\(|^hsl\(|^hsla\(|^url\(/i.test(trimmed)) return trimmed;
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
        return this._wrapTransform(this._node);
    }

    // visible を再評価してアニメーションを適用し、子孫要素のvisibleも再評価する
    langChange(transTime, gapTime) {
        // 子孫要素のvisible属性を再評価（langIdなど描画パラメータ変化に追従）
        this._applyChildVisible();
        this._applyVisibleAnim(transTime, gapTime);
    }
}
