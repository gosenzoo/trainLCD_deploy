// ============================================================
// ProgressController
// 列車の路線上の位置・走行状態・長時間停車を管理し、
// drawParamsのうち page・langId 以外の全フィールドを生成する
// ============================================================
class ProgressController {
    /**
     * @param {object} progressParams
     * @param {object[]}  progressParams.stationList   - 全駅リスト
     * @param {object[]}  progressParams.operationList - 運行情報リスト
     * @param {object}    progressParams.info          - 全体設定（isLoop等）
     * @param {object}    progressParams.lineDict      - 路線辞書
     * @param {object}    progressParams.iconDict      - アイコン辞書
     */
    constructor(progressParams) {
        this.stationList   = progressParams.stationList;
        this.operationList = progressParams.operationList;
        this.info          = progressParams.info;
        this.lineDict      = progressParams.lineDict;
        this.iconDict      = progressParams.iconDict;

        // 全駅に通し番号 _id を付与
        this.stationList.forEach((station, i) => { station._id = i; });

        // 通過駅フラグリスト
        this.passList = this.stationList.map(s => s.isPass);
        this.isLoop = this.info.isLoop;
        this.stationNum = this.stationList.length;

        // 1駅あたりの状態数（つぎは/まもなく/ただいま）
        this.statesPerStation = 3;
        this.stateIndNum = this.statesPerStation * this.stationNum;

        // stateIndの有効範囲（非環状）
        if (!this.isLoop) {
            this.stationIndMin = this.statesPerStation - 1; // 1駅目の停車状態
            this.stationIndMax = this.statesPerStation * this.stationNum - 1;
        } else {
            this.stationIndMin = 0;
            this.stationIndMax = this.statesPerStation * this.stationNum - 1;
        }

        // 長時間停車タイマー関連
        this.isStopping = false;
        this._onLongStop = null;
        this._stopTimerId = null;
        this.stopTimeLimit = 30000; // 長時間停車とみなす閾値（ms）

        // 路線図の表示駅枠数（固定値）
        this.stationFrameNum = 8;
        // 全体路線図の表示駅枠数（固定値）
        this.overLineFrameNum = 21;

        // stateIndを初期化（1駅目の停車状態: statesPerStation-1 = 2）
        this._stateInd = this.statesPerStation - 1;
        this.stateInd = this._stateInd; // セッターを通して初期化
    }

    // ============================================================
    // stateInd セッター・ゲッター
    // ============================================================

    /**
     * 長時間停車タイマーコールバックを設定する
     * コールバックの引数: (drawParams)
     */
    set onLongStop(func) { this._onLongStop = func; }

    set stateInd(ind) {
        // 長時間停車タイマーをリセット
        this.isStopping = false;
        if (this._stopTimerId) { clearTimeout(this._stopTimerId); this._stopTimerId = null; }

        // 範囲チェック・循環処理
        if (!this.isLoop) {
            if (ind < this.stationIndMin) ind = this.stationIndMin;
            if (ind > this.stationIndMax) ind = this.stationIndMax;
        } else {
            ind = ((ind % this.stateIndNum) + this.stateIndNum) % this.stateIndNum;
        }

        // 通過駅の「駅手前（まもなく）」状態をスキップ
        if (this.passList[Math.floor(ind / this.statesPerStation)] && ind % 3 === 1) {
            // 現在posState=0（線路上）なら前進、そうでなければ後退
            if (!this.posState) { ind++; }
            else               { ind--; }
        }

        this._stateInd = ind;

        // 停車中かつ終点でない場合、長時間停車タイマーを開始
        if (this.runState === 1 && !this.isTerminal) {
            this._stopTimerId = setTimeout(() => {
                this.isStopping = true;
                if (this._onLongStop) { this._onLongStop(); }
                this._stopTimerId = null;
            }, this.stopTimeLimit);
        }
    }

    get stateInd() { return this._stateInd; }

    // ============================================================
    // 状態ゲッター
    // ============================================================

    /** 現在駅のインデックス */
    get currentStationInd() {
        return Math.floor(this._stateInd / this.statesPerStation);
    }

