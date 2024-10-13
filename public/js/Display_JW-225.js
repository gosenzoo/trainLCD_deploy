var displayDom, ctx;
var display;
var pixelRatio;
var settings;
var stationList;

var originalWidth, originalHeight;

var mPlus1 = "M PLUS 1, sans-serif";
var mPlus1_SemiBold = 'mPlus1-SemiBold, sans-serif';
var sansSerif = 'sans-serif';
var bizUDRegular = 'BIZUD-Gothic-Regular';
var bizUDBold = 'BIZUD-Gothic-Bold';

var index;
var isLoop;
var langState; //０：漢字、１：かな、２：英語
var runState; //０：停車中、１：走行中、２：到着前
var page; //０：路線描画、１：乗換案内

var langTimer, pageTimer;

function resizeCanvas(){
    if (window.innerWidth < 1333 / 1000 * window.innerHeight){
        originalWidth = Math.floor(window.innerWidth);
        originalHeight = Math.floor(window.innerWidth * 1000 / 1333);
    }   
    else{
        originalWidth = Math.floor(window.innerHeight * 1333 / 1000);
        originalHeight = Math.floor(window.innerHeight);
    }
    displayDom.style.width = originalWidth;
    displayDom.style.height = originalHeight;

    draw();
}

function scalerX(num){
    return num / 1333 * originalWidth;
}
function scalerY(num){
    return num / 1000 * originalHeight;
}

