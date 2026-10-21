// 生成部品（lcdParts="generate"）の生成関数と、その対応表（7.74節）
// 昔の jsMojules/body/PlatformDrawer.js が createRail / createPlatform / createTrain の外でしていた処理
// （引数の初期値・入線アニメーション・強調号車の色の混合・向かいの列車の路線名）をここにまとめる。
// 各生成関数は (params, ctx) を受け取り、画面の座標（1920×1080）で描いた <g> を返す。ctx: { textDrawer }

// 線路の引数の初期値（昔の createOneRail と同じ）
const RAIL_DEFAULTS = {
    railWidth: 20,
    railThickness: 6,
    numSleepers: 64,
    sleeperWidth: 10,
    sleeperDepth: 45,
    sleeperHeight: 4,
    vanishY: -3000,   // anchorY からの相対
    railHeight: 4,
    drawWidth: 1920,
    anchorX: 0,
    anchorY: 837,
    railMidOffset: 3,
    railOutlineWidth: 1,
    colorSleeper: '#cfcfcfff',
    colorSleeperSide: '#9e9e9eff',
    colorRail: '#cfcfcfff',
    colorRailFront: '#505050ff',
    colorRailOutline: '#6e6e6eff',
};

// ホームの引数の初期値（昔の createPlatformObj と同じ）
const PLATFORM_DEFAULTS = {
    width: 1828,
    depth: 260,
    vanishX: 960,
    vanishY: -2800,
    foothHeight: 15,
    outlineWidth: 2,
    yellowWidth: 6,
    yellowOffset: 14,
    yellowDashLength: 20,
    baseShadowHeight: 10,
    baseBodyHeight: 33,
    baseBlurLength: 10,
    baseOffset: 4,
    anchorX: 46,
    anchorY: 737,
    referencePos: "front",
    colors: {
        topFill:   "#e6e6e6ff",
        frontFill: "#a9a9a9ff",
        outline:   "#333333",
        baseBody:  "#858585ff",
        baseShadow:"#6f6f6fff",
        yellow:    "#ffdd00"
    },
    hideTop: true,
    hideBottom: false,
    platformEdgeFadeLen: 20,
    platformEdgeFadeStart: 10,
    outlineFadeLen: 20,
    outlineFadeStart: 5
};

// 車両の引数の初期値（昔の createTrainObj の自列車の値）
const TRAIN_DEFAULTS = {
    carLength: 154,
    height: 66,
    depth: 30,
    cars: 10,
    vanishY: -2000,
    gap: 5,
    margin: 40,
    strokeWidth: 2.5,
    colorSideFace: "#a9a9a9ff",
    colorMainFace: "#d7d7d7ff",
    colorTopFace:  "#efefefff",
    colorEdges:    "#ffffffff",
    shadowPos:     10,
    shadowDepth:   30,
    shadowColor:   "rgba(0,0,0,1)",
    baseX: 1750,
    baseY: 818,
    baseMode: "right", // 入線方向（left:右→左 / right:左→右）
    highlightCarId: 0,
    highlight: {
        height: 90,
        depth: 30,
        colorSideFace: "#313131ff",
        colorMainFace: "#4e4e4eff",
        colorTopFace:  "#7d7d7dff",
        colorEdges:    "#a4a4a4ff",
    },
    highlightBlinkMs: 500,
    animate: false, // 入線は CSS で動かすため常に false
    animStartX: 300,
    animInitialSpeed: 1200,
    carLabels: ["1","2","3","4","5","6","7","8","9","10"],
    labelHeightNormal: 76,
    labelHeightHighlight: 105,
    labelBottomOffset: -10,
    labelWidth: 120,
    labelStyleNormal: {
        fill: "#000000",
        fontFamily: "sans-serif",
        fontWeight: "bold",
        textAnchor: "middle",
    },
    highlightLabelFill: "#ffffffff",
    drawLine: true,
    lineThickness: 12,
    lineOffset: 0,
    highlightLineThickness: 12,
    highlightLineOffset: 0,
    lineColor: "#ff4d4dff",
};

// 入線のアニメーションの初期値（昔の createTrainObj が createTrainApproach に渡していた値）
const APPROACH_DEFAULTS = {
    stopDuration: 10,  // 停車表示の秒数
    slideOffset: 1920, // 画面外からの距離(px)
    slideSpeed: 1200,  // 速度(px/s)
    easing: "cubic-bezier(0.3, 0.5, 0.7, 1)",
};