    /**
     * 位置状態
     * 0: 線路上（つぎは）/ 1: 駅手前（まもなく）/ 2: 駅上（ただいま）
     */
    get posState() {
        return this._stateInd % this.statesPerStation;
    }

    /**
     * 走行状態
     * 0: 走行中（または通過中）/ 1: 停車中
     */
    get runState() {
        if (this.passList[this.currentStationInd]) return 0; // 通過駅→走行中
        if (this.posState === 2) return 1;                   // 駅上かつ停車駅→停車中
        return 0;
    }

    /**
     * 区間インデックス（getOperation用）
     * 現在の区間番号（駅間の番号）を返す
     */
    get sectionInd() {
        return Math.floor((this._stateInd - (this.statesPerStation - 1)) / this.statesPerStation);
    }

    /**
     * 終点かどうか
     * 現在位置以降に停車駅がなければtrue（非環状のみ）
     */
    get isTerminal() {
        if (!this.isLoop) {
            let hereId = this.currentStationInd;
            while (hereId <= this.stationNum - 1) {
                if (!this.passList[hereId]) break;
                hereId++;
            }
            return hereId === this.stationNum - 1;
        }
        return false;
    }

    // ============================================================
    // 移動メソッド
    // ============================================================

    /** 状態単位でstep分移動する */
    moveState(step) { this.stateInd += step; }

    /** 駅単位でstep分移動する */
    moveStation(step) { this.stateInd += this.statesPerStation * step; }

    // ============================================================
    // drawParams 生成
    // ============================================================

    /**
     * progressOutput（drawParamsのうちpage・langId以外の全フィールド）を返す
     */
    getParams() {
        const posState         = this.posState;
        const currentStationInd = this.currentStationInd;
        const isTerminal       = this.isTerminal;
        const operation        = this._resolveOperation();

        // drawParams.runState に変換（specの定義に合わせる）
        let drawRunState;
        if      (posState === 1)                          { drawRunState = 2; } // まもなく
        else if (posState === 2 && this.runState === 1)   { drawRunState = 0; } // ただいま停車中
        else                                              { drawRunState = 1; } // つぎは（走行中・通過中）

        const whole       = this._buildWhole(currentStationInd, posState, operation);
        const defaultLine = this._buildDefaultLine(currentStationInd, posState, operation);

        return {
            runState:          drawRunState,
            isStopping:        this.isStopping,
            isTerminal:        isTerminal,
            isDrawNextStation: !!(operation.isDrawStopText && !isTerminal),
            isDrawTime:        this._calcIsDrawTime(defaultLine, operation),
            isDrawLineName:    !!operation.isDispLineName,
            whole:             whole,
            defaultLine:       defaultLine,
            overLine:          this._buildOverLine(currentStationInd, posState),
            platform:          this._buildPlatform(currentStationInd, posState),
            transfers:         this._buildTransfers(currentStationInd, posState),
        };
    }

    // ============================================================
    // 内部ヘルパー: operation 解決
    // ============================================================

    _resolveOperation() {
        const raw = getOperationForSection(this.operationList, this.sectionInd);
        // isPass=falseの末尾駅を行先フォールバックとして取得
        const lastStop = [...this.stationList].reverse().find(s => !s.isPass)
            ?? this.stationList[this.stationList.length - 1];
        return applyOperationFallbacks(raw, lastStop);
    }

    // ============================================================
    // 内部ヘルパー: 数値アイコン生成
    // ============================================================

    /** stationオブジェクトからNumIconを生成する */
    _buildNumIconFromStation(station) {
        const hasNumber = !!(station.number);
        const parsed = parseStationNumber(station.number);
        return {
            isDraw:    hasNumber,
            presetKey: station.numIconPresetKey || "",
            symbol:    parsed.symbol,
            number:    parsed.number,
            color:     station.lineColor || ""
        };
    }

