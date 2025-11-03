function createPlatform(params) {
  const {
    width, depth,
    vanishX, vanishY,
    foothHeight,
    outlineWidth,
    yellowWidth, yellowOffset, yellowDashLength, // 今回未描画
    baseShadowHeight, baseBodyHeight, baseBlurLength, baseOffset,
    anchorX, anchorY,
    referencePos, // "front" or "back"
    colors // { topFill, frontFill, outline, baseBody, baseShadow, yellow }
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

  // 足場前面（長方形）
  const frontRect = { x: A.x, y: -foothHeight, width: (B.x - A.x), height: foothHeight };

  // root
  const gRoot = document.createElementNS(SVG_NS, 'g');

  // ---- defs：台座本体の縦グラデ（上=1, 下=0）----
  const defs = document.createElementNS(SVG_NS, 'defs');
  const grad = document.createElementNS(SVG_NS, 'linearGradient');
  const gradId = `grad-base-body-${Math.random().toString(36).slice(2)}`;
  grad.setAttribute('id', gradId);
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', '0'); grad.setAttribute('x2', '0');

  const stopTop = document.createElementNS(SVG_NS, 'stop');
  stopTop.setAttribute('offset', '0%');
  stopTop.setAttribute('stop-color', colors.baseBody);
  stopTop.setAttribute('stop-opacity', '1');

  const stopStart = document.createElementNS(SVG_NS, 'stop'); // ぼかし開始（不透明終端）
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
  gRoot.appendChild(defs);

  // ---- 台座（背面）----
  const gBase = document.createElementNS(SVG_NS, 'g');

  const baseBodyRect = {
    x: A.x + baseOffset,
    y: 0,
    width: Math.max(0, (B.x - A.x) - baseOffset * 2),
    height: baseBodyHeight
  };

  // グラデ座標と開始位置
  const y1 = baseBodyRect.y;
  const y2 = baseBodyRect.y + baseBodyRect.height;
  const blurStartY = Math.max(y1, y2 - baseBlurLength);
  const blurStartRatio = (blurStartY - y1) / (y2 - y1);
  grad.setAttribute('y1', String(y1));
  grad.setAttribute('y2', String(y2));
  stopStart.setAttribute('offset', `${Math.max(0, Math.min(1, blurStartRatio)) * 100}%`);

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

  // ---- 足場（前面）----
  const gFooth = document.createElementNS(SVG_NS, 'g');

  // 上面（台形）
  const topPath = document.createElementNS(SVG_NS, 'path');
  topPath.setAttribute('d', `M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} L ${D.x} ${D.y} Z`);
  topPath.setAttribute('fill', colors.topFill);
  gFooth.appendChild(topPath);

  // 前面（長方形）
  const front = document.createElementNS(SVG_NS, 'rect');
  front.setAttribute('x', frontRect.x);
  front.setAttribute('y', frontRect.y);
  front.setAttribute('width', frontRect.width);
  front.setAttribute('height', frontRect.height);
  front.setAttribute('fill', colors.frontFill);
  gFooth.appendChild(front);

  // ---- 外枠（境界線は描かない）----
  // 1) 上面の外周（B→C→D→A）※A→Bは描かない
  const outlineTop = document.createElementNS(SVG_NS, 'path');
  outlineTop.setAttribute('d', `M ${B.x} ${B.y} L ${C.x} ${C.y} L ${D.x} ${D.y} L ${A.x} ${A.y}`);
  outlineTop.setAttribute('fill', 'none');
  outlineTop.setAttribute('stroke', colors.outline);
  outlineTop.setAttribute('stroke-width', outlineWidth);
  outlineTop.setAttribute('stroke-linejoin', 'round');
  gFooth.appendChild(outlineTop);

  // 2) 前面の外周（左縦→下辺→右縦）※上辺は描かない
  const pFLU = { x: frontRect.x,                   y: frontRect.y };
  const pFRU = { x: frontRect.x + frontRect.width, y: frontRect.y };
  const pFLB = { x: frontRect.x,                   y: frontRect.y + frontRect.height }; // アンカー
  const pFRB = { x: frontRect.x + frontRect.width, y: frontRect.y + frontRect.height };

  const outlineFront = document.createElementNS(SVG_NS, 'path');
  outlineFront.setAttribute('d', `M ${pFLU.x} ${pFLU.y} L ${pFLB.x} ${pFLB.y} L ${pFRB.x} ${pFRB.y} L ${pFRU.x} ${pFRU.y}`);
  outlineFront.setAttribute('fill', 'none');
  outlineFront.setAttribute('stroke', colors.outline);
  outlineFront.setAttribute('stroke-width', outlineWidth);
  outlineFront.setAttribute('stroke-linejoin', 'round');
  gFooth.appendChild(outlineFront);

  // レイヤー順
  gRoot.appendChild(gBase);
  gRoot.appendChild(gFooth);

  // アンカー移動（足場前面の下底左端 pFLB を [anchorX, anchorY] に一致）
  const tx = anchorX - pFLB.x;
  const ty = anchorY - pFLB.y;
  gRoot.setAttribute('transform', `translate(${tx}, ${ty})`);

  return gRoot;
}