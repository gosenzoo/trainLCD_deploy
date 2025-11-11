//URLからSVGをelementとして取得する関数
async function getSVGElementFromUrl(url) {
    const response = await fetch(url)
    if(!response.ok){
        throw new Error(`HTTP error: ${response.status}`);;
    };
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    return svgDoc.documentElement;
}

//描画対象のサイズをウィンドウサイズに合わせる
function resizeCanvas(dom, width, height) {
    let originalWidth, originalHeight;
    if (window.innerWidth < width / height * window.innerHeight){
        originalWidth = Math.floor(window.innerWidth);
        originalHeight = Math.floor(window.innerWidth * height / width);
    }   
    else{
        originalWidth = Math.floor(window.innerHeight * width / height);
        originalHeight = Math.floor(window.innerHeight);
    }
    dom.style.width = originalWidth;
    dom.style.height = originalHeight;
}

function getCircularItem(arr, index) {
    // 配列の長さで割った剰余を計算することでインデックスを配列の範囲内に収める
    const circularIndex = ((index % arr.length) + arr.length) % arr.length;
    return arr[circularIndex];
}

function moveSvgElementByBasePoint(svgElement, targetX, targetY) { //指定したsvg要素に、data-basePointを基準としてtransformを付与する
    const basePointStr = svgElement.getAttribute("data-basePoint");
    if (!basePointStr) {
        console.error("data-basePoint属性が存在しません");
        return svgElement;
    }

    const [baseX, baseY] = basePointStr.split(',').map(Number);
    if (isNaN(baseX) || isNaN(baseY)) {
        console.error("data-basePointの値が不正です:", basePointStr);
        return svgElement;
    }

    const dx = targetX - baseX;
    const dy = targetY - baseY;

    // 既存のtransformを考慮して追記
    const currentTransform = svgElement.getAttribute("transform") || "";
    const newTransform = `${currentTransform} translate(${dx}, ${dy})`.trim();
    svgElement.setAttribute("transform", newTransform);

    return svgElement;
}

function movePolygonTo(polygonElem, targetX, targetY) { //polygon要素を指定の位置に移動
    const pointsStr = polygonElem.getAttribute("points").trim();
    const points = pointsStr.split(/\s+/).map(pair => {
        const [x, y] = pair.split(',').map(Number);
        return { x, y };
    });

    if (points.length === 0) return null;

    const [baseX, baseY] = polygonElem.getAttribute("data-basePoint").split(',').map(Number);
    const dx = targetX - baseX;
    const dy = targetY - baseY;

    const newPointsStr = points
        .map(p => `${p.x + dx},${p.y + dy}`)
        .join(' ');

    // 新しい polygon 要素を作成
    const newPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    newPolygon.setAttribute("points", newPointsStr);

    // 必要なら元の属性をコピー
    for (let i = 0; i < polygonElem.attributes.length; i++) {
        const attr = polygonElem.attributes[i];
        if (attr.name !== "points") {
            newPolygon.setAttribute(attr.name, attr.value);
        }
    }

    return newPolygon;
}

function getCanvasTextSize(textContent, fontSize, fontFamily) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = fontSize + ' ' + fontFamily;

    var width = context.measureText(textContent).width;
    return { width: width, height: parseInt(fontSize) };
}

function getStopStation(allStations, isLoop){
    //次駅との間に通過駅が存在するかの配列
    let existsPassStation = hasPassStationBetweenStops(allStations, isLoop); 
    
    //停車駅リスト
    let stopStationList = allStations.filter((station, index) => {
        if (station.isPass) { return false; } // 除外するためにfalseを返す
        
        return true;  // 残すためにtrueを返す
    });

    return { stopStationList: stopStationList, existsPassStation: existsPassStation}
}

// 停車駅から次の停車駅までに通過駅があるかを判定する関数
function hasPassStationBetweenStops(stations, isLoop) {
    const result = [];
    
    for (let i = 0; i < stations.length; i++) {
      if (!stations[i].isPass) {
        // 停車駅を見つけた場合のみ、次の停車駅までの区間を調べる
        let existsPassStation = false;
        for (let j = i + 1; j < stations.length; j++) {
          if (stations[j].isPass) {
            existsPassStation = true;
          }
          if (!stations[j].isPass) {
            // 次の停車駅に到達したらループを終了
            break;
          }
        }
        result.push(existsPassStation);
      }
    }

    //環状運転時、リスト左端の通過駅も最後の駅の次の通過駅と設定
    if(isLoop){
        //console.log(stations[0].isPass)
        if(stations[0].isPass){
            result[result.length - 1] = true
        }
    }
    
    return result;
}


// 現在地の監視
function monitorLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(success, error);
    } else {
        console.log("Geolocation APIはサポートされていません");
    }
}
// 現在地が取得できた場合の処理
function success(position) {
    //端末の座標を取得
    const currentLat = position.coords.latitude;
    const currentLng = position.coords.longitude;

    console.log(position.coords.latitude, position.coords.longitude)
    
    //端末の座標から、付近に駅があるか探索
    let nearList = []
    let nearDistances = []
    for(let i = 0; i < stationList.length; i++){
        if(!stationList[i].coordinate[0] || !stationList[i].coordinate[1]){ continue }
        let distance = calculateDistance(currentLat, currentLng, stationList[i].coordinate[0], stationList[i].coordinate[1])
        console.log(distance)

        if (distance <= 500) {
            nearList.push(i)
            nearDistances.push(distance)
        }
    }

    console.log(nearList)
    console.log(nearDistances)
    console.log([...nearDistances])
    console.log(nearList[nearDistances.indexOf(Math.min(...nearDistances))] - 1)
    //駅付近でない場合
    if(nearList.length <= 0){ 
        //直前の座標取得が駅付近であれば、駅を出発したとみなす
        if(isNearStation){
            console.log("駅から離れました")

            isNearStation = false;
            //直前の駅が終点駅でなければ
            if(index.nowStationId < stationList.length - 1){ 
                runState = 1;
                index.nowStationId += 1;

                langTimerController(); //言語切り替えタイマーリセット
                pageTimerController(); //ページ切り替えタイマーリセット
             };
        }
    } 
    else{ //駅付近であれば、nowStationIndexを移動
        console.log("駅付近にいます")

        let beforeStaId = nearList[nearDistances.indexOf(Math.min(...nearDistances))] - 1;
        let _nowStationId = beforeStaId < 0 ? 0 : beforeStaId;
        let _runState = beforeStaId < 0 && !isLoop ? 0 : 2;

        if(!(index.nowStationId === _nowStationId && runState === _runState)){
            index.nowStationId = _nowStationId;
            runState = _runState;

            langTimerController(); //言語切り替えタイマーリセット
            pageTimerController(); //ページ切り替えタイマーリセット
        }

        isNearStation = true;
    }

    draw();
}
// 現在地が取得できなかった場合のエラーハンドリング
function error() {
    console.log('現在地が取得できませんでした');
}

// ハバーシンの公式で距離を計算する関数
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // 地球の半径（メートル）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 距離（メートル）
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