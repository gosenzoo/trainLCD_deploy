class HeaderDrawer{
    constructor(headerSVG) {
        //headerSVGから、idをもとに各SVG要素を取得
        this.backSVG = headerSVG.queryselector("#header-back");
        this.trainTypeSVG = headerSVG.queryselector("#header-trainType");
        this.numberingSVG = headerSVG.queryselector("#header-numbering");
        this.carNumSVG = headerSVG.queryselector("#header-carNum");
        this.destinationSVG = headerSVG.queryselector("#header-destination");
        this.runStateTextSVG = headerSVG.queryselector("#header-runStateText");

        this.langTimer = null; //言語切り替えタイマーを管理する変数
        this._langState = 0; //言語状態を管理する変数
    }

    drawAll(drawTree, drawRect, params){ //全てのヘッダー要素を描画

    }
    drawBack(drawTree, drawRect){ //ヘッダーの背景を描画
        const back = this.backSVG.cloneNode(true); //背景SVGを複製
        back.setAttribute("x", drawRect.x); //背景のx座標を設定
        back.setAttribute("y", drawRect.y); //背景のy座標を設定
        back.setAttribute("width", drawRect.width); //背景の幅を設定
        back.setAttribute("height", drawRect.height); //背景の高さを設定
        drawTree.appendChild(back); //描画ツリーに追加
    }
    drawTrainType(){ //列車種別を描画
        
    }
    drawNumbering(){ //表示駅のナンバリングを描画

    }
    drawCarNum(){ //号車を描画
    
    }
    drawDestination(){ //行先・経由地を描画

    }
    drawRunstateText(){ //つぎは、まもなく、ただいまを描画

    }


    setLangTimer(interval){ //言語切り替えタイマーを設定
        clearInterval(this.langTimer); //既存のタイマーをクリア
        this.langTimer = setInterval(() => {
            this.langState++;
        }, interval);
    }
    set langState(state){
        if(state < 0){
            state = 2
        }
        else if(2 < state){
            state = 0
        }
        this._langState = state;
    }
    get langState(){
        return this._langState;
    }
}