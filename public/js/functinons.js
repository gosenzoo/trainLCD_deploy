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
        console.log(stations[0].isPass)
        if(stations[0].isPass){
            result[result.length - 1] = true
        }
    }
    
    return result;
}