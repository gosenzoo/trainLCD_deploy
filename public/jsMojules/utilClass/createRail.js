function createRail(params) {
  const {
    // 幾何
    railWidth,
    railThickness,
    numSleepers,
    sleeperWidth,
    sleeperDepth,
    sleeperHeight,
    vanishY,            // anchorY からの相対値（上が負、下が正）
    railHeight,
    drawWidth,

    // 新規：レール中間ラインの相対Y（枕木の上下端の中点からの相対）
    railMidOffset = 0,  // ★追加：下向き正。0なら従来通り

    // 配置
    anchorX = 0,
    anchorY = 0,
    sleepersBaseY,
    railOutlineWidth = 1,

    // 色
    colorSleeper      = '#d9d9d9',
    colorSleeperSide  = null,
    colorRail         = '#d9d9d9',
    colorRailFront    = '#8c8c8c',
    colorRailOutline  = '#000000',
  } = params;

  if (!(drawWidth > 0)) throw new Error('drawWidth must be > 0');
  if (!(numSleepers >= 2)) throw new Error('numSleepers must be >= 2');
  if (!(sleeperHeight > 0)) throw new Error('sleeperHeight must be > 0');

  function darkenHex(hex, factor = 0.85) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = Math.floor(((n >> 16) & 255) * factor);
    const g = Math.floor(((n >> 8) & 255) * factor);
    const b = Math.floor((n & 255) * factor);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }
  const sleeperSideFill = colorSleeperSide ?? darkenHex(colorSleeper);

  // 相対消失点Y（anchorY 基準）
  const vanishY_local = anchorY + vanishY;

  const vanishX = drawWidth / 2;
  const spacing = drawWidth / (numSleepers - 1);

  // baseY（左端枕木の底面ローカルY）
  let baseY;
  if (typeof sleepersBaseY === 'number') {
    baseY = sleepersBaseY;
  } else {
    baseY = Math.max(vanishY_local + 200, railThickness * 2);
  }

  const svgns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(svgns, 'g');
  g.setAttribute('transform', `translate(${anchorX}, ${anchorY - baseY})`);

  // 側面ベクトル（Δy = -sleeperDepth）
  function sideVector(xEnd, yEnd) {
    const vx = vanishX - xEnd;
    const vy = vanishY_local - yEnd;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len, uy = vy / len;
    const safeUy = Math.abs(uy) < 1e-6 ? -1e-3 : uy;
    const scale = (-sleeperDepth) / safeUy;
    return { dx: ux * scale, dy: uy * scale };
  }

  // --- 枕木（前面→側面→上面） ---
  for (let i = 0; i < numSleepers; i++) {
    const cx = i * spacing;
    const y0 = baseY;

    const lx = cx - sleeperWidth / 2;
    const rx = cx + sleeperWidth / 2;

    const nearerIsLeft = Math.abs(lx - vanishX) <= Math.abs(rx - vanishX);
    const nearX = nearerIsLeft ? lx : rx;

    const v = sideVector(nearX, y0);
    const topLx = lx + v.dx, topLy = y0 + v.dy;
    const topRx = rx + v.dx, topRy = y0 + v.dy;
    const topNearX = nearerIsLeft ? topLx : topRx;
    const topNearY = nearerIsLeft ? topLy : topRy;

    const front = document.createElementNS(svgns, 'rect');
    front.setAttribute('x', lx);
    front.setAttribute('y', y0);
    front.setAttribute('width', sleeperWidth);
    front.setAttribute('height', sleeperHeight);
    front.setAttribute('fill', sleeperSideFill);
    g.appendChild(front);

    const side = document.createElementNS(svgns, 'polygon');
    side.setAttribute(
      'points',
      `${nearX},${y0} ${nearX},${y0 + sleeperHeight} ${topNearX},${topNearY + sleeperHeight} ${topNearX},${topNearY}`
    );
    side.setAttribute('fill', sleeperSideFill);
    g.appendChild(side);

    const top = document.createElementNS(svgns, 'polygon');
    top.setAttribute(
      'points',
      `${lx},${y0} ${rx},${y0} ${topRx},${topRy} ${topLx},${topLy}`
    );
    top.setAttribute('fill', colorSleeper);
    g.appendChild(top);
  }

  // --- レール ---
  // 枕木の上下端の中点（従来の基準）
  const sleeperCenterY = baseY - sleeperDepth / 2;

  // ★レールの中間ライン（center）を、sleeperCenterY から railMidOffset だけずらす
  // （下向きが正）
  const railCenterY = sleeperCenterY + railMidOffset;

  // railWidth は“2本の代表点の間隔”。中間ラインから ±(railWidth/2) に配置
  const railRepYNear = railCenterY + railWidth / 2; // 手前
  const railRepYFar  = railCenterY - railWidth / 2; // 奥

  function drawRail(repY) {
    // 上面代表点 topY がレール矩形の“縦方向中心”になるよう配置
    const topY  = repY - railHeight;
    const rectY = topY - railThickness / 2;
    const rectH = railThickness;

    // レール本体
    const rail = document.createElementNS(svgns, 'rect');
    rail.setAttribute('x', 0);
    rail.setAttribute('y', rectY);
    rail.setAttribute('width', drawWidth);
    rail.setAttribute('height', rectH);
    rail.setAttribute('fill', colorRail);
    g.appendChild(rail);

    // 上端輪郭
    if (railOutlineWidth > 0) {
      const line = document.createElementNS(svgns, 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', rectY);
      line.setAttribute('x2', drawWidth);
      line.setAttribute('y2', rectY);
      line.setAttribute('stroke', colorRailOutline);
      line.setAttribute('stroke-width', railOutlineWidth);
      g.appendChild(line);
    }

    // レール前面：レール下端から railHeight 分だけ下に広がる四角形
    // （これまでの実装と同値：下端(bottomY) と (repY + thickness/2) の範囲は常に高さ = railHeight）
    const bottomY = rectY + rectH;         // レール矩形の下端
    const y = Math.min(bottomY, bottomY + railHeight);
    const h = Math.abs(railHeight);
    const railFront = document.createElementNS(svgns, 'rect');
    railFront.setAttribute('x', 0);
    railFront.setAttribute('y', y);
    railFront.setAttribute('width', drawWidth);
    railFront.setAttribute('height', h);
    railFront.setAttribute('fill', colorRailFront);
    g.appendChild(railFront);
  }

  // 奥 → 手前
  drawRail(railRepYFar);
  drawRail(railRepYNear);

  return g;
}