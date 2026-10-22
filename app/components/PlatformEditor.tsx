"use client"

import React, { useEffect, useRef, useState } from "react"
import "../type"
import { loadGenerators, LcdGenerators } from '../modules/loadGenerators.client'
import { computePlatformLayout, transferIndexOf, DISPLAY_WIDTH, CAR_GAP } from '../modules/platformLayout'
import initObjects from "../initSettingObject"
import { parseCarList } from './TrainCarEditor'

// ホームの編集画面で変える駅の値
export type PlatformPatch = { otherLineInd?: string, otherCarNum?: string, otherLeftSlotInd?: string }

type PlatformEditorProps = {
    setting: settingType
    // 編集する駅の番号（stationList の 0 始まりの位置）
    stationIndex: number
    onChange: (patch: PlatformPatch) => void
}

// 車両の高さ（生成関数の初期値）
const CAR_HEIGHT = 66
const CAR_DEPTH = 30
const HIGHLIGHT_HEIGHT = 90
// 号車番号の文字（生成関数の labelBottomOffset・labelHeightNormal・labelHeightHighlight と同じ）
const LABEL_BOTTOM_OFFSET = 10
const LABEL_HEIGHT = 76
const LABEL_HEIGHT_HIGHLIGHT = 105
// 静止画として切り出す縦の範囲（向かい側の列車の上〜手前の線路の下）
const VIEW_TOP = 300
const VIEW_HEIGHT = 600
// 向かい側の列車をつかむ操作バー
const OTHER_HANDLE_WIDTH = 240
const OTHER_HANDLE_HEIGHT = 30
const MAX_CARS = 30
// 向かい側の列車の色（platform.svg と同じ）
const OTHER_COLORS = { colorSideFace: '#989898ff', colorMainFace: '#929292ff', colorTopFace: '#bababaff', colorEdges: '#e2e2e2ff' }
// 自列車の強調号車の色（platform.svg と同じ）
const HIGHLIGHT = { height: HIGHLIGHT_HEIGHT, depth: 30, colorSideFace: '#313131ff', colorMainFace: '#3c3c3cff', colorTopFace: '#8b8b8bff', colorEdges: '#cbcbcbff' }

// 文字列を整数にする（空・数値でなければ 0）
const toInt = (v: string | undefined) => { const n = parseInt(v ?? ''); return isNaN(n) ? 0 : n }

