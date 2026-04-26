class Drawer {
    constructor() {
        this.drawParams = null;
        this.iconList = null;
        this.templateSVG = null;
        this.textDrawer = null;
        this.exprParser = new ExprParser();
        this.debug = false; // trueにするとarrangeArea境界と末端要素境界を表示
    }

    // 同フォルダの4ファイルを並列フェッチして初期化
    async load() {
        const [drawParams, iconList, templateSVG, defsSVG] = await Promise.all([
            fetch('./drawParams.json').then(r => r.json()),
            fetch('./iconList.json').then(r => r.json()),
            this._fetchSVG('./headerSVG.svg'),
            this._fetchSVG('./defs.svg')
        ]);
        this.drawParams = drawParams;
        this.iconList = iconList;
        this.defsSVG = defsSVG;
        // url(./defs.svg#id) → url(#id) に正規化してからテンプレートを保持
        this._normalizeSVGDefsRefs(templateSVG);
        this.templateSVG = templateSVG;
        this.textDrawer = new TextDrawer(this.iconList, null);
    }

    // SVGをDOMParserで取得
    async _fetchSVG(url) {
        const res = await fetch(url);
        const text = await res.text();
        const parser = new DOMParser();
        console.log(parser.parseFromString(text, 'image/svg+xml').documentElement);
        return parser.parseFromString(text, 'image/svg+xml').documentElement;
    }

    // url(./defs.svg#id) をローカル参照 url(#id) に変換する
    _normalizeSVGDefsRefs(svgElement) {
        const pattern = /url\(\.\/defs\.svg#([^)]+)\)/g;
        svgElement.querySelectorAll('*').forEach(el => {
            for (const attr of Array.from(el.attributes)) {
                if (attr.value.includes('./defs.svg#')) {
                    el.setAttribute(attr.name, attr.value.replace(pattern, 'url(#$1)'));
                }
            }
        });
    }

    // <defs>をtargetSVGの先頭に注入し、コンテンツ<g>を返す
    draw(targetSVG) {
        // defsをlcdSVGの最初の子として直接注入
        const defsEl = this.defsSVG.getElementById('defs');
        if (defsEl) {
            targetSVG.insertBefore(defsEl.cloneNode(true), targetSVG.firstChild);
        }

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
        if (visibleAttr !== null && !this.exprParser.eval(visibleAttr, name => this._resolveValue(name))) return;

        const lcdParts = element.getAttribute('lcdParts');
        if (lcdParts === 'static') {
            // 要素をそのままコピーして追加
            parent.appendChild(element.cloneNode(true));
        } else if (lcdParts === 'textBox') {
            // lcdTextテンプレートを展開してテキスト要素を生成・追加
            const el = this._createText(element);
            if (el) parent.appendChild(el);
        } else if (lcdParts === 'arrange') {
            // arrangeObjで子要素を再帰的にオブジェクト化してレイアウト
            const ctx = {
                drawParams: this.drawParams,
                args: {},
                textDrawer: this.textDrawer,
                exprParser: this.exprParser,
                debug: this.debug,
            };
            const arrangeObj = new ArrangeObj(element, ctx);
            console.log(arrangeObj);
            // arrangeAreaのサイズ内に収まるよう圧縮を適用
            arrangeObj.setSize(arrangeObj.width, arrangeObj.height);
            const el = arrangeObj.getElement();
            if (el) parent.appendChild(el);
        } else {
            // lcdPartsなし: 子要素へ再帰
            for (const child of element.children) {
                this._traverse(child, parent);
            }
        }
    }

    // drawParamsからドット記法で値を解決し、生の値を返す（true/false リテラルにも対応）
    _resolveValue(token) {
        token = token.trim();
        if (token === 'true')  return true;
        if (token === 'false') return false;
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