function draw(){
    let nowStation;
    if(runState == 0){ nowStation = stationList[index.nowStationId]; }
    else{ nowStation = stationList[(index.nowStationId + 1) % stationList.length]; }

    let innerSVG = new InnerSVG();

    //背景画像
    if(page == 0){ innerSVG.setImage(backImage0, -1, -1, 1334, 1001); }
    else if(page == 1){
        innerSVG.setImage(backImage1, -1, -1, 1334, 1001);
        innerSVG.setImage(transferTextJEImage, -1, -1, 1334, 1001);
    }

    if(page == 0){ //路線表示
        //駅ユニット
        if(settings.stationList.length >= 8){ //8駅以上の場合
            for (let i = 0; i < 8; i++) { 
                let isPassed = (runState == 0 && i < index.drawPos || runState != 0 && i < index.drawPos + 1)
                //乗り換え案内
                if (index.dispStationList[i].transfers.length != 0 && !isPassed) {
                    //背景
                    innerSVG.setRect(135.84 + 151.62 * i - 11.39/2, 634.86 - 1, 11.39, 155.42 + 1, {
                        fill: "black"
                    });

                    let transfersId = index.dispStationList[i].transfers.split(' ');
                    let mag = 1;
                    if(transfersId.length > 7) { mag = 188 / (27 * transfersId.length);}
                    for(let j = 0; j < transfersId.length; j++) {
                        innerSVG.setImage(settings.iconDict[settings.lineDict[transfersId[j]].lineIconKey],
                            135.84 + 151.62 * i - 70, 792 + 27 * mag * j + 2.5, 24 * mag, 24 * mag);

                        if(langState == 0 || langState == 1){
                            let textWidth = (23 * mag * settings.lineDict[transfersId[j]].name.length);
                            let m = textWidth > 140 - 23 * mag ? Snap.matrix().scale((140 - 23 * mag) / textWidth, 1, 135.84 + 151.62 * i - 70 + (24 + 2) * mag, 0) : null;
                            innerSVG.setText(135.84 + 151.62 * i - 70 + (24 + 2) * mag, 792 + 3 + 13 * mag + 27 * mag * j, settings.lineDict[transfersId[j]].name, {
                                fill: "black",
                                textAnchor: "start",
                                dominantBaseline: "middle",
                                fontSize: `${23 * mag}px`,
                                fontWeight: "Bold",
                                fontFamily: "BIZ UDGothic",
                                transform: m
                            });
                        }
                        else{
                            let textWidth = (12.5 * mag * settings.lineDict[transfersId[j]].eng.length);
                            let m = textWidth > 140 - 12.5 * mag ? Snap.matrix().scale((140 - 12.5 * mag) / textWidth, 1, 135.84 + 151.62 * i - 70 + (24 + 2) * mag, 0) : null;
                            innerSVG.setText(135.84 + 151.62 * i - 70 + (24 + 2) * mag, 792 + 3 + 13 * mag + 27 * mag * j, settings.lineDict[transfersId[j]].eng, {
                                fill: "black",
                                textAnchor: "start",
                                dominantBaseline: "middle",
                                fontSize: `${23 * mag}px`,
                                fontWeight: "Bold",
                                fontFamily: "BIZ UDGothic",
                                transform: m
                            });
                        }
                    }
                }
                
                //路線記号
                if(index.dispStationList[i].number !== ""){
                    innerSVG.setRect(135.84 + 151.62 * i - 76.51/2, 604.68, 76.51, 30.18, {
                        fill: !isPassed ? index.dispStationList[i].lineColor : "gray"
                    });
                    innerSVG.setText(135.84 + 151.62 * i, 604.68+30.18/2+2, index.dispStationList[i].number.split(" ")[0] + index.dispStationList[i].number.split(" ")[1], {
                        fill: "white",
                        textAnchor: "middle",
                        dominantBaseline: "middle",
                        fontSize: "28px",
                        fontWeight: "Bold",
                        fontFamily: "sans-serif",
                        letterSpacing: "0px"
                    });
                }
                    
                //駅名列挙
                if(langState == 0 || langState == 1){
                    if (index.dispStationList[i].name.length < 5) {
                        let chars = ["", "", "", ""];
                        if (index.dispStationList[i].name.length == 1) {
                            chars[2] = index.dispStationList[i].name;
                        }
                        else if (index.dispStationList[i].name.length == 2) {
                            chars[1] = index.dispStationList[i].name[0];
                            chars[3] = index.dispStationList[i].name[1];
                        }
                        else if (index.dispStationList[i].name.length == 3) {
                            chars[1] = index.dispStationList[i].name[0];
                            chars[2] = index.dispStationList[i].name[1];
                            chars[3] = index.dispStationList[i].name[2];
                        }
                        else if (index.dispStationList[i].name.length == 4) {
                            chars[0] = index.dispStationList[i].name[0];
                            chars[1] = index.dispStationList[i].name[1];
                            chars[2] = index.dispStationList[i].name[2];
                            chars[3] = index.dispStationList[i].name[3];
                        }

                        for (let j = 0; j < 4; j++) {
                            innerSVG.setText(135.84 + 151.62 * i, 547+55.12/2 - 55.12 * j, chars[3 - j], {
                                fill: !isPassed ? "black" : "gray",
                                textAnchor: "middle",
                                dominantBaseline: "middle",
                                fontSize: "57px",
                                fontWeight: "Bold",
                                fontFamily: "BIZ UDGothic"
                            });
                        }
                    }
                    else{
                        let m = Snap.matrix().scale(1, 250 / (55.12 * index.dispStationList[i].name.length), 135.84, 547+55.12-5);
                        for (let j = 0; j < index.dispStationList[i].name.length; j++) {
                            innerSVG.setText(135.84 + 151.62 * i, 547+55.12/2 - 55.12 * j, index.dispStationList[i].name[index.dispStationList[i].name.length - 1 - j], {
                                fill: !isPassed ? "black" : "gray",
                                textAnchor: "middle",
                                dominantBaseline: "middle",
                                fontSize: "57px",
                                fontWeight: "Bold",
                                fontFamily: "BIZ UDGothic",
                                transform: m
                            });
                        }
                    }
                }
                else{
                    let textWidth = getCanvasTextSize(index.dispStationList[i].eng, "57px", "sans-serif").width
                    let m = Snap.matrix().rotate(-60, 130 + 151.62 * i, 547+55.12+2)
                    m = textWidth > 250 ? m.scale(250 / textWidth ,1 , 130 + 151.62 * i, 0) : m
                    innerSVG.setText(130 + 151.62 * i, 547+55.12+2, index.dispStationList[i].eng, {
                        fill: !isPassed ? "black" : "gray",
                        textAnchor: "start",
                        dominantBaseline: "auto",
                        fontSize: "57px",
                        fontWeight: "bold",
                        fontFamily: "sans-serif",
                        transform: m
                    });
                }
            }
        }
        else{ //8駅未満の場合

        }

        //線
        innerSVG.setPolygon([0, 698.72, 1197.16+123.56, 698.72, 1197.16+123.56, 698.72+17.94, 1197.16+51.07, 744.55+17.94, 0, 744.55+17.94], {
            fill: "rgb(31, 31, 31)"
        });
        let color;
        if(settings.info.isLoop){ color = index.nowStationId == 0 ? stationList[stationList.length-1].lineColor : stationList[index.nowStationId-1].lineColor }
        else { color = index.nowStationId == 0 ? 
            index.dispStationList[0].lineColor : stationList[index.nowStationId < stationList.length - 7 ? index.nowStationId-1 : stationList.length - 7].lineColor }
        innerSVG.setRect(0, 652.89, 135.84, 91.66, {
            fill: color
        });
        for(let i = 0; i < 7; i++){
            innerSVG.setRect(135.84 + 151.62 * i - 1, 652.89, 151.62 + 1, 91.66, {
                fill: index.dispStationList[i].lineColor
            });
        }
        innerSVG.setPolygon([1197.16 - 1, 652.89, 1197.16+51.07, 652.89, 1197.16+123.56, 698.72, 1197.16+51.07, 744.55, 1197.16 - 1, 744.55], {
            fill: index.dispStationList[7].lineColor
        });
        for (let i = 0; i < 8; i++) {
            innerSVG.setCircle(135.84 + 151.62 * i, 698.72, 38.9, {
                fill: "white"
            });
        }

        //駅
        if(index.drawPos < 0){ index.drawPos = 0; }
        if(runState == 0){
            innerSVG.setCircle(135.84 + 151.62 * index.drawPos, 698.72, 71.82/2, {
                fill: "red"
            });

            for(let i = 0; i < index.drawPos; i++){
                innerSVG.setCircle(135.84 + 151.62 * i, 698.72, 71.82/2, {
                    fill: "gray"
                });
            }
        }
        else {
            innerSVG.setPolygon([189.44 + 151.62 * index.drawPos, 700.32 + 27.87, 189.44 + 46.69 + 151.62 * index.drawPos, 700.32,
                189.44 + 151.62 * index.drawPos, 700.32 - 27.87], {
                fill: "red",
                stroke: "white",
                strokeWidth: "3"
            });

            for(let i = 0; i < index.drawPos + 1; i++){
                innerSVG.setCircle(135.84 + 151.62 * i, 698.72, 71.82/2, {
                    fill: "gray"
                })
            }
        }
    }
    else if(page == 1){ //乗換案内表示
        let transfersId = nowStation.transfers.split(' ');
        for (let i = 0; i < transfersId.length; i++){ //乗り換え表示
            let area = (911 - 450) / transfersId.length;

            let line = settings.lineDict[transfersId[i]]; //各路線取得
            console.log(settings);
            let iconSize = 65;
            if(area * 0.9 < iconSize){ iconSize = area * 0.9; }
            innerSVG.setImage(settings.iconDict[line.lineIconKey], 39, 450 + area * i + area / 2 - iconSize / 2, iconSize, iconSize);

            let textWidth = 62 * iconSize / 65 * line.name.length
            let m = textWidth > 500 ? Snap.matrix().scale(500 / textWidth, 1, 139, 0) : null
            innerSVG.setText(139, 451 + area * i + area / 2, line.name, {
                fill: "black",
                textAnchor: "start",
                dominantBaseline: "middle",
                fontSize: `${62 * iconSize / 65}px`,
                fontWeight: "Bold",
                fontFamily: "BIZ UDGothic",
                transform: m
            });
            textWidth = 30 * iconSize / 65 * line.eng.length
            m = textWidth > 500 ? Snap.matrix().scale(500 / textWidth, 1, 675, 0) : null
            innerSVG.setText(675, 451 + area * i + area / 2, line.eng, {
                fill: "black",
                textAnchor: "start",
                dominantBaseline: "middle",
                fontSize: `${62 * iconSize / 65}px`,
                fontWeight: "Bold",
                fontFamily: "sans-serif",
                transform: m
            });
        }
    }



    //現在駅路線記号
    if(nowStation.number !== ""){
        innerSVG.setRect(378.04, 164.01, 125.87, 125.87, {
            fill: nowStation.lineColor
        });
        innerSVG.setText(378.04+125.87/2, 164.01+35, nowStation.number.split(" ")[0], {
            fill: "white",
            textAnchor: "middle",
            dominantBaseline: "middle",
            fontSize: "50px",
            fontWeight: "bold",
            fontFamily: "sans-serif",
        });
        innerSVG.setText(378.04+125.87/2, 164.01+93, nowStation.number.split(" ")[1], {
            fill: "white",
            textAnchor: "middle",
            dominantBaseline: "middle",
            fontSize: "60px",
            fontWeight: "bold",
            fontFamily: "sans-serif",
        });
    }

    //現在駅名
    let m = Snap.matrix();

    let style = {
        fill: "white",
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: "130px",
        fontWeight: "bold",
        transform: m
    };

    let stname;
    if(langState == 0){ stname = nowStation.name; style.fontFamily = "BIZ UDGothic"; }
    else if(langState == 1){ stname = nowStation.kana; style.fontFamily = "BIZ UDGothic"; }
    else if(langState == 2){ stname = nowStation.eng; style.fontFamily = "sans-serif"; }

    if (langState in [0, 1]) {
        if (stname.length < 3) {
            style.letterSpacing = "45px";
        }
        else if (stname.length * 130 > 678) {
            m.scale(678 / (stname.length * 130), 1, 834.03+25, 227.61+10);
        }
    }
    else {
        let measure = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        measure.innerHTML = `<text id="measure-text" x="0" y="0" fill="white" 
         style="text-anchor:middle;dominant-baseline:middle;font-size:130px;font-weight:bold;font-family:sans-serif;">${stname}</text>`;
        
        document.body.appendChild(measure)
        let bbox = measure.children[0].getBBox();
        measure.remove()
        if (bbox.width > 678) {
            m.scale(678 / bbox.width, 1, 834.03+25, 227.61+10);
        }
    }
    innerSVG.setText(834.03+25, 227.61+10, stname, style);

    //つぎは・まもなく・ただいま
    let nextText, font;
    if(langState == 0 || langState == 1){
        if (runState == 0) { nextText = "ただいま"; }
        else if (runState == 1) { nextText = "つぎは"; }
        else if (runState == 2) { nextText = "まもなく"; }
        innerSVG.setText(329.81+5, 252.92+6, nextText, {
            fill: "white",
            textAnchor: "end",
            dominantBaseline: "hanging",
            fontSize: "57px",
            fontWeight: "bold",
            fontFamily: "BIZ UDGothic"
        });
    }
    else{
        if (runState == 0) { nextText = ""; }
        else if (runState == 1 || runState == 2) { nextText = "Next"; }
        innerSVG.setText(320, 252.92, nextText, {
            fill: "white",
            textAnchor: "end",
            dominantBaseline: "hanging",
            fontSize: "57px",
            fontWeight: "bold",
            fontFamily: "sans-serif"
        });
    }

    if(langState == 0 || langState == 1){
        //経由地
        innerSVG.setText(389, 65, settings.info.direction, {
            fill: "white",
            textAnchor: "start",
            dominantBaseline: "auto",
            fontSize: "40px",
            fontWeight: "bold",
            fontFamily: "BIZ UDGothic"
        });
        //行き先
        innerSVG.setText(settings.info.direction.length * 40 + 389 + (settings.info.direction.length ? 30 : 0), 65, settings.info.destination, {
            fill: "white",
            textAnchor: "start",
            dominantBaseline: "auto",
            fontSize: "57px",
            fontWeight: "bold",
            fontFamily: "BIZ UDGothic"
        });
        innerSVG.setText(settings.info.direction.length * 40 + 389 + (settings.info.direction.length ? 30 : 0) + settings.info.destination.length * 57 + 20, 65, "ゆき", {
            fill: "white",
            textAnchor: "start",
            dominantBaseline: "auto",
            fontSize: "57px",
            fontWeight: "bold",
            fontFamily: "BIZ UDGothic"
        });
    }
    else{ //経由地・行き先（英語）
        innerSVG.setText(389, 65, settings.info.directionEng, {
            fill: "white",
            textAnchor: "start",
            dominantBaseline: "auto",
            fontSize: "57px",
            fontWeight: "bold",
            fontFamily: "sans-serif"
        });
    }

    //列車路線記号
    innerSVG.setRect(21, 29, 68.5, 68.5, {
        fill: settings.info.lineColor
    });
    innerSVG.setText(21+68.5/2, 29+68.5/2+6, settings.info.lineLogo, {
        fill: "white",
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: "66px",
        fontFamily: "sans-serif"
    });

    //種別
    if(langState == 0 || langState == 1){
        let letterSpacing = settings.info.trainType.length < 3 ? "15" : "0"
        let textWidth = 110 * settings.info.trainType.length
        let m = textWidth > 250 ? Snap.matrix().scale(250 / textWidth, 1, 100, 80) : null
        innerSVG.setText(100, 80, settings.info.trainType, {
            fill: settings.info.trainTypeColor,
            textAnchor: "start",
            dominantBaseline: "middle",
            fontWeight: "bold",
            fontStyle: "italic",
            fontSize: "110px",
            fontFamily: "BIZ UDGothic",
            letterSpacing: letterSpacing,
            transform: m
        });
    }
    else{
        let textWidth = getCanvasTextSize(settings.info.trainTypeEng, "110px", "sans-serif").width
        let m = textWidth > 250 ? Snap.matrix().scale(250 / textWidth, 1, 100, 80) : null
        innerSVG.setText(100, 80, settings.info.trainTypeEng, {
            fill: settings.info.trainTypeColor,
            textAnchor: "start",
            dominantBaseline: "middle",
            fontWeight: "bold",
            fontStyle: "italic",
            fontSize: "110px",
            fontFamily: "sans-serif",
            letterSpacing: "-5",
            transform: m
        });
    }
    

    //号車
    innerSVG.setText(1280, 57, settings.info.carNumber, {
        fill: "white",
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontWeight: "bold",
        fontSize: "78px",
        fontFamily: "BIZ UDGothic"
    });
    if(langState == 0 || langState == 1){
        innerSVG.setText(1280, 112, "号車", {
            fill: "white",
            textAnchor: "middle",
            dominantBaseline: "middle",
            fontWeight: "bold",
            fontSize: "25px",
            fontFamily: "BIZ UDGothic",
            letterSpacing: "1"
        });
    }
    else{
        innerSVG.setText(1250, 28, "Car No.", {
            fill: "white",
            textAnchor: "end",
            dominantBaseline: "middle",
            fontWeight: "bold",
            fontSize: "30px",
            fontFamily: "sans-serif"
        });
    }


    innerSVG.displaySVG(displayDom);
}

