type settingType = {
    info: infoType,
    stationList: stationType[],
    lineDict: {[id: string]: lineType},
    iconDict: {[id: string]: string}
}

type infoType = {
    settingName: string,
    destination: string,
    direction: string,
    directionEng: string,
    trainType: string,
    trainTypeEng: string,
    trainTypeColor: string,
    lineLogo: string,
    lineColor: string,
    carNumber: string,
    leftOrRight: 'left' | 'right',
    isLoop: boolean,
    isMoveByCoord: boolean
}

type stationType = {
    name: string,
    kana: string,
    eng: string,
    number: string,
    lineColor: string,
    transfers: string,
    isPass: boolean,
    coordinate: [number | null, number | null]
}

type lineType = {
    lineIconKey: string,
    name: string,
    kana: string,
    eng: string
}

type stationMembers = 'name' | 'kana' | 'eng' | 'number' | 'lineColor' | 'transfers'

type lineMembers = 'lineIconKey' | 'name' | 'kana' | 'eng'

type infoMembers = 'settingName' | 'destination' | 'direction' | 'directionEng' | 'trainType' | 'trainTypeEng' | 'trainTypeColor' | 'lineLogo' | 'lineColor' | 'carNumber' | 'leftOrRight' | 'isLoop' | 'isMoveByCoord'