    /** operationの行先情報からNumIconを生成する */
    _buildNumIconFromOperation(operation) {
        const hasNumber = !!(operation.destinationNum);
        const parsed = parseStationNumber(operation.destinationNum);
        return {
            isDraw:    hasNumber,
            presetKey: operation.destinationNumIconKey || "",
            symbol:    parsed.symbol,
            number:    parsed.number,
            color:     operation.destinationColor || ""
        };
    }

    // ============================================================
    // 内部ヘルパー: whole 生成
    // ============================================================

    _buildWhole(currentStationInd, posState, operation) {
        // ヘッダーに表示する駅（現在位置以降の最初の停車駅）
        const displayStation = getNextStopStation(this.stationList, currentStationInd);
        const displayStationId = displayStation._id;

        // 次の停車駅名（フッター用）
        const nextStop = getNextStopStation(this.stationList, displayStationId + 1);
        const nextStopName = (displayStationId < this.stationList.length - 1)
            ? nextStop.name : "";

        // 進行方向: leftOrRight="left" → 1、それ以外 → 0
        const direction = operation.leftOrRight === "left" ? 1 : 0;

        return {
            trainType:        operation.trainType   || "普通",
            trainTypeEng:     operation.trainTypeEng || "Local",
            trainTypeSubText: operation.trainTypeSub    || "",
            trainTypeSubTextEng: operation.trainTypeSubEng || "",
            nowStation: {
                name:     displayStation.name,
                kana:     displayStation.kana,
                eng:      displayStation.eng,
                numIcon:  this._buildNumIconFromStation(displayStation),
                doorSide: displayStation.doorSide || "right"
            },
            nextStopName: nextStopName,
            viaText:    operation.direction || "", // HeaderController参照: viaText → operation.direction
            destination: {
                name: operation.destination    || "",
                kana: operation.destinationKana || "",
                eng:  operation.destinationEng  || "",
                numIcon: this._buildNumIconFromOperation(operation)
            },
            carNumber: Number(operation.carNumber) || 1,
            direction: direction
        };
    }

    // ============================================================
    // 内部ヘルパー: defaultLine 生成
    // ============================================================

