"use client"

import React, { useState, useEffect } from 'react'
import "../type"
import {
    loadLineDB, loadStationDB, loadLineConnectDB,
    PresetLine, PresetStation, PresetLineConnect
} from '../modules/loadStationPresets'

type Props = {
    onAdd: (stations: stationType[]) => void   // 追加確定時のコールバック
    onClose: () => void
}

// 区間オブジェクト: 路線ID・前駅インデックス・次駅インデックス
// インデックスは lineConnects（同一路線IDで絞り込んだ配列）上の位置（一意）
type StationSection = {
    lineId: string
    prevIndex: number
    nextIndex: number
}

// 前駅参照: 駅データ・選択時の路線ID・lineConnects 上の位置インデックスをまとめて保持
type PrevStationRef = {
    station: PresetStation
    lineId: string
    index: number
}

// プリセット駅から stationType を生成する（lineColor・number は lineConnectDB から取得、その他未設定は暫定デフォルト）
const toStationType = (station: PresetStation, lineColor: string, number: string): stationType => ({
    name: station.name,
    kana: station.kana,
    eng: station.eng,
    number,
    lineColor,
    numIconPresetKey: "N_tokyu",  // 暫定デフォルト
    lineNumberType: "0",
    transfers: "",
    isPass: false,
    sectionTime: "",
    lineId: "",
    coordinate: [null, null],
    transferText: "",
    transferTextEng: "",
    doorSide: "left",
    transferCountLineP: "",
    otherLineInd: "",
    slotNum: "0",
    leftSlotInd: "0",
    otherCarNum: "0",
    otherLeftSlotInd: "0",
})

// 駅・路線の選択ハイライトに使うスタイル
const highlightStyle = {
    background: 'var(--accent-dim)',
    color: 'var(--accent-hover)',
    fontWeight: 700,
} as const

const StationPresetPopup: React.FC<Props> = ({ onAdd, onClose }) => {
    const [lines, setLines] = useState<PresetLine[]>([])
    const [allStations, setAllStations] = useState<PresetStation[]>([])
    const [lineConnects, setLineConnects] = useState<PresetLineConnect[]>([])
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
    // 区間の開始駅（前駅）: null = firstStation 状態、値あり = continuing 状態
    const [prevStation, setPrevStation] = useState<PrevStationRef | null>(null)
    // 追加一覧（区間オブジェクトの配列）
    const [stagingList, setStagingList] = useState<StationSection[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)

    // マウント時に CSV を読み込む
    useEffect(() => {
        Promise.all([loadLineDB(), loadStationDB(), loadLineConnectDB()])
            .then(([lineData, stationData, connectData]) => {
                setLines(lineData)
                setAllStations(stationData)
                setLineConnects(connectData)
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
                    setStagingList(prev => [...prev, section])
                }
            }
            // 選択駅を新しい前駅に更新
            setPrevStation({ station, lineId: selectedLineId!, index })
        }
        // 駅選択後は路線・駅の選択をリセット
        setSelectedLineId(null)
    }

    // 各区間から駅を展開し、連続区間の接続駅の重複を除去して stationType[] に変換
    const extractStationsFromSections = (): stationType[] => {
        const result: stationType[] = []
        // 前の区間の最後の lineConnects エントリキー（重複除去用）
        let lastKey: string | null = null

        for (const section of stagingList) {
            const connects = lineConnects.filter(c => c.lineId === section.lineId)
            const { prevIndex, nextIndex } = section
            if (prevIndex < 0 || nextIndex < 0 || prevIndex >= connects.length || nextIndex >= connects.length) continue

            // 前駅→次駅の方向（昇順 or 降順）にインデックスを列挙
            const lineColor = lines.find(l => l.id === section.lineId)?.color ?? ''
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
                if (station) result.push(toStationType(station, lineColor, connect.number))
            }
        }
        return result
    }

    // 戻るボタン → 末尾の区間を削除し、前駅を巻き戻す
    const handleBack = () => {
        if (stagingList.length === 0) return
        const newList = stagingList.slice(0, -1)
        setStagingList(newList)
        if (newList.length === 0) {
            // 全区間が消えた場合は firstStation 状態に戻す
            setPrevStation(null)
        } else {
            // 末尾に残った区間の nextIndex の駅を新しい前駅に設定
            const lastSection = newList[newList.length - 1]
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

    // 区間の表示ラベルを生成: 「前駅名 → 次駅名（路線名）」
    const getSectionLabel = (section: StationSection): string => {
        const connects = lineConnects.filter(c => c.lineId === section.lineId)
        const prevName = allStations.find(s => s.id === connects[section.prevIndex]?.stationId)?.name ?? `駅${section.prevIndex}`
        const nextName = allStations.find(s => s.id === connects[section.nextIndex]?.stationId)?.name ?? `駅${section.nextIndex}`
        const lineName = lines.find(l => l.id === section.lineId)?.name ?? section.lineId
        return `${prevName} → ${nextName}（${lineName}）`
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
            <div className="modal-dialog modal-dialog--tall" style={{ width: 'min(700px, 90vw)' }}
                onClick={e => e.stopPropagation()}>
                {/* タイトル行: 右端に × ボタンを配置 */}
                <div className="modal-title-row">
                    <p className="modal-title">駅プリセットから追加</p>
                    <button className="modal-close-btn" onClick={onClose} title="閉じる">×</button>
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

                    {/* 追加一覧リスト（駅選択の右に同形式で配置） */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            追加一覧
                        </div>
                        <div style={{
                            flex: 1, overflow: 'auto', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', background: 'var(--bg-base)',
                        }}>
                            {stagingList.map((section, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: '6px 10px',
                                        borderBottom: '1px solid var(--border)',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {getSectionLabel(section)}
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