function shiftLangState(){
    langState++;
    if(langState >= 3){ langState = 0; }
    draw();
}

function shiftPage(){
    page++;
    if(page > 1){ page = 0; }
    draw();
}

function moveState(beforeOrNext){
    if(beforeOrNext == 1){
        if(index.nowStationId >= stationList.length -1 && runState == 0 && !settings.info.isLoop){ return; }

        runState++;
        if(runState > 2){ 
            runState = 0;
            moveStation(1);
        }
    }
    else{
        if(index.nowStationId <= 0 && runState == 0 && !settings.info.isLoop){ return; }

        runState--;
        if(runState < 0){
            runState = 2;
            moveStation(-1);
        }
    }

    //ページ切り替えタイマー設定
    pageTimerController();
}

function moveStation(step){
    index.nowStationId += step;
    pageTimerController();
}

function pageTimerController(){
    page = 0;
    clearInterval(pageTimer);
    if(runState == 2 && stationList[(index.nowStationId + 1) % stationList.length]["transfers"].length != 0){
        pageTimer = setInterval(shiftPage, 8000);
    }
}

function keyDown(e){
    if(e.key == 'ArrowLeft'){ moveState(-1); }
    else if(e.key == 'ArrowRight'){ moveState(1); }

    else if(e.key == 'a'){ moveStation(-1); }
    else if(e.key == 'd'){ moveStation(1); }

    draw();
}

