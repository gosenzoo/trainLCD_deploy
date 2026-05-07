// lcdParts="mulShadow" のグラデーション乗算影処理ユーティリティ
// 影rectのグラデーションを絶対座標に変換し、対象shape要素のfillに乗算結果を適用する
class MulShadowUtil {

    // CSSカラー文字列をRGB成分 {r,g,b}(0-255) に変換する。対応外の形式はnullを返す。
    static parseColorToRGB(color) {
        if (!color) return null;
        const c = color.trim();
        // #RRGGBB
        let m = c.match(/^#([0-9a-f]{6})$/i);
        if (m) {
            return {
                r: parseInt(m[1].slice(0, 2), 16),
                g: parseInt(m[1].slice(2, 4), 16),
                b: parseInt(m[1].slice(4, 6), 16),
            };
        }
        // #RGB
        m = c.match(/^#([0-9a-f]{3})$/i);
        if (m) {
            return {
                r: parseInt(m[1][0] + m[1][0], 16),
                g: parseInt(m[1][1] + m[1][1], 16),
                b: parseInt(m[1][2] + m[1][2], 16),
            };
        }
        // rgb() / rgba()
        m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (m) {
            return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
        }
        return null;
    }

    // objectBoundingBox座標値（小数 or "50%" 形式）を0-1の小数に変換する
    static parseOBBCoord(val) {
        if (val === null || val === undefined) return 0;
        const s = String(val).trim();
        if (s.endsWith('%')) return parseFloat(s) / 100;
        return parseFloat(s) || 0;
    }

    // グラデーションの stops 配列を t(0-1) で補間して { color, opacity } を返す
    // t が範囲外の場合は端のstopを返す
    static _interpolateGradient(stops, t) {
        if (stops.length === 0) return { color: null, opacity: 1 };
        if (t <= stops[0].offset) return { color: stops[0].color, opacity: stops[0].opacity };
        const last = stops[stops.length - 1];
        if (t >= last.offset) return { color: last.color, opacity: last.opacity };

        for (let i = 0; i < stops.length - 1; i++) {
            const a = stops[i], b = stops[i + 1];
            if (a.offset <= t && t <= b.offset) {
                if (a.offset === b.offset) return { color: a.color, opacity: a.opacity };
                const f = (t - a.offset) / (b.offset - a.offset);
                return {
                    color: {
                        r: Math.round(a.color.r + (b.color.r - a.color.r) * f),
                        g: Math.round(a.color.g + (b.color.g - a.color.g) * f),
                        b: Math.round(a.color.b + (b.color.b - a.color.b) * f),
                    },
                    opacity: a.opacity + (b.opacity - a.opacity) * f,
                };
            }
        }
        return { color: last.color, opacity: last.opacity };
    }

    // shape要素の fill に複数の shadow を逐次乗算した統合グラデーションを適用する
    // shadowList: shadow情報の配列 [{ fillAttr, rx, ry, rw, rh }, ...]
    // 先頭グラデーションの軸を出力グラデーションの座標系として使用する。
    // 異なる軸のグラデーションは先頭軸への射影で t 値を変換して合成する。
    static multiplyShapeFillMulti(shapeEl, shadowList, defsEl) {
        const fillAttr = shapeEl.getAttribute('fill');
        if (!fillAttr) return;
        const cb = MulShadowUtil.parseColorToRGB(fillAttr);
        if (!cb) return;

        // 各影のグラデーション情報（絶対座標 + stops）を収集する
        const gradInfos = [];
        for (const shadow of shadowList) {
            const gradIdMatch = shadow.fillAttr.match(/url\(#([^)]+)\)/);
            if (!gradIdMatch) continue;
            const gradElem = defsEl.querySelector('#' + CSS.escape(gradIdMatch[1]));
            if (!gradElem) continue;

            const { rx, ry, rw, rh } = shadow;
            const absX1 = rx + MulShadowUtil.parseOBBCoord(gradElem.getAttribute('x1')) * rw;
            const absY1 = ry + MulShadowUtil.parseOBBCoord(gradElem.getAttribute('y1')) * rh;
            const absX2 = rx + MulShadowUtil.parseOBBCoord(gradElem.getAttribute('x2')) * rw;
            const absY2 = ry + MulShadowUtil.parseOBBCoord(gradElem.getAttribute('y2')) * rh;

            const stops = [];
            for (const stop of gradElem.querySelectorAll('stop')) {
                const color = MulShadowUtil.parseColorToRGB(stop.getAttribute('stop-color') || '#000000');
                const opacity = parseFloat(stop.getAttribute('stop-opacity') ?? '1');
                const offset  = MulShadowUtil.parseOBBCoord(stop.getAttribute('offset'));
                if (color && !isNaN(opacity)) stops.push({ offset, color, opacity });
            }
            if (stops.length > 0) gradInfos.push({ absX1, absY1, absX2, absY2, stops });
        }
        if (gradInfos.length === 0) return;

        // 先頭グラデーションの軸ベクトルを基準として使用する
        const base   = gradInfos[0];
        const baseDx = base.absX2 - base.absX1;
        const baseDy = base.absY2 - base.absY1;
        const baseLenSq = baseDx * baseDx + baseDy * baseDy;

        // 各グラデーションの stop 絶対位置を基準軸上の t 値に射影してマージする
        const allOffsets = new Set();
        gradInfos.forEach((g, gi) => {
            const dx = g.absX2 - g.absX1, dy = g.absY2 - g.absY1;
            g.stops.forEach(s => {
                if (gi === 0) {
                    allOffsets.add(s.offset);
                } else {
                    // stop の絶対位置を基準軸に射影して t 値を求める
                    const ax = g.absX1 + s.offset * dx;
                    const ay = g.absY1 + s.offset * dy;
                    const t  = baseLenSq > 0
                        ? ((ax - base.absX1) * baseDx + (ay - base.absY1) * baseDy) / baseLenSq
                        : 0;
                    allOffsets.add(Math.max(0, Math.min(1, t)));
                }
            });
        });
        const sortedOffsets = [...allOffsets].sort((a, b) => a - b);

        // 各 offset で全影を逐次乗算した合成色を計算する
        // CSS multiply + source-over (αb=1): result = Cb × (αs × Cs + (1 - αs))
        const combinedStops = sortedOffsets.map(baseT => {
            let r = cb.r, g = cb.g, b = cb.b;
            gradInfos.forEach((gradInfo, gi) => {
                // 基準軸上の t を各グラデーション固有の t2 に変換する
                let t2;
                if (gi === 0) {
                    t2 = baseT;
                } else {
                    const ax    = base.absX1 + baseT * baseDx;
                    const ay    = base.absY1 + baseT * baseDy;
                    const gDx   = gradInfo.absX2 - gradInfo.absX1;
                    const gDy   = gradInfo.absY2 - gradInfo.absY1;
                    const gLenSq = gDx * gDx + gDy * gDy;
                    t2 = gLenSq > 0
                        ? ((ax - gradInfo.absX1) * gDx + (ay - gradInfo.absY1) * gDy) / gLenSq
                        : 0;
                    t2 = Math.max(0, Math.min(1, t2));
                }
                const { color: cs, opacity: alphaS } = MulShadowUtil._interpolateGradient(gradInfo.stops, t2);
                if (!cs) return;
                r = Math.min(255, Math.round(r * (alphaS * cs.r / 255 + (1 - alphaS))));
                g = Math.min(255, Math.round(g * (alphaS * cs.g / 255 + (1 - alphaS))));
                b = Math.min(255, Math.round(b * (alphaS * cs.b / 255 + (1 - alphaS))));
            });
            return { offset: baseT, r, g, b };
        });

        // 統合 linearGradient を defs に挿入してシェイプの fill に設定する
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const newGrad = document.createElementNS(SVG_NS, 'linearGradient');
        const newId   = `_mulShadow_${MulShadowUtil._counter++}`;
        newGrad.setAttribute('id', newId);
        newGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
        newGrad.setAttribute('x1', base.absX1);
        newGrad.setAttribute('y1', base.absY1);
        newGrad.setAttribute('x2', base.absX2);
        newGrad.setAttribute('y2', base.absY2);
        combinedStops.forEach(s => {
            const stop = document.createElementNS(SVG_NS, 'stop');
            stop.setAttribute('offset', s.offset);
            stop.setAttribute('stop-color', `rgb(${s.r},${s.g},${s.b})`);
            stop.setAttribute('stop-opacity', '1');
            newGrad.appendChild(stop);
        });
        defsEl.appendChild(newGrad);
        shapeEl.setAttribute('fill', `url(#${newId})`);
    }

    // el（shape または コンテナ）配下の全 shape 要素に shadows（配列）の統合乗算を再帰適用する
    static applyMulShadow(el, shadows, defsEl) {
        const SHAPE_TAGS = new Set(['rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'path']);
        const walk = (node) => {
            if (SHAPE_TAGS.has(node.tagName ? node.tagName.toLowerCase() : '')) {
                MulShadowUtil.multiplyShapeFillMulti(node, shadows, defsEl);
            }
            for (const child of node.children) walk(child);
        };
        walk(el);
    }

    // childArr から lcdParts="mulShadow" 要素を収集して shadowId → shadow情報 のマップを返す
    // shadow情報: { fillAttr, rx, ry, rw, rh }
    static collectShadowMap(childArr) {
        const map = {};
        childArr.forEach(child => {
            if (!child.getAttribute || child.getAttribute('lcdParts') !== 'mulShadow') return;
            const shadowId = child.getAttribute('shadowId');
            const fillAttr = child.getAttribute('fill');
            const rx = parseFloat(child.getAttribute('x'))      || 0;
            const ry = parseFloat(child.getAttribute('y'))      || 0;
            const rw = parseFloat(child.getAttribute('width'))  || 0;
            const rh = parseFloat(child.getAttribute('height')) || 0;
            if (shadowId && fillAttr) map[shadowId] = { fillAttr, rx, ry, rw, rh };
        });
        return map;
    }

    // shadowId属性（カンマ区切り可）を解析して、shadowMap に一致する shadow 情報の配列を返す
    static resolveShadows(shadowIdAttr, shadowMap) {
        if (!shadowIdAttr || !shadowMap) return [];
        return shadowIdAttr.split(',')
            .map(s => s.trim())
            .filter(s => s && shadowMap[s])
            .map(s => shadowMap[s]);
    }
}

// 動的生成 linearGradient の ID 採番用カウンタ
MulShadowUtil._counter = 0;
