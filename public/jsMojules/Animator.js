class Animator{
    constructor(){
        this.num = 0;

        console.log("Animator初期化完了");
    }

    resetNum(){
        this.num = 0;
    }

    createKurukuruSvg(svgList, kuruTop, kuruBottom, dispTime, transTime, gapTime){
        const kuruGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

        //1周期の時間[s]
        let periodTime = (dispTime + transTime + gapTime) * svgList.length / 1000;

        let styleText = "";
        for(let i = 0; i < svgList.length; i++){
            styleText +=  `
                .animation${this.num} { 
                    animation-name: animation${this.num};
                    animation-duration:${periodTime}s;
                    animation-iteration-count: infinite;
                    animation-timing-function: linear;
                }
                @keyframes animation${this.num} {
                    ${this.getKuruKuruKeyframeText(dispTime, transTime, gapTime, i, svgList.length, kuruTop, kuruBottom)}
                }
            `;
            
            let elem = svgList[i].cloneNode(true);
            //elem.setAttribute("id", `kuru${i}`);
            elem.classList.add(`animation${this.num}`);
            kuruGroup.appendChild(elem);

            this.num += 1;
        }
        let styleDom = document.createElement("style");
        styleDom.innerHTML = styleText;
        kuruGroup.appendChild(styleDom);
        return kuruGroup;
    }
    getKuruKuruKeyframeText(dispTime, transTime, gapTime, textInd, textNum, kuruTop, kuruBottom){
        let periodTime = (dispTime + transTime + gapTime) * textNum;
        let keyframesText = "0%, ";
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        for(let i = 0; i < textNum; i++){
            let now = i * (dispTime + transTime + gapTime);
            if(i === inInd){
                //フェードイン開始
                now += dispTime + gapTime;
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                    transform-origin: 0px ${kuruTop}px;
                    transform: scaleY(0);
                }\n`;
                //フェードイン終了
                now += transTime;
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                    transform-origin: 0px ${kuruTop}px;
                    transform: scaleY(1);
                }\n`;;
            }
            else if(i === outInd){
                //フェードアウト開始
                now += dispTime;
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                    transform-origin: 0px ${kuruBottom}px;
                    transform: scaleY(1);
                }\n`;
                //フェードアウト終了
                now += transTime;
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                    transform-origin: 0px ${kuruBottom}px;
                    transform: scaleY(0);
                }\n`;
            }
        }
        if(0 < textInd){ keyframesText += 
            `100% {
                opacity: 0;
                transform-origin: 0px ${kuruBottom}px;
                transform: scaleY(0);
            }\n`;
        } //最後の要素は1で終わる
        return keyframesText;
    }

    createFadeSVG(){

    }
}
