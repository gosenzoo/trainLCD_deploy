// ホーム案内の自列車・向かい側の列車の位置の計算（7.76節）。
// 表示ページの ProgressController._buildPlatformTrains と同じ計算をエディタの編集画面で使う

// 画面の幅・車両の間隔（表示ページと同じ）
export const DISPLAY_WIDTH = 1920
export const CAR_GAP = 5
// 向かい側の列車を縮小する消失点の y
const VANISH_Y = -2000

export type PlatformLayoutInput = {
    cars: number               // 自列車の両数
    headOffset: number         // 前方オフセット（自列車の左端）
    backOffset: number         // 後方オフセット
    leftOrRight: string        // 運用の進行方向
    doorSide: string           // 駅の開くドア
    otherCarNum: number        // 向かい側の列車の両数（0 以下は自列車と同じ）
    otherLeftSlotInd: number   // 向かい側の列車の左端スロット
}

export type PlatformLayout = {
    isFar: boolean             // 自列車が奥か
    myY: number                // 自列車の下端の y
    otherY: number             // 向かい側の列車の下端の y
    ratio: number              // 向かい側の列車の縮小率
    baseMode: 'left' | 'right'
    // スロット（自列車の1両ぶん）の長さ
    slotLength: number
    train: { cars: number, carLength: number, gap: number, left: number, right: number, baseX: number }
    // 向かい側の列車（縮小後の座標）
    otherTrain: { cars: number, carLength: number, gap: number, left: number, right: number, baseX: number, wholeLength: number }
}

export const computePlatformLayout = (p: PlatformLayoutInput): PlatformLayout => {
    const cars = Math.max(1, p.cars)
    const otherCars = p.otherCarNum > 0 ? p.otherCarNum : cars
    const baseMode = p.leftOrRight === 'right' ? 'right' : 'left'
    // スロットは自列車の1両ぶん。自列車の左端（前方オフセット）がスロット 0
    const wholeLength = DISPLAY_WIDTH - p.headOffset - p.backOffset
    const slotLength = (wholeLength - (cars - 1) * CAR_GAP) / cars
    const slotLeft = (slotInd: number) => p.headOffset + slotInd * (slotLength + CAR_GAP)
    const trainLength = (n: number) => slotLength * n + CAR_GAP * (n - 1)

    // 自列車が奥か（向きとドアの側が同じなら奥）
    const isFar = baseMode === p.doorSide
    const myY = isFar ? 480 : 818
    const otherY = isFar ? 804 : 463
    const ratio = (otherY - VANISH_Y) / (myY - VANISH_Y)
    const centerX = DISPLAY_WIDTH / 2
    const scale = (x: number) => (x - centerX) * ratio + centerX

    const myLeft = slotLeft(0)
    const myRight = myLeft + trainLength(cars)
    const otherLeft = slotLeft(p.otherLeftSlotInd)
    const otherRight = otherLeft + trainLength(otherCars)

    return {
        isFar, myY, otherY, ratio, baseMode, slotLength,
        train: { cars, carLength: slotLength, gap: CAR_GAP, left: myLeft, right: myRight, baseX: baseMode === 'right' ? myRight : myLeft },
        otherTrain: {
            cars: otherCars, carLength: slotLength * ratio, gap: CAR_GAP * ratio,
            left: scale(otherLeft), right: scale(otherRight),
            baseX: scale(baseMode === 'right' ? otherRight : otherLeft),
            wholeLength: trainLength(otherCars) * ratio,
        },
    }
}

// 対面列車の値（otherLineInd）が乗換案内の路線を指すとき、その番号を返す（「t2」→ 2）。それ以外は null
export const transferIndexOf = (otherLineInd: string): number | null => {
    const m = /^t(\d+)$/.exec(otherLineInd ?? '')
    return m ? parseInt(m[1]) : null
}
