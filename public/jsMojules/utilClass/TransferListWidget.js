class TransferListWidget{
    constructor(area, lineCounts, colGap, lineGap){
        this.widgetList = [];
        this.lineCounts = lineCounts;
        this.lineNum = lineCounts.length;

        //描画範囲
        this.area = area;
        this.colGap = colGap;
        this.lineGap = lineGap;
    }

    addWidget(widget){
        this.widgetList.push(widget);
    }

    getElement(){
        const SVG_NS = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(SVG_NS, "g");

        const lineHeight = (this.area.height - ((this.lineNum - 1) * this.lineGap)) / this.lineNum;

        console.log(this.lineCounts);

        //ウィジェットの高さ設定
        this.widgetList.forEach((widget) => {
            widget.setHeight(lineHeight);
        })

        let itr = 0;
        let nowY = this.area.y;
        let remained = this.widgetList.length;
        for(let i = 0; i < this.lineCounts.length; i++){
            let count = this.lineCounts[i];

            //描画数が残りの駅より多ければ、残りを描画するようにする
            if(remained < count){ count = remained; }

            //描画する行のウィジェットを取得
            let lineWidgets = [];
            let j = 0
            for(; j < count; j++){
                lineWidgets.push(this.widgetList[j + itr]);
            }
            itr += j;

            if((i === this.lineCounts.length - 1) && (remained - count > 0)){
                //最後の行かつ駅が残っているなら、残りをすべて描画
                for(let j = 0; j < remained - count; j++){
                    lineWidgets.push(this.widgetList[j + itr]);
                }
            }

            //行全体の生の大きさ計算
            let lineWidth = (lineWidgets.length - 1) * this.colGap;
            lineWidgets.forEach((widget) => { lineWidth += widget.overallArea.width; })

            //表示エリアに合わせる
            let ratio = 1.0;
            if(lineWidth > this.area.width){
                ratio = this.area.width / lineWidth;
            }
            let nowX = this.area.x;
            lineWidgets.forEach((widget) => {
                widget.setCoordinate(nowX, nowY);
                widget.fitWidth(widget.overallArea.width * ratio);
                group.appendChild(widget.getElement())
                nowX += widget.overallArea.width + this.colGap * ratio;
            })

            nowY += lineHeight + this.lineGap;
            remained -= count;
            //すべて描画しきったら出る
            if(remained === 0){ break; }
        }
        
        return group;
    }
}