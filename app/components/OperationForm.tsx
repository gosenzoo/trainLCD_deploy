"use client"

import React, { useState } from "react"
import "../type"
import initObjects from "../initSettingObject"
import { numberIndexes } from "../modules/presetIndex"
import { getOperationLabel } from "../modules/resolveDestination"
import OperationFields from './OperationFields'

type operationFormType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
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

    // 項目の値の変更（入力欄・セレクトは文字列、トグルスイッチは boolean）。「すべての運用に適用」なら全運用に反映する
    const valueUpdated = (field: operationMembers, value: string | boolean) => {
        const _setting: settingType = structuredClone(setting)
        if (isAll) {
            Object.values(_setting.operationDict).forEach(op => { op[field] = value as never })
        } else if (effectiveKey && _setting.operationDict[effectiveKey]) {
            _setting.operationDict[effectiveKey][field] = value as never
        }
        setSetting(_setting)
    }

    // 全体号車の「反転」「入力」は、表示中の運用だけに反映する（従来どおり）
    const carNumberListUpdated = (value: string) => {
        const _setting: settingType = structuredClone(setting)
        if (_setting.operationDict[effectiveKey]) _setting.operationDict[effectiveKey].carNumberList = value
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
                        {/* タブラベル「運用[id]: [行先自動][種別] [行先]行」（7.49節） */}
                        {getOperationLabel(key, dict[key], setting.stationList ?? [])}
                    </button>
                ))}
            </div>
            {/* タブに接続するフォーム本体: tab-form-body クラスで上端ボーダーとz-indexを設定 */}
            <div className="tab-form-body">
            {operation && (<>
            <OperationFields
                operation={operation}
                onValue={valueUpdated}
                onCarNumberListChange={carNumberListUpdated}
            />
            </>)}
            </div>{/* /tab-form-body */}
        </div>
    )
}

export default OperationForm
