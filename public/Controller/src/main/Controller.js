// ============================================================
// Controller（メインクラス）
// Controllerアプリ唯一のpublicクラス。
// settingsを受け取り各サブコントローラを初期化して、
// drawParamsを生成・管理する。
// ============================================================

// 依存ファイルの読み込み（ブラウザのscriptタグまたはimportで解決すること）
// - ../utility/utils.js       (parseStationNumber, getCircularItem, 等)
// - ../obj/ProgressController.js
// - ../obj/PageController.js
// - ../obj/LangController.js

class Controller {
    /**
     * @param {object}   settings           - データ作成画面からの設定オブジェクト
     * @param {object}   settings.info      - 全体設定
     * @param {object[]} settings.operationList - 運行情報リスト
     * @param {object[]} settings.stationList   - 駅リスト
     * @param {object}   settings.lineDict      - 路線辞書
     * @param {object}   settings.iconDict      - アイコン辞書
     * @param {object}   pageParams         - ページ制御パラメータ
     * @param {string[]} pageParams.pageNameList - 表示するページ名リスト
     * @param {object}   langParams         - 言語制御パラメータ
     * @param {object[]} langParams.langIdList  - 言語IDと時間パラメータのリスト
     */
    constructor(settings, pageParams, langParams) {
        // ProgressController用パラメータをsettingsから抽出して初期化
        const progressParams = {
            stationList:   settings.stationList,
            operationList: settings.operationList,
            info:          settings.info,
            lineDict:      settings.lineDict,
            iconDict:      settings.iconDict
        };
        this._progressController = new ProgressController(progressParams);

        // PageController初期化
        this._pageController = new PageController(pageParams);

        // LangController初期化
        this._langController = new LangController(langParams);

        // ProgressControllerの長時間停車コールバックを設定
        // タイマー発火時: pageReset → langReset → onLongStopコールバックにdrawParamsを渡す
        this._progressController.onLongStop = () => {
            this._pageController.pageReset();
            this._langController.langReset();
            if (this._onLongStop) {
                this._onLongStop(this.getDrawParams());
            }
        };
    }

    // ============================================================
    // コールバック登録セッター
    // ============================================================

    /**
     * 長時間停車タイマー発火時のコールバックを設定する
     * コールバックの引数: (drawParams)
     * @param {Function} callback
     */
    set onLongStop(callback) { this._onLongStop = callback; }

    /**
     * 言語タイマー発火時のコールバックをLangControllerに設定する
     * コールバックの引数: (langId, transTime, gapTime)
     * @param {Function} callback
     */
    set onLangTimer(callback) { this._langController.onLangTimer = callback; }

    // ============================================================
    // 公開API
    // ============================================================

    /**
     * 状態単位でstep分移動し、drawParamsを返す
     * ページ・言語をリセットする
     * @param {number} step
     * @returns {object} drawParams
     */
    moveState(step) {
        this._progressController.moveState(step);
        this._pageController.pageReset();
        this._langController.langReset();
        return this.getDrawParams();
    }

    /**
     * 駅単位でstep分移動し、drawParamsを返す
     * ページ・言語をリセットする
     * @param {number} step
     * @returns {object} drawParams
     */
    moveStation(step) {
        this._progressController.moveStation(step);
        this._pageController.pageReset();
        this._langController.langReset();
        return this.getDrawParams();
    }

    /**
     * ページを一つ進め、言語をリセットしてdrawParamsを返す
     * @returns {object} drawParams
     */
    pageRotate() {
        this._pageController.pageRotate();
        this._langController.langReset();
        return this.getDrawParams();
    }

    /**
     * 言語を一つ進めてdrawParamsを返す
     * ※今回はタイマー方式のみ使用するため通常は呼び出さない
     * @returns {object} drawParams
     */
    langRotate() {
        this._langController.langRotate();
        return this.getDrawParams();
    }

    /**
     * 各サブコントローラのgetParams()を統合してdrawParamsを返す
     * @returns {object} drawParams
     */
    getDrawParams() {
        const pageOutput     = this._pageController.getParams();
        const langOutput     = this._langController.getParams();
        const progressOutput = this._progressController.getParams();

        return {
            page:   pageOutput.page,
            langId: langOutput.langId,
            ...progressOutput
        };
    }
}
