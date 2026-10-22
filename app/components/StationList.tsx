"use client"

import React, { useState } from 'react'
import "../type"
import StationParamSetter from './StationParamSetter'
import MapComponent from './MapComponent'
import { calcRunSeconds, secondsToMinutes } from '../modules/calcRunTime'
import GenericItemList, { ColumnDef, ColumnGroup } from './GenericItemList'

import {loadIconPresetTexts} from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { IconArrowUp, IconArrowDown, IconPlus, IconTrash } from './SvgIcons'
import { moveArrayItemsUp, moveArrayItemsDown } from '../modules/listOperations'
import StationPresetPopup from './StationPresetPopup'
import LineInfoBalloon from './LineInfoBalloon'
import OperationInfoBalloon from './OperationInfoBalloon'
import SectionSettingPopup from './SectionSettingPopup'

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
// 選択中の区間の縁取り（7.58節）。区間全体（最初の駅の中央〜最後の駅の中央）を囲む外周だけを青で描き、内側には線を引かない。
// 行ごとに枠の一部を描き、最初の行は上辺、最後の行は下辺を付け、途中の行は左右の辺だけにしてつなげる
const SECTION_HIGHLIGHT_COLOR = '#388bfd'
const renderSectionOutline = (index: number, range: { start: number, end: number } | null, width: number): React.ReactNode => {
    if (!range || index < range.start || index > range.end) return null
    const isStart = index === range.start
    const isEnd = index === range.end
    const pad = width / 2  // 最初・最後の駅の中央から上下にはみ出す長さ（〇を囲めるようにする）
    const border = `2px solid ${SECTION_HIGHLIGHT_COLOR}`
    return (
        <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: `${width}px`, boxSizing: 'border-box',
            top: isStart ? `calc(50% - ${pad}px)` : 0,
            bottom: isEnd ? `calc(50% - ${pad}px)` : 0,
            borderLeft: border, borderRight: border,
            borderTop: isStart ? border : 'none',
            borderBottom: isEnd ? border : 'none',
            borderTopLeftRadius: isStart ? `${pad}px` : 0, borderTopRightRadius: isStart ? `${pad}px` : 0,
            borderBottomLeftRadius: isEnd ? `${pad}px` : 0, borderBottomRightRadius: isEnd ? `${pad}px` : 0,
            pointerEvents: 'none',
        }} />
    )
}
// 縁取りの幅: 運用列は線の太さ＋余白、路線列は〇（11px）を囲める幅
const OPERATION_OUTLINE_WIDTH = RAIL_LINE_WIDTH + 6
const LINE_OUTLINE_WIDTH = 17
// タブID: 表示アプリ側の命名に合わせる（defaultLine=路線図, platform=ホーム案内）
type TabType = 'basic' | 'defaultLine' | 'transfersDisp' | 'platform' | 'map';

