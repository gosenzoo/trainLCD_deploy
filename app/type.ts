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

// ページ表示エントリ（ページ名・表示時間・表示条件の組）
// type: 0=無条件 / 1=乗換あり / 2=次運用あり（未実装） / 3=Message（未実装）
type pageObjType = {
    pageName: string,
    dispTime: number,
    type: number
}

// pageState（0〜5）をキーにpageObjType[]を保持するページリスト辞書
type pageDispListType = { [key: string]: pageObjType[] }

// 表示設定（走行状態別ページリスト・言語ローテーション設定を保持）
type dispConfigType = {
    pageDispList: pageDispListType,
    langIdList: langIdEntryType[],
    isPageAuto: boolean  // true: タイマー自動切換え / false: ユーザー操作による手動切換え
}

type settingType = {
    info: infoType,
    operationDict: {[id: string]: operationType},
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
    trainTypeBackColor: string,
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
}

// 駅ナンバリングアイコン情報（symbol/number/presetKey/color をひとまとめにする）
type stationNumIconType = {
    // 有効値（drawParams で参照）: auto 時は lineDict の路線設定値が自動書き込みされる
    symbol: string,
    number: string,
    presetKey: string,
    color: string,
    // 手動設定値: colorMode に関わらず保持され、UI 入力欄には常にこれを表示する
    manualSymbol: string,
    manualPresetKey: string,
    manualColor: string,
    // symbol・presetKey・color の一括取得モード
    // 'auto': colorMode 切替・lineId 変更時に3フィールドを路線設定値で自動更新
    // 'manual': 各有効フィールド = 対応する manual* フィールド
    colorMode: 'auto' | 'manual',
}

type stationType = {
    name: string,
    kana: string,
    eng: string,
    numIcon: stationNumIconType,
    lineNumberType: string,
    transfers: transferItemType[],
    isPass: boolean,
    sectionTime: string,
    lineId: string,
    operationId: string,
    coordinate: [number | null, number | null],
    transferText: string,
    transferTextEng: string,
    doorSide: 'left' | 'right',
    headerNumberingType: string,
    transferListPlatform: string,
    otherLineInd: string,
    slotNum: string,
    leftSlotInd: string,
    otherCarNum: string,
    otherLeftSlotInd: string,
    transferListTransfers: string
}

type lineType = {
    lineIconKey: string,
    name: string,
    kana: string,
    eng: string,
    color: string,
    symbol: string,
    numIconPresetKey: string,
}


type iconParamsType = {
    presetType: string,
    color: string,
    symbol: string
}

type stationMembers = 'name' | 'kana' | 'eng' | 'transfers' | 'sectionTime' | 'lineId' | 'operationId' | 'transferText' | 'transferTextEng' | 'doorSide' | 'headerNumberingType' | 'lineNumberType' | 'transferListPlatform' | 'otherLineInd' | 'slotNum' | 'leftSlotInd' |
    'otherCarNum' | 'otherLeftSlotInd' | 'transferListTransfers'

type lineMembers = 'lineIconKey' | 'name' | 'kana' | 'eng' | 'color' | 'symbol' | 'numIconPresetKey'

type infoMembers = 'settingName' | 'isLoop' | 'isMoveByCoord'

type operationMembers = 'destination' | 'destinationKana' | 'destinationEng' | 'destinationNum' | 'destinationColor' | 'destinationNumIconKey' | 'direction' | 'trainType' | 'trainTypeEng'| 'trainTypeSub' | 'trainTypeSubEng' | 'trainTypeColor' | 'trainTypeBackColor' | 'lineLogo' | 'lineColor' |
    'carNumber' | 'leftOrRight' | 'isDispTime' | 'isDispLineName' | 'carNumberList' | 'headOffset' | 'backOffset' | 'isDrawStopText' | 'isDrawLine' | 'carLineColor'
