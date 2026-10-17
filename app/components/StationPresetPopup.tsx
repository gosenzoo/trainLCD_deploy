"use client"

import React, { useState, useEffect } from 'react'
import "../type"
import {
    loadLineDB, loadStationDB, loadLineConnectDB, loadTransferDB,
    PresetLine, PresetStation, PresetLineConnect, PresetTransfer,
    StationSection, StagedRoute
} from '../modules/loadStationPresets'
import StationPresetMap from './StationPresetMap'

type Props = {
    setting: settingType  // lineDict・iconDict の既存エントリを参照するために使用（読み取り専用）
    // 追加確定時のコールバック。stations に加え、新規作成が必要な lineDict・iconDict の
    // エントリ（既存と重複しないもの）を渡す
    onAdd: (result: { stations: stationType[], newLines: Record<string, lineType>, newIcons: Record<string, iconParamsType> }) => void
    onClose: () => void
}

// 前駅参照: 駅データ・選択時の路線ID・lineConnects 上の位置インデックスをまとめて保持
type PrevStationRef = {
    station: PresetStation
    lineId: string
    index: number
}

// lineConnectDB の駅ナンバリング（例: "TY 01"）をスペースで分割し、ナンバリングアイコン情報を組み立てる。
// プリセット取り込みは値を確定させて書き込むため colorMode は常に manual にする
// presetKey: 所属路線の lineDB「ナンバリングアイコン」列の値（N_*）
const toNumIcon = (numberStr: string, lineColor: string, presetKey: string): stationNumIconType => {
    const spaceIdx = numberStr.indexOf(' ')
    const symbol = spaceIdx !== -1 ? numberStr.slice(0, spaceIdx) : ''
    const number = spaceIdx !== -1 ? numberStr.slice(spaceIdx + 1) : numberStr
    return { symbol, number, presetKey, color: lineColor, manualSymbol: symbol, manualPresetKey: presetKey, manualColor: lineColor, colorMode: "manual" }
}

// 空の2つ目のナンバリング（路線をまたぐ駅でのみ値が入る）。
// 後から手動で入力する場合に備え、プリセットキーは所属路線のものを入れておく
const emptyNumIconNext = (presetKey: string): stationNumIconType =>
    ({ symbol: "", number: "", presetKey, color: "", manualSymbol: "", manualPresetKey: presetKey, manualColor: "", colorMode: "manual" })

// プリセット駅から stationType を生成する（lineColor・number は lineConnectDB から取得、その他未設定は暫定デフォルト）
// lineId: この駅以降の区間路線ID（resolveLineKey で解決した lineDict のキー）
// numIconPresetKey: 所属路線のナンバリングアイコンのプリセットキー
const toStationType = (station: PresetStation, lineColor: string, numberStr: string, lineId: string, numIconPresetKey: string): stationType => {
    return {
    name: station.name,
    kana: station.kana,
    eng: station.eng,
    numIcon: toNumIcon(numberStr, lineColor, numIconPresetKey),
    numIconNext: emptyNumIconNext(numIconPresetKey),
    lineNumberType: "0",
    transfers: [],
    isPass: false,
    sectionTime: "0",
    lineId,
    operationId: "0",  // プリセットから追加する全駅に0番目の運用を設定する
    coordinate: [null, null],
    transferText: "",
    transferTextEng: "",
    doorSide: "left",
    headerNumberingType: "0",
    transferListPlatform: "",
    otherLineInd: "",
    slotNum: "0",
    leftSlotInd: "0",
    otherCarNum: "0",
    otherLeftSlotInd: "0",
    transferListTransfers: "",
    }
}

// iconDict内に presetType・symbol・color が完全一致するエントリがあればそのキーを返す
const findMatchingIconKey = (iconDict: settingType['iconDict'], params: iconParamsType): string | undefined => {
    return Object.keys(iconDict).find(key => {
        const v = iconDict[key]
        return typeof v !== 'string' && v.presetType === params.presetType && v.symbol === params.symbol && v.color === params.color
    })
}

