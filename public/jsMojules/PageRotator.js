class PageRotator {
  constructor(onSwitch) {
    if (typeof onSwitch !== "function") {
      throw new Error("コンストラクタには描画用関数（onSwitch）が必要です。");
    }
    this.onSwitch = onSwitch;

    this.pattern = null;      
    this.index = 0;           
    this.currentPage = null;  
    this.timerId = null;
    this.isRunning = false;
  }

  getCurrentPage() {
    return this.currentPage;
  }

  getCurrentIndex() {
    if (!this.pattern || this.pattern.length === 0) return -1;
    return (this.index - 1 + this.pattern.length) % this.pattern.length;
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  restart(pattern) {
    // 停止
    this.stop();

    if (!Array.isArray(pattern) || pattern.length === 0) {
      this.pattern = null;
      this.currentPage = null;
      this.index = 0;
      return;
    }

    // パターン設定
    this.pattern = pattern;
    this.index = 0;
    this.isRunning = true;

    // 切り替え開始
    this.#switchAndSchedule();
  }

  /** 切り替え dispatch */
  #switchAndSchedule() {
    if (!this.isRunning || !this.pattern?.length) return;

    if (this.pattern.length === 1) {
      this.#switchSingle();
    } else {
      this.#switchMultiple();
    }
  }

  /** ✅ パターン要素数1用：ページ固定、以後切り替えなし */
  #switchSingle() {
    const [onlyPage] = this.pattern[0];
    this.currentPage = onlyPage;
    this.index = 0;
    this.timerId = null; // 次回呼び出しなし

    try {
      this.onSwitch(this);
    } catch (e) {
      console.error("onSwitch 実行中に例外:", e);
    }
  }

  /** ✅ パターン要素数2以上用：通常切り替え */
  #switchMultiple() {
    const [pageObj, durationMs] = this.pattern[this.index];
    this.currentPage = pageObj;

    this.index = (this.index + 1) % this.pattern.length;

    try {
      this.onSwitch(this);
    } catch (e) {
      console.error("onSwitch 実行中に例外:", e);
    }

    const d = Math.max(0, Number(durationMs) || 0);
    this.timerId = setTimeout(() => this.#switchAndSchedule(), d);
  }
}
