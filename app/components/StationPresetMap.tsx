"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
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

// 全体表示時に画面端へ確保する余白（px）
const PADDING = 40
const NODE_R = 7
// 押してから離すまでの移動量がこれ未満ならクリック、以上ならドラッグとみなす（px）
const DRAG_THRESHOLD = 4
// 倍率（1km あたりの画面 px）の上限
const MAX_SCALE = 400
// 駅ノード・駅名を表示する倍率の閾値（px/km）。実データを見ながら調整する
const NODE_MIN_SCALE = 15
const LABEL_MIN_SCALE = 40
// 画面外判定で画面の上下左右に含める余白（px）
const CULL_MARGIN = 50
// ホイール1目盛り（deltaY = 100）あたりの拡大率、ボタン1回あたりの拡大率
const WHEEL_ZOOM_STEP = 1.2
const BUTTON_ZOOM_STEP = 1.5
// 緯度・経度1度あたりの距離（km）
const KM_PER_DEG_LAT = 110.57
const KM_PER_DEG_LON = 111.32

// km 単位の平面座標（ワールド座標）
type Pos = { x: number, y: number }
type Bounds = { minX: number, minY: number, maxX: number, maxY: number }
// 表示状態: scale = 1km あたりの画面 px、offsetX/Y = 画面左上に来るワールド座標（km）
type View = { scale: number, offsetX: number, offsetY: number }
type Size = { w: number, h: number }

