// ============================================================
// Controller共通ユーティリティ関数
// ============================================================

/**
 * 駅番号文字列を路線記号と番号に分割する
 * スペース区切りがある場合はスペースで分割し、記号・番号にスペースを含めない
 * 例: "H 08"  → { symbol: "H",  number: "08" }
 *     "G12"   → { symbol: "G",  number: "12" }
 *     "JY03"  → { symbol: "JY", number: "03" }
 *     "12"    → { symbol: "",   number: "12" }
 */
function parseStationNumber(numberStr) {
    if (!numberStr) return { symbol: "", number: "" };
    // スペース区切りで記号と番号を分割する（例: "H 08" → symbol="H", number="08"）
    const spaceIdx = numberStr.indexOf(' ');
    if (spaceIdx !== -1) {
        return { symbol: numberStr.slice(0, spaceIdx), number: numberStr.slice(spaceIdx + 1) };
    }
    // スペースなしの場合は非数字／数字の境界で分割する（例: "TY01"）
    const match = numberStr.match(/^([^0-9]*)([0-9].*)$/);
    if (match) {
        return { symbol: match[1], number: match[2] };
    }
    return { symbol: "", number: numberStr };
}

/**
 * 配列を循環インデックスで取得する
 * 例: getCircularItem([A,B,C], 4) → B
 */
function getCircularItem(arr, i) {
    const len = arr.length;
    return arr[((i % len) + len) % len];
}

/**
 * stationListのfromInd以降で最初の停車駅（isPass=false）を返す
 * 見つからない場合はリストの末尾駅を返す
 */
function getNextStopStation(stationList, fromInd) {
    for (let i = fromInd; i < stationList.length; i++) {
        if (!stationList[i].isPass) return stationList[i];
    }
    return stationList[stationList.length - 1];
}

/**
 * operationListからsectionIndに対応するoperationを取得する
 * startStationInd <= sectionInd を満たす最後のoperationを返す
 * 見つからない場合はnullを返す
 */
function getOperationForSection(operationList, sectionInd) {
    const sorted = [...operationList].sort(
        (a, b) => Number(a.startStationInd) - Number(b.startStationInd)
    );
    let result = null;
    for (const op of sorted) {
        if (Number(op.startStationInd) <= sectionInd) {
            result = op;
        } else {
            break;
        }
    }
    return result;
}

/**
 * operationにデフォルト値・フォールバック値を適用して返す
 * LCDController.getOperation()の移植
 * @param {object|null} operation - 選択されたoperation（nullの場合はデフォルト生成）
 * @param {object} lastStopStation  - 末尾停車駅（行先フォールバック用）
 * @returns {object} フォールバック適用済みのoperation
 */
function applyOperationFallbacks(operation, lastStopStation) {
    // operationが未設定の場合はデフォルト値で生成（所要時間表示は初期値オフ。7.51節）
    if (!operation) {
        operation = {
            destination: "", destinationKana: "", destinationEng: "",
            destinationNum: "", destinationColor: "", destinationNumIconKey: "",
            direction: "", trainType: "", trainTypeEng: "",
            trainTypeSub: "", trainTypeSubEng: "", trainTypeColor: "",
            lineLogo: "", lineColor: "", carNumber: "",
            leftOrRight: "right", isDispTime: false, isDispLineName: true,
            carNumberList: "1*,2,3,4,5,6,7,8", headOffset: "170", backOffset: "170",
            isDrawStopText: false, isDrawLine: false, carLineColor: "#FFFFFF",
            startStationInd: "0"
        };
        // 運用が未設定の区間は「行先を自動で設定する」がオンと同じ扱いにする（7.49節）
        operation.isAutoDestination = true;
    } else {
        // 元の運用（operationDict のエントリ）を書き換えないよう複製してから上書きする
        operation = { ...operation };
    }
    // isAutoDestination がない旧データはオンとみなす
    const isAuto = operation.isAutoDestination !== false;

    // 「行先を自動で設定する」がオンなら行先の6項目を末尾停車駅の値で上書きし、オフなら運用の値をそのまま使う（7.49節）
    // ナンバリングは駅の numIcon サブオブジェクトから取る（終点に着く側の路線なので numIconNext ではなく numIcon）
    const lastNumIcon = lastStopStation?.numIcon || {};
    const lastStopValues = {
        name: lastStopStation?.name,
        kana: lastStopStation?.kana,
        eng:  lastStopStation?.eng,
        // parseStationNumber で記号と番号に戻せるよう「記号 番号」の形にする（記号が空なら番号のみ）
        number: lastNumIcon.number
            ? (lastNumIcon.symbol ? `${lastNumIcon.symbol} ${lastNumIcon.number}` : lastNumIcon.number)
            : "",
        color:     lastNumIcon.color,
        presetKey: lastNumIcon.presetKey,
    };
    const destFallbackMap = [
        ["destination",           "name"],
        ["destinationKana",       "kana"],
        ["destinationEng",        "eng"],
        ["destinationNum",        "number"],
        ["destinationColor",      "color"],
        ["destinationNumIconKey", "presetKey"],
    ];
    if (isAuto) {
        destFallbackMap.forEach(([opField, valueKey]) => {
            operation[opField] = lastStopValues[valueKey] || "";
        });
    }

    // 種別（日本語）が空で「普通」で補う場合は、中国語・韓国語も「普通」「보통」で補う（7.54節）。
    // 日本語の種別が入力されていれば、中国語・韓国語が空でも空のままにする
    if (!operation.trainType) {
        if (!operation.trainTypeZh) operation.trainTypeZh = "普通";
        if (!operation.trainTypeKo) operation.trainTypeKo = "보통";
    }

    // その他パラメータが空の場合は固定デフォルト値で補完
    const fixedFallbackMap = [
        ["carNumber",      "1"],
        ["trainType",      "普通"],
        ["trainTypeEng",   "Local"],
        ["trainTypeColor", "#0185ff"],
    ];
    fixedFallbackMap.forEach(([opField, defaultVal]) => {
        if (!operation[opField]) {
            operation[opField] = defaultVal;
        }
    });

    return operation;
}