    _buildDefaultLine(currentStationInd, posState, operation) {
        const stationFrameNum = this.stationFrameNum;

        // 表示ウィンドウの開始インデックスを決定
        // posState=2（駅上）: 現在駅を左端に, それ以外: 一つ前の駅を左端に
        let startInd;
        if (posState === 2) { startInd = currentStationInd; }
        else                { startInd = currentStationInd - 1; }

        // dispStationListとhereDrawPosを計算
        let { dispStationList, dispStationListStartInd, hereDrawPos } =
            this._buildDispStationList(startInd, currentStationInd, posState, stationFrameNum);

        // 駅数がstationFrameNum未満の場合は実際の駅数を使う
        const actualFrameNum = dispStationList.length;

        // 省略駅位置（波線）を計算し、dispStationListを更新
        // 実駅数がstationFrameNum未満の場合はウィンドウ外に駅がないためleapは不要
        const { lineLeapPosList } = actualFrameNum === stationFrameNum
            ? this._applyLineLeap(dispStationList, dispStationListStartInd, actualFrameNum)
            : { lineLeapPosList: [] };

        // 色リストを計算（長さ: actualFrameNum * 2）
        const colorList = this._calcColorList(dispStationList, hereDrawPos, actualFrameNum);

        // 所要時間リストを計算
        const timeList = this._calcTimeList(dispStationList, hereDrawPos, actualFrameNum);

        // 路線名割り当て: 表示路線の種類数に応じてroot/arrow/sectionsに振り分ける
        // dispStationListを左から走査し、連続するlineId変化を順番に収集する
        const orderedLineIds = [];
        for (const st of dispStationList) {
            if (!orderedLineIds.length || orderedLineIds[orderedLineIds.length - 1] !== st.lineId) {
                orderedLineIds.push(st.lineId);
            }
        }
        const lineCount = orderedLineIds.length;
        const _lineInfo = id => ({
            name:  this._getLineField(id, "name"),
            eng:   this._getLineField(id, "eng"),
            color: this._getLineField(id, "color")
        });
        const emptyLineInfo = { name: "", eng: "", color: "" };

        let rootLineInfo  = emptyLineInfo;
        let arrowLineInfo = emptyLineInfo;
        const sectionLineInfos = new Array(actualFrameNum - 1).fill(null);

        if (lineCount >= 2) {
            // 2路線以上: rootに最初の路線名、arrowに最後の路線名
            rootLineInfo  = _lineInfo(orderedLineIds[0]);
            arrowLineInfo = _lineInfo(orderedLineIds[lineCount - 1]);

            if (lineCount >= 3) {
                // 3路線以上: 中間路線を各路線内で最もroot側のsectionに配置
                // type=1（波線section）には路線名を入れない
                for (let k = 1; k <= lineCount - 2; k++) {
                    const lineId = orderedLineIds[k];
                    const firstIdx = dispStationList.findIndex(s => s.lineId === lineId);
                    if (firstIdx < 0 || firstIdx >= actualFrameNum - 1) continue;
                    if (!lineLeapPosList.includes(firstIdx + 1)) {
                        sectionLineInfos[firstIdx] = _lineInfo(lineId);
                    }
                }
            }
        }

        // sections 構築
        const sections = [];
        for (let i = 0; i < actualFrameNum - 1; i++) {
            const isLeap = lineLeapPosList.includes(i + 1);
            const lineInfo = sectionLineInfos[i] || emptyLineInfo;
            sections.push({
                color1:        colorList[i * 2 + 1],
                color2:        colorList[i * 2 + 2],
                type:          isLeap ? 1 : 0,
                lineName:      lineInfo.name,
                lineNameEng:   lineInfo.eng,
                lineNameColor: lineInfo.color
            });
        }

        // rootSection（後方端）
        // dispStation[0]より前に停車駅があればtype=1（接続あり）、なければtype=0
        const firstStation = dispStationList[0];
        const hasStopBeforeFirst = this.stationList.slice(0, firstStation._id).some(s => !s.isPass);
        const rootSection = {
            color:         colorList[0],
            type:          hasStopBeforeFirst ? 1 : 0,
            lineName:      rootLineInfo.name,
            lineNameEng:   rootLineInfo.eng,
            lineNameColor: rootLineInfo.color,
            isConnect:     false
        };

        // arrowSection（前方端）
        // dispStation[最後]より後に停車駅があればtype=1（接続あり）、なければtype=0
        const lastStation = dispStationList[dispStationList.length - 1];
        const hasStopAfterLast = this.stationList.slice(lastStation._id + 1).some(s => !s.isPass);
        const arrowSection = {
            color:         colorList[colorList.length - 1],
            type:          hasStopAfterLast ? 1 : 0,
            lineName:      arrowLineInfo.name,
            lineNameEng:   arrowLineInfo.eng,
            lineNameColor: arrowLineInfo.color,
            isConnect:     false
        };

        // drawPos: スロット単位（1駅 = 2スロット）
        const drawPos = hereDrawPos * 2;

        // dispStationList を drawParams 形式に変換
        // 駅間にいる場合は出発済みの駅Aもgrayにするため Math.ceil を使う
        const isGrayThreshold = Math.ceil(hereDrawPos);
        const drawDispStationList = dispStationList.map((station, i) => {
            const transferIds = this._parseTransferIds(station.transfers);
            return {
                name:            station.name,
                kana:            station.kana || "",
                eng:             station.eng  || "",
                numIcon:         this._buildNumIconFromStation(station),
                numIconNext:     { isDraw: false, presetKey: "", symbol: "", number: "", color: "" },
                numIconType:     station.lineNumberType || "0",
                stationIconType: station.isPass ? "1" : "0",
                sectionTime:     (timeList[i] >= 0) ? String(timeList[i]) : "",
                transfersText:    transferIds.map(id => this._formatTransferText(id, "name")),
                transfersTextEng: transferIds.map(id => this._formatTransferText(id, "eng")),
                isGray:          i < isGrayThreshold || station.isPass,
                transferText:    "",
                transferTextEng: ""
            };
        });

        return {
            sections:        sections,
            rootSection:     rootSection,
            arrowSection:    arrowSection,
            drawPos:         drawPos,
            stationFrameNum: stationFrameNum,  // 常に固定値8（Drawer側でこの値を基準に右詰め配置する）
            dispStationList: drawDispStationList
        };
    }