// ホームの編集画面（7.76節）。ホーム案内と同じ絵の静止画の上で、向かい側の列車の路線・両数・位置を設定する
const PlatformEditor: React.FC<PlatformEditorProps> = ({ setting, stationIndex, onChange }) => {
    const station = setting.stationList[stationIndex]
    // 駅の運用（無ければ新しい運用の初期値）
    const operation: operationType = setting.operationDict[station?.operationId] ?? initObjects.operation
    const { labels, starIndex } = parseCarList(String(operation.carNumberList ?? ''))
    const cars = labels.length
    // 自列車のラインの色: その駅に到着する区間の路線の色（始発駅では出発する区間。表示ページと同じ）
    const arrivingStation = stationIndex > 0 ? setting.stationList[stationIndex - 1] : station
    const lineColor = setting.lineDict[arrivingStation?.lineId]?.color || '#888888'

    // 対面列車: 「t」＋番号は乗換案内の路線、それ以外は路線一覧のキー。見つからなければ「なし」
    const transfers: transferItemType[] = Array.isArray(station?.transfers) ? station.transfers : []
    const otherValue = station?.otherLineInd ?? ''
    const transferInd = transferIndexOf(otherValue)
    const otherName = transferInd !== null
        ? transfers[transferInd]?.line?.name
        : setting.lineDict[otherValue]?.name
    const hasOther = otherName !== undefined && otherValue !== ''
    const selectValue = hasOther ? otherValue : ''

    // 向かい側の列車の両数（0 は自列車と同じ両数）・左端スロット
    const otherCarNum = toInt(station?.otherCarNum) > 0 ? toInt(station?.otherCarNum) : cars
    // ドラッグ中の左端スロット（ドラッグ中は駅の値を変えずにここで動かし、離したときに反映する）
    const [dragSlot, setDragSlot] = useState<number | null>(null)
    const otherLeftSlotInd = dragSlot ?? toInt(station?.otherLeftSlotInd)

    const layout = computePlatformLayout({
        cars, headOffset: toInt(operation.headOffset), backOffset: toInt(operation.backOffset),
        leftOrRight: operation.leftOrRight, doorSide: station?.doorSide ?? 'right',
        otherCarNum, otherLeftSlotInd,
    })
    const { isFar, myY, otherY, ratio, baseMode, train, otherTrain } = layout

    // 生成関数（線路・ホーム・列車）で静止画を描く。並びは platform.svg と同じ
    const [generators, setGenerators] = useState<LcdGenerators | null>(null)
    const drawRef = useRef<SVGGElement>(null)
    useEffect(() => {
        let alive = true
        loadGenerators().then(g => { if (alive) setGenerators(g) })
        return () => { alive = false }
    }, [])
    useEffect(() => {
        const g = drawRef.current
        if (!g) return
        while (g.firstChild) g.removeChild(g.firstChild)
        if (!generators) return
        const ctx = { textDrawer: null }
        const add = (el: SVGGElement) => { el.querySelectorAll('animate').forEach(a => a.remove()); g.appendChild(el) }
        // 自列車（号車番号は上に重ねて描くため、生成関数では描かない。強調号車は点滅させない）
        const myTrain = () => train.carLength > 0 && add(generators.train({
            cars: train.cars, carLength: train.carLength, gap: train.gap,
            baseX: train.baseX, baseY: myY, baseMode,
            highlightCarId: starIndex >= 0 ? starIndex : null, carLabels: null,
            drawLine: !!operation.isDrawLine, lineColor,
            highlight: HIGHLIGHT, highlightMixColor: lineColor,
        }, ctx))
        // 向かい側の列車（灰色・ラインなし。路線名は上に文字で重ねる）
        const otherTrainEl = () => hasOther && otherTrain.carLength > 0 && add(generators.train({
            cars: otherTrain.cars, carLength: otherTrain.carLength, gap: otherTrain.gap,
            baseX: otherTrain.baseX, baseY: otherY, baseMode, wholeLength: otherTrain.wholeLength,
            ...OTHER_COLORS, carLabels: null, highlightCarId: null, drawLine: false,
        }, ctx))
        try {
            if (!isFar) {
                // 自列車が手前: 奥の線路と向かい側の列車 → ホーム → 手前の線路と自列車
                add(generators.rail({ anchorY: 837 }, ctx))
                if (hasOther) add(generators.rail({ anchorY: 483 }, ctx))
                otherTrainEl()
                add(generators.platform({ referencePos: 'front', hideTop: !hasOther, hideBottom: false, anchorX: 46, anchorY: 737 }, ctx))
                myTrain()
            } else {
                // 自列車が奥: 奥の線路と自列車 → ホーム → 手前の線路と向かい側の列車
                add(generators.rail({ anchorY: 496 }, ctx))
                myTrain()
                add(generators.platform({ referencePos: 'back', hideTop: false, hideBottom: !hasOther, anchorX: 66, anchorY: 480, width: 1788, baseBodyHeight: 23, baseShadowHeight: 9 }, ctx))
                if (hasOther) add(generators.rail({ anchorY: 824 }, ctx))
                otherTrainEl()
            }
        } catch (e) {
            console.warn('[PlatformEditor] 静止画を描けませんでした', e)
        }
    }, [generators, isFar, myY, otherY, baseMode, train.cars, train.carLength, train.baseX, starIndex, operation.isDrawLine, lineColor,
        hasOther, otherTrain.cars, otherTrain.carLength, otherTrain.baseX, otherTrain.wholeLength, otherTrain.gap])

    // ---- 向かい側の列車のドラッグ（自列車の1両ぶんのスロットに吸い付く） ----
    const svgRef = useRef<SVGSVGElement>(null)
    const dragRef = useRef<{ startX: number, slot: number } | null>(null)
    // 画面の座標を静止画の座標（横 1920）に変える
    const toSvgX = (clientX: number) => {
        const svg = svgRef.current
        const ctm = svg?.getScreenCTM()
        if (!svg || !ctm) return 0
        const pt = svg.createSVGPoint()
        pt.x = clientX
        pt.y = 0
        return pt.matrixTransform(ctm.inverse()).x
    }
    // 自列車と1両以上重なる範囲に収める
    const clampSlot = (slot: number) => Math.max(-(otherCarNum - 1), Math.min(cars - 1, slot))
    const startDrag = (e: React.PointerEvent<SVGElement>) => {
        e.preventDefault()
        svgRef.current?.setPointerCapture(e.pointerId)
        const slot = toInt(station?.otherLeftSlotInd)
        dragRef.current = { startX: toSvgX(e.clientX), slot }
        setDragSlot(slot)
    }
    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const d = dragRef.current
        if (!d) return
        // 向かい側の列車は縮小して描くため、動かした量を縮小前の長さに直してからスロットの数にする
        const step = (layout.slotLength + CAR_GAP) * ratio
        if (step <= 0) return
        setDragSlot(clampSlot(d.slot + Math.round((toSvgX(e.clientX) - d.startX) / step)))
    }
    const endDrag = () => {
        if (!dragRef.current) return
        dragRef.current = null
        if (dragSlot !== null && dragSlot !== toInt(station?.otherLeftSlotInd)) onChange({ otherLeftSlotInd: String(dragSlot) })
        setDragSlot(null)
    }

    // 両数を変える（1〜30。値を書き込む）
    const setOtherCarCount = (n: number) => {
        if (isNaN(n)) return
        onChange({ otherCarNum: String(Math.max(1, Math.min(MAX_CARS, n))) })
    }

    if (!station) return null

    // 向かい側の列車の上端（縮小後）と操作バーの位置
    const otherTop = otherY - (CAR_HEIGHT + CAR_DEPTH) * ratio
    // 路線名・操作バーは、向かい側の列車のうち静止画に見えている部分の中央に置く（画面の外へはみ出したときもつかめるように）
    const visibleLeft = Math.max(otherTrain.left, 0)
    const visibleRight = Math.min(otherTrain.right, DISPLAY_WIDTH)
    const otherCenterX = Math.max(OTHER_HANDLE_WIDTH / 2, Math.min(DISPLAY_WIDTH - OTHER_HANDLE_WIDTH / 2, (visibleLeft + visibleRight) / 2))
    const otherHandleY = otherY + 12
    // 自列車の号車番号の文字の下端
    const labelBottom = myY - LABEL_BOTTOM_OFFSET

    return (
        <div className="platform-editor">
            <div className="form-row">
                <label>対面列車</label>
                <select value={selectValue} onChange={e => onChange({ otherLineInd: e.target.value })}>
                    <option value="">なし</option>
                    {transfers.length > 0 && (
                        <optgroup label="乗換案内">
                            {transfers.map((t, i) => <option key={`t${i}`} value={`t${i}`}>{t.line?.name || `（乗換 ${i + 1}）`}</option>)}
                        </optgroup>
                    )}
                    <optgroup label="その他路線">
                        {Object.keys(setting.lineDict).map(key => <option key={key} value={key}>{setting.lineDict[key].name}</option>)}
                    </optgroup>
                </select>
            </div>
            {hasOther && (
                <div className="form-row">
                    <label>対面列車両数</label>
                    {/* 両数は横方向のバーと左右のボタンで 1〜30 を指定する（7.75節の両数と同じ形） */}
                    <button onClick={() => setOtherCarCount(otherCarNum - 1)} disabled={otherCarNum <= 1}>◀</button>
                    <input type="range" min={1} max={MAX_CARS} value={otherCarNum} onChange={e => setOtherCarCount(parseInt(e.target.value))} style={{ flex: 1 }} />
                    <button onClick={() => setOtherCarCount(otherCarNum + 1)} disabled={otherCarNum >= MAX_CARS}>▶</button>
                    <span>{otherCarNum}両</span>
                </div>
            )}
            <svg
                ref={svgRef}
                className="train-car-editor-view"
                viewBox={`0 ${VIEW_TOP} ${DISPLAY_WIDTH} ${VIEW_HEIGHT}`}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <rect x={0} y={VIEW_TOP} width={DISPLAY_WIDTH} height={VIEW_HEIGHT} fill="#ffffff" />
                {/* 線路・ホーム・列車（生成関数で描いた静止画） */}
                <g ref={drawRef} />
                {/* 自列車の号車番号（7.75節と同じ。操作はできない） */}
                {train.carLength > 0 && labels.map((label, i) => {
                    const isStar = i === starIndex
                    const lh = isStar ? LABEL_HEIGHT_HIGHLIGHT : LABEL_HEIGHT
                    const x = train.left + i * (train.carLength + CAR_GAP)
                    return (
                        <text key={i}
                            x={x + train.carLength / 2} y={labelBottom}
                            textAnchor="middle" fontFamily="sans-serif" fontWeight="bold"
                            fontSize={lh * 0.95} fill={isStar ? '#ffffff' : '#000000'}
                            textLength={label.length > 1 && train.carLength > 10 ? Math.min(train.carLength - 10, lh * 0.55 * label.length) : undefined}
                            lengthAdjust="spacingAndGlyphs"
                            pointerEvents="none"
                        >{label}</text>
                    )
                })}
                {hasOther && (<>
                    {/* 向かい側の列車の路線名（表示ページでは路線記号付きのラベル） */}
                    <text x={otherCenterX} y={otherTop - 16} textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize={44} fill="#333333"
                        pointerEvents="none">{otherName}</text>
                    {/* 向かい側の列車をつかむ範囲と操作バー */}
                    <rect className="platform-editor-other" x={otherTrain.left} y={otherTop} width={Math.max(otherTrain.right - otherTrain.left, 1)} height={otherY - otherTop + 30}
                        fill="transparent" onPointerDown={startDrag} />
                    <rect className="train-car-editor-handle" x={otherCenterX - OTHER_HANDLE_WIDTH / 2} y={otherHandleY} width={OTHER_HANDLE_WIDTH} height={OTHER_HANDLE_HEIGHT} rx={12}
                        onPointerDown={startDrag} />
                </>)}
            </svg>
        </div>
    )
}

export default PlatformEditor