// 向かいの列車の路線名の文字の書式（昔の createOtherTrainObj と同じ。白で縁取る）
const LINE_LABEL_STYLE_TOP = {fontFamily: "BIZ UDGothic", fontWeight: "bold", textAnchor: "start", fill: "rgb(0, 0, 0)", stroke: {strokeWidth: 2.5, stroke: "#FFFFFF"}};
const LINE_LABEL_STYLE_BOTTOM = {fontFamily: "sans-serif", fontWeight: "bold", textAnchor: "start", fill: "rgb(0, 0, 0)", stroke: {strokeWidth: 2.5, stroke: "#FFFFFF"}};

// 入線を繰り返す列車 <g> を作る（昔の PlatformDrawer.createTrainApproach をそのまま写したもの）。
// 入線側（文字・強調なし）を画面外から動かし、到着した瞬間に停車側（文字・強調あり）へ切り替える
function createTrainApproach({
    trainParams,
    stopDuration = 3,     // 停車表示の秒数
    slideOffset = 800,    // 画面外からの距離(px)
    slideSpeed  = 1200,   // 目安速度(px/s) → 入線時間 = slideOffset / slideSpeed
    easing      = "cubic-bezier(0.0, 0.0, 0.2, 1)", // 減速(ease-out)
}) {
    const NS = "http://www.w3.org/2000/svg";

    // 入線時間と1周時間
    const moveDur = Math.max(0.05, slideOffset / Math.max(1, slideSpeed)); // s
    const totalDur = moveDur + stopDuration; // s
    const pMove = (moveDur / totalDur) * 100; // 入線完了の%位置
    const EPS = 0.01; // %単位の極小オフセット（同時刻競合の回避用）

    // 入線方向：left→右から左(+)、right→左から右(-)
    const dir = (trainParams.baseMode === "right") ? -1 : 1;
    const startDX = dir * slideOffset;

    // ルート <g>
    const root = document.createElementNS(NS, "g");

    // 入線側（テキスト/ハイライトなし・アニメなし）
    const approachInner = createTrain({
        ...trainParams,
        animate: false,
        carLabels: null,
        textDrawer: null,
        highlightCarId: null,
    });
    const approachWrap = document.createElementNS(NS, "g"); // CSSで動かすラッパ
    approachWrap.appendChild(approachInner);
    root.appendChild(approachWrap);

    // 停車側（テキスト/ハイライトあり・アニメなし）
    const stopped = createTrain({
        ...trainParams,
        animate: false,
    });
    root.appendChild(stopped);

    // スコープ用ID
    const uid = `ktr${Math.random().toString(36).slice(2, 9)}`;

    // スタイル（root 配下に閉じ込める）
    const styleEl = document.createElementNS(NS, "style");
    styleEl.textContent = `
    /* --- 入線の移動(translate)のみ。ease-out で減速 --- */
    @keyframes slideMove-${uid} {
    0% { transform: translate(${startDX}px, 0); }
    ${pMove}% { transform: translate(0px, 0); }
    ${Math.min(100, pMove + EPS)}% { transform: translate(${startDX}px, 0); }
    100% { transform: translate(${startDX}px, 0); }
    }
    /* --- 入線側の不透明度。到達した瞬間に0へ（段階切替）--- */
    @keyframes approachOpacity-${uid} {
    0% { opacity: 1; }
    ${pMove - EPS}% { opacity: 1; }
    ${pMove}% { opacity: 0; }
    100% { opacity: 0; }
    }
    /* --- 停車側の不透明度。到達した瞬間に1へ（段階切替）--- */
    @keyframes stopOpacity-${uid} {
    0% { opacity: 0; }
    ${pMove - EPS}% { opacity: 0; }
    ${pMove}% { opacity: 1; }
    100% { opacity: 1; }
    }
    .${uid}-approach {
    animation:
        slideMove-${uid} ${totalDur}s ${easing} infinite,
        approachOpacity-${uid} ${totalDur}s steps(1,end) infinite;
    transform: translate(${startDX}px, 0); /* 0% と一致 */
    opacity: 1;
    }
    .${uid}-stopped {
    animation: stopOpacity-${uid} ${totalDur}s steps(1,end) infinite;
    opacity: 0;
    }
    `;
    root.appendChild(styleEl);

    // 初期クラス
    approachWrap.setAttribute("class", `${uid}-approach`);
    stopped.setAttribute("class", `${uid}-stopped`);

    // 停車表示と同時に「点滅SMIL」を開始/再開始する仕組み
    //    1) 停車側の <animate> をすべて begin="indefinite" に差し替え
    //    2) 入線完了 (= moveDur 秒後) に beginElement() を叩く
    //    3) 以後は totalDur ごとに再スタートさせ、毎周0秒から点滅
    const smilAnims = [];
    stopped.querySelectorAll('animate').forEach(anim => {
        const clone = anim.cloneNode(true);
        clone.setAttribute('begin', 'indefinite');
        anim.parentNode.replaceChild(clone, anim);
        smilAnims.push(clone);
    });

    // 同期開始/再開始ヘルパ
    // beginElement() は再生中でも先頭から開始し直す（restart の初期値 always）。
    // endElement() を続けて呼ぶと Safari（WebKit）では止まったままになるため呼ばない（7.74節）
    function restartBlinkNow() {
        smilAnims.forEach(a => {
            try { a.beginElement(); } catch(_) {}
        });
    }

    // 初回：入線完了タイミングで開始
    const firstTimer = setTimeout(restartBlinkNow, moveDur * 1000);
    // 以降は1周ごとに入線完了タイミングで再スタート（厳密同期）
    const loopTimer = setInterval(restartBlinkNow, totalDur * 1000);

    // 破棄用のAPI（次の描画の始めに Drawer が呼ぶ）
    root.__cleanup = () => {
        clearTimeout(firstTimer);
        clearInterval(loopTimer);
    };

    return root;
}

