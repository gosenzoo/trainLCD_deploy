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
  const EPS = 1e-3;

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
  const gradBase = document.createElementNS(SVG_NS, 'linearGradient');
  const gradBaseId = `grad-base-body-${Math.random().toString(36).slice(2)}`;
  gradBase.setAttribute('id', gradBaseId);
  gradBase.setAttribute('gradientUnits', 'userSpaceOnUse');
  gradBase.setAttribute('x1', '0'); gradBase.setAttribute('x2', '0');
  defs.appendChild(gradBase);

  // stopは後で座標決定後にセット
  const stopBaseTop = document.createElementNS(SVG_NS, 'stop');
  stopBaseTop.setAttribute('offset', '0%');
  stopBaseTop.setAttribute('stop-color', colors.baseBody);
  stopBaseTop.setAttribute('stop-opacity', '1');
  const stopBaseKeep = document.createElementNS(SVG_NS, 'stop');
  stopBaseKeep.setAttribute('stop-color', colors.baseBody);
  stopBaseKeep.setAttribute('stop-opacity', '1');
  const stopBaseBottom = document.createElementNS(SVG_NS, 'stop');
  stopBaseBottom.setAttribute('offset', '100%');
  stopBaseBottom.setAttribute('stop-color', colors.baseBody);
  stopBaseBottom.setAttribute('stop-opacity', '0');
  gradBase.appendChild(stopBaseTop);
  gradBase.appendChild(stopBaseKeep);
  gradBase.appendChild(stopBaseBottom);

  // 上面フィル用：フェードを stop-opacity で表現（iOS対策）
  function makePlatformFillGradient(hideUpper, edge, start, len) {
    const gid = `grad-platform-fill-${Math.random().toString(36).slice(2)}`;
    const lg = document.createElementNS(SVG_NS, 'linearGradient');
    lg.setAttribute('id', gid);
    lg.setAttribute('gradientUnits', 'userSpaceOnUse');
    lg.setAttribute('x1', '0'); lg.setAttribute('x2', '0');

    if (hideUpper) {
      const y1 = edge;
      let y2 = edge + Math.max(0, start + len);
      if (Math.abs(y2 - y1) < EPS) y2 = y1 + EPS;
      lg.setAttribute('y1', String(y1));
      lg.setAttribute('y2', String(y2));

      const total = y2 - y1;
      const offKeep = (start / total) * 100;

      const s0 = document.createElementNS(SVG_NS, 'stop');
      s0.setAttribute('offset', '0%');
      s0.setAttribute('stop-color', colors.topFill);
      s0.setAttribute('stop-opacity', '0');

      const s1 = document.createElementNS(SVG_NS, 'stop');
      s1.setAttribute('offset', `${Math.max(0, Math.min(100, offKeep))}%`);
      s1.setAttribute('stop-color', colors.topFill);
      s1.setAttribute('stop-opacity', '0');

      const s2 = document.createElementNS(SVG_NS, 'stop');
      s2.setAttribute('offset', '100%');
      s2.setAttribute('stop-color', colors.topFill);
      s2.setAttribute('stop-opacity', '1');

      lg.appendChild(s0); lg.appendChild(s1); lg.appendChild(s2);
    } else {
      let y2 = edge;
      const y1 = edge - Math.max(0, start + len);
      if (Math.abs(y2 - y1) < EPS) y2 = y1 + EPS;
      lg.setAttribute('y1', String(y1));
      lg.setAttribute('y2', String(y2));

      const total = y2 - y1;
      const offFadeEnd = (len / total) * 100; // y1→(y2-start)までで 1→0

      const s0 = document.createElementNS(SVG_NS, 'stop');
      s0.setAttribute('offset', '0%');
      s0.setAttribute('stop-color', colors.topFill);
      s0.setAttribute('stop-opacity', '1');

      const s1 = document.createElementNS(SVG_NS, 'stop');
      s1.setAttribute('offset', `${Math.max(0, Math.min(100, offFadeEnd))}%`);
      s1.setAttribute('stop-color', colors.topFill);
      s1.setAttribute('stop-opacity', '0');

      const s2 = document.createElementNS(SVG_NS, 'stop');
      s2.setAttribute('offset', '100%');
      s2.setAttribute('stop-color', colors.topFill);
      s2.setAttribute('stop-opacity', '0');

      lg.appendChild(s0); lg.appendChild(s1); lg.appendChild(s2);
    }
    defs.appendChild(lg);
    return gid;
  }

  // 外枠ストローク用：stop-opacity でフェード
  function makeOutlineStrokeGradient(hideUpper, edge, start, len) {
    const gid = `grad-outline-stroke-${Math.random().toString(36).slice(2)}`;
    const lg = document.createElementNS(SVG_NS, 'linearGradient');
    lg.setAttribute('id', gid);
    lg.setAttribute('gradientUnits', 'userSpaceOnUse');
    lg.setAttribute('x1', '0'); lg.setAttribute('x2', '0');

    if (hideUpper) {
      const y1 = edge;
      let y2 = edge + Math.max(0, start + len);
      if (Math.abs(y2 - y1) < EPS) y2 = y1 + EPS;
      lg.setAttribute('y1', String(y1));
      lg.setAttribute('y2', String(y2));

      const total = y2 - y1;
      const offKeep = (start / total) * 100;

      const s0 = document.createElementNS(SVG_NS, 'stop');
      s0.setAttribute('offset', '0%');
      s0.setAttribute('stop-color', colors.outline);
      s0.setAttribute('stop-opacity', '0');

      const s1 = document.createElementNS(SVG_NS, 'stop');
      s1.setAttribute('offset', `${Math.max(0, Math.min(100, offKeep))}%`);
      s1.setAttribute('stop-color', colors.outline);
      s1.setAttribute('stop-opacity', '0');

      const s2 = document.createElementNS(SVG_NS, 'stop');
      s2.setAttribute('offset', '100%');
      s2.setAttribute('stop-color', colors.outline);
      s2.setAttribute('stop-opacity', '1');

      lg.appendChild(s0); lg.appendChild(s1); lg.appendChild(s2);
    } else {
      let y2 = edge;
      const y1 = edge - Math.max(0, start + len);
      if (Math.abs(y2 - y1) < EPS) y2 = y1 + EPS;
      lg.setAttribute('y1', String(y1));
      lg.setAttribute('y2', String(y2));

      const total = y2 - y1;
      const offFadeEnd = (len / total) * 100;

      const s0 = document.createElementNS(SVG_NS, 'stop');
      s0.setAttribute('offset', '0%');
      s0.setAttribute('stop-color', colors.outline);
      s0.setAttribute('stop-opacity', '1');

      const s1 = document.createElementNS(SVG_NS, 'stop');
      s1.setAttribute('offset', `${Math.max(0, Math.min(100, offFadeEnd))}%`);
      s1.setAttribute('stop-color', colors.outline);
      s1.setAttribute('stop-opacity', '0');

      const s2 = document.createElementNS(SVG_NS, 'stop');
      s2.setAttribute('offset', '100%');
      s2.setAttribute('stop-color', colors.outline);
      s2.setAttribute('stop-opacity', '0');

      lg.appendChild(s0); lg.appendChild(s1); lg.appendChild(s2);
    }
    defs.appendChild(lg);
    return gid;
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
    gradBase.setAttribute('y1', String(y1));
    gradBase.setAttribute('y2', String(y2));
    stopBaseKeep.setAttribute('offset', `${Math.max(0, Math.min(1, blurStartRatio)) * 100}%`);
  }

  if (!hideBottom) {
    const baseBody = document.createElementNS(SVG_NS, 'rect');
    baseBody.setAttribute('x', baseBodyRect.x);
    baseBody.setAttribute('y', baseBodyRect.y);
    baseBody.setAttribute('width', baseBodyRect.width);
    baseBody.setAttribute('height', baseBodyRect.height);
    baseBody.setAttribute('fill', `url(#${gradBaseId})`);
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

  // フィル（フェード）
  if (hideTop && platformEdgeFadeLen > 0) {
    const gid = makePlatformFillGradient(true, yTopEdge, platformEdgeFadeStart, platformEdgeFadeLen);
    topPath.setAttribute('fill', `url(#${gid})`);
  } else if (hideBottom && platformEdgeFadeLen > 0) {
    const gid = makePlatformFillGradient(false, yBottomEdge, platformEdgeFadeStart, platformEdgeFadeLen);
    topPath.setAttribute('fill', `url(#${gid})`);
  } else {
    topPath.setAttribute('fill', colors.topFill);
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
  outlineTop_1.setAttribute('stroke-width', outlineWidth);
  outlineTop_1.setAttribute('stroke-linejoin', 'round');

  let outlineTop_2 = null;
  if (!hideTop) {
    outlineTop_1.setAttribute('d', `M ${B.x} ${B.y} L ${C.x} ${C.y} L ${D.x} ${D.y} L ${A.x} ${A.y}`);
  } else {
    // C→D を描かない
    outlineTop_1.setAttribute('d', `M ${B.x} ${B.y} L ${C.x} ${C.y}`);
    outlineTop_2 = document.createElementNS(SVG_NS, 'path');
    outlineTop_2.setAttribute('d', `M ${D.x} ${D.y} L ${A.x} ${A.y}`);
    outlineTop_2.setAttribute('fill', 'none');
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
    outlineFrontLeft.setAttribute('stroke-width', outlineWidth);
    outlineFrontLeft.setAttribute('stroke-linejoin', 'round');

    outlineFrontRight = document.createElementNS(SVG_NS, 'path');
    outlineFrontRight.setAttribute('d', `M ${pFRB.x} ${pFRB.y} L ${pFRU.x} ${pFRU.y}`);
    outlineFrontRight.setAttribute('fill', 'none');
    outlineFrontRight.setAttribute('stroke-width', outlineWidth);
    outlineFrontRight.setAttribute('stroke-linejoin', 'round');

    outlineFrontBottom = document.createElementNS(SVG_NS, 'path');
    outlineFrontBottom.setAttribute('d', `M ${pFLB.x} ${pFLB.y} L ${pFRB.x} ${pFRB.y}`);
    outlineFrontBottom.setAttribute('fill', 'none');
    outlineFrontBottom.setAttribute('stroke-width', outlineWidth);
  }

  // 外枠のストローク指定（hideTop: 前面三辺は常時表示, hideBottom: 前面枠は描かない）
  if ((hideTop || hideBottom) && outlineFadeLen > 0) {
    const gid = hideTop
      ? makeOutlineStrokeGradient(true,  yTopEdge,    outlineFadeStart, outlineFadeLen)
      : makeOutlineStrokeGradient(false, yBottomEdge, outlineFadeStart, outlineFadeLen);

    // 上面側（B→C, D→Aなど）だけにグラデーションストローク
    outlineTop_1.setAttribute('stroke', `url(#${gid})`);
    if (outlineTop_2) outlineTop_2.setAttribute('stroke', `url(#${gid})`);

    if (!hideTop) {
      // hideBottom の場合：前面枠は描かないので何もしない
      // hideTop=false のときはここに来ない
    }
  } else {
    // フェードなし：単色ストローク
    outlineTop_1.setAttribute('stroke', colors.outline);
    if (outlineTop_2) outlineTop_2.setAttribute('stroke', colors.outline);
  }

  // 前面枠のストローク（hideTop のときも単色で常時表示）
  if (!hideBottom) {
    const strokeColor = colors.outline;
    outlineFrontLeft.setAttribute('stroke', strokeColor);
    outlineFrontRight.setAttribute('stroke', strokeColor);
    outlineFrontBottom.setAttribute('stroke', strokeColor);
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

  // --- アンカー移動 ---
  // front: 足場前面の下底左端（pFLB）
  // back : 足場上面の上底左端（D）
  let anchorPoint;
  if (referencePos === "back") {
    anchorPoint = { x: D.x, y: D.y }; // 上底左端
  } else {
    const pFLB = { x: frontRect.x, y: frontRect.y + frontRect.height };
    anchorPoint = pFLB;             // 下底左端
  }
  const tx = anchorX - anchorPoint.x;
  const ty = anchorY - anchorPoint.y;
  gRoot.setAttribute('transform', `translate(${tx}, ${ty})`);

  return gRoot;
}
