// lcdParts="static" に対応するオブジェクトクラス
// getElement は参照渡し。テンプレート保護のためクローンはコンストラクタで一度だけ行う。
// <g>要素で指定した場合、直下の lcdParts="staticArea" を持つ rect が範囲を定義する。
class StaticObj {
    constructor(svgDom, drawParams = null, colorOverride = null) {
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

        // 範囲・拡大縮小関連フィールド（staticAreaが存在する場合のみ有効）
        this._areaX         = 0;
        this._areaY         = 0;
        this._naturalWidth  = 0;
        this._naturalHeight = 0;
        this.realWidth      = 0;
        this.realHeight     = 0;
        this._snapshots     = null;

        // <g>要素の場合、直下の staticArea から範囲を取得してスナップショットを記録
        const tagName = svgDom.tagName ? svgDom.tagName.toLowerCase() : '';
        if (tagName === 'g') {
            const areaEl = Array.from(this._node.children).find(
                c => c.getAttribute('lcdParts') === 'staticArea'
            );
            if (areaEl) {
                this._areaX         = parseFloat(areaEl.getAttribute('x'))      || 0;
                this._areaY         = parseFloat(areaEl.getAttribute('y'))      || 0;
                this._naturalWidth  = parseFloat(areaEl.getAttribute('width'))  || 0;
                this._naturalHeight = parseFloat(areaEl.getAttribute('height')) || 0;
                this.realWidth      = this._naturalWidth;
                this.realHeight     = this._naturalHeight;
                // kuruアニメーション用にy/heightをstaticAreaの値で上書き
                this.x      = this._areaX;
                this.y      = this._areaY;
                this.height = this._naturalHeight;
                // staticAreaはレンダリング不要なのでクローンから削除
                this._node.removeChild(areaEl);
                // 残りの子孫要素の原始座標をスナップショットとして記録
                this._snapshots = this._takeSnapshot(this._node);
            }
        }

        // <g>要素配下のvisible属性を持つ子孫要素を収集する（staticArea削除後）
        this._visibleItems = [];
        if (tagName === 'g') this._collectVisibleItems(this._node);

        // lcd-color属性によるfill設定
        // colorOverrideが渡された場合はそれを優先し、なければlcd-color属性をdrawParamsで解決する
        const lcdColorAttr = svgDom.getAttribute('lcd-color');
        if (colorOverride !== null) {
            this._applyColor(colorOverride);
        } else if (lcdColorAttr && drawParams !== null) {
            const resolved = StaticObj._resolveLcdColor(lcdColorAttr, drawParams);
            if (Array.isArray(resolved)) {
                // 配列の場合は先頭要素のみ使用（配列展開はArrangeObj側で処理）
                if (resolved.length > 0) this._applyColor(resolved[0]);
            } else if (resolved) {
                this._applyColor(resolved);
            }
        }
    }

    // 実際の描画サイズを返す（staticAreaなしの場合は {0, 0}）
    getRealSize() {
        return { width: this.realWidth, height: this.realHeight };
    }

    // 座標を更新する（ArrangeObjから呼ばれる）
    setCoordinate(x, y) {
        this.x = x;
        this.y = y;
    }

    // 指定サイズへ拡大縮小する（staticAreaが定義されている場合のみ有効）
    // sx = width/naturalWidth、sy = height/naturalHeight を子孫要素の座標属性に適用する
    setSize(width, height) {
        if (!this._naturalWidth || !this._naturalHeight || !this._snapshots) {
            return { width: this.realWidth, height: this.realHeight };
        }
        const sx = width  / this._naturalWidth;
        const sy = height / this._naturalHeight;
        this._applyScale(this._areaX, this._areaY, sx, sy);
        this.realWidth  = width;
        this.realHeight = height;
        return { width, height };
    }

