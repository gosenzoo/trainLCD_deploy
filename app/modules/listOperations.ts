/**
 * リスト並び替え共通ユーティリティ
 * StationList（配列）・LineList・IconList（辞書）それぞれの上下移動をサポートする。
 */

// =========================================================
// 配列系（StationList 向け）
// selectedIndexes は 0-based インデックス
// =========================================================

/**
 * 配列要素を上に移動する。
 * 先頭選択がある場合は何もしない。複数選択時はグループごと1ステップ移動。
 */
export function moveArrayItemsUp<T>(
    arr: T[],
    selectedIndexes: number[]
): { newArr: T[], newSelected: number[] } {
    if (selectedIndexes.length === 0) return { newArr: arr, newSelected: selectedIndexes }

    const sorted = [...selectedIndexes].sort((a, b) => a - b)
    if (sorted[0] === 0) return { newArr: arr, newSelected: selectedIndexes }  // 先頭は移動不可

    const newArr = [...arr]
    // 昇順で処理することで連続選択でも正しく移動できる
    sorted.forEach(i => {
        ;[newArr[i - 1], newArr[i]] = [newArr[i], newArr[i - 1]]
    })
    return { newArr, newSelected: sorted.map(i => i - 1) }
}

/**
 * 配列要素を下に移動する。
 * 末尾選択がある場合は何もしない。複数選択時はグループごと1ステップ移動。
 */
export function moveArrayItemsDown<T>(
    arr: T[],
    selectedIndexes: number[]
): { newArr: T[], newSelected: number[] } {
    if (selectedIndexes.length === 0) return { newArr: arr, newSelected: selectedIndexes }

    const sorted = [...selectedIndexes].sort((a, b) => b - a)
    if (sorted[0] === arr.length - 1) return { newArr: arr, newSelected: selectedIndexes }  // 末尾は移動不可

    const newArr = [...arr]
    // 降順で処理することで連続選択でも正しく移動できる
    sorted.forEach(i => {
        ;[newArr[i], newArr[i + 1]] = [newArr[i + 1], newArr[i]]
    })
    return { newArr, newSelected: sorted.map(i => i + 1) }
}

// =========================================================
// 辞書系（LineList・IconList 向け）
// orderedKeys: 現在の表示順のキー配列
// swapped: 値が入れ替わったキーのペア配列（呼び出し側が cross-reference 更新に使用）
// newSelected: 移動後の新しい選択キー
// =========================================================

/**
 * 辞書エントリを上に移動する。
 * 選択キーの値を一つ上のキーの値と交換し、swapped で交換ペアを返す。
 */
export function moveDictItemsUp<T>(
    dict: Record<string, T>,
    orderedKeys: string[],
    selectedKeys: string[]
): { newDict: Record<string, T>, swapped: [string, string][], newSelected: string[] } {
    if (selectedKeys.length === 0) return { newDict: dict, swapped: [], newSelected: selectedKeys }

    // 選択キーを orderedKeys 内の位置に変換し昇順でソートする
    const sortedPos = selectedKeys
        .map(k => orderedKeys.indexOf(k))
        .filter(i => i !== -1)
        .sort((a, b) => a - b)

    if (sortedPos[0] === 0) return { newDict: dict, swapped: [], newSelected: selectedKeys }  // 先頭は移動不可

    const newDict = { ...dict }
    const swapped: [string, string][] = []
    const keyMoveMap = new Map<string, string>()

    // 昇順で処理することで連続選択でも正しく移動できる
    sortedPos.forEach(pos => {
        const keyA = orderedKeys[pos - 1]  // 一つ上のキー
        const keyB = orderedKeys[pos]      // 選択キー
        ;[newDict[keyA], newDict[keyB]] = [newDict[keyB], newDict[keyA]]
        swapped.push([keyA, keyB])
        // 選択キー keyB の値が keyA へ移動したため、選択も keyA に追随する
        keyMoveMap.set(keyB, keyA)
    })

    const newSelected = selectedKeys.map(k => keyMoveMap.get(k) ?? k)
    return { newDict, swapped, newSelected }
}

/**
 * 辞書エントリを下に移動する。
 * 選択キーの値を一つ下のキーの値と交換し、swapped で交換ペアを返す。
 */
export function moveDictItemsDown<T>(
    dict: Record<string, T>,
    orderedKeys: string[],
    selectedKeys: string[]
): { newDict: Record<string, T>, swapped: [string, string][], newSelected: string[] } {
    if (selectedKeys.length === 0) return { newDict: dict, swapped: [], newSelected: selectedKeys }

    // 選択キーを orderedKeys 内の位置に変換し降順でソートする
    const sortedPos = selectedKeys
        .map(k => orderedKeys.indexOf(k))
        .filter(i => i !== -1)
        .sort((a, b) => b - a)

    if (sortedPos[0] === orderedKeys.length - 1) return { newDict: dict, swapped: [], newSelected: selectedKeys }  // 末尾は移動不可

    const newDict = { ...dict }
    const swapped: [string, string][] = []
    const keyMoveMap = new Map<string, string>()

    // 降順で処理することで連続選択でも正しく移動できる
    sortedPos.forEach(pos => {
        const keyA = orderedKeys[pos]      // 選択キー
        const keyB = orderedKeys[pos + 1]  // 一つ下のキー
        ;[newDict[keyA], newDict[keyB]] = [newDict[keyB], newDict[keyA]]
        swapped.push([keyA, keyB])
        // 選択キー keyA の値が keyB へ移動したため、選択も keyB に追随する
        keyMoveMap.set(keyA, keyB)
    })

    const newSelected = selectedKeys.map(k => keyMoveMap.get(k) ?? k)
    return { newDict, swapped, newSelected }
}
