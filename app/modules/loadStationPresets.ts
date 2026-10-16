// 駅プリセット用の型定義

export type PresetStation = {
    id: string            // 全駅一意の駅ID
    name: string
    kana: string
    eng: string
    // 路線図の配置に使う座標（現在は仮値。未設定の場合は null）
    lat: number | null
    lon: number | null
    // 所属路線は lineConnectDB から導出する（このオブジェクトには持たない）
}

export type PresetLine = {
    id: string
    name: string
    kana: string
    eng: string
    color: string         // 路線カラー（HEX）
    symbol: string        // 路線記号
    numIconPresetKey: string  // ナンバリングアイコンのプリセット名
}

// 路線接続データ: 同一路線IDの行を上から順に並べると路線上の駅順序になる
export type PresetLineConnect = {
    lineId: string
    stationId: string
    number: string  // 駅ナンバリング
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
            return {
                id: cols[0]?.trim() ?? '',
                name: cols[1]?.trim() ?? '',
                kana: cols[2]?.trim() ?? '',
                eng: cols[3]?.trim() ?? '',
                color: cols[4]?.trim() ?? '',
                symbol: cols[5]?.trim() ?? '',
                numIconPresetKey: cols[6]?.trim() ?? '',
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
