// ============================================================
// ProgressController
// 列車の路線上の位置・走行状態・長時間停車を管理し、
// drawParamsのうち page・langId 以外の全フィールドを生成する
// ============================================================

// infoMessage ページ分割定数（1ページの最大行数 / 1行の最大文字数）
const INFO_MSG_MAX_LINE_NUM = 6;
const INFO_MSG_MAX_CHAR_NUM = 33;

class ProgressController {
    /**
     * @param {object} progressParams
     * @param {object[]}  progressParams.stationList    - 全駅リスト
     * @param {object}    progressParams.operationDict  - 運用辞書（ID→operationType）
     * @param {object}    progressParams.info           - 全体設定（isLoop等）
     * @param {object}    progressParams.lineDict       - 路線辞書
     * @param {object}    progressParams.iconDict       - アイコン辞書
     */
    constructor(progressParams) {
        this.stationList   = progressParams.stationList;
        // 旧形式（operationList配列）との後方互換: 辞書形式に変換する
        if (progressParams.operationDict) {
            this.operationDict = progressParams.operationDict;
        } else if (progressParams.operationList) {
            this.operationDict = {};
            progressParams.operationList.forEach((op, i) => { this.operationDict[String(i)] = op; });
        } else {
            this.operationDict = {};
        }
        this.info          = progressParams.info;
        this.lineDict      = progressParams.lineDict;
        this.iconDict      = progressParams.iconDict;
        // メッセージ設定（type=3条件判定用）
        this.message       = progressParams.message ?? {};

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
     * 始発かどうか
     * 駅上かつ停車中（posState=2, runState=1）のときのみ判定し、
     * 現在駅より前に停車駅がなければtrue（非環状のみ）。
     * 走行中・通過中は常にfalse。
     */
    get isStart() {
        if (!this.isLoop) {
            if (this.posState !== 2 || this.runState !== 1) return false;
            for (let i = this.currentStationInd - 1; i >= 0; i--) {
                if (!this.passList[i]) return false;
            }
            return true;
        }
        return false;
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
     * @param {number} [infoMsgNowPage=0] - 現在表示中の infoMessage サブページ番号（0-indexed）
     */
    getParams(infoMsgNowPage = 0) {
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
            // 種別変更案内（次運用が存在しない場合はnull）
            trainTypeChange:   this._buildTrainTypeChange(),
            // メッセージ: 現在サブページのテキストと総ページ数を格納する
            message:           this._buildMessageOutput(infoMsgNowPage),
            pages:             this._buildPagesOutput(infoMsgNowPage),
            // PageControllerに渡すページ切替情報
            pageState:         this._computePageState(),
            conditionData:     this._buildConditionData(),
        };
    }

    // ============================================================
    // 内部ヘルパー: pageState・conditionData 生成
    // ============================================================

    /**
     * 現在の走行状態からpageState（0〜5）を求める。
     * 定義外の組み合わせは -1（無効）を返す。
     */
    _computePageState() {
        const posState   = this.posState;
        const runState   = this.runState;
        const isTerminal = this.isTerminal;
        const isStart    = this.isStart;
        if (posState === 2 && runState === 1 && !isTerminal && isStart)  return 0; // 始発停車
        if (posState === 0 && runState === 0)                            return 1; // 走行（isTerminal無関係）
        if (posState === 1 && runState === 0)                            return 2; // 直前（isTerminal無関係）
        if (posState === 2 && runState === 1 && !isTerminal && !isStart) return 3; // 停車
        if (posState === 2 && runState === 0 && !isTerminal && !isStart) return 4; // 通過
        if (posState === 2 && runState === 1 && isTerminal  && !isStart) return 5; // 終点停車
        return -1;
    }

    /**
     * ページ表示条件の判定に使うデータを生成する。
     * hasTransfers: 次停車駅に乗換情報があるかどうか（pageType=1の条件）
     * hasNextOperation: 次運用が存在しかつ種別が異なるかどうか（pageType=2の条件）
     * hasMessage: settings.message.textが空でないかどうか（pageType=3の条件）
     */
    _buildConditionData() {
        const displayStation = getNextStopStation(this.stationList, this.currentStationInd);

        // 現在の運用の種別（rawのoperationDict値を使用）
        // posState=0,1（走行中・まもなく）は前駅、posState=2（ただいま）は現在駅を参照する
        const refInd = this.posState !== 2 ? Math.max(0, this.currentStationInd - 1) : this.currentStationInd;
        const refOpId = this.stationList[refInd]?.operationId ?? '';
        const currentRawOp = (refOpId && this.operationDict[refOpId]) ? this.operationDict[refOpId] : {};

        // 次運用との種別比較（どちらかが異なればhasNextOperation=true）
        const nextOpResult = this._findNextOperation();
        let hasNextOperation = false;
        if (nextOpResult) {
            const { nextOperation } = nextOpResult;
            hasNextOperation = (currentRawOp.trainType    !== nextOperation.trainType ||
                                currentRawOp.trainTypeEng !== nextOperation.trainTypeEng);
        }

        return {
            hasTransfers:     !!(displayStation?.transfers?.length),
            hasNextOperation,
            hasMessage:       !!(this.message?.text),
            // PageController が infoMessage サブページを判断するために使用する
            infoMsgTotalPage: this._buildInfoMsgPages().length,
        };
    }

    /**
     * 現在の運用からoperationIdが変わる最初の駅を探して次運用情報を返す
     * posState=0（走行中）は前駅を基準、それ以外は現在駅を基準として前方を走査する
     * @returns {{ nextOperation: object, changeStation: object, changeStationInd: number } | null}
     */
    _findNextOperation() {
        // 参照インデックス: 走行中・まもなく(posState=0,1)は前駅、ただいま(posState=2)は現在駅
        const refInd = this.posState !== 2 ? Math.max(0, this.currentStationInd - 1) : this.currentStationInd;
        const refOperationId = this.stationList[refInd]?.operationId ?? '';

        // refIndより前方の駅を順に走査し、operationIdが変わる最初の駅を探す
        for (let i = refInd + 1; i < this.stationList.length; i++) {
            const st = this.stationList[i];
            const stOpId = st.operationId ?? '';
            if (stOpId !== refOperationId) {
                // operationIdが変わる駅を発見: 対応する運用を取得する
                const nextOp = (stOpId && this.operationDict[stOpId]) ? this.operationDict[stOpId] : null;
                if (!nextOp) return null;
                return { nextOperation: nextOp, changeStation: st, changeStationInd: i };
            }
        }
        return null;
    }

    /**
     * trainTypeChange（種別変更案内）データを生成する
     * 次運用が存在しない場合は null を返す
     * @returns {{ rootType, arrowType, changeStation, rootLine, arrowLine } | null}
     */
    _buildTrainTypeChange() {
        const nextOpResult = this._findNextOperation();
        if (!nextOpResult) return null;

        const { nextOperation, changeStation, changeStationInd } = nextOpResult;
        const operation = this._resolveOperation();

        // 参照駅（現在区間の路線取得に使用）: 走行中・まもなく(posState=0,1)は前駅、ただいま(posState=2)は現在駅
        const refInd = this.posState !== 2 ? Math.max(0, this.currentStationInd - 1) : this.currentStationInd;
        const refStation = this.stationList[refInd];

        // rootSection: 現在の区間色（posState=2停車中は次区間=currentStation.lineId、それ以外は前駅.lineId）
        const rootSectionInd = this.posState === 2 ? this.currentStationInd : Math.max(0, this.currentStationInd - 1);
        const rootSectionColor = this._getLineField(this.stationList[rootSectionInd]?.lineId, "color");

        // leftSection: 現在の運用の最後の区間 = 種別変更駅直前の駅のlineId
        const leftSectionStation = changeStationInd > 0 ? this.stationList[changeStationInd - 1] : changeStation;
        const leftSectionColor = this._getLineField(leftSectionStation?.lineId, "color");

        // arrowSection・rightSection: 次運用最初の区間 = 種別変更駅のlineId
        const arrowRightColor = this._getLineField(changeStation.lineId, "color");

        return {
            // 現在の種別
            rootType: {
                name:      operation.trainType         || "",
                eng:       operation.trainTypeEng      || "",
                backColor: operation.trainTypeBackColor || ""
            },
            // 次の種別
            arrowType: {
                name:      nextOperation.trainType         || "",
                eng:       nextOperation.trainTypeEng      || "",
                backColor: nextOperation.trainTypeBackColor || ""
            },
            // 種別が変わる駅
            changeStation: {
                name: changeStation.name || "",
                eng:  changeStation.eng  || ""
            },
            // 現在区間の路線名
            rootLine: {
                name: this._getLineField(refStation?.lineId, "name"),
                eng:  this._getLineField(refStation?.lineId, "eng")
            },
            // 次運用最初の区間の路線名
            arrowLine: {
                name: this._getLineField(changeStation.lineId, "name"),
                eng:  this._getLineField(changeStation.lineId, "eng")
            },
            // rootLineとarrowLineのいずれかのフィールドが異なるときtrue（路線名表示判定に使用）
            isDrawLinename: this._getLineField(refStation?.lineId, "name") !== this._getLineField(changeStation.lineId, "name") ||
                            this._getLineField(refStation?.lineId, "eng")  !== this._getLineField(changeStation.lineId, "eng"),
            // 現在の区間色（停車中なら次区間）
            rootSection:  { color: rootSectionColor },
            // 次運用最初の区間色（arrowSectionとrightSectionは同値）
            arrowSection: { color: arrowRightColor },
            // 現在の運用の最後の区間色
            leftSection:  { color: leftSectionColor },
            rightSection: { color: arrowRightColor }
        };
    }

    // ============================================================
    // 内部ヘルパー: operation 解決
    // ============================================================

    _resolveOperation() {
        // 走行中・まもなく（posState=0,1）は前駅の operationId を使用し、ただいま（posState=2）のみ現在駅に切り替える
        let operationId;
        if (this.posState !== 2) {
            const prevInd = Math.max(0, this.currentStationInd - 1);
            operationId = this.stationList[prevInd]?.operationId ?? '';
        } else {
            operationId = this.stationList[this.currentStationInd]?.operationId ?? '';
        }
        const raw = (operationId && this.operationDict[operationId]) ? this.operationDict[operationId] : null;
        // isPass=falseの末尾駅を行先フォールバックとして取得
        const lastStop = [...this.stationList].reverse().find(s => !s.isPass)
            ?? this.stationList[this.stationList.length - 1];
        return applyOperationFallbacks(raw, lastStop);
    }

    // ============================================================
    // 内部ヘルパー: 数値アイコン生成
    // ============================================================

    /**
     * stationオブジェクトからNumIconを生成する。
     * field で参照するサブオブジェクトを切り替える（"numIcon": 今までの路線 / "numIconNext": 次の路線）
     */
    _buildNumIconFromStation(station, field = "numIcon") {
        const ni = station[field] || {};
        const hasNumber = !!(ni.number);
        // color には auto/manual を問わず有効色が書き込まれているため直接参照する
        return {
            isDraw:    hasNumber,
            presetKey: ni.presetKey || "",
            symbol:    ni.symbol    || "",
            number:    ni.number    || "",
            color:     ni.color     || ""
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
            trainTypeBackColor: operation.trainTypeBackColor || "",
            isStart: this.isStart,
            nowStation: {
                name:     displayStation.name,
                kana:     displayStation.kana,
                eng:      displayStation.eng,
                numIcon:  this._buildNumIconFromStation(displayStation),
                doorSide: displayStation.doorSide === "left" ? 1 : 0
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
            direction: direction,
            headerNumberingType: displayStation.headerNumberingType || "0"
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

        const _lineInfo = id => ({
            name:  this._getLineField(id, "name"),
            eng:   this._getLineField(id, "eng"),
            color: this._getLineField(id, "color")
        });
        const emptyLineInfo = { name: "", eng: "", color: "" };

        // グレーアウトされていないセクションの開始インデックス（hereDrawPos < i+1 を満たす最小の i）
        // Math.floor(hereDrawPos) が整数・小数いずれでも正しく機能する
        const nonGrayStartSection = Math.floor(hereDrawPos);

        // 非グレー範囲の表示駅（始端セクションの root 側駅 〜 末端駅）
        const nonGrayStations = dispStationList.slice(nonGrayStartSection);

        // 非グレー範囲内の路線を root 側から順に収集する（連続同一路線は1エントリにまとめる）
        const nonGrayOrderedLineIds = [];
        for (const st of nonGrayStations) {
            if (!nonGrayOrderedLineIds.length || nonGrayOrderedLineIds[nonGrayOrderedLineIds.length - 1] !== st.lineId) {
                nonGrayOrderedLineIds.push(st.lineId);
            }
        }
        const nonGrayLineCount = nonGrayOrderedLineIds.length;

        // 路線名割り当て: 非グレー区間に複数路線がある場合のみ割り当てる
        let rootLineInfo  = emptyLineInfo;
        let arrowLineInfo = emptyLineInfo;
        const sectionLineInfos = new Array(actualFrameNum - 1).fill(null);

        if (nonGrayLineCount >= 2) {
            // 一番手前側（root 寄り）の路線名を rootSection へ
            rootLineInfo  = _lineInfo(nonGrayOrderedLineIds[0]);
            // 一番奥側（arrow 寄り）の路線名を arrowSection へ
            arrowLineInfo = _lineInfo(nonGrayOrderedLineIds[nonGrayLineCount - 1]);

            if (nonGrayLineCount >= 3) {
                // 中間路線: 各路線が非グレー範囲内で最初に現れるセクションに配置する
                // type=1（波線section）には路線名を入れない
                for (let k = 1; k <= nonGrayLineCount - 2; k++) {
                    const lineId = nonGrayOrderedLineIds[k];
                    const firstIdx = dispStationList.findIndex((s, idx) => idx >= nonGrayStartSection && s.lineId === lineId);
                    if (firstIdx < 0 || firstIdx >= actualFrameNum - 1) continue;
                    if (!lineLeapPosList.includes(firstIdx + 1)) {
                        sectionLineInfos[firstIdx] = _lineInfo(lineId);
                    }
                }
            }
        }

        // sections 構築（grayed セクションは sectionLineInfos が null のため自動的に空になる）
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
            // transferText/transferTextEngが設定されていればそれを優先し、なければtransfersから生成する
            const transferItems = this._getTransferItems(station.transfers);
            const transfersText = station.transferText
                ? station.transferText.split("\n").filter(line => line !== "")
                : transferItems.map(item => item.lineIcon + item.name);
            const transfersTextEng = station.transferTextEng
                ? station.transferTextEng.split("\n").filter(line => line !== "")
                : transferItems.map(item => item.lineIcon + item.eng);
            return {
                name:            station.name,
                kana:            station.kana || "",
                eng:             station.eng  || "",
                numIcon:         this._buildNumIconFromStation(station),
                // 路線をまたぐ駅の2つ目のナンバリング（number が空の駅は isDraw が false になり描画されない）
                numIconNext:     this._buildNumIconFromStation(station, "numIconNext"),
                numIconType:     station.lineNumberType || "0",
                stationIconType: station.isPass ? "1" : "0",
                sectionTime:     (timeList[i] >= 0) ? String(timeList[i]) : "",
                transfersText,
                transfersTextEng,
                isGray:          i < isGrayThreshold || station.isPass,
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
                // 左半分: 当該表示駅の次区間路線色
                const s = dispStationList[Math.floor(i / 2)];
                colorList.push(this._getLineField(s.lineId, "color") || "rgb(200,200,200)");
            } else {
                // 右半分: 次の表示駅の手前にある全体リスト上の駅の色（路線色変化対応）
                const nextDispStation = dispStationList[Math.floor(i / 2) + 1];
                const prevId = ((nextDispStation._id - 1) + this.stationList.length) % this.stationList.length;
                const prevStation = this.stationList[prevId];
                colorList.push(
                    this._getLineField(prevStation?.lineId, "color") ||
                    this._getLineField(nextDispStation.lineId, "color") ||
                    "rgb(200,200,200)"
                );
            }
        }

        // 前方端: 末尾表示駅の次区間路線色
        const lastDisp = dispStationList[dispStationList.length - 1];
        colorList.push(this._getLineField(lastDisp.lineId, "color") || "rgb(200,200,200)");

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
            color:         this._getLineField(lastStation.lineId, "color") || "rgb(200,200,200)",
            type:          hasStopAfterLast ? 1 : 0,
            lineName:      this._getLineField(lastStation.lineId, "name"),
            lineNameEng:   this._getLineField(lastStation.lineId, "eng"),
            lineNameColor: this._getLineField(lastStation.lineId, "color"),
            isConnect:     false
        };

        // 実駅間のsections（actualCount - 1 個）
        // color1・color2ともに駅iの次区間路線色を使う（defaultLineと同じ：路線色変化は駅位置で発生）
        const hereDrawPosX2 = hereDrawPos * 2;
        const sections = [];
        for (let i = 0; i < actualCount - 1; i++) {
            const stationColor = this._getLineField(dispStationList[i].lineId, "color") || "rgb(200,200,200)";
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
     * transferListPlatformが設定されていればそれを解析してtransfersを生成する。
     * 空の場合は全乗換路線を1行にまとめる（transferListTransfersと同形式）。
     */
    _buildPlatform(currentStationInd, posState) {
        const displayStation = getNextStopStation(this.stationList, currentStationInd);

        let transfers;
        if (displayStation.transferListPlatform) {
            // 改行で行分割し、各行をスペース区切りのtransfersインデックスとして解析する
            const rawTransfers = displayStation.transfers;
            transfers = displayStation.transferListPlatform
                .split("\n")
                .map(rowStr => {
                    return rowStr.split(" ")
                        .map(token => token.trim())
                        .filter(token => token)
                        .map(token => {
                            const idx = parseInt(token);
                            if (!isNaN(idx) && Array.isArray(rawTransfers) && idx >= 0 && idx < rawTransfers.length) {
                                return this._transferItemToDrawItem(rawTransfers[idx]);
                            }
                            return null;
                        })
                        .filter(item => item !== null);
                })
                .filter(row => row.length > 0);
            // 乗換要素が1つもないときは空配列を返す
            if (transfers.length === 0) transfers = [];
        } else {
            // transferListPlatformが空の場合: 全乗換路線を1行にまとめる
            const transferItems = this._getTransferItems(displayStation.transfers);
            // 乗換要素が1つもないときは空配列を返す
            transfers = transferItems.length > 0 ? [transferItems] : [];
        }

        return {
            transfers,
            otherLineInd:    "",
            slotNum:         "0",
            leftSlotInd:     "0",
            otherCarNum:     "0",
            otherLeftSlotInd: "0"
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

        let transferList;
        if (displayStation.transferListTransfers) {
            // transferListTransfers が設定されている場合: 改行で行を分割し、各行をスペース区切りトークンとして解釈する
            // 新形式: トークンは transfers のインデックス（整数）
            // 旧形式後方互換: トークンが有効インデックスでない場合は lineDict キーとして扱う
            const transfers = displayStation.transfers;
            transferList = displayStation.transferListTransfers
                .split("\n")
                .map(rowStr => {
                    return rowStr.split(" ")
                        .map(token => token.trim())
                        .filter(token => token)
                        .map(token => {
                            const idx = parseInt(token);
                            if (!isNaN(idx) && Array.isArray(transfers) && idx >= 0 && idx < transfers.length) {
                                // 新形式: インデックスで transfers[idx] を参照する
                                return this._transferItemToDrawItem(transfers[idx]);
                            }
                            // 旧形式後方互換: lineDict キーとして参照する
                            const lineData = this.lineDict[token];
                            if (!lineData) return null;
                            const lineIcon = lineData.lineIconKey ? `:${lineData.lineIconKey}:` : "";
                            return { lineIcon, name: lineData.name || "", eng: lineData.eng || "", station: { isDraw: false, type: "", symbol: "", color: "", number: "", name: "", eng: "" } };
                        })
                        .filter(item => item !== null);
                })
                .filter(row => row.length > 0); // 有効なアイテムが1件もない行は除外する
        } else {
            // transferListTransfers が空の場合: transfers の各エントリを1行ずつ配置する
            transferList = this._getTransferItems(displayStation.transfers)
                .map(item => [item]);
        }

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
     * 1つの transferItemType エントリを drawItem { lineIcon, name, eng, station } に変換する
     * 新形式（t.line）と旧形式（t.lineId）の両方に対応する
     * @param {object} t - transferItemType エントリ
     * @returns {{lineIcon:string, name:string, eng:string, station:object}|null}
     */
    _transferItemToDrawItem(t) {
        if (!t) return null;
        const defaultStation = { isDraw: false, type: "", symbol: "", color: "", number: "", name: "", eng: "" };
        // 新形式: t.line を直接使用
        if (t.line) {
            // lineIconKey は string[]（新）または string（旧形式後方互換）の両方に対応する
            let lineIcon = "";
            if (Array.isArray(t.line.lineIconKey)) {
                lineIcon = t.line.lineIconKey.map(k => `:${k}:`).join('');
            } else if (t.line.lineIconKey) {
                lineIcon = `:${t.line.lineIconKey}:`;
            }
            return { lineIcon, name: t.line.name || "", eng: t.line.eng || "", station: t.station ?? defaultStation };
        }
        // 旧形式: t.lineId で lineDict を参照（後方互換）
        const line = this.lineDict?.[t.lineId];
        if (!line) return null;
        const lineIcon = line.lineIconKey ? `:${line.lineIconKey}:` : "";
        return { lineIcon, name: line.name || "", eng: line.eng || "", station: t.station ?? defaultStation };
    }

    /**
     * station.transfers 全体を drawItem の配列に変換する
     * 最旧形式（スペース区切り文字列）・旧配列形式（lineId）・新配列形式（line）の全てに対応する
     * @param {string|Array} transfers
     * @returns {Array}
     */
    _getTransferItems(transfers) {
        if (!transfers) return [];
        // 最旧形式: スペース区切り文字列
        if (!Array.isArray(transfers)) {
            const defaultStation = { isDraw: false, type: "", symbol: "", color: "", number: "", name: "", eng: "" };
            return transfers.split(" ").filter(id => id).map(id => {
                const line = this.lineDict?.[id];
                if (!line) return null;
                const lineIcon = line.lineIconKey ? `:${line.lineIconKey}:` : "";
                return { lineIcon, name: line.name || "", eng: line.eng || "", station: defaultStation };
            }).filter(item => item !== null);
        }
        // 新・旧配列形式: _transferItemToDrawItem に委譲
        return transfers.map(t => this._transferItemToDrawItem(t)).filter(item => item !== null);
    }

    // ============================================================
    // infoMessage ページ分割ヘルパー
    // ============================================================

    /**
     * message.text を MAX_CHAR_NUM / MAX_LINE_NUM に基づいてページ配列に分割する。
     * 各要素は \n 結合済みの文字列。メッセージなしのときは [''] を返す。
     */
    _buildInfoMsgPages() {
        const text = this.message?.text ?? '';
        if (!text) return [''];

        // \n で段落分割し、各段落を MAX_CHAR_NUM 文字ごとに折り返して全行リストを作る
        const allLines = [];
        for (const para of text.split('\n')) {
            if (!para) { allLines.push(''); continue; }
            let rest = para;
            while (rest.length > INFO_MSG_MAX_CHAR_NUM) {
                allLines.push(rest.slice(0, INFO_MSG_MAX_CHAR_NUM));
                rest = rest.slice(INFO_MSG_MAX_CHAR_NUM);
            }
            allLines.push(rest);
        }

        // MAX_LINE_NUM 行ごとにページ分割する
        const pages = [];
        for (let i = 0; i < allLines.length; i += INFO_MSG_MAX_LINE_NUM) {
            pages.push(allLines.slice(i, i + INFO_MSG_MAX_LINE_NUM).join('\n'));
        }
        return pages.length > 0 ? pages : [''];
    }

    /**
     * 現在サブページのテキストを持つ message オブジェクトを返す
     * @param {number} infoMsgNowPage - 0-indexed サブページ番号
     */
    _buildMessageOutput(infoMsgNowPage) {
        const pages = this._buildInfoMsgPages();
        const raw = pages[infoMsgNowPage] ?? pages[0] ?? '';
        // 半角英数記号・スペースを全角に変換して返す
        return { text: this._toFullWidth(raw) };
    }

    /**
     * 半角ASCII印字可能文字（0x21〜0x7E）を全角（0xFF01〜0xFF5E）へ、
     * 半角スペース（0x20）を全角スペース（U+3000）へ変換する
     */
    _toFullWidth(str) {
        return str
            .replace(/[\x21-\x7E]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0xFEE0))
            .replace(/\x20/g, '　');
    }

    /**
     * drawParams.pages フィールドを返す（nowPage は 1-indexed）
     * @param {number} infoMsgNowPage - 0-indexed サブページ番号
     */
    _buildPagesOutput(infoMsgNowPage) {
        const pages = this._buildInfoMsgPages();
        return {
            nowPage:   infoMsgNowPage + 1,
            totalPage: pages.length,
        };
    }
}
