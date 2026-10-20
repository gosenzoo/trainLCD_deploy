// ============================================================
// DisplaySettingPopup
// LCD表示中の「表示設定」ポップアップ（7.56節）。エディタの「表示設定」と同じ内容を切り替える。
//   - 画面送り（手動・自動(時間)・自動(座標)）
//   - 手動操作を許可（画面送りが手動のときはグレーアウト）
//   - 環状運転(準備中)（常にグレーアウト）
//   - UI表示（オンで画面下部にカメラボタンを出す。7.65節）
// 変更はその場でコールバックに通知する。設定データ（localStorage）には保存しない。
// ============================================================

const DISPLAY_SETTING_MODES = [
    { value: 'manual', label: '手動' },
    { value: 'time',   label: '自動(時間)' },
    { value: 'coord',  label: '自動(座標)' },
];

// ポップアップの見た目（エディタの表示設定に合わせる）。1回だけ <head> に追加する。
// 縦長の狭い画面では、項目名とスイッチを折り返して並べる
const DISPLAY_SETTING_STYLE = `
/* スマホ（is-phone）では2倍の大きさにする（7.66節）。display.html は画面幅に合わせる指定が無く、スマホでは縮小して表示されるため */
.is-phone .dsp-dialog { zoom: 2; max-width: calc((100vw - 32px) / 2); min-width: min(320px, calc((100vw - 32px) / 2)); }
.is-phone .dsp-preview-img { max-height: 30vh !important; }
.is-phone .lcd-camera-btn { zoom: 2; }
.dsp-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.dsp-dialog { background: #161b22; color: #e6edf3; border: 1px solid #30363d; border-radius: 8px; padding: 16px 20px; min-width: min(320px, calc(100vw - 32px)); box-sizing: border-box; max-width: calc(100vw - 32px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); font-family: 'BIZ UDGothic', sans-serif; font-size: 14px; }
.dsp-title-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #30363d; }
.dsp-title { font-weight: bold; font-size: 16px; }
.dsp-close-x { background: none; border: none; color: #8b949e; font-size: 18px; cursor: pointer; }
.dsp-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 10px 0; }
.dsp-row label { min-width: 110px; white-space: nowrap; }
.dsp-row.dsp-disabled { opacity: 0.4; pointer-events: none; }
.dsp-segment { display: inline-flex; border: 1px solid #30363d; border-radius: 6px; overflow: hidden; }
.dsp-segment button { background: #21262d; color: #e6edf3; border: none; border-right: 1px solid #30363d; padding: 6px 10px; cursor: pointer; font-family: inherit; font-size: 13px; white-space: nowrap; }
.dsp-segment button:last-child { border-right: none; }
.dsp-segment button.dsp-active { background: #388bfd; color: #fff; }
.dsp-toggle { position: relative; width: 40px; height: 22px; border-radius: 11px; background: #30363d; border: none; cursor: pointer; padding: 0; }
.dsp-toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left 0.15s; }
.dsp-toggle.dsp-on { background: #388bfd; }
.dsp-toggle.dsp-on::after { left: 21px; }
.dsp-footer { display: flex; justify-content: flex-end; margin-top: 14px; }
.dsp-footer button { background: #21262d; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-family: inherit; }
`;

// スマホ（指で操作し、画面の長辺が 1000px 未満の端末）かどうかを html 要素の is-phone クラスで表す（7.66節）。
// タブレットやパソコンは対象外にする
if (window.matchMedia('(pointer: coarse)').matches && Math.max(screen.width, screen.height) < 1000) {
    document.documentElement.classList.add('is-phone');
}

class DisplaySettingPopup {
    /**
     * @param {object}   initial
     * @param {string}   initial.mode          - 画面送り（'manual' | 'time' | 'coord'）
     * @param {boolean}  initial.allowManual   - 手動操作を許可
     * @param {boolean}  initial.isLoop        - 環状運転（表示のみ。変更はできない）
     * @param {object}   callbacks
     * @param {Function} callbacks.onModeChange        - 画面送りを変えたとき。引数: (mode)
     * @param {Function} callbacks.onAllowManualChange - 手動操作を許可を変えたとき。引数: (allowManual)
     * @param {Function} [callbacks.onUiVisibleChange] - UI表示を変えたとき。引数: (uiVisible)（7.65節）
     */
    constructor(initial, callbacks) {
        this._mode        = initial.mode ?? 'manual';
        this._allowManual = initial.allowManual ?? true;
        this._isLoop      = !!initial.isLoop;
        this._uiVisible   = !!initial.uiVisible;  // UI表示（7.65節）。初期値はオフ
        this._callbacks   = callbacks;
        this._el          = null;

        if (!document.getElementById('dsp-style')) {
            const style = document.createElement('style');
            style.id = 'dsp-style';
            style.textContent = DISPLAY_SETTING_STYLE;
            document.head.appendChild(style);
        }
    }

