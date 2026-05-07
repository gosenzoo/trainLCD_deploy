// lcdParts="slot" に対応するオブジェクトクラス
// slotAreaで定義した領域をslotNum個のスロットに等分し、子要素をslotPoint番号の位置に配置する
class SlotObj extends LcdPartsObj {
    // ctx: { drawParams, args, textDrawer, numIconDrawer, exprParser, debug, defsEl, activeShadows, rootShadowMap }
    constructor(svgDom, ctx) {
        const { drawParams, args } = ctx;
        super(svgDom, drawParams, args);

        this._ctx        = ctx;
        this._drawParams = drawParams;
        this._args       = args;

        // axis属性: x(横/デフォルト) or y(縦)
        this.axis    = svgDom.getAttribute('axis') || 'x';
        // slotNum属性: ExprParser.evalNumberで評価する（数値リテラル・変数参照・四則演算に対応）
        const slotNumAttr = svgDom.getAttribute('slotNum');
        if (slotNumAttr !== null) {
            const resolveValue = LcdPartsObj.makeResolveValue(drawParams, args);
            const num = Math.round(ctx.exprParser.evalNumber(slotNumAttr, resolveValue));
            this.slotNum = (!isNaN(num) && num > 0) ? num : 1;
        } else {
            this.slotNum = 1;
        }

        // slotAreaのrectから領域サイズと初期位置を取得
        // （位置はsetCoordinateで上書きされることがあるが、幅・高さは不変）
        const areaRect = Array.from(svgDom.children).find(
            c => c.getAttribute && c.getAttribute('lcdParts') === 'slotArea'
        );
        if (areaRect) {
            this.x      = parseFloat(areaRect.getAttribute('x'))      || 0;
            this.y      = parseFloat(areaRect.getAttribute('y'))      || 0;
            this.width  = parseFloat(areaRect.getAttribute('width'))  || 0;
            this.height = parseFloat(areaRect.getAttribute('height')) || 0;
        }

        // 子要素を構築: { slotPoint: number, obj: LcdPartsObj } のリスト
        this._slotChildren = this._buildSlotChildren(svgDom);
    }

    // 子要素を構築してslotPointと共にリストを返す
    _buildSlotChildren(svgDom) {
        const { drawParams, args, textDrawer, exprParser } = this._ctx;
        const slotItems = [];

        const childArr = Array.from(svgDom.children).filter(c => c.getAttribute);
        const localShadowMap = MulShadowUtil.collectShadowMap(childArr);
        // ルートshadowMapとローカルshadowMapをマージ（ローカル優先）
        const effectiveShadowMap = { ...(this._ctx.rootShadowMap || {}), ...localShadowMap };

        // slotPoint属性を評価するヘルパー（数値リテラル・変数参照・四則演算に対応、整数に丸め）
        const evalSlotPoint = (attr, evalArgs) => {
            const resolveValue = LcdPartsObj.makeResolveValue(drawParams, evalArgs);
            const num = Math.round(exprParser.evalNumber(attr, resolveValue));
            return isNaN(num) ? NaN : num;
        };

        childArr.forEach(child => {
            if (child.getAttribute('lcdParts') === 'slotArea') return;
            if (child.getAttribute('lcdParts') === 'mulShadow') return;

            // slotPoint属性がない要素はスキップ
            const slotPointAttr = child.getAttribute('slotPoint');
            if (slotPointAttr === null) return;

            // shadowId処理（mulShadow乗算影の伝播）
            const shadowIdAttr      = child.getAttribute('shadowId');
            const localShadows      = MulShadowUtil.resolveShadows(shadowIdAttr, effectiveShadowMap);
            const prevActiveShadows = this._ctx.activeShadows;
            if (localShadows.length > 0) this._ctx.activeShadows = localShadows;

            // group lcd-color配列展開: 現在のargsでslotPointを評価し、色ごとにコピーして追加
            if (child.getAttribute('lcdParts') === 'group') {
                const colorAttr = child.getAttribute('lcd-color');
                if (colorAttr) {
                    const colorVal = StaticObj._resolveLcdColor(colorAttr, drawParams);
                    if (Array.isArray(colorVal)) {
                        const hasArea = Array.from(child.children).some(
                            c => c.getAttribute && c.getAttribute('lcdParts') === 'groupArea'
                        );
                        if (hasArea) {
                            const slotPoint = evalSlotPoint(slotPointAttr, args);
                            if (!isNaN(slotPoint)) {
                                colorVal.forEach(color => {
                                    const obj = this._createChildObj(child, drawParams, args, textDrawer, exprParser, color);
                                    if (obj) slotItems.push({ slotPoint, obj });
                                });
                            }
                            if (localShadows.length > 0) this._ctx.activeShadows = prevActiveShadows;
                            return;
                        }
                    }
                }
            }

            // lcd-arg展開: 展開後のchildArgsでslotPointを再評価する（$argName参照に対応）
            const childLcdArg = child.getAttribute('lcd-arg');
            if (childLcdArg && childLcdArg.includes(':')) {
                const colonIdx          = childLcdArg.indexOf(':');
                const argName           = childLcdArg.slice(0, colonIdx).trim();
                const drawParamsVarName = childLcdArg.slice(colonIdx + 1).trim();
                let argArray;
                if (drawParamsVarName.startsWith('$')) {
                    argArray = LcdPartsObj.resolveArgToken(drawParamsVarName, args);
                } else {
                    argArray = LcdPartsObj.resolveDrawParam(drawParamsVarName, drawParams);
                }
                if (argName && Array.isArray(argArray)) {
                    argArray.forEach(element => {
                        const childArgs = Object.assign({}, args, { [argName]: element });
                        // childArgsでslotPointを再評価して$argName参照を解決する
                        const slotPoint = evalSlotPoint(slotPointAttr, childArgs);
                        if (isNaN(slotPoint)) return;
                        const obj = this._createChildObj(child, drawParams, childArgs, textDrawer, exprParser);
                        if (obj) slotItems.push({ slotPoint, obj });
                    });
                    if (localShadows.length > 0) this._ctx.activeShadows = prevActiveShadows;
                    return;
                }
            }

            // 通常の子要素: 現在のargsでslotPointを評価
            const slotPoint = evalSlotPoint(slotPointAttr, args);
            if (!isNaN(slotPoint)) {
                const obj = this._createChildObj(child, drawParams, args, textDrawer, exprParser);
                if (obj) slotItems.push({ slotPoint, obj });
            }

            if (localShadows.length > 0) this._ctx.activeShadows = prevActiveShadows;
        });

        return slotItems;
    }

