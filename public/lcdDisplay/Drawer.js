class Drawer {
    constructor() {
        this.drawParams = null;
        this.iconList = null;
        this.templateSVG = null;
        this.textDrawer = null;
        this.exprParser = new ExprParser();
        this.debug = false; // trueにするとarrangeArea境界と末端要素境界を表示
    }

    // 同フォルダのファイルを並列フェッチして初期化
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

        // defaultLineSVG.svgをフェッチ（存在しない場合はnullとして続行）
        try {
            const defaultLineSVG = await this._fetchSVG('./defaultLineSVG.svg');
            this._normalizeSVGDefsRefs(defaultLineSVG);
            this.defaultLineSVG = defaultLineSVG;
        } catch (e) {
            console.warn('defaultLineSVG.svg not found, skipping');
            this.defaultLineSVG = null;
        }

        this.textDrawer = new TextDrawer(this.iconList, null);
        // defs要素をキャッシュしておく（draw()で参照渡しするため）
        this._defsEl = defsSVG.getElementById('defs');

        // drawParams.numIconPresetKeys に列挙されたプリセットSVGを並列フェッチしてNumIconDrawerを初期化
        const presetKeys   = drawParams.numIconPresetKeys || [];
        const numIconPresets = {};
        await Promise.all(presetKeys.map(async key => {
            try {
                numIconPresets[key] = await this._fetchSVG(`/presetNumIcons/${key}.svg`);
            } catch (e) {
                console.warn(`numIcon preset not found: ${key}`);
            }
        }));
        this.numIconDrawer = new NumIconDrawer(numIconPresets);
    }

    // SVGをDOMParserで取得（HTTP非2xxの場合はthrow）
    async _fetchSVG(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch failed: ${res.status} ${url}`);
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

    // <defs>をtargetSVGの先頭に注入し、オブジェクトツリーを構築してコンテンツ<g>を返す
    draw(targetSVG) {
        // キャッシュしたdefs要素を参照渡しで注入（cloneNodeしない）
        // redraw時にはSVGクリア後の孤立ノードになっているが再挿入可能
        if (this._defsEl) {
            targetSVG.insertBefore(this._defsEl, targetSVG.firstChild);
        }

        // オブジェクトツリーを構築してgetElementで描画
        this.buildTree();
        const resolveValue = name => this._resolveValue(name);
        const ctx = { resolveValue, exprParser: this.exprParser, debug: this.debug };

        // defaultLine → header の順に同一<g>へ結合して返す
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const defaultLineEl = this.defaultLineRoot.getElement(ctx);
        if (defaultLineEl) g.appendChild(defaultLineEl);
        const headerEl = this.root.getElement(ctx);
        if (headerEl) g.appendChild(headerEl);
        return g;
    }

    // テンプレートSVGからオブジェクトツリーを構築してthis.rootに設定する
    buildTree() {
        // defaultLineSVGのツリーを構築（ファイルが存在する場合のみ子要素を追加）
        this.defaultLineRoot = new GroupObj(null);
        if (this.defaultLineSVG) {
            for (const child of this.defaultLineSVG.children) {
                const node = this._buildNode(child);
                if (node) this.defaultLineRoot.addChild(node);
            }
        }

        // ルートはSVG要素自体に対応するGroupObj（visible属性なし）
        this.root = new GroupObj(null);
        for (const child of this.templateSVG.children) {
            const node = this._buildNode(child);
            if (node) this.root.addChild(node);
        }
    }

    // SVG要素をlcdPartsに応じてオブジェクトに変換する。
    // lcdPartsなし → null（子孫ごとスキップ）
    _buildNode(element) {
        const lcdParts = element.getAttribute ? element.getAttribute('lcdParts') : null;
        const tagName  = element.tagName ? element.tagName.toLowerCase() : '';

        if (tagName === 'svg' || lcdParts === 'group') {
            // グループとして子要素を再帰的にオブジェクト化
            const group = new GroupObj(element);
            for (const child of element.children) {
                const node = this._buildNode(child);
                if (node) group.addChild(node);
            }
            return group;
        } else if (lcdParts === 'static') {
            return new StaticObj(element, this.drawParams);
        } else if (lcdParts === 'textBox') {
            return new TextBoxObj(element, this.drawParams, {}, this.textDrawer);
        } else if (lcdParts === 'numbering') {
            return new NumIconObj(element, this.drawParams, {}, this.numIconDrawer);
        } else if (lcdParts === 'arrange') {
            const arrangeCtx = {
                drawParams: this.drawParams,
                args: {},
                textDrawer: this.textDrawer,
                numIconDrawer: this.numIconDrawer,
                exprParser: this.exprParser,
                debug: this.debug,
            };
            const arrangeObj = new ArrangeObj(element, arrangeCtx);
            // arrangeAreaのサイズ内に収まるよう圧縮を適用
            arrangeObj.setSize(arrangeObj.width, arrangeObj.height);
            return arrangeObj;
        }
        // lcdPartsなし（またはunknown値）: 子孫ごとスキップ
        return null;
    }

    // オブジェクトツリー全体にlangChangeを伝播する
    // drawParamsを更新したあとに呼び出すことで、変化した visible をアニメーションで遷移させる
    langChange(transTime, gapTime) {
        if (this.defaultLineRoot) this.defaultLineRoot.langChange(transTime, gapTime);
        if (this.root) this.root.langChange(transTime, gapTime);
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

}
