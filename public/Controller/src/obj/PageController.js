// ============================================================
// PageController
// 表示ページの一覧・順序・ページ送りを管理する
// ============================================================
class PageController {
    /**
     * @param {object} pageParams
     * @param {{pageName: string, dispTime: number}[]} pageParams.pageList - 表示するページエントリの一覧（表示順）
     */
    constructor(pageParams) {
        this.pageList = pageParams.pageList;
        // 現在のページは先頭で初期化
        this._currentIndex = 0;
    }

    /** 現在のページエントリを返す */
    get currentPage() {
        return this.pageList[this._currentIndex];
    }

    /** 現在のページ名を返す */
    get currentPageName() {
        return this.currentPage.pageName;
    }

    /** currentPageを一つ進める（末尾の次は先頭に戻る） */
    pageRotate() {
        this._currentIndex = (this._currentIndex + 1) % this.pageList.length;
    }

    /** currentPageをpageList[0]にリセットする */
    pageReset() {
        this._currentIndex = 0;
    }

    /** pageOutput を返す */
    getParams() {
        return { page: this.currentPageName };
    }
}
