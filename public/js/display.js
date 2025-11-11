let displaySVG;
let settings;
let mapSVG;
let lcdController;

let width, height

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
    //〇描画対象のsvg要素を取得
    displaySVG = document.getElementById("display");
    //〇localStrogeからsettings読み込み
    settings = JSON.parse(localStorage.getItem('lcdStrage'));
    //〇フォーマットSVGの読み込み
    mapSVG = await getSVGElementFromUrl(`/displaySvg/tokyu/header-body.svg`);
    //〇ナンバリング記号フォーマットSVGの読み込み
    const _numIconKeyList = new Set();
    settings.stationList.forEach(station => {
        _numIconKeyList.add(station.numIconPresetKey);
    });
    const numIconKeyList = [..._numIconKeyList];
    const numIconPresets = {};
    // すべてのキーを処理し終えるまで待ちたい
    await Promise.all(
        numIconKeyList.map(async (key) => {
            try {
                const svgElement = await getSVGElementFromUrl(`/presetNumIcons/${key}.svg`);
                numIconPresets[key] = svgElement;
            } catch(err){
                return;
            }
        })
    );
    console.log(numIconPresets);

    //LCDControllerを召喚
    lcdController = new LCDController(settings, mapSVG, numIconPresets, displaySVG);

    //ユーザ操作を受け付けるイベントリスナーを設定
    window.addEventListener("keydown", (e) => keyDown(e, lcdController)); //キーダウン（PC）
    window.addEventListener("touchstart", (e) => windowTouched(e, lcdController)); //タッチスタート（スマホ）
    //ウィンドウサイズが変わると、サイズを合わせる関数を設定
    window.addEventListener("resize", () => resizeCanvas(displaySVG, width, height));

    //displaySVGにviewBoxを設定
    let viewBox = mapSVG.getAttribute("viewBox");
    if(viewBox){
        let viewBoxValues = viewBox.split(" ");
        width = parseFloat(viewBoxValues[2]);
        height = parseFloat(viewBoxValues[3]);
        displaySVG.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    //描画対象のサイズを初期ウィンドウサイズに合わせる
    resizeCanvas(displaySVG, width, height);
}

