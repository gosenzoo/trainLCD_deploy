import "./type"
import { APP_VERSION } from "./version"

const initInfoObject: infoType = {
    settingName: "",
    isLoop: false,
    pageAdvanceMode: 'manual',  // 画面送りは初期値「手動」（7.53節）
    allowManualControl: true,   // 手動操作を許可（7.53節）
}

const initOperationObject: operationType = {
    destination: "",
    destinationKana: "",
    destinationEng: "",
    destinationNum: "",
    destinationColor: "",
    destinationNumIconKey: "N_JR_east",
    isAutoDestination: true,
    direction: "",
    trainType: "",
    trainTypeEng: "",
    trainTypeZh: "",
    trainTypeKo: "",
    trainTypeSub: "",
    trainTypeSubEng: "",
    trainTypeColor: "",
    trainTypeBackColor: "#3d6eff",
    lineLogo: "",
    lineColor: "",
    carNumber: "",
    leftOrRight: 'right',
    isDispTime: false,  // 所要時間表示は初期値オフ（7.51節）
    isDispLineName: true,
    carNumberList: "1*,2,3,4,5,6,7,8",
    headOffset: "170",
    backOffset: "170",
    isDrawStopText: false,
    isDrawLine: false,
    carLineColor: "#FFFFFF",
    displayType: "tokyu",  // 表示タイプ（7.52節）
}

const initStationObject: stationType = {
    name: "",
    kana: "",
    eng: "",
    zh: "",
    ko: "",
    subName: "",
    numIcon: { symbol: "", number: "", presetKey: "N_tokyu", color: "", manualSymbol: "", manualPresetKey: "N_tokyu", manualColor: "", colorMode: "auto" },
    // 2つ目のナンバリングは任意項目のため、既定では自動補完しない（colorMode: manual）
    numIconNext: { symbol: "", number: "", presetKey: "N_tokyu", color: "", manualSymbol: "", manualPresetKey: "N_tokyu", manualColor: "", colorMode: "manual" },
    lineNumberType: "0",
    transfers: [],
    isPass: false,
    sectionTime: "60",  // 走行時間（秒）の初期値（7.53節）
    stopTime: "20",     // 停車時間（秒）の初期値（7.53節）
    lineId: "",
    operationId: "",
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
    symbol: "",
    numIconPresetKey: "",
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
            { pageName: "defaultLineSVG.svg", dispTime: 15000, type: 0 },
            { pageName: "overLineSVG.svg",    dispTime: 15000, type: 0 },
        ],
        '1': [ // 走行
            { pageName: "defaultLineSVG.svg",   dispTime: 15000, type: 0 },
            { pageName: "trainTypeChange.svg",   dispTime: 15000, type: 2 },
            { pageName: "overLineSVG.svg",       dispTime: 15000, type: 0 },
            { pageName: "transfers.svg",         dispTime: 15000, type: 1 },
            { pageName: "infoMessage.svg",       dispTime: 15000, type: 3 },
        ],
        '2': [ // 直前
            { pageName: "platform.svg",        dispTime: 15000, type: 0 },
            { pageName: "doorAnim.svg",        dispTime: 15000, type: 0 },
            { pageName: "defaultLineSVG.svg", dispTime: 15000, type: 0 },
            { pageName: "transfers.svg",       dispTime: 15000, type: 1 },
        ],
        '3': [ // 停車
            { pageName: "defaultLineSVG.svg",   dispTime: 15000, type: 0 },
            { pageName: "overLineSVG.svg",       dispTime: 15000, type: 0 },
            { pageName: "platform.svg",          dispTime: 15000, type: 0 },
            { pageName: "trainTypeChange.svg",   dispTime: 15000, type: 2 },
            { pageName: "infoMessage.svg",       dispTime: 15000, type: 3 },
        ],
        '4': [ // 通過
            { pageName: "transfers.svg",       dispTime: 15000, type: 1 },
            { pageName: "overLineSVG.svg",    dispTime: 15000, type: 0 },
        ],
        '5': [ // 終点停車
            { pageName: "defaultLineSVG.svg", dispTime: 15000, type: 0 },
            { pageName: "overLineSVG.svg",    dispTime: 15000, type: 0 },
        ],
    },
    langIdList: [
        { langId: 0, displayTime: 4000, transTime: 400, gapTime: 100 },
        { langId: 1, displayTime: 1500, transTime: 400, gapTime: 100 },
        { langId: 2, displayTime: 4000, transTime: 400, gapTime: 100 },
        // 中国語・韓国語（7.54節）。表示時間などはひらがなと同じ
        { langId: 3, displayTime: 1500, transTime: 400, gapTime: 100 },
        { langId: 4, displayTime: 1500, transTime: 400, gapTime: 100 }
    ]
}

const initSettingObject: settingType = {
    // 設定データのバージョン情報（現在のアプリのバージョン）
    "0_metadata": { version: APP_VERSION },
    info: initInfoObject,
    operationDict: {"0": initOperationObject},
    stationList: [],
    lineDict: {},
    iconDict: {},
    dispConfig: initDispConfigObject,
    message: { text: "" }
}

export default {setting: initSettingObject, info: initInfoObject, operation: initOperationObject, station: initStationObject, line: initLineObject, langIdEntry: initLangIdEntryObject, dispConfig: initDispConfigObject}