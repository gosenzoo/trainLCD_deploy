import { initScriptLoader } from "next/script"
import "./type"

const initSettingObject: settingType = {
    info: {settingName: "", destination: "", destinationKana: "", destinationEng: "", destinationNum: "", destinationColor: "", direction: "", trainType: "", trainTypeEng: "",trainTypeSub: "", trainTypeSubEng: "", trainTypeColor: "", lineLogo: "", lineColor: "", carNumber: "", leftOrRight: 'right', isLoop: false, isMoveByCoord: false},
    stationList: [],
    lineDict: {},
    iconDict: {}
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
    transferTextEng: ""
}

export default {setting: initSettingObject, station: initStationObject}