let displayDom;
let drawTree;
let settings;
let mapSVG;
let width, height;
let lcdController;

let keyDown = (e, lcdController) => {
    if(e.key == 'ArrowLeft'){ lcdController.moveState(-1); }
    else if(e.key == 'ArrowRight'){ lcdController.moveState(1); }
    else if(e.key == 'a'){ lcdController.moveStation(-1); }
    else if(e.key == 'd'){ lcdController.moveStation(1); }
}
let windowTouched = (e, lcdController) => {
    let touches = e.changedTouches[0];

    if(touches.pageX < window.innerWidth / 4){ //左をタッチ
        if(touches.pageY > window.innerHeight / 2){ lcdController.moveState(-1); }
        else{ lcdController.moveStation(-1); }
    }
    else if(touches.pageX > window.innerWidth * 3 / 4){ //右をタッチ
        if(touches.pageY > window.innerHeight / 2){ lcdController.moveState(1); }
        else{ lcdController.moveStation(1); }
    }
}

window.onload = async function(){
    //描画対象のsvg要素を取得
    displayDom = document.getElementById("display");
    //描画対象をコピーし、描画ツリーを初期化
    drawTree = displayDom.cloneNode(true);

    //localStrogeからsettings読み込み
    settings = JSON.parse(localStorage.getItem('lcdStrage'));
    // ベースSVGの読み込み
    mapSVG = await getSVGElementFromUrl(`/displaySvg/tokyu/header-body.svg`)
    console.log("mapSVG", mapSVG);

    //displayDomにviewBoxを設定
    let viewBox = mapSVG.getAttribute("viewBox");
    if(viewBox){
        let viewBoxValues = viewBox.split(" ");
        width = parseFloat(viewBoxValues[2]);
        height = parseFloat(viewBoxValues[3]);
        displayDom.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    //drawTreeにフィルタと背景を追加
    drawTree.appendChild(mapSVG.getElementById("defs"))
    drawTree.appendChild(mapSVG.getElementById("background"));

    //LCDControllerを初期化
    lcdController = new LCDController(settings, mapSVG);
    //ユーザ操作を受け付けるイベントリスナーを設定
    window.addEventListener("keydown", (e) => keyDown(e, lcdController)); //キーダウン（PC）
    window.addEventListener("touchstart", (e) => windowTouched(e, lcdController)); //タッチスタート（スマホ）

    drawTree.appendChild(mapSVG.getElementById("header"));

    //displayDomに描画ツリーの内容を設定
    displayDom.innerHTML = ""; // 既存の内容をクリア
    displayDom.appendChild(drawTree);
    //描画対象のサイズをウィンドウサイズに合わせる
    resizeCanvas(displayDom, width, height);
}

