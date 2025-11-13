class TransferWidget {
  /**
   * @param {string} iconList
   * @param {string} topText
   * @param {string} bottomText
   * @param {number} x
   * @param {number} y
   * @param {number} height
   * @param {number} topTextOffset
   * @param {number} topTextHeight
   * @param {number} bottomTextOffset
   * @param {number} iconGap
   * @param {number} iconTextGap
   * @param {number} textGap
   * @param {object} textDrawer  // ユーザー側で用意するオブジェクト
   */
  constructor(
    iconList,
    topText,
    bottomText,
    x,
    y,
    width,
    height,
    topTextOffset,
    topTextHeight,
    bottomTextOffset,
    iconGap,
    iconTextGap,
    textGap,
    textDrawer,
    styleJsonTop = {},
    styleJsonBottom = {}
  ) {
    const SVG_NS = "http://www.w3.org/2000/svg";

    // 親 <g> 要素
    this.group = document.createElementNS(SVG_NS, "g");

    // 1. テキスト領域縦幅の計算
    const textAreaHeight = topTextOffset + height + bottomTextOffset;
    const topTextAreaHeight = topTextHeight;
    const bottomTextAreaHeight = textAreaHeight - textGap - topTextHeight;

    // 2. アイコンオフセット / テキストオフセット
    const iconOffset = Math.max(topTextOffset, 0);
    const textOffset = Math.min(topTextOffset, 0);

    // 3. アイコン描画
    //   textDrawer.createByAreaEl(iconList, x, y + アイコンオフセット, 2000, height)
    const iconObj = textDrawer.createIconTextByArea(
      iconList,
      x,
      y + iconOffset,
      width,
      height,
      styleJsonTop
    );
    const iconWidth = iconObj.width;

    // アイコンのグループがあれば this.group に追加
    if (iconObj && iconObj.group instanceof SVGGElement) {
      this.group.appendChild(iconObj.group);
    }

    // 4. 上段・下段テキスト描画
    const textBaseX = x + iconWidth + iconTextGap;
    const topTextY = y + textOffset;
    const bottomTextY = y + textOffset + topTextAreaHeight + textGap;
    const maxTextWidth = width - iconWidth - iconTextGap

    // 上段テキスト
    const topTextObj = textDrawer.createByArea(
      topText,
      textBaseX,
      topTextY,
      maxTextWidth,
      topTextAreaHeight,
      styleJsonTop
    );

    // 下段テキスト
    const bottomTextObj = textDrawer.createByArea(
      bottomText,
      textBaseX,
      bottomTextY,
      maxTextWidth,
      bottomTextAreaHeight,
      styleJsonBottom
    );

    if (topTextObj && topTextObj.group instanceof SVGGElement) {
      (this.group).appendChild(topTextObj.group);
    }
    if (bottomTextObj && bottomTextObj.group instanceof SVGGElement) {
      (this.group).appendChild(bottomTextObj.group);
    }

    // 5. テキスト領域横幅
    const topTextWidth =
      topTextObj && typeof topTextObj.width === "number" ? topTextObj.width : 0;
    const bottomTextWidth =
      bottomTextObj && typeof bottomTextObj.width === "number" ? bottomTextObj.width : 0;
    const textAreaWidth = Math.max(topTextWidth, bottomTextWidth);

    // 6. 全体横幅
    const overallWidth = iconWidth + iconTextGap + textAreaWidth;

    // 7. 全体縦幅
    const overallHeight = Math.max(height, textAreaHeight);

    // 8. 全体領域
    this.overallArea = {
      x: x,
      y: y,
      width: overallWidth,
      height: overallHeight,
    };

    (this.group).appendChild(iconObj.element);
    (this.group).appendChild(topTextObj.element);
    (this.group).appendChild(bottomTextObj.element);

    // お好みでフィールドとして保持しておく
    this.iconObj = iconObj;
    this.topTextObj = topTextObj;
    this.bottomTextObj = bottomTextObj;
    this.iconGap = iconGap;
    this.iconTextGap = iconTextGap;
    this.textGap = textGap;
  }
}
