// ============================================================
// LangController
// 表示言語IDの一覧・タイマー・ローテーションを管理する
// 言語切り替えはタイマー方式のみ実装（langRotate()は定義のみ）
// ============================================================
class LangController {
    /**
     * @param {object} langParams
     * @param {object[]} langParams.langIdList
     *   - langId:      number  言語ID（0:日本語, 1:英語, 2:その他）
     *   - displayTime: number  表示時間（ms）
     *   - transTime:   number  アニメーション遷移時間（ms）
     *   - gapTime:     number  ギャップ時間（ms）
     */
    constructor(langParams) {
        this.langIdList = langParams.langIdList;
        this._currentIndex = 0;
        this._timerId = null;
        this._onLangTimer = null;

        // コンストラクタでタイマーを開始
        this._startTimer();
    }

    /**
     * 言語タイマーコールバックを設定する
     * コールバックの引数: (langId, transTime, gapTime)
     * @param {Function} callback
     */
    set onLangTimer(callback) {
        this._onLangTimer = callback;
    }

    /**
     * 現在の言語エントリのdisplayTime後にタイマーを発火する
     * 発火時: 次の言語へ自動進行 → コールバック呼び出し（次のlangIdを通知）→ タイマー再起動
     * transTime/gapTimeは現在のlangIdのエントリから取得する（現在→次への遷移パラメータ）
     */
    _startTimer() {
        if (this._timerId) clearTimeout(this._timerId);

        const current = this.langIdList[this._currentIndex];
        this._timerId = setTimeout(() => {
            // transTime/gapTimeは現在のlangIdから次への遷移パラメータとして取得
            const transTime = current.transTime;
            const gapTime   = current.gapTime;
            // 次の言語に自動進行（コールバック前に進めることでgetParams()も即時反映される）
            this._currentIndex = (this._currentIndex + 1) % this.langIdList.length;
            // コールバックを発火（切り替え先のlangIdを通知）
            if (this._onLangTimer) {
                this._onLangTimer(this.langIdList[this._currentIndex].langId, transTime, gapTime);
            }
            // 次のタイマーを起動
            this._startTimer();
        }, current.displayTime);
    }

    /**
     * currentLangIdを一つ進める
     * ※今回はタイマー方式のみ使用するため、このメソッドは定義のみ
     */
    langRotate() {
        this._currentIndex = (this._currentIndex + 1) % this.langIdList.length;
    }

    /**
     * currentLangIdをlangIdList[0]にリセットし、タイマーも再起動する
     */
    langReset() {
        this._currentIndex = 0;
        this._startTimer();
    }

    /** langOutput を返す */
    getParams() {
        return { langId: this.langIdList[this._currentIndex].langId };
    }
}
