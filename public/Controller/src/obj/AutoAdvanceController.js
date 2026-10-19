// ============================================================
// AutoAdvanceController
// LCD表示の画面送り（7.53節）。「表示設定」で選んだ方法で、状態（つぎは・まもなく・ただいま・通過）を自動で進める。
//   'time'  : 自動(時間) … 駅の走行時間・停車時間とページの1周の長さで進める
//   'coord' : 自動(座標) … 端末の位置情報・速度で進める
// 手動（'manual'）のときはこのクラスを使わない。
// ============================================================

// 状態の定義（ProgressController と同じ）。stateInd = 駅インデックス × 3 + posState
const AUTO_STATES_PER_STATION = 3;
const AUTO_POS_RUNNING  = 0; // つぎは
const AUTO_POS_APPROACH = 1; // まもなく
const AUTO_POS_STATION  = 2; // ただいま・通過

// pageState（ProgressController._computePageState と同じ）
const AUTO_PAGE_STATE_APPROACH = 2; // 直前（まもなく）
const AUTO_PAGE_STATE_PASS     = 4; // 通過

// 自動(座標)のしきい値
const COORD_STOP_RADIUS_M     = 500;      // 停車駅の範囲（m）
const COORD_PASS_RADIUS_M     = 50;       // 通過駅の範囲（m）
const COORD_DEPART_SPEED_MPS  = 10 / 3.6; // 出発とみなす速度（時速10km以上）
const COORD_STOPPED_SPEED_MPS = 3 / 3.6;  // 停止とみなす速度（時速3km未満）
const COORD_STOPPED_DURATION  = 3000;     // 停止とみなすまでの時間（ms）
const COORD_CHECK_INTERVAL    = 1000;     // 停止の判定を見直す間隔（ms。位置が更新されない端末向け）

class AutoAdvanceController {
    /**
     * @param {Controller} controller - 状態を進める Controller
     * @param {object[]}   stationList - 駅リスト（sectionTime・stopTime・isPass・coordinate を使う）
     * @param {'time'|'coord'} mode
     * @param {object}     callbacks
     * @param {Function}   callbacks.onMove      - 自動で状態を進めたときに呼ぶ。引数: (drawParams)
     * @param {Function}   [callbacks.onGeoError] - 位置情報が使えないときに呼ぶ。引数: (message)
     */
    constructor(controller, stationList, mode, callbacks) {
        this._controller  = controller;
        this._stationList = stationList;
        this._mode        = mode;
        this._onMove      = callbacks.onMove;
        this._onGeoError  = callbacks.onGeoError ?? (() => {});
        this._timerId     = null;
        this._stopped     = false;  // stop() 済みなら true（7.56節）

        // 自動(時間): 通過で使った時間（ms）。通過した後の区間の走行時間から差し引く
        this._passCarry = 0;

        // 自動(座標): 位置情報の監視と、速度の計算・停止の判定に使う値
        this._watchId      = null;
        this._checkId      = null;
        this._lastFix      = null;  // { lat, lng, time }
        this._speed        = null;  // 現在の速度（m/s）
        this._lowSpeedFrom = null;  // 停止とみなす速度を下回り始めた時刻
    }

    // ============================================================
    // 公開API
    // ============================================================

    /** 自動送りを始める（現在の状態から） */
    start() {
        if (this._mode === 'coord') this._startGeolocation();
        this._onStateEntered();
    }

