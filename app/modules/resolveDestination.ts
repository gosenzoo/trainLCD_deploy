import "../type"

// 実際に表示される行先（7.49節）。表示側 public/Controller/src/utility/utils.js の applyOperationFallbacks と同じ規則で求める
export type resolvedDestinationType = {
    destination: string,
    destinationKana: string,
    destinationEng: string,
    destinationNum: string,
    destinationColor: string,
    destinationNumIconKey: string,
}

// 末尾停車駅: 駅一覧を末尾から見て最初の停車駅。なければ最後の駅（駅一覧が空なら undefined）
export const getLastStopStation = (stationList: stationType[]): stationType | undefined =>
    [...stationList].reverse().find(s => !s.isPass) ?? stationList[stationList.length - 1]

// 「行先を自動で設定する」がオンなら末尾停車駅の値、オフなら運用の値を返す
export const resolveDestination = (operation: operationType, stationList: stationType[]): resolvedDestinationType => {
    // isAutoDestination がない旧データはオンとみなす
    if (operation.isAutoDestination === false) {
        return {
            destination: operation.destination,
            destinationKana: operation.destinationKana,
            destinationEng: operation.destinationEng,
            destinationNum: operation.destinationNum,
            destinationColor: operation.destinationColor,
            destinationNumIconKey: operation.destinationNumIconKey,
        }
    }
    const station = getLastStopStation(stationList)
    // ナンバリングは終点に着く側の路線（numIcon）。「記号 番号」の形にする（記号が空なら番号のみ）
    const numIcon = station?.numIcon
    const num = numIcon?.number
        ? (numIcon.symbol ? `${numIcon.symbol} ${numIcon.number}` : numIcon.number)
        : ''
    return {
        destination: station?.name ?? '',
        destinationKana: station?.kana ?? '',
        destinationEng: station?.eng ?? '',
        destinationNum: num,
        destinationColor: numIcon?.color ?? '',
        destinationNumIconKey: numIcon?.presetKey ?? '',
    }
}

// 運用のラベル「運用[id]: [行先自動][種別] [行先]行」（運用タブ・次区間運用の選択肢で共通。4.9節）
export const getOperationLabel = (id: string, operation: operationType, stationList: stationType[]): string => {
    const autoText = operation.isAutoDestination !== false ? '(行先自動)' : ''
    const typeText = operation.trainType ? `${operation.trainType} ` : ''
    const destination = resolveDestination(operation, stationList).destination || '行先未設定'
    return `運用${id}: ${autoText}${typeText}${destination}行`
}
