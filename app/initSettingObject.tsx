import "./type"

const initInfoObject: infoType = {
    settingName: "",
    isLoop: false,
    isMoveByCoord: false,
}

const initOperationObject: operationType = {
    destination: "",
    destinationKana: "",
    destinationEng: "",
    destinationNum: "",
    destinationColor: "",
    destinationNumIconKey: "N_tokyu",
    direction: "",
    trainType: "",
    trainTypeEng: "",
    trainTypeSub: "",
    trainTypeSubEng: "",
    trainTypeColor: "",
    lineLogo: "",
    lineColor: "",
    carNumber: "",
    leftOrRight: 'right',
    isDispTime: true,
    isDispLineName: true,
    carNumberList: "1*,2,3,4,5,6,7,8",
    headOffset: "170",
    backOffset: "170",
    isDrawStopText: false,
    isDrawLine: false,
    carLineColor: "#FFFFFF",
    startStationInd: "0"
}

const initStationObject: stationType = {
    name: "",
    kana: "",
    eng: "",
    number: "",
    lineColor: "",
    numIconPresetKey: "N_tokyu",
    lineNumberType: "0",
    transfers: "",
    isPass: false,
    sectionTime: "",
    lineId: "",
    coordinate: [null, null],
    transferText: "",
    transferTextEng: "",
    doorSide: 'left',
    transferCountLineP: "",
    otherLineInd: "",
    slotNum: "0",
    leftSlotInd: "0",
    otherCarNum: "0",
    otherLeftSlotInd: "0",
    transfersListDisp: ""
}

const initLineObject = {
    lineIconKey: "",
    name: "",
    kana: "",
    eng: "",
    color: "",
}

// 言語エントリの初期値（日本語）
const initLangIdEntryObject: langIdEntryType = {
    langId: 0,
    displayTime: 4000,
    transTime: 400,
    gapTime: 100
}

// ページエントリの初期値
const initPageEntryObject: pageEntryType = {
    pageName: "defaultLineSVG.svg",
    dispTime: 8000
}

// 表示設定の初期値（全4ページ・日本語/ひらがな/英語の3言語ローテーション）
const initDispConfigObject: dispConfigType = {
    pageList: [
        { pageName: "defaultLineSVG.svg", dispTime: 8000 },
        { pageName: "overLineSVG.svg",    dispTime: 8000 },
        { pageName: "transfers.svg",       dispTime: 8000 },
        { pageName: "platform.svg",        dispTime: 8000 },
    ],
    langIdList: [
        { langId: 0, displayTime: 4000, transTime: 400, gapTime: 100 },
        { langId: 1, displayTime: 2000, transTime: 400, gapTime: 100 },
        { langId: 2, displayTime: 4000, transTime: 400, gapTime: 100 }
    ]
}

const initSettingObject: settingType = {
    info: initInfoObject,
    operationList: [initOperationObject],
    stationList: [],
    lineDict: {},
    iconDict: {},
    dispConfig: initDispConfigObject
}

export default {setting: initSettingObject, info: initInfoObject, operation: initOperationObject, station: initStationObject, line: initLineObject, langIdEntry: initLangIdEntryObject, pageEntry: initPageEntryObject, dispConfig: initDispConfigObject}