# Controller 仕様書（理解まとめ）

> 元仕様: `controllerSpec.txt`（typo 修正済み）  
> 参照: `public/Drawer/manuals/drawParamsSpec.md`, `public/jsMojules/utilClass/ProgressController.js`, `public/jsMojules/utilClass/PageRotator.js`, `public/jsMojules/LCDController.js`  
> QA: `QA.txt`（Q1〜Q7 の確認事項と回答）

---

## 1. システム上の位置づけ

```
[データ作成画面]
      ↓ settings
  Controller          ← このモジュール
      ↓ drawParams
   [Drawer]
```

- **インプット**: `settings` オブジェクト（`app/type.ts` の `settingType` に相当）
- **アウトプット**: `drawParams` オブジェクト（`drawParamsSpec.md` に定義）
- 実装言語: JavaScript（ES6 クラス構文）
- 実装制約: `public/Controller/` 配下のファイルのみ編集可。他フォルダのクラスを使う場合はファイルをコピーして配置する。

---

## 2. クラス構成

```
Controller               (public)
├── ProgressController   (private)
├── PageController       (private)
└── LangController       (private)
```

---

## 3. ProgressController

### 概要

列車の路線内での位置・走行状態・長時間停車を管理する。現行アプリの `ProgressController.js` に近い。

### コンストラクタに渡す progressParams

Controller が settings から以下を抽出して渡す：

| フィールド | 型 | 元の場所 |
|---|---|---|
| stationList | stationType[] | settings.stationList |
| operationList | operationType[] | settings.operationList |
| info | infoType | settings.info（isLoop など） |
| lineDict | object | settings.lineDict |
| iconDict | object | settings.iconDict |

### 内部状態

| 内部状態 | 型 | 説明 |
|---|---|---|
| stationList | array | ルートの全駅リスト |
| stateIndNum | number | 全状態数（`statesPerStation × 駅数`） |
| runState | — | 走行中 / 停車中（computed） |
| posState | — | つぎは / まもなく / ただいま（computed） |
| isStopping | boolean | 長時間停車中かどうか |

### stateInd（状態インデックス）の仕組み

- `statesPerStation = 3`（1駅あたりの状態数）
- `stateInd` が全状態を通し番号で表す整数
- `posState = stateInd % 3`
  - `0` → 線路上（**つぎは**）
  - `1` → 駅手前（**まもなく**）
  - `2` → 駅上（**ただいま**）
- `currentStationInd = Math.floor(stateInd / 3)`
- `runState`
  - 通過駅 → 0（走行中）
  - posState === 2 かつ停車駅 → 1（停車中）
  - それ以外 → 0（走行中）
- `isTerminal`: 現在駅以降に停車駅がなければ `true`（非環状のみ）
- 非環状時: stateInd 下限 = `statesPerStation - 1`（1駅目「ただいま」）、上限 = `3 × 駅数 - 1`
- 環状時: 範囲外は剰余で循環

### drawParams.runState との対応

| posState | runState | drawParams.runState |
|---|---|---|
| 2 | 1（停車中） | **0**（ただいま停車中） |
| 0 | 0（走行中） | **1**（つぎは） |
| 1 | — | **2**（まもなく） |

### 長時間停車タイマー

- 停車状態（runState === 1）に入ると内部タイマーを起動する
- タイマー発火時:
  1. `isStopping = true` にする
  2. `pageReset()`・`langReset()` を呼ぶ（Controller 経由）
  3. `getDrawParams()` を実行し、登録されたコールバック（`onLongStop`）に drawParams を渡す
- 状態が変化するとタイマーをリセットし `isStopping = false` に戻す
- コールバックの登録: Controller 側に `set onLongStop(callback)` セッターを用意し、呼び出し元が登録する

### メソッド

| メソッド | 動作 |
|---|---|
| `moveState(step)` | stateInd を step 分移動する |
| `moveStation(step)` | stateInd を `3 × step` 分移動する（1駅単位の移動） |
| `getParams()` | progressOutput を返す（後述） |

### getParams() の出力（progressOutput）

drawParams のうち page・langId 以外の全フィールドを担当：

```
runState, isStopping, isTerminal,
isDrawNextStation, isDrawTime, isDrawLineName,
whole, defaultLine, overLine, platform, transfers
```

---

## 4. PageController

### 概要

表示ページの一覧・順序・ページ送りを管理する。現行アプリの `PageRotator.js` の手動操作版（タイマーなし）。

### コンストラクタに渡す pageParams

| フィールド | 型 | 説明 |
|---|---|---|
| pageNameList | string[] | 表示するページ名の一覧（表示順） |

### 内部状態

