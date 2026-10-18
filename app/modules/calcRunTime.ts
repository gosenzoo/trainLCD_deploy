import "../type"

// 所要時間の計算（7.53節）。LCD側 public/Controller/src/obj/ProgressController.js の _calcTimeList と同じ規則にする

// 数値として使える秒数なら数値、使えなければ null（空文字・未設定・数値でない）
const toSeconds = (value: string | undefined): number | null => {
    if (value === undefined || value.trim() === '') return null
    const n = parseInt(value)
    return Number.isNaN(n) ? null : n
}

// from 駅から to 駅までの所要時間（秒）。間の区間の走行時間と、間にある停車駅の停車時間を合計する。
// 通過駅の停車時間、出発する駅と行き先の駅の停車時間は含めない。計算できなければ null
export const calcRunSeconds = (stationList: stationType[], from: number, to: number): number | null => {
    let sum = 0
    for (let i = from; i < to; i++) {
        // 間にある停車駅の停車時間（出発する駅 from は除く）
        if (i > from && !stationList[i].isPass) {
            const stop = toSeconds(stationList[i].stopTime)
            if (stop === null) return null
            sum += stop
        }
        const run = toSeconds(stationList[i].sectionTime)
        if (run === null) return null
        sum += run
    }
    return sum
}

// 秒を分に直す（60で割って四捨五入）
export const secondsToMinutes = (seconds: number): number => Math.round(seconds / 60)
