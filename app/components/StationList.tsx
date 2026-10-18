"use client"

import React, { useState } from 'react'
import "../type"
import StationParamSetter from './StationParamSetter'
import MapComponent from './MapComponent'
import GenericItemList, { ColumnDef, ColumnGroup } from './GenericItemList'

import {loadIconPresetTexts} from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { IconArrowUp, IconArrowDown, IconPlus, IconTrash } from './SvgIcons'
import { moveArrayItemsUp, moveArrayItemsDown } from '../modules/listOperations'
import StationPresetPopup from './StationPresetPopup'
import LineInfoBalloon from './LineInfoBalloon'
import OperationInfoBalloon from './OperationInfoBalloon'

type stationListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

// 運用列・路線列（鉄道路線図風の縦線表示）で共通して使うスタイル。
// セル全面を描画領域にするため padding を消し、縦線が行ごとの横罫線で分断されないよう
// border-bottom も消す（中の絶対配置要素の基準にするため position: relative にする）
const RAIL_LINE_WIDTH = 3
// 本文は細い縦線のみで文字を含まないため、見出しテキスト基準の既定の幅決定ルールでは広くなりすぎる。
// headerWidth で列幅を明示的に狭く固定する
const RAIL_COLUMN_WIDTH = '32px'
const railCellStyle: React.CSSProperties = {
    position: 'relative', padding: 0, borderBottom: 'none',
}
// 区間を表す縦線1本分のスタイル（top / height / background は呼び出し側で指定する）
const railLineStyle: React.CSSProperties = {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    width: `${RAIL_LINE_WIDTH}px`, background: 'var(--text-primary)',
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
    // 路線セルクリック時に表示する吹き出しの状態（対象の路線とクリック位置）
    const [lineInfoBalloon, setLineInfoBalloon] = useState<{ line: lineType, x: number, y: number } | null>(null)
    // 運用セルクリック時に表示する吹き出しの状態（対象の運用IDと運用データ、クリック位置）
    const [operationInfoBalloon, setOperationInfoBalloon] = useState<{ operationId: string, operation: operationType, x: number, y: number } | null>(null)

    const presetIconDict = loadIconPresetTexts()

    // ナンバリングアイコン1つ分を描画する。
    // presetKey が設定されていれば symbol/number が空でも画像を生成する（空文字のまま渡す）
    const renderNumIcon = (numIcon: stationNumIconType): React.ReactNode => {
        const { presetKey, symbol, number, color } = numIcon
        if (presetKey) {
            const html = createNumIconFromPreset(presetIconDict, presetKey, symbol, number, color)?.outerHTML
            if (html) return <svg viewBox='0 0 225 225' width="24px" height="24px" dangerouslySetInnerHTML={{ __html: html }} />
        }
        return <>{symbol} {number}</>
    }

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
        // 1つ前の駅がなければ0番目の運用をデフォルトにする
        let _operationId = "0"
        if (_setting.stationList.length > 0) {
            if(selectedIndexes.length > 0){
                const prevStation = _setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]
                // symbol/presetKey/color は前駅から引き継ぎ、number は空文字で追加する
                _numIcon = { ...prevStation.numIcon, number: "" }
                _lineId = prevStation.lineId
                _operationId = prevStation.operationId
            } else {
                const lastStation = _setting.stationList[_setting.stationList.length - 1]
                _numIcon = { ...lastStation.numIcon }
                _lineId = lastStation.lineId
                _operationId = lastStation.operationId
            }
        }
        _setting.stationList.splice(_index, 0, {
            name: "", kana: "", eng: "", numIcon: _numIcon,
            // 2つ目のナンバリングは路線をまたぐ駅でのみ使うため、前駅から引き継がず常に空で追加する
            numIconNext: { symbol: "", number: "", presetKey: "N_tokyu", color: "", manualSymbol: "", manualPresetKey: "N_tokyu", manualColor: "", colorMode: "manual" },
            lineNumberType: "0", transfers: [],
            isPass: false, sectionTime: "0", lineId: _lineId, operationId: _operationId, coordinate: [null, null],
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

    // プリセットポップアップから受け取った駅リストを stationList 末尾に追加する（暫定）。
    // 同時に、プリセットの路線から新規作成された lineDict・iconDict のエントリをマージする
    const handlePresetAdd = (result: { stations: stationType[], newLines: Record<string, lineType>, newIcons: Record<string, iconParamsType> }) => {
        const _setting = structuredClone(setting)
        Object.assign(_setting.lineDict, result.newLines)
        Object.assign(_setting.iconDict, result.newIcons)
        _setting.stationList.push(...result.stations)
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

    const togglePass = (index: number) => {
        const _setting = structuredClone(setting)
        _setting.stationList[index].isPass = !_setting.stationList[index].isPass
        setSetting(_setting)
    }

    // 始点駅（先頭駅）からindex駅の直前の駅までのsectionTimeを積算する
    // 途中にsectionTimeが数値変換できない駅があれば計算不能として "-" を返す
    const calcCumulativeTime = (stationList: stationType[], index: number): string => {
        let sum = 0
        for (let i = 0; i < index; i++) {
            const t = Number(stationList[i].sectionTime)
            if (stationList[i].sectionTime === "" || isNaN(t)) return "-"
            sum += t
        }
        return String(sum)
    }

    // 駅一覧テーブルのカラム定義
    const stationColumns: (ColumnDef<stationType> | ColumnGroup<stationType>)[] = [
        {
            header: '運用',
            // station.operationIdは「この駅以降の区間運用」を表すため、区間を縦線で表現する。
            // 上半分＝ひとつ前の駅の区間 / 下半分＝当該駅自身の区間。運用が切り替わる駅には横棒を付ける
            cell: (station, key) => {
                const index = parseInt(key)
                const prev = index > 0 ? setting.stationList[index - 1] : undefined
                const isLast = index === setting.stationList.length - 1
                // 先頭駅の上半分・最終駅の下半分には線を引かない（両端は〇／横棒で止める）
                const upperOn = prev !== undefined && !!prev.operationId
                const lowerOn = !isLast && !!station.operationId
                // 運用が切り替わる駅にのみ横棒を描画する（先頭駅は「ひとつ前の駅」が無いため対象外）
                const isChange = prev !== undefined && prev.operationId !== station.operationId
                return (
                    <div style={{ position: 'absolute', inset: 0 }}>
                        {upperOn && <div style={{ ...railLineStyle, top: 0, height: '50%' }} />}
                        {lowerOn && <div style={{ ...railLineStyle, top: '50%', height: '50%' }} />}
                        {isChange && (
                            <div style={{
                                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                                width: '14px', height: `${RAIL_LINE_WIDTH}px`, background: 'var(--text-primary)',
                            }} />
                        )}
                    </div>
                )
            },
            cellStyle: () => railCellStyle,
            headerWidth: RAIL_COLUMN_WIDTH,
            // クリックでその駅以降の区間の運用情報を吹き出しで表示する
            onClick: (station, _key, e) => {
                const operation = setting.operationDict[station.operationId]
                if (!operation) return
                setOperationInfoBalloon({ operationId: station.operationId, operation, x: e.clientX, y: e.clientY })
            },
        },
        {
            header: '路線',
            // station.lineIdは「この駅以降の区間路線」を表すため、区間を路線色の縦線で表現する。
            // 上半分＝ひとつ前の駅の区間の色 / 下半分＝当該駅自身の区間の色。
            // 全駅のセル中央に白抜きの〇マーカーを置き、路線が切り替わる駅は輪を黒にする
            cell: (station, key) => {
                const index = parseInt(key)
                const prev = index > 0 ? setting.stationList[index - 1] : undefined
                const isLast = index === setting.stationList.length - 1
                const prevColor = prev ? setting.lineDict[prev.lineId]?.color : undefined
                const thisColor = setting.lineDict[station.lineId]?.color
                // 路線が切り替わる駅は〇の輪を黒にする（先頭駅は「ひとつ前の駅」が無いため対象外）
                const isChange = prev !== undefined && prev.lineId !== station.lineId
                const markerColor = isChange ? '#000' : (thisColor || 'var(--text-muted)')
                return (
                    <div style={{ position: 'absolute', inset: 0 }}>
                        {prevColor && <div style={{ ...railLineStyle, top: 0, height: '50%', background: prevColor }} />}
                        {!isLast && thisColor && <div style={{ ...railLineStyle, top: '50%', height: '50%', background: thisColor }} />}
                        <div style={{
                            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                            width: '11px', height: '11px', borderRadius: '50%', boxSizing: 'border-box',
                            border: `3px solid ${markerColor}`, background: '#fff',
                        }} />
                    </div>
                )
            },
            cellStyle: () => railCellStyle,
            headerWidth: RAIL_COLUMN_WIDTH,
            // クリックで路線情報（路線名・かな・英語・記号画像）を吹き出しで表示する
            onClick: (station, _key, e) => {
                const line = setting.lineDict[station.lineId]
                if (!line) return
                setLineInfoBalloon({ line, x: e.clientX, y: e.clientY })
            },
        },
        {
            header: '駅名',
            isSelector: true,  // クリックで行選択
            cell: (station) => station.name,
        },
        {
            header: '通過',
            // key（0-based）をそのままインデックスとして使用
            // チェックボックスは使わず、セル内の任意の場所のクリックでisPassをトグルする
            // isPass=true: 「レ」を表示 / isPass=false: 始点駅からの積算所要時間を表示
            cell: (station, key) => {
                const index = parseInt(key)
                return (
                    // margin: -(td の padding) と同じ値を指定し、セル全面をクリック領域にする
                    <span
                        onClick={() => togglePass(index)}
                        style={{ cursor: 'pointer', display: 'block', margin: '-7px -12px', padding: '7px 12px' }}
                    >
                        {station.isPass ? 'レ' : calcCumulativeTime(setting.stationList, index)}
                    </span>
                )
            },
        },
        {
            // 「駅名かな」「駅名英語」を1つの見出しの下にまとめ、まとめて折りたたみ可能にする。
            // 子カラム自体は個別に折りたたみできない
            groupHeader: '駅名多言語',
            collapsible: true,       // 列の折りたたみを許可する
            defaultCollapsed: true,  // デフォルトで折りたたむ
            columns: [
                { header: '駅名かな', cell: (station) => station.kana },
                { header: '駅名英語', cell: (station) => station.eng },
            ],
        },
        {
            header: 'ナンバリング',
            // numIcon（今までの路線）と numIconNext（次の路線）を横に並べて表示する。
            // numIconNext は路線をまたぐ駅でのみ使うため、number が空の駅は描画しない
            cell: (station) => (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {renderNumIcon(station.numIcon)}
                    {station.numIconNext?.number ? renderNumIcon(station.numIconNext) : null}
                </div>
            ),
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
            header: <>次駅までの<br/>所要時間</>,
            cell: (station) => station.sectionTime,
        },
        {
            // 「緯度」「経度」を1つの見出しの下にまとめ、まとめて折りたたみ可能にする（駅名多言語と同じ構造）。
            // 子カラム自体は個別に折りたたみできない
            groupHeader: '座標',
            collapsible: true,       // 列の折りたたみを許可する
            defaultCollapsed: true,  // デフォルトで折りたたむ
            columns: [
                { header: '緯度', cell: (station) => station.coordinate[0] ?? '' },
                { header: '経度', cell: (station) => station.coordinate[1] ?? '' },
            ],
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
                // 座標設定: Google マップのクリックで、最後に選んだ駅の座標を設定する（7.51節）
                return <MapComponent setting={setting} setSetting={setSetting} selectedIndexes={selectedIndexes} />
            default:
                return null
        }
    }

    return (
        <div>
            {/* 路線図から追加ボタン（最上段）。駅プリセットのポップアップを開く */}
            <div style={{ marginBottom: '8px' }}>
                <button onClick={() => setIsPresetPopupOpen(true)}>路線図から追加</button>
            </div>

            {/* 駅プリセットポップアップ */}
            {isPresetPopupOpen && (
                <StationPresetPopup
                    setting={setting}
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

            {/* 路線セルクリック時の路線情報吹き出し */}
            {lineInfoBalloon && (
                <LineInfoBalloon
                    line={lineInfoBalloon.line}
                    iconDict={setting.iconDict}
                    x={lineInfoBalloon.x}
                    y={lineInfoBalloon.y}
                    onClose={() => setLineInfoBalloon(null)}
                />
            )}

            {/* 運用セルクリック時の運用情報吹き出し */}
            {operationInfoBalloon && (
                <OperationInfoBalloon
                    operationId={operationInfoBalloon.operationId}
                    operation={operationInfoBalloon.operation}
                    stationList={setting.stationList}
                    x={operationInfoBalloon.x}
                    y={operationInfoBalloon.y}
                    onClose={() => setOperationInfoBalloon(null)}
                />
            )}
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
                <button onClick={() => setActiveTab('map')} className={`tab-btn${activeTab === 'map' ? ' active' : ''}`}>座標設定</button>
            </div>
            {renderContent()}
        </div>
    )
}

export default StationList