    // 子要素のlcdPartsに応じてオブジェクトを生成する（ArrangeObj._createChildObjと同一ロジック）
    _createChildObj(svgDom, drawParams, args, textDrawer, exprParser, colorOverride = null) {
        const isDrawAttr = svgDom.getAttribute('isDraw');
        if (isDrawAttr !== null) {
            const resolveValue = LcdPartsObj.makeResolveValue(drawParams, args);
            if (!exprParser.eval(isDrawAttr, resolveValue)) return null;
        }

        const lcdParts = svgDom.getAttribute('lcdParts');
        const childCtx = { ...this._ctx, drawParams, args };

        let obj;
        if (lcdParts === 'arrange') {
            obj = new ArrangeObj(svgDom, childCtx);
            obj.setSize(obj.width, obj.height);
        } else if (lcdParts === 'slot') {
            obj = new SlotObj(svgDom, childCtx);
        } else if (lcdParts === 'textBox') {
            obj = new TextBoxObj(svgDom, drawParams, args, textDrawer);
        } else if (lcdParts === 'numbering') {
            obj = new NumIconObj(svgDom, drawParams, args, this._ctx.numIconDrawer);
        } else if (lcdParts === 'static') {
            obj = new StaticObj(svgDom, drawParams, colorOverride, args);
            const { activeShadows, defsEl } = this._ctx;
            if (activeShadows && activeShadows.length > 0 && defsEl) {
                MulShadowUtil.applyMulShadow(obj._node, activeShadows, defsEl);
            }
        } else if (lcdParts === 'group') {
            const groupObj = new GroupObj(svgDom);
            let effectiveColor = colorOverride;
            if (effectiveColor === null) {
                const lcdColorAttr = svgDom.getAttribute('lcd-color');
                if (lcdColorAttr) {
                    const resolved = StaticObj._resolveLcdColor(lcdColorAttr, drawParams, args);
                    effectiveColor = Array.isArray(resolved) ? (resolved[0] || null) : (resolved || null);
                }
            }
            let domForChildren = svgDom;
            if (effectiveColor !== null) {
                domForChildren = svgDom.cloneNode(true);
                StaticObj._applyColorToDOM(domForChildren, effectiveColor, drawParams, args);
            }
            for (const node of this._buildContainerChildren(domForChildren, drawParams, args, 'groupArea', {})) {
                groupObj.addChild(node);
            }
            obj = groupObj;
        }
        if (!obj) return null;

        obj._resolveValue = LcdPartsObj.makeResolveValue(drawParams, args);
        obj._exprParser   = exprParser;
        obj._prevVisible  = obj._evalVisible();
        return obj;
    }

