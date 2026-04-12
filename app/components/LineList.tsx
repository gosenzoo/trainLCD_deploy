"use client"

import React, { useState } from 'react'
import "../type"
import kanaToAlphabet from '../modules/KanaConverter'
import GenericItemList, { ColumnDef } from './GenericItemList'

import {loadPresetNumIconTexts} from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

type lineListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const LineList: React.FC<lineListProps> = ({ setting, setSetting }) => {
    const [selectedIndexes, setSelectedIndexes] = useState<string[]>([])

    const presetIconDict = loadPresetNumIconTexts()

    // lineDict のキー（文字列）をそのまま選択キーとして使用するため変換不要
    const handleRowClick = (key: string) => {
        setSelectedIndexes([key])
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

    // 路線一覧テーブルのカラム定義
    const lineColumns: ColumnDef<lineType>[] = [
        {
            header: 'ID',
            isSelector: true,  // クリックで行選択
            cell: (_, key) => key,
        },
        {
            header: '路線記号',
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
                <button onClick={addLine} className="btn-primary">路線追加</button>
                <button onClick={deleteLine} className="btn-danger">路線削除</button>
            </div>
            <div className="form-row">
                <label>路線記号</label>
                <input type="text" id="lineIconKeyInput" onChange={(e) => formUpdated(e, 'lineIconKey')}
                    value={selectedLine?.lineIconKey ?? ''}
                />
            </div>
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
