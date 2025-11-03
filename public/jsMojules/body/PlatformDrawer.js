class PlatformDrawer{
    constructor(mapSVG, iconDict, animator){
        this.mapSVG = mapSVG
        this.iconDict = iconDict;
        this.textDrawer = new TextDrawer(this.iconDict); //テキスト描画用のインスタンスを作成
        this.animator = animator;
    }

    createAll(drawParams, size){
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        //group.appendChild(mapSVG.getElementById("platform-jitubutu").cloneNode(true));

        //レール描画
        //手前
        group.appendChild(this.createOneRail(837));
        //奥
        //group.appendChild(this.createOneRail(483));

        //ホーム描画
        group.appendChild(this.createPlatformObj());

        //列車描画
        group.appendChild(this.createTrainObj());

        return group;
    }

    createOneRail(y){
        return createRail({
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
            anchorY: y,

            // ★レール中間ラインの相対オフセット（下向きが正）
            railMidOffset: 3, // 例：中間点を枕木中心より 6px 下げる

            railOutlineWidth: 1,
            colorSleeper: '#cfcfcfff',
            colorSleeperSide: '#9e9e9eff',
            colorRail: '#cfcfcfff',
            colorRailFront: '#6e6e6eff',
            colorRailOutline: '#6e6e6eff',
        });
    }
    createTrainObj(){
        const baseTrainParams = {
            carLength: 154,
            height: 66,
            depth: 30,
            cars: 10,
            vanishY: -2000,
            gap: 5,
            margin: 40,
            strokeWidth: 1.5,
            colorSideFace: "#9f9f9fff",
            colorMainFace: "#c6c6c6ff",
            colorTopFace:  "#dfdfdfff",
            colorEdges:    "#ecececff",
            shadowPos:     10,
            shadowDepth:   30,
            shadowColor:   "rgba(0,0,0,1)",

            baseX: 1750,
            baseY: 818,
            //baseX: 120,
            //baseY: 818,
            baseMode: "right", // ← これで入線方向を決めます（left:右→左 / right:左→右）

            highlightCarId: 0,
            highlight: {
                height: 95,
                depth: 50,
                colorSideFace: "#313131ff",
                colorMainFace: "#4e4e4eff",
                colorTopFace:  "#7d7d7dff",
                colorEdges:    "#a4a4a4ff",
            },
            highlightBlinkMs: 500,

            animate: false, // ← CSSで動かすので false 固定でOK
            animStartX: 300,
            animInitialSpeed: 1200,

            carLabels: ["1", "2", "3","4","5","6","7","8","9","10"],
            textDrawer: this.textDrawer,
            labelHeightNormal: 76,
            labelHeightHighlight: 110,
            labelBottomOffset: -10,
            labelWidth: 120,
            labelStyleNormal: {
                fill: "#000000",
                fontFamily: "sans-serif",
                fontWeight: "bold",
                textAnchor: "middle",
            },
            highlightLabelFill: "#ffffffff",
        };
        // 3秒表示してまた入線する列車 <g> を作る
        const trainLoopG = this.createTrainApproach({
            trainParams: baseTrainParams,
            stopDuration: 10, // 停車表示 4s
            slideOffset: 1920, // 画面外からの距離(px)
            slideSpeed: 1200, // 速度（px/s）→ 入線時間 ~0.75s
            easing: "cubic-bezier(0.3, 0.5, 0.7, 1)", // 好みに応じて
        });
        return trainLoopG;
    }
    createPlatformObj(){
        return createPlatform({
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
                topFill:   "#e6e6e6",
                frontFill: "#cfcfcf",
                outline:   "#333333",
                baseBody:  "#b8b8b8",
                baseShadow:"#9a9a9a",
                yellow:    "#ffdd00"
            },
            // フェードは必要に応じて
            hideTop: true,
            hideBottom: false,
            platformEdgeFadeLen: 20,
            platformEdgeFadeStart: 10,
            outlineFadeLen: 20,
            outlineFadeStart: 5
        });
    }

    // createTrain は既存のまま利用
    createTrainApproach({
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

        // ─────────────────────────────────────────────
        // ★ 停車表示と同時に「点滅SMIL」を開始/再開始する仕組み
        //    1) 停車側の <animate> をすべて begin="indefinite" に差し替え
        //    2) 入線完了 (= moveDur 秒後) に beginElement() を叩く
        //    3) 以後は totalDur ごとに再スタートさせ、毎周0秒から点滅
        // ─────────────────────────────────────────────

        // 1) 停車側の <animate>（fill/stroke/text）を収集し、begin="indefinite" へ
        const smilAnims = [];
        stopped.querySelectorAll('animate').forEach(anim => {
            const clone = anim.cloneNode(true);
            clone.setAttribute('begin', 'indefinite');
            anim.parentNode.replaceChild(clone, anim);
            smilAnims.push(clone);
        });

        // 2) 同期開始/再開始ヘルパ
        function restartBlinkNow() {
            smilAnims.forEach(a => {
            try { a.endElement(); } catch(_) {}
            try { a.beginElement(); } catch(_) {}
            });
        }

        // 初回：入線完了タイミングで開始
        const firstTimer = setTimeout(restartBlinkNow, moveDur * 1000);

        // 3) 以降は1周ごとに入線完了タイミングで再スタート（厳密同期）
        const loopTimer = setInterval(restartBlinkNow, totalDur * 1000);

        // 破棄用のAPIも返す
        root.__cleanup = () => {
            clearTimeout(firstTimer);
            clearInterval(loopTimer);
        };

        return root;
    }
}