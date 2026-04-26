// lcdParts="textBox" に対応するオブジェクトクラス
class TextBoxObj extends LcdPartsObj {
    constructor(svgDom, drawParams, args, textDrawer) {
        super(svgDom, drawParams, args);
        // textBoxのデフォルトはtrue。lcd-flex="false"で明示的に無効化できる
        if (svgDom.getAttribute('lcd-flex') === null) this.flexible = true;

        this._textDrawer = textDrawer;
        this._svgDom     = svgDom;

        // 矩形領域をrect属性から取得
        this.x      = parseFloat(svgDom.getAttribute('x'))      || 0;
        this.y      = parseFloat(svgDom.getAttribute('y'))      || 0;
        this.width  = parseFloat(svgDom.getAttribute('width'))  || 0;
        this.height = parseFloat(svgDom.getAttribute('height')) || 0;

        // lcdTextテンプレートをdrawParamsとargsで展開
        const lcdText = svgDom.getAttribute('lcdText') || '';
        console.log(svgDom)
        console.log(lcdText);
        this.text = LcdPartsObj.resolveTemplate(lcdText, drawParams, args);

        // data-styleを解析（TextDrawerが内部で変更するためコンストラクタ段階でパース）
        try {
            this._style = JSON.parse(svgDom.getAttribute('data-style'));
        } catch {
            this._style = {};
        }

        this._element      = null;
        this._uniformScale = 1;

        // 初回描画して自然サイズを確定
        this._render(this.width, this.height);
        this._naturalWidth  = this.realWidth;
        this._naturalHeight = this.realHeight;
    }

    // 指定サイズでTextDrawerを呼び出して再描画する（位置は常に原点）
    _render(width, height) {
        // 空文字は描画しない（Drawer._createTextと同じ規則）
        if (!this.text) {
            this._element   = null;
            this.realWidth  = 0;
            this.realHeight = 0;
            this._uniformScale = 1;
            return;
        }

        const result = this._textDrawer.create(this.text, {
            x: 0,
            y: 0,
            width,
            height,
            // TextDrawerがstyleJsonを直接変更する場合があるのでディープコピーを渡す
            styleJson:       JSON.parse(JSON.stringify(this._style)),
            lang:            this._svgDom.getAttribute('lang'),
            axis:            this._svgDom.getAttribute('axis'),
            spacing:         parseFloat(this._svgDom.getAttribute('spacing')),
            base:            this._svgDom.getAttribute('base'),
            transform:       null,
            textHeightRatio: parseFloat(this._svgDom.getAttribute('data-text-height-ratio')) || 1,
        });

        if (result) {
            this._element   = result.element;
            // widthはTextDrawerが返す実際の描画幅。heightは与えたheightが常に実サイズ
            this.realWidth  = (result.width != null) ? result.width : width;
            this.realHeight = height;
        } else {
            // 描画失敗時（アイコンが幅に入らない等）もheightは制約として保持する。
            // realHeightを0にすると_childNaturalSizesにheight=0が記録されてしまい、
            // fitX/Yのpass1でcross方向にheight=0が渡されてアイコン等が正しく計算されない。
            this._element   = null;
            this.realWidth  = 0;
            this.realHeight = height;
        }
        this._uniformScale = 1;
    }

    getRealSize() {
        return { width: this.realWidth, height: this.realHeight };
    }

    // 指定サイズで再描画し、実際に設定されたサイズを返す
    setSize(width, height) {
        if (this.flexible) {
            // 比率変更を許可: 渡されたwidth/heightで再描画（axis方向のみ圧縮）
            this._render(width, height);
        } else {
            // 比率を維持したまま縮小し、uniformScaleをgetElementで適用する
            const sw = this._naturalWidth  > 0 ? width  / this._naturalWidth  : 1;
            const sh = this._naturalHeight > 0 ? height / this._naturalHeight : 1;
            this._uniformScale  = Math.min(sw, sh, 1); // 拡大はしない
            this.realWidth      = this._naturalWidth  * this._uniformScale;
            this.realHeight     = this._naturalHeight * this._uniformScale;
        }
        return { width: this.realWidth, height: this.realHeight };
    }

    // 描画済み要素をtranslate／scale付きで返す
    getElement() {
        if (!this._element) return null;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        if (this._uniformScale !== 1) {
            // flexible=false のとき: 原点でscaleしてからx,yへ移動
            g.setAttribute('transform',
                `translate(${this.x}, ${this.y}) scale(${this._uniformScale})`);
        } else {
            g.setAttribute('transform', `translate(${this.x}, ${this.y})`);
        }

        g.appendChild(this._element.cloneNode(true));
        return g;
    }
}
