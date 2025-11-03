function createTrain(params) {
  const {
    carLength,
    height,
    depth,
    cars,
    vanishY,
    gap,
    margin = 40,
    strokeWidth = 1.5,
    colorSideFace = "#666666",
    colorMainFace = "#999999",
    colorTopFace  = "#c9c9c9",
    colorEdges    = "#e2e2e2",
    shadowPos     = 10,
    shadowDepth   = 24,
    shadowColor   = "rgba(0,0,0,0.18)",
    baseX = 0,
    baseY = 0,
    baseMode = "left",

    highlightCarId = null,
    highlight = {},
    highlightBlinkMs = 800,

    animate = false,
    animStartX = null,
    animInitialSpeed = 800,

    carLabels = null,
    textDrawer = null,
    labelHeightNormal = 20,
    labelHeightHighlight = 24,
    labelBottomOffset = -10,
    labelWidth = 80,
    labelStyleNormal = {},
    highlightLabelFill = "#ffffffff",
  } = params;

  const NS = "http://www.w3.org/2000/svg";

  // ラベルを描くかどうか
  const shouldDrawLabels =
    Array.isArray(carLabels) &&
    carLabels.length === cars &&
    textDrawer &&
    typeof textDrawer.createByArea === "function";

  // ハイライト車両の高さ/奥行 (指定がなければ通常値を使う)
  const hHeight = typeof highlight.height === "number" ? highlight.height : height;
  const hDepth  = typeof highlight.depth  === "number" ? highlight.depth  : depth;

  // 編成の全長（全車同長）
  const trainWidth = cars * carLength + (cars - 1) * gap;

  // 上面のために「最大の奥行」を使って側面の“基準上辺”を決める
  const maxDepth = Math.max(depth, hDepth);

  // 側面の“基準上辺 y”
  const baseTopY = margin + maxDepth;

  // 「通常車両」の底辺（全車共通）
  const baseBottomY = baseTopY + height;

  // 左端X
  const originX = margin;

  // 消失点Xは編成中心に固定
  const vanishX = originX + trainWidth / 2;
  const vanish  = { x: vanishX, y: vanishY };

  // ルートg
  const rootG = document.createElementNS(NS, "g");

  // 境界の傾き
  const dirs = [];
  for (let i = 0; i <= cars; i++) {
    let baseXforDir;
    if (i === 0) {
      baseXforDir = originX;
    } else if (i === cars) {
      baseXforDir = originX + trainWidth;
    } else {
      const rightOfLeftCar = originX + (i - 1) * (carLength + gap) + carLength;
      const leftOfRightCar = originX + i * (carLength + gap);
      baseXforDir = (rightOfLeftCar + leftOfRightCar) / 2;
    }
    dirs[i] = { dx: vanish.x - baseXforDir, dy: vanish.y - baseTopY };
  }

  // 1. 影
  const shadowBaseY = baseBottomY + shadowPos;
  const shadowTopY  = shadowBaseY - shadowDepth;
  const shadowBL = { x: originX,              y: shadowBaseY };
  const shadowBR = { x: originX + trainWidth, y: shadowBaseY };
  const shadowTL = intersectWithY(shadowBL, dirs[0],    shadowTopY);
  const shadowTR = intersectWithY(shadowBR, dirs[cars], shadowTopY);

  const shadowPoly = createPolygon(NS, [
    [shadowBL.x, shadowBL.y],
    [shadowBR.x, shadowBR.y],
    [shadowTR.x, shadowTR.y],
    [shadowTL.x, shadowTL.y],
  ]);
  shadowPoly.setAttribute("fill", shadowColor);
  shadowPoly.setAttribute("stroke", "none");
  rootG.appendChild(shadowPoly);

  // 2. 車両本体
  const order = endToCenterOrder(cars);

  for (const i of order) {
    const carG = document.createElementNS(NS, "g");

    const isHighlightTarget =
      typeof highlightCarId === "number" &&
      highlightCarId >= 0 && highlightCarId < cars &&
      highlightCarId === i;

    const carHeight = isHighlightTarget ? hHeight : height;
    const carDepth  = isHighlightTarget ? hDepth  : depth;

    const bottomY = baseBottomY;              // ←全車両そろえる
    const topY    = bottomY - carHeight;
    const topPlaneY = topY - carDepth;

    const x0 = originX + i * (carLength + gap);
    const x1 = x0 + carLength;
    const xMid = (x0 + x1) / 2;

    const TL = { x: x0, y: topY };
    const TR = { x: x1, y: topY };
    const BL = { x: x0, y: bottomY };
    const BR = { x: x1, y: bottomY };

    const dirL = dirs[i];
    const dirR = dirs[i + 1];

    const TTL = intersectWithY(TL, dirL, topPlaneY);
    const TTR = intersectWithY(TR, dirR, topPlaneY);

    const LTB = intersectWithY(TL, dirL, topPlaneY);
    const LBB = intersectWithY(BL, dirL, topPlaneY + carHeight);
    const RTB = intersectWithY(TR, dirR, topPlaneY);
    const RBB = intersectWithY(BR, dirR, topPlaneY + carHeight);

    // ハイライト色
    const hColorSideFace = highlight.colorSideFace ?? colorSideFace;
    const hColorMainFace = highlight.colorMainFace ?? colorMainFace;
    const hColorTopFace  = highlight.colorTopFace  ?? colorTopFace;
    const hColorEdges    = highlight.colorEdges    ?? colorEdges;

    // 側面
    const sidePoly = createPolygon(NS, [
      [TL.x, TL.y],
      [TR.x, TR.y],
      [BR.x, BR.y],
      [BL.x, BL.y],
    ]);
    sidePoly.setAttribute("fill", isHighlightTarget ? hColorMainFace : colorMainFace);
    sidePoly.setAttribute("stroke", "none");
    if (isHighlightTarget) {
      addBlinkFillDiscrete(sidePoly, hColorMainFace, colorMainFace, highlightBlinkMs, NS);
    }
    carG.appendChild(sidePoly);

    // 上面
    const topPoly = createPolygon(NS, [
      [TL.x, TL.y],
      [TR.x, TR.y],
      [TTR.x, TTR.y],
      [TTL.x, TTL.y],
    ]);
    topPoly.setAttribute("fill", isHighlightTarget ? hColorTopFace : colorTopFace);
    topPoly.setAttribute("stroke", "none");
    if (isHighlightTarget) {
      addBlinkFillDiscrete(topPoly, hColorTopFace, colorTopFace, highlightBlinkMs, NS);
    }
    carG.appendChild(topPoly);

    // 横面（中央はなし）
    const isCenter = isCenterIndex(i, cars);
    if (!isCenter) {
      const drawRightEnd = vanish.x >= xMid;
      if (drawRightEnd) {
        const endPoly = createPolygon(NS, [
          [TR.x, TR.y],
          [RTB.x, RTB.y],
          [RBB.x, RBB.y],
          [BR.x, BR.y],
        ]);
        endPoly.setAttribute("fill", isHighlightTarget ? hColorSideFace : colorSideFace);
        endPoly.setAttribute("stroke", "none");
        if (isHighlightTarget) {
          addBlinkFillDiscrete(endPoly, hColorSideFace, colorSideFace, highlightBlinkMs, NS);
        }
        carG.appendChild(endPoly);
      } else {
        const endPoly = createPolygon(NS, [
          [TL.x, TL.y],
          [LTB.x, LTB.y],
          [LBB.x, LBB.y],
          [BL.x, BL.y],
        ]);
        endPoly.setAttribute("fill", isHighlightTarget ? hColorSideFace : colorSideFace);
        endPoly.setAttribute("stroke", "none");
        if (isHighlightTarget) {
          addBlinkFillDiscrete(endPoly, hColorSideFace, colorSideFace, highlightBlinkMs, NS);
        }
        carG.appendChild(endPoly);
      }
    }

    // 境界線
    const boundaryLine = createPolyline(NS, [
      [TL.x, TL.y],
      [TR.x, TR.y],
    ]);
    boundaryLine.setAttribute("stroke", isHighlightTarget ? hColorEdges : colorEdges);
    boundaryLine.setAttribute("stroke-width", strokeWidth);
    boundaryLine.setAttribute("fill", "none");
    boundaryLine.setAttribute("stroke-linecap", "round");
    boundaryLine.setAttribute("stroke-linejoin", "round");
    if (isHighlightTarget) {
      addBlinkStrokeDiscrete(boundaryLine, hColorEdges, colorEdges, highlightBlinkMs, NS);
    }
    carG.appendChild(boundaryLine);

    // --- ラベル描画 ---
    if (shouldDrawLabels) {
      const labelText = carLabels[i];
      const lh = isHighlightTarget ? labelHeightHighlight : labelHeightNormal;
      const labelBottom = bottomY + labelBottomOffset;
      const labelTop = labelBottom - lh;
      const labelLeft = xMid - labelWidth / 2;

      // 通常のstyle
      const styleJson = labelStyleNormal || {};
      const normalTextColor = styleJson.fill || "#000000";

      const labelG = textDrawer.createByArea(
        labelText,
        labelLeft,
        labelTop,
        labelWidth,
        lh,
        styleJson
      ).element;
      if (labelG) {
        carG.appendChild(labelG);

        // ハイライトの場合は、ラベルの <text> にも同期点滅を追加
        if (isHighlightTarget) {
            addBlinkTextDiscrete(
                labelG,
                highlightLabelFill,
                normalTextColor,
                highlightBlinkMs,
                NS
            );
        }
      }
    }

    // アウトライン（六角形）
    const isLeftOfVP  = xMid < vanish.x;
    const isRightOfVP = xMid > vanish.x;
    let outlinePoints;
    if (isCenter) {
      outlinePoints = [
        [BL.x, BL.y],
        [BR.x, BR.y],
        [TR.x, TR.y],
        [TTR.x, TTR.y],
        [TTL.x, TTL.y],
        [TL.x, TL.y],
      ];
    } else if (isLeftOfVP) {
      outlinePoints = [
        [BL.x, BL.y],
        [BR.x, BR.y],
        [RBB.x, RBB.y],
        [TTR.x, TTR.y],
        [TTL.x, TTL.y],
        [TL.x, TL.y],
      ];
    } else if (isRightOfVP) {
      outlinePoints = [
        [BL.x, BL.y],
        [BR.x, BR.y],
        [TR.x, TR.y],
        [TTR.x, TTR.y],
        [TTL.x, TTL.y],
        [LBB.x, LBB.y],
      ];
    } else {
      outlinePoints = [
        [BL.x, BL.y],
        [BR.x, BR.y],
        [TR.x, TR.y],
        [TTR.x, TTR.y],
        [TTL.x, TTL.y],
        [TL.x, TL.y],
      ];
    }
    const outline = createPolygon(NS, outlinePoints);
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", "#000");
    outline.setAttribute("stroke-width", Math.max(1.5, strokeWidth));
    outline.setAttribute("stroke-linejoin", "round");
    outline.setAttribute("pointer-events", "none");
    carG.appendChild(outline);

    rootG.appendChild(carG);
  }

  // 3. 基準点＋アニメーション
  const anchorLeft  = { x: originX,              y: baseBottomY };
  const anchorRight = { x: originX + trainWidth, y: baseBottomY };
  const chosenAnchor = baseMode === "right" ? anchorRight : anchorLeft;

  const goalDx = baseX - chosenAnchor.x;
  const goalDy = baseY - chosenAnchor.y;

  if (animate) {
    let startXAbs;
    if (typeof animStartX === "number") {
      startXAbs = animStartX;
    } else {
      if (baseMode === "left") {
        startXAbs = baseX + 800;
      } else {
        startXAbs = baseX - 800;
      }
    }
    const startDx = startXAbs - chosenAnchor.x;

    const distance = Math.abs(goalDx - startDx);
    const speed = animInitialSpeed > 0 ? animInitialSpeed : 600;
    const durSec = distance / speed;

    rootG.setAttribute("transform", `translate(${startDx},${goalDy})`);

    const animEl = document.createElementNS(NS, "animateTransform");
    animEl.setAttribute("attributeName", "transform");
    animEl.setAttribute("type", "translate");
    animEl.setAttribute("from", `${startDx},${goalDy}`);
    animEl.setAttribute("to", `${goalDx},${goalDy}`);
    animEl.setAttribute("dur", `${durSec}s`);
    animEl.setAttribute("fill", "freeze");
    animEl.setAttribute("repeatCount", "1");
    animEl.setAttribute("calcMode", "spline");
    animEl.setAttribute("keyTimes", "0;1");
    animEl.setAttribute("keySplines", "0.0 0.0 0.2 1"); // ease-out
    rootG.appendChild(animEl);
  } else {
    rootG.setAttribute("transform", `translate(${goalDx},${goalDy})`);
  }

  return rootG;

  // ===== helper functions =====
  function createPolygon(ns, points) {
    const el = document.createElementNS(ns, "polygon");
    el.setAttribute("points", points.map(p => p.join(",")).join(" "));
    return el;
  }
  function createPolyline(ns, points) {
    const el = document.createElementNS(ns, "polyline");
    el.setAttribute("points", points.map(p => p.join(",")).join(" "));
    return el;
  }
  function intersectWithY(P, dir, Y) {
    const EPS = 1e-6;
    if (Math.abs(dir.dy) < EPS) {
      return { x: P.x, y: Y };
    }
    const t = (Y - P.y) / dir.dy;
    return { x: P.x + t * dir.dx, y: Y };
  }
  function endToCenterOrder(n) {
    const res = [];
    let L = 0, R = n - 1;
    while (L < R) {
      res.push(L++);
      res.push(R--);
    }
    if (L === R) res.push(L);
    return res;
  }
  function isCenterIndex(i, n) {
    if (n % 2 === 1) {
      return i === Math.floor(n / 2);
    }
    return i === (n / 2 - 1) || i === (n / 2);
  }
  // 瞬間点滅（塗り）
  function addBlinkFillDiscrete(target, highlightColor, normalColor, blinkMs, ns) {
    const anim = document.createElementNS(ns, "animate");
    anim.setAttribute("attributeName", "fill");
    anim.setAttribute("values", `${highlightColor};${normalColor};${highlightColor}`);
    anim.setAttribute("dur", `${(blinkMs * 2) / 1000}s`);
    anim.setAttribute("repeatCount", "indefinite");
    anim.setAttribute("calcMode", "discrete");
    target.appendChild(anim);
  }
  // 瞬間点滅（線）
  function addBlinkStrokeDiscrete(target, highlightColor, normalColor, blinkMs, ns) {
    const anim = document.createElementNS(ns, "animate");
    anim.setAttribute("attributeName", "stroke");
    anim.setAttribute("values", `${highlightColor};${normalColor};${highlightColor}`);
    anim.setAttribute("dur", `${(blinkMs * 2) / 1000}s`);
    anim.setAttribute("repeatCount", "indefinite");
    anim.setAttribute("calcMode", "discrete");
    target.appendChild(anim);
  }
  // テキスト用の瞬間点滅
  function addBlinkTextDiscrete(textEl, highlightColor, normalColor, blinkMs, ns) {
    const anim = document.createElementNS(ns, "animate");
    anim.setAttribute("attributeName", "fill");
    anim.setAttribute("values", `${highlightColor};${normalColor};${highlightColor}`);
    anim.setAttribute("dur", `${(blinkMs * 2) / 1000}s`);
    anim.setAttribute("repeatCount", "indefinite");
    anim.setAttribute("calcMode", "discrete");
    textEl.appendChild(anim);
  }
}