function windowTouched(e){
    let touches = e.changedTouches[0];

    if(touches.pageX < window.innerWidth / 4){ //左をタッチ
        if(touches.pageY > window.innerHeight / 2){ moveState(-1); }
        else{ moveStation(-1); }
    }
    else if(touches.pageX > window.innerWidth * 3 / 4){ //右をタッチ
        if(touches.pageY > window.innerHeight / 2){ moveState(1); }
        else{ moveStation(1); }
    }

    draw();
}

function toBase64Url(url, callback){
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      var reader = new FileReader();
      reader.onloadend = function() {
        callback(reader.result);
      }
      reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
}

window.onload = async function(){
    displayDom = document.getElementById("display");
    display = Snap('#display');
    //console.log(display);

    //JSON読み込み
    //console.log("ローカルストレージ：");
    //console.log(JSON.parse(localStorage.getItem('lcdStrage')));
    settings = JSON.parse(localStorage.getItem('lcdStrage'));
    stationList = settings.stationList;
    /*
    let responce = await fetch("http://192.168.3.13:5500/json/JR神戸線.json");
    settings = await responce.json();
    console.log("デフォルト設定");
    console.log(settings);
    */

    //背景画像読み込み
    //toBase64Url("img/225back-1.jpg", (base64Url) => {backImage0 = base64Url});

    //console.log(backImage0);
    //backImage1 = await new Image();
    //backImage1.src = await "img/225back-2.jpg";
    //transferTextJEImage = await new Image();
    //transferTextJEImage.src = await "img/transferTxt_jp-eng.png";

    console.log("ロード処理完了");

    //変数初期化
    pixelRatio = 1;
    dispStationsId = 0;
    index = await new IndexClass(stationList, settings.info.isLoop)
    console.log(index.dispStationList)
    runState = 0;
    langState = 0;
    page = 0;

    console.log("変数初期化完了");

    langTimer = setInterval(shiftLangState, 4000);

    //初期化の最後に実行
    await window.addEventListener("resize", resizeCanvas);
    await window.addEventListener("keydown", keyDown);
    await window.addEventListener("touchstart", windowTouched);

    await resizeCanvas();
}