    // lcd-color属性値を解決する静的メソッド
    // CSS色リテラル（#・rgb(等で始まる）はそのまま返し、それ以外はdrawParams変数名として解決する
    static _resolveLcdColor(attr, drawParams) {
        if (!attr) return null;
        if (/^#|^rgb\(|^rgba\(|^hsl\(|^hsla\(/i.test(attr.trim())) return attr.trim();
        return LcdPartsObj.resolveDrawParam(attr.trim(), drawParams);
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

    // 子孫要素の原始座標をMap<Element, snap>として記録する
    _takeSnapshot(containerEl) {
        const snapshots = new Map();
        const walk = (el) => {
            const tag = el.tagName ? el.tagName.toLowerCase() : '';
            let snap = null;
            switch (tag) {
                case 'rect':
                    snap = {
                        x:      parseFloat(el.getAttribute('x'))      || 0,
                        y:      parseFloat(el.getAttribute('y'))      || 0,
                        width:  parseFloat(el.getAttribute('width'))  || 0,
                        height: parseFloat(el.getAttribute('height')) || 0,
                        rx: el.hasAttribute('rx') ? parseFloat(el.getAttribute('rx')) : null,
                        ry: el.hasAttribute('ry') ? parseFloat(el.getAttribute('ry')) : null,
                    };
                    break;
                case 'polygon':
                case 'polyline':
                    snap = { points: el.getAttribute('points') || '' };
                    break;
                case 'line':
                    snap = {
                        x1: parseFloat(el.getAttribute('x1')) || 0,
                        y1: parseFloat(el.getAttribute('y1')) || 0,
                        x2: parseFloat(el.getAttribute('x2')) || 0,
                        y2: parseFloat(el.getAttribute('y2')) || 0,
                    };
                    break;
                case 'circle':
                    snap = {
                        cx: parseFloat(el.getAttribute('cx')) || 0,
                        cy: parseFloat(el.getAttribute('cy')) || 0,
                        r:  parseFloat(el.getAttribute('r'))  || 0,
                    };
                    break;
                case 'ellipse':
                    snap = {
                        cx: parseFloat(el.getAttribute('cx')) || 0,
                        cy: parseFloat(el.getAttribute('cy')) || 0,
                        rx: parseFloat(el.getAttribute('rx')) || 0,
                        ry: parseFloat(el.getAttribute('ry')) || 0,
                    };
                    break;
                case 'path':
                    snap = { d: el.getAttribute('d') || '' };
                    break;
            }
            if (snap) snapshots.set(el, snap);
            // <g>等は座標を持たないが子孫を再帰処理
            for (const child of el.children) walk(child);
        };
        for (const child of containerEl.children) walk(child);
        return snapshots;
    }

    // スナップショットの原始座標に (ox,oy) を原点としてsx/syを適用する
    _applyScale(ox, oy, sx, sy) {
        this._snapshots.forEach((snap, el) => {
            const tag = el.tagName ? el.tagName.toLowerCase() : '';
            switch (tag) {
                case 'rect':
                    el.setAttribute('x',      ox + (snap.x - ox) * sx);
                    el.setAttribute('y',      oy + (snap.y - oy) * sy);
                    el.setAttribute('width',  snap.width  * sx);
                    el.setAttribute('height', snap.height * sy);
                    if (snap.rx !== null) el.setAttribute('rx', snap.rx * sx);
                    if (snap.ry !== null) el.setAttribute('ry', snap.ry * sy);
                    break;
                case 'polygon':
                case 'polyline': {
                    // points: "x1,y1 x2,y2 ..." を数値列として解析してsx/syを適用
                    const nums   = snap.points.trim().split(/[\s,]+/).filter(s => s !== '').map(Number);
                    const scaled = nums.map((v, i) =>
                        i % 2 === 0 ? ox + (v - ox) * sx : oy + (v - oy) * sy
                    );
                    el.setAttribute('points', scaled.join(' '));
                    break;
                }
                case 'line':
                    el.setAttribute('x1', ox + (snap.x1 - ox) * sx);
                    el.setAttribute('y1', oy + (snap.y1 - oy) * sy);
                    el.setAttribute('x2', ox + (snap.x2 - ox) * sx);
                    el.setAttribute('y2', oy + (snap.y2 - oy) * sy);
                    break;
                case 'circle':
                    el.setAttribute('cx', ox + (snap.cx - ox) * sx);
                    el.setAttribute('cy', oy + (snap.cy - oy) * sy);
                    // 非均一スケール時はmin(sx,sy)でrを縮小して円形を維持
                    el.setAttribute('r',  snap.r * Math.min(sx, sy));
                    break;
                case 'ellipse':
                    el.setAttribute('cx', ox + (snap.cx - ox) * sx);
                    el.setAttribute('cy', oy + (snap.cy - oy) * sy);
                    el.setAttribute('rx', snap.rx * sx);
                    el.setAttribute('ry', snap.ry * sy);
                    break;
                case 'path':
                    el.setAttribute('d', StaticObj._scalePath(snap.d, ox, oy, sx, sy));
                    break;
            }
        });
    }

    // pathのd属性をスケールする静的ヘルパー
    // 絶対コマンド(大文字): 座標を原点(ox,oy)基準でスケール
    // 相対コマンド(小文字): 差分値をそのままsx/sy倍（原点オフセット不要）
    // Aコマンドのrx/ryはsx/sy倍、x-rotation・フラグはそのまま保持
    static _scalePath(d, ox, oy, sx, sy) {
        const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g);
        if (!tokens) return d;

        const isCmd  = t => /^[MmLlHhVvCcSsQqTtAaZz]$/.test(t);
        const num    = i => parseFloat(tokens[i]);
        const scaleX = (x, abs) => abs ? ox + (x - ox) * sx : x * sx;
        const scaleY = (y, abs) => abs ? oy + (y - oy) * sy : y * sy;

        const out = [];
        let i = 0;
        while (i < tokens.length) {
            if (!isCmd(tokens[i])) { i++; continue; }
            const cmd  = tokens[i++];
            const abs  = cmd === cmd.toUpperCase();
            const TYPE = cmd.toUpperCase();
            out.push(cmd);

            // 同一コマンドの暗黙的繰り返しも while でまとめて処理
            while (i < tokens.length && !isCmd(tokens[i])) {
                switch (TYPE) {
                    case 'M': case 'L': case 'T':
                        out.push(scaleX(num(i), abs), scaleY(num(i+1), abs));
                        i += 2; break;
                    case 'H':
                        out.push(scaleX(num(i), abs));
                        i += 1; break;
                    case 'V':
                        out.push(scaleY(num(i), abs));
                        i += 1; break;
                    case 'C':
                        out.push(
                            scaleX(num(i),   abs), scaleY(num(i+1), abs),
                            scaleX(num(i+2), abs), scaleY(num(i+3), abs),
                            scaleX(num(i+4), abs), scaleY(num(i+5), abs)
                        ); i += 6; break;
                    case 'S': case 'Q':
                        out.push(
                            scaleX(num(i),   abs), scaleY(num(i+1), abs),
                            scaleX(num(i+2), abs), scaleY(num(i+3), abs)
                        ); i += 4; break;
                    case 'A':
                        // rx ry x-rotation large-arc-flag sweep-flag x y
                        out.push(
                            num(i)   * sx,   // rx
                            num(i+1) * sy,   // ry
                            tokens[i+2],     // x-rotation（角度のためそのまま保持）
                            tokens[i+3],     // large-arc-flag
                            tokens[i+4],     // sweep-flag
                            scaleX(num(i+5), abs),
                            scaleY(num(i+6), abs)
                        ); i += 7; break;
                    default:
                        i++; break;
                }
            }
        }
        return out.join(' ');
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

        // staticAreaが存在する場合: setCoordinateで指定された座標へtranslateで移動
        if (this._snapshots) {
            const dx = this.x - this._areaX;
            const dy = this.y - this._areaY;
            if (dx !== 0 || dy !== 0) {
                this._node.setAttribute('transform', `translate(${dx}, ${dy})`);
            } else {
                this._node.removeAttribute('transform');
            }
        }

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
