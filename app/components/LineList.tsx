"use client"

import React, { useState } from 'react'
import "../type"
import kanaToAlphabet from '../modules/KanaConverter'
import GenericItemList, { ColumnDef } from './GenericItemList'

import {loadPresetNumIconTexts} from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { moveDictItemsUp, moveDictItemsDown } from '../modules/listOperations'

type lineListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const LineList: React.FC<lineListProps> = ({ setting, setSetting }) => {
    const [selectedIndexes, setSelectedIndexes] = useState<string[]>([])
    const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false)
    // 路線記号追加ポップアップの表示フラグと選択中アイコンキー
    const [isIconPickerOpen, setIsIconPickerOpen] = useState<boolean>(false)
    const [iconPickerSelectedKey, setIconPickerSelectedKey] = useState<string>('')

    const presetIconDict = loadPresetNumIconTexts()

    // lineDict のキー（文字列）をそのまま選択キーとして使用するため変換不要
    const handleRowClick = (key: string) => {
        if (!isMultiSelect) {
            setSelectedIndexes([key])
        } else {
            // 複数選択モード: クリックでトグル
            setSelectedIndexes(prev =>
                prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
            )
        }
    }

    // lineDict は数値キー順で表示するため、上下移動も数値昇順を基準にする
    const getOrderedKeys = () =>
        Object.keys(setting.lineDict).sort((a, b) => Number(a) - Number(b))

    const moveUp = () => {
        if (selectedIndexes.length === 0) return
        const _setting = structuredClone(setting)
        const { newDict, swapped, newSelected } = moveDictItemsUp(_setting.lineDict, getOrderedKeys(), selectedIndexes)
        _setting.lineDict = newDict
        // stationList の lineId 参照を交換されたキーペアで更新する
        swapped.forEach(([keyA, keyB]) => {
            _setting.stationList.forEach(station => {
                if (station.lineId === keyA) station.lineId = keyB
                else if (station.lineId === keyB) station.lineId = keyA
            })
        })
        setSetting(_setting)
        setSelectedIndexes(newSelected)
    }

    const moveDown = () => {
        if (selectedIndexes.length === 0) return
        const _setting = structuredClone(setting)
        const { newDict, swapped, newSelected } = moveDictItemsDown(_setting.lineDict, getOrderedKeys(), selectedIndexes)
        _setting.lineDict = newDict
        swapped.forEach(([keyA, keyB]) => {
            _setting.stationList.forEach(station => {
                if (station.lineId === keyA) station.lineId = keyB
                else if (station.lineId === keyB) station.lineId = keyA
            })
        })
        setSetting(_setting)
        setSelectedIndexes(newSelected)
    }

    const addLine = () => {
        if(!setting.lineDict) return
        const _setting: settingType = structuredClone(setting)
        let _index = 0
        if(Object.keys(_setting.lineDict).length > 0){
            // 既存キーの最大値 + 1 を新しい ID にする
            _index = Math.max(...Object.keys(_setting.lineDict).map(Number)) + 1
        }
        _setting.lineDict[_index] = {
            lineIconKey: "",
            name: "",
            kana: "",
            eng: "",
            color: ""
        }
        setSetting(_setting)
    }

    const deleteLine = () => {
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(key => { delete _setting.lineDict[key] })
        setSelectedIndexes([])
        setSetting(_setting)
    }

    const formUpdated = (e:any, field: lineMembers) => {
        if(!setting) return
        const _setting: settingType = structuredClone(setting)
        selectedIndexes.forEach(key => {
            if(!_setting.lineDict[key]) return
            if(!(field in _setting.lineDict[key])) return
            _setting.lineDict[key][field] = e.target.value
            if(field === "kana"){
                _setting.lineDict[key].eng = kanaToAlphabet(e.target.value, 1)
            }
        })
        setSetting(_setting)
    }

    // 路線一覧テーブルのカラム定義（ID列は非表示・路線記号列でクリック選択）
    const lineColumns: ColumnDef<lineType>[] = [
        {
            header: '路線記号',
            isSelector: true,  // クリックで行選択
            // iconDict から lineIconKey に対応するアイコンを描画する
            cell: (line) => {
                const iconParams = setting.iconDict[line.lineIconKey]
                if (typeof iconParams === 'string') {
                    return iconParams ? <img src={iconParams} alt="" width="30px" height="30px" /> : null
                } else if (iconParams) {
                    const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                    return html ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                }
                return null
            },
        },
        {
            header: '路線名',
            cell: (line) => line.name,
        },
        {
            header: '路線名かな',
            cell: (line) => line.kana,
        },
        {
            header: '路線名英語',
            cell: (line) => line.eng,
        },
        {
            header: '路線カラー',
            cell: () => null,
            cellStyle: (line) => ({ backgroundColor: line.color }),  // 路線カラーをセル背景で表示
        },
    ]

    // 路線記号追加ポップアップのアイコン一覧カラム定義
    const iconPickerColumns: ColumnDef<string | iconParamsType>[] = [
        {
            header: 'ID',
            isSelector: true,
            cell: (_, key) => key,
        },
        {
            header: 'アイコン',
            // string なら <img>、iconParamsType なら SVG プリセットを描画する
            cell: (iconObj) => {
                if (typeof iconObj === 'string') {
                    return iconObj ? <img src={iconObj} alt="" width="30px" height="30px" /> : null
                } else if (iconObj) {
                    const html = createNumIconFromPreset(presetIconDict, iconObj.presetType, iconObj.symbol, '', iconObj.color)?.outerHTML
                    return html ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                }
                return null
            },
        },
    ]

    // 選択中のアイコンキーを選択中路線の lineIconKey にセットする
    const applyIconPicker = () => {
        if (!iconPickerSelectedKey) return
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(key => {
            if (_setting.lineDict[key]) _setting.lineDict[key].lineIconKey = iconPickerSelectedKey
        })
        setSetting(_setting)
        setIsIconPickerOpen(false)
        setIconPickerSelectedKey('')
    }

    // 編集フォームに表示する対象：選択中の最後の行
    const lastSelected = selectedIndexes[selectedIndexes.length - 1]
    const selectedLine = setting && lastSelected ? setting.lineDict[lastSelected] : undefined

    return(
        <div>
            <h2>路線登録</h2>
            {/* lineDict を { key, data } 配列に変換して渡す */}
            <GenericItemList
                columns={lineColumns}
                rows={Object.entries(setting.lineDict).map(([key, line]) => ({ key, data: line }))}
                selectedKeys={selectedIndexes}
                onRowClick={handleRowClick}
                tableId="linesTable"
                containerId="linesTableContainer"
            />
            <div className="btn-group" style={{marginTop: '10px'}}>
                <button onClick={moveUp}>上に移動</button>
                <button onClick={moveDown}>下に移動</button>
                <button onClick={addLine} className="btn-primary">路線追加</button>
                <button onClick={deleteLine} className="btn-danger">路線削除</button>
                {/* 複数選択トグルボタン */}
                <button
                    onClick={() => setIsMultiSelect(v => !v)}
                    className={`btn-toggle${isMultiSelect ? ' btn-toggle--active' : ''}`}
                >複数選択</button>
            </div>
            <div className="form-row">
                <label>路線記号</label>
                <input type="text" id="lineIconKeyInput" onChange={(e) => formUpdated(e, 'lineIconKey')}
                    value={selectedLine?.lineIconKey ?? ''}
                />
                {/* アイコン一覧から lineIconKey を選択するポップアップを開くボタン */}
                <button onClick={() => { setIconPickerSelectedKey(''); setIsIconPickerOpen(true) }}>
                    路線記号追加
                </button>
            </div>

            {/* 路線記号追加ポップアップ */}
            {isIconPickerOpen && (
                <div className="modal-backdrop" onClick={() => setIsIconPickerOpen(false)}>
                    <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                        <p className="modal-title">路線記号を選択</p>
                        <div className="modal-body">
                            <GenericItemList
                                columns={iconPickerColumns}
                                rows={Object.entries(setting.iconDict).map(([key, iconObj]) => ({ key, data: iconObj }))}
                                selectedKeys={iconPickerSelectedKey ? [iconPickerSelectedKey] : []}
                                onRowClick={key => setIconPickerSelectedKey(key)}
                                tableId="lineIconPickerTable"
                                containerId="lineIconPickerContainer"
                            />
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setIsIconPickerOpen(false)}>閉じる</button>
                            <button
                                onClick={applyIconPicker}
                                className="btn-primary"
                                disabled={!iconPickerSelectedKey}
                            >この記号を設定</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="form-row">
                <label>路線名</label>
                <input type="text" id="lineNameInput" onChange={(e) => formUpdated(e, 'name')}
                    value={selectedLine?.name ?? ''}
                />
            </div>
            <div className="form-row">
                <label>路線名かな</label>
                <input type="text" id="lineKanaInput" onChange={(e) => formUpdated(e, 'kana')}
                    value={selectedLine?.kana ?? ''}
                />
            </div>
            <div className="form-row">
                <label>路線名英語</label>
                <input type="text" id="lineEngInput" onChange={(e) => formUpdated(e, 'eng')}
                    value={selectedLine?.eng ?? ''}
                />
            </div>
            <div className="form-row">
                <label>路線カラー</label>
                <input type="color" id="lineColorInput" onChange={(e) => formUpdated(e, 'color')}
                    value={selectedLine?.color ?? ''}
                />
            </div>
        </div>
    )
}

export default LineList
