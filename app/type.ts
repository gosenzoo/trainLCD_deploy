type settingType = {
    info: infoType,
    operationList: operationType[],
    stationList: stationType[],
    lineDict: {[id: string]: lineType},
    iconDict: {[id: string]: string}
}

type infoType = {
    settingName: string,///////////////////////////
    isLoop: boolean,///////////////////////////
    isMoveByCoord: boolean,//////////////////////////
}

type operationType = {
    destination: string,
    destinationKana: string,
    destinationEng: string,
    destinationNum: string,
    destinationColor: string,
    destinationNumIconKey: string,
    direction: string,
    trainType: string,
    trainTypeEng: string,
    trainTypeSub: string,
    trainTypeSubEng: string,
    trainTypeColor: string,
    lineLogo: string,
    lineColor: string,
    carNumber: string,
    leftOrRight: 'left' | 'right',
    isDispTime: boolean,
    isDispLineName: boolean,
    carNumberList: string,
    headOffset: string,
    backOffset: string,
    isDrawStopText: boolean,
    isDrawLine: boolean,
    carLineColor: string,
    startStationInd: string
}

type stationType = {
    name: string,
    kana: string,
    eng: string,
    number: string,
    lineColor: string,
    numIconPresetKey:string,
    lineNumberType: string,
    transfers: string,
    isPass: boolean,
    sectionTime: string,
    lineId: string,
    coordinate: [number | null, number | null],
    transferText: string,
    transferTextEng: string,
    doorSide: 'left' | 'right',
    transferCountLineP: string,
    otherLineInd: string
}

type lineType = {
    lineIconKey: string,
    name: string,
    kana: string,
    eng: string,
    color: string,
}

type stationMembers = 'name' | 'kana' | 'eng' | 'number' | 'lineColor' | 'transfers' | 'sectionTime' | 'lineId' | 'transferText' | 'transferTextEng' | 'doorSide' | 'numIconPresetKey' | 'lineNumberType' | 'transferCountLineP' | 'otherLineInd'

type lineMembers = 'lineIconKey' | 'name' | 'kana' | 'eng' | 'color'

type infoMembers = 'settingName' | 'isLoop' | 'isMoveByCoord'

type operationMembers = 'destination' | 'destinationKana' | 'destinationEng' | 'destinationNum' | 'destinationColor' | 'destinationNumIconKey' | 'direction' | 'trainType' | 'trainTypeEng'| 'trainTypeSub' | 'trainTypeSubEng' | 'trainTypeColor' | 'lineLogo' | 'lineColor' | 
    'carNumber' | 'leftOrRight' | 'isDispTime' | 'isDispLineName' | 'carNumberList' | 'headOffset' | 'backOffset' | 'isDrawStopText' | 'isDrawLine' | 'carLineColor' | 'startStationInd'