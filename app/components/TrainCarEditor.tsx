"use client"

import React, { useEffect, useRef, useState } from "react"
import ToggleSwitch from './ToggleSwitch'
import { loadGenerators, LcdGenerators } from '../modules/loadGenerators.client'
import initObjects from "../initSettingObject"

// 列車の編集画面で変える運用の値
export type TrainCarPatch = { carNumberList?: string, headOffset?: string, backOffset?: string }

type TrainCarEditorProps = {
    carNumberList: string
    headOffset: string
    backOffset: string
    leftOrRight: string
    isDrawLine: boolean
    // プレビュー用の路線色（列車のライン・強調号車の色に使う）
    lineColor: string
    onChange: (patch: TrainCarPatch) => void
}

// 表示ページ（ProgressController._buildPlatformTrains）と同じ定数
const DISPLAY_WIDTH = 1920
const CAR_GAP = 5
// 自列車が手前の配置（7.74節の platform.svg と同じ値）
const RAIL_Y = 837
const TRAIN_BASE_Y = 818
// 車両の高さ（生成関数の初期値。号車番号・クリック範囲の位置に使う）
const CAR_HEIGHT = 66
const HIGHLIGHT_HEIGHT = 90
// 号車番号の文字の位置（生成関数の labelBottomOffset・labelHeightNormal・labelHeightHighlight と同じ）
const LABEL_BOTTOM = TRAIN_BASE_Y - 10
const LABEL_HEIGHT = 76
const LABEL_HEIGHT_HIGHLIGHT = 105
// 静止画として切り出す縦の範囲（ホームの奥の端〜線路の下）
const VIEW_TOP = 440
const VIEW_HEIGHT = 470
// 操作バーの位置・大きさ
const HANDLE_TOP = 690
const HANDLE_BOTTOM = 850
const HANDLE_WIDTH = 28
const HANDLE_HIT_WIDTH = 160
const CENTER_HANDLE_Y = 868
const CENTER_HANDLE_HEIGHT = 30
const MAX_CARS = 30
// 全体の平行移動で、列車の中心が画面の中心からこの距離以内ならちょうど中心に置く
const CENTER_SNAP_DISTANCE = 30

// 号車リスト（"1,2*,3"）を号車番号の配列と「*」の位置に分ける（ホームの編集画面でも使う）
export const parseCarList = (list: string): { labels: string[], starIndex: number } => {
    const raw = list.split(',')
    const starIndex = raw.findIndex(label => label.includes('*'))
    return { labels: raw.map(label => label.replace(/\*/g, '')), starIndex }
}
// 号車番号の配列と「*」の位置から号車リストを作る
const buildCarList = (labels: string[], starIndex: number): string =>
    labels.map((label, i) => i === starIndex ? `${label}*` : label).join(',')

// オフセットの文字列を整数にする（空・数値でなければ 0）
const toInt = (v: string) => { const n = parseInt(v); return isNaN(n) ? 0 : n }

