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
    destinationNumIconKey: "tokyu",
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
    numIconPresetKey: "tokyu",
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
    otherLeftSlotInd: "0"
}

const initLineObject = {
    lineIconKey: "",
    name: "",
    kana: "",
    eng: "",
    color: "",
}

const initSettingObject: settingType = {
    info: initInfoObject,
    operationList: [initOperationObject],
    stationList: [],
    lineDict: {},
    iconDict: {}
}

export default {setting: initSettingObject, info: initInfoObject, operation: initOperationObject, station: initStationObject, line: initLineObject}