const StationList: React.FC<stationListProps> = ({setting, setSetting}) => {
    const [isMultiSelect, setIsMultiSelect] = useState<boolean>(false)
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([])
    // 区間の路線・運用を設定するポップアップ（7.58節）。start・end は 0-based の駅インデックス
    const [sectionPopup, setSectionPopup] = useState<{ kind: 'line' | 'operation', start: number, end: number } | null>(null)
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
    const [lineInfoBalloon, setLineInfoBalloon] = useState<{ line: lineType | null, x: number, y: number } | null>(null)
    // 運用セルクリック時に表示する吹き出しの状態（対象の運用IDと運用データ、クリック位置）
    const [operationInfoBalloon, setOperationInfoBalloon] = useState<{ operationId: string, operation: operationType | null, x: number, y: number } | null>(null)

    const presetIconDict = loadIconPresetTexts()

    // 駅名列で連続した2駅以上を選んでいるときの区間の範囲（0-based。7.58節）。それ以外は null
    const sectionRange = (() => {
        if (selectedIndexes.length < 2) return null
        const sorted = [...new Set(selectedIndexes)].sort((a, b) => a - b)
        if (sorted[sorted.length - 1] - sorted[0] + 1 !== sorted.length) return null
        return { start: sorted[0] - 1, end: sorted[sorted.length - 1] - 1 }
    })()
    // 行 index が選択中の区間（最初の駅〜最後の駅）に含まれるか
    const isRowInSection = (index: number) => !!sectionRange && index >= sectionRange.start && index <= sectionRange.end

    // ナンバリング1つ分を、その駅を LCD の上部に表示するとしたら描画されるとおりに描く（7.57節）。
    // 上部に描画されない場合（番号が空、または通常形式でプリセットが空・未登録）は null を返す。
    // headerNumberingType: 駅の「上部ナンバリング表示形式」（"0": 通常 / "1": 地下鉄）
    const renderNumIcon = (numIcon: stationNumIconType | undefined, headerNumberingType: string): React.ReactNode => {
        if (!numIcon?.number) return null
        const { presetKey, symbol, number, color } = numIcon
        if (headerNumberingType === '1') {
            // 地下鉄形式: LCD 上部と同じ形（下側を切り落とした路線色の円＋白い円＋記号・番号）を小さく描く
            return (
                <svg viewBox='416 132 228 218' width="25px" height="24px">
                    <path d="M 482.5 350 A 114 114 1 1 1 577.5 350 Z" fill={color || '#000000'} />
                    <circle r="87" cx="530" cy="246" fill="#FFFFFF" />
                    <text x="530" y="222" textAnchor="middle" fontSize="56" fontWeight="600" fontFamily="sans-serif" fill="#000000">{symbol}</text>
                    <text x="530" y="300" textAnchor="middle" fontSize="62" fontWeight="600" fontFamily="sans-serif" fill="#000000">{number}</text>
                </svg>
            )
        }
        // 通常形式: プリセットのアイコン。プリセットが空・未登録なら上部には描画されない
        if (!presetKey) return null
        const html = createNumIconFromPreset(presetIconDict, presetKey, symbol, number, color)?.outerHTML
        return html ? <svg viewBox='0 0 225 225' width="24px" height="24px" dangerouslySetInnerHTML={{ __html: html }} /> : null
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
            name: "", kana: "", eng: "", zh: "", ko: "", subName: "", numIcon: _numIcon,
            // 2つ目のナンバリングは路線をまたぐ駅でのみ使うため、前駅から引き継がず常に空で追加する
            numIconNext: { symbol: "", number: "", presetKey: "N_tokyu", color: "", manualSymbol: "", manualPresetKey: "N_tokyu", manualColor: "", colorMode: "manual" },
            lineNumberType: "0", transfers: [],
            isPass: false, sectionTime: "60", stopTime: "20", lineId: _lineId, operationId: _operationId, coordinate: [null, null],
            transferText: "", transferTextEng: "", doorSide: 'left',
            headerNumberingType: "0", transferListPlatform: "", otherLineInd: "",
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

    // 始点駅（先頭駅）からindex駅までの所要時間（分）。走行時間と間の停車駅の停車時間を合計する（7.53節）
    // 途中に数値でない走行時間・停車時間があれば計算不能として "-" を返す
    const calcCumulativeTime = (stationList: stationType[], index: number): string => {
        const seconds = calcRunSeconds(stationList, 0, index)
        return seconds === null ? "-" : String(secondsToMinutes(seconds))
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
                // 運用が切り替わる駅にのみ横棒を描画する（先頭駅は「ひとつ前の駅」が無いため対象外）。
                // 最下部の駅は次の区間が無いため、運用の切り替えとはみなさない（7.68節）
                const isChange = prev !== undefined && !isLast && prev.operationId !== station.operationId
                return (
                    <div style={{ position: 'absolute', inset: 0 }}>
                        {upperOn && <div style={{ ...railLineStyle, top: 0, height: '50%' }} />}
                        {lowerOn && <div style={{ ...railLineStyle, top: '50%', height: '50%' }} />}
                        {/* 選択中の区間の外周を青で縁取る（運用が未設定で線が無い区間も、線の位置に描く。7.58節） */}
                        {renderSectionOutline(index, sectionRange, OPERATION_OUTLINE_WIDTH)}
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
            // 選択中の区間の行をクリックすると区間の運用を設定するポップアップを開く（7.58節）。
            // それ以外はクリックでその駅以降の区間の運用情報を吹き出しで表示する
            onClick: (station, key, e) => {
                if (sectionRange && isRowInSection(parseInt(key))) {
                    setSectionPopup({ kind: 'operation', ...sectionRange })
                    return
                }
                // 運用が未設定の区間は「運用未設定」の吹き出しを出す（7.60節）
                const operation = setting.operationDict[station.operationId] ?? null
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
                // 路線が切り替わる駅は〇の輪を黒にする（先頭駅は「ひとつ前の駅」が無いため対象外）。
                // 最下部の駅は次の区間が無いため常に通常の駅として、ひとつ前の区間の路線色で描く（7.68節）
                const isChange = prev !== undefined && !isLast && prev.lineId !== station.lineId
                const markerColor = isChange ? '#000' : ((isLast ? prevColor : thisColor) || thisColor || 'var(--text-muted)')
                return (
                    <div style={{ position: 'absolute', inset: 0 }}>
                        {prevColor && <div style={{ ...railLineStyle, top: 0, height: '50%', background: prevColor }} />}
                        {!isLast && thisColor && <div style={{ ...railLineStyle, top: '50%', height: '50%', background: thisColor }} />}
                        {/* 選択中の区間の外周（駅の〇と線をまとめて囲む）を青で縁取る（7.58節） */}
                        {renderSectionOutline(index, sectionRange, LINE_OUTLINE_WIDTH)}
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
            // 選択中の区間の行をクリックすると区間の路線を設定するポップアップを開く（7.58節）。
            // それ以外はクリックで路線情報（路線名・かな・英語・記号画像）を吹き出しで表示する
            onClick: (station, key, e) => {
                if (sectionRange && isRowInSection(parseInt(key))) {
                    setSectionPopup({ kind: 'line', ...sectionRange })
                    return
                }
                // 路線が未設定の区間は「路線未設定」の吹き出しを出す（7.60節）
                const line = setting.lineDict[station.lineId] ?? null
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
                { header: 'かな', cell: (station) => station.kana },
                { header: '英語', cell: (station) => station.eng },
                // 中国語・韓国語（7.54節）
                { header: '中国語', cell: (station) => station.zh ?? '' },
                { header: '韓国語', cell: (station) => station.ko ?? '' },
            ],
        },
        {
            header: 'ナンバリング',
            // numIcon（今までの路線）と numIconNext（次の路線）を横に並べて表示する（7.57節）。
            // 1つ目が上部に描画されない場合は「-」、2つ目は描画される場合だけ並べる（描画されなければ何も出さない）
            cell: (station) => {
                const headerType = station.headerNumberingType ?? '0'
                const first = renderNumIcon(station.numIcon, headerType)
                const second = renderNumIcon(station.numIconNext, headerType)
                return (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {first ?? '-'}
                        {second}
                    </div>
                )
            },
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
            // 副駅名（7.54節）。1列だけのグループにして折りたためるようにする（初期状態は閉じる）
            groupHeader: '副駅名',
            collapsible: true,
            defaultCollapsed: true,
            columns: [
                { header: '副駅名', cell: (station) => station.subName ?? '' },
            ],
        },
        {
            header: 'ドア',
            cell: (station) => station.doorSide === 'left' ? '左' : '右',
        },
        {
            // 走行時間・停車時間を「時間」の見出しでまとめ、まとめて折りたたみ可能にする（7.53節。初期状態は閉じる）
            groupHeader: '時間',
            collapsible: true,
            defaultCollapsed: true,
            columns: [
                // 見出しは改行せず1行で表示する（列の幅は見出しが収まるまで広がる）
                { header: '次区間走行時間(秒)', cell: (station) => station.sectionTime },
                { header: '停車時間(秒)', cell: (station) => station.stopTime ?? '' },
            ],
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
            {/* 区間の路線・運用を設定するポップアップ（7.58節） */}
            {sectionPopup && (
                <SectionSettingPopup
                    setting={setting}
                    setSetting={setSetting}
                    kind={sectionPopup.kind}
                    start={sectionPopup.start}
                    end={sectionPopup.end}
                    onClose={() => setSectionPopup(null)}
                />
            )}
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
