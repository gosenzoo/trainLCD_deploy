import { initScriptLoader } from "next/script"
import "./type"

const initInfoObject: infoType = {
    settingName: "",
    destination: "",
    destinationKana: "",
    destinationEng: "",
    destinationNum: "",
    destinationColor: "",
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
    isLoop: false,
    isMoveByCoord: false,
    isDispTime: true,
    isDispLineName: true,
    carNumberList: "1*,2,3,4,5,6,7,8",
    headOffset: "170",
    backOffset: "170"
}

const initStationObject: stationType = {
    name: "",
    kana: "",
    eng: "",
    number: "",
    lineColor: "",
    transfers: "",
    isPass: false,
    sectionTime: "",
    lineId: "",
    coordinate: [null, null],
    transferText: "",
    transferTextEng: "",
    doorSide: 'left'
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
    stationList: [],
    lineDict: {},
    iconDict: {}
}

export default {setting: initSettingObject, info: initInfoObject, station: initStationObject, line: initLineObject}