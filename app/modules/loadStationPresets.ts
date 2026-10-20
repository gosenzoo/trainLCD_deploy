// 駅プリセット用の型定義

export type PresetStation = {
    id: string            // 全駅一意の駅ID
    name: string
    kana: string
    eng: string
    // 路線図の配置に使う座標（現在は仮値。未設定の場合は null）
    lat: number | null
    lon: number | null
    // 駅ごとのナンバリングアイコンのプリセット名（N_*。7.47節）。空文字なら所属路線のものを使う
    numIconPresetKey: string
    // 中国語（簡体字）・韓国語・副駅名（7.54節）。無ければ空文字
    zh: string
    ko: string
    subName: string
    // 所属路線は lineConnectDB から導出する（このオブジェクトには持たない）
}

export type PresetLine = {
    id: string
    operator: string      // 事業者（路線選択UIの分類用。現状は保持のみ）
    name: string
    kana: string
    eng: string
    color: string         // 路線カラー（HEX）
    symbol: string        // 路線記号
    iconPresetKey: string     // 路線アイコンのプリセット名（I_*）。iconDict の presetType に使う
    numIconPresetKey: string  // ナンバリングアイコンのプリセット名（N_*）
    operatorType: PresetOperatorType  // 事業者種別（路線図の表示切り替えに使う。7.43節）
    // 事業者略称（例: 西鉄・地下鉄・JR）とそのかな・英語（7.62節）。他社線の乗換路線名の前に付ける
    operatorShort: string
    operatorShortKana: string
    operatorShortEng: string
    // 汎用記号のプリセット名（I_train_normal1 / I_train_subway1。7.63節）。「他社線を汎用記号にする」で使う
    genericIconPresetKey: string
}

// 路線の事業者種別（7.43節）。路線図の表示切り替えボタンの並び順もこの順
export const PRESET_OPERATOR_TYPES = ['新幹線', 'JR在来線', '私鉄'] as const
export type PresetOperatorType = typeof PRESET_OPERATOR_TYPES[number]

// lineDB.csv の「事業者種別」列の値を種別に変換する。
// 列が空・未知の値のときは、事業者名が JR で始まれば JR在来線、それ以外は私鉄とする（生成スクリプトと同じ規則）
const toOperatorType = (value: string, operator: string): PresetOperatorType => {
    if ((PRESET_OPERATOR_TYPES as readonly string[]).includes(value)) return value as PresetOperatorType
    return operator.startsWith('JR') ? 'JR在来線' : '私鉄'
}

// 路線接続データ: 同一路線IDの行を上から順に並べると路線上の駅順序になる
export type PresetLineConnect = {
    lineId: string
    stationId: string
    number: string  // 駅ナンバリング
}

// 区間オブジェクト: 路線ID・前駅インデックス・次駅インデックス
// インデックスは lineConnects（同一路線IDで絞り込んだ配列）上の位置（一意）
// StationPresetPopup・StationPresetMap の両方で使うためここで定義する
export type StationSection = {
    lineId: string
    prevIndex: number
    nextIndex: number
}

// 追加一覧の1要素（ルート）。通常は区間1つ、環状線の継ぎ目をまたぐ場合は同じ路線の区間2つ
export type StagedRoute = {
    sections: StationSection[]
    // ルート選択ポップアップで選んだ場合の次駅名（追加一覧の表示に使う）
    nextStationName?: string
}

// 乗換エッジ: 別々の駅IDを持つ駅同士が乗り換え可能であることを表す（向きは持たない）。
// 現状はデータ保持と路線図表示のみに使い、区間選択には使わない
export type PresetTransfer = {
    stationId1: string
    stationId2: string
}