class IndexClass {
    constructor(stationList, isLoop) {
        this._nowStationId = 0;  // 私的な変数（外部から直接アクセスしない）
        this.dispStationList = [];  // 監視されない普通のプロパティ
        this.drawPos = 0;
        this.isLoop= isLoop;
        this.dispNumber = stationList.length > 7 ? 8 : stationList.length
        for(let i = 0; i < 8; i++){
            this.dispStationList.push(stationList[i])
        }
        this.stationList = stationList;
    }

    get nowStationId() {
        return this._nowStationId;
    }

    set nowStationId(value) {
        this._nowStationId = value;
        this.dispStationList = [];
        this.drawPos = 0;
        // nowStationIdの値が変更されたときに、yの値も条件に応じて変更する
        if (!this.isLoop) { //非環状運転時
            if(value < 0){ this._nowStationId = 0; }
            if(value >= stationList.length){ this._nowStationId = stationList.length - 1; }
            if(value >= stationList.length - 1 && runState != 0){ this._nowStationId = stationList.length - 2; }
            if(value < stationList.length - 7){
                for(let i = 0; i < 8; i++){
                    this.dispStationList.push(stationList[this._nowStationId + i])
                }
            }
            else{
                for(let i = 0; i < 8; i++){
                    this.dispStationList.push(stationList[stationList.length - 8 + i])
                }
                this.drawPos = this._nowStationId - (stationList.length - 8);
            }
        } else { //環状運転時
            if(value < 0){ this._nowStationId = stationList.length - 1; }
            if(value >= stationList.length){ this._nowStationId = 0; }
            for(let i = 0; i < 8; i++){
                this.dispStationList.push(this.getCircularItem(stationList, this._nowStationId + i))
            }
        }

        console.log(this._nowStationId)
        console.log(this.dispStationList)
    }

    getCircularItem(arr, index) {
        // 配列の長さで割った剰余を計算することでインデックスを配列の範囲内に収める
        const circularIndex = ((index % arr.length) + arr.length) % arr.length;
        return arr[circularIndex];
      }
}