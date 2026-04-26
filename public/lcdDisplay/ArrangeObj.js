// lcdParts="arrange" に対応するオブジェクトクラス
class ArrangeObj extends LcdPartsObj {
    // ctx: { drawParams, args, textDrawer, exprParser }
    constructor(svgDom, ctx) {
        const { drawParams, args, textDrawer, exprParser } = ctx;
        super(svgDom, drawParams, args);

        this._ctx        = ctx;
        this._drawParams = drawParams;
        this._args       = args;

        this.axis     = svgDom.getAttribute('arrange-axis')     || 'x';
        this.interval = parseFloat(svgDom.getAttribute('arrange-interval')) || 0;
        this.arg      = {}; // { 引数名: 配列 }
        this.children = [];
        this._uniformScale = 1;

        // arrangeAreaのrectから領域を取得
        const areaRect = Array.from(svgDom.children).find(
            c => c.getAttribute('lcdParts') === 'arrangeArea'
        );
        if (areaRect) {
            this.x      = parseFloat(areaRect.getAttribute('x'))      || 0;
            this.y      = parseFloat(areaRect.getAttribute('y'))      || 0;
            this.width  = parseFloat(areaRect.getAttribute('width'))  || 0;
            this.height = parseFloat(areaRect.getAttribute('height')) || 0;
        }

        // lcd-arg属性を解析してdrawParamsの配列を取得
        const lcdArgAttr = svgDom.getAttribute('lcd-arg');
        if (lcdArgAttr) {
            lcdArgAttr.split(',').map(s => s.trim()).forEach(argName => {
                const val = LcdPartsObj.resolveDrawParam(argName, drawParams);
                if (Array.isArray(val)) {
                    this.arg[argName] = val;
                }
            });
        }

        // 子要素を走査してchildrenを構築
        Array.from(svgDom.children).forEach(child => {
            // arrangeArea自体はスキップ
            if (child.getAttribute('lcdParts') === 'arrangeArea') return;

            const childLcdArg = child.getAttribute('lcd-arg');
            if (childLcdArg && childLcdArg.startsWith('$')) {
                // $引数名 → 対応する配列の要素数だけ複製
                const argName  = childLcdArg.slice(1).split('.')[0];
                const argArray = this.arg[argName];
                if (Array.isArray(argArray)) {
                    argArray.forEach(element => {
                        const childArgs = Object.assign({}, args, { [argName]: element });
                        const obj = this._createChildObj(child, drawParams, childArgs, textDrawer, exprParser);
                        if (obj) this.children.push(obj);
                    });
                }
            } else {
                // 通常の子要素（複製なし）
                const obj = this._createChildObj(child, drawParams, args, textDrawer, exprParser);
                if (obj) this.children.push(obj);
            }
        });

        // 構築時の自然サイズを記録しておく
        this._childNaturalSizes = this.children.map(c => c.getRealSize());
        this._computeNaturalSize();
        // setSize()で更新される配置割り当てサイズ（fitX/Y時のrealSize代替用）
        const isXInit = this.axis === 'x';
        this._axisSizes = this._childNaturalSizes.map(s => isXInit ? s.width : s.height);
    }

    // 子要素のlcdPartsに応じてオブジェクトを生成する
    _createChildObj(svgDom, drawParams, args, textDrawer, exprParser) {
        // visible属性を評価して非表示なら生成しない
        const visibleAttr = svgDom.getAttribute('visible');
        if (visibleAttr !== null) {
            const resolveValue = LcdPartsObj.makeResolveValue(drawParams, args);
            if (!exprParser.eval(visibleAttr, resolveValue)) return null;
        }

        const lcdParts = svgDom.getAttribute('lcdParts');
        // debug等のフラグを親ctxから引き継ぎ、drawParams/argsのみ上書き
        const childCtx = { ...this._ctx, drawParams, args };

        if (lcdParts === 'arrange') {
            return new ArrangeObj(svgDom, childCtx);
        } else if (lcdParts === 'textBox') {
            return new TextBoxObj(svgDom, drawParams, args, textDrawer);
        }
        // static / numberingIcon は現時点では未実装
        return null;
    }

