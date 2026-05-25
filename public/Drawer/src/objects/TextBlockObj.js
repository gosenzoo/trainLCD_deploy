// lcdParts="text" に対応する改行対応テキストブロッククラス
// textArea（全体範囲）と textLine（行スタイル）を子要素に持つ <g> 要素に使用する
class TextBlockObj extends LcdPartsObj {
    constructor(svgDom, drawParams, args, textDrawer) {
        super(svgDom, drawParams, args);
        this._textDrawer = textDrawer;
        this._svgDom     = svgDom;

        // textArea と textLine を子要素から取得する
        let textAreaEl = null;
        let textLineEl = null;
        for (const child of svgDom.children) {
            if (!child.getAttribute) continue;
            const p = child.getAttribute('lcdParts');
            if (p === 'textArea') textAreaEl = child;
            else if (p === 'textLine') textLineEl = child;
        }

        // textArea: テキストブロック全体の範囲
        this._areaX = parseFloat(textAreaEl?.getAttribute('x'))      || 0;
        this._areaY = parseFloat(textAreaEl?.getAttribute('y'))      || 0;
        this._areaW = parseFloat(textAreaEl?.getAttribute('width'))  || 0;
        this._areaH = parseFloat(textAreaEl?.getAttribute('height')) || 0;

        // textLine: 行高さとスタイル（data-style 属性に JSON スタイルを記述。textBox と同形式）
        this._lineH = parseFloat(textLineEl?.getAttribute('height')) || 0;
        try {
            this._lineStyle = JSON.parse(textLineEl?.getAttribute('data-style') || '{}');
        } catch {
            this._lineStyle = {};
        }

        // textLine の描画オプション（TextBoxObj と同形式）
        this._lang            = textLineEl?.getAttribute('lang')                               || null;
        this._spacing         = parseFloat(textLineEl?.getAttribute('spacing'))                || NaN;
        this._base            = textLineEl?.getAttribute('base')                               || null;
        this._textHeightRatio = parseFloat(textLineEl?.getAttribute('data-text-height-ratio')) || 1;

        // lcdText: 変数参照（#{...}）を展開してから \n で行分割する
        // SVG 属性中の \n はリテラル2文字（\＋n）のため、実際の改行文字に変換してから分割する
        const lcdTextAttr  = svgDom.getAttribute('lcdText') || '';
        const resolvedText = LcdPartsObj.resolveTemplate(lcdTextAttr, drawParams, args);
        this._segments = resolvedText ? resolvedText.replace(/\\n/g, '\n').split('\n') : [];

        // interval: 行間ピクセル数
        this._interval = parseFloat(svgDom.getAttribute('interval')) || 0;

        // lcd-holAlign → textAnchor マッピング
        const holAlign   = svgDom.getAttribute('lcd-holAlign') || 'left';
        const anchorMap  = { left: 'start', center: 'middle', right: 'end' };
        this._textAnchor = anchorMap[holAlign] || 'start';

        // lcd-verAlign: ブロック先頭 y の計算方法
        this._verAlign = svgDom.getAttribute('lcd-verAlign') || 'top';

        // breakType: "1" のとき幅超過セグメントを自動折り返しして追加行を生成する
        this._breakType = svgDom.getAttribute('breakType') || '0';
    }

    // breakType="1" の場合: 各セグメントを自動折り返しして lines[] に展開する
    // breakType="0" の場合: segments をそのまま返す
    _buildLines() {
        if (this._breakType !== '1') return this._segments;
        const result = [];
        for (const seg of this._segments) {
            const wrapped = this._wrapText(seg);
            for (const line of wrapped) result.push(line);
        }
        return result;
    }

    // テキストを areaW に圧縮なしで収まる文字数で再帰的に折り返す
    _wrapText(text) {
        if (!text) return [text];

        const lang     = this._lang || 'ja';
        // letterSpacing がオブジェクト形式の場合は幅計測で NaN になるため除外する
        const styleForMeasure = { ...this._lineStyle };
        if (styleForMeasure.letterSpacing && typeof styleForMeasure.letterSpacing === 'object') {
            delete styleForMeasure.letterSpacing;
        }
        const fontSize = this._textDrawer.getFontSize(this._lineH, styleForMeasure.fontFamily, lang);

        if (this._textDrawer.getTextWidth(text, fontSize, styleForMeasure) <= this._areaW) {
            // 圧縮なしで収まる場合はそのまま返す
            return [text];
        }

        // 二分探索で「圧縮なしで収まる最大文字数 k」を求める
        // lo=1 を最小値とすることで空文字による無限再帰を防ぐ
        let lo = 1, hi = text.length - 1;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (this._textDrawer.getTextWidth(text.slice(0, mid), fontSize, styleForMeasure) <= this._areaW) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }

        // 先頭 lo 文字を今の行とし、残りを再帰的に折り返す
        return [text.slice(0, lo), ...this._wrapText(text.slice(lo))];
    }

    // 全行分の SVG 要素を格納した <g> を生成して返す
    _buildGroup() {
        // breakType に応じてセグメントを展開する
        const lines    = this._buildLines();
        const lineH    = this._lineH;
        const N        = lines.length;
        const interval = this._interval;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (N === 0 || lineH === 0) return g;

        // ブロック全体の高さ（行高さ × 行数 + 行間 × (行数-1)）
        const totalH = lineH * N + interval * (N - 1);

        // lcd-verAlign に応じてブロック先頭 y を計算する
        let blockStartY;
        if (this._verAlign === 'center') {
            blockStartY = this._areaY + (this._areaH - totalH) / 2;
        } else if (this._verAlign === 'bottom') {
            blockStartY = this._areaY + this._areaH - totalH;
        } else { // top
            blockStartY = this._areaY;
        }

        for (let i = 0; i < N; i++) {
            const lineY = blockStartY + i * (lineH + interval);
            // textArea の下端を超える行はスキップする
            if (lineY + lineH > this._areaY + this._areaH) continue;

            const lineText = lines[i];
            // 空行は y 位置を確保した上で描画をスキップする
            if (!lineText) continue;

            // textAnchor を styleJson に設定してテキストを描画する
            const styleJson = JSON.parse(JSON.stringify(this._lineStyle));
            styleJson.textAnchor = this._textAnchor;

            const result = this._textDrawer.create(lineText, {
                x:               this._areaX,
                y:               lineY,
                width:           this._areaW,
                height:          lineH,
                styleJson,
                lang:            this._lang,
                axis:            null,
                spacing:         this._spacing,
                base:            this._base,
                transform:       null,
                textHeightRatio: this._textHeightRatio,
            });

            if (result && result.element) {
                g.appendChild(result.element);
            }
        }

        return g;
    }

    // 描画済みグループ要素を返す
    // langId が変わるたびに再描画するため毎回 _buildGroup を呼ぶ
    getElement(ctx = null) {
        if (ctx) {
            if (ctx.resolveValue !== undefined) this._resolveValue = ctx.resolveValue;
            if (ctx.exprParser   !== undefined) this._exprParser   = ctx.exprParser;
        }

        const g = this._buildGroup();

        const isVisible   = this._evalVisible();
        this._prevVisible = isVisible;
        g.style.visibility = isVisible ? '' : 'hidden';
        this._domEl = g;
        return this._wrapTransform(g);
    }

    // visible を再評価してアニメーションを適用する
    langChange(transTime, gapTime) {
        this._applyVisibleAnim(transTime, gapTime);
    }
}
