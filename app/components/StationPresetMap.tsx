"use client"

import React, { useMemo } from 'react'
import { PresetLine, PresetStation, PresetLineConnect, PresetTransfer } from '../modules/loadStationPresets'

type Props = {
    lines: PresetLine[]
    allStations: PresetStation[]
    lineConnects: PresetLineConnect[]
    // 乗換エッジ（表示のみ。ハイライト・区間選択には影響しない）
    transfers: PresetTransfer[]
    // 始点駅のID（null のときは全駅がクリック可能）
    startStationId: string | null
    // 駅クリック時のコールバック。区間の路線と駅順インデックスは本コンポーネントで解決して渡す
    onSelect: (lineId: string, prevIndex: number, nextIndex: number, station: PresetStation) => void
}

// 駅間が詰まって駅名が重ならないよう、緯度方向の全長をこの高さに合わせて描画し、
// 収まりきらない分はコンテナ側のスクロールで見る（全体を縮小表示すると判読できないため）
const MAP_HEIGHT = 1500
const PADDING = 40
// 駅名ラベルは右側に伸びるため、その分の余白を確保する
const LABEL_SPACE = 150
const NODE_R = 7

// 路線図の配置座標（緯度経度 → viewBox 座標）
type Pos = { x: number, y: number }

const StationPresetMap: React.FC<Props> = ({ lines, allStations, lineConnects, transfers, startStationId, onSelect }) => {
    // 路線ID → その路線の駅ID順（lineConnectDB の並び順がそのまま駅順になる）
    const orderByLine = useMemo(() => {
        const map = new Map<string, string[]>()
        for (const c of lineConnects) {
            if (!map.has(c.lineId)) map.set(c.lineId, [])
            map.get(c.lineId)!.push(c.stationId)
        }
        return map
    }, [lineConnects])

    // 緯度経度を viewBox 座標へ変換する。
    // 経度→x、緯度→y（北が上になるよう符号反転）。縦横比が崩れないよう等方スケールで正規化する
    const { posById, viewW, viewH } = useMemo(() => {
        const result = new Map<string, Pos>()
        const pts = allStations.filter(s => s.lat !== null && s.lon !== null)
        if (pts.length === 0) return { posById: result, viewW: 100, viewH: 100 }
        const lats = pts.map(s => s.lat as number)
        const lons = pts.map(s => s.lon as number)
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLon = Math.min(...lons), maxLon = Math.max(...lons)
        const spanLon = maxLon - minLon || 1
        const spanLat = maxLat - minLat || 1
        // 緯度方向の全長が MAP_HEIGHT になる等方スケール（経度と緯度で縦横比を崩さない）
        const scale = (MAP_HEIGHT - PADDING * 2) / spanLat
        for (const s of pts) {
            result.set(s.id, {
                x: PADDING + ((s.lon as number) - minLon) * scale,
                y: PADDING + (maxLat - (s.lat as number)) * scale,
            })
        }
        return {
            posById: result,
            viewW: PADDING * 2 + spanLon * scale + LABEL_SPACE,
            viewH: MAP_HEIGHT,
        }
    }, [allStations])

    // 始点駅を通る路線のID集合（始点未選択なら全路線）
    const activeLineIds = useMemo(() => {
        if (startStationId === null) return new Set(lines.map(l => l.id))
        const set = new Set<string>()
        for (const [lineId, order] of orderByLine) {
            if (order.includes(startStationId)) set.add(lineId)
        }
        return set
    }, [startStationId, orderByLine, lines])

    // クリック可能な駅ID集合（＝ハイライト中の路線上の全駅）
    const selectableIds = useMemo(() => {
        const set = new Set<string>()
        for (const lineId of activeLineIds) {
            for (const sid of orderByLine.get(lineId) ?? []) set.add(sid)
        }
        if (startStationId !== null) set.delete(startStationId)
        return set
    }, [activeLineIds, orderByLine, startStationId])

    // 始点駅から対象駅までの区間を一意に決める。
    // 乗換駅同士では候補路線が複数ありえ、環状線では同一路線内にも候補が複数ありうるため、
    // 「区間の駅数が最少 → 路線IDが小さい → 始点indexが小さい」の順で選ぶ
    const resolveSection = (targetId: string): { lineId: string, prevIndex: number, nextIndex: number } | null => {
        if (startStationId === null) return null
        let best: { lineId: string, prevIndex: number, nextIndex: number } | null = null
        const lineIds = [...activeLineIds].sort((a, b) => Number(a) - Number(b))
        for (const lineId of lineIds) {
            const order = orderByLine.get(lineId) ?? []
            for (let i = 0; i < order.length; i++) {
                if (order[i] !== startStationId) continue
                for (let j = 0; j < order.length; j++) {
                    if (order[j] !== targetId) continue
                    const span = Math.abs(j - i)
                    if (span === 0) continue
                    if (!best || span < Math.abs(best.nextIndex - best.prevIndex)) {
                        best = { lineId, prevIndex: i, nextIndex: j }
                    }
                }
            }
        }
        return best
    }

    const handleClick = (station: PresetStation) => {
        if (startStationId === null) {
            // 始点駅の選択（区間はまだ作らない）
            onSelect('', -1, -1, station)
            return
        }
        const sec = resolveSection(station.id)
        if (!sec) return
        onSelect(sec.lineId, sec.prevIndex, sec.nextIndex, station)
    }

    return (
        <div style={{ overflow: 'auto', width: '100%', height: '100%', background: 'var(--bg-base)' }}>
            <svg viewBox={`0 0 ${viewW} ${viewH}`} width={viewW} height={viewH} style={{ display: 'block' }}>
                {/* 乗換エッジ（別々の駅IDを持つ駅同士）。路線・駅ノードより下にグレーの点線で描画し、クリックは受け付けない */}
                {transfers.map((t, i) => {
                    const p1 = posById.get(t.stationId1)
                    const p2 = posById.get(t.stationId2)
                    if (!p1 || !p2) return null
                    return (
                        <line
                            key={`transfer-${i}`}
                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke="var(--text-muted)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            style={{ pointerEvents: 'none' }}
                        />
                    )
                })}

                {/* 路線（駅順に駅ノードを結ぶ折れ線）。ハイライト対象外はグレーで描画する */}
                {lines.map(line => {
                    const order = orderByLine.get(line.id) ?? []
                    const pts = order.map(sid => posById.get(sid)).filter((p): p is Pos => !!p)
                    if (pts.length < 2) return null
                    const isActive = activeLineIds.has(line.id)
                    return (
                        <polyline
                            key={line.id}
                            points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={isActive ? (line.color || '#888') : 'var(--border)'}
                            strokeWidth={isActive ? 6 : 4}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            opacity={isActive ? 1 : 0.35}
                        />
                    )
                })}

                {/* 駅ノード。始点＝オレンジ、選択可能＝白、それ以外＝グレーアウト */}
                {allStations.map(station => {
                    const p = posById.get(station.id)
                    if (!p) return null
                    const isStart = station.id === startStationId
                    const isSelectable = isStart ? false : selectableIds.has(station.id)
                    const fill = isStart ? '#ff9800' : isSelectable ? '#ffffff' : 'var(--bg-overlay)'
                    const clickable = isStart ? false : isSelectable
                    return (
                        <g
                            key={station.id}
                            onClick={clickable ? () => handleClick(station) : undefined}
                            style={{
                                cursor: clickable ? 'pointer' : 'default',
                                opacity: isStart || isSelectable ? 1 : 0.3,
                            }}
                        >
                            <circle cx={p.x} cy={p.y} r={NODE_R} fill={fill} stroke="var(--text-primary)" strokeWidth={2} />
                            <text
                                x={p.x + NODE_R + 3}
                                y={p.y + 4}
                                fontSize="13"
                                fill={isStart ? '#ff9800' : isSelectable ? 'var(--text-primary)' : 'var(--text-muted)'}
                                style={{ userSelect: 'none', pointerEvents: 'none' }}
                            >
                                {station.name}
                            </text>
                            {/* クリック判定を広げるための透明な円（ラベルと重なっても押しやすくする） */}
                            {clickable && <circle cx={p.x} cy={p.y} r={NODE_R + 6} fill="transparent" />}
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

export default StationPresetMap
