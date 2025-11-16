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
    //パラメータ保管
    this.params = {
        iconList: iconList,
        topText: topText,
        bottomText: bottomText,
        x: x,
        y: y,
        width,
        height: height,
        topTextOffset: topTextOffset,
        topTextHeight: topTextHeight,
        bottomTextOffset: bottomTextOffset,
        iconGap: iconGap,
        iconTextGap: iconTextGap,
        textGap: textGap,
        styleJsonTop: styleJsonTop,
        styleJsonBottom:styleJsonBottom
    }
    this.textDrawer = textDrawer;
    
    // テキスト領域縦幅の計算
    this.textAreaHeight = topTextOffset + height + bottomTextOffset;
    this.topTextAreaHeight = topTextHeight;
    this.bottomTextAreaHeight = this.textAreaHeight - textGap - topTextHeight;

    // アイコンオフセット / テキストオフセット
    this.iconOffset = Math.max(topTextOffset, 0);
    this.textOffset = Math.min(topTextOffset, 0);

    // アイコン長取得
    const iconObj = textDrawer.createIconTextByArea(
      iconList,
      x,
      y + this.iconOffset,
      width,
      height,
      styleJsonTop
    );
    this.iconWidth = iconObj.width;
    
    //無変形テキスト横幅取得
    this.RtopTextWidth = this.textDrawer.getTextWidth(this.params.topText, this.textDrawer.getFontSize(this.topTextAreaHeight, this.params.styleJsonTop.fontFamily, 'ja'), this.params.styleJsonTop);
    this.RbottomTextWidth = this.textDrawer.getTextWidth(this.params.bottomText, this.textDrawer.getFontSize(this.bottomTextAreaHeight, this.params.styleJsonBottom.fontFamily, 'ja'), this.params.styleJsonBottom);
    this.RtextAreaWidth = Math.max(this.RtopTextWidth, this.RbottomTextWidth);

    //テキスト横幅を無変形のもので初期化
    this.topTextWidth = this.RtopTextWidth;
    this.bottomTextWidth = this.RtextAreaWidth;
    this.textAreaWidth = Math.max(this.topTextWidth, this.bottomTextWidth);
  }

  get overallArea(){
    //全体横幅
    const overallWidth = this.iconWidth + this.params.iconTextGap + this.textAreaWidth;
    
    // 7. 全体縦幅
    const overallHeight = Math.max(this.params.height, this.textAreaHeight);

    // 8. 全体領域
    return {
      x: this.params.x,
      y: this.params.y - this.iconOffset,
      width: overallWidth,
      height: overallHeight,
    };
  }

  setCoordinate(x, y){
    this.params.x = x;
    this.params.y = y;
  }

  fitWidth(newWidth){
    this.params.width = newWidth;

    //テキストに割り振れる長さ
    const newTextWidth = newWidth - this.iconWidth - this.params.iconTextGap;

    //無変形テキスト横幅取得
    //上
    if(newTextWidth >= this.RtopTextWidth){
        //新しい大きさに、変形しなくても収まる場合
        this.topTextWidth = this.RtopTextWidth;
    }
    else{
        //変形が必要な場合
        this.topTextWidth = newTextWidth;
    }
    //下
    if(newTextWidth >= this.RbottomTextWidth){
        //新しい大きさに、変形しなくても収まる場合
        this.bottomTextWidth = this.RbottomTextWidth;
    }
    else{
        //変形が必要な場合
        this.bottomTextWidth = newTextWidth;
    }
    //全体
    this.textAreaWidth = Math.max(this.topTextWidth, this.bottomTextWidth);
  }

  //エレメントを取得
  getElement(){
    const SVG_NS = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(SVG_NS, "g");

    // 3. アイコン描画
    const iconObj = this.textDrawer.createIconTextByArea(
      this.params.iconList,
      this.params.x,
      this.params.y + this.iconOffset,
      this.params.width,
      this.params.height,
      this.params.styleJsonTop
    );
    group.appendChild(iconObj.element);

    // 上段・下段テキスト描画
    const textBaseX = this.params.x + this.iconWidth + this.params.iconTextGap;
    const topTextY = this.params.y + this.textOffset;
    const bottomTextY = this.params.y + this.textOffset + this.topTextAreaHeight + this.params.textGap;
    const maxTextWidth = this.params.width - this.iconWidth - this.params.iconTextGap;

    // 上段テキスト
    const topTextObj = this.textDrawer.createByArea(
      this.params.topText,
      textBaseX,
      topTextY,
      maxTextWidth,
      this.topTextAreaHeight,
      this.params.styleJsonTop
    );
    group.appendChild(topTextObj.element);

    // 下段テキスト
    const bottomTextObj = this.textDrawer.createByArea(
      this.params.bottomText,
      textBaseX,
      bottomTextY,
      maxTextWidth,
      this.bottomTextAreaHeight,
      this.params.styleJsonBottom
    );
    group.appendChild(bottomTextObj.element);

    return group;
  }
}
