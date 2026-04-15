"use client"

import React, { useState } from 'react'
import "../type"
import { iconIndexes } from '../modules/presetIndex'
import GenericItemList, { ColumnDef } from './GenericItemList'
import { loadPresetNumIconTexts } from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

type LineIconPickerPopupProps = {
    setting: settingType
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
    // アイコン決定時のコールバック（追加/選択したアイコンのキーを渡す）
    onSelect: (key: string) => void
    // ポップアップを閉じるコールバック
    onClose: () => void
    // true のとき入れ子モーダル用 z-index クラスを使用する
    isNested?: boolean
}

// iconDict の既存数値キーから次のユニークなキーを生成する
function generateNewKey(iconDict: Record<string, string | iconParamsType>): string {
    const numericKeys = Object.keys(iconDict)
        .filter(k => k !== '' && !isNaN(Number(k)))
        .map(Number)
    return numericKeys.length > 0 ? String(Math.max(...numericKeys) + 1) : '0'
}

const LineIconPickerPopup: React.FC<LineIconPickerPopupProps> = ({
    setting, setSetting, onSelect, onClose, isNested = false
}) => {
    // メインタブ: 新規追加 / リストから選択
    const [mainTab, setMainTab] = useState<'new' | 'list'>('new')
    // 新規追加サブタブ: 設定で追加 / 画像で追加
    const [newTab, setNewTab] = useState<'preset' | 'image'>('preset')
    // 「設定で追加」タブの入力値
    const [presetType, setPresetType] = useState<string>(iconIndexes[0]?.key ?? '')
    const [presetSymbol, setPresetSymbol] = useState<string>('')
    const [presetColor, setPresetColor] = useState<string>('#000000')
    // 「画像で追加」タブの入力値（base64）
    const [imageData, setImageData] = useState<string>('')
    // 「リストから選択」タブの選択中キー
    const [listSelectedKey, setListSelectedKey] = useState<string>('')

    const presetIconDict = loadPresetNumIconTexts()

    // 「設定で追加」: iconParamsType を iconDict に追加し、親に選択結果を通知する
    const addPresetIcon = () => {
        const newKey = generateNewKey(setting.iconDict)
        setSetting(prev => {
            const _setting = structuredClone(prev)
            _setting.iconDict[newKey] = {
                presetType,
                symbol: presetSymbol,
                color: presetColor,
            } as iconParamsType
            return _setting
        })
        onSelect(newKey)
    }

    // 「画像で追加」: base64 画像を iconDict に追加し、親に選択結果を通知する
    const addImageIcon = () => {
        if (!imageData) return
        const newKey = generateNewKey(setting.iconDict)
        setSetting(prev => {
            const _setting = structuredClone(prev)
            _setting.iconDict[newKey] = imageData
            return _setting
        })
        onSelect(newKey)
    }

    // 「リストから選択」: 選択中のキーを親に通知する
    const selectFromList = () => {
        if (!listSelectedKey) return
        onSelect(listSelectedKey)
    }

    // リストのカラム定義（ID列 + アイコンプレビュー列）
    const listColumns: ColumnDef<string | iconParamsType>[] = [
        {
            header: 'ID',
            isSelector: true,
            cell: (_, key) => key,
        },
        {
            header: 'アイコン',
            cell: (iconObj) => {
                if (typeof iconObj === 'string') {
                    return iconObj ? <img src={iconObj} alt="" width="30px" height="30px" /> : null
                } else if (iconObj) {
                    const html = createNumIconFromPreset(presetIconDict, iconObj.presetType, iconObj.symbol, '', iconObj.color)?.outerHTML
                    return html
                        ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} />
                        : null
                }
                return null
            },
        },
    ]

    // 入れ子モーダルかどうかで z-index クラスを切り替える
    const backdropClass = isNested ? 'modal-backdrop-top' : 'modal-backdrop'

    return (
        <div className={backdropClass} onClick={onClose}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                <p className="modal-title">路線記号を選択</p>
                {/* メインタブ */}
                <div className="operation-tabs">
                    <button
                        onClick={() => setMainTab('new')}
                        className={`tab-btn${mainTab === 'new' ? ' active' : ''}`}
                    >新規追加</button>
                    <button
                        onClick={() => setMainTab('list')}
                        className={`tab-btn${mainTab === 'list' ? ' active' : ''}`}
                    >リストから選択</button>
                </div>
                <div className="tab-form-body">
                    {/* 新規追加タブ */}
                    {mainTab === 'new' && (
                        <div>
                            {/* サブタブ */}
                            <div className="operation-tabs">
                                <button
                                    onClick={() => setNewTab('preset')}
                                    className={`tab-btn${newTab === 'preset' ? ' active' : ''}`}
                                >設定で追加</button>
                                <button
                                    onClick={() => setNewTab('image')}
                                    className={`tab-btn${newTab === 'image' ? ' active' : ''}`}
                                >画像で追加</button>
                            </div>
                            <div className="tab-form-body">
                                {/* 設定で追加サブタブ */}
                                {newTab === 'preset' && (
                                    <div>
                                        <div className="form-row">
                                            <label>プリセットから登録</label>
                                            <select value={presetType} onChange={e => setPresetType(e.target.value)}>
                                                {iconIndexes.map(idx => (
                                                    <option key={idx.key} value={idx.key}>{idx.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-row">
                                            <label>アイコンの路線記号</label>
                                            <input
                                                type="text"
                                                value={presetSymbol}
                                                onChange={e => setPresetSymbol(e.target.value)}
                                                placeholder="例: TY"
                                            />
                                        </div>
                                        <div className="form-row">
                                            <label>路線カラー</label>
                                            <input type="color" value={presetColor} onChange={e => setPresetColor(e.target.value)} />
                                        </div>
                                        <div className="btn-group" style={{marginTop: '8px'}}>
                                            <button onClick={addPresetIcon} className="btn-primary">アイコン追加</button>
                                        </div>
                                    </div>
                                )}
                                {/* 画像で追加サブタブ */}
                                {newTab === 'image' && (
                                    <div>
                                        <div className="form-row">
                                            <label>画像アップロード</label>
                                            <input type="file" onChange={e => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    const reader = new FileReader()
                                                    reader.onloadend = () => {
                                                        if (typeof reader.result === 'string') setImageData(reader.result)
                                                    }
                                                    reader.readAsDataURL(file)
                                                }
                                            }} />
                                        </div>
                                        <div className="btn-group" style={{marginTop: '8px'}}>
                                            <button
                                                onClick={addImageIcon}
                                                className="btn-primary"
                                                disabled={!imageData}
                                            >アイコン追加</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {/* リストから選択タブ */}
                    {mainTab === 'list' && (
                        <div>
                            <GenericItemList
                                columns={listColumns}
                                rows={Object.entries(setting.iconDict).map(([key, iconObj]) => ({ key, data: iconObj }))}
                                selectedKeys={listSelectedKey ? [listSelectedKey] : []}
                                onRowClick={key => setListSelectedKey(key)}
                                tableId="lineIconPickerList"
                                containerId="lineIconPickerContainer"
                            />
                            <div className="btn-group" style={{marginTop: '8px'}}>
                                <button
                                    onClick={selectFromList}
                                    className="btn-primary"
                                    disabled={!listSelectedKey}
                                >アイコン追加</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={onClose}>閉じる</button>
                </div>
            </div>
        </div>
    )
}

export default LineIconPickerPopup
