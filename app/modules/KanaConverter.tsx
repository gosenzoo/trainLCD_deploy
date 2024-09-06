const kanaToAlphabet = (kana: string) => {
    const kanaToAlpDict: {[key: string]: string} = {
        "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
        "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
        "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
        "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
        "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
        "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
        "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
        "や": "ya", "ゆ": "yu", "よ": "yo",
        "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
        "わ": "wa", "を": "o", "ん": "n",
        "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
        "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
        "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
        "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
        "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
        "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
        "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
        "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
        "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
        "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
        "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
        "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
        "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
        "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
        "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
        "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
        "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o",
        "ゃ": "ya", "ゅ": "yu", "ょ": "yo", "っ": "tu",
        "ゐ": "i", "ゑ": "e",
        "しぇ": "shie", "ふぁ": "fua", "でぃ": "dei",
        "ヴぁ": "ba", "ちぇ": "chie", "ふぃ": "fui",
        "でゅ": "deyu", "ヴぃ": "bi", "てぃ": "tei",
        "ふぇ": "fue", "うぃ": "ui", "ヴ": "bu",
        "にぃ": "nii", "ふぉ": "fuo", "うぇ": "ue",
        "ヴぇ": "be", "にぇ": "nie", "じぇ": "jie",
        "ヴぉ": "buo"
    }

    //空文字をそのまま出力
    if (kana === "") {
        return ""
    }

    let alp: string = ""
    let i: number = 0
    while (i < kana.length) {
        //ひらがな以外をそのまま通す
        if (!(kana.substring(i, i + 1) in kanaToAlpDict)) {
            alp += kana.substring(i, i + 1)
            i++
            continue
        }

        //次の2文字がインデックスに含まれていると、変換して追加
        if (Object.keys(kanaToAlpDict).includes(kana.substring(i, i + Math.min(2, kana.length - i))) && kana.length - i > 1) {
            alp += kanaToAlpDict[kana.substring(i, i + 2)]
            i += 2
        } else {
            alp += kanaToAlpDict[kana.substring(i, i + 1)]
            i++
        }
    }

    // NanbaをNambaに
    for (i = 0; i < alp.length - 1; i++) {
        if (alp[i] === 'n' && (alp[i + 1] === 'b' || alp[i + 1] === 'm' || alp[i + 1] === 'p')) {
            alp = alp.substring(0, i) + "m" + alp.substring(i + 1)
        }
    }

    // 長音記号
    alp = alp.replace(/aa/g, "ā")
    alp = alp.replace(/ii/g, "ī")
    alp = alp.replace(/uu/g, "ū")
    alp = alp.replace(/ee/g, "ē")
    alp = alp.replace(/oo/g, "ō")
    alp = alp.replace(/ou/g, "ō")

    // 1文字目を大文字に
    if (/^[A-Za-z\u00C0-\u00FF\u0100-\u024F]+$/.test(alp[0])) {
        let first = alp[0]
        alp = first.toUpperCase() + alp.substring(1)
    }

    return alp
}

export default kanaToAlphabet