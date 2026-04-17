"use client"

import React, { useState } from 'react'
import "../type"
import StationParamSetter from './StationParamSetter'
import MapComponent from './MapComponent'
import GenericItemList, { ColumnDef } from './GenericItemList'

import {loadPresetNumIconTexts} from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { IconArrowUp, IconArrowDown, IconPlus, IconTrash } from './SvgIcons'
import { moveArrayItemsUp, moveArrayItemsDown } from '../modules/listOperations'

type stationListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}
// タブID: 表示アプリ側の命名に合わせる（defaultLine=路線図, platform=ホーム案内）
type TabType = 'basic' | 'defaultLine' | 'platform' | 'map';

const StationList: React.FC<stationListProps> = ({setting, setSetting}) => {
    const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false)
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([])
    const [isNumberDescending, setIsNumberDescending] = useState<boolean>(false)
    const [activeTab, setActiveTab] = useState<TabType>('basic')

    const presetIconDict = loadPresetNumIconTexts()

    // GenericItemList は 0-based string key を返す。
    // 内部では StationParamSetter・MapComponent との互換性のため 1-based number で管理し、
    // GenericItemList との境界でのみ相互変換する。
    const handleRowClick = (key: string) => {
        const rowIndex = parseInt(key) + 1  // 0-based key → 1-based rowIndex に変換
        if (!isMultiSelect) {
            setSelectedIndexes([rowIndex])
        } else {
            let _selectedIndexes = [...selectedIndexes]
            if (selectedIndexes.includes(rowIndex)) {
                _selectedIndexes = _selectedIndexes.filter(i => i !== rowIndex)
            } else {
                _selectedIndexes.push(rowIndex)
            }
            _selectedIndexes.sort((a, b) => b - a)
            setSelectedIndexes(_selectedIndexes)
        }
    }

    const addStation = () => {
        if(!setting.stationList) return
        const _setting: settingType = structuredClone(setting)

        let _index = _setting.stationList.length
        if(selectedIndexes.length > 0){
            // 削除後などに古いインデックスが残っている場合に備えてリスト長でクランプする
            _index = Math.min(selectedIndexes[selectedIndexes.length - 1], _setting.stationList.length)
        }

        let _number = ""
        let _color = ""
        let _lineId = ""
        if (_setting.stationList.length > 0) {
            if(selectedIndexes.length > 0){
                _number = _setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1].number
                let nextNumber = String(Number(_number.split(" ")[1]) + (isNumberDescending ? -1 : 1))
                nextNumber = nextNumber.length === 1 ? "0" + nextNumber : nextNumber
                _number = (_number.includes(" ") ? _number.split(" ")[0] : _number) + ((nextNumber === "NaN") ? "" : " " + nextNumber)
                _color = _setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1].lineColor
                _lineId = _setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1].lineId
            } else {
                _number = _setting.stationList[_setting.stationList.length - 1].number
                _color = _setting.stationList[_setting.stationList.length - 1].lineColor
                _lineId = _setting.stationList[_setting.stationList.length - 1].lineId
            }
        }
        _setting.stationList.splice(_index, 0, {
            name: "", kana: "", eng: "", number: _number, lineColor: _color,
            numIconPresetKey: "N_tokyu", lineNumberType: "0", transfers: "",
            isPass: false, sectionTime: "", lineId: _lineId, coordinate: [null, null],
            transferText: "", transferTextEng: "", doorSide: 'left',
            transferCountLineP: "", otherLineInd: "", slotNum: "0", leftSlotInd: "0",
            otherCarNum: "0", otherLeftSlotInd: "0"
        })
        setSetting(_setting)
        // splice の実際の挿入位置（0-based: _index）を 1-based に変換して選択する
        setSelectedIndexes([_index + 1])
    }

    const deleteStation = () => {
        const _setting = structuredClone(setting)
        selectedIndexes.sort((a, b) => b - a)
        selectedIndexes.forEach(ind => {
            _setting.stationList.splice(ind - 1, 1)
        })
        setSetting(_setting)
        // 削除後にリストが空になった場合は選択を解除する（古いインデックスが残らないように）
        if (_setting.stationList.length === 0) {
            setSelectedIndexes([])
        } else {
            setSelectedIndexes(isMultiSelect ? [] : [selectedIndexes[selectedIndexes.length - 1]])
        }
    }

    const allSelectButtonClicked = () => {
        if (setting.stationList.length === 0) return
        if (selectedIndexes.length === setting.stationList.length) {
            setSelectedIndexes([])
        } else {
            setSelectedIndexes(Array.from({ length: setting.stationList.length }, (_, i) => i + 1))
        }
    }

    const moveUp = () => {
        if (selectedIndexes.length === 0) return
        // 内部は 1-based のため 0-based に変換してユーティリティを呼び出す
        const { newArr, newSelected } = moveArrayItemsUp(setting.stationList, selectedIndexes.map(i => i - 1))
        const _setting = structuredClone(setting)
        _setting.stationList = newArr
        setSetting(_setting)
        setSelectedIndexes(newSelected.map(i => i + 1))  // 0-based → 1-based に戻す
    }

    const moveDown = () => {
        if (selectedIndexes.length === 0) return
        const { newArr, newSelected } = moveArrayItemsDown(setting.stationList, selectedIndexes.map(i => i - 1))
        const _setting = structuredClone(setting)
        _setting.stationList = newArr
        setSetting(_setting)
        setSelectedIndexes(newSelected.map(i => i + 1))
    }

    const reverseButtonClilcked = () => {
        const _setting = structuredClone(setting)
        const selectedStations = selectedIndexes.map(index => _setting.stationList[index - 1])
        selectedStations.reverse()
        selectedIndexes.forEach((index, i) => {
            _setting.stationList[index - 1] = selectedStations[i]
        })
        setSetting(_setting)
    }

    const passBoxChanged = (e: any, index: number) => {
        const _setting = structuredClone(setting)
        _setting.stationList[index].isPass = e.target.checked
        setSetting(_setting)
    }

    // 駅一覧テーブルのカラム定義
    const stationColumns: ColumnDef<stationType>[] = [
        {
            header: '通過',
            // key（0-based）をそのままインデックスとして使用
            cell: (station, key) => (
                <input
                    type="checkbox"
                    onChange={(e) => passBoxChanged(e, parseInt(key))}
                    checked={station.isPass}
                />
            ),
        },
        {
            header: '駅名',
            isSelector: true,  // クリックで行選択
            cell: (station) => station.name,
        },
        {
            header: '駅名かな',
            cell: (station) => station.kana,
        },
        {
            header: '駅名英語',
            cell: (station) => station.eng,
        },
        {
            header: 'ナンバリング',
            cell: (station) => station.number,
            cellStyle: (station) => ({ backgroundColor: station.lineColor }),  // 路線カラーをセル背景に反映
        },
        {
            header: '乗換路線',
            // transfersはスペース区切りの路線IDリスト。各IDをアイコンとして描画する。
            cell: (station) => (
                <>
                    {station.transfers.split(' ').map((lineId, idx) => {
                        if (!lineId || !Object.keys(setting.lineDict).includes(lineId)) return null
                        const iconParams = setting.iconDict[setting.lineDict[lineId].lineIconKey]
                        if (typeof iconParams === 'string') {
                            return iconParams ? <img key={idx} src={iconParams} alt="" width="20px" height="20px" /> : null
                        } else if (iconParams) {
                            const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                            return html ? <svg key={idx} viewBox='0 0 225 225' width="20px" height="20px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                        }
                        return null
                    })}
                </>
            ),
        },
        {
            header: 'ドア',
            cell: (station) => station.doorSide === 'left' ? '左' : '右',
        },
        {
            header: '次区間路線名',
            cell: (station) => setting.lineDict[station.lineId]?.name,
            cellStyle: (station) => ({ backgroundColor: setting.lineDict[station.lineId]?.color }),  // 路線カラーをセル背景に反映
        },
        {
            header: '次区間所要時間',
            cell: (station) => station.sectionTime,
        },
        {
            header: '緯度',
            cell: (station) => station.coordinate[0] ?? '',
        },
        {
            header: '経度',
            cell: (station) => station.coordinate[1] ?? '',
        },
    ]

    const renderContent = () => {
        switch (activeTab) {
            // 駅基本設定・路線図・ホーム案内は StationParamSetter に activeSection を渡して表示内容を切り替える
            case 'basic':
            case 'defaultLine':
            case 'platform':
                return <StationParamSetter setting={setting} setSetting={setSetting} selectedIndexes={selectedIndexes} activeSection={activeTab} />
            case 'map':
                //return <MapComponent setting={setting} setSetting={setSetting} selectedIndexes={selectedIndexes} />
                return <div style={{padding: '20px', border: '1px solid #ccc', marginTop: '10px'}}>マップコンポーネントは現在開発中です。</div>
            default:
                return null
        }
    }

    return (
        <div>
            {/* 1-based の selectedIndexes を 0-based string key に変換して渡す */}
            <GenericItemList
                columns={stationColumns}
                rows={setting.stationList.map((station, i) => ({ key: String(i), data: station }))}
                selectedKeys={selectedIndexes.map(i => String(i - 1))}
                onRowClick={handleRowClick}
                tableId="stationsTable"
                containerId="stationsTableContainer"
            />
            <div className="btn-group" style={{marginTop: '10px'}}>
                {/* 上矢印・下矢印・追加(+)・削除(ゴミ箱) をSVGアイコンで表示 */}
                <button onClick={moveUp} className="btn-icon" title="上に移動"><IconArrowUp/></button>
                <button onClick={moveDown} className="btn-icon" title="下に移動"><IconArrowDown/></button>
                <button onClick={addStation} className="btn-icon btn-primary" title="駅追加"><IconPlus/></button>
                <button onClick={deleteStation} className="btn-icon btn-danger" title="駅削除"><IconTrash/></button>
                {/* 複数選択トグルボタン */}
                <button
                    onClick={() => setIsMultiSelect(v => !v)}
                    className={`btn-toggle${isMultiSelect ? ' btn-toggle--active' : ''}`}
                >複数選択</button>
                <button onClick={allSelectButtonClicked}>全選択/解除</button>
                <button onClick={reverseButtonClilcked}>反転</button>
                {/* ナンバリング補完降順トグルボタン */}
                <button
                    onClick={() => setIsNumberDescending(v => !v)}
                    className={`btn-toggle${isNumberDescending ? ' btn-toggle--active' : ''}`}
                >ナンバリング補完降順</button>
            </div>
            {/* 駅設定エリアのタブ切り替え（4タブ） */}
            <div className="operation-tabs">
                <button onClick={() => setActiveTab('basic')} className={`tab-btn${activeTab === 'basic' ? ' active' : ''}`}>駅基本設定</button>
                <button onClick={() => setActiveTab('defaultLine')} className={`tab-btn${activeTab === 'defaultLine' ? ' active' : ''}`}>路線図</button>
                <button onClick={() => setActiveTab('platform')} className={`tab-btn${activeTab === 'platform' ? ' active' : ''}`}>ホーム案内</button>
                <button onClick={() => setActiveTab('map')} className={`tab-btn${activeTab === 'map' ? ' active' : ''}`}>マップ</button>
            </div>
            {renderContent()}
        </div>
    )
}

export default StationList
