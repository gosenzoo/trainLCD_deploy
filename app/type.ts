// 乗換駅情報（乗換先のナンバリング記号・路線記号・路線カラー・ナンバリング・駅名・駅名英語・駅描画フラグ）
type transferStationType = {
    isDraw: boolean,
    type: string,
    symbol: string,
    color: string,
    number: string,
    name: string,
    eng: string
}

// 乗換路線情報（路線アイコン・名称を直接保持。lineDictへの参照ではなく値をそのまま保存する）
type transferLineType = {
    lineIconKey: string[],  // 複数アイコンキーの配列（Drawer側では各要素を :key: で囲んで結合して使用）
    name: string,
    kana: string,
    eng: string,
}

// 乗換路線エントリ（乗換路線情報と乗換駅情報の組）
type transferItemType = {
    line: transferLineType,
    station: transferStationType
}

// 言語ローテーション1エントリ
type langIdEntryType = {
    langId: number,
    displayTime: number,
    transTime: number,
    gapTime: number
}

// ページ表示エントリ（ページ名と表示時間の組）
type pageEntryType = {
    pageName: string,
    dispTime: number
}

// 表示設定（ページ一覧・言語ローテーション設定を保持）
type dispConfigType = {
    pageList: pageEntryType[],
    langIdList: langIdEntryType[]
}

type settingType = {
    info: infoType,
    operationList: operationType[],
    stationList: stationType[],
    lineDict: {[id: string]: lineType},
    iconDict: {[id: string]: string | iconParamsType},
    dispConfig: dispConfigType
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
    transfers: transferItemType[],
    isPass: boolean,
    sectionTime: string,
    lineId: string,
    coordinate: [number | null, number | null],
    transferText: string,
    transferTextEng: string,
    doorSide: 'left' | 'right',
    transferCountLineP: string,
    otherLineInd: string,
    slotNum: string,
    leftSlotInd: string,
    otherCarNum: string,
    otherLeftSlotInd: string,
    transfersListDisp: string
}

type lineType = {
    lineIconKey: string,
    name: string,
    kana: string,
    eng: string,
    color: string,
}


type iconParamsType = {
    presetType: string,
    color: string,
    symbol: string
}

type stationMembers = 'name' | 'kana' | 'eng' | 'number' | 'lineColor' | 'transfers' | 'sectionTime' | 'lineId' | 'transferText' | 'transferTextEng' | 'doorSide' | 'numIconPresetKey' | 'lineNumberType' | 'transferCountLineP' | 'otherLineInd' | 'slotNum' | 'leftSlotInd' |
    'otherCarNum' | 'otherLeftSlotInd' | 'transfersListDisp'

type lineMembers = 'lineIconKey' | 'name' | 'kana' | 'eng' | 'color'

type infoMembers = 'settingName' | 'isLoop' | 'isMoveByCoord'

type operationMembers = 'destination' | 'destinationKana' | 'destinationEng' | 'destinationNum' | 'destinationColor' | 'destinationNumIconKey' | 'direction' | 'trainType' | 'trainTypeEng'| 'trainTypeSub' | 'trainTypeSubEng' | 'trainTypeColor' | 'lineLogo' | 'lineColor' | 
    'carNumber' | 'leftOrRight' | 'isDispTime' | 'isDispLineName' | 'carNumberList' | 'headOffset' | 'backOffset' | 'isDrawStopText' | 'isDrawLine' | 'carLineColor' | 'startStationInd'