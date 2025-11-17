import React, { useState, useEffect } from "react"
import "../type"
import initObjects from "../initSettingObject"

type operationFormType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const OperationForm: React.FC<operationFormType> = ({setting, setSetting}) => {
    //何番目の運用を選んでいるか
    const [operationInd, setOperationInd] = useState<number>(0);

    const formUpdated = (e:any, field: operationMembers) => {
        if(!setting){
            return
        }
        if(!setting.operationList){
            return
        }

        const _setting: settingType = structuredClone(setting)

        if((field !== "isDispTime") && (field !== "isDispLineName") && (field !== "isDrawStopText") && (field !== "isDrawLine")){
            //テキストボックス入力の場合
            _setting.operationList[operationInd][field] = e.target.value
        }
        else{
            //チェックボックス入力の場合
            _setting.operationList[operationInd][field] = e.target.checked
        }

        setSetting(_setting)
    }

    return(
        <div>
            <h2>運用設定</h2>
            <select onChange={e => {setOperationInd(parseInt(e.target.value))}}>
                {setting.operationList.map((operation, index) => {
                    return (
                        <option key={index} value={index}>{index}</option>
                    )
                })}
            </select>
            <button onClick={e => {
                const _setting: settingType = structuredClone(setting);
                _setting.operationList.push(setting.operationList[operationInd]);
                setSetting(_setting);
            }}>運用設定を追加</button>
            <button onClick={e => {
                const _setting: settingType = structuredClone(setting);
                _setting.operationList.splice(operationInd, 1);
                if(_setting.operationList.length <= 0){
                    _setting.operationList.push(initObjects.operation); //全部なくなったら初期状態を設定
                }
                setOperationInd(0); //とりあえず0番目に戻す
                setSetting(_setting);
            }}>表示中の運用設定を削除</button>
            <br></br>
            <label>設定開始駅ID</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'startStationInd')}} value={setting.operationList[operationInd].startStationInd}></input>
            <br></br>
            <br></br>
            <label>進行方向</label>
            <select onChange={(e) => {formUpdated(e, 'leftOrRight')}} value={setting.operationList[operationInd].leftOrRight}>
                <option value={'right'}>右</option>
                <option value={'left'}>左</option>
            </select>
            <br></br>
            所要時間表示<input type="checkbox" onChange={(e) => {formUpdated(e, 'isDispTime')}} checked={setting.operationList[operationInd].isDispTime}></input>
            <br></br>
            路線名表示<input type="checkbox" onChange={(e) => {formUpdated(e, 'isDispLineName')}} checked={setting.operationList[operationInd].isDispLineName}></input>
            <br></br>
            次停車駅表示<input type="checkbox" onChange={(e) => {formUpdated(e, 'isDrawStopText')}} checked={setting.operationList[operationInd].isDrawStopText}></input>
            <br></br>
            <label>行き先</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destination')}} value={setting.operationList[operationInd].destination}></input>
            <br></br>
            <label>行き先かな</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destinationKana')}} value={setting.operationList[operationInd].destinationKana}></input>
            <br></br>
            <label>行き先(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destinationEng')}} value={setting.operationList[operationInd].destinationEng}></input>
            <br></br>
            <label>行き先ナンバリング</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'destinationNum')}} value={setting.operationList[operationInd].destinationNum}></input>
            <br></br>
            <label>行き先色</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'destinationColor')}} value={setting.operationList[operationInd].destinationColor}></input>
            <br></br>
            <label>行先ナンバリング記号</label>
            <select onChange={(e) => {formUpdated(e, 'destinationNumIconKey')}} value={setting.operationList[operationInd].destinationNumIconKey}>
                <option value="tokyu">東急</option>
                <option value="JR_east">JR東日本</option>
                <option value="tokyo_subway">東京地下鉄</option>
                <option value="JR_west">JR西日本</option>
                <option value="JR_central">JR東海</option>
            </select>
            <br></br>
            <label>経由等</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'direction')}} value={setting.operationList[operationInd].direction}></input>
            <br></br>
            <label>種別</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainType')}} value={setting.operationList[operationInd].trainType}></input>
            <br></br>
            <label>種別(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeEng')}} value={setting.operationList[operationInd].trainTypeEng}></input>
            <br></br>
            <label>種別補足</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeSub')}} value={setting.operationList[operationInd].trainTypeSub}></input>
            <br></br>
            <label>種別補足(英語)</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeSubEng')}} value={setting.operationList[operationInd].trainTypeSubEng}></input>
            <br></br>
            <label>種別文字色</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'trainTypeColor')}} value={setting.operationList[operationInd].trainTypeColor}></input>
            <br></br>
            <label>列車路線記号</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'lineLogo')}} value={setting.operationList[operationInd].lineLogo}></input>
            <br></br>
            <label>列車路線記号（色）</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'lineColor')}} value={setting.operationList[operationInd].lineColor}></input>
            <br></br>
            <label>号車</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'carNumber')}} value={setting.operationList[operationInd].carNumber}></input>
            <br></br>
            <label>全体号車</label>
            <input id="carNumberListInput" type="text" onChange={(e) => {formUpdated(e, 'carNumberList')}} value={setting.operationList[operationInd].carNumberList}></input>
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
            <input type="number" onChange={(e) => {formUpdated(e, 'headOffset')}} value={setting.operationList[operationInd].headOffset}></input>
            <br></br>
            <label>後方オフセット</label>
            <input type="number" onChange={(e) => {formUpdated(e, 'backOffset')}} value={setting.operationList[operationInd].backOffset}></input>
            <br></br>
            <label>列車ライン色</label>
            <input type="color" onChange={(e) => {formUpdated(e, 'carLineColor')}} value={setting.operationList[operationInd].carLineColor}></input>
            <br></br>
            <label>列車にラインを描画するか</label>
            <input type="checkbox" onChange={(e) => {formUpdated(e, 'isDrawLine')}} checked={setting.operationList[operationInd].isDrawLine}></input>
        </div>
    )
}

export default OperationForm