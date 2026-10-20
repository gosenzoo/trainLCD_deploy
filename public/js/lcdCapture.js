// ============================================================
// LcdCapture
// LCD表示の画像保存（7.65節）。表示中の LCD の SVG を、決まった解像度の PNG 画像にする。
//   - フォント: 表示を開いたときに、テンプレートが使う Web フォントを取得して埋め込み形式（data URL）にし、
//               メモリに置いておく（preloadFonts）。画像にするときはこれを SVG に入れるだけなので、オフラインでも使える
//   - 画像: SVG の中のファイル参照の画像は、画像にするときに埋め込み形式にする
//   - プレビューのポップアップ（「保存」でダウンロード、「キャンセル」で閉じる）とカメラボタンもここで扱う
// ============================================================

// 事前に取得するフォント（テンプレートが使うもの）
const CAPTURE_FONT_SOURCES = {
    // Google Fonts の CSS。日本語フォントは文字の範囲（unicode-range）ごとのファイルに分かれている
    googleCss: 'https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&display=swap',
    // サイトに置いているフォント
    local: [
        { family: 'Overused Grotesk', weight: '600', url: '/fonts/OverusedGrotesk-SemiBold.woff2', format: 'woff2' },
    ],
};

// 同時に取得するファイル数（取得が表示の邪魔にならないよう絞る）
const CAPTURE_FONT_FETCH_CONCURRENCY = 4;

class LcdCapture {
    constructor() {
        // 埋め込み形式にしたフォント: { family, weight, style, ranges: [[from, to], ...] | null, dataUrl, format }
        this._fontFaces = [];
        this._fontsReady = false;
        this._busyEl = null;
        this._previewEl = null;
        this._previewUrl = null;
    }

    /** プレビュー・作成中の表示があるかどうか（表示中は LCD の操作を受け付けない） */
    get isOpen() { return this._previewEl !== null || this._busyEl !== null; }

    // ============================================================
    // フォントの事前取得
    // ============================================================

    /** 表示を開いたときに呼ぶ。裏でフォントを取得して埋め込み形式にしておく（失敗しても例外は出さない） */
    async preloadFonts() {
        const faces = [];
        try {
            const css = await (await fetch(CAPTURE_FONT_SOURCES.googleCss)).text();
            faces.push(...this._parseFontFaces(css));
        } catch (e) {
            console.warn('画像保存用のフォント（Google Fonts）を取得できませんでした。画像では端末のフォントを使います', e);
        }
        CAPTURE_FONT_SOURCES.local.forEach(f => faces.push({ family: f.family, weight: f.weight, style: 'normal', ranges: null, url: f.url, format: f.format }));

        // 少しずつ取得して埋め込み形式にする
        const queue = [...faces];
        const worker = async () => {
            while (queue.length > 0) {
                const face = queue.shift();
                try {
                    const blob = await (await fetch(face.url)).blob();
                    face.dataUrl = await this._blobToDataUrl(blob);
                    this._fontFaces.push(face);
                } catch (e) {
                    // 取得できなかったファイルは使わない（その文字は端末のフォントになる）
                }
            }
        };
        await Promise.all(Array.from({ length: CAPTURE_FONT_FETCH_CONCURRENCY }, worker));
        this._fontsReady = true;
    }

