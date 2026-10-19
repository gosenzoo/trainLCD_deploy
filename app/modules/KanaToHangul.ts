// かな（ひらがな・カタカナ）を韓国語（ハングル）にする（7.54節）。
// 韓国の外来語表記法（日本語の表記）に沿う。
//   - か・た行（濁らないもの）とちゃ行は、語頭では平音（ㄱ・ㄷ・ㅈ）、語中・語末では激音（ㅋ・ㅌ・ㅊ）
//   - ん → パッチム ㄴ、っ → パッチム ㅅ
//   - 長音（ー、おう・おお・うう・いい など）は表記しない
//   - 空白・中黒など、かな以外の文字は区切りとしてそのまま残し、次のかなを語頭として扱う
// scripts/presetData/build_presets.py の kana_to_hangul と同じ規則にする

// 初声（ㄱ=0 … ㅎ=18）・中声（ㅏ=0 … ㅣ=20）の番号
const L = { g: 0, n: 2, d: 3, r: 5, m: 6, b: 7, s: 9, ss: 10, o: 11, j: 12, ch: 14, k: 15, t: 16, p: 17, h: 18 }
const V = { a: 0, ya: 2, e: 5, o: 8, wa: 9, we: 15, wo: 14, wi: 16, yo: 12, u: 13, yu: 17, eu: 18, i: 20 }
// パッチム（終声）の番号
const T_N = 4   // ㄴ（ん）
const T_S = 19  // ㅅ（っ）

// かな1文字 → [語頭の初声, 語中の初声, 中声]
const BASE: Record<string, [number, number, number]> = {
    'あ': [L.o, L.o, V.a], 'い': [L.o, L.o, V.i], 'う': [L.o, L.o, V.u], 'え': [L.o, L.o, V.e], 'お': [L.o, L.o, V.o],
    'か': [L.g, L.k, V.a], 'き': [L.g, L.k, V.i], 'く': [L.g, L.k, V.u], 'け': [L.g, L.k, V.e], 'こ': [L.g, L.k, V.o],
    'が': [L.g, L.g, V.a], 'ぎ': [L.g, L.g, V.i], 'ぐ': [L.g, L.g, V.u], 'げ': [L.g, L.g, V.e], 'ご': [L.g, L.g, V.o],
    'さ': [L.s, L.s, V.a], 'し': [L.s, L.s, V.i], 'す': [L.s, L.s, V.eu], 'せ': [L.s, L.s, V.e], 'そ': [L.s, L.s, V.o],
    'ざ': [L.j, L.j, V.a], 'じ': [L.j, L.j, V.i], 'ず': [L.j, L.j, V.eu], 'ぜ': [L.j, L.j, V.e], 'ぞ': [L.j, L.j, V.o],
    'た': [L.d, L.t, V.a], 'ち': [L.j, L.ch, V.i], 'つ': [L.ss, L.ss, V.eu], 'て': [L.d, L.t, V.e], 'と': [L.d, L.t, V.o],
    'だ': [L.d, L.d, V.a], 'ぢ': [L.j, L.j, V.i], 'づ': [L.j, L.j, V.eu], 'で': [L.d, L.d, V.e], 'ど': [L.d, L.d, V.o],
    'な': [L.n, L.n, V.a], 'に': [L.n, L.n, V.i], 'ぬ': [L.n, L.n, V.u], 'ね': [L.n, L.n, V.e], 'の': [L.n, L.n, V.o],
    'は': [L.h, L.h, V.a], 'ひ': [L.h, L.h, V.i], 'ふ': [L.h, L.h, V.u], 'へ': [L.h, L.h, V.e], 'ほ': [L.h, L.h, V.o],
    'ば': [L.b, L.b, V.a], 'び': [L.b, L.b, V.i], 'ぶ': [L.b, L.b, V.u], 'べ': [L.b, L.b, V.e], 'ぼ': [L.b, L.b, V.o],
    'ぱ': [L.p, L.p, V.a], 'ぴ': [L.p, L.p, V.i], 'ぷ': [L.p, L.p, V.u], 'ぺ': [L.p, L.p, V.e], 'ぽ': [L.p, L.p, V.o],
    'ま': [L.m, L.m, V.a], 'み': [L.m, L.m, V.i], 'む': [L.m, L.m, V.u], 'め': [L.m, L.m, V.e], 'も': [L.m, L.m, V.o],
    'や': [L.o, L.o, V.ya], 'ゆ': [L.o, L.o, V.yu], 'よ': [L.o, L.o, V.yo],
    'ら': [L.r, L.r, V.a], 'り': [L.r, L.r, V.i], 'る': [L.r, L.r, V.u], 'れ': [L.r, L.r, V.e], 'ろ': [L.r, L.r, V.o],
    'わ': [L.o, L.o, V.wa], 'ゐ': [L.o, L.o, V.i], 'ゑ': [L.o, L.o, V.e], 'を': [L.o, L.o, V.o],
    'ゔ': [L.b, L.b, V.u],
}

