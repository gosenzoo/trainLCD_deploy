// ============================================================
// PageController
// 走行状態（pageState）ごとのページリストを管理し、
// タイマーで自動ページ送りを行う。
// LangControllerと同様のタイマーパターンを採用。
// ============================================================
class PageController {
    /**
     * @param {object} pageParams
     * @param {object} pageParams.pageDispList - { [pageState: string]: pageObj[] }
     *   pageObj: { pageName: string, dispTime: number, type: number }
     *   type: 0=無条件 / 1=乗換あり / 2=次運用あり（未実装） / 3=Message（未実装）
     * @param {boolean} [pageParams.isPageAuto=true] - true: タイマー自動切換え / false: 手動切換えのみ
     */
    constructor(pageParams) {
        this.pageDispList    = pageParams.pageDispList ?? {};
        this._isPageAuto     = pageParams.isPageAuto ?? true;
        this._currentPageState = -1;
        this._currentList    = [];
        this._currentIndex   = 0;
        this._timerId        = null;
        this._onPageTimer    = null;
    }

    /**
     * タイマー発火時のコールバックを設定する。
     * コールバック内でpageRotate(conditionData)を呼ぶことで次ページに進む。
     * @param {Function} callback
     */
    set onPageTimer(callback) {
        this._onPageTimer = callback;
    }

    /** 現在のページエントリを返す（リストが空の場合はnull） */
    get currentPage() {
        return this._currentList[this._currentIndex] ?? null;
    }

    /** 現在のページ名を返す */
    get currentPageName() {
        return this.currentPage?.pageName ?? '';
    }

    /**
     * pageStateを切り替え、先頭の有効ページにリセットしてタイマーを起動する。
     * 状態遷移（moveState/moveStation）時に呼ぶ。
     * @param {number} pageState
     * @param {object} conditionData
     */
    setPageState(pageState, conditionData) {
        this._currentPageState = pageState;
        this._currentList      = this.pageDispList[String(pageState)] ?? [];
        this._currentIndex     = 0;
        this._skipInvalidPages(conditionData);
        this._startTimer();
    }

    /**
     * 次の有効ページに進んでタイマーを再起動する。
     * 手動ページ送り・タイマーコールバックから共通で呼ぶ。
     * @param {object} conditionData
     */
    pageRotate(conditionData) {
        if (this._currentList.length === 0) return;
        this._currentIndex = (this._currentIndex + 1) % this._currentList.length;
        this._skipInvalidPages(conditionData);
        this._startTimer();
    }

    /**
     * 先頭の有効ページにリセットしてタイマーを再起動する。
     * 長時間停車リセット時に呼ぶ。
     * @param {object} conditionData
     */
    pageReset(conditionData) {
        this._currentIndex = 0;
        this._skipInvalidPages(conditionData);
        this._startTimer();
    }

    // ============================================================
    // プライベートメソッド
    // ============================================================

    /**
     * 現在ページのdispTime後にonPageTimerコールバックを発火するタイマーを起動する。
     * isPageAuto が false の場合はタイマーを起動しない（手動切換えモード）。
     */
    _startTimer() {
        if (this._timerId) clearTimeout(this._timerId);
        if (!this._isPageAuto) return;
        const page = this.currentPage;
        if (!page) return;
        this._timerId = setTimeout(() => {
            if (this._onPageTimer) this._onPageTimer();
        }, page.dispTime);
    }

    /**
     * 現在インデックスから始めて条件不成立のページをスキップする。
     * 全ページが無効の場合は最大1周でループを抜ける。
     */
    _skipInvalidPages(conditionData) {
        if (this._currentList.length === 0) return;
        let checked = 0;
        while (!this._isPageValid(this._currentList[this._currentIndex], conditionData)) {
            this._currentIndex = (this._currentIndex + 1) % this._currentList.length;
            checked++;
            if (checked >= this._currentList.length) break;
        }
    }

    /**
     * ページの表示条件を判定する。
     * type 2,3 は未実装のため常にtrue（表示する）。
     */
    _isPageValid(page, conditionData) {
        if (!page) return false;
        const type = page.type ?? 0;
        if (type === 0) return true;                           // 無条件
        if (type === 1) return !!(conditionData?.hasTransfers); // 乗換あり
        return true; // type 2,3 は未実装→常に表示
    }

    /** pageOutput を返す */
    getParams() {
        return { page: this.currentPageName };
    }
}
