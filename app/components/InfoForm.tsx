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

        _setting.info[field] = e.target.value

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
            <label>経由等</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'direction')}} value={setting.info.direction}></input>
            <br></br>
            <label>種別</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainType')}} value={setting.info.trainType}></input>
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
            <label>設置位置</label>
            <select onChange={(e) => {formUpdated(e, 'place')}}>
                { setting.info.place === 'left' ? <option value={'left'} selected>左ドア上</option> : <option value={'left'}>左ドア上</option> }
                { setting.info.place === 'right' ? <option value={'right'} selected>右ドア上</option> : <option value={'right'}>右ドア上</option> }
            </select>
        </div>
    )
}

export default InfoForm