// 全駅が余白 PADDING で収まる表示状態を求める
const computeFitView = (bounds: Bounds, size: Size): View => {
    const spanX = bounds.maxX - bounds.minX
    const spanY = bounds.maxY - bounds.minY
    const availW = Math.max(size.w - PADDING * 2, 1)
    const availH = Math.max(size.h - PADDING * 2, 1)
    // 駅が1つしかない等で範囲が0のときは、適当な倍率（駅名が見える程度）にする
    const scale = Math.min(
        spanX > 0 ? availW / spanX : Infinity,
        spanY > 0 ? availH / spanY : Infinity,
        MAX_SCALE,
    )
    const s = isFinite(scale) ? scale : LABEL_MIN_SCALE
    const cx = (bounds.minX + bounds.maxX) / 2
    const cy = (bounds.minY + bounds.maxY) / 2
    return { scale: s, offsetX: cx - size.w / 2 / s, offsetY: cy - size.h / 2 / s }
}

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

    // 緯度経度を km 単位のワールド座標へ変換する（データ読み込み時に1回だけ計算）。
    // 経度→x、緯度→y（北が上になるよう符号反転）。基準緯度の cos を掛けて経度方向の伸びを補正する
    const { worldById, bounds } = useMemo(() => {
        const result = new Map<string, Pos>()
        const pts = allStations.filter(s => s.lat !== null && s.lon !== null)
        if (pts.length === 0) return { worldById: result, bounds: null as Bounds | null }
        let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
        for (const s of pts) {
            const lat = s.lat as number, lon = s.lon as number
            if (lat < minLat) minLat = lat
            if (lat > maxLat) maxLat = lat
            if (lon < minLon) minLon = lon
            if (lon > maxLon) maxLon = lon
        }
        // 基準点は全駅の範囲の中心
        const refLat = (minLat + maxLat) / 2
        const refLon = (minLon + maxLon) / 2
        const kmPerLon = KM_PER_DEG_LON * Math.cos(refLat * Math.PI / 180)
        const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
        for (const s of pts) {
            const x = ((s.lon as number) - refLon) * kmPerLon
            const y = (refLat - (s.lat as number)) * KM_PER_DEG_LAT
            result.set(s.id, { x, y })
            if (x < b.minX) b.minX = x
            if (y < b.minY) b.minY = y
            if (x > b.maxX) b.maxX = x
            if (y > b.maxY) b.maxY = y
        }
        return { worldById: result, bounds: b }
    }, [allStations])

    // 路線ごとの折れ線（ワールド座標）とその範囲。画面外の路線を描画しない判定に使う
    const linePaths = useMemo(() => {
        return lines.map(line => {
            const order = orderByLine.get(line.id) ?? []
            const pts = order.map(sid => worldById.get(sid)).filter((p): p is Pos => !!p)
            const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
            for (const p of pts) {
                if (p.x < b.minX) b.minX = p.x
                if (p.y < b.minY) b.minY = p.y
                if (p.x > b.maxX) b.maxX = p.x
                if (p.y > b.maxY) b.maxY = p.y
            }
            return { line, pts, bounds: b }
        }).filter(lp => lp.pts.length >= 2)
    }, [lines, orderByLine, worldById])

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

    // 駅ID → 駅データ（クリック時の駅の特定用）
    const stationById = useMemo(() => new Map(allStations.map(s => [s.id, s])), [allStations])

    // ---- 表示状態（ビュー）とコンテナの大きさ ----
    const containerRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState<Size | null>(null)
    const [view, setView] = useState<View | null>(null)
    // イベントハンドラから最新値を参照するための ref（state と常に同期させる）
    const viewRef = useRef<View | null>(null)
    const sizeRef = useRef<Size | null>(null)
    const boundsRef = useRef<Bounds | null>(null)
    boundsRef.current = bounds
    // requestAnimationFrame で反映待ちのビュー（ドラッグ・ホイール中の再描画を1フレーム1回にまとめる）
    const pendingViewRef = useRef<View | null>(null)
    const rafIdRef = useRef<number | null>(null)

    // ビューを更新する。immediate でなければ次のフレームでまとめて state に反映する
    const applyView = (v: View, immediate = false) => {
        viewRef.current = v
        if (immediate) {
            if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = null
            pendingViewRef.current = null
            setView(v)
            return
        }
        pendingViewRef.current = v
        if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null
                if (pendingViewRef.current) setView(pendingViewRef.current)
                pendingViewRef.current = null
            })
        }
    }

    // アンマウント時に未実行のフレーム予約を取り消す
    useEffect(() => () => {
        if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    }, [])

    // 倍率の下限（全体表示の倍率の 0.5 倍）
    const getMinScale = (): number => {
        const b = boundsRef.current, s = sizeRef.current
        if (!b || !s) return 0
        return computeFitView(b, s).scale * 0.5
    }

    // 画面上の点 (px, py) を中心に倍率を factor 倍する（範囲外は上下限に丸める）
    const zoomAt = (factor: number, px: number, py: number, immediate = false) => {
        const v = viewRef.current
        if (!v) return
        const newScale = Math.min(MAX_SCALE, Math.max(getMinScale(), v.scale * factor))
        // 拡大縮小の前後で、カーソル下のワールド座標が同じ画面位置に留まるよう offset を調整する
        const wx = v.offsetX + px / v.scale
        const wy = v.offsetY + py / v.scale
        applyView({ scale: newScale, offsetX: wx - px / newScale, offsetY: wy - py / newScale }, immediate)
    }

    // コンテナの大きさを監視する。大きさが変わっても表示中の中心位置は保つ
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const ro = new ResizeObserver(entries => {
            const rect = entries[0].contentRect
            const newSize = { w: rect.width, h: rect.height }
            if (newSize.w === 0 || newSize.h === 0) return
            const oldSize = sizeRef.current
            const v = viewRef.current
            if (oldSize && v) {
                const cx = v.offsetX + oldSize.w / 2 / v.scale
                const cy = v.offsetY + oldSize.h / 2 / v.scale
                applyView({ scale: v.scale, offsetX: cx - newSize.w / 2 / v.scale, offsetY: cy - newSize.h / 2 / v.scale }, true)
            }
            sizeRef.current = newSize
            setSize(newSize)
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // 初期表示: 駅データとコンテナの大きさが揃った時点で全体表示にする
    useEffect(() => {
        if (view === null && bounds && size) applyView(computeFitView(bounds, size), true)
    }, [bounds, size, view])

    // ホイールで拡大縮小する。ポップアップ自体をスクロールさせないよう passive: false で登録する
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const rect = el.getBoundingClientRect()
            // トラックパッド等の細かい deltaY にも対応できるよう、deltaY 100 で1目盛りとして連続的に扱う
            const factor = Math.pow(WHEEL_ZOOM_STEP, -e.deltaY / 100)
            zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
        // zoomAt は ref 経由で最新値を参照するため、登録は1回でよい
    }, [])

    // ---- ドラッグ移動・クリック判定 ----
    // ドラッグ中の情報。downStationId は押した位置にあった駅（クリック判定に使う）
    const dragRef = useRef<{ pointerId: number, startX: number, startY: number, lastX: number, lastY: number, moved: boolean, downStationId: string | null } | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // 主ボタン（左クリック・タッチ・ペン）のみ扱う
        if (e.button !== 0 || dragRef.current) return
        // 駅ノードの上から始めた場合も移動できる。押した駅はクリック判定のために覚えておく
        const stationEl = (e.target as Element).closest('[data-station-id]')
        dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX, startY: e.clientY,
            lastX: e.clientX, lastY: e.clientY,
            moved: false,
            downStationId: stationEl?.getAttribute('data-station-id') ?? null,
        }
        e.currentTarget.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = dragRef.current
        if (!d || d.pointerId !== e.pointerId) return
        if (!d.moved) {
            // 閾値未満の移動はクリックの揺れとみなし、地図を動かさない
            if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return
            d.moved = true
            setIsDragging(true)
        }
        const v = viewRef.current
        if (v) {
            const dx = e.clientX - d.lastX
            const dy = e.clientY - d.lastY
            applyView({ scale: v.scale, offsetX: v.offsetX - dx / v.scale, offsetY: v.offsetY - dy / v.scale })
        }
        d.lastX = e.clientX
        d.lastY = e.clientY
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = dragRef.current
        if (!d || d.pointerId !== e.pointerId) return
        dragRef.current = null
        setIsDragging(false)
        // ほとんど動かさずに離した場合のみクリックとして駅を選択する
        if (!d.moved && d.downStationId !== null) {
            const station = stationById.get(d.downStationId)
            const clickable = d.downStationId !== startStationId && selectableIds.has(d.downStationId)
            if (station && clickable) handleClick(station)
        }
    }

    const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId !== e.pointerId) return
        dragRef.current = null
        setIsDragging(false)
    }

    // ---- ボタン操作 ----
    const zoomAtCenter = (factor: number) => {
        const s = sizeRef.current
        if (s) zoomAt(factor, s.w / 2, s.h / 2, true)
    }

    const fitAll = () => {
        if (bounds && size) applyView(computeFitView(bounds, size), true)
    }

    // 始点駅を画面中央へ移動する（倍率は変えない）
    const startPos = startStationId !== null ? worldById.get(startStationId) : undefined
    const moveToStart = () => {
        const v = viewRef.current, s = sizeRef.current
        if (!v || !s || !startPos) return
        applyView({ scale: v.scale, offsetX: startPos.x - s.w / 2 / v.scale, offsetY: startPos.y - s.h / 2 / v.scale }, true)
    }

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

    // ---- 描画 ----
    // 画面座標で直接描くため、ズームしてもノード・文字・線の大きさは一定になる
    const renderContent = () => {
        if (!view || !size) return null
        const { scale, offsetX, offsetY } = view
        const toScreen = (p: Pos): Pos => ({ x: (p.x - offsetX) * scale, y: (p.y - offsetY) * scale })
        // 画面内判定（上下左右に CULL_MARGIN の余白を含める）
        const inScreen = (p: Pos) =>
            p.x >= -CULL_MARGIN && p.x <= size.w + CULL_MARGIN && p.y >= -CULL_MARGIN && p.y <= size.h + CULL_MARGIN
        // 表示範囲（ワールド座標）。路線の範囲と重なるかの判定に使う
        const margin = CULL_MARGIN / scale
        const visMinX = offsetX - margin, visMaxX = offsetX + size.w / scale + margin
        const visMinY = offsetY - margin, visMaxY = offsetY + size.h / scale + margin

        const showNodes = scale >= NODE_MIN_SCALE
        const showLabels = scale >= LABEL_MIN_SCALE

        // 表示対象の駅（ズームアウト時は始点駅のみ）
        const visibleStations: { station: PresetStation, p: Pos }[] = []
        if (showNodes) {
            for (const station of allStations) {
                const w = worldById.get(station.id)
                if (!w) continue
                const p = toScreen(w)
                if (inScreen(p)) visibleStations.push({ station, p })
            }
        } else if (startStationId !== null && startPos) {
            const station = stationById.get(startStationId)
            if (station) visibleStations.push({ station, p: toScreen(startPos) })
        }

        return (
            <>
                {/* 乗換エッジ（別々の駅IDを持つ駅同士）。路線・駅ノードより下にグレーの点線で描画し、クリックは受け付けない */}
                {showNodes && transfers.map((t, i) => {
                    const w1 = worldById.get(t.stationId1)
                    const w2 = worldById.get(t.stationId2)
                    if (!w1 || !w2) return null
                    const p1 = toScreen(w1), p2 = toScreen(w2)
                    // 両端とも画面外なら描画しない
                    if (!inScreen(p1) && !inScreen(p2)) return null
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
                {linePaths.map(({ line, pts, bounds: lb }) => {
                    // 路線の範囲が表示範囲と重ならなければ描画しない
                    if (lb.maxX < visMinX || lb.minX > visMaxX || lb.maxY < visMinY || lb.minY > visMaxY) return null
                    const isActive = activeLineIds.has(line.id)
                    return (
                        <polyline
                            key={line.id}
                            points={pts.map(w => `${(w.x - offsetX) * scale},${(w.y - offsetY) * scale}`).join(' ')}
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
                {visibleStations.map(({ station, p }) => {
                    const isStart = station.id === startStationId
                    const isSelectable = isStart ? false : selectableIds.has(station.id)
                    const fill = isStart ? '#ff9800' : isSelectable ? '#ffffff' : 'var(--bg-overlay)'
                    const clickable = isStart ? false : isSelectable
                    // クリックはコンテナの pointerup で判定するため、ここでは駅IDを属性に持たせるだけにする
                    return (
                        <g
                            key={station.id}
                            data-station-id={station.id}
                            style={{
                                cursor: isDragging ? 'grabbing' : clickable ? 'pointer' : 'grab',
                                opacity: isStart || isSelectable ? 1 : 0.3,
                            }}
                        >
                            <circle cx={p.x} cy={p.y} r={NODE_R} fill={fill} stroke="var(--text-primary)" strokeWidth={2} />
                            {(showLabels || isStart) && (
                                <text
                                    x={p.x + NODE_R + 3}
                                    y={p.y + 4}
                                    fontSize="13"
                                    fill={isStart ? '#ff9800' : isSelectable ? 'var(--text-primary)' : 'var(--text-muted)'}
                                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                                >
                                    {station.name}
                                </text>
                            )}
                            {/* クリック判定を広げるための透明な円（ラベルと重なっても押しやすくする） */}
                            {clickable && <circle cx={p.x} cy={p.y} r={NODE_R + 6} fill="transparent" />}
                        </g>
                    )
                })}
            </>
        )
    }

    // 拡大縮小・表示位置ボタンのスタイル（路線図の右上に重ねて表示する）
    const ctrlBtnStyle: React.CSSProperties = { minWidth: '32px', padding: '4px 8px' }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* スクロールバーは使わず、ドラッグで移動・ホイールで拡大縮小する */}
            <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                style={{
                    overflow: 'hidden', width: '100%', height: '100%', background: 'var(--bg-base)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    // タッチ操作でブラウザのスクロール・ズームが起きないようにする
                    touchAction: 'none',
                    userSelect: 'none',
                }}
            >
                {size && (
                    <svg width={size.w} height={size.h} style={{ display: 'block' }}>
                        {renderContent()}
                    </svg>
                )}
            </div>

            {/* 操作ボタン。押してもドラッグが始まらないよう pointerdown を止める */}
            <div
                className="btn-group"
                onPointerDown={e => e.stopPropagation()}
                style={{ position: 'absolute', top: '8px', right: '8px', margin: 0 }}
            >
                <button className="btn-secondary" style={ctrlBtnStyle} onClick={() => zoomAtCenter(BUTTON_ZOOM_STEP)} title="拡大">＋</button>
                <button className="btn-secondary" style={ctrlBtnStyle} onClick={() => zoomAtCenter(1 / BUTTON_ZOOM_STEP)} title="縮小">−</button>
                <button className="btn-secondary" style={ctrlBtnStyle} onClick={fitAll} disabled={!bounds || !size}>全体表示</button>
                <button className="btn-secondary" style={ctrlBtnStyle} onClick={moveToStart} disabled={!startPos}>始点へ移動</button>
            </div>
        </div>
    )
}

export default StationPresetMap
