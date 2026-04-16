"use client"

import React, { useState } from 'react'
import { presetIconMaker } from "../modules/presetIconMaker";
import "../type"
import { iconIndexes, numberIndexes } from "../modules/presetIndex"
import GenericItemList, { ColumnDef } from './GenericItemList'

import {loadPresetNumIconTexts} from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { moveDictItemsUp, moveDictItemsDown } from '../modules/listOperations'
import { IconArrowUp, IconArrowDown, IconTrash } from './SvgIcons'

type iconListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const IconList: React.FC<iconListProps> = ({ setting, setSetting }) => {
    const [selectedIndexes, setSelectedIndexes] = useState<string[]>([])
    const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false)
    const [newIconName, setNewIconName] = useState<string>("")
    const [newIconImage, setNewIconImage] = useState<string>("")
    const [iconPresetType, setIconPresetType] = useState<string>("I_tokyu")
    const [iconPresetSymbol, setIconPresetSymbol] = useState<string>("")
    const [iconPresetColor, setIconPresetColor] = useState<string>("")

    const presetIconDict = loadPresetNumIconTexts()

    const toBase64Utf8 = (str: string) => {
        return btoa(
            new TextEncoder().encode(str)
            .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
        );
    }

    // iconDict のキー（文字列）をそのまま選択キーとして使用するため変換不要
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

    // iconDict の表示順はオブジェクトの挿入順（Object.keys の返す順）を使用する
    const getOrderedKeys = () => Object.keys(setting.iconDict)

    const moveUp = () => {
        if (selectedIndexes.length === 0) return
        const _setting = structuredClone(setting)
        const { newDict, swapped, newSelected } = moveDictItemsUp(_setting.iconDict, getOrderedKeys(), selectedIndexes)
        _setting.iconDict = newDict
        // lineDict の lineIconKey 参照を交換されたキーペアで更新する
        swapped.forEach(([keyA, keyB]) => {
            Object.values(_setting.lineDict).forEach(line => {
                if (line.lineIconKey === keyA) line.lineIconKey = keyB
                else if (line.lineIconKey === keyB) line.lineIconKey = keyA
            })
        })
        setSetting(_setting)
        setSelectedIndexes(newSelected)
    }

    const moveDown = () => {
        if (selectedIndexes.length === 0) return
        const _setting = structuredClone(setting)
        const { newDict, swapped, newSelected } = moveDictItemsDown(_setting.iconDict, getOrderedKeys(), selectedIndexes)
        _setting.iconDict = newDict
        swapped.forEach(([keyA, keyB]) => {
            Object.values(_setting.lineDict).forEach(line => {
                if (line.lineIconKey === keyA) line.lineIconKey = keyB
                else if (line.lineIconKey === keyB) line.lineIconKey = keyA
            })
        })
        setSetting(_setting)
        setSelectedIndexes(newSelected)
    }

    const iconAddButtonClicked = (method: String) => {
        const _setting: settingType = structuredClone(setting)
        if(newIconName === ''){
            alert("アイコン名が設定されていません")
            return
        }
        if(Object.keys(_setting.iconDict).includes(newIconName)){
            alert("そのアイコン名は既に登録されています")
            return
        }

        if(method === 'img'){
            if(newIconImage === ''){
                alert("アイコン画像が設定されていません")
                return
            }
            // base64 画像 URL をそのまま文字列として格納
            _setting.iconDict[newIconName] = newIconImage
            setSetting(_setting)
        }
        if(method === 'preset'){
            // プリセット情報をオブジェクトとして格納
            const iconParams: iconParamsType = {
                presetType: iconPresetType,
                color: iconPresetColor,
                symbol: iconPresetSymbol
            }
            _setting.iconDict[newIconName] = iconParams
            setSetting(_setting)
        }
    }

    const iconDeleteButtonClicked = () => {
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(key => { delete _setting.iconDict[key] })
        setSelectedIndexes([])
        setSetting(_setting)
    }

    // アイコン一覧テーブルのカラム定義
    // iconDict の値は string（base64画像）か iconParamsType（プリセット）の2種類
    const iconColumns: ColumnDef<string | iconParamsType>[] = [
        {
            header: 'ID',
            isSelector: true,  // クリックで行選択
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

    return(
        <div>
            {/* iconDict を { key, data } 配列に変換して渡す */}
            <GenericItemList
                columns={iconColumns}
                rows={Object.entries(setting.iconDict).map(([key, iconObj]) => ({ key, data: iconObj }))}
                selectedKeys={selectedIndexes}
                onRowClick={handleRowClick}
                tableId="iconTable"
                containerId="iconTableContainer"
            />
            <div className="btn-group" style={{marginTop: '10px'}}>
                {/* 上矢印・下矢印・削除(ゴミ箱) をSVGアイコンで表示 */}
                <button onClick={moveUp} className="btn-icon" title="上に移動"><IconArrowUp/></button>
                <button onClick={moveDown} className="btn-icon" title="下に移動"><IconArrowDown/></button>
                <button onClick={iconDeleteButtonClicked} className="btn-icon btn-danger" title="削除"><IconTrash/></button>
                {/* 複数選択トグルボタン */}
                <button
                    onClick={() => setIsMultiSelect(v => !v)}
                    className={`btn-toggle${isMultiSelect ? ' btn-toggle--active' : ''}`}
                >複数選択</button>
            </div>
            <div className="form-row">
                <label>登録する名前</label>
                <input type="text" id="iconNameTextBox" onChange={(e) => setNewIconName(e.target.value)} placeholder="例：jt" />
            </div>
            <div className="form-row">
                <label>画像アップロード</label>
                <input type="file" id="iconImgInput" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            if (typeof reader.result === 'string') setNewIconImage(reader.result)
                        }
                        reader.readAsDataURL(file)
                    }
                }} />
                <button onClick={() => iconAddButtonClicked('img')}>アイコン追加</button>
            </div>
            <div className="form-row">
                <label>プリセットから登録</label>
                <select id="iconPresetSelect" onChange={(e) => setIconPresetType(e.target.value)}>
                    {iconIndexes.map(num => (
                        <option key={num.key} value={num.key}>{num.name}</option>
                    ))}
                </select>
            </div>
            <div className="form-row">
                <label>アイコンの路線記号</label>
                <input type="text" id="iconPresetLineSymbolInput" onChange={(e) => setIconPresetSymbol(e.target.value)} placeholder='例：JT' />
            </div>
            <div className="form-row">
                <label>路線カラー</label>
                <input type="color" id="iconPresetLineColorInput" onChange={(e) => setIconPresetColor(e.target.value)} />
            </div>
            <div className="btn-group">
                <button onClick={() => iconAddButtonClicked('preset')}>アイコン追加（プリセット）</button>
            </div>
        </div>
    )
}

export default IconList
