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

// 2つのナンバリングの構成パラメータが全て一致するかどうか（境界駅で2つ目を設定するかの判定に使う）
const isSameNumIcon = (a: stationNumIconType, b: stationNumIconType): boolean =>
    a.symbol === b.symbol && a.number === b.number && a.presetKey === b.presetKey && a.color === b.color &&
    a.manualSymbol === b.manualSymbol && a.manualPresetKey === b.manualPresetKey && a.manualColor === b.manualColor &&
    a.colorMode === b.colorMode

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

// lineDict内に name・kana・eng・color・symbol・numIconPresetKey・lineIconKey が完全一致するエントリがあればそのキーを返す
// 路線アイコン（lineIconKey）も含めた全ての項目が一致する場合だけ流用する（7.40節。アイコンが違えば別の路線として新しく登録する）
const findMatchingLineKey = (lineDict: settingType['lineDict'], line: PresetLine, lineIconKey: string): string | undefined => {
    return Object.keys(lineDict).find(key => {
        const l = lineDict[key]
        return l.name === line.name && l.kana === line.kana && l.eng === line.eng &&
            l.color === line.color && l.symbol === line.symbol && l.numIconPresetKey === line.numIconPresetKey &&
            l.lineIconKey === lineIconKey
    })
}

// lineDictの既存キー（数値）から次の新規キーを生成する
const generateNextLineKey = (existingKeys: string[]): string => {
    const nums = existingKeys.map(Number).filter(n => !isNaN(n))
    return String(nums.length > 0 ? Math.max(...nums) + 1 : 0)
}