// stationDB.csv を fetch してパースし、全駅リストを返す
export const loadStationDB = async (): Promise<PresetStation[]> => {
    const res = await fetch('/csv/presetLines/stationDB.csv')
    const text = await res.text()
    return text
        .split('\n')
        .slice(1)  // ヘッダー行をスキップ
        .filter(line => line.trim() !== '')
        .map(line => {
            const cols = line.split(',')
            // 数値として解釈できない場合は null（座標未設定の駅として扱う）
            const num = (v: string | undefined) => {
                const n = Number(v?.trim())
                return v?.trim() && !isNaN(n) ? n : null
            }
            return {
                id: cols[0]?.trim() ?? '',
                name: cols[1]?.trim() ?? '',
                kana: cols[2]?.trim() ?? '',
                eng: cols[3]?.trim() ?? '',
                lat: num(cols[4]),
                lon: num(cols[5]),
                // 列順: 駅ID, 駅名, 駅名かな, 駅名英語, 緯度, 経度, ナンバリングアイコン, 中国語, 韓国語, 副駅名（列がなければ空文字）
                numIconPresetKey: cols[6]?.trim() ?? '',
                zh: cols[7]?.trim() ?? '',
                ko: cols[8]?.trim() ?? '',
                subName: cols[9]?.trim() ?? '',
            }
        })
        .filter(s => s.id !== '')
}

// lineDB.csv を fetch してパースし、路線リストを返す
export const loadLineDB = async (): Promise<PresetLine[]> => {
    const res = await fetch('/csv/presetLines/lineDB.csv')
    const text = await res.text()
    return text
        .split('\n')
        .slice(1)  // ヘッダー行をスキップ
        .filter(line => line.trim() !== '')
        .map(line => {
            const cols = line.split(',')
            // 列順: 路線ID, 事業者, 路線名, 路線名かな, 路線名英語, 路線カラー, 路線記号, 路線アイコン, ナンバリングアイコン, 事業者種別,
            //       事業者略称, 事業者略称かな, 事業者略称英語, 汎用記号
            const operator = cols[1]?.trim() ?? ''
            return {
                id: cols[0]?.trim() ?? '',
                operator: cols[1]?.trim() ?? '',
                name: cols[2]?.trim() ?? '',
                kana: cols[3]?.trim() ?? '',
                eng: cols[4]?.trim() ?? '',
                color: cols[5]?.trim() ?? '',
                symbol: cols[6]?.trim() ?? '',
                iconPresetKey: cols[7]?.trim() ?? '',
                numIconPresetKey: cols[8]?.trim() ?? '',
                operatorType: toOperatorType(cols[9]?.trim() ?? '', operator),
                operatorShort: cols[10]?.trim() ?? '',
                operatorShortKana: cols[11]?.trim() ?? '',
                operatorShortEng: cols[12]?.trim() ?? '',
                // 列が無い古い CSV では地上路線汎用１とする
                genericIconPresetKey: cols[13]?.trim() || 'I_train_normal1',
            }
        })
        .filter(l => l.id !== '')
}

// lineConnectDB.csv を fetch してパースし、路線接続データリストを返す
export const loadLineConnectDB = async (): Promise<PresetLineConnect[]> => {
    const res = await fetch('/csv/presetLines/lineConnectDB.csv')
    const text = await res.text()
    return text
        .split('\n')
        .slice(1)  // ヘッダー行をスキップ
        .filter(line => line.trim() !== '')
        .map(line => {
            const cols = line.split(',')
            return {
                lineId: cols[0]?.trim() ?? '',
                stationId: cols[1]?.trim() ?? '',
                number: cols[2]?.trim() ?? '',
            }
        })
        .filter(c => c.lineId !== '' && c.stationId !== '')
}

// transferDB.csv を fetch してパースし、乗換エッジリストを返す。
// 乗換データは任意のため、ファイルが無い・読み込めない場合は空配列として扱う
export const loadTransferDB = async (): Promise<PresetTransfer[]> => {
    try {
        const res = await fetch('/csv/presetLines/transferDB.csv')
        if (!res.ok) return []
        const text = await res.text()
        return text
            .split('\n')
            .slice(1)  // ヘッダー行をスキップ
            .filter(line => line.trim() !== '')
            .map(line => {
                const cols = line.split(',')
                return {
                    stationId1: cols[0]?.trim() ?? '',
                    stationId2: cols[1]?.trim() ?? '',
                }
            })
            // 空欄や同じ駅IDどうしの行は無効として除く
            .filter(t => t.stationId1 !== '' && t.stationId2 !== '' && t.stationId1 !== t.stationId2)
    } catch {
        return []
    }
}