| 内部状態 | 型 | 説明 |
|---|---|---|
| pageNameList | string[] | 表示するページ名の一覧（表示順） |
| currentPageName | string | 現在表示中のページ名。初期値 = `pageNameList[0]` |

### メソッド

| メソッド | 動作 |
|---|---|
| `pageRotate()` | currentPageName を一つ進める（末尾の次は先頭に戻る） |
| `pageReset()` | currentPageName を `pageNameList[0]` にリセット |
| `getParams()` | `{ page: currentPageName }` を返す |

---

## 5. LangController

### 概要

表示言語 ID の一覧・表示時間・遷移時間・ページ送り動作を管理する。現行アプリに相当クラスなし（新規）。
言語切り替えはタイマー駆動と手動（langRotate）の2方式を定義するが、**今回はタイマー方式のみ実装**。

### コンストラクタに渡す langParams

| フィールド | 型 | 説明 |
|---|---|---|
| langIdList | object[] | 言語IDと時間パラメータの組の一覧（表示順） |

### langIdList の要素構造

```js
{
  langId:      0,     // 言語ID（0:日本語, 1:英語, 2:その他）
  displayTime: 4000,  // 表示時間（ms）。この時間後にタイマー発火。
  transTime:   500,   // アニメーション遷移時間（ms）
  gapTime:     200    // ギャップ時間（ms）
}
```

### 内部状態

| 内部状態 | 型 | 説明 |
|---|---|---|
| langIdList | object[] | 言語IDと時間パラメータの一覧 |
| currentLangId | object | 現在の言語エントリ。初期値 = `langIdList[0]` |

### 言語タイマーの動作（タイマー方式）

1. コンストラクタ（またはリセット）時に `langIdList[0].displayTime` のタイマーを起動する
2. タイマー発火時:
   - 登録されたコールバックを `(langId, transTime, gapTime)` の引数で呼び出す
   - currentLangId を次のエントリに自動進行する（末尾の次は先頭）
   - 次のエントリの displayTime でタイマーを再起動する
3. コールバックの登録: Controller 側に `set onLangTimer(callback)` セッターを用意し、呼び出し元が登録する

### メソッド

| メソッド | 動作 |
|---|---|
| `langRotate()` | currentLangId を一つ進める（定義のみ。今回は使用しない） |
| `langReset()` | currentLangId を `langIdList[0]` にリセットし、タイマーも再起動する |
| `getParams()` | `{ langId: currentLangId.langId }` を返す |

---

## 6. Controller（メインクラス）

### 概要

唯一の public クラス。settings からパラメータを抽出して各サブクラスを初期化し、外部 API を提供する。

### コンストラクタ

```
Controller(settings)
  → progressParams を抽出 → new ProgressController(progressParams)
  → pageParams を抽出    → new PageController(pageParams)
  → langParams を抽出    → new LangController(langParams)
```

### 公開セッター（コールバック登録）

| セッター | 説明 |
|---|---|
| `set onLongStop(callback)` | 長時間停車タイマー発火時に `callback(drawParams)` を呼ぶ |
| `set onLangTimer(callback)` | 言語タイマー発火時に `callback(langId, transTime, gapTime)` を呼ぶ |

### 公開 API

| メソッド | 動作 |
|---|---|
| `moveState(step)` | ProgressController.moveState(step) → pageController.pageReset() → langController.langReset() → getDrawParams() して返す |
| `moveStation(step)` | ProgressController.moveStation(step) → pageController.pageReset() → langController.langReset() → getDrawParams() して返す |
| `pageRotate()` | pageController.pageRotate() → langController.langReset() → getDrawParams() して返す |
| `langRotate()` | langController.langRotate() → getDrawParams() して返す（今回は使用しない） |
| `getDrawParams()` | 各 getParams() の出力を統合して drawParams を返す |

### getDrawParams() の統合ロジック

```js
getDrawParams() {
  const progressOutput = this.progressController.getParams();
  const pageOutput     = this.pageController.getParams();
  const langOutput     = this.langController.getParams();

  return {
    page:   pageOutput.page,
    langId: langOutput.langId,
    ...progressOutput  // runState, isStopping, isTerminal, whole, defaultLine, ... など
  };
}
```

---

## 7. drawParams フィールドと担当コントローラの対応

| drawParams フィールド | 担当コントローラ |
|---|---|
| `page` | PageController |
| `langId` | LangController |
| `runState` | ProgressController |
| `isStopping` | ProgressController（内部タイマーで管理） |
| `isTerminal` | ProgressController |
| `isDrawNextStation` | ProgressController |
| `isDrawTime` | ProgressController |
| `isDrawLineName` | ProgressController |
| `whole` | ProgressController |
| `defaultLine` | ProgressController |
| `overLine` | ProgressController |
| `platform` | ProgressController |
| `transfers` | ProgressController |
