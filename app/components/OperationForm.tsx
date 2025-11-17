import React, { useState, useEffect } from "react"
import "../type"

type operationFormType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const OperationForm: React.FC<operationFormType> = ({setting, setSetting}) => {
    const formUpdated = (e:any, field: operationMembers) => {
        if(!setting){
            return
        }
        if(!setting.operation){
            return
        }

        const _setting: settingType = structuredClone(setting)

        if((field !== "isDispTime") && (field !== "isDispLineName") && (field !== "isDrawStopText") && (field !== "isDrawLine")){
            //テキストボックス入力の場合
            _setting.operation[field] = e.target.value
        }
        else{
            //チェックボックス入力の場合
            _setting.operation[field] = e.target.checked
        }

        setSetting(_setting)
    }

    return(
        <div>
            <h2>運用設定</h2>
            <label>進行方向</label>
            <select onChange={(e) => {formUpdated(e, 'leftOrRight')}} value={setting.operation.leftOrRight}>
                <option value={'right'}>右</option>
                <option value={'left'}>左</option>
            </select>
            <br></br>
            所要時間表示<input type="checkbox" onChange={(e) => {formUpdated(e, 'isDispTime')}} checked={setting.operation.isDispTime}></input>
            <br></br>
            路線名表示<input type="checkbox" onChange={(e) => {formUpdated(e, 'isDispLineName')}} checked={setting.operation.isDispLineName}></input>
            <br></br>
            次停車駅表示<input type="checkbox" onChange={(e) => {formUpdated(e, 'isDrawStopText')}} checked={setting.operation.isDrawStopText}></input>
            <br></br>
            <label>行き先</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destination')}} value={setting.operation.destination}></input>
            <br></br>
            <label>行き先かな</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destinationKana')}} value={setting.operation.destinationKana}></input>
            <br></br>
            <label>行き先(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destinationEng')}} value={setting.operation.destinationEng}></input>
            <br></br>
            <label>行き先ナンバリング</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destinationNum')}} value={setting.operation.destinationNum}></input>
            <br></br>
            <label>行き先色</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'destinationColor')}} value={setting.operation.destinationColor}></input>
            <br></br>
            <label>行先ナンバリング記号</label>
            <select onChange={(e) => {formUpdated(e, 'destinationNumIconKey')}} value={setting.operation.destinationNumIconKey}>
                <option value="tokyu">東急</option>
                <option value="JR_east">JR東日本</option>
                <option value="tokyo_subway">東京地下鉄</option>
                <option value="JR_west">JR西日本</option>
                <option value="JR_central">JR東海</option>
            </select>
            <br></br>
            <label>経由等</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'direction')}} value={setting.operation.direction}></input>
            <br></br>
            <label>種別</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainType')}} value={setting.operation.trainType}></input>
            <br></br>
            <label>種別(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeEng')}} value={setting.operation.trainTypeEng}></input>
            <br></br>
            <label>種別補足</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeSub')}} value={setting.operation.trainTypeSub}></input>
            <br></br>
            <label>種別補足(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeSubEng')}} value={setting.operation.trainTypeSubEng}></input>
            <br></br>
            <label>種別文字色</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'trainTypeColor')}} value={setting.operation.trainTypeColor}></input>
            <br></br>
            <label>列車路線記号</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'lineLogo')}} value={setting.operation.lineLogo}></input>
            <br></br>
            <label>列車路線記号（色）</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'lineColor')}} value={setting.operation.lineColor}></input>
            <br></br>
            <label>号車</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'carNumber')}} value={setting.operation.carNumber}></input>
            <br></br>
            <label>全体号車</label>
            <input id="carNumberListInput" type="text" onChange={(e) => {formUpdated(e, 'carNumberList')}} value={setting.operation.carNumberList}></input>
            <button onClick={(e) => {
                const carNumberListInput = document.getElementById("carNumberListInput") as HTMLInputElement;
                const carNumberListArr = carNumberListInput.value.split(",");
                carNumberListArr.reverse();
                carNumberListInput.value = carNumberListArr.join(",");
            }}>反転</button>
            <br></br>
            <label>全体号車連番入力</label>
            <input id="sequenceCarTextInput" type="text"></input>
            <button onClick={(e) => {
                const sequenceCarTextInput = document.getElementById("sequenceCarTextInput") as HTMLInputElement;
                const carNumberListInput = document.getElementById("carNumberListInput") as HTMLInputElement;
                const maxNum = parseInt(sequenceCarTextInput.value);
                let carNumberListStr = "";
                for(let i=1; i<=maxNum; i++){
                    carNumberListStr += i.toString();
                    if(i !== maxNum){
                        carNumberListStr += ",";
                    }
                }
                carNumberListInput.value = carNumberListStr;
            }}>入力</button>
            <br></br>
            <label>前方オフセット</label>
            <input type="number" onChange={(e) => {formUpdated(e, 'headOffset')}} value={setting.operation.headOffset}></input>
            <br></br>
            <label>後方オフセット</label>
            <input type="number" onChange={(e) => {formUpdated(e, 'backOffset')}} value={setting.operation.backOffset}></input>
            <br></br>
            <label>列車ライン色</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'carLineColor')}} value={setting.operation.carLineColor}></input>
            <br></br>
            <label>列車にラインを描画するか</label>
            <input type="checkbox" onChange={(e) => {formUpdated(e, 'isDrawLine')}} checked={setting.operation.isDrawLine}></input>
        </div>
    )
}

export default OperationForm