    /**
     * 表示駅リスト（dispStationList）と現在位置オフセット（hereDrawPos）を構築する
     * DefaultLineController.extractDrawParams()の移植
     */
    _buildDispStationList(startInd, currentStationInd, posState, stationFrameNum) {
        let dispStationList = [];
        let dispStationListStartInd;
        let hereDrawPos;

        if (!this.isLoop) {
            if (startInd < this.stationList.length - (stationFrameNum - 1)) {
                // 終点近くでない場合: 現在駅（または一つ前）を左端として表示
                dispStationListStartInd = startInd;
                for (let i = startInd; i < startInd + stationFrameNum; i++) {
                    dispStationList.push(this.stationList[i]);
                }
                hereDrawPos = 0;
                // 駅間にいる場合は半駅分進める
                if (posState === 0 || posState === 1) { hereDrawPos += 0.5; }
            } else {
                // 終点近くの場合: 末尾stationFrameNum駅を表示
                // 駅数がstationFrameNum未満の場合はインデックスが負にならないようclampする
                dispStationListStartInd = Math.max(0, this.stationList.length - stationFrameNum);
                for (let i = dispStationListStartInd; i < this.stationList.length; i++) {
                    dispStationList.push(this.stationList[i]);
                }
                hereDrawPos = currentStationInd - dispStationListStartInd;
                // 駅間にいる場合は半駅分戻す
                if (posState === 0 || posState === 1) { hereDrawPos -= 0.5; }
            }
        } else {
            // 環状運転: startIndから循環的にstationFrameNum駅を取得
            dispStationListStartInd = startInd;
            for (let i = 0; i < stationFrameNum; i++) {
                dispStationList.push(getCircularItem(this.stationList, startInd + i));
            }
            hereDrawPos = 0;
            if (posState === 0 || posState === 1) { hereDrawPos += 0.5; }
        }

        return { dispStationList, dispStationListStartInd, hereDrawPos };
    }

    /**
     * 表示駅リストに省略（波線）処理を適用する
     * 後方に停車駅が少ない場合、末尾を省略してより先の停車駅を表示する
     * DefaultLineController.extractDrawParams()の移植
     */
    _applyLineLeap(dispStationList, dispStationListStartInd, stationFrameNum) {
        const minVisibleNum = 2; // 必ず表示する停車駅の最小数
        const lineLeapPosList = [];

        // 前方部分の停車駅数をカウント
        let stopCnt = 0;
        let ind;
        for (ind = 1; ind < stationFrameNum - minVisibleNum; ind++) {
            if (!dispStationList[ind].isPass) { stopCnt++; }
        }

        // 全体リスト上の参照インデックス
        let listInd = dispStationListStartInd + ind;
        let needNum = 1;

        // 停車駅数が不足している間、省略して先の駅に置き換える
        while (stopCnt < minVisibleNum && listInd < this.stationList.length) {
            dispStationList[ind] = this.stationList[listInd];
            if (!dispStationList[ind].isPass) { stopCnt++; }

            // 必要数に達していなければ波線マークを追加し、次の停車駅まで探索
            if (stopCnt < needNum) {
                lineLeapPosList.push(ind);
                while (listInd < this.stationList.length - 1 &&
                       this.stationList[listInd].isPass) {
                    listInd++;
                }
                dispStationList[ind] = this.stationList[listInd];
                stopCnt++;
            }
            ind++;
            needNum++;
            listInd++;
        }

        return { lineLeapPosList };
    }

