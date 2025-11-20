class PlatformDrawer{
    constructor(mapSVG, iconDict, animator, numIconDrawer){
        this.mapSVG = mapSVG
        this.iconDict = iconDict;
        this.numIconDrawer = numIconDrawer;
        this.textDrawer = new TextDrawer(this.iconDict, numIconDrawer); //テキスト描画用のインスタンスを作成
        this.animator = animator;
    }

    createAll(drawParams, size){
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        //group.appendChild(mapSVG.getElementById("platform-jitubutu").cloneNode(true));
        //group.appendChild(mapSVG.getElementById("tokyu-okuHome").cloneNode(true));

        //group.append(this.createStationSet("right", "left"));
        group.append(this.createStationSet(drawParams.leftOrRight, drawParams.dispStation.doorSide, drawParams.trainParams, drawParams.isDrawLine, drawParams.carLineColor, drawParams.otherTrainParams, drawParams.otherLineParams));

        //乗り換えがあれば下部に乗換案内を表示
        if((drawParams.dispStation.transfers.length > 0)){
            //おおもと
            const transferListEl = this.mapSVG.getElementById("body-platform-transferList").cloneNode(true);

            const transferListBackEl = this.mapSVG.getElementById("transferListBack").cloneNode(true);
            group.appendChild(transferListBackEl);

            //テキスト
            const transferListText = this.mapSVG.getElementById("transferListTextRect");
            group.appendChild(this.textDrawer.createByAreaEl("のりかえ", transferListText).element);
            const transferListTextEng = this.mapSVG.getElementById("transferListTextEngRect");
            group.appendChild(this.textDrawer.createByAreaEl("Transfer", transferListTextEng).element);
            
            //行ごとの描画数を取得
            let transferCountLineP = drawParams.dispStation.transferCountLineP;
            let lineCounts;
            if(transferCountLineP === ""){
                //空なら１列
                lineCounts = [1];
            }
            else{
                lineCounts = transferCountLineP.split(",").map((n) => { return parseInt(n); });
            }

            //表示エリア取得
            let listAreaRect;
            if(lineCounts.length > 1){
                //複数行なら広めに
                listAreaRect = transferListEl.querySelector("#transferListAreaMulti");
            }
            else{
                //１行なら標準
                listAreaRect = transferListEl.querySelector("#transferListArea");
            }
            console.log(listAreaRect)
            const area = {
                x: parseFloat(listAreaRect.getAttribute("x")),
                y: parseFloat(listAreaRect.getAttribute("y")),
                width: parseFloat(listAreaRect.getAttribute("width")),
                height: parseFloat(listAreaRect.getAttribute("height")),
            };

            //乗換路線リストウィジェット
            const twList = new TransferListWidget(area, lineCounts, 20, 5);
            //乗換ごとに回す
            drawParams.dispStation.transfers.split(" ").forEach(tid => {
                const lineObj = drawParams.lineDict[tid]; //路線オブジェクト

                const tw = new TransferWidget(
                    `:${lineObj.lineIconKey}:`,
                    `${lineObj.name}`,
                    `${lineObj.eng}`,
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
                    this.textDrawer,
                    {fontFamily: "BIZ UDGothic", fontWeight: "bold", textAnchor: "start", fill: "rgb(0, 0, 0)"},
                    {fontFamily: "sans-serif", fontWeight: "bold", textAnchor: "start", fill: "rgb(0, 0, 0)"}
                );

                twList.addWidget(tw);
            });

            group.appendChild(twList.getElement());
        }

        return group;
    }

    createStationSet(leftOfRight, doorSide, trainParams, isDrawLine, carLineColor, otherTrainParams, otherLineParams){
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); //組み立て用ツリー

        console.log(otherLineParams);
        const isDispOther = otherLineParams !== null;
        const otherTrainCarCounts = otherTrainParams.cars;
        const otherTrainCarLeft = 0;

        let sideFace = "#313131ff";
        let mainFace = "#3c3c3cff";
        let topFace = "#8b8b8bff";
        let edges = "#cbcbcbff";

        sideFace = combineByOKLCH(carLineColor, sideFace);
        mainFace = combineByOKLCH(carLineColor, mainFace);
        topFace = combineByOKLCH(carLineColor, topFace);
        edges = combineByOKLCH(carLineColor, edges);

        //手前右向き
        if((leftOfRight === "right") && (doorSide === "left")){
            //レール描画
            //手前
            group.appendChild(this.createOneRail(837));
            //奥
            if(isDispOther){
                group.appendChild(this.createOneRail(483));
                group.appendChild(this.createOtherTrainObj({
                    baseX: otherTrainParams.baseX,
                    baseY: 463,
                    cars: otherTrainCarCounts,
                    carLength: otherTrainParams.carLength,
                    gap: otherTrainParams.gap,
                    baseMode: leftOfRight,
                    wholeLength: otherTrainParams.wholeLength
                }, otherLineParams));
            }

            //ホーム描画
            group.appendChild(this.createPlatformObj({
                referencePos: "front",
                hideTop: !isDispOther,
                hideBottom: false,
                anchorX: 46,
                anchorY: 737,
            }));

            //列車描画
            group.appendChild(this.createTrainObj({
                baseMode: leftOfRight,
                baseX: trainParams.baseX,
                baseY: 818,
                cars: trainParams.cars,
                carLength: trainParams.carLength,
                gap: trainParams.gap,
                highlightCarId: trainParams.highlightCarId,
                carLabels: trainParams.carLabels,
                labelWidth: trainParams.labelWidth,
                drawLine: isDrawLine,
                lineColor: carLineColor,
                highlight: {
                    height: 90,
                    depth: 30,
                    colorSideFace: sideFace,
                    colorMainFace: mainFace,
                    colorTopFace:  topFace,
                    colorEdges:    edges,
                },
            }));
        }
        //手前左向き
        else if((leftOfRight === "left") && (doorSide === "right")){
            //レール描画
            //手前
            group.appendChild(this.createOneRail(837));
            //奥
            if(isDispOther){
                group.appendChild(this.createOneRail(483));
                group.appendChild(this.createOtherTrainObj({
                    baseX: otherTrainParams.baseX,
                    baseY: 463,
                    cars: otherTrainCarCounts,
                    carLength: otherTrainParams.carLength,
                    gap: otherTrainParams.gap,
                    baseMode: leftOfRight,
                    wholeLength: otherTrainParams.wholeLength
                }, otherLineParams));
            }

            //ホーム描画
            group.appendChild(this.createPlatformObj({
                referencePos: "front",
                hideTop: !isDispOther,
                hideBottom: false,
                anchorX: 46,
                anchorY: 737,
            }));

            //列車描画
            group.appendChild(this.createTrainObj({
                baseMode: leftOfRight,
                baseX: trainParams.baseX,
                baseY: 818,
                cars: trainParams.cars,
                carLength: trainParams.carLength,
                gap: trainParams.gap,
                highlightCarId: trainParams.highlightCarId,
                carLabels: trainParams.carLabels,
                labelWidth: trainParams.labelWidth,
                drawLine: isDrawLine,
                lineColor: carLineColor,
                highlight: {
                    height: 90,
                    depth: 30,
                    colorSideFace: sideFace,
                    colorMainFace: mainFace,
                    colorTopFace:  topFace,
                    colorEdges:    edges,
                },
            }));
        }
        //奥右向き
        else if((leftOfRight === "right") && (doorSide === "right")){
            //レール描画
            //奥
            group.appendChild(this.createOneRail(496));

            //列車描画
            group.appendChild(this.createTrainObj({
                baseMode: leftOfRight,
                baseX: trainParams.baseX,
                baseY: 480,
                cars: trainParams.cars,
                carLength: trainParams.carLength,
                gap: trainParams.gap,
                highlightCarId: trainParams.highlightCarId,
                carLabels: trainParams.carLabels,
                labelWidth: trainParams.labelWidth,
                drawLine: isDrawLine,
                lineColor: carLineColor,
                highlight: {
                    height: 90,
                    depth: 30,
                    colorSideFace: sideFace,
                    colorMainFace: mainFace,
                    colorTopFace:  topFace,
                    colorEdges:    edges,
                },
            }));

            //ホーム描画
            group.appendChild(this.createPlatformObj({
                referencePos: "back",
                hideTop: false,
                hideBottom: !isDispOther,
                anchorX: 66,
                anchorY: 480,
                width: 1788,
                baseBodyHeight: 23,
                baseShadowHeight: 9,
            }));

            //手前
            if(isDispOther){
                group.appendChild(this.createOneRail(824));
                group.appendChild(this.createOtherTrainObj({
                    baseX: otherTrainParams.baseX,
                    baseY: 804,
                    cars: otherTrainCarCounts,
                    carLength: otherTrainParams.carLength,
                    gap: otherTrainParams.gap,
                    baseMode: leftOfRight,
                    wholeLength: otherTrainParams.wholeLength
                }, otherLineParams));
            }
        }
        //奥左向き
        else if((leftOfRight === "left") && (doorSide === "left")){
            //レール描画
            //奥
            group.appendChild(this.createOneRail(496));

            //列車描画
            group.appendChild(this.createTrainObj({
                baseMode: leftOfRight,
                baseX: trainParams.baseX,
                baseY: 480,
                cars: trainParams.cars,
                carLength: trainParams.carLength,
                gap: trainParams.gap,
                highlightCarId: trainParams.highlightCarId,
                carLabels: trainParams.carLabels,
                labelWidth: trainParams.labelWidth,
                drawLine: isDrawLine,
                lineColor: carLineColor,
                highlight: {
                    height: 90,
                    depth: 30,
                    colorSideFace: sideFace,
                    colorMainFace: mainFace,
                    colorTopFace:  topFace,
                    colorEdges:    edges,
                },
            }));

            //ホーム描画
            group.appendChild(this.createPlatformObj({
                referencePos: "back",
                hideTop: false,
                hideBottom: !isDispOther,
                anchorX: 66,
                anchorY: 480,
                width: 1788,
                baseBodyHeight: 23,
                baseShadowHeight: 9,
            }));

            //手前
            if(isDispOther){
                group.appendChild(this.createOneRail(824));
                group.appendChild(this.createOtherTrainObj({
                    baseX: otherTrainParams.baseX,
                    baseY: 804,
                    cars: otherTrainCarCounts,
                    carLength: otherTrainParams.carLength,
                    gap: otherTrainParams.gap,
                    baseMode: leftOfRight,
                    wholeLength: otherTrainParams.wholeLength
                }, otherLineParams));
            }
        }
        
        return group;
    }

    createOtherTrainObj(params = {}, lineParams){
        const NS = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(NS, "g")

        const trainParams = {
            carLength: 154,
            height: 66,
            depth: 30,
            cars: 1,
            vanishY: -2000,
            gap: 5,
            margin: 40,
            strokeWidth: 2.5,
            colorSideFace: "#989898ff",
            colorMainFace: "#929292ff",
            colorTopFace:  "#bababaff",
            colorEdges:    "#e2e2e2ff",
            shadowPos:     10,
            shadowDepth:   30,
            shadowColor:   "rgba(0,0,0,1)",

            baseX: 0,
            baseY: 0,
            //baseX: 120,
            //baseY: 818,
            baseMode: "left", // ← これで入線方向を決めます（left:右→左 / right:左→右）
        };
        const otherTrain = createTrain({
            ...trainParams,
            ...params,
            animate: false,
            carLabels: null,
            textDrawer: null,
            highlightCarId: null,
        });
        group.appendChild(otherTrain);

        const tw = new TransferWidget(
            `:${lineParams.lineIconKey}:`,
            `${lineParams.name}`,
            `${lineParams.eng}`,
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
            this.textDrawer,
            {fontFamily: "BIZ UDGothic", fontWeight: "bold", textAnchor: "start", fill: "rgb(0, 0, 0)", stroke: {strokeWidth: 2.5, stroke: "#FFFFFF"}},
            {fontFamily: "sans-serif", fontWeight: "bold", textAnchor: "start", fill: "rgb(0, 0, 0)", stroke: {strokeWidth: 2.5, stroke: "#FFFFFF"}}
        );
        tw.setHeight(80);
        const leftX = params.baseMode === "left" ? params.baseX : params.baseX - params.wholeLength;
        const x = leftX + params.wholeLength / 2 - tw.overallArea.width / 2;
        console.log(tw.overallArea.width);
        tw.setCoordinate(x, params.baseY - 87);
        group.appendChild(tw.getElement());
        
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
            colorRailFront: '#505050ff',
            colorRailOutline: '#6e6e6eff',
        });
    }
    createTrainObj(params = {}){
        const baseTrainParams = {
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
            //baseX: 120,
            //baseY: 818,
            baseMode: "right", // ← これで入線方向を決めます（left:右→左 / right:左→右）

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

            animate: false, // ← CSSで動かすので false 固定でOK
            animStartX: 300,
            animInitialSpeed: 1200,

            carLabels: ["1","2","3","4","5","6","7","8","9","10"],
            textDrawer: this.textDrawer,
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
            drawLine: true,                // ← 追加：false ならラインを描かない
            lineThickness: 12,              // 通常ライン太さ（0以下で非描画）
            lineOffset: 0,                 // 通常ライン下辺の位置＝側面底辺 - lineOffset
            highlightLineThickness: 12,  // ハイライト用（未指定なら lineThickness）
            highlightLineOffset: 0,     // ハイライト用（未指定なら lineOffset）
            lineColor: "#ff4d4dff",          // ライン色
        };
        // 3秒表示してまた入線する列車 <g> を作る
        const trainLoopG = this.createTrainApproach({
            trainParams: {...baseTrainParams, ...params},
            stopDuration: 10, // 停車表示 4s
            slideOffset: 1920, // 画面外からの距離(px)
            slideSpeed: 1200, // 速度（px/s）→ 入線時間 ~0.75s
            easing: "cubic-bezier(0.3, 0.5, 0.7, 1)", // 好みに応じて
        });
        return trainLoopG;
    }
    createPlatformObj(params = {}){
        return createPlatform({...{
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
            // フェードは必要に応じて
            hideTop: true,
            hideBottom: false,
            platformEdgeFadeLen: 20,
            platformEdgeFadeStart: 10,
            outlineFadeLen: 20,
            outlineFadeStart: 5
        }, ...params});
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