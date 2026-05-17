// ============================================================
// PageController
// 表示ページの一覧・順序・ページ送りを管理する
// ============================================================
class PageController {
    /**
     * @param {object} pageParams
     * @param {string[]} pageParams.pageNameList - 表示するページ名の一覧（表示順）
     */
    constructor(pageParams) {
        this.pageNameList = pageParams.pageNameList;
        // 現在のページは先頭で初期化
        this._currentIndex = 0;
    }

    /** 現在のページ名を返す */
    get currentPageName() {
        return this.pageNameList[this._currentIndex];
    }

    /** currentPageNameを一つ進める（末尾の次は先頭に戻る） */
    pageRotate() {
        this._currentIndex = (this._currentIndex + 1) % this.pageNameList.length;
    }

    /** currentPageNameをpageNameList[0]にリセットする */
    pageReset() {
        this._currentIndex = 0;
    }

    /** pageOutput を返す */
    getParams() {
        return { page: this.currentPageName };
    }
}