    // 子要素の自然サイズから自身の自然サイズを算出する
    // サイズ0の要素（空テキスト等）はintervalカウントから除外する
    _computeNaturalSize() {
        const isX = this.axis === 'x';
        if (this.children.length === 0) {
            this.realWidth = 0;
            this.realHeight = 0;
            return;
        }
        let axisTotal    = 0;
        let crossMax     = 0;
        let nonZeroCount = 0;
        this._childNaturalSizes.forEach(s => {
            const axisSize = isX ? s.width : s.height;
            if (axisSize > 0) {
                axisTotal += axisSize;
                nonZeroCount++;
            }
            crossMax = Math.max(crossMax, isX ? s.height : s.width);
        });
        axisTotal += this.interval * Math.max(0, nonZeroCount - 1);
        this.realWidth  = isX ? axisTotal : crossMax;
        this.realHeight = isX ? crossMax  : axisTotal;
    }

    getRealSize() {
        return { width: this.realWidth, height: this.realHeight };
    }

    // axis方向の圧縮サイズをminComRatioアルゴリズムで計算して返す
    _calcAxisSizes(naturalSizes, minComRatios, targetTotal, interval) {
        const n = naturalSizes.length;
        if (n === 0) return [];

        const totalInterval        = interval * (n - 1);
        const availableForContent  = targetTotal - totalInterval;
        const naturalTotal         = naturalSizes.reduce((a, b) => a + b, 0);

        // 圧縮不要なら自然サイズをそのまま返す
        if (naturalTotal <= availableForContent) return [...naturalSizes];

        const currentSizes = [...naturalSizes];
        let freeIndices    = naturalSizes.map((_, i) => i);
        let fixedTotal     = 0;

        // フェーズ1: minComRatioに達するまで自由要素を等圧縮
        while (freeIndices.length > 0) {
            const freeNatural = freeIndices.reduce((sum, i) => sum + naturalSizes[i], 0);
            const needed      = availableForContent - fixedTotal;
            if (freeNatural <= 0) break;

            const ratio = needed / freeNatural;

            // この比率でminComRatioを下回る要素を探す
            const toClamp = freeIndices.filter(i => minComRatios[i] > 0 && ratio < minComRatios[i]);

            if (toClamp.length === 0) {
                // 全free要素に等比率を適用して終了
                freeIndices.forEach(i => { currentSizes[i] = naturalSizes[i] * ratio; });
                freeIndices = [];
            } else {
                // minComRatioで固定してfreeから除外
                toClamp.forEach(i => {
                    currentSizes[i] = naturalSizes[i] * minComRatios[i];
                    fixedTotal += currentSizes[i];
                });
                freeIndices = freeIndices.filter(i => !toClamp.includes(i));
            }
        }

        // フェーズ2: 全要素がminComRatioに達してもまだ超過している場合は全体を均等圧縮
        const totalSize = currentSizes.reduce((a, b) => a + b, 0);
        if (totalSize > availableForContent + 0.001) {
            const uniformRatio = availableForContent / totalSize;
            currentSizes.forEach((_, i) => { currentSizes[i] *= uniformRatio; });
        }

        return currentSizes;
    }