// 向かいの列車の上に出す路線名を描く（昔の createOtherTrainObj の後半と同じ位置・大きさ）
function createTrainLineLabel(lineLabel, trainParams, textDrawer) {
    const tw = new TransferWidget(
        lineLabel.lineIcon || "",
        lineLabel.name || "",
        lineLabel.eng || "",
        0,   // x いらない
        0,   // y いらない
        2000, // width(全体の最大横幅) いらない
        88,   // height（アイコンの高さ）
        0,    // topTextOffset
        55,   // topTextHeight
        0,    // bottomTextOffset
        5,    // iconGap（今回は未使用）
        5,    // iconTextGap
        3,    // textGap
        textDrawer,
        LINE_LABEL_STYLE_TOP,
        LINE_LABEL_STYLE_BOTTOM
    );
    tw.setHeight(80);
    // 列車の全長の中央に置く（列車の先頭 baseX と向きから左端を求める）
    const wholeLength = trainParams.wholeLength;
    const leftX = trainParams.baseMode === "left" ? trainParams.baseX : trainParams.baseX - wholeLength;
    const x = leftX + wholeLength / 2 - tw.overallArea.width / 2;
    tw.setCoordinate(x, trainParams.baseY - 87);
    return tw.getElement();
}

// 生成関数の名前（genfunc 属性）→ 生成関数
const GENERATORS = {
    // 線路1本（遠近法の枕木・レール）
    rail: (params) => createRail({ ...RAIL_DEFAULTS, ...params }),

    // ホーム（上面・側面・黄色い線・影）
    platform: (params) => createPlatform({ ...PLATFORM_DEFAULTS, ...params }),

    // 車両の編成。追加の引数:
    //   approach: true なら入線のアニメーション（stopDuration・slideOffset・slideSpeed・easing）
    //   highlightMixColor: 強調号車の4色に混ぜる色（空なら混ぜない）
    //   lineLabel: { lineIcon, name, eng } があれば列車の上に路線名を描く（向かいの列車）
    train: (params, ctx) => {
        const { approach = false, highlightMixColor = "", lineLabel = null,
                stopDuration, slideOffset, slideSpeed, easing, ...rest } = params;
        // 強調号車の値は初期値と1段だけ混ぜる（一部だけ指定した場合も残りは初期値）
        const highlight = { ...TRAIN_DEFAULTS.highlight, ...(rest.highlight || {}) };
        if (highlightMixColor) {
            ['colorSideFace', 'colorMainFace', 'colorTopFace', 'colorEdges'].forEach(key => {
                highlight[key] = combineByOKLCH(highlightMixColor, highlight[key]);
            });
        }
        const trainParams = { ...TRAIN_DEFAULTS, textDrawer: ctx.textDrawer, ...rest, highlight };

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        let trainEl;
        if (approach) {
            const approachParams = { ...APPROACH_DEFAULTS };
            if (stopDuration !== undefined) approachParams.stopDuration = stopDuration;
            if (slideOffset  !== undefined) approachParams.slideOffset  = slideOffset;
            if (slideSpeed   !== undefined) approachParams.slideSpeed   = slideSpeed;
            if (easing       !== undefined) approachParams.easing       = easing;
            trainEl = createTrainApproach({ trainParams, ...approachParams });
            // アニメーションのタイマーの後始末を外側の <g> から呼べるようにする
            group.__cleanup = trainEl.__cleanup;
        } else {
            trainEl = createTrain({ ...trainParams, animate: false });
        }
        group.appendChild(trainEl);
        if (lineLabel && ctx.textDrawer) group.appendChild(createTrainLineLabel(lineLabel, trainParams, ctx.textDrawer));
        return group;
    },
};
