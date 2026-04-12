import React, { useState, useEffect, HtmlHTMLAttributes } from "react"
import "../type"
import initObjects from "../initSettingObject"
import { isatty } from "tty"
import { iconIndexes, numberIndexes } from "../modules/presetIndex"

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

        const allOperationCheckbox = document.getElementById("allOperationCheckbox") as HTMLInputElement;
        const isAll = allOperationCheckbox.checked;

        const _setting: settingType = structuredClone(setting)

        if((field !== "isDispTime") && (field !== "isDispLineName") && (field !== "isDrawStopText") && (field !== "isDrawLine")){
            //テキストボックス入力の場合
            if(isAll){
                _setting.operationList.forEach((operation) => {
                    operation[field] = e.target.value;
                });
            }
            else{
                _setting.operationList[operationInd][field] = e.target.value;
            }
        }
        else{
            //チェックボックス入力の場合
            if(isAll){
                _setting.operationList.forEach((operation) => {
                    operation[field] = e.target.value;
                });
            }
            else{
                _setting.operationList[operationInd][field] = e.target.checked;
            }
        }

        setSetting(_setting)
    }

    return(
        <div>
            <h2>運用設定</h2>
            <div className="form-row">
                <label>すべての運用に適用</label>
                <input id="allOperationCheckbox" type="checkbox"></input>
            </div>
            <div className="btn-group">
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
                }}>運用を追加</button>
                <button onClick={e => {
                    const _setting: settingType = structuredClone(setting);
                    _setting.operationList.splice(operationInd, 1);
                    if(_setting.operationList.length <= 0){
                        _setting.operationList.push(initObjects.operation);
                    }
                    setOperationInd(0);
                    setSetting(_setting);
                }} className="btn-danger">表示中を削除</button>
            </div>
            <div className="form-row">
                <label>設定開始駅ID</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'startStationInd')}} value={setting.operationList[operationInd].startStationInd}></input>
            </div>
            <div className="form-row">
                <label>進行方向</label>
                <select onChange={(e) => {formUpdated(e, 'leftOrRight')}} value={setting.operationList[operationInd].leftOrRight}>
                    <option value={'right'}>右</option>
                    <option value={'left'}>左</option>
                </select>
            </div>
            <div className="form-row">
                <label>所要時間表示</label>
                <input type="checkbox" onChange={(e) => {formUpdated(e, 'isDispTime')}} checked={setting.operationList[operationInd].isDispTime}></input>
            </div>
            <div className="form-row">
                <label>路線名表示</label>
                <input type="checkbox" onChange={(e) => {formUpdated(e, 'isDispLineName')}} checked={setting.operationList[operationInd].isDispLineName}></input>
            </div>
            <div className="form-row">
                <label>次停車駅表示</label>
                <input type="checkbox" onChange={(e) => {formUpdated(e, 'isDrawStopText')}} checked={setting.operationList[operationInd].isDrawStopText}></input>
            </div>
            <div className="form-row">
                <label>行き先</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'destination')}} value={setting.operationList[operationInd].destination}></input>
            </div>
            <div className="form-row">
                <label>行き先かな</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'destinationKana')}} value={setting.operationList[operationInd].destinationKana}></input>
            </div>
            <div className="form-row">
                <label>行き先(英語)</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'destinationEng')}} value={setting.operationList[operationInd].destinationEng}></input>
            </div>
            <div className="form-row">
                <label>行き先ナンバリング</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'destinationNum')}} value={setting.operationList[operationInd].destinationNum}></input>
            </div>
            <div className="form-row">
                <label>行き先色</label>
                <input type="color" onChange={(e) => {formUpdated(e, 'destinationColor')}} value={setting.operationList[operationInd].destinationColor}></input>
            </div>
            <div className="form-row">
                <label>行先ナンバリング記号</label>
                <select onChange={(e) => {formUpdated(e, 'destinationNumIconKey')}} value={setting.operationList[operationInd].destinationNumIconKey}>
                    {
                        numberIndexes.map(num => {
                            return(
                                <option value={num.key}>{num.name}</option>
                            )
                        })
                    }
                </select>
            </div>
            <div className="form-row">
                <label>経由等</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'direction')}} value={setting.operationList[operationInd].direction}></input>
            </div>
            <div className="form-row">
                <label>種別</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'trainType')}} value={setting.operationList[operationInd].trainType}></input>
            </div>
            <div className="form-row">
                <label>種別(英語)</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeEng')}} value={setting.operationList[operationInd].trainTypeEng}></input>
            </div>
            <div className="form-row">
                <label>種別補足</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeSub')}} value={setting.operationList[operationInd].trainTypeSub}></input>
            </div>
            <div className="form-row">
                <label>種別補足(英語)</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'trainTypeSubEng')}} value={setting.operationList[operationInd].trainTypeSubEng}></input>
            </div>
            <div className="form-row">
                <label>種別文字色</label>
                <input type="color" onChange={(e) => {formUpdated(e, 'trainTypeColor')}} value={setting.operationList[operationInd].trainTypeColor}></input>
            </div>
            <div className="form-row">
                <label>列車路線記号</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'lineLogo')}} value={setting.operationList[operationInd].lineLogo}></input>
            </div>
            <div className="form-row">
                <label>列車路線記号（色）</label>
                <input type="color" onChange={(e) => {formUpdated(e, 'lineColor')}} value={setting.operationList[operationInd].lineColor}></input>
            </div>
            <div className="form-row">
                <label>号車</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'carNumber')}} value={setting.operationList[operationInd].carNumber}></input>
            </div>
            <div className="form-row">
                <label>全体号車</label>
                <input id="carNumberListInput" type="text" onChange={(e) => {formUpdated(e, 'carNumberList')}} value={setting.operationList[operationInd].carNumberList}></input>
                <button onClick={(e) => {
                    const carNumberListInput = document.getElementById("carNumberListInput") as HTMLInputElement;
                    const carNumberListArr = carNumberListInput.value.split(",");
                    carNumberListArr.reverse();
                    carNumberListInput.value = carNumberListArr.join(",");

                    const _setting: settingType = structuredClone(setting);
                    _setting.operationList[operationInd].carNumberList = carNumberListInput.value;
                    setSetting(_setting);
                }}>反転</button>
            </div>
            <div className="form-row">
                <label>全体号車連番入力</label>
                <input id="sequenceCarTextInput" type="text"></input>
                <button onClick={(e) => {
                    const sequenceCarTextInput = document.getElementById("sequenceCarTextInput") as HTMLInputElement;
                    const carNumberListInput = document.getElementById("carNumberListInput") as HTMLInputElement;
                    const maxNum = parseInt(sequenceCarTextInput.value);
                    let carNumberListStr = "";
                    for(let i=1; i<=maxNum; i++){
                        carNumberListStr += i.toString();
                        if(i.toString() === setting.operationList[operationInd].carNumber){
                            carNumberListStr += "*";
                        }
                        if(i !== maxNum){
                            carNumberListStr += ",";
                        }
                    }
                    carNumberListInput.value = carNumberListStr;

                    const _setting: settingType = structuredClone(setting);
                    _setting.operationList[operationInd].carNumberList = carNumberListStr;
                    setSetting(_setting);
                }}>入力</button>
            </div>
            <div className="form-row">
                <label>前方オフセット</label>
                <input type="number" onChange={(e) => {formUpdated(e, 'headOffset')}} value={setting.operationList[operationInd].headOffset}></input>
            </div>
            <div className="form-row">
                <label>後方オフセット</label>
                <input type="number" onChange={(e) => {formUpdated(e, 'backOffset')}} value={setting.operationList[operationInd].backOffset}></input>
            </div>
            <div className="form-row">
                <label>列車ライン色</label>
                <input type="color" onChange={(e) => {formUpdated(e, 'carLineColor')}} value={setting.operationList[operationInd].carLineColor}></input>
            </div>
            <div className="form-row">
                <label>列車にラインを描画するか</label>
                <input type="checkbox" onChange={(e) => {formUpdated(e, 'isDrawLine')}} checked={setting.operationList[operationInd].isDrawLine}></input>
            </div>
        </div>
    )
}

export default OperationForm