// iconDictに存在しない一意なキーをbaseから生成する（衝突時は連番を付与）
const generateUniqueIconKey = (iconDict: settingType['iconDict'], base: string): string => {
    if (!Object.keys(iconDict).includes(base)) return base
    let i = 2
    while (Object.keys(iconDict).includes(`${base}_${i}`)) i++
    return `${base}_${i}`
}

// lineDict内に name・kana・eng・color・symbol・numIconPresetKey が完全一致するエントリがあればそのキーを返す
const findMatchingLineKey = (lineDict: settingType['lineDict'], line: PresetLine): string | undefined => {
    return Object.keys(lineDict).find(key => {
        const l = lineDict[key]
        return l.name === line.name && l.kana === line.kana && l.eng === line.eng &&
            l.color === line.color && l.symbol === line.symbol && l.numIconPresetKey === line.numIconPresetKey
    })
}

// lineDictの既存キー（数値）から次の新規キーを生成する
const generateNextLineKey = (existingKeys: string[]): string => {
    const nums = existingKeys.map(Number).filter(n => !isNaN(n))
    return String(nums.length > 0 ? Math.max(...nums) + 1 : 0)
}

// 駅・路線の選択ハイライトに使うスタイル
const highlightStyle = {
    background: 'var(--accent-dim)',
    color: 'var(--accent-hover)',
    fontWeight: 700,
} as const

