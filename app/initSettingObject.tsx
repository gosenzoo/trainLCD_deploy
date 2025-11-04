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
    isDispLineName: true
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