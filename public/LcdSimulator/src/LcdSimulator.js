// ============================================================
// LcdSimulator
// ControllerとDrawerを繋ぐ統合クラス
// settings → Controller → drawParams → Drawer → SVG
// ============================================================

class LcdSimulator {
    /**
     * @param {object}    settings        - 設定オブジェクト（settings.jsonの内容）
     * @param {object}    pageParams      - ページ制御パラメータ
     * @param {object}    langParams      - 言語制御パラメータ
     * @param {Drawer}    drawer          - Drawerインスタンス（未load可）
     * @param {SVGElement} svgEl          - 描画先のSVG要素
     * @param {object}    drawerResources - Drawerのload用リソース一式
     *   @param {object}  drawerResources.iconList        - アイコン辞書
     *   @param {object}  drawerResources.numIconPresets  - 数字アイコンSVGマップ
     *   @param {SVGElement} drawerResources.headerSVG    - ヘッダーSVG
     *   @param {Map}     drawerResources.bodySVGMap      - ボディSVGマップ
     */
    constructor(settings, pageParams, langParams, drawer, svgEl, drawerResources) {
        this._drawer = drawer;
        this._svgEl  = svgEl;
        this._onRender = null;

        // Controller初期化：進行管理・ページ管理・言語管理を統括する
        this._controller = new Controller(settings, pageParams, langParams);

        // Controllerの初期drawParamsでDrawerをload（tempControllerを使わず済む）
        const initialParams = this._controller.getDrawParams();
        this._drawer.load(
            initialParams,
            drawerResources.iconList,
            drawerResources.numIconPresets,
            drawerResources.headerSVG,
            drawerResources.bodySVGMap
        );

        // 言語タイマー発火時: Drawerの言語切替アニメーションを起動する
        this._controller.onLangTimer = (langId, transTime, gapTime) => {
            this._drawer.langChange(langId, transTime, gapTime);
        };

        // 長時間停車タイマー発火時: page/langリセット後の状態でSVGを再描画する
        this._controller.onLongStop = (drawParams) => {
            this._render(drawParams);
        };
    }

    // ============================================================
    // 公開API
    // ============================================================

    /** 現在のdrawParamsで初期描画する */
    start() {
        this._render(this._controller.getDrawParams());
    }

    /**
     * 状態単位でstep分移動して再描画する
     * @param {number} step
     */
    moveState(step) {
        this._render(this._controller.moveState(step));
    }

    /**
     * 駅単位でstep分移動して再描画する
     * @param {number} step
     */
    moveStation(step) {
        this._render(this._controller.moveStation(step));
    }

    /** ページを一つ進めて再描画する */
    pageRotate() {
        this._render(this._controller.pageRotate());
    }

    /** 言語を一つ進めて再描画する（デバッグ用） */
    langRotate() {
        this._render(this._controller.langRotate());
    }

    /** 現在のdrawParamsを返す */
    getDrawParams() {
        return this._controller.getDrawParams();
    }

    /** 現在のdrawParamsで再描画する（状態を進めずに画面を更新したい場合に使用） */
    redraw() {
        this._render(this._controller.getDrawParams());
    }

    /**
     * DrawerのデバッグモードをON/OFFして再描画する
     * @param {boolean} enabled
     */
    setDebug(enabled) {
        this._drawer.setDebug(enabled);
        this.redraw();
    }

    /**
     * 再描画後に呼ばれるコールバックを登録する
     * コールバックの引数: (drawParams)
     * UIのステータス更新などに使用する
     * @param {Function} callback
     */
    set onRender(callback) {
        this._onRender = callback;
    }

    // ============================================================
    // プライベートメソッド
    // ============================================================

    /**
     * SVG要素をクリアして再描画し、onRenderコールバックを呼ぶ
     * @param {object} drawParams
     */
    _render(drawParams) {
        // 既存のSVG子要素をすべて削除してから新しい描画結果を追加する
        while (this._svgEl.firstChild) this._svgEl.removeChild(this._svgEl.firstChild);
        this._svgEl.appendChild(this._drawer.draw(drawParams));
        if (this._onRender) this._onRender(drawParams);
    }
}
