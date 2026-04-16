"use client"

import React, { useState } from 'react'
import "../type"
import kanaToAlphabet from '../modules/KanaConverter'
import GenericItemList, { ColumnDef } from './GenericItemList'

import {loadPresetNumIconTexts} from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { moveDictItemsUp, moveDictItemsDown } from '../modules/listOperations'
import IconNewPopup from './IconNewPopup'
import IconListPopup from './IconListPopup'
import { IconArrowUp, IconArrowDown, IconPlus, IconTrash } from './SvgIcons'

type lineListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const LineList: React.FC<lineListProps> = ({ setting, setSetting }) => {
    const [selectedIndexes, setSelectedIndexes] = useState<string[]>([])
    const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false)
    // 路線記号ポップアップの表示モード（null: 非表示 / 'new': 新規追加 / 'list': リストから選択）
    const [iconPickerMode, setIconPickerMode] = useState<'new' | 'list' | null>(null)

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

    // アイコンが決定されたとき、選択中路線の lineIconKey に設定する
    const handleIconSelect = (key: string) => {
        setSetting(prev => {
            const _setting = structuredClone(prev)
            selectedIndexes.forEach(lineKey => {
                if (_setting.lineDict[lineKey]) _setting.lineDict[lineKey].lineIconKey = key
            })
            return _setting
        })
        setIconPickerMode(null)
    }

    // 編集フォームに表示する対象：選択中の最後の行
    const lastSelected = selectedIndexes[selectedIndexes.length - 1]
    const selectedLine = setting && lastSelected ? setting.lineDict[lastSelected] : undefined

    return(
        <div>
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
                {/* 上矢印・下矢印・追加(+)・削除(ゴミ箱) をSVGアイコンで表示 */}
                <button onClick={moveUp} className="btn-icon" title="上に移動"><IconArrowUp/></button>
                <button onClick={moveDown} className="btn-icon" title="下に移動"><IconArrowDown/></button>
                <button onClick={addLine} className="btn-icon btn-primary" title="路線追加"><IconPlus/></button>
                <button onClick={deleteLine} className="btn-icon btn-danger" title="路線削除"><IconTrash/></button>
                {/* 複数選択トグルボタン */}
                <button
                    onClick={() => setIsMultiSelect(v => !v)}
                    className={`btn-toggle${isMultiSelect ? ' btn-toggle--active' : ''}`}
                >複数選択</button>
            </div>
            <div className="form-row">
                <label>路線記号</label>
                {/* テキストボックスの代わりに現在設定中のアイコンをプレビュー表示する */}
                {(() => {
                    const iconKey = selectedLine?.lineIconKey ?? ''
                    const iconParams = iconKey ? setting.iconDict[iconKey] : undefined
                    if (typeof iconParams === 'string') {
                        return iconParams
                            ? <img src={iconParams} alt={iconKey} width="30px" height="30px" />
                            : <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                    } else if (iconParams) {
                        const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                        return html
                            ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} />
                            : <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                    }
                    return <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                })()}
                {/* 新規追加ポップアップ / リストから選択ポップアップを開くボタン */}
                <button onClick={() => setIconPickerMode('new')}>新規追加</button>
                <button onClick={() => setIconPickerMode('list')}>リストから選択</button>
            </div>

            {/* アイコン新規追加ポップアップ */}
            {iconPickerMode === 'new' && (
                <IconNewPopup
                    setting={setting}
                    setSetting={setSetting}
                    onSelect={handleIconSelect}
                    onClose={() => setIconPickerMode(null)}
                />
            )}
            {/* アイコンをリストから選択ポップアップ */}
            {iconPickerMode === 'list' && (
                <IconListPopup
                    setting={setting}
                    onSelect={handleIconSelect}
                    onClose={() => setIconPickerMode(null)}
                />
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
