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
    trainTypeBackColor: "#3d6eff",
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
    transfers: [],
    isPass: false,
    sectionTime: "",
    lineId: "",
    coordinate: [null, null],
    transferText: "",
    transferTextEng: "",
    doorSide: 'left',
    headerNumberingType: "0",
    transferListPlatform: "",
    otherLineInd: "",
    slotNum: "0",
    leftSlotInd: "0",
    otherCarNum: "0",
    otherLeftSlotInd: "0",
    transferListTransfers: ""
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

// 表示設定の初期値（6走行状態×各ページリスト・日本語/ひらがな/英語の3言語ローテーション）
const initDispConfigObject: dispConfigType = {
    isPageAuto: true,
    pageDispList: {
        '0': [ // 始発停車
            { pageName: "defaultLineSVG.svg", dispTime: 11000, type: 0 },
            { pageName: "overLineSVG.svg",    dispTime: 11000, type: 0 },
        ],
        '1': [ // 走行
            { pageName: "defaultLineSVG.svg", dispTime: 11000, type: 0 },
            { pageName: "overLineSVG.svg",    dispTime: 11000, type: 0 },
            { pageName: "transfers.svg",       dispTime: 11000, type: 1 },
        ],
        '2': [ // 直前
            { pageName: "platform.svg",        dispTime: 11000, type: 0 },
            { pageName: "doorAnim.svg",        dispTime: 11000, type: 0 },
            { pageName: "defaultLineSVG.svg", dispTime: 11000, type: 0 },
            { pageName: "transfers.svg",       dispTime: 11000, type: 1 },
        ],
        '3': [ // 停車
            { pageName: "defaultLineSVG.svg", dispTime: 11000, type: 0 },
            { pageName: "overLineSVG.svg",    dispTime: 11000, type: 0 },
            { pageName: "platform.svg",        dispTime: 11000, type: 0 },
        ],
        '4': [ // 通過
            { pageName: "transfers.svg",       dispTime: 11000, type: 1 },
            { pageName: "overLineSVG.svg",    dispTime: 11000, type: 0 },
        ],
        '5': [ // 終点停車
            { pageName: "defaultLineSVG.svg", dispTime: 11000, type: 0 },
            { pageName: "overLineSVG.svg",    dispTime: 11000, type: 0 },
        ],
    },
    langIdList: [
        { langId: 0, displayTime: 4000, transTime: 400, gapTime: 100 },
        { langId: 1, displayTime: 1500, transTime: 400, gapTime: 100 },
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

export default {setting: initSettingObject, info: initInfoObject, operation: initOperationObject, station: initStationObject, line: initLineObject, langIdEntry: initLangIdEntryObject, dispConfig: initDispConfigObject}