    /**
     * セクションの色リストを計算する
     * 長さ: stationFrameNum * 2
     *   [0]: 後方端色
     *   [1..N-2]: 各駅間の左右半分の色
     *   [N-1]: 前方端色
     */
    _calcColorList(dispStationList, hereDrawPos, stationFrameNum) {
        const colorList = [];

        // 後方端は常にグレー（通過済み）
        colorList.push("rgb(221, 221, 221)");

        for (let i = 0; i < (stationFrameNum - 1) * 2; i++) {
            // 現在位置より後方はグレー
            if (i < hereDrawPos * 2) {
                colorList.push("rgb(221, 221, 221)");
                continue;
            }
            if (i % 2 === 0) {
                // 左半分: 当該表示駅の色
                colorList.push(dispStationList[Math.floor(i / 2)].lineColor || "rgb(200,200,200)");
            } else {
                // 右半分: 次の表示駅の手前にある全体リスト上の駅の色（路線色変化対応）
                const nextDispStation = dispStationList[Math.floor(i / 2) + 1];
                const prevId = ((nextDispStation._id - 1) + this.stationList.length) % this.stationList.length;
                const prevStation = this.stationList[prevId];
                colorList.push(
                    (prevStation?.lineColor) || nextDispStation.lineColor || "rgb(200,200,200)"
                );
            }
        }

        // 前方端: 末尾表示駅の色
        colorList.push(dispStationList[dispStationList.length - 1].lineColor || "rgb(200,200,200)");

        return colorList;
    }

    /**
     * 現在位置から各表示駅までの累積所要時間を計算する
     * DefaultLineController.extractDrawParams()の移植
     * @returns {number[]} 各表示駅への累積時間（現在位置より前または現在駅は-1）
     */
    _calcTimeList(dispStationList, hereDrawPos, stationFrameNum) {
        const timeList = [];
        const nowInd = Math.floor(hereDrawPos); // 現在位置の基準となる表示駅インデックス

        // 現在位置より前（または現在地）の駅は時間なし
        for (let i = 0; i <= nowInd; i++) { timeList.push(-1); }

        // 現在位置から各表示駅への累積時間を計算
        let buf = 0;
        let listInd = dispStationList[nowInd]._id;
        let dispInd = nowInd;

        while (dispInd < stationFrameNum - 1 && listInd < this.stationList.length - 1) {
            // sectionTimeが空(NaN)の場合はNaNを伝播させ、累積時間を未確定扱いにする
            buf += parseInt(this.stationList[listInd].sectionTime);
            listInd++;

            // 全体リストのlistIndが次の表示駅の_idに達したら時間を記録
            if (dispStationList[dispInd + 1]._id === listInd) {
                timeList.push(Number.isNaN(buf) ? -1 : buf);
                dispInd++;
            }
        }

        return timeList;
    }

    /**
     * 路線名変化リストを計算する（セクションごとの路線名表示用）
     * DefaultLineController.extractDrawParams()の lineNameList 相当
     * @returns {Array} 各station位置の路線名情報（変化なし=null）
     */
    _calcLineNameList(dispStationList, hereDrawPos, stationFrameNum) {
        const lineNameList = new Array(stationFrameNum).fill(null);
        let lineIdBuf = dispStationList[0].lineId;
        let multiFlag = false;

        for (let i = 0; i < stationFrameNum; i++) {
            if (lineIdBuf !== dispStationList[i].lineId) {
                // 現在位置より前方の区間のみ路線名変化を記録
                if (Math.floor(hereDrawPos) < i) {
                    lineNameList[i] = {
                        name:  this._getLineField(dispStationList[i].lineId, "name"),
                        eng:   this._getLineField(dispStationList[i].lineId, "eng"),
                        color: this._getLineField(dispStationList[i].lineId, "color")
                    };
                    multiFlag = true;
                }
            }
            lineIdBuf = dispStationList[i].lineId;
        }

        // 複数路線の場合: 先頭に最初の路線名を追加し、末尾に最後の路線名を移動
        if (multiFlag) {
            lineNameList[0] = {
                name:  this._getLineField(dispStationList[0].lineId, "name"),
                eng:   this._getLineField(dispStationList[0].lineId, "eng"),
                color: this._getLineField(dispStationList[0].lineId, "color")
            };
            // 末尾以外の最後の非nullエントリを末尾へ移動
            for (let i = lineNameList.length - 2; 0 <= i; i--) {
                if (lineNameList[i] !== null) {
                    lineNameList[lineNameList.length - 1] = lineNameList[i];
                    lineNameList[i] = null;
                    break;
                }
            }
        }

        return lineNameList;
    }

