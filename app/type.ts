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
    trainType: string,
    lineLogo: string,
    lineColor: string,
    carNumber: string,
    place: 'left' | 'right'
}

type stationType = {
    name: string,
    kana: string,
    eng: string,
    number: string,
    lineColor: string,
    transfers: string
}

type lineType = {
    lineIconKey: string,
    name: string,
    kana: string,
    eng: string
}

type stationMembers = 'name' | 'kana' | 'eng' | 'number' | 'lineColor' | 'transfers'

type lineMembers = 'lineIconKey' | 'name' | 'kana' | 'eng'

type infoMembers = 'settingName' | 'destination' | 'direction' | 'trainType' | 'lineLogo' | 'lineColor' | 'carNumber' | 'place'