    // 指定サイズに合わせて子要素を圧縮し、実際に設定されたサイズを返す
    setSize(width, height) {
        if (this.children.length === 0) return { width: 0, height: 0 };

        // 利用可能サイズを更新する。getElement()はthis.width/heightを参照するため、
        // fitX/YやネストされたarrangeでもsetSizeで渡されたサイズが正しく反映される。
        this.width  = width;
        this.height = height;

        const isX        = this.axis === 'x';
        const axisTarget = isX ? width : height;

        // flexible=false でも子要素のaxis圧縮・setSize伝播は常に実行する
        // （子要素自身のflexible等の設定を活かすため）

        // fitX/Y の自然サイズ計算用擬似無限値。TextDrawer等がこれを上限として返さず
        // 真の自然サイズを返すように、十分大きな値とする。
        const INFINITE = 1e9;

        // パス1: fitX/Y軸方向の子を「擬似無限」でsetSizeして真の自然サイズを取得する
        // 親arrangeの幅で上限を設けないことで、テキスト量・コンテンツ量が異なる子要素でも
        // 同一の圧縮比率が適用されるようにする。
        // fitなし子は_childNaturalSizesをそのまま使用する。
        const effectiveNaturalAxes = this.children.map((child, i) => {
            const hasFitAxis   = isX ? child.fitX : child.fitY;
            const crossNatural = isX ? this._childNaturalSizes[i].height : this._childNaturalSizes[i].width;
            if (hasFitAxis) {
                // axis方向もcross方向も、fitが指定されていれば擬似無限を渡す
                const crossFit  = isX ? child.fitY : child.fitX;
                const crossSize = crossFit ? INFINITE : crossNatural;
                child.setSize(isX ? INFINITE : crossSize, isX ? crossSize : INFINITE);
                const r = child.getRealSize();
                return isX ? r.width : r.height;
            }
            return isX ? this._childNaturalSizes[i].width : this._childNaturalSizes[i].height;
        });

        // パス2: 実効自然サイズに基づいて圧縮サイズを算出
        const minComRatios = this.children.map(c => c.minComRatio);
        const axisSizes    = this._calcAxisSizes(effectiveNaturalAxes, minComRatios, axisTarget, this.interval);
        this._axisSizes    = axisSizes;

        // パス3: 圧縮後サイズで各子要素を最終setSize
        this.children.forEach((child, i) => {
            const crossNatural = isX ? this._childNaturalSizes[i].height : this._childNaturalSizes[i].width;
            const crossSize    = (isX ? child.fitY : child.fitX) ? (isX ? this.height : this.width) : crossNatural;
            child.setSize(isX ? axisSizes[i] : crossSize, isX ? crossSize : axisSizes[i]);
        });

        // 子要素の最終サイズから自身の実サイズを更新
        let axisTotal = this.interval * (this.children.length - 1);
        let crossMax  = 0;
        this.children.forEach(child => {
            const { width: cw, height: ch } = child.getRealSize();
            axisTotal += isX ? cw : ch;
            crossMax   = Math.max(crossMax, isX ? ch : cw);
        });
        this.realWidth  = isX ? axisTotal : crossMax;
        this.realHeight = isX ? crossMax  : axisTotal;

        // flexible=false の場合のみ: 圧縮後も領域を超えるなら均等縮小をかける
        if (!this.flexible) {
            const sw = this.realWidth  > 0 ? width  / this.realWidth  : 1;
            const sh = this.realHeight > 0 ? height / this.realHeight : 1;
            const scale = Math.min(sw, sh, 1);
            if (scale < 1) {
                this._uniformScale = scale;
                this.realWidth    *= scale;
                this.realHeight   *= scale;
            }
        }

        return { width: this.realWidth, height: this.realHeight };
    }

    // axis方向の揃え位置からstartオフセットを計算する（ローカル座標）
    _calcAxisStart(axisAvailable, axisTotal) {
        const isX      = this.axis === 'x';
        const axisAlign = isX ? this.horizontalAlign : this.verticalAlign;
        if (axisAlign === 'right' || axisAlign === 'bottom') {
            return axisAvailable - axisTotal;
        } else if (axisAlign === 'center') {
            return (axisAvailable - axisTotal) / 2;
        }
        return 0; // left / top
    }

    // cross方向の位置を計算する（ローカル座標）
    // cross方向の揃えは子要素ごとに独立して指定するため、childのalignとmarginを参照する
    _calcCrossPos(crossAvailable, childCrossSize, child) {
        const isX        = this.axis === 'x';
        const crossAlign = isX ? child.verticalAlign : child.horizontalAlign;
        const margin     = crossAlign === 'center' ? 0 : child.margin;

        if (crossAlign === 'bottom' || crossAlign === 'right') {
            return crossAvailable - childCrossSize - margin;
        } else if (crossAlign === 'center') {
            return (crossAvailable - childCrossSize) / 2;
        }
        return margin; // top / left
    }

