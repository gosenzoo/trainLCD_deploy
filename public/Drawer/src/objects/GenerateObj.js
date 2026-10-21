// lcdParts="generate" に対応するオブジェクトクラス（7.74節）
// genfunc 属性の生成関数（generators.js の GENERATORS）を、genfunc-params 属性（JSON）の引数で呼び、
// 返ってきた <g>（画面の座標で描かれたもの）をそのまま出力に入れる。拡大縮小・移動はしない。
class GenerateObj extends LcdPartsObj {
    // textDrawer: 生成関数に渡す文字描画（号車番号・路線名に使う）
    constructor(svgDom, drawParams, textDrawer) {
        super(svgDom, drawParams, {}, null);
        // 生成した要素（作れなかった場合は null のまま。何も描かない）
        this._node = null;

        const name = svgDom.getAttribute('genfunc');
        const generator = (typeof GENERATORS !== 'undefined') ? GENERATORS[name] : undefined;
        if (!generator) {
            console.warn(`[GenerateObj] 生成関数がありません: genfunc="${name}"`);
            return;
        }
        let params;
        try {
            params = JSON.parse(svgDom.getAttribute('genfunc-params') || '{}');
        } catch (e) {
            console.warn(`[GenerateObj] genfunc-params を JSON として読めません（genfunc="${name}"）`, e);
            return;
        }
        try {
            this._node = generator(GenerateObj.expandParams(params, drawParams), { textDrawer });
        } catch (e) {
            console.warn(`[GenerateObj] 生成関数でエラーが起きました（genfunc="${name}"）`, e);
            this._node = null;
        }
    }

    // genfunc-params の値を描画パラメータで展開する。
    // - 値全体が "#{変数名}" 1つの文字列: 描画パラメータの値を型を変えずに返す（参照先が無ければ OMIT）
    // - それ以外で #{変数名} を含む文字列: 文字列として埋め込む
    // - 配列・オブジェクト: 中身を同じ規則で展開する（OMIT になったキーは除く＝関数の初期値を使う）
    static expandParams(value, drawParams) {
        if (typeof value === 'string') {
            const whole = value.match(/^#\{([^}]+)\}$/);
            if (whole) {
                const resolved = LcdPartsObj.resolveDrawParam(whole[1].trim(), drawParams);
                return resolved === undefined ? GenerateObj.OMIT : resolved;
            }
            return value.includes('#{') ? LcdPartsObj.resolveTemplate(value, drawParams, {}) : value;
        }
        if (Array.isArray(value)) {
            return value.map(v => GenerateObj.expandParams(v, drawParams)).filter(v => v !== GenerateObj.OMIT);
        }
        if (value !== null && typeof value === 'object') {
            const out = {};
            for (const [key, v] of Object.entries(value)) {
                const expanded = GenerateObj.expandParams(v, drawParams);
                if (expanded !== GenerateObj.OMIT) out[key] = expanded;
            }
            return out;
        }
        return value;
    }

    // 生成関数のタイマーなどの後始末（次の描画の始めに Drawer が呼ぶ）
    cleanup() {
        if (this._node && typeof this._node.__cleanup === 'function') this._node.__cleanup();
    }

    // ctx: { resolveValue, exprParser } | null
    // visible=false でも null を返さず visibility:hidden のノードを返す（StaticObj と同じ）
    getElement(ctx = null) {
        if (!this._node) return null;
        if (ctx) {
            if (ctx.resolveValue !== undefined) this._resolveValue = ctx.resolveValue;
            if (ctx.exprParser   !== undefined) this._exprParser   = ctx.exprParser;
        }
        const isVisible   = this._evalVisible();
        this._prevVisible = isVisible;
        this._node.style.visibility = isVisible ? '' : 'hidden';
        this._domEl = this._node;
        return this._wrapTransform(this._node);
    }

    // 言語の切り替えでは作り直さず（入線のアニメーションを続ける）、visible の変化だけを反映する
    langChange(transTime, gapTime) {
        this._applyVisibleAnim(transTime, gapTime);
    }
}

// 展開の結果「引数を渡さない」ことを表す印
GenerateObj.OMIT = Symbol('omit');