const StationPresetPopup: React.FC<Props> = ({ setting, onAdd, onClose }) => {
    const [lines, setLines] = useState<PresetLine[]>([])
    const [allStations, setAllStations] = useState<PresetStation[]>([])
    const [lineConnects, setLineConnects] = useState<PresetLineConnect[]>([])
    // 乗換エッジ（路線図の描画にのみ使う。区間選択には使わない）
    const [transfers, setTransfers] = useState<PresetTransfer[]>([])
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
    // 区間の開始駅（前駅）: null = firstStation 状態、値あり = continuing 状態
    const [prevStation, setPrevStation] = useState<PrevStationRef | null>(null)
    // 追加一覧（ルートの配列。ルートは1つ以上の区間のまとまり）
    const [stagingList, setStagingList] = useState<StagedRoute[]>([])
    // 選択UIの表示切替（list: 従来のリスト選択 / map: 路線図からの選択）。開いたときは路線図を表示する
    const [viewMode, setViewMode] = useState<'list' | 'map'>('map')
    const [loadError, setLoadError] = useState<string | null>(null)

    // マウント時に CSV を読み込む
    useEffect(() => {
        // transferDB は読み込めなくても空配列を返すため、読み込みエラーの原因にはならない
        Promise.all([loadLineDB(), loadStationDB(), loadLineConnectDB(), loadTransferDB()])
            .then(([lineData, stationData, connectData, transferData]) => {
                setLines(lineData)
                setAllStations(stationData)
                setLineConnects(connectData)
                setTransfers(transferData)
            })
            .catch(() => setLoadError('CSVファイルの読み込みに失敗しました'))
    }, [])

    // 路線選択リストの絞り込み:
    // firstStation (prevStation === null): lineDB の全路線を表示
    // continuing (prevStation !== null): lineConnectDB で prevStation.station.id が含まれる路線のみ表示
    const filteredLines = (() => {
        if (prevStation === null) return lines
        const connectedLineIds = new Set(
            lineConnects
                .filter(c => c.stationId === prevStation.station.id)
                .map(c => c.lineId)
        )
        return lines.filter(line => connectedLineIds.has(line.id))
    })()

    // 選択中路線の lineConnects エントリ（インデックスを保持するため配列ごと使う）
    const lineConnectsForLine = selectedLineId
        ? lineConnects.filter(c => c.lineId === selectedLineId)
        : []

    // 選択中路線の駅リスト（lineConnects の順序に従い stationDB を引く）
    const stationsForLine: PresetStation[] = lineConnectsForLine
        .map(c => allStations.find(s => s.id === c.stationId))
        .filter((s): s is PresetStation => s !== undefined)

    // 路線クリック → selectedLineId を更新
    const handleLineClick = (lineId: string) => {
        setSelectedLineId(lineId)
    }

    // 駅クリック（index は stationsForLine / lineConnectsForLine 上の位置）
    const handleStationClick = (station: PresetStation, index: number) => {
        if (prevStation === null) {
            // firstStation: クリックした駅を前駅に設定（→ continuing 状態へ）
            setPrevStation({ station, lineId: selectedLineId!, index })
        } else {
            // continuing: 前駅→選択駅の区間を生成して追加一覧へ追加
            if (selectedLineId !== null) {
                // 前駅が現在の路線と同じ場合はそのインデックスを使用、
                // 乗り換えで路線が変わった場合は駅IDで一致する最初のインデックスを探す
                let prevIdx: number
                if (prevStation.lineId === selectedLineId) {
                    prevIdx = prevStation.index
                } else {
                    prevIdx = lineConnectsForLine.findIndex(c => c.stationId === prevStation.station.id)
                }
                if (prevIdx !== -1) {
                    const section: StationSection = {
                        lineId: selectedLineId,
                        prevIndex: prevIdx,
                        nextIndex: index,
                    }
                    // リストUIでは区間1つのルートとして追加する
                    setStagingList(prev => [...prev, { sections: [section] }])
                }
            }
            // 選択駅を新しい前駅に更新
            setPrevStation({ station, lineId: selectedLineId!, index })
        }
        // 駅選択後は路線・駅の選択をリセット
        setSelectedLineId(null)
    }

    // 各区間から駅を展開し、連続区間の接続駅の重複を除去して stationType[] に変換する。
    // 同時に、各区間の路線（PresetLine）を lineDict・iconDict のキーに解決する。
    // 既存の setting.lineDict/iconDict、または今回の呼び出し内で新規作成した分と完全一致する
    // エントリがあればそれを再利用し、同じ路線が複数区間・複数駅にまたがっても1つのエントリにまとめる。
    const extractStationsFromSections = (): { stations: stationType[], newLines: Record<string, lineType>, newIcons: Record<string, iconParamsType> } => {
        const result: stationType[] = []
        const newLines: Record<string, lineType> = {}
        const newIcons: Record<string, iconParamsType> = {}
        // プリセット路線ID → 解決済み lineDict キーのキャッシュ（同じプリセット路線の再解決を避ける）
        const resolvedKeyByPresetLineId: Record<string, string> = {}
        // 前の区間の最後の lineConnects エントリキー（重複除去用）
        let lastKey: string | null = null
        // 直前に result へ追加した駅のプリセット駅ID（路線をまたぐ接続駅の統合判定用）
        let lastStationId: string | null = null
        // 直前の駅を追加・更新した区間のプリセット路線ID（環状線の継ぎ目の判定用）
        let lastSectionLineId: string | null = null
        // 全ルートの区間を順に並べる
        const sections: StationSection[] = stagingList.flatMap(route => route.sections)

        // プリセット路線を lineDict のキーに解決する（未登録の場合は iconDict・lineDict に新規追加する）
        const resolveLineKey = (presetLine: PresetLine): string => {
            const cached = resolvedKeyByPresetLineId[presetLine.id]
            if (cached !== undefined) return cached

            // 路線記号アイコンの解決: 既存iconDict → 今回新規作成分の順に完全一致するものを探す
            // presetType には lineDB の「路線アイコン」列（I_*）を使う
            let lineIconKey = ''
            if (presetLine.symbol && presetLine.iconPresetKey) {
                const iconParams: iconParamsType = { presetType: presetLine.iconPresetKey, symbol: presetLine.symbol, color: presetLine.color }
                const allIconsSoFar = { ...setting.iconDict, ...newIcons }
                const existingIconKey = findMatchingIconKey(allIconsSoFar, iconParams)
                if (existingIconKey) {
                    lineIconKey = existingIconKey
                } else {
                    lineIconKey = generateUniqueIconKey(allIconsSoFar, `line_${presetLine.id}`)
                    newIcons[lineIconKey] = iconParams
                }
            }

            // 路線本体の解決: 既存lineDict → 今回新規作成分の順に完全一致するものを探す
            const allLinesSoFar = { ...setting.lineDict, ...newLines }
            let lineKey = findMatchingLineKey(allLinesSoFar, presetLine)
            if (!lineKey) {
                lineKey = generateNextLineKey(Object.keys(allLinesSoFar))
                newLines[lineKey] = {
                    name: presetLine.name, kana: presetLine.kana, eng: presetLine.eng,
                    color: presetLine.color, symbol: presetLine.symbol, numIconPresetKey: presetLine.numIconPresetKey,
                    lineIconKey,
                }
            }
            resolvedKeyByPresetLineId[presetLine.id] = lineKey
            return lineKey
        }

        for (const section of sections) {
            const connects = lineConnects.filter(c => c.lineId === section.lineId)
            const { prevIndex, nextIndex } = section
            if (prevIndex < 0 || nextIndex < 0 || prevIndex >= connects.length || nextIndex >= connects.length) continue

            const presetLine = lines.find(l => l.id === section.lineId)
            const lineColor = presetLine?.color ?? ''
            const numIconPresetKey = presetLine?.numIconPresetKey ?? ''
            const resolvedLineKey = presetLine ? resolveLineKey(presetLine) : ''

            // 前駅→次駅の方向（昇順 or 降順）にインデックスを列挙
            const indices: number[] = []
            if (prevIndex <= nextIndex) {
                for (let i = prevIndex; i <= nextIndex; i++) indices.push(i)
            } else {
                for (let i = prevIndex; i >= nextIndex; i--) indices.push(i)
            }

            for (const idx of indices) {
                const connect = connects[idx]
                // 連続区間の接続駅（重複）をスキップ: 路線ID+インデックスをキーにする
                const key = `${section.lineId}::${idx}`
                if (key === lastKey) continue
                lastKey = key
                const station = allStations.find(s => s.id === connect.stationId)
                if (!station) continue
                // 路線が変わる接続駅（前区間の最終駅＝次区間の開始駅）は1行に統合する。
                // numIcon（前の路線）はそのまま残し、次の路線のナンバリングを numIconNext に入れる。
                // lineId は「この駅以降の区間路線ID」なので次の路線で上書きする
                const prev = result[result.length - 1]
                if (prev && lastStationId === station.id) {
                    // 同じ路線の区間どうし（環状線の継ぎ目）は同じ駅を通過するだけなので、統合のみで値は変えない
                    if (lastSectionLineId === section.lineId) continue
                    prev.numIconNext = toNumIcon(connect.number, lineColor, numIconPresetKey)
                    prev.lineId = resolvedLineKey
                    lastSectionLineId = section.lineId
                    continue
                }
                result.push(toStationType(station, lineColor, connect.number, resolvedLineKey, numIconPresetKey))
                lastStationId = station.id
                lastSectionLineId = section.lineId
            }
        }
        return { stations: result, newLines, newIcons }
    }

    // 路線図から駅が選ばれたときの処理。
    // ルートの区間（環状線の継ぎ目をまたぐ場合は2区間）は StationPresetMap 側で解決済みのものを受け取る。
    // 始点駅の選択時は sections が空配列
    const handleMapSelect = (sections: StationSection[], station: PresetStation, nextStationName?: string) => {
        if (sections.length === 0) {
            // 始点駅の選択（この時点では区間を作らない）
            setPrevStation({ station, lineId: '', index: -1 })
            return
        }
        setStagingList(prev => [...prev, { sections, nextStationName }])
        // 選択駅を新しい始点駅にする
        const last = sections[sections.length - 1]
        setPrevStation({ station, lineId: last.lineId, index: last.nextIndex })
    }

    // 戻るボタン → 末尾のルートを丸ごと削除し、前駅を巻き戻す
    const handleBack = () => {
        if (stagingList.length === 0) return
        const newList = stagingList.slice(0, -1)
        setStagingList(newList)
        if (newList.length === 0) {
            // 全区間が消えた場合は firstStation 状態に戻す
            setPrevStation(null)
        } else {
            // 末尾に残ったルートの最後の区間の nextIndex の駅を新しい前駅に設定
            const lastRoute = newList[newList.length - 1]
            const lastSection = lastRoute.sections[lastRoute.sections.length - 1]
            const connects = lineConnects.filter(c => c.lineId === lastSection.lineId)
            const connect = connects[lastSection.nextIndex]
            const station = allStations.find(s => s.id === connect?.stationId)
            setPrevStation(station ? { station, lineId: lastSection.lineId, index: lastSection.nextIndex } : null)
        }
        setSelectedLineId(null)
    }

    // 追加ボタン → 区間から駅を展開して onAdd を呼ぶ
    const handleAdd = () => {
        if (stagingList.length === 0) return
        onAdd(extractStationsFromSections())
        onClose()
    }

    // ルートの表示ラベルを生成: 「前駅名 → 次駅名（路線名）」
    // 前駅はルートの最初の区間の始点、次駅は最後の区間の終点。
    // ルート選択ポップアップで選んだルートは「（路線名・次駅：○○）」とする
    const getRouteLabel = (route: StagedRoute): string => {
        const first = route.sections[0]
        const last = route.sections[route.sections.length - 1]
        const stationNameAt = (section: StationSection, index: number): string => {
            const connects = lineConnects.filter(c => c.lineId === section.lineId)
            return allStations.find(s => s.id === connects[index]?.stationId)?.name ?? `駅${index}`
        }
        const prevName = stationNameAt(first, first.prevIndex)
        const nextName = stationNameAt(last, last.nextIndex)
        const lineName = lines.find(l => l.id === first.lineId)?.name ?? first.lineId
        const nextHint = route.nextStationName ? `・次駅：${route.nextStationName}` : ''
        // 中間駅数: ルート上の駅を区間順に並べ（区間の継ぎ目で同じ駅が続く場合は1駅とする）、両端を除いた数
        const routeStationIds: string[] = []
        for (const section of route.sections) {
            const connects = lineConnects.filter(c => c.lineId === section.lineId)
            const step = section.prevIndex <= section.nextIndex ? 1 : -1
            for (let i = section.prevIndex; ; i += step) {
                const sid = connects[i]?.stationId
                if (sid !== undefined && routeStationIds[routeStationIds.length - 1] !== sid) routeStationIds.push(sid)
                if (i === section.nextIndex) break
            }
        }
        const midCount = Math.max(routeStationIds.length - 2, 0)
        return `${prevName} → ${nextName}（${lineName}${nextHint}） 中間駅数：${midCount}`
    }

    // 与えられた駅（index = stationsForLine 上の位置）が prevStation と同一かどうか判定
    // 同路線: 駅ID + インデックス両方一致（環状線で終端選択を許可するため）
    // 異路線: 駅IDのみ一致で判定（乗り換え後も同一駅をブロック）
    const isPrevStation = (station: PresetStation, index: number): boolean => {
        if (prevStation === null) return false
        if (selectedLineId === prevStation.lineId) {
            return station.id === prevStation.station.id && index === prevStation.index
        }
        return station.id === prevStation.station.id
    }

    // ガイダンステキストを状態に応じて生成
    const getGuidanceText = (): string => {
        // 路線図は駅を直接クリックするため、路線選択の案内は出さない
        if (viewMode === 'map') {
            if (prevStation === null) return '路線図から開始駅を選択してください'
            return `「${prevStation.station.name}」からハイライトされた駅を選択してください`
        }
        if (prevStation === null) {
            if (selectedLineId === null) return '開始駅の路線を選択してください'
            return '開始駅を選択してください'
        }
        if (selectedLineId === null) return `「${prevStation.station.name}」から続く路線を選択してください`
        return `「${prevStation.station.name}」の次の駅を選択してください`
    }

    const guidanceText = getGuidanceText()

    return (
        // 枠外クリックで閉じる
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-dialog modal-dialog--tall" style={{ width: viewMode === 'map' ? 'min(1100px, 95vw)' : 'min(700px, 90vw)' }}
                onClick={e => e.stopPropagation()}>
                {/* タイトル行: 右端に × ボタンを配置 */}
                <div className="modal-title-row">
                    <p className="modal-title">駅プリセットから追加</p>
                    <button className="modal-close-btn" onClick={onClose} title="閉じる">×</button>
                </div>

                {/* 選択方法の切り替え（路線図からの選択を主とし、リスト選択は補助として残す）。
                    追加一覧・始点駅の状態は共通なので、途中で切り替えても続きから操作できる */}
                <div className="btn-group" style={{ marginBottom: 0 }}>
                    <button className={viewMode === 'map' ? 'btn-primary' : 'btn-secondary'} onClick={() => setViewMode('map')}>路線図から選択</button>
                    <button className={viewMode === 'list' ? 'btn-primary' : 'btn-secondary'} onClick={() => setViewMode('list')}>リストから選択</button>
                </div>

                {loadError && (
                    <p style={{ color: 'var(--danger)', margin: 0 }}>{loadError}</p>
                )}

                {/* 操作ガイダンステキスト（常に表示） */}
                <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600, padding: '4px 0' }}>
                    {guidanceText}
                </div>

                {/* 路線選択・駅選択・追加一覧を左から横並びに配置 */}
                <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {viewMode === 'list' ? (<>
                    {/* 路線選択リスト（常に操作可、選択中路線をハイライト） */}
                    <div style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>路線選択</div>
                        <div style={{
                            flex: 1, overflow: 'auto', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', background: 'var(--bg-base)',
                        }}>
                            {filteredLines.map(line => (
                                <div
                                    key={line.id}
                                    onClick={() => handleLineClick(line.id)}
                                    style={{
                                        padding: '6px 10px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--border)',
                                        ...(selectedLineId === line.id ? highlightStyle : {}),
                                    }}
                                >{line.name}</div>
                            ))}
                            {lines.length === 0 && !loadError && (
                                <div style={{ padding: '10px', color: 'var(--text-muted)' }}>読み込み中...</div>
                            )}
                            {lines.length > 0 && filteredLines.length === 0 && (
                                <div style={{ padding: '10px', color: 'var(--text-muted)' }}>接続路線なし</div>
                            )}
                        </div>
                    </div>

                    {/* 駅選択リスト（同路線+同インデックスの前駅はグレーアウト・選択不可） */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            駅選択
                        </div>
                        <div style={{
                            flex: 1, overflow: 'auto', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', background: 'var(--bg-base)',
                        }}>
                            {stationsForLine.map((station, i) => {
                                const isDisabled = isPrevStation(station, i)
                                return (
                                    <div
                                        key={i}
                                        onClick={isDisabled ? undefined : () => handleStationClick(station, i)}
                                        style={{
                                            padding: '6px 10px',
                                            cursor: isDisabled ? 'default' : 'pointer',
                                            borderBottom: '1px solid var(--border)',
                                            display: 'flex',
                                            gap: '8px',
                                            alignItems: 'center',
                                            ...(isDisabled ? { opacity: 0.4, pointerEvents: 'none' } : {}),
                                        }}
                                        className="station-preset-row"
                                    >
                                        <span>{station.name}</span>
                                    </div>
                                )
                            })}
                            {!selectedLineId && (
                                <div style={{ padding: '10px', color: 'var(--text-muted)' }}>路線を選択してください</div>
                            )}
                            {selectedLineId && stationsForLine.length === 0 && (
                                <div style={{ padding: '10px', color: 'var(--text-muted)' }}>駅データがありません</div>
                            )}
                        </div>
                    </div>

                    </>) : (
                    /* 路線図から選択（仮実装）。駅ノードは駅IDごとに1つで、乗換駅からは複数路線が伸びる */
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>路線図</div>
                        <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                            <StationPresetMap
                                lines={lines}
                                allStations={allStations}
                                lineConnects={lineConnects}
                                transfers={transfers}
                                startStationId={prevStation?.station.id ?? null}
                                onSelect={handleMapSelect}
                            />
                        </div>
                    </div>
                    )}

                    {/* 追加一覧リスト（駅選択の右に同形式で配置） */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            追加一覧
                        </div>
                        <div style={{
                            flex: 1, overflow: 'auto', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', background: 'var(--bg-base)',
                        }}>
                            {stagingList.map((route, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: '6px 10px',
                                        borderBottom: '1px solid var(--border)',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {getRouteLabel(route)}
                                </div>
                            ))}
                            {stagingList.length === 0 && (
                                <div style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    区間を追加すると表示されます
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* フッター */}
                <div className="modal-footer">
                    <button onClick={handleBack} className="btn-secondary" disabled={stagingList.length === 0}>戻る</button>
                    <button onClick={handleAdd} className="btn-primary" disabled={stagingList.length === 0}>追加</button>
                </div>
            </div>
        </div>
    )
}

export default StationPresetPopup
