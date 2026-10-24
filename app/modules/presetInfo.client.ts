"use client"

// プリセットの SVG から、一覧の画像用の初期値と表現できる要素を読み取る（7.78節）

export type PresetInfo = {
    // <data id="defaultValue"> の属性。ない属性は空文字
    symbol: string
    number: string
    color: string
    // 表現できる要素（SVG の要素の id から判定する）
    hasSymbol: boolean
    hasNumber: boolean
    hasColor: boolean
}

// 同じプリセットを何度もパースしないよう結果を覚えておく
const cache: Record<string, PresetInfo> = {}

export function getPresetInfo(presetTexts: Record<string, string>, key: string): PresetInfo | null {
    if (cache[key]) return cache[key]
    const text = presetTexts[key]
    if (!text || typeof DOMParser === "undefined") return null

    // コメントアウトされた要素はパース時に DOM に入らないので数えない
    const doc = new DOMParser().parseFromString(text, "image/svg+xml")
    const root = doc.documentElement
    const data = root.querySelector("data")
    const info: PresetInfo = {
        symbol: data?.getAttribute("symbol") ?? "",
        number: data?.getAttribute("number") ?? "",
        color: data?.getAttribute("color") ?? "",
        hasSymbol: root.querySelector("#symbolArea") !== null,
        hasNumber: root.querySelector("#numberArea") !== null,
        hasColor: root.querySelector("#lineColor") !== null,
    }
    cache[key] = info
    return info
}