    // ============================================================
    // 内部ヘルパー: overLine 生成
    // ============================================================

    /**
     * overLine（全体路線図）データを生成する
     * defaultLineと同じスライディングウィンドウ方式で駅リストを構築する
     */
    _buildOverLine(currentStationInd, posState) {
        // stationFrameNumは常に固定値（Drawer側でこの値を基準に右詰め配置する）
        const stationFrameNum = this.overLineFrameNum;

        // 表示ウィンドウ開始インデックス（defaultLineと同じ計算）
        const startInd = posState === 2 ? currentStationInd : currentStationInd - 1;

        // _buildDispStationListでウィンドウ相対のhereDrawPosを取得（絶対値ではない）
        const { dispStationList, dispStationListStartInd, hereDrawPos } =
            this._buildDispStationList(startInd, currentStationInd, posState, stationFrameNum);

        const actualCount = dispStationList.length;
        const drawPos = hereDrawPos * 2;

        // 駅間にいる場合は出発済みの駅Aもgrayにするため Math.ceil を使う
        const isGrayThreshold = Math.ceil(hereDrawPos);
        const grayColor = "rgb(221, 221, 221)";

        // 後方端セクション
        // dispStation[0]より前に停車駅があればtype=1、なければtype=0（defaultLineと同じ処理）
        const firstStation = dispStationList[0];
        const hasStopBeforeFirst = this.stationList.slice(0, firstStation._id).some(s => !s.isPass);
        const rootSection = {
            color:         grayColor,
            type:          hasStopBeforeFirst ? 1 : 0,
            lineName:      this._getLineField(firstStation.lineId, "name"),
            lineNameEng:   this._getLineField(firstStation.lineId, "eng"),
            lineNameColor: this._getLineField(firstStation.lineId, "color"),
            isConnect:     false
        };

        // 前方端セクション
        // dispStation[最後]より後に停車駅があればtype=1、なければtype=0（defaultLineと同じ処理）
        const lastStation = dispStationList[actualCount - 1];
        const hasStopAfterLast = this.stationList.slice(lastStation._id + 1).some(s => !s.isPass);
        const arrowSection = {
            color:         lastStation.lineColor || "rgb(200,200,200)",
            type:          hasStopAfterLast ? 1 : 0,
            lineName:      this._getLineField(lastStation.lineId, "name"),
            lineNameEng:   this._getLineField(lastStation.lineId, "eng"),
            lineNameColor: this._getLineField(lastStation.lineId, "color"),
            isConnect:     false
        };

        // 実駅間のsections（actualCount - 1 個）
        // color1・color2ともに駅iの色を使う（defaultLineと同じ：路線色変化は駅位置で発生）
        const hereDrawPosX2 = hereDrawPos * 2;
        const sections = [];
        for (let i = 0; i < actualCount - 1; i++) {
            const stationColor = dispStationList[i].lineColor || "rgb(200,200,200)";
            const c1 = (i * 2 + 1) <= hereDrawPosX2 ? grayColor : stationColor;
            const c2 = (i * 2 + 2) <= hereDrawPosX2 ? grayColor : stationColor;
            sections.push({
                color1:        c1,
                color2:        c2,
                type:          0,
                lineName:      "",
                lineNameEng:   "",
                lineNameColor: ""
            });
        }

        // ウィンドウ相対hereDrawPosで積算時間を計算（defaultLineと同じ処理）
        const timeList = this._calcTimeList(dispStationList, hereDrawPos, actualCount);

        // dispStationList を drawParams 形式に変換
        const drawDispStationList = dispStationList.map((station, i) => ({
            name:            station.name,
            eng:             station.eng || "",
            numIcon:         this._buildNumIconFromStation(station),
            numIconSub:      { isDraw: false, presetKey: "", symbol: "", number: "", color: "" },
            numIconType:     station.lineNumberType || "0",
            stationIconType: station.isPass ? "1" : "0",
            sectionTime:     (timeList[i] >= 0) ? String(timeList[i]) : "",
            isGray:          i < isGrayThreshold || station.isPass
        }));

        return {
            stationFrameNum: stationFrameNum,  // 常に固定値21
            drawPos:         drawPos,
            rootSection:     rootSection,
            arrowSection:    arrowSection,
            sections:        sections,
            dispStationList: drawDispStationList
        };
    }

