import React, { useState, useEffect, HtmlHTMLAttributes } from "react"
import "../type"
import initObjects from "../initSettingObject"
import { isatty } from "tty"
import { iconIndexes, numberIndexes } from "../modules/presetIndex"
import ToggleSwitch from './ToggleSwitch'

type operationFormType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const OperationForm: React.FC<operationFormType> = ({setting, setSetting}) => {
    //何番目の運用を選んでいるか
    const [operationInd, setOperationInd] = useState<number>(0);

    /**
     * 運用が実際に使用されるかどうかを判定する。
     * 適用範囲 [startInd, endInd] が駅リスト [0, stationList.length-1] と重ならない場合は未使用。
     * ※クランプ前の生インデックスで判定する。
     */
    const isOperationUnused = (operation: operationType, index: number): boolean => {
        const stationList = setting.stationList
        if (stationList.length === 0) return true  // 駅リストが空なら全運用が未使用

        const ops = setting.operationList
        const startInd = parseInt(operation.startStationInd)

        // operationList を startStationInd 昇順でソートして終了インデックスを求める
        const sorted = [...ops]
            .map((op, i) => ({ op, i }))
            .sort((a, b) => parseInt(a.op.startStationInd) - parseInt(b.op.startStationInd))
        const posInSorted = sorted.findIndex(entry => entry.i === index)
        const nextEntry = sorted[posInSorted + 1]
        const endInd = nextEntry
            ? parseInt(nextEntry.op.startStationInd) - 1
            : stationList.length - 1

        // 範囲 [startInd, endInd] が [0, stationList.length-1] と重ならない場合が未使用
        return startInd > stationList.length - 1 || endInd < 0
    }

    /**
     * タブに表示するラベルを生成する。
     * 「[開始駅名] → [終了駅名]」の形式。
     * インデックスが範囲外の場合は近い方の端にクランプし、駅名が空なら「駅名未定義」を使う。
     */
    const getTabLabel = (operation: operationType, index: number): string => {
        const stationList = setting.stationList
        const ops = setting.operationList

        const getStationName = (ind: number): string => {
            if (stationList.length === 0) return '駅名未定義'
            const clamped = Math.max(0, Math.min(ind, stationList.length - 1))
            return stationList[clamped]?.name || '駅名未定義'
        }

        const startInd = parseInt(operation.startStationInd)

        // operationList を startStationInd 昇順でソートし、この運用の次のエントリを求める
        const sorted = [...ops]
            .map((op, i) => ({ op, i }))
            .sort((a, b) => parseInt(a.op.startStationInd) - parseInt(b.op.startStationInd))
        const posInSorted = sorted.findIndex(entry => entry.i === index)
        const nextEntry = sorted[posInSorted + 1]
        // 右側は次の運用の開始駅をそのまま表示する（最後の運用は末尾の駅）
        const endInd = nextEntry
            ? parseInt(nextEntry.op.startStationInd)
            : stationList.length - 1

        return `${getStationName(startInd)} → ${getStationName(endInd)}`
    }
    //全ての運用に適用するかどうか
    const [isAll, setIsAll] = useState<boolean>(false);

    const formUpdated = (e:any, field: operationMembers) => {
        if(!setting || !setting.operationList){ return }

        const _setting: settingType = structuredClone(setting)

        //テキストボックス入力の場合
        if(isAll){
            _setting.operationList.forEach((operation) => {
                operation[field] = e.target.value;
            });
        }
        else{
            _setting.operationList[operationInd][field] = e.target.value;
        }

        setSetting(_setting)
    }

    // トグルスイッチ用ハンドラ（boolean 値を直接受け取る）
    const toggleUpdated = (checked: boolean, field: operationMembers) => {
        if(!setting || !setting.operationList){ return }
        const _setting: settingType = structuredClone(setting)

        if(isAll){
            _setting.operationList.forEach((operation) => {
                operation[field] = checked;
            });
        }
        else{
            _setting.operationList[operationInd][field] = checked;
        }

        setSetting(_setting)
    }

    return(
        <div>
            <h2>運用設定</h2>
            <div className="form-row">
                {/* 全運用一括適用トグルボタン */}
                <button
                    onClick={() => setIsAll(v => !v)}
                    className={`btn-toggle${isAll ? ' btn-toggle--active' : ''}`}
                >すべての運用に適用</button>
            </div>
            <div className="btn-group">
                <button onClick={e => {
                    const _setting: settingType = structuredClone(setting);
                    _setting.operationList.push(setting.operationList[operationInd]);
                    setSetting(_setting);
                    setOperationInd(_setting.operationList.length - 1);  // 追加した運用を選択状態にする
                }}>運用を追加</button>
                <button onClick={e => {
                    const _setting: settingType = structuredClone(setting);
                    _setting.operationList.splice(operationInd, 1);
                    if(_setting.operationList.length <= 0){
                        _setting.operationList.push(initObjects.operation);
                    }
                    // 削除後のインデックスを末尾に収める
                    setOperationInd(Math.min(operationInd, _setting.operationList.length - 1));
                    setSetting(_setting);
                }} className="btn-danger">表示中を削除</button>
            </div>
            {/* 運用選択タブ行: operation-tabs クラスで下揃え・フォームと接続するスタイルを適用 */}
            <div className="operation-tabs">
                {setting.operationList.map((operation, index) => {
                    const unused = isOperationUnused(operation, index)
                    return (
                        <button
                            key={index}
                            onClick={() => setOperationInd(index)}
                            className={`tab-btn${operationInd === index ? ' active' : ''}${unused ? ' tab-btn--unused' : ''}`}
                        >
                            {unused ? '(未使用) ' : ''}{getTabLabel(operation, index)}
                        </button>
                    )
                })}
            </div>
            {/* タブに接続するフォーム本体: tab-form-body クラスで上端ボーダーとz-indexを設定 */}
            <div className="tab-form-body">
            <div className="form-row">
                <label>運用開始駅</label>
                {/* 駅リストから選択し、選択駅の 0-based インデックスを startStationInd に設定する */}
                <select
                    onChange={(e) => formUpdated(e, 'startStationInd')}
                    value={setting.operationList[operationInd].startStationInd}
                >
                    {setting.stationList.map((station, i) => (
                        <option key={i} value={String(i)}>
                            [{i}] - {station.name || '駅名未定義'}
                        </option>
                    ))}
                </select>
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
                <ToggleSwitch checked={setting.operationList[operationInd].isDispTime} onChange={(v) => toggleUpdated(v, 'isDispTime')} />
            </div>
            <div className="form-row">
                <label>路線名表示</label>
                <ToggleSwitch checked={setting.operationList[operationInd].isDispLineName} onChange={(v) => toggleUpdated(v, 'isDispLineName')} />
            </div>
            <div className="form-row">
                <label>次停車駅表示</label>
                <ToggleSwitch checked={setting.operationList[operationInd].isDrawStopText} onChange={(v) => toggleUpdated(v, 'isDrawStopText')} />
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
                <ToggleSwitch checked={setting.operationList[operationInd].isDrawLine} onChange={(v) => toggleUpdated(v, 'isDrawLine')} />
            </div>
            </div>{/* /tab-form-body */}
        </div>
    )
}

export default OperationForm