    /** CSS の @font-face を読み取る（family・weight・style・unicode-range・woff2 の URL） */
    _parseFontFaces(css) {
        const faces = [];
        const blocks = css.match(/@font-face\s*{[^}]*}/g) || [];
        blocks.forEach(block => {
            const get = (prop) => (block.match(new RegExp(prop + '\\s*:\\s*([^;]+);')) || [])[1]?.trim();
            const url = (block.match(/url\(([^)]+)\)\s*format\(['"]?(\w+)['"]?\)/) || []);
            if (!url[1]) return;
            const ranges = get('unicode-range')
                ? get('unicode-range').split(',').map(r => {
                    const m = r.trim().replace(/^U\+/i, '').split('-');
                    const from = parseInt(m[0].replace(/\?/g, '0'), 16);
                    const to = m[1] ? parseInt(m[1], 16) : parseInt(m[0].replace(/\?/g, 'F'), 16);
                    return [from, to];
                })
                : null;
            faces.push({
                family: (get('font-family') || '').replace(/['"]/g, ''),
                weight: get('font-weight') || '400',
                style: get('font-style') || 'normal',
                ranges,
                url: url[1].replace(/['"]/g, ''),
                format: url[2] || 'woff2',
            });
        });
        return faces;
    }

    _blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // ============================================================
    // 画像化
    // ============================================================

    /**
     * 表示中の LCD を画像にしてプレビューを開く
     * @param {SVGSVGElement} svgEl - 表示中の LCD の SVG
     * @param {{width: number, height: number}} size - 画像の解像度（レイアウトごとの定数）
     */
    async captureAndPreview(svgEl, size) {
        if (this.isOpen) return;
        this._showBusy();
        try {
            const blob = await this.capture(svgEl, size);
            this._hideBusy();
            this._openPreview(blob);
        } catch (e) {
            this._hideBusy();
            console.error('画像にできませんでした', e);
            alert('画像にできませんでした');
        }
    }

    /** 表示中の LCD を PNG の Blob にする */
    async capture(svgEl, size) {
        // 押した時点の状態を複製する（以降の表示の変化の影響を受けない）
        const clone = svgEl.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        clone.setAttribute('width', String(size.width));
        clone.setAttribute('height', String(size.height));
        clone.style.width = '';
        clone.style.height = '';

        await this._inlineImages(clone);
        this._embedFonts(clone);

        const svgText = new XMLSerializer().serializeToString(clone);
        const svgUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
        try {
            const img = await new Promise((resolve, reject) => {
                const im = new Image();
                im.onload = () => resolve(im);
                im.onerror = reject;
                im.src = svgUrl;
            });
            const canvas = document.createElement('canvas');
            canvas.width = size.width;
            canvas.height = size.height;
            const ctx = canvas.getContext('2d');
            // 表示と同じく背景は黒にする
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, size.width, size.height);
            ctx.drawImage(img, 0, 0, size.width, size.height);
            return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        } finally {
            URL.revokeObjectURL(svgUrl);
        }
    }

    /** SVG の中のファイル参照の画像を埋め込み形式にする（取得できない画像は外す） */
    async _inlineImages(svg) {
        const images = Array.from(svg.querySelectorAll('image'));
        await Promise.all(images.map(async (el) => {
            const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            if (!href || href.startsWith('data:')) return;
            try {
                const blob = await (await fetch(new URL(href, document.baseURI))).blob();
                const dataUrl = await this._blobToDataUrl(blob);
                el.setAttribute('href', dataUrl);
                el.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
            } catch (e) {
                el.remove();
            }
        }));
    }

    /** 画面に出ている文字を含むフォントだけを @font-face として SVG に入れる */
    _embedFonts(svg) {
        if (this._fontFaces.length === 0) return;
        const codePoints = new Set();
        for (const ch of svg.textContent || '') codePoints.add(ch.codePointAt(0));
        const used = this._fontFaces.filter(face =>
            !face.ranges || face.ranges.some(([from, to]) => {
                for (const cp of codePoints) if (cp >= from && cp <= to) return true;
                return false;
            })
        );
        const css = used.map(face =>
            `@font-face{font-family:"${face.family}";font-weight:${face.weight};font-style:${face.style};` +
            `src:url(${face.dataUrl}) format("${face.format}");` +
            (face.ranges ? `unicode-range:${face.ranges.map(([a, b]) => `U+${a.toString(16)}-${b.toString(16)}`).join(',')};` : '') + '}'
        ).join('\n');
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = css;
        svg.insertBefore(style, svg.firstChild);
    }

    // ============================================================
    // 作成中の表示・プレビュー
    // ============================================================

    _showBusy() {
        const el = document.createElement('div');
        el.className = 'dsp-backdrop';
        el.innerHTML = '<div class="dsp-dialog" style="min-width:auto">画像を作成中</div>';
        el.addEventListener('mousedown', (e) => e.stopPropagation());
        el.addEventListener('touchstart', (e) => e.stopPropagation());
        document.body.appendChild(el);
        this._busyEl = el;
    }

    _hideBusy() {
        if (this._busyEl) this._busyEl.remove();
        this._busyEl = null;
    }

    /** プレビューのポップアップ。「保存」でダウンロード、「キャンセル」・外側のタップで何もせず閉じる */
    _openPreview(blob) {
        this._previewUrl = URL.createObjectURL(blob);
        const backdrop = document.createElement('div');
        backdrop.className = 'dsp-backdrop';
        // body の onmousedown="return false" でボタンが押せなくならないよう、ポップアップ内では伝えない
        backdrop.addEventListener('mousedown', (e) => e.stopPropagation());
        backdrop.addEventListener('touchstart', (e) => e.stopPropagation());
        const openedAt = Date.now();
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop && Date.now() - openedAt > 500) this.closePreview(); });

        const dialog = document.createElement('div');
        dialog.className = 'dsp-dialog';
        dialog.innerHTML = `
            <div class="dsp-title-row"><span class="dsp-title">画像の保存</span></div>
            <img alt="LCDの画像" class="dsp-preview-img" style="display:block; max-width:min(80vw, 960px); max-height:60vh; width:100%; object-fit:contain; background:#000;">
            <div class="dsp-footer" style="gap:8px"></div>`;
        dialog.querySelector('img').src = this._previewUrl;
        const footer = dialog.querySelector('.dsp-footer');
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', () => { this._download(); this.closePreview(); });
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'キャンセル';
        cancelBtn.addEventListener('click', () => this.closePreview());
        footer.append(saveBtn, cancelBtn);

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);
        this._previewEl = backdrop;
    }

    closePreview() {
        if (this._previewEl) this._previewEl.remove();
        this._previewEl = null;
        if (this._previewUrl) URL.revokeObjectURL(this._previewUrl);
        this._previewUrl = null;
    }

    /** lcd_年月日_時分秒.png としてダウンロードする */
    _download() {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        const name = `lcd_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
        const a = document.createElement('a');
        a.href = this._previewUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    // ============================================================
    // カメラボタン
    // ============================================================

    /**
     * 画面下部の中央にカメラボタンを作る（初めは隠しておく）
     * @param {Function} onPress - 押したときの処理
     * @returns {HTMLButtonElement}
     */
    createCameraButton(onPress) {
        const btn = document.createElement('button');
        btn.title = '画像を保存';
        btn.className = 'lcd-camera-btn';  // スマホでは2倍の大きさにする（7.66節）
        btn.style.cssText = 'display:none; position:fixed; left:50%; bottom:12px; transform:translateX(-50%); z-index:900;' +
            'width:52px; height:52px; border-radius:50%; border:2px solid #fff; background:rgba(0,0,0,0.55); color:#fff; cursor:pointer; padding:0;';
        // カメラマーク
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></svg>';
        // ボタンを押してもページ送り（画面中央下のタッチ）にならないよう、LCD の操作には伝えない
        btn.addEventListener('touchstart', (e) => e.stopPropagation());
        btn.addEventListener('mousedown', (e) => e.stopPropagation());
        btn.addEventListener('click', (e) => { e.stopPropagation(); onPress(); });
        document.body.appendChild(btn);
        return btn;
    }
}
