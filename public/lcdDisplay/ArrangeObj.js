// lcdParts="arrange" に対応するオブジェクトクラス
// GObj（LcdPartsObj継承）を基底クラスとして filter 分割描画機能を活用する
class ArrangeObj extends GObj {
    // ctx: { drawParams, args, textDrawer, exprParser }
    constructor(svgDom, ctx, colorOverride = null) {
        const { drawParams, args, textDrawer, exprParser } = ctx;
        super(svgDom, drawParams, args, colorOverride);

        this._ctx        = ctx;
        this._drawParams = drawParams;
        this._args       = args;

        this.axis     = svgDom.getAttribute('arrange-axis')     || 'x';
        this.interval = parseFloat(svgDom.getAttribute('arrange-interval')) || 0;
        this.arg      = {}; // { 引数名: 配列 }
        this.children = [];
        this._uniformScale = 1;
        // _filterはGObjコンストラクタで設定済みのため、ここでは重複初期化しない

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

        // 子要素を走査してchildrenを構築（arrangeとgroupで共通のビルドロジックを使用）
        this.children = this._buildContainerChildren(svgDom, drawParams, args, 'arrangeArea', this.arg);

        // 構築時の自然サイズを記録しておく
        this._childNaturalSizes = this.children.map(c => c.getRealSize());
        this._computeNaturalSize();
        // setSize()で更新される配置割り当てサイズ（fitX/Y時のrealSize代替用）
        const isXInit = this.axis === 'x';
        this._axisSizes = this._childNaturalSizes.map(s => isXInit ? s.width : s.height);
    }

    // 子要素のlcdPartsに応じてオブジェクトを生成する
    // Case A-2: visible属性は配置・生成に影響しない（全子要素を常に生成）
    _createChildObj(svgDom, drawParams, args, textDrawer, exprParser, colorOverride = null) {
        // isDraw属性が静的評価でfalseならツリーに追加しない
        const isDrawAttr = svgDom.getAttribute('isDraw');
        if (isDrawAttr !== null) {
            const resolveValue = LcdPartsObj.makeResolveValue(drawParams, args);
            if (!exprParser.eval(isDrawAttr, resolveValue)) return null;
        }

        const lcdParts = svgDom.getAttribute('lcdParts');
        // debug等のフラグを親ctxから引き継ぎ、drawParams/argsのみ上書き
        const childCtx = { ...this._ctx, drawParams, args };

        // 明示的colorOverrideがない場合、このコンテナの保持色を引き継ぐ
        const effectiveColor = colorOverride ?? this.colorOverride;

        let obj;
        if (lcdParts === 'arrange') {
            obj = new ArrangeObj(svgDom, childCtx, effectiveColor);
            // Drawer._buildNodeと同様に、arrangeAreaのサイズ内に収まるよう初期圧縮を適用する
            obj.setSize(obj.width, obj.height);
        } else if (lcdParts === 'slot') {
            obj = new SlotObj(svgDom, childCtx, effectiveColor);
        } else if (lcdParts === 'textBox') {
            obj = new TextBoxObj(svgDom, drawParams, args, textDrawer);
        } else if (lcdParts === 'numbering') {
            obj = new NumIconObj(svgDom, drawParams, args, this._ctx.numIconDrawer);
        } else if (lcdParts === 'static') {
            // argsを渡してlcd-colorのargs参照（$argName[n]等）を解決可能にする
            obj = new StaticObj(svgDom, drawParams, effectiveColor, args);
            // activeShadows がある場合、lcd-color適用後のfillに統合乗算グラデーションを適用する
            const { activeShadows, defsEl } = this._ctx;
            if (activeShadows && activeShadows.length > 0 && defsEl) {
                MulShadowUtil.applyMulShadow(obj._node, activeShadows, defsEl);
            }
        } else if (lcdParts === 'group') {
            // groupAreaを持つgroupは配置調整に参加する（getRealSizeがgroupArea寸法を返す）
            // DOM色の優先度: 明示的colorOverride > lcd-color属性 > 親から継承(this.colorOverride)
            let domColor = colorOverride;
            if (domColor === null) {
                const lcdColorAttr = svgDom.getAttribute('lcd-color');
                if (lcdColorAttr) {
                    const resolved = StaticObj._resolveLcdColor(lcdColorAttr, drawParams, args);
                    domColor = Array.isArray(resolved) ? (resolved[0] || null) : (resolved || null);
                }
            }
            if (domColor === null) domColor = this.colorOverride;
            const groupObj = new GroupObj(svgDom, domColor);
            // 有効な色がある場合、svgDomをクローンして配下のshape要素にfillを適用する（階層優先）
            let domForChildren = svgDom;
            if (domColor !== null) {
                domForChildren = svgDom.cloneNode(true);
                StaticObj._applyColorToDOM(domForChildren, domColor, drawParams, args);
            }
            // domColorをparentColorOverrideとして渡し、グループ内子要素に色を伝播する
            for (const node of this._buildContainerChildren(domForChildren, drawParams, args, 'groupArea', {}, domColor)) {
                groupObj.addChild(node);
            }
            obj = groupObj;
        }
        if (!obj) return null;

        // visible評価用のresolveValueとexprParserを構築時に設定する
        // drawParamsは参照渡しなので、langChange時の変更に自動追従する
        obj._resolveValue = LcdPartsObj.makeResolveValue(drawParams, args);
        obj._exprParser   = exprParser;
        obj._prevVisible  = obj._evalVisible();
        return obj;
    }

