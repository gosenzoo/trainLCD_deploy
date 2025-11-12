type settingType = {
    info: infoType,
    stationList: stationType[],
    lineDict: {[id: string]: lineType},
    iconDict: {[id: string]: string}
}

type infoType = {
    settingName: string,
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
    isLoop: boolean,
    isMoveByCoord: boolean,
    isDispTime: boolean,
    isDispLineName: boolean,
    carNumberList: string,
    headOffset: string,
    backOffset: string
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
    doorSide: 'left' | 'right' 
}

type lineType = {
    lineIconKey: string,
    name: string,
    kana: string,
    eng: string,
    color: string,
}

type stationMembers = 'name' | 'kana' | 'eng' | 'number' | 'lineColor' | 'transfers' | 'sectionTime' | 'lineId' | 'transferText' | 'transferTextEng' | 'doorSide' | 'numIconPresetKey' | 'lineNumberType'

type lineMembers = 'lineIconKey' | 'name' | 'kana' | 'eng' | 'color'

type infoMembers = 'settingName' | 'destination' | 'destinationKana' | 'destinationEng' | 'destinationNum' | 'destinationColor' | 'destinationNumIconKey' | 'direction' | 'trainType' | 'trainTypeEng'| 'trainTypeSub' | 'trainTypeSubEng' | 'trainTypeColor' | 'lineLogo' | 'lineColor' | 
    'carNumber' | 'leftOrRight' | 'isLoop' | 'isMoveByCoord' | 'isDispTime' | 'isDispLineName' | 'carNumberList' | 'headOffset' | 'backOffset'