    // ============================================================
    // 内部ヘルパー: platform 生成
    // ============================================================

    /**
     * platform（乗車位置案内）データを生成する
     */
    _buildPlatform(currentStationInd, posState) {
        const displayStation = getNextStopStation(this.stationList, currentStationInd);
        const transferIds = this._parseTransferIds(displayStation.transfers);

        // 全乗換路線を1ホームとしてまとめる
        const transferItems = transferIds
            .filter(id => this.lineDict[id])
            .map(id => {
                const line = this.lineDict[id];
                // lineIconKeyは :key: の形式で埋め込む
                const lineIcon = line.lineIconKey ? `:${line.lineIconKey}:` : "";
                return { lineIcon, name: line.name || "", eng: line.eng || "" };
            });

        return {
            transfers:         transferItems.length > 0 ? [transferItems] : [[]],
            transferCountLineP: "",
            otherLineInd:      "",
            slotNum:           "0",
            leftSlotInd:       "0",
            otherCarNum:       "0",
            otherLeftSlotInd:  "0"
        };
    }

    // ============================================================
    // 内部ヘルパー: transfers 生成
    // ============================================================

    /**
     * transfers（乗換案内）データを生成する
     * 各乗換路線を個別行として配置する
     */
    _buildTransfers(currentStationInd, posState) {
        const displayStation = getNextStopStation(this.stationList, currentStationInd);
        const transferIds = this._parseTransferIds(displayStation.transfers);

        // 各路線を1行ずつ（二次元配列の外側 = 行数）
        const transferList = transferIds
            .filter(id => this.lineDict[id])
            .map(id => {
                const line = this.lineDict[id];
                // lineIconKeyは :key: の形式で埋め込む
                const lineIcon = line.lineIconKey ? `:${line.lineIconKey}:` : "";
                return [{ lineIcon, name: line.name || "", eng: line.eng || "" }];
            });

        return { transferList };
    }

    // ============================================================
    // 内部ヘルパー: 共通
    // ============================================================

    /**
     * isDrawTimeを計算する
     * operation.isDispTimeがtrueかつ有効な所要時間が存在する場合のみtrue
     */
    _calcIsDrawTime(defaultLine, operation) {
        if (!operation.isDispTime) return false;
        // sectionTimeが空でない駅が一つでもあればtrue
        return defaultLine.dispStationList.some(s => s.sectionTime !== "");
    }

    /**
     * lineDictから指定フィールドを取得する
     * @param {string} lineId
     * @param {"name"|"eng"|"color"} field
     */
    _getLineField(lineId, field) {
        return this.lineDict?.[lineId]?.[field] || "";
    }

    /**
     * station.transfers（スペース区切りのlineId文字列）をIDの配列に変換する
     * @param {string} transfersStr
     * @returns {string[]}
     */
    _parseTransferIds(transfersStr) {
        if (!transfersStr) return [];
        return transfersStr.split(" ").filter(id => id);
    }

    /**
     * 乗換路線テキストを生成する
     * 形式: lineIconKey + lineName（例: ":M:京浜東北線"）
     * @param {string} lineId
     * @param {"name"|"eng"} field
     */
    _formatTransferText(lineId, field) {
        const line = this.lineDict[lineId];
        if (!line) return "";
        // lineIconKeyは :key: の形式で埋め込む（例: ":I_tokyu:東横線"）
        const iconPart = line.lineIconKey ? `:${line.lineIconKey}:` : "";
        return iconPart + (line[field] || "");
    }
}
