"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PresetLine, PresetStation, PresetLineConnect, PresetTransfer, StationSection, PresetOperatorType } from '../modules/loadStationPresets'

type Props = {
    lines: PresetLine[]
    allStations: PresetStation[]
    lineConnects: PresetLineConnect[]
    // 乗換エッジ（表示のみ。ハイライト・区間選択には影響しない）
    transfers: PresetTransfer[]
    // 始点駅のID（null のときは全駅がクリック可能）
    startStationId: string | null
    // 駅クリック時のコールバック。ルートの区間（環状線の継ぎ目をまたぐ場合は2区間）は本コンポーネントで解決して渡す。
    // 始点駅の選択時は sections が空配列。nextStationName はルート選択ポップアップで選んだ場合のみ渡す
    onSelect: (sections: StationSection[], station: PresetStation, nextStationName?: string) => void
    // 操作ボタンの右に並べて表示する内容（操作ガイダンス・読み込みエラーなど。7.42節）
    toolbarExtra?: React.ReactNode
    // 表示中の事業者種別（7.43節）。含まれない種別の路線は線を描かず、ハイライト・ルート候補からも外す
    visibleOperatorTypes: ReadonlySet<PresetOperatorType>
}

// 始点駅から対象駅までのルート候補
type RouteCandidate = {
    lineId: string
    sections: StationSection[]
    // ルート上の駅IDの並び（始点駅〜対象駅。区間の継ぎ目の重複は除く）
    stationIds: string[]
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
// 並走区間で路線を横に並べる間隔（px）。線の太さと同じにして隙間なく接するようにする
const PARALLEL_SPACING = 6
// クリック判定を広げる幅（px）
const HIT_MARGIN = 6

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

// 並走区間で横にずらした折れ線の points 文字列を作る。
// pts: 駅の画面座標、edges[i]: pts[i]→pts[i+1] の辺の垂直方向（単位ベクトル）とずらし量（px）
const offsetPolylinePoints = (pts: Pos[], edges: { nx: number, ny: number, off: number }[]): string => {
    const out: string[] = []
    for (let i = 0; i < pts.length; i++) {
        const prev = i > 0 ? edges[i - 1] : undefined
        const next = i < edges.length ? edges[i] : undefined
        let ox = 0, oy = 0
        if (prev && next) {
            const dot = prev.nx * next.nx + prev.ny * next.ny
            if (prev.off === next.off && prev.off !== 0 && dot > 0) {
                // 前後のずらし量が同じ: ずらした2本の線の交点（マイター）。
                // 交点ベクトル = (n1 + n2) × off / (1 + n1・n2)。鋭い折れ角で遠くなりすぎないよう off の2倍までに抑える
                // （dot <= 0 は折り返しに近い、または前後で基準方向が逆向きの場合なので中間点にする）
                ox = (prev.nx + next.nx) * prev.off / (1 + dot)
                oy = (prev.ny + next.ny) * prev.off / (1 + dot)
                const len = Math.hypot(ox, oy)
                const maxLen = Math.abs(prev.off) * 2
                if (len > maxLen) {
                    ox = ox / len * maxLen
                    oy = oy / len * maxLen
                }
            } else {
                // ずらし量が異なる（並走の本数が変わる駅など）: 前後の辺でずらした点の中間
                ox = (prev.nx * prev.off + next.nx * next.off) / 2
                oy = (prev.ny * prev.off + next.ny * next.off) / 2
            }
        } else {
            // 始点・終点: 接する辺のずらし量だけずらす
            const e = prev ?? next
            if (e) {
                ox = e.nx * e.off
                oy = e.ny * e.off
            }
        }
        out.push(`${pts[i].x + ox},${pts[i].y + oy}`)
    }
    return out.join(' ')
}

const StationPresetMap: React.FC<Props> = ({ lines, allStations, lineConnects, transfers, startStationId, onSelect, toolbarExtra, visibleOperatorTypes }) => {
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

    // 並走区間の平行描画に必要な情報をデータ読み込み時に1回だけ計算する。
    // - linePaths: 路線ごとの折れ線（ワールド座標）とその範囲、各辺の垂直方向・ずらし量
    // - nodeShapes: 駅ごとのノード形状（並走本数の最大値と、線を並べた向き）
    const { linePaths, nodeShapes } = useMemo(() => {
        // 路線ごとに、座標のある駅だけを駅順に並べる
        const seqByLine = lines.map(line => {
            const ids = (orderByLine.get(line.id) ?? []).filter(sid => worldById.has(sid))
            return { line, ids }
        })

        // 同じ2駅を結ぶ辺を、向きを問わず1つの辺グループにまとめる。
        // 各路線がその辺を最初に進んだ向き（from → to）も覚えておく
        type EdgeGroup = { lineIds: string[], dirByLine: Map<string, [string, string]>, nx: number, ny: number }
        const groups = new Map<string, EdgeGroup>()
        const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
        for (const { line, ids } of seqByLine) {
            for (let i = 0; i + 1 < ids.length; i++) {
                const a = ids[i], b = ids[i + 1]
                if (a === b) continue
                const key = edgeKey(a, b)
                let g = groups.get(key)
                if (!g) {
                    g = { lineIds: [], dirByLine: new Map(), nx: 0, ny: 0 }
                    groups.set(key, g)
                }
                // 同じ路線が同じ辺を2回通る場合は1本として数える
                if (!g.dirByLine.has(line.id)) {
                    g.lineIds.push(line.id)
                    g.dirByLine.set(line.id, [a, b])
                }
            }
        }
        // グループ内の路線を路線IDの数値順に並べ、最も小さい路線の進む向きを基準方向とする。
        // 垂直方向は基準方向を時計回りに90°回した向き（y軸下向きの座標系で (-dy, dx)）
        for (const g of groups.values()) {
            g.lineIds.sort((a, b) => Number(a) - Number(b) || (a < b ? -1 : a > b ? 1 : 0))
            const [from, to] = g.dirByLine.get(g.lineIds[0])!
            const p1 = worldById.get(from)!, p2 = worldById.get(to)!
            const dx = p2.x - p1.x, dy = p2.y - p1.y
            const len = Math.hypot(dx, dy)
            // 2駅が同じ座標の場合は向きが決まらないため、ずらさない
            if (len > 0) {
                g.nx = -dy / len
                g.ny = dx / len
            }
        }

        // 路線ごとの折れ線。各辺に垂直方向とずらし量（px）を持たせる
        const paths = seqByLine.map(({ line, ids }) => {
            const pts = ids.map(sid => worldById.get(sid)!)
            const edges: { nx: number, ny: number, off: number }[] = []
            for (let i = 0; i + 1 < ids.length; i++) {
                const g = ids[i] === ids[i + 1] ? undefined : groups.get(edgeKey(ids[i], ids[i + 1]))
                if (!g) {
                    edges.push({ nx: 0, ny: 0, off: 0 })
                    continue
                }
                // 並び順 k、本数 n のとき (k − (n − 1) / 2) × 間隔 だけずらす
                const k = g.lineIds.indexOf(line.id)
                const n = g.lineIds.length
                edges.push({ nx: g.nx, ny: g.ny, off: (k - (n - 1) / 2) * PARALLEL_SPACING })
            }
            const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
            for (const p of pts) {
                if (p.x < b.minX) b.minX = p.x
                if (p.y < b.minY) b.minY = p.y
                if (p.x > b.maxX) b.maxX = p.x
                if (p.y > b.maxY) b.maxY = p.y
            }
            return { line, pts, edges, bounds: b }
        }).filter(lp => lp.pts.length >= 2)

        // 駅ごとのノード形状: 接する辺グループの路線数の最大値 m と、その辺グループの垂直方向
        const shapes = new Map<string, { m: number, nx: number, ny: number }>()
        for (const [key, g] of groups) {
            const n = g.lineIds.length
            for (const sid of key.split('|')) {
                const cur = shapes.get(sid)
                if (!cur || n > cur.m) shapes.set(sid, { m: n, nx: g.nx, ny: g.ny })
            }
        }
        return { linePaths: paths, nodeShapes: shapes }
    }, [lines, orderByLine, worldById])

    // 表示中の路線のID集合（事業者種別で絞り込む。7.43節）。
    // 配置・形（平行線のずらし量・ノード形状・全体表示の範囲）は全路線で計算済みのものを使い、ここでは描画と選択だけを絞る
    const visibleLineIds = useMemo(
        () => new Set(lines.filter(l => visibleOperatorTypes.has(l.operatorType)).map(l => l.id)),
        [lines, visibleOperatorTypes])

    // 表示する駅のID集合: 表示中の路線が1本でも通る駅。始点駅は線がすべて非表示でも常に表示する
    const visibleStationIds = useMemo(() => {
        const set = new Set<string>()
        for (const lineId of visibleLineIds) {
            for (const sid of orderByLine.get(lineId) ?? []) set.add(sid)
        }
        if (startStationId !== null) set.add(startStationId)
        return set
    }, [visibleLineIds, orderByLine, startStationId])

    // 始点駅を通る路線のうち表示中のもののID集合（始点未選択なら表示中の全路線）
    const activeLineIds = useMemo(() => {
        if (startStationId === null) return visibleLineIds
        const set = new Set<string>()
        for (const [lineId, order] of orderByLine) {
            if (visibleLineIds.has(lineId) && order.includes(startStationId)) set.add(lineId)
        }
        return set
    }, [startStationId, orderByLine, visibleLineIds])

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
    // 画面に触れているポインタ（指）の位置。2本指のピンチ操作の判定に使う（3本目以降は追跡しない）
    const pointersRef = useRef<Map<number, { x: number, y: number }>>(new Map())
    // ピンチ操作中の情報（直前の指の間隔と中点。中点はコンテナ内の座標）。null ならピンチ操作中ではない
    const pinchRef = useRef<{ lastDist: number, lastMidX: number, lastMidY: number } | null>(null)

    // 2本の指の間隔と中点（コンテナ内の座標）を求める
    const getPinchGeometry = () => {
        const [p1, p2] = [...pointersRef.current.values()]
        const rect = containerRef.current?.getBoundingClientRect()
        const left = rect?.left ?? 0, top = rect?.top ?? 0
        return {
            dist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
            midX: (p1.x + p2.x) / 2 - left,
            midY: (p1.y + p2.y) / 2 - top,
        }
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // 主ボタン（左クリック・タッチ・ペン）のみ扱う。3本目以降の指は無視する
        if (e.button !== 0 || pointersRef.current.size >= 2) return
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        // ポインタがすでに無効な場合などに例外になるため、失敗しても操作は続ける
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* キャプチャできなくても移動・拡大縮小は可能 */ }
        if (pointersRef.current.size === 2) {
            // 2本目の指: ピンチ操作を始める。この操作はクリックとみなさない
            if (dragRef.current) dragRef.current.moved = true
            const g = getPinchGeometry()
            pinchRef.current = { lastDist: g.dist, lastMidX: g.midX, lastMidY: g.midY }
            setIsDragging(true)
            return
        }
        // 駅ノードの上から始めた場合も移動できる。押した駅はクリック判定のために覚えておく
        const stationEl = (e.target as Element).closest('[data-station-id]')
        dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX, startY: e.clientY,
            lastX: e.clientX, lastY: e.clientY,
            moved: false,
            downStationId: stationEl?.getAttribute('data-station-id') ?? null,
        }
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!pointersRef.current.has(e.pointerId)) return
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const pinch = pinchRef.current
        if (pinch && pointersRef.current.size === 2) {
            // ピンチ操作: 指の間隔の変化に比例して拡大縮小し、同時に中点の移動に合わせて路線図を移動する。
            // 直前の中点の下にあったワールド座標が、新しい中点の位置に来るよう offset を決める
            const v = viewRef.current
            const g = getPinchGeometry()
            if (v && pinch.lastDist > 0) {
                const newScale = Math.min(MAX_SCALE, Math.max(getMinScale(), v.scale * g.dist / pinch.lastDist))
                const wx = v.offsetX + pinch.lastMidX / v.scale
                const wy = v.offsetY + pinch.lastMidY / v.scale
                applyView({ scale: newScale, offsetX: wx - g.midX / newScale, offsetY: wy - g.midY / newScale })
            }
            pinchRef.current = { lastDist: g.dist, lastMidX: g.midX, lastMidY: g.midY }
            return
        }
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

    // 指（ポインタ）が離れたときの共通処理。ピンチ中なら残った指でドラッグ移動を続けられるようにする。
    // 戻り値: 通常のドラッグ・クリック判定を続けてよいなら true
    const releasePointer = (pointerId: number): boolean => {
        if (!pointersRef.current.has(pointerId)) return false
        pointersRef.current.delete(pointerId)
        if (pinchRef.current) {
            pinchRef.current = null
            const rest = [...pointersRef.current.entries()][0]
            if (rest) {
                // 残った指からドラッグを再開する（ピンチ後なのでクリックとはみなさない）
                const [id, p] = rest
                dragRef.current = { pointerId: id, startX: p.x, startY: p.y, lastX: p.x, lastY: p.y, moved: true, downStationId: null }
            } else {
                dragRef.current = null
                setIsDragging(false)
            }
            return false
        }
        return true
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!releasePointer(e.pointerId)) return
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
        if (!releasePointer(e.pointerId)) return
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

    // 始点駅から対象駅までのルート候補を全て列挙する。
    // 乗換駅同士では候補路線が複数ありえ、環状線では両方向に回るルートがあるため、同じ路線内でも候補が複数になりうる。
    // 並び順は「ルートの駅数が少ない → 路線IDが小さい → 始点の位置が小さい」
    const enumerateRoutes = (targetId: string): RouteCandidate[] => {
        if (startStationId === null) return []
        const result: RouteCandidate[] = []
        const seen = new Set<string>()
        // 区間の並びからルート上の駅IDの並びを作る（区間の継ぎ目で同じ駅が続く場合は1つにする）
        const expand = (order: string[], sections: StationSection[]): string[] => {
            const ids: string[] = []
            for (const s of sections) {
                const step = s.prevIndex <= s.nextIndex ? 1 : -1
                for (let i = s.prevIndex; ; i += step) {
                    if (ids[ids.length - 1] !== order[i]) ids.push(order[i])
                    if (i === s.nextIndex) break
                }
            }
            return ids
        }
        const add = (lineId: string, order: string[], sections: StationSection[]) => {
            const stationIds = expand(order, sections)
            // 同じ路線で通る駅の並びが完全に同じ候補は1つにまとめる
            const key = `${lineId}::${stationIds.join(',')}`
            if (seen.has(key)) return
            seen.add(key)
            result.push({ lineId, sections, stationIds })
        }
        for (const lineId of activeLineIds) {
            const order = orderByLine.get(lineId) ?? []
            const n = order.length
            // 環状線: 駅順リストの先頭と末尾が同じ駅で、駅数が3以上の路線
            const isRing = n >= 3 && order[0] === order[n - 1]
            if (!isRing) {
                // 始点駅の位置 i と対象駅の位置 j の組ごとに1区間の候補とする
                for (let i = 0; i < n; i++) {
                    if (order[i] !== startStationId) continue
                    for (let j = 0; j < n; j++) {
                        if (j === i || order[j] !== targetId) continue
                        add(lineId, order, [{ lineId, prevIndex: i, nextIndex: j }])
                    }
                }
                continue
            }
            // 環状線: 継ぎ目は末尾の位置 L と先頭の位置 0（同じ駅）。重複を除いた位置 0〜L-1 で考え、
            // 輪を両方向にたどる2つのルートを候補とする。継ぎ目をまたぐ場合は継ぎ目で分けた2区間にする
            const L = n - 1
            for (let ps = 0; ps < L; ps++) {
                if (order[ps] !== startStationId) continue
                for (let pt = 0; pt < L; pt++) {
                    if (pt === ps || order[pt] !== targetId) continue
                    // 位置が増える向き
                    if (pt > ps) add(lineId, order, [{ lineId, prevIndex: ps, nextIndex: pt }])
                    else if (pt === 0) add(lineId, order, [{ lineId, prevIndex: ps, nextIndex: L }])
                    else add(lineId, order, [{ lineId, prevIndex: ps, nextIndex: L }, { lineId, prevIndex: 0, nextIndex: pt }])
                    // 位置が減る向き
                    if (pt < ps) add(lineId, order, [{ lineId, prevIndex: ps, nextIndex: pt }])
                    else if (ps === 0) add(lineId, order, [{ lineId, prevIndex: L, nextIndex: pt }])
                    else add(lineId, order, [{ lineId, prevIndex: ps, nextIndex: 0 }, { lineId, prevIndex: L, nextIndex: pt }])
                }
            }
        }
        return result.sort((a, b) =>
            a.stationIds.length - b.stationIds.length
            || Number(a.lineId) - Number(b.lineId)
            || a.sections[0].prevIndex - b.sections[0].prevIndex)
    }

    // ルート選択ポップアップの状態（対象駅と候補。null なら非表示）
    const [routeChoice, setRouteChoice] = useState<{ target: PresetStation, routes: RouteCandidate[] } | null>(null)

    const handleClick = (station: PresetStation) => {
        if (startStationId === null) {
            // 始点駅の選択（区間はまだ作らない）
            onSelect([], station)
            return
        }
        const routes = enumerateRoutes(station.id)
        if (routes.length === 0) return
        // 候補が1つならそのまま追加し、複数ならポップアップでユーザーに選ばせる
        if (routes.length === 1) {
            onSelect(routes[0].sections, station)
            return
        }
        setRouteChoice({ target: station, routes })
    }

    // ルート選択ポップアップで候補が選ばれたとき
    const handleRouteChosen = (route: RouteCandidate) => {
        if (!routeChoice) return
        onSelect(route.sections, routeChoice.target, stationById.get(route.stationIds[1])?.name)
        setRouteChoice(null)
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
                // 通る路線がすべて非表示の駅は描かない（7.43節）
                if (!visibleStationIds.has(station.id)) continue
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
                    // 両端の駅がどちらも表示されているときだけ描く（7.43節）
                    if (!visibleStationIds.has(t.stationId1) || !visibleStationIds.has(t.stationId2)) return null
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
                {/* 並走区間では路線ごとに横へずらした平行線になる */}
                {linePaths.map(({ line, pts, edges, bounds: lb }) => {
                    // 非表示の事業者種別の路線は描かない（ずらし量は全路線で計算したままなので、残りの線の位置は変わらない）
                    if (!visibleLineIds.has(line.id)) return null
                    // 路線の範囲が表示範囲と重ならなければ描画しない
                    if (lb.maxX < visMinX || lb.minX > visMaxX || lb.maxY < visMinY || lb.minY > visMaxY) return null
                    const isActive = activeLineIds.has(line.id)
                    return (
                        <polyline
                            key={line.id}
                            points={offsetPolylinePoints(pts.map(toScreen), edges)}
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
                    // 並走本数 m が2以上の駅はカプセル型。長手方向は線を並べた向き（辺グループの垂直方向）
                    const shape = nodeShapes.get(station.id)
                    const m = shape?.m ?? 1
                    const capLen = (m - 1) * PARALLEL_SPACING + NODE_R * 2
                    const angle = shape ? Math.atan2(shape.ny, shape.nx) * 180 / Math.PI : 0
                    // 駅名はノードの右端のさらに右に置く（カプセルを回転させたときの x 方向の半幅）
                    const halfW = m > 1 && shape ? (capLen / 2 - NODE_R) * Math.abs(shape.nx) + NODE_R : NODE_R
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
                            {m > 1 ? (
                                <rect
                                    x={-capLen / 2} y={-NODE_R} width={capLen} height={NODE_R * 2} rx={NODE_R}
                                    transform={`translate(${p.x},${p.y}) rotate(${angle})`}
                                    fill={fill} stroke="var(--text-primary)" strokeWidth={2}
                                />
                            ) : (
                                <circle cx={p.x} cy={p.y} r={NODE_R} fill={fill} stroke="var(--text-primary)" strokeWidth={2} />
                            )}
                            {(showLabels || isStart) && (
                                <text
                                    x={p.x + halfW + 3}
                                    y={p.y + 4}
                                    fontSize="13"
                                    fill={isStart ? '#ff9800' : isSelectable ? 'var(--text-primary)' : 'var(--text-muted)'}
                                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                                >
                                    {station.name}
                                </text>
                            )}
                            {/* クリック判定を広げるための透明な円（ラベルと重なっても押しやすくする）。カプセル型では同じ向きのカプセルを広げる */}
                            {clickable && (m > 1 ? (
                                <rect
                                    x={-capLen / 2 - HIT_MARGIN} y={-NODE_R - HIT_MARGIN}
                                    width={capLen + HIT_MARGIN * 2} height={(NODE_R + HIT_MARGIN) * 2} rx={NODE_R + HIT_MARGIN}
                                    transform={`translate(${p.x},${p.y}) rotate(${angle})`}
                                    fill="transparent"
                                />
                            ) : (
                                <circle cx={p.x} cy={p.y} r={NODE_R + HIT_MARGIN} fill="transparent" />
                            ))}
                        </g>
                    )
                })}
            </>
        )
    }

    // 拡大縮小・表示位置ボタンのスタイル（路線図の左上に重ねて表示する。7.42節）
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

            {/* 操作ボタンと、その右に並べる内容（ガイダンスなど）。左上に重ね、幅が足りなければ折り返す。
                ボタン以外の部分はドラッグを妨げないよう pointer-events を無効にする（globals.css の .preset-map-toolbar） */}
            <div className="preset-map-toolbar">
            {/* 操作ボタン。押してもドラッグが始まらないよう pointerdown を止める */}
            <div
                className="btn-group"
                onPointerDown={e => e.stopPropagation()}
                style={{ margin: 0, pointerEvents: 'auto' }}
            >
                <button className="btn-secondary" style={ctrlBtnStyle} onClick={() => zoomAtCenter(BUTTON_ZOOM_STEP)} title="拡大">＋</button>
                <button className="btn-secondary" style={ctrlBtnStyle} onClick={() => zoomAtCenter(1 / BUTTON_ZOOM_STEP)} title="縮小">−</button>
                <button className="btn-secondary" style={ctrlBtnStyle} onClick={fitAll} disabled={!bounds || !size}>全体表示</button>
                <button className="btn-secondary" style={ctrlBtnStyle} onClick={moveToStart} disabled={!startPos}>始点へ移動</button>
            </div>
            {toolbarExtra}
            </div>

            {/* ルート選択ポップアップ。画面ヘッダーを含む画面全体に半透明の背景を重ね、表示中はポップアップの外を操作できないようにする。
                背景のクリックでは閉じない（閉じるのは候補の選択か「キャンセル」のみ。7.43節） */}
            {routeChoice && (
                <div
                    style={{
                        // 画面全体（fixed）に広げ、追加一覧ウィンドウ（z-index: 10）より上に重ねる（7.42節・7.43節）
                        position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                            maxWidth: '100%', maxHeight: '100%', overflow: 'auto',
                        }}
                    >
                        <div style={{ fontWeight: 600 }}>
                            「{stationById.get(startStationId ?? '')?.name ?? ''}」→「{routeChoice.target.name}」のルートを選択
                        </div>
                        {/* 候補を「[ナンバリング記号][路線名] 次駅：[始点駅の次の駅]」の形で列挙する */}
                        {routeChoice.routes.map((route, i) => {
                            const line = lines.find(l => l.id === route.lineId)
                            const nextName = stationById.get(route.stationIds[1])?.name ?? ''
                            return (
                                <button
                                    key={i}
                                    className="btn-secondary"
                                    onClick={() => handleRouteChosen(route)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}
                                >
                                    {/* 路線記号は路線カラーの枠で囲んだバッジにする（空なら出さない） */}
                                    {line?.symbol && (
                                        <span style={{
                                            border: `2px solid ${line.color || '#888'}`, borderRadius: '4px',
                                            padding: '0 4px', fontWeight: 700, fontSize: '0.85em', lineHeight: 1.4,
                                        }}>{line.symbol}</span>
                                    )}
                                    <span>{line?.name ?? route.lineId}</span>
                                    <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>次駅：{nextName}</span>
                                    {/* 中間駅数: 始点駅と対象駅の間の駅数（両端を除く） */}
                                    <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>中間駅数：{route.stationIds.length - 2}</span>
                                </button>
                            )
                        })}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setRouteChoice(null)}>キャンセル</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StationPresetMap
