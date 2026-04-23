class Drawer {
    constructor() {
        this.drawParams = null;
        this.iconList = null;
        this.templateSVG = null;
        this.textDrawer = null;
    }

    // 同フォルダの3ファイルを並列フェッチして初期化
    async load() {
        const [drawParams, iconList, templateSVG] = await Promise.all([
            fetch('./drawParams.json').then(r => r.json()),
            fetch('./iconList.json').then(r => r.json()),
            this._fetchSVG('./headerSVG.svg')
        ]);
        this.drawParams = drawParams;
        this.iconList = iconList;
        this.templateSVG = templateSVG;
        this.textDrawer = new TextDrawer(this.iconList, null);
    }

    // SVGをDOMParserで取得
    async _fetchSVG(url) {
        const res = await fetch(url);
        const text = await res.text();
        const parser = new DOMParser();
        return parser.parseFromString(text, 'image/svg+xml').documentElement;
    }

    // SVGをトラバースして<g>要素を返す
    draw() {
        const lcdGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        for (const child of this.templateSVG.children) {
            this._traverse(child, lcdGroup);
        }
        return lcdGroup;
    }

    // 再帰トラバース。visible評価 → lcdParts分岐
    _traverse(element, parent) {
        // visible属性がある場合、式を評価して非表示なら処理しない
        const visibleAttr = element.getAttribute('visible');
        if (visibleAttr !== null && !this._evalExpr(visibleAttr)) return;

        const lcdParts = element.getAttribute('lcdParts');
        if (lcdParts === 'static') {
            // 要素をそのままコピーして追加
            parent.appendChild(element.cloneNode(true));
        } else if (lcdParts === 'textBox') {
            // lcdTextテンプレートを展開してテキスト要素を生成・追加
            const el = this._createText(element);
            if (el) parent.appendChild(el);
        } else {
            // lcdPartsなし: 子要素へ再帰
            for (const child of element.children) {
                this._traverse(child, parent);
            }
        }
    }

    // visible式の評価（||が&&より低優先度）
    _evalExpr(expr) {
        for (const orPart of expr.split('||')) {
            const andResult = orPart.split('&&').every(token => this._evalAtom(token.trim()));
            if (andResult) return true;
        }
        return false;
    }

    // アトム（変数、否定、== 比較式）の評価
    _evalAtom(token) {
        token = token.trim();
        if (token.startsWith('!')) return !this._resolveVar(token.slice(1).trim());

        // == 等価演算子の処理
        if (token.includes('==')) {
            const [left, right] = token.split('==').map(s => s.trim());
            const leftVal  = this._resolveValue(left);
            const rightVal = this._resolveValue(right);
            // 両辺が数値に変換できる場合は数値比較、それ以外は文字列比較
            const leftNum  = Number(leftVal);
            const rightNum = Number(rightVal);
            if (!isNaN(leftNum) && !isNaN(rightNum) && String(leftVal) !== '' && String(rightVal) !== '') {
                return leftNum === rightNum;
            }
            return String(leftVal ?? '') === String(rightVal ?? '');
        }

        return this._resolveVar(token);
    }

    // drawParamsからドット記法で値を解決し、生の値を返す
    _resolveValue(token) {
        token = token.trim();
        // 数値定数
        const num = Number(token);
        if (token !== '' && !isNaN(num)) return num;
        // ドット記法でdrawParamsを辿る
        const keys = token.split('.');
        let val = this.drawParams;
        for (const key of keys) {
            if (val === null || val === undefined) return undefined;
            val = val[key];
        }
        return val;
    }

    // drawParamsから変数を解決してbooleanで返す
    _resolveVar(name) {
        name = name.trim();
        if (name === 'true') return true;
        if (name === 'false') return false;
        const val = this._resolveValue(name);
        return val !== undefined && val !== null ? !!val : false;
    }

    // lcdTextテンプレートを展開してTextDrawerでテキスト要素を生成
    _createText(rectEl) {
        const lcdText = rectEl.getAttribute('lcdText');
        if (!lcdText) return null;

        // #{変数名}をdrawParamsの値で置換（ドット記法対応）
        const text = lcdText.replace(/#\{([^}]+)\}/g, (_, varName) => {
            const val = this._resolveValue(varName.trim());
            return val !== undefined && val !== null ? String(val) : '';
        });

        // 展開後が空文字なら追加しない
        if (text === '') return null;

        const result = this.textDrawer.create(text, rectEl);
        return result ? result.element : null;
    }
}