    // arrange・group 共通の子ビルドロジック
    // skipLcdParts: スキップするlcdParts値（'arrangeArea' or 'groupArea'）
    // parentArgMap: このコンテナが lcd-arg 宣言した配列マップ（{}の場合はdrawParamsへフォールバック）
    // parentColorOverride: このコンテナの実効色（lcd-arg展開・通常子に伝播する）
    _buildContainerChildren(svgDom, drawParams, args, skipLcdParts, parentArgMap = {}, parentColorOverride = null) {
        const { textDrawer, exprParser, defsEl } = this._ctx;
        const children = [];

        // mulShadow 要素を収集して shadowId → shadow情報 のマップを作成する
        // 実際の乗算適用は _createChildObj の static ケースで行う（lcd-color適用後に実施するため）
        const childArr = Array.from(svgDom.children).filter(c => c.getAttribute);
        const localShadowMap = MulShadowUtil.collectShadowMap(childArr);
        // ローカルマップとルートレベルのshadowMapをマージする（ローカル優先）
        // これにより、SVGルート直接子の mulShadow をネストされた要素からも参照できる
        const effectiveShadowMap = { ...(this._ctx.rootShadowMap || {}), ...localShadowMap };

        childArr.forEach(child => {
            if (child.getAttribute('lcdParts') === skipLcdParts) return;
            // mulShadow 自体はオブジェクト生成せずスキップ
            if (child.getAttribute('lcdParts') === 'mulShadow') return;

            // shadowId（カンマ区切り可）を effectiveShadowMap で解析して影リストを取得し、
            // activeShadows を一時的に上書きして子ツリーに伝播する
            const shadowIdAttr = child.getAttribute('shadowId');
            const localShadows = MulShadowUtil.resolveShadows(shadowIdAttr, effectiveShadowMap);
            const prevActiveShadows = this._ctx.activeShadows;
            if (localShadows.length > 0) this._ctx.activeShadows = localShadows;

            // lcdParts="group" かつ lcd-color が配列 かつ groupArea あり → 色ごとにコピーして展開
            if (child.getAttribute('lcdParts') === 'group') {
                const colorAttr = child.getAttribute('lcd-color');
                if (colorAttr) {
                    const colorVal = StaticObj._resolveLcdColor(colorAttr, drawParams);
                    if (Array.isArray(colorVal)) {
                        const hasArea = Array.from(child.children).some(
                            c => c.getAttribute && c.getAttribute('lcdParts') === 'groupArea'
                        );
                        if (hasArea) {
                            colorVal.forEach(color => {
                                const obj = this._createChildObj(child, drawParams, args, textDrawer, exprParser, color);
                                if (obj) children.push(obj);
                            });
                            if (localShadows.length > 0) this._ctx.activeShadows = prevActiveShadows;
                            return; // 通常処理をスキップ
                        }
                    }
                }
            }

            // lcd-arg="argName:drawParamsVarName" → コロン区切りで引数名と変数名を分離してコピー展開
            // コロンなしは無効として無視する
            const childLcdArg = child.getAttribute('lcd-arg');
            if (childLcdArg && childLcdArg.includes(':')) {
                const colonIdx       = childLcdArg.indexOf(':');
                const argName        = childLcdArg.slice(0, colonIdx).trim();
                const drawParamsVarName = childLcdArg.slice(colonIdx + 1).trim();
                // parentArgMap → $始まりならargs → それ以外はdrawParams の順で解決
                let argArray;
                if (parentArgMap[drawParamsVarName] !== undefined) {
                    argArray = parentArgMap[drawParamsVarName];
                } else if (drawParamsVarName.startsWith('$')) {
                    argArray = LcdPartsObj.resolveArgToken(drawParamsVarName, args);
                } else {
                    argArray = LcdPartsObj.resolveDrawParam(drawParamsVarName, drawParams);
                }
                if (argName && Array.isArray(argArray)) {
                    argArray.forEach(element => {
                        const childArgs = Object.assign({}, args, { [argName]: element });
                        // parentColorOverrideを渡して祖先からの色継承を維持する
                        const obj = this._createChildObj(child, drawParams, childArgs, textDrawer, exprParser, parentColorOverride);
                        if (obj) children.push(obj);
                    });
                    if (localShadows.length > 0) this._ctx.activeShadows = prevActiveShadows;
                    return; // 通常処理をスキップ
                }
            }

            // 通常の子要素（複製なし）
            // parentColorOverrideを渡して祖先からの色継承を維持する
            const obj = this._createChildObj(child, drawParams, args, textDrawer, exprParser, parentColorOverride);
            if (obj) children.push(obj);

            // activeShadow を元に戻す
            if (localShadows.length > 0) this._ctx.activeShadows = prevActiveShadows;
        });

        return children;
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
    // ctx: { resolveValue, exprParser } | null — ArrangeObj自身のvisible評価に使用
    // visible=false でも null を返さず visibility:hidden のノードを返す（アニメーション対応）
    getElement(ctx = null) {
        if (ctx) {
            // resolveValue/exprParserはdebugのみのctxでは渡されないため、undefinedの場合は上書きしない
            if (ctx.resolveValue !== undefined) this._resolveValue = ctx.resolveValue;
            if (ctx.exprParser   !== undefined) this._exprParser   = ctx.exprParser;
        }
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const outer  = document.createElementNS(SVG_NS, 'g');
        // filterはfilteredGに移すため outerには設定しない（lcd-noFilter子がfilterを回避できるようにする）

        // flexible=false かつ縮小スケールあり（レアケース）: (x,y)を中心にスケール
        // TextBoxObjと同様に translate を使わないことで、kuruアニメーションとCSSの競合を防ぐ
        if (this._uniformScale !== 1) {
            const s = this._uniformScale;
            outer.setAttribute('transform',
                `translate(${this.x * (1 - s)}, ${this.y * (1 - s)}) scale(${s})`);
        }
        // _uniformScale === 1 の場合はtransform不要（子要素が絶対座標で配置されるため）

        // 表示/非表示を visibility で制御する（display:noneではなくanimation対応のため）
        const isVisible   = this._evalVisible();
        this._prevVisible = isVisible;
        outer.style.visibility = isVisible ? '' : 'hidden';
        this._domEl = outer;

        // noFilterSinkを生成する（this._filterがある場合のみ）、filterなしの場合は既存sinkを引き継ぐ
        const { childCtx: sinkCtx, sink } = this._openSink(ctx);
        // filterがある場合は filteredG を生成し、noFilter要素はouterから外してfilterを回避する
        const filteredG    = this._createFilteredG();
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

        // デバッグフラグとnoFilterSinkを子要素に伝播するctx
        const childCtx = { debug: this._ctx.debug };
        if (sinkCtx && sinkCtx.noFilterSink) childCtx.noFilterSink = sinkCtx.noFilterSink;

        // arrangeDirection=1の場合は配置順を逆にする（サイズ計算は記述順のまま）
        const orderedChildren = this.arrangeDirection === 1 ? [...this.children].reverse() : this.children;

        orderedChildren.forEach(child => {
            const { width: cw, height: ch } = child.getRealSize();
            const childAxisSize  = isX ? cw : ch;
            const childCrossSize = isX ? ch : cw;
            const crossPos       = this._calcCrossPos(crossAvail, childCrossSize, child);

            // 最初の描画要素でなければ前にintervalを挿入
            const axisPos = firstRendered ? axisCursor : axisCursor + this.interval;
            // this.x/this.yを加算して絶対座標化（transformラッパーを使わないためkuruアニメーションと競合しない）
            const childX  = this.x + (isX ? axisPos  : crossPos);
            const childY  = this.y + (isX ? crossPos : axisPos);

            child.setCoordinate(childX, childY);
            const el = child.getElement(childCtx);

            if (el) {
                // 子要素を振り分け: noFilter+sink→sink、filter適用対象→filteredG、その他→outer
                this._placeChild(el, child, filteredG, outer, childCtx);
                // intervalは描画された要素の後ろに積算（次の要素の前に使う）
                axisCursor = axisPos + childAxisSize;
                firstRendered = false;
            }
            // 描画されなかった要素はaxisCursorもfirstRenderedも変更しない
        });

        // filteredGをouterの先頭に挿入し、sinkの要素（フィルター外配置）をouterに追加する
        this._finalizeFilterSplit(outer, filteredG);
        this._closeSink(sink, outer);

        // デバッグ: arrangeArea自身の境界矩形（青）を描画
        // 末端テキスト要素の境界矩形は各TextBoxObjのgetElement内で描画されるため、ここでは不要
        if (this._ctx.debug) {
            outer.appendChild(
                ArrangeObj._makeDebugRect(SVG_NS, this.x, this.y, this.width, this.height, '#4488ff', '8,4', 2)
            );
        }

        return this._wrapTransform(outer);
    }

    // visible を再評価してアニメーションを適用し、子要素へ伝播する
    langChange(transTime, gapTime) {
        this._applyVisibleAnim(transTime, gapTime);
        for (const child of this.children) {
            if (child.langChange) child.langChange(transTime, gapTime);
        }
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