    /** ポップアップを表示中かどうか */
    get isOpen() { return this._el !== null; }

    /** ポップアップの内側の要素かどうか（表示中の LCD 操作の判定に使う） */
    contains(node) { return !!(this._el && this._el.contains(node)); }

    toggle() { if (this.isOpen) this.close(); else this.open(); }

    open() {
        if (this.isOpen) return;
        // 背景（LCD 全体を覆ってグレーアウトする）。ポップアップの外のクリック・タップで閉じる
        const backdrop = document.createElement('div');
        backdrop.className = 'dsp-backdrop';
        backdrop.addEventListener('click', (e) => {
            // タッチで開いた直後は、同じタップから届くクリックで閉じないよう少しのあいだ無視する
            if (e.target === backdrop && Date.now() - this._openedAt > 500) this.close();
        });
        // body の onmousedown="return false" でボタンが押せなくならないよう、ポップアップ内では伝えない
        backdrop.addEventListener('mousedown', (e) => e.stopPropagation());

        const dialog = document.createElement('div');
        dialog.className = 'dsp-dialog';
        backdrop.appendChild(dialog);
        this._el = backdrop;
        this._dialog = dialog;
        this._openedAt = Date.now();
        this._render();
        document.body.appendChild(backdrop);
    }

    close() {
        if (!this._el) return;
        this._el.remove();
        this._el = null;
        this._dialog = null;
    }

    /** ダイアログの中身を今の値で作り直す */
    _render() {
        const d = this._dialog;
        d.innerHTML = '';

        // タイトルと「×」
        const titleRow = document.createElement('div');
        titleRow.className = 'dsp-title-row';
        const title = document.createElement('span');
        title.className = 'dsp-title';
        title.textContent = '表示設定';
        const closeX = document.createElement('button');
        closeX.className = 'dsp-close-x';
        closeX.textContent = '×';
        closeX.title = '閉じる';
        closeX.addEventListener('click', () => this.close());
        titleRow.append(title, closeX);
        d.appendChild(titleRow);

        // 画面送り（3つのうち1つを選ぶ切り替えスイッチ）
        const modeRow = this._row('画面送り', false);
        const segment = document.createElement('div');
        segment.className = 'dsp-segment';
        DISPLAY_SETTING_MODES.forEach(m => {
            const b = document.createElement('button');
            b.textContent = m.label;
            if (m.value === this._mode) b.classList.add('dsp-active');
            b.addEventListener('click', () => {
                if (this._mode === m.value) return;
                this._mode = m.value;
                this._callbacks.onModeChange(m.value);
                this._render();
            });
            segment.appendChild(b);
        });
        modeRow.appendChild(segment);

        // 手動操作を許可（画面送りが手動のときはグレーアウト）
        const allowRow = this._row('手動操作を許可', this._mode === 'manual');
        allowRow.appendChild(this._toggle(this._allowManual, () => {
            this._allowManual = !this._allowManual;
            this._callbacks.onAllowManualChange(this._allowManual);
            this._render();
        }));

        // 環状運転(準備中)（常にグレーアウト）
        const loopRow = this._row('環状運転(準備中)', true);
        loopRow.appendChild(this._toggle(this._isLoop, () => {}));

        // UI表示（7.65節）。オンで画面下部にカメラボタンを出す。一番下に置く
        const uiRow = this._row('UI表示', false);
        uiRow.appendChild(this._toggle(this._uiVisible, () => {
            this._uiVisible = !this._uiVisible;
            if (this._callbacks.onUiVisibleChange) this._callbacks.onUiVisibleChange(this._uiVisible);
            this._render();
        }));

        // 閉じる
        const footer = document.createElement('div');
        footer.className = 'dsp-footer';
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '閉じる';
        closeBtn.addEventListener('click', () => this.close());
        footer.appendChild(closeBtn);
        d.appendChild(footer);
    }

    _row(labelText, disabled) {
        const row = document.createElement('div');
        row.className = 'dsp-row' + (disabled ? ' dsp-disabled' : '');
        const label = document.createElement('label');
        label.textContent = labelText;
        row.appendChild(label);
        this._dialog.appendChild(row);
        return row;
    }

    _toggle(isOn, onClick) {
        const b = document.createElement('button');
        b.className = 'dsp-toggle' + (isOn ? ' dsp-on' : '');
        b.addEventListener('click', onClick);
        return b;
    }
}
