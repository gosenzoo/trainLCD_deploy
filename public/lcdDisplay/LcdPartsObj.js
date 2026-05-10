// lcdPartsオブジェクトの基底クラス
class LcdPartsObj {
    constructor(svgDom, drawParams, args, colorOverride = null) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.realWidth = 0;
        this.realHeight = 0;

        // svgDomがnullの場合（GroupObj(null)等のルートコンテナ）に備えてnullガード
        const attr = (name) => svgDom ? svgDom.getAttribute(name) : null;

        // visible属性を文字列のまま保持（getElementで評価）
        this.visible         = attr('visible');
        this.verticalAlign   = attr('lcd-verAlign')    || 'top';

        // アニメーション属性（テキスト遷移アニメーション用）
        this._animType   = attr('lcd-animType') || 'nothing';
        const _kt        = parseFloat(attr('lcd-kuruTop'));
        const _kb        = parseFloat(attr('lcd-kuruBottom'));
        this._kuruTop    = isNaN(_kt) ? null : _kt;
        this._kuruBottom = isNaN(_kb) ? null : _kb;

        // アニメーション状態管理フィールド（getElement/langChangeで使用）
        this._domEl        = null;
        this._prevVisible  = true;
        this._resolveValue = null;
        this._exprParser   = null;
        this.horizontalAlign = attr('lcd-holAlign')    || 'left';
        this.flexible        = attr('lcd-flex')        === 'true';
        this.margin          = parseFloat(attr('lcd-margin'))       || 0;
        const mcr            = parseFloat(attr('lcd-minComRatio'));
        this.minComRatio     = isNaN(mcr) ? 0 : mcr;
        this.fitX            = attr('lcd-fitX') === 'true';
        this.fitY            = attr('lcd-fitY') === 'true';
        // lcd-noFilter属性: 親<g>のfilterの影響範囲外に配置する（trueで親filteredGをバイパス）
        this.noFilter        = attr('lcd-noFilter') === 'true';
        // noFilterZ属性: フィルター外配置時のz-order。'up'=filteredGより手前（デフォルト）、'down'=背後
        this.noFilterZ       = attr('noFilterZ') || 'up';
        // transform属性: getElement出力をラッパー<g>で包んで変換を付与する（null=変換なし）
        this._transform      = attr('transform') || null;
        // 親コンテナから継承した色オーバーライド（null=指定なし）
        this.colorOverride   = colorOverride;
    }

    // 座標設定（引数をそのままフィールドへ）
    setCoordinate(x, y) {
        this.x = x;
        this.y = y;
    }

    // 実際の描画サイズを返す
    getRealSize() {
        return { width: this.realWidth, height: this.realHeight };
    }

    // 指定サイズで再描画し、実際に設定されたサイズを返す（サブクラスでオーバーライド）
    setSize(width, height) {
        return { width: this.realWidth, height: this.realHeight };
    }

    // 描画結果のSVG要素を返す（サブクラスでオーバーライド）
    getElement() {
        return null;
    }

    // transform属性が指定されている場合、elをラッパー<g transform="...">で包んで返す
    // 指定なしの場合はelをそのまま返す（_domElはelを指したまま、アニメーションに影響しない）
    _wrapTransform(el) {
        if (!this._transform) return el;
        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrapper.setAttribute('transform', this._transform);
        wrapper.appendChild(el);
        return wrapper;
    }

    // visible属性を評価して真偽値を返す（_resolveValue未設定なら常にtrue）
    _evalVisible() {
        if (this.visible === null || !this._resolveValue || !this._exprParser) return true;
        return !!this._exprParser.eval(this.visible, this._resolveValue);
    }

    // visible変化時にアニメーションを適用する（サブクラスで呼び出す想定のヘルパー）
    _applyVisibleAnim(transTime, gapTime) {
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

    // ドット記法＋ブラケット記法のトークンをキー配列に展開する
    // 例: "sectionColor[0]" → ["sectionColor", "0"]
    // 例: "station.colors[1]" → ["station", "colors", "1"]
    static _expandKeys(token) {
        const keys = [];
        for (const part of token.split('.')) {
            // "[" と "]" で分割し、空文字を除外する
            for (const seg of part.split(/[\[\]]/)) {
                if (seg !== '') keys.push(seg);
            }
        }
        return keys;
    }

    // $引数名（ドット記法・ブラケット記法対応）をargsから解決する
    static resolveArgToken(token, args) {
        if (!token.startsWith('$')) return undefined;
        const keys = LcdPartsObj._expandKeys(token.slice(1));
        let val = args[keys[0]];
        for (let i = 1; i < keys.length; i++) {
            if (val == null) return undefined;
            val = val[keys[i]];
        }
        return val;
    }

    // drawParamsをドット記法・ブラケット記法で解決する
    static resolveDrawParam(token, drawParams) {
        if (!token) return undefined;
        const keys = LcdPartsObj._expandKeys(token);
        let val = drawParams;
        for (const key of keys) {
            if (val == null) return undefined;
            val = val[key];
        }
        return val;
    }

    // テンプレート文字列を展開する
    // #{$argName.field} → args参照、#{varName} → drawParams参照
    static resolveTemplate(template, drawParams, args) {
        if (!template) return '';
        return template.replace(/#\{([^}]+)\}/g, (_, expr) => {
            const trimmed = expr.trim();
            // $で始まる場合はargs参照、それ以外はdrawParams参照
            const val = trimmed.startsWith('$')
                ? LcdPartsObj.resolveArgToken(trimmed, args)
                : LcdPartsObj.resolveDrawParam(trimmed, drawParams);
            return val != null ? String(val) : '';
        });
    }

    // visible属性の評価用resolveValue（drawParamsとargsの両方を参照）
    static makeResolveValue(drawParams, args) {
        return (token) => {
            token = token.trim();
            if (token === 'true')  return true;
            if (token === 'false') return false;
            const num = Number(token);
            if (token !== '' && !isNaN(num)) return num;
            if (token.startsWith('$')) {
                return LcdPartsObj.resolveArgToken(token, args);
            }
            return LcdPartsObj.resolveDrawParam(token, drawParams);
        };
    }
}