    // 子要素をレイアウトしてSVG<g>を返す
    getElement() {
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const outer  = document.createElementNS(SVG_NS, 'g');

        // 絶対座標への移動とflexible=false時のscaleを外側gで適用
        if (this._uniformScale !== 1) {
            outer.setAttribute('transform',
                `translate(${this.x}, ${this.y}) scale(${this._uniformScale})`);
        } else {
            outer.setAttribute('transform', `translate(${this.x}, ${this.y})`);
        }

        const inner        = document.createElementNS(SVG_NS, 'g');
        const isX          = this.axis === 'x';
        const axisAvail    = isX ? this.width  : this.height;
        const crossAvail   = isX ? this.height : this.width;

        // 子要素の現在サイズでaxis合計を算出
        // サイズ0の要素はintervalカウントから除外（空テキスト等が先頭にある場合の対応）
        let axisTotal    = 0;
        let nonZeroCount = 0;
        this.children.forEach(child => {
            const { width: cw, height: ch } = child.getRealSize();
            const size = isX ? cw : ch;
            if (size > 0) {
                axisTotal += size;
                nonZeroCount++;
            }
        });
        axisTotal += this.interval * Math.max(0, nonZeroCount - 1);

        let axisCursor = this._calcAxisStart(axisAvail, axisTotal);

        // firstRendered: 最初の描画要素かどうかを管理（先頭にintervalを入れないため）
        let firstRendered = true;

        // デバッグ: 末端textBox要素の境界を後で描画するために収集
        const debugLeafRects = [];

        this.children.forEach(child => {
            const { width: cw, height: ch } = child.getRealSize();
            const childAxisSize  = isX ? cw : ch;
            const childCrossSize = isX ? ch : cw;
            const crossPos       = this._calcCrossPos(crossAvail, childCrossSize, child);

            // 最初の描画要素でなければ前にintervalを挿入
            const axisPos = firstRendered ? axisCursor : axisCursor + this.interval;
            const childX  = isX ? axisPos   : crossPos;
            const childY  = isX ? crossPos  : axisPos;

            child.setCoordinate(childX, childY);
            const el = child.getElement();

            if (el) {
                inner.appendChild(el);
                // intervalは描画された要素の後ろに積算（次の要素の前に使う）
                axisCursor = axisPos + childAxisSize;
                firstRendered = false;
            }
            // 描画されなかった要素はaxisCursorもfirstRenderedも変更しない

            // デバッグ: 末端のtextBox境界を収集（サイズ0は除外）
            if (this._ctx.debug && child instanceof TextBoxObj && cw > 0 && ch > 0) {
                debugLeafRects.push({ x: childX, y: childY, w: cw, h: ch });
            }
        });

        outer.appendChild(inner);

        // デバッグオーバーレイ: arrangeArea境界と末端要素境界を最前面に追加
        if (this._ctx.debug) {
            // arrangeAreaの境界: uniformScaleを逆補正したグループで本来のpx領域を表示
            const scale = this._uniformScale > 0 ? this._uniformScale : 1;
            const boundsGroup = document.createElementNS(SVG_NS, 'g');
            if (scale !== 1) boundsGroup.setAttribute('transform', `scale(${1 / scale})`);
            boundsGroup.appendChild(
                ArrangeObj._makeDebugRect(SVG_NS, 0, 0, this.width, this.height, '#4488ff', '8,4', 2)
            );
            outer.appendChild(boundsGroup);

            // 末端textBox要素の境界（innerと同じ座標系）
            if (debugLeafRects.length > 0) {
                const leafGroup = document.createElementNS(SVG_NS, 'g');
                debugLeafRects.forEach(r => {
                    leafGroup.appendChild(
                        ArrangeObj._makeDebugRect(SVG_NS, r.x, r.y, r.w, r.h, '#ff4422', '4,2', 1)
                    );
                });
                inner.appendChild(leafGroup);
            }
        }

        return outer;
    }

    // デバッグ用の矩形SVG要素を生成するヘルパー
    static _makeDebugRect(svgNS, x, y, w, h, stroke, dasharray, strokeWidth) {
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', stroke);
        rect.setAttribute('stroke-width', strokeWidth);
        rect.setAttribute('stroke-dasharray', dasharray);
        rect.setAttribute('pointer-events', 'none');
        return rect;
    }
}
