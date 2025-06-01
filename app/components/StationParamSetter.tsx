import React, { useState, useEffect } from 'react'
import "../type"
import kanaToAlphabet from "../modules/KanaConverter"

type stationParamsSetterProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    selectedIndexes: number[]
}

const StationParamSetter: React.FC<stationParamsSetterProps> = ({setting, setSetting, selectedIndexes}) => {
    const formUpdated = (e:any, field: stationMembers) => {
        if(!setting){
            return
        }

        const _setting: settingType = structuredClone(setting)

        selectedIndexes.forEach(ind => {
            if(!_setting.stationList[ind - 1]){
                return
            }
            if(!(field in _setting.stationList[ind - 1])){
                return
            }
            _setting.stationList[ind - 1][field] = e.target.value

            //かなに変更があった場合、ローマ字も更新
            if(field === "kana"){
                _setting.stationList[ind - 1].eng = kanaToAlphabet(e.target.value, 0)
            }
        })
        
        setSetting(_setting)
    }
    const lineSelectChanged = (e: any) => {
        const _setting = structuredClone(setting)
        selectedIndexes.map((ind, index) => {
            let c = ''
            if(_setting.stationList[ind - 1].transfers !== ''){ c = ' ' }
            _setting.stationList[ind - 1].transfers += c + e.target.value
        })
        setSetting(_setting)

        e.target.selectedIndex = 0
    }
    
    return (
        <div>
            <label>駅名</label>
            <input type="text" id="nameInput" onChange={(e) => formUpdated(e, 'name')}
                value={ setting && selectedIndexes.length > 0 ? setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]?.name : ''}
            ></input>
            <br></br>
            <label>駅名かな</label>
            <input type="text" id="kanaInput" onChange={(e) => formUpdated(e, 'kana')}
                value={ setting && selectedIndexes.length > 0 ? setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]?.kana : ''}
            ></input>
            <br></br>
            <label>駅名英語</label>
            <input type="text" id="engInput" onChange={(e) => formUpdated(e, 'eng')}
                value={ setting && selectedIndexes.length > 0 ? setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]?.eng : ''}
            ></input>
            <br></br>
            <label>駅ナンバリング</label>
            <input type="text" id="numberInput" onChange={(e) => formUpdated(e, 'number')}
                value={ setting && selectedIndexes.length > 0 ? setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]?.number : ''}
            ></input>
            <br></br>
            <label>路線カラー</label>
            <input type="color" id="lineColorInput" onChange={(e) => formUpdated(e, 'lineColor')}
                value={ setting && selectedIndexes.length > 0 ? setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]?.lineColor : ''}
            ></input>
            <br></br>
            <label>乗換路線</label>
            <input type="text" id="transfersInput" onChange={(e) => formUpdated(e, 'transfers')}
                value={ setting && selectedIndexes.length > 0 ? setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]?.transfers : ''}
            ></input>
            <select onChange={lineSelectChanged}>
                <option>接続路線を追加</option>
                {
                    Object.keys(setting.lineDict).map((key, index) => {
                        return(
                            <option key={index} value={key}>
                                {setting.lineDict[key].name}
                            </option>
                        )
                    })
                }
            </select>
        </div>
    )
}

export default StationParamSetter