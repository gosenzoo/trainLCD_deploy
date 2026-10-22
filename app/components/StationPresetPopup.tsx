"use client"

import React, { useState, useEffect } from 'react'
import { IconTriangleUp, IconTriangleDown } from './SvgIcons'
import "../type"
import {
    loadLineDB, loadStationDB, loadLineConnectDB, loadTransferDB,
    PresetLine, PresetStation, PresetLineConnect, PresetTransfer,
    StationSection, StagedRoute, PRESET_DISPLAY_TYPES, PresetDisplayType, PresetOperatorShortRule, loadOperatorShortRuleDB
} from '../modules/loadStationPresets'
import StationPresetMap from './StationPresetMap'
import ToggleSwitch from './ToggleSwitch'

// 「追加設定」（7.63節）の保存先（ブラウザの localStorage のキー）。設定データには含めない
const PRESET_ADD_OPTIONS_KEY = 'presetAddOptions'
type PresetAddOptions = {
    useGenericIconForOtherOperators: boolean
    // 他社線を社名でまとめる・まとめる最小路線数（7.73節）
    groupOtherOperators: boolean
    groupOtherOperatorsMinCount: number
}
const DEFAULT_PRESET_ADD_OPTIONS: PresetAddOptions = { useGenericIconForOtherOperators: false, groupOtherOperators: false, groupOtherOperatorsMinCount: 1 }
// 最小路線数は1以上の整数だけ有効（それ以外は初期値の1）
const toMinCount = (value: unknown): number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : DEFAULT_PRESET_ADD_OPTIONS.groupOtherOperatorsMinCount
const loadPresetAddOptions = (): PresetAddOptions => {
    try {
        const saved = JSON.parse(localStorage.getItem(PRESET_ADD_OPTIONS_KEY) ?? '{}')
        return {
            useGenericIconForOtherOperators: saved?.useGenericIconForOtherOperators === true,
            groupOtherOperators: saved?.groupOtherOperators === true,
            groupOtherOperatorsMinCount: toMinCount(saved?.groupOtherOperatorsMinCount),
        }
    } catch {
        // 保存・読み込みできない場合（プライベートウィンドウなど）は初期値（オフ）として扱う
        return { ...DEFAULT_PRESET_ADD_OPTIONS }
    }
}
const savePresetAddOptions = (options: PresetAddOptions) => {
    try { localStorage.setItem(PRESET_ADD_OPTIONS_KEY, JSON.stringify(options)) } catch { /* 保存できなくても動作は続ける */ }
}

type Props = {
    setting: settingType  // lineDict・iconDict の既存エントリを参照するために使用（読み取り専用）
    // 追加確定時のコールバック。stations に加え、新規作成が必要な lineDict・iconDict の
    // エントリ（既存と重複しないもの）を渡す
    onAdd: (result: { stations: stationType[], newLines: Record<string, lineType>, newIcons: Record<string, iconParamsType> }) => void
    onClose: () => void
}

