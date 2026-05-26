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
     * @param {object}   settings.operationDict  - 運用辞書（ID→operationType）
     * @param {object[]} settings.stationList    - 駅リスト
     * @param {object}   settings.lineDict       - 路線辞書
     * @param {object}   settings.iconDict       - アイコン辞書
     * @param {object}   pageParams         - ページ制御パラメータ
     * @param {object}   pageParams.pageDispList - 走行状態別ページリスト { [pageState]: pageObj[] }
     * @param {object}   langParams         - 言語制御パラメータ
     * @param {object[]} langParams.langIdList  - 言語IDと時間パラメータのリスト
     */
    constructor(settings, pageParams, langParams) {
        console.log(settings)
        // ProgressController用パラメータをsettingsから抽出して初期化
        const progressParams = {
            stationList:   settings.stationList,
            operationDict: settings.operationDict,
            operationList: settings.operationList,  // 旧形式との後方互換のため渡す（ProgressController側で変換）
            info:          settings.info,
            lineDict:      settings.lineDict,
            iconDict:      settings.iconDict,
            message:       settings.message         // メッセージ設定（type=3条件判定に使用）
        };
        this._progressController = new ProgressController(progressParams);

        // PageController初期化（pageDispListを渡す）
        this._pageController = new PageController(pageParams);

        // LangController初期化
        this._langController = new LangController(langParams);

        // PageControllerのタイマーコールバック：最新conditionDataでページを進め、langリセット後に外部通知
        this._pageController.onPageTimer = () => {
            const conditionData = this._getConditionData();
            this._pageController.pageRotate(conditionData);
            this._langController.langReset();
            if (this._onPageTimer) this._onPageTimer(this.getDrawParams());
        };

        // ProgressControllerの長時間停車コールバック
        this._progressController.onLongStop = () => {
            this._updatePageState();
            this._langController.langReset();
            if (this._onLongStop) this._onLongStop(this.getDrawParams());
        };

        // 初期pageStateを設定してタイマーを起動する
        this._updatePageState();
    }

    // ============================================================
    // コールバック登録セッター
    // ============================================================

    /**
     * 長時間停車タイマー発火時のコールバックを設定する
     * @param {Function} callback - コールバックの引数: (drawParams)
     */
    set onLongStop(callback) { this._onLongStop = callback; }

    /**
     * 言語タイマー発火時のコールバックをLangControllerに設定する
     * @param {Function} callback - コールバックの引数: (langId, transTime, gapTime)
     */
    set onLangTimer(callback) { this._langController.onLangTimer = callback; }

    /**
     * ページタイマー発火時のコールバックを設定する
     * @param {Function} callback - コールバックの引数: (drawParams)
     */
    set onPageTimer(callback) { this._onPageTimer = callback; }

    // ============================================================
    // 公開API
    // ============================================================

    /**
     * 状態単位でstep分移動し、drawParamsを返す
     * @param {number} step
     * @returns {object} drawParams
     */
    moveState(step) {
        this._progressController.moveState(step);
        this._updatePageState();
        this._langController.langReset();
        return this.getDrawParams();
    }

    /**
     * 駅単位でstep分移動し、drawParamsを返す
     * @param {number} step
     * @returns {object} drawParams
     */
    moveStation(step) {
        this._progressController.moveStation(step);
        this._updatePageState();
        this._langController.langReset();
        return this.getDrawParams();
    }

    /**
     * ページを一つ進め、言語をリセットしてdrawParamsを返す
     * @returns {object} drawParams
     */
    pageRotate() {
        const conditionData = this._getConditionData();
        this._pageController.pageRotate(conditionData);
        this._langController.langReset();
        return this.getDrawParams();
    }

    /**
     * 言語を一つ進めてdrawParamsを返す
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
        // infoMsgNowPage（0-indexed）を渡すことで現在サブページのテキストと pages フィールドを生成させる
        const progressOutput = this._progressController.getParams(pageOutput.infoMsgNowPage);

        return {
            page:   pageOutput.page,
            langId: langOutput.langId,
            ...progressOutput
        };
    }

    // ============================================================
    // プライベートヘルパー
    // ============================================================

    /**
     * ProgressControllerからpageStateとconditionDataを取得し、
     * PageControllerのページリストを切り替える。
     */
    _updatePageState() {
        const progressOutput = this._progressController.getParams();
        this._pageController.setPageState(progressOutput.pageState, progressOutput.conditionData);
    }

    /** ProgressControllerから最新のconditionDataを取得する */
    _getConditionData() {
        return this._progressController.getParams().conditionData;
    }
}
