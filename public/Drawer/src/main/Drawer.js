class Drawer {
    constructor() {
        this._drawParams = null;
        this.iconList = null;
        this._headerSVG = null;
        this.textDrawer = null;
        this.exprParser = new ExprParser();
        this._debug = false;
        this._bodySVGCache = null;   // ページキャッシュ（filename → SVGElement）
    }

    // 初期化。全リソースはindex側でロード済みのものを受け取る
    load(drawParams, iconList, numIconPresets, iconPresets, headerSVG, bodySVGMap) {
        this._drawParams = drawParams;
        this.iconList = iconList;

        // url(./defs.svg#id) → url(#id) に正規化し、funcDef/funcCallを事前展開してからヘッダーSVGを保持
        this._normalizeSVGDefsRefs(headerSVG);
        this._resolveFuncCalls(headerSVG);
        this._headerSVG = headerSVG;

        // 受け取ったbodySVGMapを処理してキャッシュに格納
        this._bodySVGCache = new Map();
        for (const [filename, bodySVG] of bodySVGMap) {
            this._normalizeSVGDefsRefs(bodySVG);
            this._resolveFuncCalls(bodySVG);
            this._bodySVGCache.set(filename, bodySVG);
        }

        // index側でロード済みの各プリセットを受け取りDrawerを初期化
        this.numIconDrawer = new NumIconDrawer(numIconPresets);
        // iconDict内のプリセット型アイコン（{presetType,symbol,color}）の描画用
        this.iconDrawer = new IconDrawer(iconPresets);
        // TextDrawer に numIconDrawer と iconDrawer を渡す
        this.textDrawer = new TextDrawer(this.iconList, this.numIconDrawer, this.iconDrawer);
    }

    // 現在のページのbodySVGを返す（drawParams.page未設定またはキャッシュ未ヒットはnull）
    get currentBodySVG() {
        const page = this._drawParams?.page;
        if (!page || !this._bodySVGCache) return null;
        return this._bodySVGCache.get(page) || null;
    }

    // デバッグ表示（arrangeArea境界: 青 / 末端要素境界: 赤）の有効/無効を切り替える
    setDebug(value) {
        this._debug = value;
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

    // SVG内のlcd-funcDefを収集し、lcd-funcCallをインライン展開する（buildTree前の事前処理）
    // funcDef <g> は収集後にDOMから除去し、funcCall <rect> は展開済み <g> に置換する
    _resolveFuncCalls(svgElement) {
        // ステップ1: トップレベルの lcd-funcDef <g> を収集してDOMから除去
        const funcDefMap = {}; // 関数名 → { areaX, areaY, areaWidth, areaHeight, contentNodes[] }
        for (const child of Array.from(svgElement.children)) {
            const funcName = child.getAttribute ? child.getAttribute('lcd-funcDef') : null;
            if (!funcName) continue;

            // funcArea rectとコンテンツノードを分離
            let areaRect = null;
            const contentNodes = [];
            for (const node of Array.from(child.childNodes)) {
                if (
                    node.nodeType === Node.ELEMENT_NODE &&
                    node.getAttribute && node.getAttribute('lcdParts') === 'funcArea'
                ) {
                    areaRect = node;
                } else {
                    contentNodes.push(node);
                }
            }

            if (areaRect) {
                funcDefMap[funcName] = {
                    areaX:      parseFloat(areaRect.getAttribute('x')      || '0'),
                    areaY:      parseFloat(areaRect.getAttribute('y')      || '0'),
                    areaWidth:  parseFloat(areaRect.getAttribute('width')  || '0'),
                    areaHeight: parseFloat(areaRect.getAttribute('height') || '0'),
                    contentNodes,
                };
            }
            // funcDef <g> 自体はレンダリング不要なのでDOMから除去
            svgElement.removeChild(child);
        }

        // funcDefが1件もなければ即return（querySelectorAll不要）
        if (Object.keys(funcDefMap).length === 0) return;

        // ステップ2: 各funcDefのcontentNodes内のfuncCallを展開する（ネストfuncCall対応）
        // 全funcDef収集後に実行するため、funcDef同士の相互参照が可能
        for (const def of Object.values(funcDefMap)) {
            // contentNodesを一時<g>に格納してquerySelectorAllを使えるようにする
            const tempG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            for (const node of def.contentNodes) tempG.appendChild(node);
            this._expandFuncCallsInContainer(tempG, funcDefMap);
            def.contentNodes = Array.from(tempG.childNodes);
        }

        // ステップ3: SVG全体のlcd-funcCallを展開する
        this._expandFuncCallsInContainer(svgElement, funcDefMap);
    }

    // コンテナ内のすべてのlcd-funcCall rectを展開する（スケール・属性コピー・DOM置換）
    _expandFuncCallsInContainer(container, funcDefMap) {
        // 除外する属性セット（位置・形状・funcCall名はコピー対象外）
        const SKIP_ATTRS = new Set(['lcd-funcCall', 'x', 'y', 'width', 'height', 'fill']);

        for (const rect of Array.from(container.querySelectorAll('[lcd-funcCall]'))) {
            const funcName = rect.getAttribute('lcd-funcCall');
            const def = funcDefMap[funcName];
            if (!def) continue;

            const cx = parseFloat(rect.getAttribute('x')      || '0');
            const cy = parseFloat(rect.getAttribute('y')      || '0');
            const cw = parseFloat(rect.getAttribute('width')  || '0');
            const ch = parseFloat(rect.getAttribute('height') || '0');

            // 非均等スケール（x・y独立）を計算
            const sx = def.areaWidth  > 0 ? cw / def.areaWidth  : 1;
            const sy = def.areaHeight > 0 ? ch / def.areaHeight : 1;
            // funcAreaの左上をcallRectの左上に合わせるtranslateを計算
            const tx = cx - def.areaX * sx;
            const ty = cy - def.areaY * sy;

            // 呼び出し元rectからコピーする追加属性を収集する
            const extraAttrs = Array.from(rect.attributes)
                .filter(a => !SKIP_ATTRS.has(a.name))
                .map(a => ({ name: a.name, value: a.value }));

            // コンテンツのdeepCloneを座標属性直接書き換えでスケールし、
            // ラッパーを挟まず親要素にインライン展開してrectと置換する
            // （ラッパー<g>で包むとlcdPartsなし要素になりArrangeObjにスキップされるため）
            const parent = rect.parentNode;
            for (const node of def.contentNodes) {
                const cloned = node.cloneNode(true);
                if (cloned.nodeType === Node.ELEMENT_NODE) {
                    this._scaleNode(cloned, sx, sy, tx, ty);
                    // 呼び出し元の追加属性をトップレベルクローン要素にコピーする（既存属性は上書き）
                    for (const { name, value } of extraAttrs) {
                        cloned.setAttribute(name, value);
                    }
                }
                parent.insertBefore(cloned, rect);
            }
            parent.removeChild(rect);
        }
    }

    // SVG要素の座標属性を直接書き換えてスケール・移動を適用する（再帰）
    // transformではなく属性値を変換するため、filter等の効果がスケール後座標に正しく適用される
    // translate(a,b) 形式のtransform属性はbake-inして除去する
    // 解析困難なtransform（rotate等）はtranslate+scaleを前合成して終了（子再帰不要）
    _scaleNode(el, sx, sy, tx, ty) {
        const existingTransform = el.getAttribute ? el.getAttribute('transform') : null;
        let csx = sx, csy = sy, ctx = tx, cty = ty;

        if (existingTransform !== null) {
            // translate(a,b) のみ解析してtx/tyにbake-in、transformを除去して子再帰へ
            const m = existingTransform.trim().match(/^translate\(\s*([-\d.e+]+)[,\s]\s*([-\d.e+]+)\s*\)$/);
            if (m) {
                ctx = parseFloat(m[1]) * sx + tx;
                cty = parseFloat(m[2]) * sy + ty;
                el.removeAttribute('transform');
            } else {
                // 解析困難なtransformはスケール変換を前合成してリターン（子はtransform管理）
                el.setAttribute('transform', `translate(${tx},${ty}) scale(${sx},${sy}) ${existingTransform}`);
                return;
            }
        }

        const tag = (el.tagName || '').replace(/^svg:/, '').toLowerCase();
        const sa  = (name, fn) => { const v = el.getAttribute(name); if (v !== null && v !== '') el.setAttribute(name, fn(parseFloat(v))); };
        const scX = v => v * csx + ctx;
        const scY = v => v * csy + cty;
        const scW = v => v * csx;
        const scH = v => v * csy;

        if (tag === 'rect' || tag === 'image' || tag === 'foreignobject') {
            sa('x', scX); sa('y', scY); sa('width', scW); sa('height', scH);
        } else if (tag === 'circle') {
            sa('cx', scX); sa('cy', scY);
            sa('r', v => v * Math.min(csx, csy));
        } else if (tag === 'ellipse') {
            sa('cx', scX); sa('cy', scY); sa('rx', scW); sa('ry', scH);
        } else if (tag === 'line') {
            sa('x1', scX); sa('y1', scY); sa('x2', scX); sa('y2', scY);
        } else if (tag === 'text' || tag === 'tspan') {
            sa('x', scX); sa('y', scY); sa('dx', scW); sa('dy', scH);
        } else if (tag === 'use') {
            sa('x', scX); sa('y', scY); sa('width', scW); sa('height', scH);
        } else if (tag === 'polygon' || tag === 'polyline') {
            const pts = el.getAttribute('points');
            if (pts) {
                const nums = pts.trim().split(/[\s,]+/).map(parseFloat);
                el.setAttribute('points', nums.map((v, i) => i % 2 === 0 ? v * csx + ctx : v * csy + cty).join(' '));
            }
        } else if (tag === 'path') {
            const d = el.getAttribute('d');
            if (d) el.setAttribute('d', this._scalePath(d, csx, csy, ctx, cty));
        }

        // 子要素に再帰（<g>等コンテナ向け）
        for (const child of Array.from(el.children)) {
            this._scaleNode(child, csx, csy, ctx, cty);
        }
    }

    // SVGパスのd属性を非均等スケール変換する
    // 絶対コマンドはsx/sy+tx/tyを適用し、相対コマンドはsx/syのみ適用する
    _scalePath(d, sx, sy, tx, ty) {
        const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:[0-9]*\.)?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || [];
        const out = [];
        let i = 0;
        const isNum = () => i < tokens.length && /^[-+]?[0-9.]/.test(tokens[i]);
        const n    = () => parseFloat(tokens[i++]);
        const raw  = () => tokens[i++]; // フラグ等スケールしない値をそのまま取得

        while (i < tokens.length) {
            const cmd = tokens[i++];
            switch (cmd) {
                // 絶対 x,y ペア×N
                case 'M': case 'L': case 'T':
                    out.push(cmd);
                    while (isNum()) out.push(`${n()*sx+tx},${n()*sy+ty}`);
                    break;
                // 相対 dx,dy ペア×N
                case 'm': case 'l': case 't':
                    out.push(cmd);
                    while (isNum()) out.push(`${n()*sx},${n()*sy}`);
                    break;
                case 'H': out.push(cmd); while (isNum()) out.push(n()*sx+tx); break;
                case 'h': out.push(cmd); while (isNum()) out.push(n()*sx);    break;
                case 'V': out.push(cmd); while (isNum()) out.push(n()*sy+ty); break;
                case 'v': out.push(cmd); while (isNum()) out.push(n()*sy);    break;
                // 絶対 C: x1,y1 x2,y2 x,y ×N
                case 'C':
                    out.push(cmd);
                    while (isNum()) out.push(`${n()*sx+tx},${n()*sy+ty} ${n()*sx+tx},${n()*sy+ty} ${n()*sx+tx},${n()*sy+ty}`);
                    break;
                case 'c':
                    out.push(cmd);
                    while (isNum()) out.push(`${n()*sx},${n()*sy} ${n()*sx},${n()*sy} ${n()*sx},${n()*sy}`);
                    break;
                // 絶対 S,Q: xy×2 ×N
                case 'S': case 'Q':
                    out.push(cmd);
                    while (isNum()) out.push(`${n()*sx+tx},${n()*sy+ty} ${n()*sx+tx},${n()*sy+ty}`);
                    break;
                case 's': case 'q':
                    out.push(cmd);
                    while (isNum()) out.push(`${n()*sx},${n()*sy} ${n()*sx},${n()*sy}`);
                    break;
                // 絶対 A: rx ry xRot largeArcFlag sweepFlag x y ×N
                case 'A':
                    out.push(cmd);
                    while (isNum()) {
                        const rx = n()*sx, ry = n()*sy;
                        const rot = raw(), laf = raw(), sf = raw();
                        out.push(`${rx},${ry} ${rot} ${laf},${sf} ${n()*sx+tx},${n()*sy+ty}`);
                    }
                    break;
                case 'a':
                    out.push(cmd);
                    while (isNum()) {
                        const rx = n()*sx, ry = n()*sy;
                        const rot = raw(), laf = raw(), sf = raw();
                        out.push(`${rx},${ry} ${rot} ${laf},${sf} ${n()*sx},${n()*sy}`);
                    }
                    break;
                case 'Z': case 'z': out.push(cmd); break;
                default: out.push(cmd);
            }
        }
        return out.join(' ');
    }

    // url(./defs.svg#id) をローカル参照 url(#id) に変換する（後方互換のため維持）
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

    // headerSVGとcurrentBodySVGのdefsを収集し、ID先着順で重複除外した<defs>要素を返す
    _collectDefs() {
        const defsEl = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const seenIds = new Set();
        const sources = [this._headerSVG, this.currentBodySVG].filter(Boolean);
        for (const svg of sources) {
            const defs = svg.querySelector('defs');
            if (!defs) continue;
            for (const child of Array.from(defs.children)) {
                const id = child.getAttribute('id');
                // 同じIDのdefsは同一のものとみなし、先に出た側のみ使用する
                if (id && seenIds.has(id)) continue;
                if (id) seenIds.add(id);
                defsEl.appendChild(child.cloneNode(true));
            }
        }
        return defsEl;
    }

    // オブジェクトツリーを構築し、<defs>とコンテンツ<g>をまとめたDocumentFragmentを返す
    draw(drawParams) {
        this._drawParams = drawParams;
        // header+bodyのdefsを収集（buildTree内でthis._defsElを参照するため先に設定）
        this._defsEl = this._collectDefs();

        // オブジェクトツリーを構築してgetElementで描画
        this.buildTree();
        console.log(this.defaultLineRoot);
        const resolveValue = name => this._resolveValue(name);
        const ctx = { resolveValue, exprParser: this.exprParser, debug: this._debug };

        // defaultLine → header の順に同一<g>へ結合する
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const defaultLineEl = this.defaultLineRoot.getElement(ctx);
        if (defaultLineEl) g.appendChild(defaultLineEl);
        const headerEl = this.root.getElement(ctx);
        if (headerEl) g.appendChild(headerEl);

        // <defs>とコンテンツ<g>をDocumentFragmentにまとめて返す
        const fragment = document.createDocumentFragment();
        if (this._defsEl) fragment.appendChild(this._defsEl);
        fragment.appendChild(g);
        return fragment;
    }

    // テンプレートSVGからオブジェクトツリーを構築してthis.rootに設定する
    buildTree() {
        // currentBodySVGのツリーを構築（ページが存在する場合のみ子要素を追加）
        this.defaultLineRoot = new GroupObj(null);
        const bodySVG = this.currentBodySVG;
        if (bodySVG) {
            // SVGルート直接子の mulShadow を収集してインスタンス変数に保持する
            // _buildNode 内の arrange/group ケースで shadowId 照合に使用する
            const dlChildArr = Array.from(bodySVG.children).filter(c => c.getAttribute);
            this._activeShadowMap = MulShadowUtil.collectShadowMap(dlChildArr);
            for (const child of dlChildArr) {
                if (child.getAttribute('lcdParts') === 'mulShadow') continue;
                // defs要素はオブジェクト化しない（_buildNodeでもnull返るが明示的にスキップ）
                if (child.tagName && child.tagName.toLowerCase() === 'defs') continue;
                const node = this._buildNode(child);
                if (node) this.defaultLineRoot.addChild(node);
            }
            this._activeShadowMap = null;
        }

        // ルートはSVG要素自体に対応するGroupObj（visible属性なし）
        this.root = new GroupObj(null);
        const tmChildArr = Array.from(this._headerSVG.children).filter(c => c.getAttribute);
        this._activeShadowMap = MulShadowUtil.collectShadowMap(tmChildArr);
        for (const child of tmChildArr) {
            if (child.getAttribute('lcdParts') === 'mulShadow') continue;
            // defs要素はオブジェクト化しない
            if (child.tagName && child.tagName.toLowerCase() === 'defs') continue;
            const node = this._buildNode(child);
            if (node) this.root.addChild(node);
        }
        this._activeShadowMap = null;
    }

    // SVG要素をlcdPartsに応じてオブジェクトに変換する。
    // lcdPartsなし → null（子孫ごとスキップ）
    _buildNode(element) {
        // isDraw属性が静的評価でfalseならツリーに追加しない
        const isDrawAttr = element.getAttribute ? element.getAttribute('isDraw') : null;
        if (isDrawAttr !== null) {
            const resolveValue = LcdPartsObj.makeResolveValue(this._drawParams, {});
            if (!this.exprParser.eval(isDrawAttr, resolveValue)) return null;
        }

        const lcdParts = element.getAttribute ? element.getAttribute('lcdParts') : null;
        const tagName  = element.tagName ? element.tagName.toLowerCase() : '';

        if (tagName === 'svg' || lcdParts === 'group') {
            // グループとして子要素を再帰的にオブジェクト化
            const group = new GroupObj(element);
            // lcdParts="group"にlcd-color属性がある場合、配下のshape要素にfillを適用する（階層優先）
            let domForChildren = element;
            if (lcdParts === 'group') {
                const lcdColorAttr = element.getAttribute('lcd-color');
                if (lcdColorAttr) {
                    const resolved = StaticObj._resolveLcdColor(lcdColorAttr, this._drawParams);
                    const color = Array.isArray(resolved) ? (resolved[0] || null) : (resolved || null);
                    if (color) {
                        domForChildren = element.cloneNode(true);
                        StaticObj._applyColorToDOM(domForChildren, color, this._drawParams);
                    }
                }
            }
            // 子要素の mulShadow を収集して _activeShadowMap にマージし、子ループ後に復元する
            const childArr = Array.from(domForChildren.children).filter(c => c.getAttribute);
            const localShadowMap = MulShadowUtil.collectShadowMap(childArr);
            const prevShadowMap = this._activeShadowMap;
            if (Object.keys(localShadowMap).length > 0) {
                this._activeShadowMap = { ...(prevShadowMap || {}), ...localShadowMap };
            }
            for (const child of childArr) {
                // mulShadow 自体はオブジェクト生成せずスキップ
                if (child.getAttribute('lcdParts') === 'mulShadow') continue;
                const node = this._buildNode(child);
                if (node) group.addChild(node);
            }
            this._activeShadowMap = prevShadowMap;
            return group;
        } else if (lcdParts === 'static') {
            return new StaticObj(element, this._drawParams);
        } else if (lcdParts === 'textBox') {
            return new TextBoxObj(element, this._drawParams, {}, this.textDrawer);
        } else if (lcdParts === 'numbering') {
            return new NumIconObj(element, this._drawParams, {}, this.numIconDrawer);
        } else if (lcdParts === 'arrange') {
            // shadowId（カンマ区切り可）を解析して _activeShadowMap に一致する影リストを activeShadows に渡す
            const shadowIdAttr  = element.getAttribute('shadowId');
            const rootShadowMap = this._activeShadowMap || {};
            const activeShadows = MulShadowUtil.resolveShadows(shadowIdAttr, rootShadowMap);
            const arrangeCtx = {
                drawParams: this._drawParams,
                args: {},
                textDrawer: this.textDrawer,
                numIconDrawer: this.numIconDrawer,
                exprParser: this.exprParser,
                debug: this._debug,
                defsEl: this._defsEl,
                activeShadows: activeShadows.length > 0 ? activeShadows : null,
                // ルートレベルのshadowMapを子孫ArrangeObjに引き継ぐ（深くネストされた要素のshadowId解決に使用）
                rootShadowMap,
            };
            const arrangeObj = new ArrangeObj(element, arrangeCtx);
            // arrangeAreaのサイズ内に収まるよう圧縮を適用
            arrangeObj.setSize(arrangeObj.width, arrangeObj.height);
            return arrangeObj;
        } else if (lcdParts === 'slot') {
            // slotはarrangeと同じコンテキストを使用する
            const shadowIdAttr  = element.getAttribute('shadowId');
            const rootShadowMap = this._activeShadowMap || {};
            const activeShadows = MulShadowUtil.resolveShadows(shadowIdAttr, rootShadowMap);
            const slotCtx = {
                drawParams: this._drawParams,
                args: {},
                textDrawer: this.textDrawer,
                numIconDrawer: this.numIconDrawer,
                exprParser: this.exprParser,
                debug: this._debug,
                defsEl: this._defsEl,
                activeShadows: activeShadows.length > 0 ? activeShadows : null,
                rootShadowMap,
            };
            return new SlotObj(element, slotCtx);
        }
        // lcdPartsなし（またはunknown値）: 子孫ごとスキップ
        return null;
    }

    // 言語を切り替え、オブジェクトツリー全体にlangChangeを伝播する
    // visible の変化をアニメーションで遷移させる
    langChange(newLangId, transTime, gapTime) {
        this._drawParams.langId = newLangId;
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
        let val = this._drawParams;
        for (const key of keys) {
            if (val === null || val === undefined) return undefined;
            val = val[key];
        }
        return val;
    }

}