    // groupの子要素ビルドに使用するコンテナ共通ロジック（ArrangeObj._buildContainerChildrenと同一）
    _buildContainerChildren(svgDom, drawParams, args, skipLcdParts, parentArgMap = {}) {
        const { textDrawer, exprParser } = this._ctx;
        const children = [];

        const childArr = Array.from(svgDom.children).filter(c => c.getAttribute);
        const localShadowMap = MulShadowUtil.collectShadowMap(childArr);
        const effectiveShadowMap = { ...(this._ctx.rootShadowMap || {}), ...localShadowMap };

        childArr.forEach(child => {
            if (child.getAttribute('lcdParts') === skipLcdParts) return;
            if (child.getAttribute('lcdParts') === 'mulShadow') return;

            const shadowIdAttr    = child.getAttribute('shadowId');
            const localShadows    = MulShadowUtil.resolveShadows(shadowIdAttr, effectiveShadowMap);
            const prevActiveShadows = this._ctx.activeShadows;
            if (localShadows.length > 0) this._ctx.activeShadows = localShadows;

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
                            return;
                        }
                    }
                }
            }

            const childLcdArg = child.getAttribute('lcd-arg');
            if (childLcdArg && childLcdArg.includes(':')) {
                const colonIdx          = childLcdArg.indexOf(':');
                const argName           = childLcdArg.slice(0, colonIdx).trim();
                const drawParamsVarName = childLcdArg.slice(colonIdx + 1).trim();
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
                        const obj = this._createChildObj(child, drawParams, childArgs, textDrawer, exprParser);
                        if (obj) children.push(obj);
                    });
                    if (localShadows.length > 0) this._ctx.activeShadows = prevActiveShadows;
                    return;
                }
            }

            const obj = this._createChildObj(child, drawParams, args, textDrawer, exprParser);
            if (obj) children.push(obj);

            if (localShadows.length > 0) this._ctx.activeShadows = prevActiveShadows;
        });

        return children;
    }

    getRealSize() {
        // slotAreaのサイズをそのまま返す（setCoordinateで位置が変わっても不変）
        return { width: this.width, height: this.height };
    }

    setSize(width, height) {
        // SlotObjはサイズ圧縮を行わない（スロット配置は固定サイズ）
        return { width: this.width, height: this.height };
    }

    // 子要素をスロット位置に配置してSVG<g>を返す
    getElement(ctx = null) {
        if (ctx) {
            if (ctx.resolveValue !== undefined) this._resolveValue = ctx.resolveValue;
            if (ctx.exprParser   !== undefined) this._exprParser   = ctx.exprParser;
        }
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const outer  = document.createElementNS(SVG_NS, 'g');

        const isVisible   = this._evalVisible();
        this._prevVisible = isVisible;
        outer.style.visibility = isVisible ? '' : 'hidden';
        this._domEl = outer;

        const isX = this.axis === 'x';

        // スロット座標をgetElement時に都度計算する（setCoordinateで位置が更新された場合に対応）
        const S = isX ? this.x : this.y;
        const L = isX ? this.width : this.height;
        const N = this.slotNum;
        const slotPositions = N <= 0 ? [] : N === 1
            ? [S + L / 2]
            : Array.from({ length: N }, (_, i) => S + (i / (N - 1)) * L);

        const childCtx = { debug: this._ctx.debug };

        this._slotChildren.forEach(({ slotPoint, obj }) => {
            if (slotPoint < 0 || slotPoint >= slotPositions.length) return;

            // getRealSizeが非ゼロのオブジェクトのみ配置する
            const { width: cw, height: ch } = obj.getRealSize();
            if (cw === 0 && ch === 0) return;

            const slotCoord     = slotPositions[slotPoint];
            const childAxisSize  = isX ? cw : ch;
            const childCrossSize = isX ? ch : cw;

            // 主軸: 子要素の中心 = スロット座標
            const axisPos = slotCoord - childAxisSize / 2;
            // 交差軸: slotAreaの交差軸中心 - 子要素サイズ/2
            const crossStart  = isX ? this.y : this.x;
            const crossLength = isX ? this.height : this.width;
            const crossPos    = crossStart + (crossLength - childCrossSize) / 2;

            const childX = isX ? axisPos  : crossPos;
            const childY = isX ? crossPos : axisPos;

            obj.setCoordinate(childX, childY);
            const el = obj.getElement(childCtx);
            if (el) outer.appendChild(el);
        });

        // デバッグ: slotArea境界矩形（緑）を描画
        if (this._ctx.debug) {
            outer.appendChild(
                ArrangeObj._makeDebugRect(SVG_NS, this.x, this.y, this.width, this.height, '#44ff88', '8,4', 2)
            );
        }

        return outer;
    }

    // visible を再評価してアニメーションを適用し、子要素へ伝播する
    langChange(transTime, gapTime) {
        this._applyVisibleAnim(transTime, gapTime);
        for (const { obj } of this._slotChildren) {
            if (obj.langChange) obj.langChange(transTime, gapTime);
        }
    }
}