// 拗音（ゃ・ゅ・ょ）の中声。じ・ぢ・ち の拗音は ㅈ・ㅊ に ㅑ 系を付けず ㅏ・ㅜ・ㅗ にする（じゃ → 자）
const YOON: Record<string, number> = { 'ゃ': V.ya, 'ゅ': V.yu, 'ょ': V.yo }
const YOON_PLAIN: Record<string, number> = { 'ゃ': V.a, 'ゅ': V.u, 'ょ': V.o }
const PLAIN_YOON_KANA = new Set(['じ', 'ぢ', 'ち'])
// 小さい母音（ぁ・ぃ・ぅ・ぇ・ぉ）の中声。う の後ろは w 系の母音になる（うぃ → 위）
const SMALL_VOWEL: Record<string, number> = { 'ぁ': V.a, 'ぃ': V.i, 'ぅ': V.u, 'ぇ': V.e, 'ぉ': V.o }
const SMALL_VOWEL_AFTER_U: Record<string, number> = { 'ぁ': V.wa, 'ぃ': V.wi, 'ぇ': V.we, 'ぉ': V.wo }

// 長音として表記しない母音: 直前の中声 → 落とす母音のかな
const LONG_VOWEL_DROP: Record<number, string[]> = {
    [V.a]: ['あ'], [V.i]: ['い'], [V.u]: ['う'], [V.yu]: ['う'], [V.o]: ['う', 'お'], [V.yo]: ['う', 'お'],
}

// カタカナをひらがなにする（ー はそのまま）
const toHiragana = (text: string): string =>
    text.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))

const compose = (l: number, v: number, t: number): string => String.fromCharCode(0xac00 + (l * 21 + v) * 28 + t)

type Syllable = { l: number, v: number, t: number }

const kanaToHangul = (kana: string): string => {
    const text = toHiragana(kana)
    let out = ''
    let word: Syllable[] = []  // 組み立て中の単語の音節
    const flush = () => { out += word.map(s => compose(s.l, s.v, s.t)).join(''); word = [] }

    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        const base = BASE[ch]
        if (base) {
            const last = word[word.length - 1]
            // 長音（直前と同じ系統の母音のかな）は表記しない
            if (last && last.t === 0 && LONG_VOWEL_DROP[last.v]?.includes(ch)) continue
            const isInitial = word.length === 0
            let l = isInitial ? base[0] : base[1]
            let v = base[2]
            const next = text[i + 1]
            if (next && YOON[next] !== undefined) {
                // 拗音（きゃ・しゅ・ちょ など）
                v = PLAIN_YOON_KANA.has(ch) ? YOON_PLAIN[next] : YOON[next]
                i++
            } else if (next && SMALL_VOWEL[next] !== undefined) {
                // 小さい母音（ふぁ・てぃ・うぃ など）。ふ は ㅍ にする
                if (ch === 'う') v = SMALL_VOWEL_AFTER_U[next] ?? SMALL_VOWEL[next]
                else v = SMALL_VOWEL[next]
                if (ch === 'ふ') l = L.p
                i++
            }
            word.push({ l, v, t: 0 })
        } else if (ch === 'ん' || ch === 'っ') {
            // ん・っ は直前の音節のパッチムにする（語頭にある場合は表記しない）
            const last = word[word.length - 1]
            if (last && last.t === 0) last.t = ch === 'ん' ? T_N : T_S
        } else if (ch === 'ー') {
            // 長音記号は表記しない
        } else {
            // かな以外（空白・中黒・英数字など）は区切りとしてそのまま残す
            flush()
            out += ch
        }
    }
    flush()
    return out
}

export default kanaToHangul
