"use client"

import React, { useState } from 'react'
import "../type"
import kanaToAlphabet from '../modules/KanaConverter'
import { loadIconPresetTexts } from '../modules/loadIconPresetTexts'
import { numberIndexes } from '../modules/presetIndex'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import IconNewPopup from './IconNewPopup'
import IconListPopup from './IconListPopup'

type Props = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    // 追加確定時に路線データを親へ渡すコールバック（lineDict への書き込みは親が行う）
    onAdd: (line: lineType) => void,
    onClose: () => void,
}

const LineAddPopup: React.FC<Props> = ({ setting, setSetting, onAdd, onClose }) => {
    const [lineIconKey, setLineIconKey] = useState<string>('')
    const [name, setName] = useState<string>('')
    const [kana, setKana] = useState<string>('')
    const [eng, setEng] = useState<string>('')
    const [symbol, setSymbol] = useState<string>('')
    const [color, setColor] = useState<string>('')
    const [numIconPresetKey, setNumIconPresetKey] = useState<string>('')
    // アイコンピッカーのモード（null: 非表示 / 'new': 新規追加 / 'list': リストから選択）
    const [iconPickerMode, setIconPickerMode] = useState<'new' | 'list' | null>(null)

    const presetIconDict = loadIconPresetTexts()

    const handleIconSelect = (key: string) => {
        setLineIconKey(key)
        setIconPickerMode(null)
    }

    // かな入力時に英語名を自動生成する
    const handleKanaChange = (value: string) => {
        setKana(value)
        setEng(kanaToAlphabet(value, 1))
    }

    const handleAdd = () => {
        onAdd({ lineIconKey, name, kana, eng, color, symbol, numIconPresetKey })
    }

    // 現在設定中のアイコンをプレビュー表示する
    const iconParams = lineIconKey ? setting.iconDict[lineIconKey] : undefined

    return (
        <>
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                    <div className="modal-title-row">
                        <p className="modal-title">路線追加</p>
                        <button className="modal-close-btn" onClick={onClose} title="閉じる">×</button>
                    </div>
                    <div className="form-row">
                        <label>路線記号</label>
                        {/* アイコンプレビュー（LineList の表示と同一ロジック） */}
                        {(() => {
                            if (typeof iconParams === 'string') {
                                return iconParams
                                    ? <img src={iconParams} alt={lineIconKey} width="30px" height="30px" />
                                    : <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                            } else if (iconParams) {
                                const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                                return html
                                    ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} />
                                    : <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                            }
                            return <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                        })()}
                        <button onClick={() => setIconPickerMode('new')}>新規追加</button>
                        <button onClick={() => setIconPickerMode('list')}>リストから選択</button>
                    </div>
                    <div className="form-row">
                        <label>路線名</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="form-row">
                        <label>路線名かな</label>
                        <input type="text" value={kana} onChange={e => handleKanaChange(e.target.value)} />
                    </div>
                    <div className="form-row">
                        <label>路線名英語</label>
                        <input type="text" value={eng} onChange={e => setEng(e.target.value)} />
                    </div>
                    <div className="form-row">
                        <label>路線記号</label>
                        <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} />
                    </div>
                    <div className="form-row">
                        <label>路線カラー</label>
                        <input type="color" value={color || '#000000'} onChange={e => setColor(e.target.value)} />
                    </div>
                    <div className="form-row">
                        <label>ナンバリング記号</label>
                        <select value={numIconPresetKey} onChange={e => setNumIconPresetKey(e.target.value)}>
                            <option value="">（なし）</option>
                            {numberIndexes.map(num => (
                                <option key={num.key} value={num.key}>{num.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button className="btn-primary" onClick={handleAdd}>追加</button>
                        <button onClick={onClose}>閉じる</button>
                    </div>
                </div>
            </div>
            {/* アイコンピッカーは入れ子モーダルを避けるため modal-backdrop の外に描画する */}
            {iconPickerMode === 'new' && (
                <IconNewPopup
                    setting={setting}
                    setSetting={setSetting}
                    onSelect={handleIconSelect}
                    onClose={() => setIconPickerMode(null)}
                />
            )}
            {iconPickerMode === 'list' && (
                <IconListPopup
                    setting={setting}
                    onSelect={handleIconSelect}
                    onClose={() => setIconPickerMode(null)}
                />
            )}
        </>
    )
}

export default LineAddPopup
