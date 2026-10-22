// 生成部品の生成関数（public/Drawer/src/generators/。7.74節）をエディタに読み込む（7.75節）。
// 表示ページと同じ JS を <script> で順に読み込み、window.lcdGenerators（生成関数の対応表）を使えるようにする

// 生成関数の対応表の型（rail / platform / train。引数は各生成関数の引数名と値）
export type LcdGenerators = Record<string, (params: Record<string, unknown>, ctx: { textDrawer: unknown }) => SVGGElement>

// 読み込む順（generators.js はほかのファイルの関数を使うため最後）
const GENERATOR_SCRIPTS = [
    'colorChanger.js',
    'createRail.js',
    'createPlatform.js',
    'createTrain.js',
    'TransferWidget.js',
    'generators.js',
].map(name => `/Drawer/src/generators/${name}`)

// 読み込みは1回だけ行う（同じスクリプトを2回読むとクラスの再宣言でエラーになるため）
let loading: Promise<LcdGenerators | null> | null = null

const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.async = false
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`読み込めませんでした: ${src}`))
    document.head.appendChild(el)
})

// 生成関数の対応表を返す。読み込めなかった場合は null
export const loadGenerators = (): Promise<LcdGenerators | null> => {
    if (loading) return loading
    loading = (async () => {
        const w = window as unknown as { lcdGenerators?: LcdGenerators }
        if (w.lcdGenerators) return w.lcdGenerators
        for (const src of GENERATOR_SCRIPTS) await loadScript(src)
        return w.lcdGenerators ?? null
    })().catch(e => {
        console.warn('[loadGenerators]', e)
        return null
    })
    return loading
}
