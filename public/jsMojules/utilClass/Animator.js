class Animator{
    constructor(){
        this.num = 0;

        console.log("Animator初期化完了");
    }

    resetNum(){
        this.num = 0;
    }

    createKurukuruSVG(svgList, kuruTop, kuruBottom, _times){
        let times = [];
        for(let i = 0; i < svgList.length; i++){
            times.push(_times[i % _times.length]);
        }
        
        const kuruGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

        //1周期の時間[s]
        let periodTime = times.flat().reduce((acc, val) => acc + val, 0);
        let periodTimeS = periodTime / 1000;

        let styleText = "";
        for(let i = 0; i < svgList.length; i++){
            styleText +=  `
                .animation${this.num} { 
                    animation-name: animation${this.num};
                    animation-duration:${periodTimeS}s;
                    animation-iteration-count: infinite;
                    animation-timing-function: linear;
                }
                @keyframes animation${this.num} {
                    ${this.getKuruKuruKeyframeText(times, periodTime, i, svgList.length, kuruTop, kuruBottom)}
                }
            `;
            
            let elem = svgList[i].cloneNode(true);
            elem.classList.add(`animation${this.num}`);
            kuruGroup.appendChild(elem);

            this.num += 1;
        }
        let styleDom = document.createElement("style");
        styleDom.innerHTML = styleText;
        kuruGroup.appendChild(styleDom);
        return kuruGroup;
    }
    //dispTime, transTime, gapTime
    getKuruKuruKeyframeText(times, periodTime, textInd, textNum, kuruTop, kuruBottom){
        let keyframesText = "0%, ";
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        let now = 0;
        for(let i = 0; i < textNum; i++){
            //let now = i * (dispTime + transTime + gapTime);
            if(i === inInd){
                //フェードイン開始
                now += times[i][0] + times[i][2];
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                    transform-origin: 0px ${kuruTop}px;
                    transform: scaleY(0);
                }\n`;
                //フェードイン終了
                now += times[i][1];
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                    transform-origin: 0px ${kuruTop}px;
                    transform: scaleY(1);
                }\n`;
            }
            else if(i === outInd){
                //フェードアウト開始
                now += times[i][0];
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                    transform-origin: 0px ${kuruBottom}px;
                    transform: scaleY(1);
                }\n`;
                //フェードアウト終了
                now += times[i][1];
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                    transform-origin: 0px ${kuruBottom}px;
                    transform: scaleY(0);
                }\n`;
                now += times[i][2];
            }
            else{
                now += times[i][0] + times[i][1] + times[i][2];
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

    createFadeSVG(svgList, _times){
        let times = [];
        for(let i = 0; i < svgList.length; i++){
            times.push(_times[i % _times.length]);
        }
        
        const fadeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

        //1周期の時間[s]
        let periodTime = times.flat().reduce((acc, val) => acc + val, 0);
        let periodTimeS = periodTime / 1000;

        let styleText = "";
        for(let i = 0; i < svgList.length; i++){
            styleText +=  `
                .animation${this.num} { 
                    animation-name: animation${this.num};
                    animation-duration:${periodTimeS}s;
                    animation-iteration-count: infinite;
                    animation-timing-function: linear;
                }
                @keyframes animation${this.num} {
                    ${this.getFadeKeyframeText(times, periodTime, i, svgList.length)}
                }
            `;
            
            let elem = svgList[i].cloneNode(true);
            elem.classList.add(`animation${this.num}`);
            fadeGroup.appendChild(elem);

            this.num += 1;
        }
        let styleDom = document.createElement("style");
        styleDom.innerHTML = styleText;
        fadeGroup.appendChild(styleDom);
        return fadeGroup;
    }
    getFadeKeyframeText(times, periodTime, textInd, textNum){
        let keyframesText = "0%, ";
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        let now = 0;
        for(let i = 0; i < textNum; i++){
            if(i === inInd){
                //フェードイン開始
                now += times[i][0] + times[i][2];
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                }\n`;
                //フェードイン終了
                now += times[i][1];
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                }\n`;
            }
            else if(i === outInd){
                //フェードアウト開始
                now += times[i][0];
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                }\n`;
                //フェードアウト終了
                now += times[i][1];
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                }\n`;
                now += times[i][2];
            }
            else{
                now += times[i][0] + times[i][1] + times[i][2];
            }
        }
        if(0 < textInd){ keyframesText += 
            `100% {
                opacity: 0;
            }\n`;
        } //最後の要素は1で終わる
        return keyframesText;
    }

    createStepSVG(svgList, _times){
        let times = [];
        for(let i = 0; i < svgList.length; i++){
            times.push(_times[i % _times.length]);
        }
        
        const stepGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

        //1周期の時間[s]
        let periodTime = times.reduce((acc, val) => acc + val, 0);
        let periodTimeS = periodTime / 1000;

        let styleText = "";
        for(let i = 0; i < svgList.length; i++){
            styleText +=  `
                .animation${this.num} { 
                    animation-name: animation${this.num};
                    animation-duration:${periodTimeS}s;
                    animation-iteration-count: infinite;
                    animation-timing-function: steps(1);
                }
                @keyframes animation${this.num} {
                    ${this.getStepKeyframeText(times, periodTime, i, svgList.length)}
                }
            `;
            
            let elem = svgList[i].cloneNode(true);
            elem.classList.add(`animation${this.num}`);
            stepGroup.appendChild(elem);

            this.num += 1;
        }
        let styleDom = document.createElement("style");
        styleDom.innerHTML = styleText;
        stepGroup.appendChild(styleDom);
        return stepGroup;
    }
    getStepKeyframeText(times, periodTime, textInd, textNum){
        let inInd = textInd - 1;
        if(inInd < 0){ inInd = textNum - 1; }
        let outInd = textInd;

        let keyframesText = `0% {
            opacity: ${(outInd === 0) ? 1 : 0};
        }\n`;

        let now = 0;
        for(let i = 0; i < textNum; i++){
            now += times[i];
            if(i === inInd){
                //出現
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 1;
                }\n`;
            }
            else if(i === outInd){
                //消失
                keyframesText += `${(now / periodTime) * 100}% {
                    opacity: 0;
                }\n`;
            }
        }

        return keyframesText;
    }
}
