"use client"

import React, { useState } from 'react'
import "../type"
import StationParamSetter from './StationParamSetter'
import MapComponent from './MapComponent'
import GenericItemList, { ColumnDef } from './GenericItemList'

import {loadIconPresetTexts} from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { IconArrowUp, IconArrowDown, IconPlus, IconTrash } from './SvgIcons'
import { moveArrayItemsUp, moveArrayItemsDown } from '../modules/listOperations'
import StationPresetPopup from './StationPresetPopup'

type stationListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}
// タブID: 表示アプリ側の命名に合わせる（defaultLine=路線図, platform=ホーム案内）
type TabType = 'basic' | 'defaultLine' | 'transfersDisp' | 'platform' | 'map';

const StationList: React.FC<stationListProps> = ({setting, setSetting}) => {
    const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false)
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([])
    // 連続選択モード（複数選択OFFの時のみ有効）
    const [isRangeSelectMode, setIsRangeSelectMode] = useState<boolean>(false)
    const [rangeStartIndex, setRangeStartIndex] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>('basic')
    // 駅プリセットポップアップの表示状態
    const [isPresetPopupOpen, setIsPresetPopupOpen] = useState<boolean>(false)
    // ナンバリング連番入力ポップアップの状態
    const [isSeqInputOpen, setIsSeqInputOpen] = useState<boolean>(false)
    const [seqStart, setSeqStart] = useState<string>('01')
    const [seqOrder, setSeqOrder] = useState<'asc' | 'desc'>('asc')

    const presetIconDict = loadIconPresetTexts()

    // GenericItemList は 0-based string key を返す。
    // 内部では StationParamSetter・MapComponent との互換性のため 1-based number で管理し、
    // GenericItemList との境界でのみ相互変換する。
    const handleRowClick = (key: string) => {
        const rowIndex = parseInt(key) + 1  // 0-based key → 1-based rowIndex に変換
        if (!isMultiSelect) {
            if (!isRangeSelectMode) {
                if (selectedIndexes.includes(rowIndex) && selectedIndexes.length === 1) {
                    // 1駅のみ選択中にその駅を再クリック → 連続選択モードへ移行
                    setIsRangeSelectMode(true)
                    setRangeStartIndex(rowIndex)
                    setSelectedIndexes([])
                } else {
                    // 未選択駅クリック、または複数選択中の1駅クリック → その駅のみ選択
                    setSelectedIndexes([rowIndex])
                }
            } else {
                // 連続選択モード中
                if (rowIndex === rangeStartIndex) {
                    // 起点駅を再クリック → モード解除、起点駅を通常選択に戻す
                    setIsRangeSelectMode(false)
                    setRangeStartIndex(null)
                    setSelectedIndexes([rowIndex])
                } else {
                    // 別の駅をクリック → 起点〜クリック駅の範囲を全選択してモード解除
                    const min = Math.min(rangeStartIndex!, rowIndex)
                    const max = Math.max(rangeStartIndex!, rowIndex)
                    setSelectedIndexes(Array.from({ length: max - min + 1 }, (_, i) => min + i))
                    setIsRangeSelectMode(false)
                    setRangeStartIndex(null)
                }
            }
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

        let _numIcon: stationNumIconType = { symbol: "", number: "", presetKey: "N_tokyu", color: "", manualSymbol: "", manualPresetKey: "N_tokyu", manualColor: "", colorMode: "auto" }
        let _lineId = ""
        if (_setting.stationList.length > 0) {
            if(selectedIndexes.length > 0){
                const prevStation = _setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]
                // symbol/presetKey/color は前駅から引き継ぎ、number は空文字で追加する
                _numIcon = { ...prevStation.numIcon, number: "" }
                _lineId = prevStation.lineId
            } else {
                const lastStation = _setting.stationList[_setting.stationList.length - 1]
                _numIcon = { ...lastStation.numIcon }
                _lineId = lastStation.lineId
            }
        }
        _setting.stationList.splice(_index, 0, {
            name: "", kana: "", eng: "", numIcon: _numIcon,
            lineNumberType: "0", transfers: [],
            isPass: false, sectionTime: "", lineId: _lineId, coordinate: [null, null],
            transferText: "", transferTextEng: "", doorSide: 'left',
            headerNumberingType: "0", transferListPlatform: "", otherLineInd: "", slotNum: "0", leftSlotInd: "0",
            otherCarNum: "0", otherLeftSlotInd: "0", transferListTransfers: ""
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

    // プリセットポップアップから受け取った駅リストを stationList 末尾に追加する（暫定）
    const handlePresetAdd = (stations: stationType[]) => {
        const _setting = structuredClone(setting)
        _setting.stationList.push(...stations)
        setSetting(_setting)
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

    // ナンバリング連番入力: 選択駅をリスト順にソートし、指定開始番号から連番を書き込む
    const applySeqNumbering = () => {
        const startNum = Number(seqStart)
        if (isNaN(startNum)) return
        // 選択駅をリスト上の位置順（インデックス昇順）に並べる
        const sortedIndexes = [...selectedIndexes].sort((a, b) => a - b)
        const _setting = structuredClone(setting)
        sortedIndexes.forEach((ind, offset) => {
            const station = _setting.stationList[ind - 1]
            if (!station) return
            const num = startNum + (seqOrder === 'asc' ? offset : -offset)
            // 0〜9 は 2 桁にゼロ埋めする
            const numStr = (num >= 0 && num <= 9) ? '0' + String(num) : String(num)
            station.numIcon.number = numStr
        })
        setSetting(_setting)
        setIsSeqInputOpen(false)
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
            collapsible: true,       // 列の折りたたみを許可する
            defaultCollapsed: true,  // デフォルトで折りたたむ
        },
        {
            header: '駅名英語',
            cell: (station) => station.eng,
            collapsible: true,       // 列の折りたたみを許可する
            defaultCollapsed: true,  // デフォルトで折りたたむ
        },
        {
            header: 'ナンバリング',
            // numIcon サブオブジェクトの各フィールドを使って NumIcon を生成して表示する
            cell: (station) => {
                const { presetKey, symbol, number, color } = station.numIcon
                // presetKey が設定されていれば symbol/number が空でも画像を生成する（空文字のまま渡す）
                if (presetKey) {
                    const html = createNumIconFromPreset(presetIconDict, presetKey, symbol, number, color)?.outerHTML
                    if (html) return <svg viewBox='0 0 225 225' width="24px" height="24px" dangerouslySetInnerHTML={{ __html: html }} />
                }
                return <>{symbol} {number}</>
            },
        },
        {
            header: '次区間路線',
            cell: (station) => setting.lineDict[station.lineId]?.name,
            cellStyle: (station) => ({ backgroundColor: setting.lineDict[station.lineId]?.color }),  // 路線カラーをセル背景に反映
        },
        {
            header: '乗換路線',
            // transfers は transferItemType[] 。路線ごとにアイコンをグループ化して描画する。
            // 路線間は gap で区切り、1路線内の複数アイコンはくっつけて表示する。
            cell: (station) => (
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center'}}>
                    {station.transfers.map((item, idx) => {
                        const keys = item.line?.lineIconKey ?? []
                        if (keys.length === 0) return null
                        return (
                            // 1路線分のアイコン群を隙間なく横並びにする
                            <div key={idx} style={{display: 'flex', flexDirection: 'row'}}>
                                {keys.map((key, ki) => {
                                    const iconParams = setting.iconDict[key]
                                    if (typeof iconParams === 'string') {
                                        return iconParams ? <img key={ki} src={iconParams} alt="" width="20px" height="20px" /> : null
                                    } else if (iconParams) {
                                        const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                                        return html ? <svg key={ki} viewBox='0 0 225 225' width="20px" height="20px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                                    }
                                    return null
                                })}
                            </div>
                        )
                    })}
                </div>
            ),
        },
        {
            header: 'ドア',
            cell: (station) => station.doorSide === 'left' ? '左' : '右',
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
            // 駅基本設定・路線図・乗換一覧表示・ホーム案内は StationParamSetter に activeSection を渡して表示内容を切り替える
            case 'basic':
            case 'defaultLine':
            case 'transfersDisp':
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
            {/* 駅プリセットから追加ボタン（最上段） */}
            <div style={{ marginBottom: '8px' }}>
                <button onClick={() => setIsPresetPopupOpen(true)}>駅プリセットから追加</button>
            </div>

            {/* 駅プリセットポップアップ */}
            {isPresetPopupOpen && (
                <StationPresetPopup
                    onAdd={handlePresetAdd}
                    onClose={() => setIsPresetPopupOpen(false)}
                />
            )}

            {/* 1-based の selectedIndexes を 0-based string key に変換して渡す */}
            <GenericItemList
                columns={stationColumns}
                rows={setting.stationList.map((station, i) => ({ key: String(i), data: station }))}
                selectedKeys={selectedIndexes.map(i => String(i - 1))}
                onRowClick={handleRowClick}
                tableId="stationsTable"
                containerId="stationsTableContainer"
                rangeStartKey={rangeStartIndex !== null ? String(rangeStartIndex - 1) : undefined}
            />
            <div className="btn-group" style={{marginTop: '10px'}}>
                {/* 上矢印・下矢印・追加(+)・削除(ゴミ箱) をSVGアイコンで表示 */}
                <button onClick={moveUp} className="btn-icon" title="上に移動"><IconArrowUp/></button>
                <button onClick={moveDown} className="btn-icon" title="下に移動"><IconArrowDown/></button>
                <button onClick={addStation} className="btn-icon btn-primary" title="駅追加"><IconPlus/></button>
                <button onClick={deleteStation} className="btn-icon btn-danger" title="駅削除"><IconTrash/></button>
                {/* 複数選択トグルボタン */}
                <button
                    onClick={() => {
                        // 複数選択ON切り替え時に連続選択モードを強制解除する
                        if (!isMultiSelect) {
                            setIsRangeSelectMode(false)
                            setRangeStartIndex(null)
                        }
                        setIsMultiSelect(v => !v)
                    }}
                    className={`btn-toggle${isMultiSelect ? ' btn-toggle--active' : ''}`}
                >複数選択</button>
                <button onClick={allSelectButtonClicked}>全選択/解除</button>
                <button onClick={reverseButtonClilcked}>反転</button>
                <button onClick={() => setIsSeqInputOpen(true)}>ナンバリング連番入力</button>
            </div>

            {/* ナンバリング連番入力ポップアップ */}
            {isSeqInputOpen && (
                <div className="modal-backdrop" onClick={() => setIsSeqInputOpen(false)}>
                    <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                        <div className="modal-title-row">
                            <p className="modal-title">ナンバリング連番入力</p>
                            <button className="modal-close-btn" onClick={() => setIsSeqInputOpen(false)} title="閉じる">×</button>
                        </div>
                        <div className="form-row">
                            <label>開始</label>
                            <input
                                type="text"
                                value={seqStart}
                                onChange={e => setSeqStart(e.target.value)}
                            />
                        </div>
                        <div className="form-row">
                            <label>順序</label>
                            <select value={seqOrder} onChange={e => setSeqOrder(e.target.value as 'asc' | 'desc')}>
                                <option value="asc">昇順</option>
                                <option value="desc">降順</option>
                            </select>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={applySeqNumbering}>決定</button>
                            <button onClick={() => setIsSeqInputOpen(false)}>閉じる</button>
                        </div>
                    </div>
                </div>
            )}
            {/* 駅設定エリアのタブ切り替え（5タブ） */}
            <div className="operation-tabs">
                <button onClick={() => setActiveTab('basic')} className={`tab-btn${activeTab === 'basic' ? ' active' : ''}`}>駅基本設定</button>
                <button onClick={() => setActiveTab('defaultLine')} className={`tab-btn${activeTab === 'defaultLine' ? ' active' : ''}`}>詳細路線図表示</button>
                <button onClick={() => setActiveTab('transfersDisp')} className={`tab-btn${activeTab === 'transfersDisp' ? ' active' : ''}`}>乗換一覧表示</button>
                <button onClick={() => setActiveTab('platform')} className={`tab-btn${activeTab === 'platform' ? ' active' : ''}`}>ホーム案内表示</button>
                <button onClick={() => setActiveTab('map')} className={`tab-btn${activeTab === 'map' ? ' active' : ''}`}>マップ</button>
            </div>
            {renderContent()}
        </div>
    )
}

export default StationList