const StationPresetPopup: React.FC<Props> = ({ setting, onAdd, onClose }) => {
    const [lines, setLines] = useState<PresetLine[]>([])
    const [allStations, setAllStations] = useState<PresetStation[]>([])
    const [lineConnects, setLineConnects] = useState<PresetLineConnect[]>([])
    // 乗換エッジ（路線図の描画にのみ使う。区間選択には使わない）
    const [transfers, setTransfers] = useState<PresetTransfer[]>([])
    // 区間の開始駅（前駅）: null = firstStation 状態、値あり = continuing 状態
    const [prevStation, setPrevStation] = useState<PrevStationRef | null>(null)
    // 追加一覧（ルートの配列。ルートは1つ以上の区間のまとまり）
    const [stagingList, setStagingList] = useState<StagedRoute[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)
    // 追加一覧ウィンドウの開閉（7.42節）。画面を開くたびに「開いた状態」から始める
    const [isStagingOpen, setIsStagingOpen] = useState<boolean>(true)

    // 全画面表示の間は、後ろのエディタのページがスクロールしないようにする（閉じたら元に戻す）
    useEffect(() => {
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prevOverflow }
    }, [])

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

    // 各区間から駅を展開し、連続区間の接続駅の重複を除去して stationType[] に変換する。
    // 同時に、各区間の路線（PresetLine）を lineDict・iconDict のキーに解決する。
    // 既存の setting.lineDict/iconDict、または今回の呼び出し内で新規作成した分と完全一致する
    // エントリがあればそれを再利用し、同じ路線が複数区間・複数駅にまたがっても1つのエントリにまとめる。
    const extractStationsFromSections = (): { stations: stationType[], newLines: Record<string, lineType>, newIcons: Record<string, iconParamsType> } => {
        const result: stationType[] = []
        // result の各行で、ルートが使っている路線と行き来する隣駅（乗換路線の生成に使う。result と同じ並び）
        const rowUsages: RowUsage[] = []
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

        // プリセット路線の路線記号アイコンを iconDict のキーに解決する（未登録の場合は iconDict に新規追加する）。
        // 路線アイコンが空の路線は空文字を返す。路線記号が空でも路線アイコンがあれば作成する
        // （路線記号のない路線は lineDB で I_mono_color〔路線カラーの四角〕が指定されている）。乗換路線のアイコンにも使う
        const resolveIconKey = (presetLine: PresetLine): string => {
            // 路線記号アイコンの解決: 既存iconDict → 今回新規作成分の順に完全一致するものを探す
            // presetType には lineDB の「路線アイコン」列（I_*）を使う
            if (!presetLine.iconPresetKey) return ''
            const iconParams: iconParamsType = { presetType: presetLine.iconPresetKey, symbol: presetLine.symbol, color: presetLine.color }
            const allIconsSoFar = { ...setting.iconDict, ...newIcons }
            const existingIconKey = findMatchingIconKey(allIconsSoFar, iconParams)
            if (existingIconKey) return existingIconKey
            const newKey = generateUniqueIconKey(allIconsSoFar, `line_${presetLine.id}`)
            newIcons[newKey] = iconParams
            return newKey
        }

        // プリセット路線を lineDict のキーに解決する（未登録の場合は iconDict・lineDict に新規追加する）
        const resolveLineKey = (presetLine: PresetLine): string => {
            const cached = resolvedKeyByPresetLineId[presetLine.id]
            if (cached !== undefined) return cached

            const lineIconKey = resolveIconKey(presetLine)

            // 路線本体の解決: 既存lineDict → 今回新規作成分の順に完全一致するものを探す
            const allLinesSoFar = { ...setting.lineDict, ...newLines }
            let lineKey = findMatchingLineKey(allLinesSoFar, presetLine, lineIconKey)
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

            for (let k = 0; k < indices.length; k++) {
                const idx = indices[k]
                const connect = connects[idx]
                // この区間でこの駅の前後に行き来する駅（同じ路線上の隣の駅）。乗換路線の「○○方面」の判定に使う
                const usedNeighbors = [indices[k - 1], indices[k + 1]]
                    .filter((n): n is number => n !== undefined)
                    .map(n => connects[n].stationId)
                // 連続区間の接続駅（重複）をスキップ: 路線ID+インデックスをキーにする
                const key = `${section.lineId}::${idx}`
                if (key === lastKey) {
                    // 重複した駅でも、次の区間で行き来する方向は直前の行に記録する
                    if (rowUsages.length > 0) recordUsage(rowUsages[rowUsages.length - 1], section.lineId, usedNeighbors)
                    continue
                }
                lastKey = key
                const station = allStations.find(s => s.id === connect.stationId)
                if (!station) continue
                // 路線が変わる接続駅（前区間の最終駅＝次区間の開始駅）は1行に統合する。
                // numIcon（前の路線）はそのまま残し、次の路線のナンバリングを numIconNext に入れる。
                // lineId は「この駅以降の区間路線ID」なので次の路線で上書きする
                const prev = result[result.length - 1]
                if (prev && lastStationId === station.id) {
                    recordUsage(rowUsages[rowUsages.length - 1], section.lineId, usedNeighbors)
                    // 同じ路線の区間どうし（環状線の継ぎ目）は同じ駅を通過するだけなので、統合のみで値は変えない
                    if (lastSectionLineId === section.lineId) continue
                    // 次の路線のナンバリングが1つ目と全ての値で同じ場合（例: 京浜東北線→根岸線の横浜 JK 12）は2つ目を設定しない
                    const nextNumIcon = toNumIcon(connect.number, lineColor, numIconPresetKey)
                    if (!isSameNumIcon(prev.numIcon, nextNumIcon)) prev.numIconNext = nextNumIcon
                    prev.lineId = resolvedLineKey
                    lastSectionLineId = section.lineId
                    continue
                }
                result.push(toStationType(station, lineColor, connect.number, resolvedLineKey, numIconPresetKey))
                const usage = { stationId: station.id, lines: new Map<string, Set<string>>() }
                recordUsage(usage, section.lineId, usedNeighbors)
                rowUsages.push(usage)
                lastStationId = station.id
                lastSectionLineId = section.lineId
            }
        }

        // 各駅に乗換路線を設定する（7.31節）
        result.forEach((row, i) => { row.transfers = buildTransfers(rowUsages[i], resolveIconKey) })
        return { stations: result, newLines, newIcons }
    }

    // 駅ごとの「ルートが使っている路線」の記録: 路線ID → その路線でこの駅から行き来する隣の駅IDの集合。
    // Map の挿入順＝到着する区間の路線、出発する区間の路線の順（乗換路線の並び順の「自社」の判定に使う）
    type RowUsage = { stationId: string, lines: Map<string, Set<string>> }
    const recordUsage = (usage: RowUsage, lineId: string, neighbors: string[]) => {
        if (!usage.lines.has(lineId)) usage.lines.set(lineId, new Set())
        neighbors.forEach(n => usage.lines.get(lineId)!.add(n))
    }

    // 1駅分の乗換路線を生成する（7.31節）。
    // - その駅（と乗換エッジでつながった駅）を通る路線のうち、この駅でルートが使っていない路線
    // - ルートが使っている路線の、この駅からルートが進まない方向（「○○線（××方面）」）
    // 並び順: 自社（この駅でルートが使う路線の事業者）→ 他社（lineDB に初めて現れる順）、同じ事業者内は路線IDの順
    const buildTransfers = (usage: RowUsage, resolveIconKey: (line: PresetLine) => string): transferItemType[] => {
        const lineIndexById = new Map(lines.map((l, i) => [l.id, i]))
        const lineById = new Map(lines.map(l => [l.id, l]))
        const stationById = new Map(allStations.map(s => [s.id, s]))
        // 事業者の並び順（lineDB に初めて現れる順）
        const operatorOrder: string[] = []
        for (const l of lines) if (!operatorOrder.includes(l.operator)) operatorOrder.push(l.operator)
        // 自社: この駅でルートが使っている路線の事業者（到着・出発の順）
        const ownOperators: string[] = []
        for (const lineId of usage.lines.keys()) {
            const op = lineById.get(lineId)?.operator
            if (op !== undefined && !ownOperators.includes(op)) ownOperators.push(op)
        }
        const operatorRank = (op: string) => {
            const own = ownOperators.indexOf(op)
            return own !== -1 ? own : ownOperators.length + operatorOrder.indexOf(op)
        }
        // 駅を通る路線ID（路線の登録順）
        const linesAtStation = (stationId: string): string[] => {
            const ids = new Set(lineConnects.filter(c => c.stationId === stationId).map(c => c.lineId))
            return lines.filter(l => ids.has(l.id)).map(l => l.id)
        }

        // 候補: 路線ID・ナンバリングを引く駅ID・方面の隣駅ID（方面でない場合は null）
        const candidates: { lineId: string, stationId: string, towardId: string | null }[] = []
        // その駅を通る、ルートで使っていない路線
        for (const lineId of linesAtStation(usage.stationId)) {
            if (!usage.lines.has(lineId)) candidates.push({ lineId, stationId: usage.stationId, towardId: null })
        }
        // 乗換エッジでつながった駅を通る路線（ルートで使っていないもの）。
        // 乗換グループの駅は1本道でつながっているため、エッジを端までたどってグループ内の全駅を対象にする（7.35節）
        const connected: string[] = []
        const visited = new Set<string>([usage.stationId])
        const queue = [usage.stationId]
        while (queue.length > 0) {
            const cur = queue.shift()!
            for (const t of transfers) {
                const next = t.stationId1 === cur ? t.stationId2 : t.stationId2 === cur ? t.stationId1 : null
                if (next === null || visited.has(next)) continue
                visited.add(next)
                connected.push(next)
                queue.push(next)
            }
        }
        for (const other of connected) {
            for (const lineId of linesAtStation(other)) {
                if (usage.lines.has(lineId) || candidates.some(c => c.lineId === lineId && c.towardId === null)) continue
                candidates.push({ lineId, stationId: other, towardId: null })
            }
        }
        // ルートで使っている路線の、ルートが進まない方向（その路線上でこの駅の隣にある駅ごと）
        for (const [lineId, used] of usage.lines) {
            const order = lineConnects.filter(c => c.lineId === lineId).map(c => c.stationId)
            const neighbors: string[] = []
            order.forEach((sid, i) => {
                if (sid !== usage.stationId) return
                for (const n of [order[i - 1], order[i + 1]]) {
                    if (n !== undefined && n !== usage.stationId && !neighbors.includes(n)) neighbors.push(n)
                }
            })
            for (const n of neighbors) {
                if (!used.has(n)) candidates.push({ lineId, stationId: usage.stationId, towardId: n })
            }
        }

        // 並び替え（同順位の方面は、隣駅を見つけた順のまま）
        const sorted = candidates
            .map((c, i) => ({ c, i }))
            .sort((a, b) => {
                const la = lineById.get(a.c.lineId), lb = lineById.get(b.c.lineId)
                return operatorRank(la?.operator ?? '') - operatorRank(lb?.operator ?? '')
                    || (lineIndexById.get(a.c.lineId) ?? 0) - (lineIndexById.get(b.c.lineId) ?? 0)
                    || a.i - b.i
            })
            .map(x => x.c)

        return sorted.flatMap(c => {
            const line = lineById.get(c.lineId)
            const st = stationById.get(c.stationId)
            if (!line || !st) return []
            // 乗換先の路線での、この駅のナンバリング（"JY 01" → 記号 "JY"・番号 "01"）
            const numberStr = lineConnects.find(x => x.lineId === c.lineId && x.stationId === c.stationId && x.number !== '')?.number ?? ''
            const spaceIdx = numberStr.indexOf(' ')
            const symbol = spaceIdx !== -1 ? numberStr.slice(0, spaceIdx) : ''
            const number = spaceIdx !== -1 ? numberStr.slice(spaceIdx + 1) : numberStr
            // 方面の場合は「路線名（隣駅名方面）」とする
            const toward = c.towardId !== null ? stationById.get(c.towardId) : undefined
            const iconKey = resolveIconKey(line)
            const item: transferItemType = {
                line: {
                    lineIconKey: iconKey ? [iconKey] : [],
                    name: toward ? `${line.name}（${toward.name}方面）` : line.name,
                    kana: toward ? `${line.kana}（${toward.kana}ほうめん）` : line.kana,
                    eng: toward ? `${line.eng} (for ${toward.eng})` : line.eng,
                },
                station: {
                    isDraw: false,
                    type: line.numIconPresetKey,
                    symbol,
                    color: line.color,
                    number,
                    name: st.name,
                    eng: st.eng,
                },
            }
            return [item]
        })
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

    // 「1つ戻る」ボタン → 末尾のルートを丸ごと削除し、前駅を巻き戻す
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

    // ガイダンステキストを状態に応じて生成（路線図は駅を直接クリックするため、路線選択の案内は出さない）
    const getGuidanceText = (): string => {
        if (prevStation === null) return '路線図から開始駅を選択してください'
        return `「${prevStation.station.name}」からハイライトされた駅を選択してください`
    }

    const guidanceText = getGuidanceText()

    return (
        // 全画面の「路線図から追加」画面（7.42節）。エディタの上に重ねて表示し、URL は変えない
        <div className="preset-screen">
            {/* 画面ヘッダー: 左にタイトル、右端に「追加せず閉じる」（確認なしで追加一覧を破棄して閉じる） */}
            <div className="app-header preset-screen-header">
                <h1>ポケットLCD</h1>
                <span className="preset-screen-title">路線図から追加</span>
                <button onClick={onClose} className="btn-secondary app-header-display-btn">追加せず閉じる</button>
            </div>

            {/* 路線図（ヘッダーより下の全体）と、その上に重ねる追加一覧ウィンドウ */}
            <div className="preset-screen-body">
                {/* 駅ノードは駅IDごとに1つで、乗換駅からは複数路線が伸びる。
                   操作ボタンの右に操作ガイダンスと読み込みエラーを表示する */}
                <StationPresetMap
                    lines={lines}
                    allStations={allStations}
                    lineConnects={lineConnects}
                    transfers={transfers}
                    startStationId={prevStation?.station.id ?? null}
                    onSelect={handleMapSelect}
                    toolbarExtra={
                        <div className="preset-map-guidance">
                            <span>{guidanceText}</span>
                            {loadError && <span style={{ color: 'var(--danger)' }}>{loadError}</span>}
                        </div>
                    }
                />

                {/* 追加一覧ウィンドウ（横画面は右寄せ・縦画面は下寄せ。globals.css のメディアクエリ）。
                   ヘッダーのボタン以外の部分をクリックすると開閉する。閉じるとヘッダーだけが残る */}
                <div className={`preset-staging-window${isStagingOpen ? '' : ' is-closed'}`}>
                    <div className="preset-staging-header" onClick={() => setIsStagingOpen(open => !open)}>
                        <span className="preset-staging-title">{isStagingOpen ? '▼' : '▲'} 追加一覧</span>
                        {/* ボタンのクリックでは開閉しない */}
                        <div className="btn-group" style={{ margin: 0 }} onClick={e => e.stopPropagation()}>
                            <button onClick={handleBack} className="btn-secondary" disabled={stagingList.length === 0}>1つ戻る</button>
                            <button onClick={handleAdd} className="btn-primary" disabled={stagingList.length === 0}>追加</button>
                        </div>
                    </div>
                    {isStagingOpen && (
                        <div className="preset-staging-list">
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
                    )}
                </div>
            </div>
        </div>
    )
}

export default StationPresetPopup