// 列車の編集画面（7.75節）。ホーム案内と同じ絵の静止画の上で、両数・号車番号・今の号車・前方/後方オフセットを設定する
const TrainCarEditor: React.FC<TrainCarEditorProps> = ({ carNumberList, headOffset, backOffset, leftOrRight, isDrawLine, lineColor, onChange }) => {
    const { labels, starIndex } = parseCarList(carNumberList)
    const cars = labels.length
    // 選択中の号車（号車の位置。未選択は null）
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const selected = selectedIndex !== null && selectedIndex < cars ? selectedIndex : null
    // ドラッグ中のオフセット（ドラッグ中は運用の値を変えずにここで動かし、離したときに反映する）
    const [dragOffsets, setDragOffsets] = useState<{ head: number, back: number } | null>(null)
    const dragRef = useRef<{ kind: 'head' | 'back' | 'center', startX: number, head: number, back: number } | null>(null)
    const head = dragOffsets ? dragOffsets.head : toInt(headOffset)
    const back = dragOffsets ? dragOffsets.back : toInt(backOffset)

    // 表示ページと同じ計算: スロット数＝両数・左端スロット 0。列車の左端は常に前方オフセットの位置
    const wholeLength = DISPLAY_WIDTH - head - back
    const carLength = cars > 0 ? (wholeLength - (cars - 1) * CAR_GAP) / cars : 0
    const trainLeft = head
    const trainRight = head + wholeLength
    const carX = (i: number) => trainLeft + i * (carLength + CAR_GAP)

    // 生成関数（線路・ホーム・列車）で静止画を描く
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
        try {
            g.appendChild(generators.rail({ anchorY: RAIL_Y }, { textDrawer: null }))
            g.appendChild(generators.platform({ referencePos: 'front', hideTop: true, hideBottom: false, anchorX: 46, anchorY: 737 }, { textDrawer: null }))
            // 列車の長さが足りず1両の長さが 0 以下のときは、列車だけ描かない
            if (cars <= 0 || carLength <= 0) return
            // 号車番号は上に重ねて描くため、生成関数では描かない。強調号車は点滅させない（animate を外す）
            const train = generators.train({
                cars, carLength, gap: CAR_GAP,
                baseX: leftOrRight === 'right' ? trainRight : trainLeft, baseY: TRAIN_BASE_Y, baseMode: leftOrRight === 'right' ? 'right' : 'left',
                highlightCarId: starIndex >= 0 ? starIndex : null, carLabels: null,
                drawLine: isDrawLine, lineColor,
                highlight: { height: HIGHLIGHT_HEIGHT, depth: 30, colorSideFace: '#313131ff', colorMainFace: '#3c3c3cff', colorTopFace: '#8b8b8bff', colorEdges: '#cbcbcbff' },
                highlightMixColor: lineColor,
            }, { textDrawer: null })
            train.querySelectorAll('animate').forEach(a => a.remove())
            g.appendChild(train)
        } catch (e) {
            console.warn('[TrainCarEditor] 静止画を描けませんでした', e)
        }
    }, [generators, cars, carLength, trainLeft, trainRight, leftOrRight, starIndex, isDrawLine, lineColor])

    // ---- 号車リストの操作 ----
    const setCarCount = (n: number) => {
        if (isNaN(n) || n < 1) return
        const count = Math.min(MAX_CARS, n)
        const newLabels = Array.from({ length: count }, (_, i) => String(i + 1))
        // 今の号車と同じ番号の号車があれば、その号車を今の号車にする
        const starLabel = starIndex >= 0 ? labels[starIndex] : null
        onChange({ carNumberList: buildCarList(newLabels, starLabel !== null ? newLabels.indexOf(starLabel) : -1) })
    }
    const reverseCars = () => {
        onChange({ carNumberList: buildCarList([...labels].reverse(), starIndex >= 0 ? cars - 1 - starIndex : -1) })
        if (selected !== null) setSelectedIndex(cars - 1 - selected)
    }
    const setSelectedLabel = (text: string) => {
        if (selected === null) return
        // 「,」「*」は号車リストの区切り・印なので入れない
        const newLabels = [...labels]
        newLabels[selected] = text.replace(/[,*]/g, '')
        onChange({ carNumberList: buildCarList(newLabels, starIndex) })
    }
    const setSelectedStar = (on: boolean) => {
        if (selected === null) return
        onChange({ carNumberList: buildCarList(labels, on ? selected : (starIndex === selected ? -1 : starIndex)) })
    }

    // ---- 操作バーのドラッグ ----
    const svgRef = useRef<SVGSVGElement>(null)
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
    const startDrag = (kind: 'head' | 'back' | 'center') => (e: React.PointerEvent<SVGElement>) => {
        e.preventDefault()
        svgRef.current?.setPointerCapture(e.pointerId)
        dragRef.current = { kind, startX: toSvgX(e.clientX), head: toInt(headOffset), back: toInt(backOffset) }
        setDragOffsets({ head: toInt(headOffset), back: toInt(backOffset) })
    }
    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const d = dragRef.current
        if (!d) return
        const dx = Math.round(toSvgX(e.clientX) - d.startX)
        // 左右の端は連動して逆向きに動く（列車の中心はそのまま長さだけ変わる）。オフセットは負の値も取る。
        // 縮める量は片側につき元の長さの半分まで（左端が右端を越えない＝列車の長さは 0 以上）
        const maxShrink = Math.floor((DISPLAY_WIDTH - d.head - d.back) / 2)
        if (d.kind === 'head' || d.kind === 'back') {
            // 内側（列車が縮む向き）へ動かした量。左端は右へ、右端は左へ動かすと縮む
            const shrink = Math.min(maxShrink, d.kind === 'head' ? dx : -dx)
            setDragOffsets({ head: d.head + shrink, back: d.back + shrink })
        } else {
            // 全体の平行移動: 前方を増やした分だけ後方を減らす（オフセットは負の値も取る）
            const move = dx
            const newHead = d.head + move
            const newBack = d.back - move
            // 列車の中心と画面の中心の差は (前方 - 後方) / 2。近ければ前方・後方を等しくして中心に置く（合計が奇数なら後方を 1 大きく）
            if (Math.abs(newHead - newBack) / 2 <= CENTER_SNAP_DISTANCE) {
                const sum = newHead + newBack
                setDragOffsets({ head: Math.floor(sum / 2), back: Math.ceil(sum / 2) })
            } else {
                setDragOffsets({ head: newHead, back: newBack })
            }
        }
    }
    // 前方・後方オフセットを新しい運用の初期値に戻す（号車リストは変えない）
    const resetOffsets = () => {
        onChange({ headOffset: initObjects.operation.headOffset, backOffset: initObjects.operation.backOffset })
    }
    const endDrag = () => {
        if (!dragRef.current) return
        dragRef.current = null
        if (dragOffsets) onChange({ headOffset: String(dragOffsets.head), backOffset: String(dragOffsets.back) })
        setDragOffsets(null)
    }

    // 操作バーの表示位置。静止画の外（オフセットが負）に出るときは静止画の端に止め、外向きの矢印を付ける
    const clampX = (x: number, half: number) => Math.max(half, Math.min(DISPLAY_WIDTH - half, x))
    const headHandleX = clampX(trainLeft, HANDLE_WIDTH / 2)
    const backHandleX = clampX(trainRight, HANDLE_WIDTH / 2)
    const centerHandleX = clampX((trainLeft + trainRight) / 2, 120)
    const handleMidY = (HANDLE_TOP + HANDLE_BOTTOM) / 2
    // 外向きの矢印（三角形）。dir は -1 で左向き、1 で右向き。操作バーの内側（静止画の中）に描く
    const arrowPoints = (x: number, dir: number) => {
        const tip = x - dir * (HANDLE_WIDTH / 2 + 8)
        const base = tip - dir * 36
        return `${tip},${handleMidY} ${base},${handleMidY - 24} ${base},${handleMidY + 24}`
    }

    return (
        <div className="train-car-editor">
            <div className="form-row">
                <label>両数</label>
                {/* 両数は横方向のバーと左右のボタンで 1〜30 を指定する */}
                <button onClick={() => setCarCount(cars - 1)} disabled={cars <= 1}>◀</button>
                <input type="range" min={1} max={MAX_CARS} value={cars} onChange={e => setCarCount(parseInt(e.target.value))} style={{ flex: 1 }} />
                <button onClick={() => setCarCount(cars + 1)} disabled={cars >= MAX_CARS}>▶</button>
                <span>{cars}両</span>
            </div>
            <div className="form-row">
                <button onClick={reverseCars}>反転</button>
                <button onClick={resetOffsets}>位置・大きさをデフォルトに戻す</button>
            </div>
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
                {/* 号車番号とクリック範囲（1両の長さが 0 以下なら描かない） */}
                {carLength > 0 && labels.map((label, i) => {
                    const isStar = i === starIndex
                    const h = isStar ? HIGHLIGHT_HEIGHT : CAR_HEIGHT
                    const lh = isStar ? LABEL_HEIGHT_HIGHLIGHT : LABEL_HEIGHT
                    const x = carX(i)
                    return (
                        <g key={i} className="train-car-editor-car" onClick={() => setSelectedIndex(i)}>
                            <rect x={x} y={TRAIN_BASE_Y - h - 30} width={Math.max(carLength, 1)} height={h + 30} fill="transparent" />
                            <text
                                x={x + carLength / 2} y={LABEL_BOTTOM}
                                textAnchor="middle" fontFamily="sans-serif" fontWeight="bold"
                                fontSize={lh * 0.95} fill={isStar ? '#ffffff' : '#000000'}
                                textLength={label.length > 1 && carLength > 10 ? Math.min(carLength - 10, lh * 0.55 * label.length) : undefined}
                                lengthAdjust="spacingAndGlyphs"
                            >{label}</text>
                            {/* 選択中の号車の枠 */}
                            {selected === i && (
                                <rect x={x - 4} y={TRAIN_BASE_Y - h - 34} width={Math.max(carLength, 1) + 8} height={h + 42}
                                    fill="none" stroke="var(--accent, #3b82f6)" strokeWidth={8} rx={6} />
                            )}
                        </g>
                    )
                })}
                {/* 操作バーをつかめる範囲（画面幅が狭いと操作バーが細くなるため、透明な幅広の範囲を重ねる） */}
                <rect x={headHandleX - HANDLE_HIT_WIDTH / 2} y={HANDLE_TOP} width={HANDLE_HIT_WIDTH} height={HANDLE_BOTTOM - HANDLE_TOP} fill="transparent"
                    style={{ cursor: 'ew-resize' }} onPointerDown={startDrag('head')} />
                <rect x={backHandleX - HANDLE_HIT_WIDTH / 2} y={HANDLE_TOP} width={HANDLE_HIT_WIDTH} height={HANDLE_BOTTOM - HANDLE_TOP} fill="transparent"
                    style={{ cursor: 'ew-resize' }} onPointerDown={startDrag('back')} />
                <rect x={centerHandleX - 160} y={CENTER_HANDLE_Y - 20} width={320} height={CENTER_HANDLE_HEIGHT + 40} fill="transparent"
                    style={{ cursor: 'ew-resize' }} onPointerDown={startDrag('center')} />
                {/* 前方・後方の操作バー（列車の左端・右端） */}
                <rect className="train-car-editor-handle" x={headHandleX - HANDLE_WIDTH / 2} y={HANDLE_TOP} width={HANDLE_WIDTH} height={HANDLE_BOTTOM - HANDLE_TOP} rx={10}
                    onPointerDown={startDrag('head')} />
                <rect className="train-car-editor-handle" x={backHandleX - HANDLE_WIDTH / 2} y={HANDLE_TOP} width={HANDLE_WIDTH} height={HANDLE_BOTTOM - HANDLE_TOP} rx={10}
                    onPointerDown={startDrag('back')} />
                {/* 全体を平行移動する操作バー（列車の中央の下） */}
                <rect className="train-car-editor-handle" x={centerHandleX - 120} y={CENTER_HANDLE_Y} width={240} height={CENTER_HANDLE_HEIGHT} rx={12}
                    onPointerDown={startDrag('center')} />
                {/* 静止画の端に止めた操作バーの外向きの矢印 */}
                {headHandleX !== trainLeft && <polygon className="train-car-editor-arrow" points={arrowPoints(headHandleX, trainLeft < headHandleX ? -1 : 1)} />}
                {backHandleX !== trainRight && <polygon className="train-car-editor-arrow" points={arrowPoints(backHandleX, trainRight > backHandleX ? 1 : -1)} />}
            </svg>
            {/* 選択中の号車の設定 */}
            {selected !== null && (<>
                <div className="form-row">
                    <label>号車番号</label>
                    <input type="text" value={labels[selected]} onChange={e => setSelectedLabel(e.target.value)} />
                </div>
                <div className="form-row">
                    <label>この号車を今の号車にする</label>
                    <ToggleSwitch checked={selected === starIndex} onChange={setSelectedStar} />
                </div>
            </>)}
        </div>
    )
}

export default TrainCarEditor
