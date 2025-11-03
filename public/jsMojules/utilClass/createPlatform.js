function createPlatform(params) {
  const {
    width, depth,
    vanishX, vanishY,
    foothHeight,
    outlineWidth,
    yellowWidth, yellowOffset, yellowDashLength, // 未描画
    baseShadowHeight, baseBodyHeight, baseBlurLength, baseOffset,
    anchorX, anchorY,
    referencePos, // "front" or "back"
    colors,       // { topFill, frontFill, outline, baseBody, baseShadow, yellow }

    // オプション
    hideTop = false,
    hideBottom = false,
    platformEdgeFadeLen = 0,
    platformEdgeFadeStart = 0,
    outlineFadeLen = 0,
    outlineFadeStart = 0
  } = params;

  const SVG_NS = "http://www.w3.org/2000/svg";

  const vanish = { x: vanishX, y: vanishY };
  const towardByDeltaY = (p, v, dyAbs) => {
    const dx = v.x - p.x, dy = v.y - p.y;
    const t = Math.abs(dy) < 1e-6 ? (dyAbs / 1e-6) : (dyAbs / Math.abs(dy));
    return { x: p.x + dx * t, y: p.y + dy * t };
  };
  const awayByDeltaY = (p, v, dyAbs) => {
    const dx = v.x - p.x, dy = v.y - p.y;
    const t = Math.abs(dy) < 1e-6 ? (dyAbs / 1e-6) : (dyAbs / Math.abs(dy));
    return { x: p.x - dx * t, y: p.y - dy * t };
  };

  // 台形の4点（A:下底左, B:下底右, C:上右, D:上左）
  let A, B, C, D;
  if (referencePos === "front") {
    const yBottom = -foothHeight;
    const LB = { x: 0,     y: yBottom };
    const RB = { x: width, y: yBottom };
    const LT = towardByDeltaY(LB, vanish, depth);
    const RT = towardByDeltaY(RB, vanish, depth);
    A = LB; B = RB; C = RT; D = LT;
  } else { // "back"
    const yTop = -(foothHeight + depth);
    const LT = { x: 0,     y: yTop };
    const RT = { x: width, y: yTop };
    const LB = awayByDeltaY(LT, vanish, depth);
    const RB = awayByDeltaY(RT, vanish, depth);
    A = LB; B = RB; C = RT; D = LT;
  }

  const frontRect = { x: A.x, y: -foothHeight, width: (B.x - A.x), height: foothHeight };
  const yTopEdge = D.y;
  const yBottomEdge = A.y;

  const gRoot = document.createElementNS(SVG_NS, 'g');

  // ---- defs ----
  const defs = document.createElementNS(SVG_NS, 'defs');

  // 台座グラデ（上=1, 下=0）
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  const gradId = `grad-base-body-${Math.random().toString(36).slice(2)}`;
  grad.setAttribute('id', gradId);
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', '0'); grad.setAttribute('x2', '0');

  const stopTop = document.createElementNS(SVG_NS, 'stop');
  stopTop.setAttribute('offset', '0%');
  stopTop.setAttribute('stop-color', colors.baseBody);
  stopTop.setAttribute('stop-opacity', '1');

  const stopStart = document.createElementNS(SVG_NS, 'stop');
  stopStart.setAttribute('stop-color', colors.baseBody);
  stopStart.setAttribute('stop-opacity', '1');

  const stopBottom = document.createElementNS(SVG_NS, 'stop');
  stopBottom.setAttribute('offset', '100%');
  stopBottom.setAttribute('stop-color', colors.baseBody);
  stopBottom.setAttribute('stop-opacity', '0');

  grad.appendChild(stopTop);
  grad.appendChild(stopStart);
  grad.appendChild(stopBottom);
  defs.appendChild(grad);

  // フェード用マスク
  function makeVerticalMask(idBase, edge, start, len, hideUpper) {
    const mask = document.createElementNS(SVG_NS, 'mask');
    const maskId = `${idBase}-${Math.random().toString(36).slice(2)}`;
    mask.setAttribute('id', maskId);

    const lg = document.createElementNS(SVG_NS, 'linearGradient');
    const lgId = `${maskId}-lg`;
    lg.setAttribute('id', lgId);
    lg.setAttribute('gradientUnits', 'userSpaceOnUse');
    lg.setAttribute('x1', '0'); lg.setAttribute('x2', '0');

    const minX = Math.min(A.x, B.x, C.x, D.x);
    const maxX = Math.max(A.x, B.x, C.x, D.x);
    const minY = Math.min(yTopEdge, yBottomEdge);
    const maxY = Math.max(yTopEdge, yBottomEdge);
    const pad = 100;

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(minX - pad));
    rect.setAttribute('y', String(minY - pad));
    rect.setAttribute('width', String((maxX - minX) + pad * 2));
    rect.setAttribute('height', String((maxY - minY) + pad * 2));
    rect.setAttribute('fill', `url(#${lgId})`);

    if (hideUpper) {
      const y1 = edge;
      const y2 = edge + Math.max(0, start + len);
      lg.setAttribute('y1', String(y1));
      lg.setAttribute('y2', String(y2));

      const s0 = document.createElementNS(SVG_NS, 'stop');
      s0.setAttribute('offset', '0%'); s0.setAttribute('stop-color', '#fff'); s0.setAttribute('stop-opacity', '0');

      const total = Math.max(1e-6, (y2 - y1));
      const off1 = (start / total) * 100;
      const s1 = document.createElementNS(SVG_NS, 'stop');
      s1.setAttribute('offset', `${Math.max(0, Math.min(100, off1))}%`);
      s1.setAttribute('stop-color', '#fff'); s1.setAttribute('stop-opacity', '0');

      const s2 = document.createElementNS(SVG_NS, 'stop');
      s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#fff'); s2.setAttribute('stop-opacity', '1');

      lg.appendChild(s0); lg.appendChild(s1); lg.appendChild(s2);
    } else {
      const y2 = edge;
      const y1 = edge - Math.max(0, start + len);
      lg.setAttribute('y1', String(y1));
      lg.setAttribute('y2', String(y2));

      const total = Math.max(1e-6, (y2 - y1));
      const offKeep1 = ((y2 - (start + len) - y1) / total) * 100;
      const offKeep2 = ((y2 - start - y1) / total) * 100;

      const s0 = document.createElementNS(SVG_NS, 'stop');
      s0.setAttribute('offset', '0%'); s0.setAttribute('stop-color', '#fff'); s0.setAttribute('stop-opacity', '1');

      const s1 = document.createElementNS(SVG_NS, 'stop');
      s1.setAttribute('offset', `${Math.max(0, Math.min(100, offKeep1))}%`);
      s1.setAttribute('stop-color', '#fff'); s1.setAttribute('stop-opacity', '1');

      const s2 = document.createElementNS(SVG_NS, 'stop');
      s2.setAttribute('offset', `${Math.max(0, Math.min(100, offKeep2))}%`);
      s2.setAttribute('stop-color', '#fff'); s2.setAttribute('stop-opacity', '0');

      const s3 = document.createElementNS(SVG_NS, 'stop');
      s3.setAttribute('offset', '100%'); s3.setAttribute('stop-color', '#fff'); s3.setAttribute('stop-opacity', '0');

      lg.appendChild(s0); lg.appendChild(s1); lg.appendChild(s2); lg.appendChild(s3);
    }

    defs.appendChild(lg);
    mask.appendChild(rect);
    defs.appendChild(mask);
    return `url(#${maskId})`;
  }

  // ---- 台座（背面）----
  const gBase = document.createElementNS(SVG_NS, 'g');

  const baseBodyRect = {
    x: A.x + baseOffset,
    y: 0,
    width: Math.max(0, (B.x - A.x) - baseOffset * 2),
    height: baseBodyHeight
  };

  {
    const y1 = baseBodyRect.y;
    const y2 = baseBodyRect.y + baseBodyRect.height;
    const blurStartY = Math.max(y1, y2 - baseBlurLength);
    const blurStartRatio = (blurStartY - y1) / (y2 - y1);
    grad.setAttribute('y1', String(y1));
    grad.setAttribute('y2', String(y2));
    stopStart.setAttribute('offset', `${Math.max(0, Math.min(1, blurStartRatio)) * 100}%`);
  }

  if (!hideBottom) {
    const baseBody = document.createElementNS(SVG_NS, 'rect');
    baseBody.setAttribute('x', baseBodyRect.x);
    baseBody.setAttribute('y', baseBodyRect.y);
    baseBody.setAttribute('width', baseBodyRect.width);
    baseBody.setAttribute('height', baseBodyRect.height);
    baseBody.setAttribute('fill', `url(#${gradId})`);
    gBase.appendChild(baseBody);

    const baseShadow = document.createElementNS(SVG_NS, 'rect');
    baseShadow.setAttribute('x', baseBodyRect.x);
    baseShadow.setAttribute('y', baseBodyRect.y);
    baseShadow.setAttribute('width', baseBodyRect.width);
    baseShadow.setAttribute('height', baseShadowHeight);
    baseShadow.setAttribute('fill', colors.baseShadow);
    gBase.appendChild(baseShadow);
  }

  // ---- 足場（前面）----
  const gFooth = document.createElementNS(SVG_NS, 'g');

  // 上面（台形）
  const topPath = document.createElementNS(SVG_NS, 'path');
  topPath.setAttribute('d', `M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} L ${D.x} ${D.y} Z`);
  topPath.setAttribute('fill', colors.topFill);

  if (hideTop && (platformEdgeFadeLen > 0)) {
    const maskUrl = makeVerticalMask('mask-platform-top', yTopEdge, platformEdgeFadeStart, platformEdgeFadeLen, true);
    topPath.setAttribute('mask', maskUrl);
  } else if (hideBottom && (platformEdgeFadeLen > 0)) {
    const maskUrl = makeVerticalMask('mask-platform-bottom', yBottomEdge, platformEdgeFadeStart, platformEdgeFadeLen, false);
    topPath.setAttribute('mask', maskUrl);
  }
  gFooth.appendChild(topPath);

  // 「下端を表示しない」→ 足場前面は描かない
  if (!hideBottom) {
    const front = document.createElementNS(SVG_NS, 'rect');
    front.setAttribute('x', frontRect.x);
    front.setAttribute('y', frontRect.y);
    front.setAttribute('width', frontRect.width);
    front.setAttribute('height', frontRect.height);
    front.setAttribute('fill', colors.frontFill);
    gFooth.appendChild(front);
  }

  // ---- 外枠 ----
  const gOutline = document.createElementNS(SVG_NS, 'g');

  // 上面の外周（A→Bは描かない）
  const outlineTop_1 = document.createElementNS(SVG_NS, 'path');
  outlineTop_1.setAttribute('fill', 'none');
  outlineTop_1.setAttribute('stroke', colors.outline);
  outlineTop_1.setAttribute('stroke-width', outlineWidth);
  outlineTop_1.setAttribute('stroke-linejoin', 'round');

  let outlineTop_2 = null;
  if (!hideTop) {
    outlineTop_1.setAttribute('d', `M ${B.x} ${B.y} L ${C.x} ${C.y} L ${D.x} ${D.y} L ${A.x} ${A.y}`);
  } else {
    outlineTop_1.setAttribute('d', `M ${B.x} ${B.y} L ${C.x} ${C.y}`);
    outlineTop_2 = document.createElementNS(SVG_NS, 'path');
    outlineTop_2.setAttribute('d', `M ${D.x} ${D.y} L ${A.x} ${A.y}`);
    outlineTop_2.setAttribute('fill', 'none');
    outlineTop_2.setAttribute('stroke', colors.outline);
    outlineTop_2.setAttribute('stroke-width', outlineWidth);
    outlineTop_2.setAttribute('stroke-linejoin', 'round');
  }

  // 前面の外枠（hideBottom の時は描かない）
  let outlineFrontLeft = null, outlineFrontRight = null, outlineFrontBottom = null;
  if (!hideBottom) {
    const pFLU = { x: frontRect.x,                   y: frontRect.y };
    const pFRU = { x: frontRect.x + frontRect.width, y: frontRect.y };
    const pFLB = { x: frontRect.x,                   y: frontRect.y + frontRect.height };
    const pFRB = { x: frontRect.x + frontRect.width, y: frontRect.y + frontRect.height };

    outlineFrontLeft = document.createElementNS(SVG_NS, 'path');
    outlineFrontLeft.setAttribute('d', `M ${pFLU.x} ${pFLU.y} L ${pFLB.x} ${pFLB.y}`);
    outlineFrontLeft.setAttribute('fill', 'none');
    outlineFrontLeft.setAttribute('stroke', colors.outline);
    outlineFrontLeft.setAttribute('stroke-width', outlineWidth);
    outlineFrontLeft.setAttribute('stroke-linejoin', 'round');

    outlineFrontRight = document.createElementNS(SVG_NS, 'path');
    outlineFrontRight.setAttribute('d', `M ${pFRB.x} ${pFRB.y} L ${pFRU.x} ${pFRU.y}`);
    outlineFrontRight.setAttribute('fill', 'none');
    outlineFrontRight.setAttribute('stroke', colors.outline);
    outlineFrontRight.setAttribute('stroke-width', outlineWidth);
    outlineFrontRight.setAttribute('stroke-linejoin', 'round');

    outlineFrontBottom = document.createElementNS(SVG_NS, 'path');
    outlineFrontBottom.setAttribute('d', `M ${pFLB.x} ${pFLB.y} L ${pFRB.x} ${pFRB.y}`);
    outlineFrontBottom.setAttribute('fill', 'none');
    outlineFrontBottom.setAttribute('stroke', colors.outline);
    outlineFrontBottom.setAttribute('stroke-width', outlineWidth);
  }

  // 外枠フェード（★hideTop時は前面下辺・左右縦線にはマスク適用しない＝常に表示）
  const needsOutlineMask = (outlineFadeLen > 0) && (hideTop || hideBottom);
  if (needsOutlineMask) {
    const maskUrl = hideTop
      ? makeVerticalMask('mask-outline-top', yTopEdge, outlineFadeStart, outlineFadeLen, true)
      : makeVerticalMask('mask-outline-bottom', yBottomEdge, outlineFadeStart, outlineFadeLen, false);

    // 上面側の線にのみ適用
    outlineTop_1.setAttribute('mask', maskUrl);
    if (outlineTop_2) outlineTop_2.setAttribute('mask', maskUrl);

    // hideBottom の場合は前面枠を描いていないのでここは何もしない。
    // hideTop の場合は前面左右・下辺を常時表示したいのでマスクは適用しない。
  }

  gOutline.appendChild(outlineTop_1);
  if (outlineTop_2) gOutline.appendChild(outlineTop_2);
  if (outlineFrontLeft)  gOutline.appendChild(outlineFrontLeft);
  if (outlineFrontBottom) gOutline.appendChild(outlineFrontBottom);
  if (outlineFrontRight) gOutline.appendChild(outlineFrontRight);

  // ---- レイヤー順 ----
  gRoot.appendChild(defs);
  gRoot.appendChild(gBase);
  gRoot.appendChild(gFooth);
  gRoot.appendChild(gOutline);

  // アンカー移動（足場前面の下底左端）
  const pFLB = { x: frontRect.x, y: frontRect.y + frontRect.height };
  const tx = anchorX - pFLB.x;
  const ty = anchorY - pFLB.y;
  gRoot.setAttribute('transform', `translate(${tx}, ${ty})`);

  return gRoot;
}