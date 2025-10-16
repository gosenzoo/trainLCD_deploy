import React, { useState, useEffect } from "react"
import "../type"

type infoFormType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const InfoForm: React.FC<infoFormType> = ({setting, setSetting}) => {
    const formUpdated = (e:any, field: infoMembers) => {
        if(!setting){
            return
        }
        if(!setting.info){
            return
        }

        const _setting: settingType = structuredClone(setting)

        if(field !== "isLoop" && field !== "isMoveByCoord"){
            _setting.info[field] = e.target.value
        }
        else{
            _setting.info[field] = e.target.checked
        }

        setSetting(_setting)
    }

    return(
        <div>
            <h2>基本設定</h2>
            <label>設定名</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'settingName')}} value={setting.info.settingName}></input>
            <br></br>
            <label>行き先</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destination')}} value={setting.info.destination}></input>
            <br></br>
            <label>行き先かな</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destinationKana')}} value={setting.info.destinationKana}></input>
            <br></br>
            <label>経由等</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'direction')}} value={setting.info.direction}></input>
            <br></br>
            <label>行き先・経由等(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'directionEng')}} value={setting.info.directionEng}></input>
            <br></br>
            <label>種別</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainType')}} value={setting.info.trainType}></input>
            <br></br>
            <label>種別(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeEng')}} value={setting.info.trainTypeEng}></input>
            <br></br>
            <label>種別補足</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeSub')}} value={setting.info.trainTypeSub}></input>
            <br></br>
            <label>種別補足(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeSubEng')}} value={setting.info.trainTypeSubEng}></input>
            <br></br>
            <label>種別文字色</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'trainTypeColor')}} value={setting.info.trainTypeColor}></input>
            <br></br>
            <label>列車路線記号</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'lineLogo')}} value={setting.info.lineLogo}></input>
            <br></br>
            <label>列車路線記号（色）</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'lineColor')}} value={setting.info.lineColor}></input>
            <br></br>
            <label>号車</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'carNumber')}} value={setting.info.carNumber}></input>
            <br></br>
            <label>進行方向</label>
            <select onChange={(e) => {formUpdated(e, 'leftOrRight')}} value={setting.info.leftOrRight}>
                <option value={'right'}>右</option>
                <option value={'left'}>左</option>
            </select>
            <br></br>
            環状運転<input type="checkbox" onChange={(e) => {formUpdated(e, 'isLoop')}} checked={setting.info.isLoop}></input>
            <br></br>
            座標による駅移動<input type="checkbox" onChange={(e) => {formUpdated(e, 'isMoveByCoord')}} checked={setting.info.isMoveByCoord}></input>
        </div>
    )
}

export default InfoForm