    /** 自動送りを止める（タイマーと位置情報の監視を止める）。画面送りの方式を切り替えるときに使う（7.56節） */
    stop() {
        this._clearTimer();
        if (this._watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(this._watchId);
        if (this._checkId !== null) clearInterval(this._checkId);
        this._watchId = null;
        this._checkId = null;
        this._stopped = true;
    }

    /** 手動操作で状態が変わったときに呼ぶ。操作した先の状態から自動送りをやり直す */
    onManualMove() {
        this._passCarry = 0;
        this._onStateEntered();
    }

    // ============================================================
    // 状態の遷移
    // ============================================================

    /** 自動で1状態進め、描画を依頼して、新しい状態での自動送りを始める */
    _advance() {
        const drawParams = this._controller.moveState(1);
        this._onMove(drawParams);
        this._onStateEntered();
    }

    /** 状態を直接指定して移動し（自動(座標)で駅を飛ばすとき）、描画を依頼する */
    _jump(stateInd) {
        this._passCarry = 0;
        const drawParams = this._controller.jumpToState(stateInd);
        this._onMove(drawParams);
        this._onStateEntered();
    }

    /** 状態に入ったときの処理。モードごとに次の遷移のタイマーを仕掛ける */
    _onStateEntered() {
        this._clearTimer();
        if (this._stopped) return;
        const state = this._controller.getProgressState();
        if (this._mode === 'time') this._scheduleByTime(state);
        else                       this._scheduleByCoord(state);
    }

    _setTimer(delay, callback) {
        this._clearTimer();
        this._timerId = setTimeout(() => { this._timerId = null; callback(); }, Math.max(0, delay));
    }

    _clearTimer() {
        if (this._timerId) { clearTimeout(this._timerId); this._timerId = null; }
    }

    // ============================================================
    // 自動(時間)
    // ============================================================

    /** 秒数の文字列をミリ秒にする。数値でなければ 0 */
    _secToMs(value) {
        const n = parseInt(value);
        return Number.isNaN(n) ? 0 : n * 1000;
    }

    _scheduleByTime(state) {
        const { stationInd, posState, runState, isTerminal } = state;
        const station = this._stationList[stationInd];
        if (!station) return;

        if (posState === AUTO_POS_STATION) {
            // 終点に着いたらそれ以上進めない
            if (runState === 1 && isTerminal) return;
            if (runState === 1) {
                // ただいま（停車駅。始発駅も含む）: 停車時間のあいだ表示する
                this._setTimer(this._secToMs(station.stopTime), () => this._advance());
            } else {
                // 通過: 「通過」の1周のあいだ表示し、その時間を次の区間の走行時間から差し引く
                const passTime = this._controller.getCycleTime(AUTO_PAGE_STATE_PASS);
                this._setTimer(passTime, () => { this._passCarry = passTime; this._advance(); });
            }
            return;
        }

        if (posState === AUTO_POS_RUNNING) {
            // つぎは: 走行時間（出発側の駅の sectionTime）から、通過で使った時間と「まもなく」の1周を引いた長さ
            const prevStation = this._stationList[stationInd - 1];
            const runTime = prevStation ? this._secToMs(prevStation.sectionTime) : 0;
            const budget = runTime - this._passCarry;
            this._passCarry = 0;
            // 次が通過駅なら「まもなく」はない（ProgressController が飛ばす）
            const approachTime = station.isPass ? 0 : this._controller.getCycleTime(AUTO_PAGE_STATE_APPROACH);
            // 0以下なら表示せずに次へ進む
            this._setTimer(budget - approachTime, () => this._advance());
            return;
        }

        if (posState === AUTO_POS_APPROACH) {
            // まもなく: 「まもなく」の1周のあいだ表示する
            this._setTimer(this._controller.getCycleTime(AUTO_PAGE_STATE_APPROACH), () => this._advance());
        }
    }

    // ============================================================
    // 自動(座標)
    // ============================================================

    _scheduleByCoord(state) {
        // 通過: 「通過」の1周が終わったら次の区間へ。それ以外の遷移は位置情報の更新で判定する
        if (state.posState === AUTO_POS_STATION && state.runState === 0) {
            this._setTimer(this._controller.getCycleTime(AUTO_PAGE_STATE_PASS), () => this._advance());
        }
    }

    _startGeolocation() {
        if (!window.isSecureContext || !navigator.geolocation) {
            this._onGeoError('位置情報を取得できません');
            return;
        }
        this._watchId = navigator.geolocation.watchPosition(
            (pos) => this._onPosition(pos),
            () => this._onGeoError('位置情報を取得できません'),
            { enableHighAccuracy: true, maximumAge: 0 }
        );
        // 位置が更新されない端末でも停止を判定できるよう、一定間隔で見直す
        this._checkId = setInterval(() => this._checkStopped(), COORD_CHECK_INTERVAL);
    }

    /** 位置情報の更新ごとに、速度を求めて遷移を判定する */
    _onPosition(pos) {
        if (this._stopped) return;
        const now = pos.timestamp ?? Date.now();
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // 速度: 端末が返す値を使い、返さない場合は前回の位置との距離と時間から求める
        let speed = pos.coords.speed;
        if (speed === null || speed === undefined || Number.isNaN(speed) || speed < 0) {
            if (this._lastFix && now > this._lastFix.time) {
                speed = this._distance(this._lastFix, here) / ((now - this._lastFix.time) / 1000);
            } else {
                speed = null;
            }
        }
        this._lastFix = { ...here, time: now };
        this._speed = speed;
        if (speed !== null && speed < COORD_STOPPED_SPEED_MPS) {
            if (this._lowSpeedFrom === null) this._lowSpeedFrom = now;
        } else {
            this._lowSpeedFrom = null;
        }

        const state = this._controller.getProgressState();

        // ただいま（停車中）: 速度が出たら出発（終点では進めない）
        if (state.posState === AUTO_POS_STATION && state.runState === 1) {
            if (!state.isTerminal && speed !== null && speed >= COORD_DEPART_SPEED_MPS) this._advance();
            return;
        }

        // 現在地がどこかの駅の範囲に入っていたら、その駅に応じた動作をする
        const target = this._findStationInRange(here, state);
        if (target) {
            const station = this._stationList[target.ind];
            const stateInd = target.ind * AUTO_STATES_PER_STATION + (station.isPass ? AUTO_POS_STATION : AUTO_POS_APPROACH);
            if (stateInd !== state.stateInd) { this._jump(stateInd); return; }
        }

        this._checkStopped();
    }

    /** まもなく で停止が続いたら ただいま にする */
    _checkStopped() {
        if (this._lowSpeedFrom === null) return;
        const state = this._controller.getProgressState();
        if (state.posState !== AUTO_POS_APPROACH) return;
        if (Date.now() - this._lowSpeedFrom >= COORD_STOPPED_DURATION) {
            this._lowSpeedFrom = null;
            this._advance();
        }
    }

    /**
     * 現在の状態より先の駅のうち、現在地が範囲に入っている一番近い駅を返す（なければ null）。
     * 停車中・通過中の駅は除く。座標がない駅は範囲を持たない
     */
    _findStationInRange(here, state) {
        const firstInd = state.posState === AUTO_POS_STATION ? state.stationInd + 1 : state.stationInd;
        let best = null;
        for (let i = firstInd; i < this._stationList.length; i++) {
            const station = this._stationList[i];
            const coord = this._toValidPosition(station.coordinate);
            if (!coord) continue;
            const radius = station.isPass ? COORD_PASS_RADIUS_M : COORD_STOP_RADIUS_M;
            const dist = this._distance(here, coord);
            if (dist <= radius && (!best || dist < best.dist)) best = { ind: i, dist };
        }
        return best;
    }

    /** 座標が正しいとき（緯度・経度とも数値で範囲内）だけ位置を返す（エディタの座標設定と同じ判定） */
    _toValidPosition(coordinate) {
        const [lat, lng] = coordinate ?? [null, null];
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
        return { lat, lng };
    }

    /** 2点間の距離（m。球面の大円距離） */
    _distance(a, b) {
        const R = 6371000;
        const toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }
}
