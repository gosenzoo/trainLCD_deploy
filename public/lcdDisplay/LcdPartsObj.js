// lcdPartsオブジェクトの基底クラス
class LcdPartsObj {
    constructor(svgDom, drawParams, args) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.realWidth = 0;
        this.realHeight = 0;

        this.verticalAlign   = svgDom.getAttribute('lcd-verAlign')    || 'top';
        this.horizontalAlign = svgDom.getAttribute('lcd-holAilgn')    || 'left';
        this.flexible        = svgDom.getAttribute('lcd-flex')        === 'true';
        this.margin          = parseFloat(svgDom.getAttribute('lcd-margin'))       || 0;
        const mcr            = parseFloat(svgDom.getAttribute('lcd-minComRatio'));
        this.minComRatio     = isNaN(mcr) ? 0 : mcr;
        this.fitX            = svgDom.getAttribute('lcd-fitX') === 'true';
        this.fitY            = svgDom.getAttribute('lcd-fitY') === 'true';
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

    // $引数名（ドット記法対応）をargsから解決する
    static resolveArgToken(token, args) {
        if (!token.startsWith('$')) return undefined;
        const keys = token.slice(1).split('.');
        let val = args[keys[0]];
        for (let i = 1; i < keys.length; i++) {
            if (val == null) return undefined;
            val = val[keys[i]];
        }
        return val;
    }

    // drawParamsをドット記法で解決する
    static resolveDrawParam(token, drawParams) {
        if (!token) return undefined;
        const keys = token.split('.');
        let val = drawParams;
        for (const key of keys) {
            if (val == null) return undefined;
            val = val[key];
        }
        return val;
    }

    // テンプレート文字列を展開する
    // #{変数名} → drawParams参照、$変数名（ドット記法可）→ args参照
    static resolveTemplate(template, drawParams, args) {
        if (!template) return '';
        let result = template.replace(/#\{([^}]+)\}/g, (_, varName) => {
            const val = LcdPartsObj.resolveDrawParam(varName.trim(), drawParams);
            return val != null ? String(val) : '';
        });
        result = result.replace(/\$(\w+(?:\.\w+)*)/g, (_, path) => {
            const val = LcdPartsObj.resolveArgToken('$' + path, args);
            return val != null ? String(val) : '';
        });
        return result;
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