// 表示種別の切替ボタンのアイコン（7.43節）。車両の正面を簡略化した線画（24×24、色は文字色に従う）
const OPERATOR_TYPE_ICONS: Record<PresetDisplayType, React.ReactNode> = {
    // 新幹線: 丸みのある先頭形状と流線形の窓
    '新幹線': (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2.5c-4.2 0-7 3.4-7 8.5v5.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V11c0-5.1-2.8-8.5-7-8.5z" />
            <path d="M7.5 10.5c.3-2.6 2.1-4.5 4.5-4.5s4.2 1.9 4.5 4.5z" />
            <circle cx="8.5" cy="15" r="0.9" />
            <circle cx="15.5" cy="15" r="0.9" />
            <path d="M8 21.5l1.5-3M16 21.5l-1.5-3" />
        </svg>
    ),
    // JR在来線: 角ばった車体と横長の窓
    'JR在来線': (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
            <rect x="5" y="2.5" width="14" height="16" rx="2" />
            <rect x="7.5" y="5.5" width="9" height="5" rx="0.5" />
            <circle cx="8.5" cy="15" r="0.9" />
            <circle cx="15.5" cy="15" r="0.9" />
            <path d="M8 21.5l1.5-3M16 21.5l-1.5-3" />
        </svg>
    ),
    // 私鉄: 丸みのある車体と2枚の窓
    '私鉄': (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
            <rect x="5" y="2.5" width="14" height="16" rx="4" />
            <rect x="7.5" y="5.5" width="4" height="5" rx="0.5" />
            <rect x="12.5" y="5.5" width="4" height="5" rx="0.5" />
            <circle cx="8.5" cy="15" r="0.9" />
            <circle cx="15.5" cy="15" r="0.9" />
            <path d="M8 21.5l1.5-3M16 21.5l-1.5-3" />
        </svg>
    ),
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
// numIconPresetKey: 所属路線のナンバリングアイコンのプリセットキー（2つ目のナンバリングの初期値に使う）
// stationNumIconPresetKey: この駅のナンバリングに使うプリセットキー（駅ごとの指定があればそれ、なければ路線のもの。7.47節）
const toStationType = (station: PresetStation, lineColor: string, numberStr: string, lineId: string, numIconPresetKey: string, stationNumIconPresetKey: string): stationType => {
    return {
    name: station.name,
    kana: station.kana,
    eng: station.eng,
    // 中国語・韓国語・副駅名は駅プリセットの値を入れる（7.54節）
    zh: station.zh,
    ko: station.ko,
    subName: station.subName,
    numIcon: toNumIcon(numberStr, lineColor, stationNumIconPresetKey),
    numIconNext: emptyNumIconNext(numIconPresetKey),
    lineNumberType: "0",
    transfers: [],
    isPass: false,
    sectionTime: "60",  // 走行時間・停車時間（秒）の初期値（7.53節）
    stopTime: "20",
    lineId,
    operationId: "0",  // プリセットから追加する全駅に0番目の運用を設定する
    // 駅プリセットの緯度・経度を入れる（7.51節）。座標がない駅は null のまま
    coordinate: [station.lat, station.lon],
    transferText: "",
    transferTextEng: "",
    doorSide: "left",
    headerNumberingType: "0",
    transferListPlatform: "",
    otherLineInd: "",
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
    // 事業者略称の表（7.73節）。この組み合わせの乗換路線には事業者略称を付けない
    const [shortRules, setShortRules] = useState<PresetOperatorShortRule[]>([])
    // 区間の開始駅（前駅）: null = firstStation 状態、値あり = continuing 状態
    const [prevStation, setPrevStation] = useState<PrevStationRef | null>(null)
    // 追加一覧（ルートの配列。ルートは1つ以上の区間のまとまり）
    const [stagingList, setStagingList] = useState<StagedRoute[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)
    // CSV の読み込み中かどうか（読み込み中は「路線図をロード中」を表示する。7.44節）
    const [isLoading, setIsLoading] = useState<boolean>(true)
    // 追加一覧ウィンドウの開閉（7.42節）。画面を開くたびに「開いた状態」から始める
    const [isStagingOpen, setIsStagingOpen] = useState<boolean>(true)
    // 追加設定（7.63節）。「他社線を汎用記号にする」はブラウザに保存した値から始める
    const [addOptions, setAddOptions] = useState<PresetAddOptions>(() => loadPresetAddOptions())
    const [isAddOptionsOpen, setIsAddOptionsOpen] = useState<boolean>(false)
    const updateAddOptions = (options: PresetAddOptions) => {
        setAddOptions(options)
        savePresetAddOptions(options)
    }
    // 追加設定のポップアップは Esc でも閉じる
    useEffect(() => {
        if (!isAddOptionsOpen) return
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsAddOptionsOpen(false) }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isAddOptionsOpen])
    // 路線図に表示する表示種別（7.43節・7.73節）。画面を開くたびに全種別を表示した状態から始める
    const [visibleOperatorTypes, setVisibleOperatorTypes] = useState<ReadonlySet<PresetDisplayType>>(() => new Set(PRESET_DISPLAY_TYPES))

    // 表示種別の表示・非表示を切り替える
    const toggleOperatorType = (type: PresetDisplayType) => {
        setVisibleOperatorTypes(prev => {
            const next = new Set(prev)
            if (next.has(type)) next.delete(type)
            else next.add(type)
            return next
        })
    }

    // 全画面表示の間は、後ろのエディタのページがスクロールしないようにする（閉じたら元に戻す）
    useEffect(() => {
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prevOverflow }
    }, [])

    // マウント時に CSV を読み込む
    useEffect(() => {
        // transferDB・事業者略称の表は読み込めなくても空配列を返すため、読み込みエラーの原因にはならない
        Promise.all([loadLineDB(), loadStationDB(), loadLineConnectDB(), loadTransferDB(), loadOperatorShortRuleDB()])
            .then(([lineData, stationData, connectData, transferData, shortRuleData]) => {
                setLines(lineData)
                setAllStations(stationData)
                setLineConnects(connectData)
                setTransfers(transferData)
                setShortRules(shortRuleData)
            })
            .catch(() => setLoadError('CSVファイルの読み込みに失敗しました'))
            // 成功・失敗のどちらでも読み込み中の表示を消す
            .finally(() => setIsLoading(false))
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
        // presetType を渡すと、そのプリセットで作る（他社線の汎用記号。7.63節）
        const resolveIconKey = (presetLine: PresetLine, presetType?: string): string => {
            // 路線記号アイコンの解決: 既存iconDict → 今回新規作成分の順に完全一致するものを探す
            // presetType には lineDB の「路線アイコン」列（I_*）を使う
            const type = presetType ?? presetLine.iconPresetKey
            if (!type) return ''
            const iconParams: iconParamsType = { presetType: type, symbol: presetLine.symbol, color: presetLine.color }
            const allIconsSoFar = { ...setting.iconDict, ...newIcons }
            const existingIconKey = findMatchingIconKey(allIconsSoFar, iconParams)
            if (existingIconKey) return existingIconKey
            const newKey = generateUniqueIconKey(allIconsSoFar, presetType ? `line_${presetLine.id}_generic` : `line_${presetLine.id}`)
            newIcons[newKey] = iconParams
            return newKey
        }

        // 社名でまとめた他社線（7.73節）のアイコンを iconDict のキーに解決する。
        // プリセットだけを使い、路線記号・色は空にする。既存の iconDict に同じものがあればそれを使う
        const resolvePlainIconKey = (presetType: string): string => {
            const iconParams: iconParamsType = { presetType, symbol: '', color: '' }
            const allIconsSoFar = { ...setting.iconDict, ...newIcons }
            const existingIconKey = findMatchingIconKey(allIconsSoFar, iconParams)
            if (existingIconKey) return existingIconKey
            const newKey = generateUniqueIconKey(allIconsSoFar, `group_${presetType}`)
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
                // この駅のナンバリングのプリセット: 駅ごとの指定（例: 札幌駅の N_sapporo）があればそれ、なければ路線のもの（7.47節）
                const stationNumIconPresetKey = station.numIconPresetKey || numIconPresetKey
                // 路線が変わる接続駅（前区間の最終駅＝次区間の開始駅）は1行に統合する。
                // numIcon（前の路線）はそのまま残し、次の路線のナンバリングを numIconNext に入れる。
                // lineId は「この駅以降の区間路線ID」なので次の路線で上書きする
                const prev = result[result.length - 1]
                if (prev && lastStationId === station.id) {
                    recordUsage(rowUsages[rowUsages.length - 1], section.lineId, usedNeighbors)
                    // 同じ路線の区間どうし（環状線の継ぎ目）は同じ駅を通過するだけなので、統合のみで値は変えない
                    if (lastSectionLineId === section.lineId) continue
                    // 次の路線のナンバリングが1つ目と全ての値で同じ場合（例: 京浜東北線→根岸線の横浜 JK 12）は2つ目を設定しない
                    const nextNumIcon = toNumIcon(connect.number, lineColor, stationNumIconPresetKey)
                    // 駅ごとの指定のプリセットは路線カラーを使わないため、記号・番号・プリセットが同じなら色が違っても同じナンバリングとみなす（7.47節）
                    const isSameStationPreset = station.numIconPresetKey !== '' &&
                        prev.numIcon.presetKey === station.numIconPresetKey && nextNumIcon.presetKey === station.numIconPresetKey &&
                        prev.numIcon.symbol === nextNumIcon.symbol && prev.numIcon.number === nextNumIcon.number
                    if (!isSameStationPreset && !isSameNumIcon(prev.numIcon, nextNumIcon)) prev.numIconNext = nextNumIcon
                    prev.lineId = resolvedLineKey
                    lastSectionLineId = section.lineId
                    continue
                }
                result.push(toStationType(station, lineColor, connect.number, resolvedLineKey, numIconPresetKey, stationNumIconPresetKey))
                const usage = { stationId: station.id, lines: new Map<string, Set<string>>() }
                recordUsage(usage, section.lineId, usedNeighbors)
                rowUsages.push(usage)
                lastStationId = station.id
                lastSectionLineId = section.lineId
            }
        }

        // 各駅に乗換路線を設定する（7.31節）。並走区間の途中の駅では並走路線を外す（7.73節）
        const rowCandidates = rowUsages.map(collectTransferCandidates)
        removeParallelCandidates(rowCandidates)
        result.forEach((row, i) => { row.transfers = buildTransfers(rowUsages[i], rowCandidates[i], resolveIconKey, resolvePlainIconKey) })
        // ナンバリングは所属路線の設定を使う（自動）で入れる（7.59節）。
        // 路線記号・プリセット・色が所属路線（lineId の路線）とすべて一致する場合だけ自動にし、
        // 一致しない場合（路線をまたぐ駅の1つ目、駅ごとのプリセット、記号の違う駅など）は表示が変わらないよう手動のままにする
        const allLines = { ...setting.lineDict, ...newLines }
        result.forEach(row => {
            const line = allLines[row.lineId]
            if (!line) return
            ;([row.numIcon, row.numIconNext]).forEach(numIcon => {
                if (numIcon.symbol === line.symbol && numIcon.presetKey === line.numIconPresetKey && numIcon.color === line.color) {
                    numIcon.colorMode = 'auto'
                }
            })
        })
        return { stations: result, newLines, newIcons }
    }

    // 駅ごとの「ルートが使っている路線」の記録: 路線ID → その路線でこの駅から行き来する隣の駅IDの集合。
    // Map の挿入順＝到着する区間の路線、出発する区間の路線の順（乗換路線の並び順の「自社」の判定に使う）
    type RowUsage = { stationId: string, lines: Map<string, Set<string>> }
    const recordUsage = (usage: RowUsage, lineId: string, neighbors: string[]) => {
        if (!usage.lines.has(lineId)) usage.lines.set(lineId, new Set())
        neighbors.forEach(n => usage.lines.get(lineId)!.add(n))
    }

    // 乗換路線の候補: 路線ID・ナンバリングを引く駅ID（乗換先の路線の駅）・方面の隣駅ID（方面でない場合は null）
    type TransferCandidate = { lineId: string, stationId: string, towardId: string | null }

    // 1駅分の乗換路線の候補を集める（7.31節）。
    // - その駅（と乗換エッジでつながった駅）を通る路線のうち、この駅でルートが使っていない路線
    // - ルートが使っている路線の、この駅からルートが進まない方向（「○○線（××方面）」）
    const collectTransferCandidates = (usage: RowUsage): TransferCandidate[] => {
        // 駅を通る路線ID（路線の登録順）
        const linesAtStation = (stationId: string): string[] => {
            const ids = new Set(lineConnects.filter(c => c.stationId === stationId).map(c => c.lineId))
            return lines.filter(l => ids.has(l.id)).map(l => l.id)
        }

        const candidates: TransferCandidate[] = []
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
        // ルートで使っている路線の、ルートが進まない方向（その路線上でこの駅の隣にある駅ごと）。
        // ルートで使っている路線は自社の路線のため、他社線に「○○方面」は付かない（7.73節）
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
        return candidates
    }

    // 並走区間（7.73節）の途中の駅から、並走路線の候補を外す（rowCandidates を直接書き換える）。
    // 隣り合う2駅がどちらも同じ路線 M に乗り換えられ、乗換先の M の駅どうしも M の上で隣り合うとき、その2駅は M と並走している。
    // 前後の両方で M と並走している駅は並走区間の途中なので M を外す（ルートの始点・終点は前後の片方しかないため常に残る）
    const removeParallelCandidates = (rowCandidates: TransferCandidate[][]) => {
        // 路線 M の上で2駅が隣り合うか（同じ路線が同じ駅を2回通る環状線・6の字の路線も、どこかで隣り合えばよい）
        const orderCache = new Map<string, string[]>()
        const isAdjacentOnLine = (lineId: string, a: string, b: string): boolean => {
            if (a === b) return false
            let order = orderCache.get(lineId)
            if (!order) {
                order = lineConnects.filter(c => c.lineId === lineId).map(c => c.stationId)
                orderCache.set(lineId, order)
            }
            const o = order
            return o.some((sid, i) => sid === a && (o[i - 1] === b || o[i + 1] === b))
        }
        // 方面でない候補の、乗換先の駅ID
        const transferStation = (candidates: TransferCandidate[], lineId: string): string | undefined =>
            candidates.find(c => c.lineId === lineId && c.towardId === null)?.stationId
        // i 番目と i+1 番目の駅が路線 M と並走しているか
        const isParallel = (i: number, lineId: string): boolean => {
            if (i < 0 || i + 1 >= rowCandidates.length) return false
            const a = transferStation(rowCandidates[i], lineId)
            const b = transferStation(rowCandidates[i + 1], lineId)
            return a !== undefined && b !== undefined && isAdjacentOnLine(lineId, a, b)
        }
        // 判定は外す前の候補で行う（外した結果で隣の駅の判定が変わらないよう、先に外す路線を決めておく）
        const removals = rowCandidates.map((candidates, i) => new Set(
            candidates.filter(c => c.towardId === null && isParallel(i - 1, c.lineId) && isParallel(i, c.lineId)).map(c => c.lineId)))
        rowCandidates.forEach((candidates, i) => {
            if (removals[i].size === 0) return
            rowCandidates[i] = candidates.filter(c => c.towardId !== null || !removals[i].has(c.lineId))
        })
    }

    // 1駅分の乗換路線を生成する（7.31節・7.73節）。
    // 並び順: 自路線の種別ごとに決める（自路線が JR なら 新幹線→JR在来線→私鉄→地下鉄、
    //   私鉄なら 自社の路線→新幹線→JR在来線→私鉄→地下鉄、地下鉄なら 地下鉄→新幹線→JR在来線→私鉄）。
    //   同じ種別の中は 自社（この駅でルートが使う路線の事業者）→ 他社（lineDB に初めて現れる順）、同じ事業者内は路線IDの順
    // 「他社線を社名でまとめる」がオンなら、他社線を事業者略称（新幹線は別）ごとにまとめる
    const buildTransfers = (
        usage: RowUsage,
        candidates: TransferCandidate[],
        resolveIconKey: (line: PresetLine, presetType?: string) => string,
        resolvePlainIconKey: (presetType: string) => string,
    ): transferItemType[] => {
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
        const isOwn = (line: PresetLine) => ownOperators.includes(line.operator)
        // この駅でルートが使っている路線（到着・出発の順）
        const usedLines = [...usage.lines.keys()].map(id => lineById.get(id)).filter((l): l is PresetLine => l !== undefined)
        // 自路線: 到着する区間の路線（始点の駅では出発する区間の路線）＝ Map の挿入順の先頭
        const ownType = usedLines[0]?.operatorType ?? '私鉄'
        // 自路線の種別ごとの、種別の並び順（7.73節）
        const typeOrder: string[] = ownType === '地下鉄'
            ? ['地下鉄', '新幹線', 'JR在来線', '私鉄']
            : ['新幹線', 'JR在来線', '私鉄', '地下鉄']
        // 自路線が私鉄なら、自社の路線を種別より先に並べる（自社の路線の中は種別で分けない）
        const ownFirst = ownType === '私鉄'
        const rankOf = (line: PresetLine) => ownFirst && isOwn(line) ? -1 : typeOrder.indexOf(line.operatorType)

        // 並び替え（同順位の方面は、隣駅を見つけた順のまま）
        const sorted = candidates
            .map((c, i) => ({ c, i, line: lineById.get(c.lineId) }))
            .filter((x): x is { c: TransferCandidate, i: number, line: PresetLine } => x.line !== undefined)
            .sort((a, b) => rankOf(a.line) - rankOf(b.line)
                || operatorRank(a.line.operator) - operatorRank(b.line.operator)
                || (lineIndexById.get(a.c.lineId) ?? 0) - (lineIndexById.get(b.c.lineId) ?? 0)
                || a.i - b.i)

        // 事業者略称の表（7.73節）: 表にある組み合わせなら事業者略称を付けない。
        // 自路線の側は、この駅でルートが使っている路線（到着・出発）のどれかが当てはまればよい
        const matchesShort = (value: string, line: PresetLine) =>
            value === '全ての事業者' || (value === '全ての地下鉄' ? line.operatorType === '地下鉄' : line.operatorShort === value)
        const isShortSuppressed = (line: PresetLine) =>
            shortRules.some(r => usedLines.some(own => matchesShort(r.ownShort, own)) && matchesShort(r.otherShort, line))

        // 他社線を社名でまとめる（7.73節）: まとめる単位（事業者略称と、新幹線かどうか）ごとに路線数を数える。
        // 自社の路線・方面・地下鉄・事業者略称が空の路線はまとめない
        const groupKey = (c: TransferCandidate, line: PresetLine): string | null => {
            if (!addOptions.groupOtherOperators) return null
            if (c.towardId !== null || isOwn(line) || line.operatorType === '地下鉄' || !line.operatorShort) return null
            return `${line.operatorShort}::${line.operatorType === '新幹線' ? '新幹線' : '在来線'}`
        }
        const groupCounts = new Map<string, number>()
        for (const { c, line } of sorted) {
            const key = groupKey(c, line)
            if (key !== null) groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1)
        }
        // まとめた乗換路線は、まとめた路線のうち並び順で先頭の路線の位置に1つだけ出す
        const emittedGroups = new Set<string>()

        return sorted.flatMap(({ c, line }) => {
            const st = stationById.get(c.stationId)
            if (!st) return []

            // 最小路線数以上ならまとめる
            const key = groupKey(c, line)
            if (key !== null && (groupCounts.get(key) ?? 0) >= addOptions.groupOtherOperatorsMinCount) {
                if (emittedGroups.has(key)) return []
                emittedGroups.add(key)
                // 名前: 新幹線は「新幹線」、それ以外は「事業者略称 + 線」（略称が既に「線」〔英語は Line〕で終わる場合は付けない）
                const isShinkansen = line.operatorType === '新幹線'
                const endsWithSen = line.operatorShort.endsWith('線')
                const grouped: transferItemType = {
                    line: {
                        // 路線記号は地上路線汎用１（路線記号・色なし）
                        lineIconKey: [resolvePlainIconKey('I_train_normal1')],
                        name: isShinkansen ? '新幹線' : endsWithSen ? line.operatorShort : `${line.operatorShort}線`,
                        kana: isShinkansen ? 'しんかんせん' : endsWithSen ? line.operatorShortKana : `${line.operatorShortKana}せん`,
                        eng: isShinkansen ? 'Shinkansen' : line.operatorShortEng.endsWith('Line') ? line.operatorShortEng : `${line.operatorShortEng} Line`,
                    },
                    // ナンバリング・色はなし。駅名は先頭の路線の駅名
                    station: { isDraw: false, type: '', symbol: '', color: '', number: '', name: st.name, eng: st.eng },
                }
                return [grouped]
            }

            // 乗換先の路線での、この駅のナンバリング（"JY 01" → 記号 "JY"・番号 "01"）
            const numberStr = lineConnects.find(x => x.lineId === c.lineId && x.stationId === c.stationId && x.number !== '')?.number ?? ''
            const spaceIdx = numberStr.indexOf(' ')
            const symbol = spaceIdx !== -1 ? numberStr.slice(0, spaceIdx) : ''
            const number = spaceIdx !== -1 ? numberStr.slice(spaceIdx + 1) : numberStr
            // 方面の場合は「路線名（隣駅名方面）」とする
            const toward = c.towardId !== null ? stationById.get(c.towardId) : undefined
            // 他社線（この駅でルートが使っている事業者以外の路線）は路線名の前に事業者略称を付ける（7.62節。例: 西鉄天神大牟田線）
            // 路線名が既に略称で始まる場合（都営浅草線・近鉄名古屋線・Toei Asakusa Line など）は付けない（7.63節）
            // 事業者略称の表にある組み合わせ（例: 全ての事業者 → 全ての地下鉄）も付けない（7.73節）
            const isOtherOperator = !isOwn(line)
            const addShort = isOtherOperator && !isShortSuppressed(line)
            // 「他社線を汎用記号にする」がオンなら、他社線の路線記号はその路線の汎用記号にする（7.63節）
            const iconKey = addOptions.useGenericIconForOtherOperators && isOtherOperator
                ? resolveIconKey(line, line.genericIconPresetKey)
                : resolveIconKey(line)
            const withShort = (short: string, name: string, sep: string) =>
                addShort && short && !name.startsWith(short) ? `${short}${sep}${name}` : name
            const lineName = withShort(line.operatorShort, line.name, '')
            const lineKana = withShort(line.operatorShortKana, line.kana, '')
            const lineEng = withShort(line.operatorShortEng, line.eng, ' ')
            const item: transferItemType = {
                line: {
                    lineIconKey: iconKey ? [iconKey] : [],
                    name: toward ? `${lineName}（${toward.name}方面）` : lineName,
                    kana: toward ? `${lineKana}（${toward.kana}ほうめん）` : lineKana,
                    eng: toward ? `${lineEng} (for ${toward.eng})` : lineEng,
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

    // 「1つ戻る」ボタン（7.44節）。始点駅が選ばれているときだけ有効
    // - 追加一覧が空（始点駅だけ選択済み）: 始点駅の選択を解除する
    // - 追加一覧にルートがある: 末尾のルートを削除し、始点駅をそのルートの始点の駅に戻す
    //   （ルートが1つなら、最初に選んだ始点駅が選ばれた状態になる）
    const handleBack = () => {
        if (prevStation === null) return
        if (stagingList.length === 0) {
            setPrevStation(null)
            return
        }
        const removed = stagingList[stagingList.length - 1]
        setStagingList(stagingList.slice(0, -1))
        // 削除したルートの最初の区間の prevIndex の駅を新しい始点駅に設定
        const firstSection = removed.sections[0]
        const connects = lineConnects.filter(c => c.lineId === firstSection.lineId)
        const connect = connects[firstSection.prevIndex]
        const station = allStations.find(s => s.id === connect?.stationId)
        setPrevStation(station ? { station, lineId: firstSection.lineId, index: firstSection.prevIndex } : null)
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
                {/* 表示種別の切替ボタン（アイコン＋名前の正方形）。表示中の種別はハイライトする（7.43節） */}
                <div className="preset-type-toggles">
                    {PRESET_DISPLAY_TYPES.map(type => {
                        const isVisible = visibleOperatorTypes.has(type)
                        return (
                            <button
                                key={type}
                                className={`preset-type-toggle${isVisible ? ' is-on' : ''}`}
                                onClick={() => toggleOperatorType(type)}
                                aria-pressed={isVisible}
                                title={`${type}を${isVisible ? '非表示' : '表示'}にする`}
                            >
                                {OPERATOR_TYPE_ICONS[type]}
                                <span>{type}</span>
                            </button>
                        )
                    })}
                </div>
                {/* 縦画面では表記を「閉じる」に縮める（globals.css） */}
                <button onClick={onClose} className="btn-secondary app-header-display-btn">
                    <span className="preset-close-label-long">追加せず閉じる</span>
                    <span className="preset-close-label-short">閉じる</span>
                </button>
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
                    visibleOperatorTypes={visibleOperatorTypes}
                    toolbarExtra={
                        <div className="preset-map-guidance">
                            <span>{guidanceText}</span>
                            {loadError && <span style={{ color: 'var(--danger)' }}>{loadError}</span>}
                        </div>
                    }
                />

                {/* 読み込み中の表示（路線図の領域の中央。進捗バーは出さない。7.44節） */}
                {isLoading && <div className="preset-map-loading">路線図をロード中</div>}

                {/* 追加一覧ウィンドウ（横画面は右寄せ・縦画面は下寄せ。globals.css のメディアクエリ）。
                   ヘッダーのボタン以外の部分をクリックすると開閉する。閉じるとヘッダーだけが残る */}
                <div className={`preset-staging-window${isStagingOpen ? '' : ' is-closed'}`}>
                    <div className="preset-staging-header" onClick={() => setIsStagingOpen(open => !open)}>
                        <span className="preset-staging-title">{/* 三角形は文字ではなくSVGアイコン（7.70節） */}
                        {isStagingOpen ? <IconTriangleDown/> : <IconTriangleUp/>} 追加一覧</span>
                        {/* ボタンのクリックでは開閉しない */}
                        <div className="btn-group" style={{ margin: 0 }} onClick={e => e.stopPropagation()}>
                            {/* 追加設定（7.63節） */}
                            <button onClick={() => setIsAddOptionsOpen(true)} className="btn-secondary">追加設定</button>
                            <button onClick={handleBack} className="btn-secondary" disabled={prevStation === null}>1つ戻る</button>
                            <button onClick={handleAdd} className="btn-primary" disabled={stagingList.length === 0}>この区間を追加</button>
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
            {/* 「追加設定」ポップアップ（7.63節）。全画面の上に出すため最前面用の背景を使う */}
            {isAddOptionsOpen && (
                <div className="modal-backdrop-top" onClick={() => setIsAddOptionsOpen(false)}>
                    <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                        <div className="modal-title-row">
                            <p className="modal-title">追加設定</p>
                            <button className="modal-close-btn" onClick={() => setIsAddOptionsOpen(false)} title="閉じる">×</button>
                        </div>
                        <div className="form-row">
                            <label>他社線を汎用記号にする</label>
                            <ToggleSwitch
                                checked={addOptions.useGenericIconForOtherOperators}
                                onChange={(v) => updateAddOptions({ ...addOptions, useGenericIconForOtherOperators: v })}
                            />
                        </div>
                        {/* 他社線を社名でまとめる（7.73節） */}
                        <div className="form-row">
                            <label>他社線を社名でまとめる</label>
                            <ToggleSwitch
                                checked={addOptions.groupOtherOperators}
                                onChange={(v) => updateAddOptions({ ...addOptions, groupOtherOperators: v })}
                            />
                        </div>
                        {/* 最小路線数は「他社線を社名でまとめる」がオンのときだけ操作できる（オフのときはグレー表示） */}
                        <div className={`form-row${addOptions.groupOtherOperators ? '' : ' disp-config-disabled'}`}>
                            <label>他社線をまとめる最小路線数</label>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={addOptions.groupOtherOperatorsMinCount}
                                disabled={!addOptions.groupOtherOperators}
                                onChange={e => {
                                    // 1以上の整数のときだけ反映する（空欄・小数・0以下は無視）
                                    const n = Number(e.target.value)
                                    if (e.target.value !== '' && Number.isInteger(n) && n >= 1) {
                                        updateAddOptions({ ...addOptions, groupOtherOperatorsMinCount: n })
                                    }
                                }}
                            />
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setIsAddOptionsOpen(false)}>閉じる</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StationPresetPopup
