// 駅プリセット用の型定義

export type PresetStation = {
    id: string            // 全駅一意の駅ID
    name: string
    kana: string
    eng: string
    // 所属路線は lineConnectDB から導出する（このオブジェクトには持たない）
}

export type PresetLine = {
    id: string
    name: string
    kana: string
    eng: string
    color: string         // 路線カラー（HEX）
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
            return {
                id: cols[0]?.trim() ?? '',
                name: cols[1]?.trim() ?? '',
                kana: cols[2]?.trim() ?? '',
                eng: cols[3]?.trim() ?? '',
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
