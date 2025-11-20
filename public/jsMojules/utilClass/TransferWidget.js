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
    //生パラメータ（比率からの計算に使用）
    this.rawPosParams = {
        height: height,
        topTextOffset: topTextOffset,
        topTextHeight: topTextHeight,
        bottomTextOffset: bottomTextOffset,
        iconGap: iconGap,
        iconTextGap: iconTextGap,
        textGap: textGap,
    }
    // テキスト領域縦幅の計算
    this.rawPosParams.textAreaHeight = topTextOffset + height + bottomTextOffset;
    this.rawPosParams.topTextAreaHeight = topTextHeight;
    this.rawPosParams.bottomTextAreaHeight = this.rawPosParams.textAreaHeight - textGap - topTextHeight;
    // アイコンオフセット / テキストオフセット
    this.rawPosParams.iconOffset = Math.max(topTextOffset, 0);
    this.rawPosParams.textOffset = Math.min(topTextOffset, 0);

    //配置パラメータ(生パラメータで初期化)
    this.posParams = JSON.parse(JSON.stringify(this.rawPosParams));

    //その他パラメータ
    this.x = x;
    this.y = y;
    this.width = width;
    this.iconList = iconList;
    this.topText = topText;
    this.bottomText = bottomText;
    this.styleJsonTop = styleJsonTop;
    this.styleJsonBottom = styleJsonBottom;
    this.textDrawer = textDrawer;

    //実際の描画時の横幅を取得
    this.calcWidthParams();
  }

  get overallArea(){
    //全体横幅
    const overallWidth = this.iconWidth + this.posParams.iconTextGap + this.textAreaWidth;
    
    // 7. 全体縦幅
    const overallHeight = Math.max(this.posParams.height, this.textAreaHeight);

    // 8. 全体領域
    return {
      x: this.posParams.x,
      y: this.posParams.y - this.iconOffset,
      width: overallWidth,
      height: overallHeight,
    };
  }

  setCoordinate(x, y){
    this.x = x;
    this.y = y;
  }

  setHeight(newHeight){
    //比率計算
    const hRatio = newHeight / this.rawPosParams.height;

    Object.entries(this.rawPosParams).forEach(entry => {
        this.posParams[`${entry[0]}`] = entry[1] * hRatio;
    });

    this.calcWidthParams();
  }

  fitWidth(newWidth){
    this.width = newWidth;

    //テキストに割り振れる長さ
    const newTextWidth = newWidth - this.iconWidth - this.posParams.iconTextGap;

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

  calcWidthParams(){
    // アイコン長取得
    console.log(this.iconList)
    const iconObj = this.textDrawer.createIconTextByArea(
      this.iconList,
      this.x,
      this.y + this.posParams.iconOffset,
      this.width,
      this.posParams.height,
      this.styleJsonTop
    );
    this.iconWidth = iconObj.width;
    
    //無変形テキスト横幅取得
    this.RtopTextWidth = this.textDrawer.getTextWidth(this.topText, this.textDrawer.getFontSize(this.posParams.topTextAreaHeight, this.styleJsonTop.fontFamily, 'ja'), this.styleJsonTop);
    this.RbottomTextWidth = this.textDrawer.getTextWidth(this.bottomText, this.textDrawer.getFontSize(this.posParams.bottomTextAreaHeight, this.styleJsonBottom.fontFamily, 'ja'), this.styleJsonBottom);
    this.RtextAreaWidth = Math.max(this.RtopTextWidth, this.RbottomTextWidth);

    //テキスト横幅を無変形のもので初期化
    this.topTextWidth = this.RtopTextWidth;
    this.bottomTextWidth = this.RtextAreaWidth;
    this.textAreaWidth = Math.max(this.topTextWidth, this.bottomTextWidth);
  }

  //エレメントを取得
  getElement(){
    const SVG_NS = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(SVG_NS, "g");

    // 3. アイコン描画
    const iconObj = this.textDrawer.createIconTextByArea(
      this.iconList,
      this.x,
      this.y + this.posParams.iconOffset,
      this.width,
      this.posParams.height,
      this.styleJsonTop
    );
    group.appendChild(iconObj.element);

    // 上段・下段テキスト描画
    const textBaseX = this.x + this.iconWidth + this.posParams.iconTextGap;
    const topTextY = this.y + this.posParams.textOffset;
    const bottomTextY = this.y + this.posParams.textOffset + this.posParams.topTextAreaHeight + this.posParams.textGap;
    const maxTextWidth = this.width - this.iconWidth - this.posParams.iconTextGap;

    //console.log(this.rawPosParams, this.posParams)
    //console.log(textBaseX, topTextY, bottomTextY, maxTextWidth);
    //console.log(this.topTextWidth, this.bottomTextWidth)
    //console.log(this.width, this.iconWidth, this.textAreaWidth)

    // 上段テキスト
    const topTextObj = this.textDrawer.createByArea(
      this.topText,
      textBaseX,
      topTextY,
      maxTextWidth,
      this.posParams.topTextAreaHeight,
      this.styleJsonTop
    );
    group.appendChild(topTextObj.element);

    // 下段テキスト
    const bottomTextObj = this.textDrawer.createByArea(
      this.bottomText,
      textBaseX,
      bottomTextY,
      maxTextWidth,
      this.posParams.bottomTextAreaHeight,
      this.styleJsonBottom
    );
    group.appendChild(bottomTextObj.element);

    return group;
  }
}
