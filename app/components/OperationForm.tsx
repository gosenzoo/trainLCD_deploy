"use client"

import React, { useState } from "react"
import "../type"
import initObjects from "../initSettingObject"
import { numberIndexes } from "../modules/presetIndex"
import ToggleSwitch from './ToggleSwitch'

type operationFormType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

// operationDictのエントリからタブラベルを生成する: "[id]: [trainType] [direction] [destination]行"
const getTabLabel = (id: string, operation: operationType): string => {
    const parts: string[] = [id + ':']
    if (operation.trainType) parts.push(operation.trainType)
    if (operation.direction) parts.push(operation.direction)
    parts.push((operation.destination || '行先未設定') + '行')
    return parts.join(' ')
}

const OperationForm: React.FC<operationFormType> = ({setting, setSetting}) => {
    // 選択中の運用IDキー（辞書のキー文字列）
    const [selectedKey, setSelectedKey] = useState<string>('0')
    // 全運用一括適用フラグ
    const [isAll, setIsAll] = useState<boolean>(false)

    const dict = setting.operationDict ?? {}
    const keys = Object.keys(dict).sort((a, b) => Number(a) - Number(b))

    // 選択中キーが辞書にない場合は最初のキーへフォールバック
    const effectiveKey = dict[selectedKey] !== undefined ? selectedKey : (keys[0] ?? '')
    const operation = dict[effectiveKey]

    const formUpdated = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: operationMembers) => {
        const _setting: settingType = structuredClone(setting)
        if (isAll) {
            Object.values(_setting.operationDict).forEach(op => { op[field] = e.target.value as never })
        } else if (effectiveKey && _setting.operationDict[effectiveKey]) {
            _setting.operationDict[effectiveKey][field] = e.target.value as never
        }
        setSetting(_setting)
    }

    // トグルスイッチ用ハンドラ（boolean 値を直接受け取る）
    const toggleUpdated = (checked: boolean, field: operationMembers) => {
        const _setting: settingType = structuredClone(setting)
        if (isAll) {
            Object.values(_setting.operationDict).forEach(op => { op[field] = checked as never })
        } else if (effectiveKey && _setting.operationDict[effectiveKey]) {
            _setting.operationDict[effectiveKey][field] = checked as never
        }
        setSetting(_setting)
    }

    // 運用を追加する: キー最大値+1 を新キーとして空の運用エントリを追加する
    const addOperation = () => {
        const _setting: settingType = structuredClone(setting)
        const existingKeys = Object.keys(_setting.operationDict)
        const newKey = existingKeys.length > 0
            ? String(Math.max(...existingKeys.map(Number)) + 1)
            : '0'
        _setting.operationDict[newKey] = structuredClone(initObjects.operation)
        setSetting(_setting)
        setSelectedKey(newKey)
    }

    // 表示中の運用を削除する: 前のキーを選択状態に戻す（なければ最初のキー）
    const deleteOperation = () => {
        if (!effectiveKey) return
        const _setting: settingType = structuredClone(setting)
        delete _setting.operationDict[effectiveKey]
        const remainingKeys = Object.keys(_setting.operationDict).sort((a, b) => Number(a) - Number(b))
        if (remainingKeys.length === 0) {
            // 空になった場合は初期運用を再追加する
            _setting.operationDict['0'] = structuredClone(initObjects.operation)
            setSelectedKey('0')
        } else {
            const prevIdx = keys.indexOf(effectiveKey) - 1
            setSelectedKey(prevIdx >= 0 ? keys[prevIdx] : remainingKeys[0])
        }
        setSetting(_setting)
    }

    return (
        <div>
            <div className="form-row">
                {/* 全運用一括適用トグルボタン */}
                <button
                    onClick={() => setIsAll(v => !v)}
                    className={`btn-toggle${isAll ? ' btn-toggle--active' : ''}`}
                >すべての運用に適用</button>
            </div>
            <div className="btn-group">
                <button onClick={addOperation}>運用を追加</button>
                <button onClick={deleteOperation} className="btn-danger">表示中を削除</button>
            </div>
            {/* 運用選択タブ行: operation-tabs クラスで下揃え・フォームと接続するスタイルを適用 */}
            <div className="operation-tabs">
                {keys.map(key => (
                    <button
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        className={`tab-btn${key === effectiveKey ? ' active' : ''}`}
                    >
                        {getTabLabel(key, dict[key])}
                    </button>
                ))}
            </div>
            {/* タブに接続するフォーム本体: tab-form-body クラスで上端ボーダーとz-indexを設定 */}
            <div className="tab-form-body">
            {operation && (<>
            <fieldset>
            <legend>表示</legend>
            <div className="form-row">
                <label>進行方向</label>
                <select onChange={(e) => formUpdated(e, 'leftOrRight')} value={operation.leftOrRight}>
                    <option value="right">右</option>
                    <option value="left">左</option>
                </select>
            </div>
            <div className="form-row">
                <label>所要時間表示</label>
                <ToggleSwitch checked={operation.isDispTime} onChange={(v) => toggleUpdated(v, 'isDispTime')} />
            </div>
            <div className="form-row">
                <label>路線名表示</label>
                <ToggleSwitch checked={operation.isDispLineName} onChange={(v) => toggleUpdated(v, 'isDispLineName')} />
            </div>
            <div className="form-row">
                <label>次停車駅表示</label>
                <ToggleSwitch checked={operation.isDrawStopText} onChange={(v) => toggleUpdated(v, 'isDrawStopText')} />
            </div>
            </fieldset>
            <fieldset>
            <legend>行先</legend>
            <div className="form-row">
                <label>行き先</label>
                <input type="text" onChange={(e) => formUpdated(e, 'destination')} value={operation.destination} />
            </div>
            <div className="form-row">
                <label>行き先かな</label>
                <input type="text" onChange={(e) => formUpdated(e, 'destinationKana')} value={operation.destinationKana} />
            </div>
            <div className="form-row">
                <label>行き先(英語)</label>
                <input type="text" onChange={(e) => formUpdated(e, 'destinationEng')} value={operation.destinationEng} />
            </div>
            <div className="form-row">
                <label>行き先ナンバリング</label>
                <input type="text" onChange={(e) => formUpdated(e, 'destinationNum')} value={operation.destinationNum} />
            </div>
            <div className="form-row">
                <label>行き先色</label>
                <input type="color" onChange={(e) => formUpdated(e, 'destinationColor')} value={operation.destinationColor} />
            </div>
            <div className="form-row">
                <label>行先ナンバリング記号</label>
                <select onChange={(e) => formUpdated(e, 'destinationNumIconKey')} value={operation.destinationNumIconKey}>
                    {numberIndexes.map(num => (
                        <option key={num.key} value={num.key}>{num.name}</option>
                    ))}
                </select>
            </div>
            <div className="form-row">
                <label>経由等</label>
                <input type="text" onChange={(e) => formUpdated(e, 'direction')} value={operation.direction} />
            </div>
            </fieldset>
            <fieldset>
            <legend>種別</legend>
            <div className="form-row">
                <label>種別</label>
                <input type="text" onChange={(e) => formUpdated(e, 'trainType')} value={operation.trainType} />
            </div>
            <div className="form-row">
                <label>種別(英語)</label>
                <input type="text" onChange={(e) => formUpdated(e, 'trainTypeEng')} value={operation.trainTypeEng} />
            </div>
            <div className="form-row">
                <label>種別補足</label>
                <input type="text" onChange={(e) => formUpdated(e, 'trainTypeSub')} value={operation.trainTypeSub} />
            </div>
            <div className="form-row">
                <label>種別補足(英語)</label>
                <input type="text" onChange={(e) => formUpdated(e, 'trainTypeSubEng')} value={operation.trainTypeSubEng} />
            </div>
            <div className="form-row">
                <label>種別文字色</label>
                <input type="color" onChange={(e) => formUpdated(e, 'trainTypeColor')} value={operation.trainTypeColor} />
            </div>
            <div className="form-row">
                <label>種別背景色</label>
                <input type="color" onChange={(e) => formUpdated(e, 'trainTypeBackColor')} value={operation.trainTypeBackColor || '#000000'} />
            </div>
            </fieldset>
            <div className="form-row">
                <label>列車路線記号</label>
                <input type="text" onChange={(e) => formUpdated(e, 'lineLogo')} value={operation.lineLogo} />
            </div>
            <div className="form-row">
                <label>列車路線記号（色）</label>
                <input type="color" onChange={(e) => formUpdated(e, 'lineColor')} value={operation.lineColor} />
            </div>
            <div className="form-row">
                <label>号車</label>
                <input type="text" onChange={(e) => formUpdated(e, 'carNumber')} value={operation.carNumber} />
            </div>
            <div className="form-row">
                <label>全体号車</label>
                <input id="carNumberListInput" type="text" onChange={(e) => formUpdated(e, 'carNumberList')} value={operation.carNumberList} />
                <button onClick={() => {
                    const input = document.getElementById("carNumberListInput") as HTMLInputElement
                    const arr = input.value.split(",")
                    arr.reverse()
                    input.value = arr.join(",")
                    const _setting: settingType = structuredClone(setting)
                    if (_setting.operationDict[effectiveKey]) _setting.operationDict[effectiveKey].carNumberList = input.value
                    setSetting(_setting)
                }}>反転</button>
            </div>
            <div className="form-row">
                <label>全体号車連番入力</label>
                <input id="sequenceCarTextInput" type="text" />
                <button onClick={() => {
                    const seqInput = document.getElementById("sequenceCarTextInput") as HTMLInputElement
                    const listInput = document.getElementById("carNumberListInput") as HTMLInputElement
                    const maxNum = parseInt(seqInput.value)
                    let str = ""
                    for (let i = 1; i <= maxNum; i++) {
                        str += i.toString()
                        if (i.toString() === operation.carNumber) str += "*"
                        if (i !== maxNum) str += ","
                    }
                    listInput.value = str
                    const _setting: settingType = structuredClone(setting)
                    if (_setting.operationDict[effectiveKey]) _setting.operationDict[effectiveKey].carNumberList = str
                    setSetting(_setting)
                }}>入力</button>
            </div>
            <div className="form-row">
                <label>前方オフセット</label>
                <input type="number" onChange={(e) => formUpdated(e, 'headOffset')} value={operation.headOffset} />
            </div>
            <div className="form-row">
                <label>後方オフセット</label>
                <input type="number" onChange={(e) => formUpdated(e, 'backOffset')} value={operation.backOffset} />
            </div>
            <div className="form-row">
                <label>列車ライン色</label>
                <input type="color" onChange={(e) => formUpdated(e, 'carLineColor')} value={operation.carLineColor} />
            </div>
            <div className="form-row">
                <label>列車にラインを描画するか</label>
                <ToggleSwitch checked={operation.isDrawLine} onChange={(v) => toggleUpdated(v, 'isDrawLine')} />
            </div>
            </>)}
            </div>{/* /tab-form-body */}
        </div>
    )
}

export default OperationForm
