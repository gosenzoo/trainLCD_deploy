# かな（ひらがな・カタカナ）を韓国語（ハングル）にする（7.54節）。
# 韓国の外来語表記法（日本語の表記）に沿う。app/modules/KanaToHangul.ts と同じ規則にする。
#   - か・た行（濁らないもの）とちゃ行は、語頭では平音（ㄱ・ㄷ・ㅈ）、語中・語末では激音（ㅋ・ㅌ・ㅊ）
#   - ん → パッチム ㄴ、っ → パッチム ㅅ
#   - 長音（ー、おう・おお・うう・いい など）は表記しない
#   - 空白・中黒など、かな以外の文字は区切りとしてそのまま残し、次のかなを語頭として扱う

# 初声・中声の番号
L = dict(g=0, n=2, d=3, r=5, m=6, b=7, s=9, ss=10, o=11, j=12, ch=14, k=15, t=16, p=17, h=18)
V = dict(a=0, ya=2, e=5, o=8, wa=9, we=15, wo=14, wi=16, yo=12, u=13, yu=17, eu=18, i=20)
T_N, T_S = 4, 19  # パッチム ㄴ（ん）・ㅅ（っ）

# かな1文字 → (語頭の初声, 語中の初声, 中声)
def _row(kana, li, lm, vowels):
    return {ch: (L[li], L[lm], V[v]) for ch, v in zip(kana, vowels)}
BASE = {}
BASE.update(_row('あいうえお', 'o', 'o', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('かきくけこ', 'g', 'k', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('がぎぐげご', 'g', 'g', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('さしすせそ', 's', 's', ['a', 'i', 'eu', 'e', 'o']))
BASE.update(_row('ざじずぜぞ', 'j', 'j', ['a', 'i', 'eu', 'e', 'o']))
BASE.update(_row('たて', 'd', 't', ['a', 'e']))
BASE.update(_row('と', 'd', 't', ['o']))
BASE['ち'] = (L['j'], L['ch'], V['i'])
BASE['つ'] = (L['ss'], L['ss'], V['eu'])
BASE.update(_row('だぢづでど', 'd', 'd', ['a', 'i', 'eu', 'e', 'o']))
BASE['ぢ'] = (L['j'], L['j'], V['i'])
BASE['づ'] = (L['j'], L['j'], V['eu'])
BASE.update(_row('なにぬねの', 'n', 'n', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('はひふへほ', 'h', 'h', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('ばびぶべぼ', 'b', 'b', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('ぱぴぷぺぽ', 'p', 'p', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('まみむめも', 'm', 'm', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('やゆよ', 'o', 'o', ['ya', 'yu', 'yo']))
BASE.update(_row('らりるれろ', 'r', 'r', ['a', 'i', 'u', 'e', 'o']))
BASE.update(_row('わゐゑを', 'o', 'o', ['wa', 'i', 'e', 'o']))
BASE['ゔ'] = (L['b'], L['b'], V['u'])

# 拗音の中声。じ・ぢ・ち の拗音は ㅏ・ㅜ・ㅗ にする（じゃ → 자）
YOON = {'ゃ': V['ya'], 'ゅ': V['yu'], 'ょ': V['yo']}
YOON_PLAIN = {'ゃ': V['a'], 'ゅ': V['u'], 'ょ': V['o']}
PLAIN_YOON_KANA = set('じぢち')
# 小さい母音の中声。う の後ろは w 系の母音になる（うぃ → 위）
SMALL_VOWEL = {'ぁ': V['a'], 'ぃ': V['i'], 'ぅ': V['u'], 'ぇ': V['e'], 'ぉ': V['o']}
SMALL_VOWEL_AFTER_U = {'ぁ': V['wa'], 'ぃ': V['wi'], 'ぇ': V['we'], 'ぉ': V['wo']}
# 長音として表記しない母音: 直前の中声 → 落とす母音のかな
LONG_VOWEL_DROP = {V['a']: 'あ', V['i']: 'い', V['u']: 'う', V['yu']: 'う', V['o']: 'うお', V['yo']: 'うお'}

def _to_hiragana(text):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in text)

def _compose(l, v, t):
    return chr(0xac00 + (l * 21 + v) * 28 + t)

def kana_to_hangul(kana):
    text = _to_hiragana(kana)
    out, word = [], []   # word: 組み立て中の単語の音節 [初声, 中声, 終声]
    def flush():
        out.extend(_compose(*s) for s in word)
        word.clear()
    i = 0
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if ch in BASE:
            last = word[-1] if word else None
            # 長音（直前と同じ系統の母音のかな）は表記しない
            if last and last[2] == 0 and ch in LONG_VOWEL_DROP.get(last[1], ''):
                i += 1
                continue
            li, lm, v = BASE[ch]
            l = lm if word else li
            if nxt in YOON:
                # 拗音（きゃ・しゅ・ちょ など）
                v = YOON_PLAIN[nxt] if ch in PLAIN_YOON_KANA else YOON[nxt]
                i += 1
            elif nxt in SMALL_VOWEL:
                # 小さい母音（ふぁ・てぃ・うぃ など）。ふ は ㅍ にする
                v = SMALL_VOWEL_AFTER_U.get(nxt, SMALL_VOWEL[nxt]) if ch == 'う' else SMALL_VOWEL[nxt]
                if ch == 'ふ': l = L['p']
                i += 1
            word.append([l, v, 0])
        elif ch in 'んっ':
            # ん・っ は直前の音節のパッチムにする（語頭にある場合は表記しない）
            if word and word[-1][2] == 0: word[-1][2] = T_N if ch == 'ん' else T_S
        elif ch == 'ー':
            pass  # 長音記号は表記しない
        else:
            # かな以外（空白・中黒・英数字など）は区切りとしてそのまま残す
            flush()
            out.append(ch)
        i += 1
    flush()
    return ''.join(out)

if __name__ == '__main__':
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    for w in sys.argv[1:]: print(w, kana_to_hangul(w))
