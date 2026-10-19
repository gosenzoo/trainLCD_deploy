"use client"

import React, { useState } from "react"
import "../type"
import { numberIndexes } from "../modules/presetIndex"
import ToggleSwitch from './ToggleSwitch'

type operationFieldsType = {
    operation: operationType,
    // 項目の値を変えたとき（文字列の入力欄・セレクト、トグルスイッチの boolean）
    onValue: (field: operationMembers, value: string | boolean) => void,
    // 全体号車の「反転」「入力」ボタンで号車リストを作ったとき
    onCarNumberListChange: (value: string) => void,
}

// 運用の設定項目（表示・行先・種別・列車・表示タイプ）。
// 運用設定（OperationForm）と、区間の運用設定から開く運用追加ポップアップ（OperationAddPopup）で共通に使う（7.61節）
const OperationFields: React.FC<operationFieldsType> = ({ operation, onValue, onCarNumberListChange }) => {
    // 全体号車連番入力の入力欄
    const [sequenceText, setSequenceText] = useState<string>('')

    return (
        <>
            <fieldset>
            <legend>表示</legend>
            <div className="form-row">
                <label>進行方向</label>
                <select onChange={(e) => onValue('leftOrRight', e.target.value)} value={operation.leftOrRight}>
                    <option value="right">右</option>
                    <option value="left">左</option>
                </select>
            </div>
            <div className="form-row">
                <label>所要時間表示</label>
                <ToggleSwitch checked={operation.isDispTime} onChange={(v) => onValue('isDispTime', v)} />
            </div>
            <div className="form-row">
                <label>路線名表示</label>
                <ToggleSwitch checked={operation.isDispLineName} onChange={(v) => onValue('isDispLineName', v)} />
            </div>
            <div className="form-row">
                <label>次停車駅表示</label>
                <ToggleSwitch checked={operation.isDrawStopText} onChange={(v) => onValue('isDrawStopText', v)} />
            </div>
            </fieldset>
            <fieldset>
            <legend>行先</legend>
            {/* オンのときは末尾停車駅を行先にし、下の6項目をグレーアウトする（7.49節）。経由等は対象外 */}
            <div className="form-row">
                <label>行先を自動で設定する</label>
                <ToggleSwitch checked={operation.isAutoDestination} onChange={(v) => onValue('isAutoDestination', v)} />
            </div>
            <div className={operation.isAutoDestination ? 'form-disabled' : ''}>
            <div className="form-row">
                <label>行き先</label>
                <input type="text" onChange={(e) => onValue('destination', e.target.value)} value={operation.destination} />
            </div>
            <div className="form-row">
                <label>行き先かな</label>
                <input type="text" onChange={(e) => onValue('destinationKana', e.target.value)} value={operation.destinationKana} />
            </div>
            <div className="form-row">
                <label>行き先(英語)</label>
                <input type="text" onChange={(e) => onValue('destinationEng', e.target.value)} value={operation.destinationEng} />
            </div>
            <div className="form-row">
                <label>行き先ナンバリング</label>
                <input type="text" onChange={(e) => onValue('destinationNum', e.target.value)} value={operation.destinationNum} />
            </div>
            <div className="form-row">
                <label>行き先色</label>
                <input type="color" onChange={(e) => onValue('destinationColor', e.target.value)} value={operation.destinationColor} />
            </div>
            <div className="form-row">
                <label>行先ナンバリング記号</label>
                <select onChange={(e) => onValue('destinationNumIconKey', e.target.value)} value={operation.destinationNumIconKey}>
                    {numberIndexes.map(num => (
                        <option key={num.key} value={num.key}>{num.name}</option>
                    ))}
                </select>
            </div>
            </div>{/* /行先の自動設定でグレーアウトする範囲 */}
            <div className="form-row">
                <label>経由等</label>
                <input type="text" onChange={(e) => onValue('direction', e.target.value)} value={operation.direction} />
            </div>
            </fieldset>
            <fieldset>
            <legend>種別</legend>
            <div className="form-row">
                <label>種別</label>
                <input type="text" onChange={(e) => onValue('trainType', e.target.value)} value={operation.trainType} />
            </div>
            <div className="form-row">
                <label>種別(英語)</label>
                <input type="text" onChange={(e) => onValue('trainTypeEng', e.target.value)} value={operation.trainTypeEng} />
            </div>
            {/* 種別の中国語・韓国語（7.54節） */}
            <div className="form-row">
                <label>種別(中国語)</label>
                <input type="text" onChange={(e) => onValue('trainTypeZh', e.target.value)} value={operation.trainTypeZh ?? ''} />
            </div>
            <div className="form-row">
                <label>種別(韓国語)</label>
                <input type="text" onChange={(e) => onValue('trainTypeKo', e.target.value)} value={operation.trainTypeKo ?? ''} />
            </div>
            <div className="form-row">
                <label>種別補足</label>
                <input type="text" onChange={(e) => onValue('trainTypeSub', e.target.value)} value={operation.trainTypeSub} />
            </div>
            <div className="form-row">
                <label>種別補足(英語)</label>
                <input type="text" onChange={(e) => onValue('trainTypeSubEng', e.target.value)} value={operation.trainTypeSubEng} />
            </div>
            <div className="form-row">
                <label>種別文字色</label>
                <input type="color" onChange={(e) => onValue('trainTypeColor', e.target.value)} value={operation.trainTypeColor} />
            </div>
            <div className="form-row">
                <label>種別背景色</label>
                <input type="color" onChange={(e) => onValue('trainTypeBackColor', e.target.value)} value={operation.trainTypeBackColor || '#000000'} />
            </div>
            </fieldset>
            {/* 列車路線記号～列車ラインの描画を「列車」欄にまとめる（7.52節） */}
            <fieldset>
            <legend>列車</legend>
            <div className="form-row">
                <label>列車路線記号</label>
                <input type="text" onChange={(e) => onValue('lineLogo', e.target.value)} value={operation.lineLogo} />
            </div>
            <div className="form-row">
                <label>列車路線記号（色）</label>
                <input type="color" onChange={(e) => onValue('lineColor', e.target.value)} value={operation.lineColor} />
            </div>
            <div className="form-row">
                <label>号車</label>
                <input type="text" onChange={(e) => onValue('carNumber', e.target.value)} value={operation.carNumber} />
            </div>
            <div className="form-row">
                <label>全体号車</label>
                <input type="text" onChange={(e) => onValue('carNumberList', e.target.value)} value={operation.carNumberList} />
                <button onClick={() => onCarNumberListChange(operation.carNumberList.split(",").reverse().join(","))}>反転</button>
            </div>
            <div className="form-row">
                <label>全体号車連番入力</label>
                <input type="text" value={sequenceText} onChange={(e) => setSequenceText(e.target.value)} />
                <button onClick={() => {
                    // 1〜入力した数までの号車リストを作る（現在の号車には * を付ける）
                    const maxNum = parseInt(sequenceText)
                    let str = ""
                    for (let i = 1; i <= maxNum; i++) {
                        str += i.toString()
                        if (i.toString() === operation.carNumber) str += "*"
                        if (i !== maxNum) str += ","
                    }
                    onCarNumberListChange(str)
                }}>入力</button>
            </div>
            <div className="form-row">
                <label>前方オフセット</label>
                <input type="number" onChange={(e) => onValue('headOffset', e.target.value)} value={operation.headOffset} />
            </div>
            <div className="form-row">
                <label>後方オフセット</label>
                <input type="number" onChange={(e) => onValue('backOffset', e.target.value)} value={operation.backOffset} />
            </div>
            <div className="form-row">
                <label>列車ライン色</label>
                <input type="color" onChange={(e) => onValue('carLineColor', e.target.value)} value={operation.carLineColor} />
            </div>
            <div className="form-row">
                <label>列車にラインを描画するか</label>
                <ToggleSwitch checked={operation.isDrawLine} onChange={(v) => onValue('isDrawLine', v)} />
            </div>
            </fieldset>
            {/* 画面レイアウトの表示タイプ（7.52節）。運用ごとに設定する */}
            <div className="form-row">
                <label>表示タイプ</label>
                <select onChange={(e) => onValue('displayType', e.target.value)} value={operation.displayType || 'tokyu'}>
                    <option value="tokyu">東急</option>
                </select>
            </div>
        </>
    )
}

export default OperationFields
