# LCDシミュレーター 仕様書

## 1. 概要

日本の鉄道車両に搭載されているLCD行先表示器をブラウザ上でシミュレートするWebアプリケーション。設定エディタで路線・駅・運用情報を編集し、実際の表示画面をリアルタイムに確認できる。

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 15.3 (App Router) |
| 言語 | TypeScript / React 18 |
| 動作環境 | モダンブラウザ（SSR なし、クライアントサイド動作） |

---

## 2. システム全体構成

```
┌─────────────────────────────────────────────────────┐
│  ブラウザ                                             │
│                                                       │
│  ┌─────────────────────────────┐  localStorage       │
│  │  設定エディタ (Next.js App) │ ──────────────────┐ │
│  │  http://localhost:3000      │                   │ │
│  └─────────────────────────────┘                   ▼ │
│                                          ┌──────────────────┐ │
│                                          │ display.html     │ │
│                                          │ (東急スタイル)   │ │
│                                          ├──────────────────┤ │
│                                          │Display_JW-225.html│ │
│                                          │(JR西225系スタイル)│ │
│                                          └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

エディタで編集した設定データは `localStorage['lcdStrage']` に保存され、表示用HTMLページが読み込んでLCDアニメーションを描画する。

---

## 3. データモデル

### 3.1 UML クラス図

```mermaid
classDiagram

    class settingType {
        +infoType info
        +operationDict : Dict~string, operationType~
        +stationType[] stationList
        +lineDict : Dict~string, lineType~
        +iconDict : Dict~string, string|iconParamsType~
        +dispConfigType dispConfig
        +messageType message
    }

    class messageType {
        +string text
    }

    class infoType {
        +string settingName
        +boolean isLoop
        +boolean isMoveByCoord
    }

    class operationType {
        +string destination
        +string destinationKana
        +string destinationEng
        +string destinationNum
        +string destinationColor
        +string destinationNumIconKey
        +string direction
        +string trainType
        +string trainTypeEng
        +string trainTypeSub
        +string trainTypeSubEng
        +string trainTypeColor
        +string trainTypeBackColor
        +string lineLogo
        +string lineColor
        +string carNumber
        +string carNumberList
        +string carLineColor
        +left|right leftOrRight
        +boolean isDispTime
        +boolean isDispLineName
        +boolean isDrawStopText
        +boolean isDrawLine
        +string headOffset
        +string backOffset
    }

    class stationType {
        +string name
        +string kana
        +string eng
        +stationNumIconType numIcon
        +string lineNumberType
        +transferItemType[] transfers
        +boolean isPass
        +string sectionTime
        +string lineId
        +string operationId
        +number|null[] coordinate
        +string transferText
        +string transferTextEng
        +left|right doorSide
        +string transferCountLineP
        +string otherLineInd
        +string slotNum
        +string leftSlotInd
        +string otherCarNum
        +string otherLeftSlotInd
    }

    class stationNumIconType {
        +string symbol
        +string number
        +string presetKey
        +string color
    }

    class transferItemType {
        +transferLineType line
        +transferStationType station
    }

    class transferLineType {
        +string[] lineIconKey
        +string name
        +string kana
        +string eng
    }

    class transferStationType {
        +boolean isDraw
        +string type
        +string symbol
        +string color
        +string number
        +string name
        +string eng
    }

    class lineType {
        +string lineIconKey
        +string name
        +string kana
        +string eng
        +string color
        +string symbol
        +string numIconPresetKey
    }

    class iconParamsType {
        +string presetType
        +string color
        +string symbol
    }

    class dispConfigType {
        +pageDispListType pageDispList
        +langIdEntryType[] langIdList
        +boolean isPageAuto
    }

    class pageObjType {
        +string pageName
        +number dispTime
        +number type
    }

    class langIdEntryType {
        +number langId
        +number displayTime
        +number transTime
        +number gapTime
    }

    settingType "1" *-- "1" infoType : info
    settingType "1" *-- "0..*" operationType : operationDict (ID→operationType)
    settingType "1" *-- "0..*" stationType : stationList
    settingType "1" *-- "0..*" lineType : lineDict (ID→lineType)
    settingType "1" *-- "0..*" iconParamsType : iconDict (ID→iconParamsType\nor base64 string)
    settingType "1" *-- "1" dispConfigType : dispConfig
    settingType "1" *-- "1" messageType : message

    stationType "1" *-- "0..*" transferItemType : transfers
    transferItemType "1" *-- "1" transferLineType : line
    transferItemType "1" *-- "1" transferStationType : station
    stationType --> lineType : lineId で参照（区間路線）
    stationType --> operationType : operationId で参照（区間運用）
    stationType --> iconParamsType : numIconPresetKey で参照
    operationType --> iconParamsType : destinationNumIconKey で参照
    dispConfigType "1" *-- "1..*" pageObjType : pageDispList (pageState→pageObj[])
    dispConfigType "1" *-- "1..*" langIdEntryType : langIdList
```

### 3.2 フィールド詳細

#### `infoType` — 全体設定
| フィールド | 型 | 説明 |
|---|---|---|
| `settingName` | string | 設定ファイル名 |
| `isLoop` | boolean | 環状運転モード（終点→始点へ自動折返し） |
| `isMoveByCoord` | boolean | GPS座標に基づいて現在駅を自動移動 |

#### `operationType` — 運用設定（表示内容1セット）
| フィールド | 型 | 説明 |
|---|---|---|
| `destination` / `destinationKana` / `destinationEng` | string | 行先（日本語・かな・英語） |
| `destinationNum` | string | 行先ナンバリング記号（例: `JT-01`） |
| `destinationColor` | string | 行先表示の文字色（HEX） |
| `destinationNumIconKey` | string | 行先ナンバリングのアイコンキー |
| `direction` | string | 経由・方面表示 |
| `trainType` / `trainTypeEng` | string | 列車種別（例: 急行 / Express） |
| `trainTypeSub` / `trainTypeSubEng` | string | 種別補足テキスト |
| `trainTypeColor` | string | 種別文字色 |
| `trainTypeBackColor` | string | 種別背景色 |
| `lineLogo` | string | 列車路線記号 |
| `lineColor` | string | 列車路線色 |
| `carNumber` | string | 現在の号車番号 |
| `carNumberList` | string | 全号車リスト（カンマ区切り。`*`付きが現在号車） |
| `leftOrRight` | `'left'\|'right'` | 表示の進行方向 |
| `isDispTime` | boolean | 所要時間表示 ON/OFF |
| `isDispLineName` | boolean | 路線名表示 ON/OFF |
| `isDrawStopText` | boolean | 次停車駅テキスト表示 ON/OFF |
| `isDrawLine` | boolean | 号車ライン描画 ON/OFF |
| `headOffset` / `backOffset` | string | 列車前後のオフセット（px） |
| `carLineColor` | string | 号車ラインの色 |

#### `stationType` — 駅設定
| フィールド | 型 | 説明 |
|---|---|---|
| `name` / `kana` / `eng` | string | 駅名（日本語・かな・英語） |
| `numIcon` | `stationNumIconType` | ナンバリングアイコン情報（下表）。路線をまたぐ駅では**ひとつ前の区間（今までの路線）**のナンバリングを保持する |
| `numIconNext` | `stationNumIconType` | 2つ目のナンバリングアイコン情報（`numIcon` と同じ型）。路線をまたぐ駅で**次の区間（次の路線）**のナンバリングを保持する。使わない駅では `number` を空にしておく |
| `lineNumberType` | string | ナンバリング表示形式（`"0"`: テキスト, `"1"`: アイコン） |

**`stationNumIconType`**（`stationType.numIcon` / `stationType.numIconNext` の型）

| フィールド | 型 | 説明 |
|---|---|---|
| `symbol` | string | 有効路線記号（例: `TY`）。`colorMode` が `'auto'` のとき `lineDict[lineId].symbol` が自動書き込みされる |
| `number` | string | 駅番号部分（例: `01`）。旧形式 `TY 01` はマイグレーションで分割 |
| `presetKey` | string | 有効ナンバリングプリセットキー。`colorMode` が `'auto'` のとき `lineDict[lineId].numIconPresetKey` が自動書き込みされる |
| `color` | string | 有効色（HEX）。`colorMode` が `'auto'` のとき `lineDict[lineId].color` が自動書き込みされる。drawParams・ProgressController はこのフィールドのみ参照する |
| `manualSymbol` | string | 手動設定路線記号。`colorMode` に関わらず保持され、路線記号入力欄には常にこの値を表示する |
| `manualPresetKey` | string | 手動設定プリセットキー。`colorMode` に関わらず保持され、ナンバリング記号セレクトには常にこの値を表示する |
| `manualColor` | string | 手動設定色（HEX）。`colorMode` に関わらず保持され、カラーピッカーには常にこの値を表示する |
| `colorMode` | `'auto'\|'manual'` | `symbol`・`presetKey`・`color` の一括取得モード。`'auto'`: colorMode 切替・lineId 変更時に3フィールドを路線設定値で自動更新 / `'manual'`: 各有効フィールド = 対応する manual* フィールド。デフォルト `'auto'`。未設定時は `'auto'` として扱う |
| `transfers` | `transferItemType[]` | 乗換路線のリスト。各エントリに路線IDと乗換駅情報を持つ |
| `transferListTransfers` | string | 乗換一覧表示の行分割指定。スペース区切りの路線IDと改行の組み合わせ。空の場合は `transfers` をもとに自動生成 |
| `isPass` | boolean | 通過駅フラグ |
| `sectionTime` | string | 次駅までの所要時間（分）。駅追加時のデフォルト値は `"0"` |
| `lineId` | string | この駅以降の区間路線ID |
| `operationId` | string | この駅以降の区間運用ID（`operationDict` のキー）。空文字のときはフォールバック運用を使用。駅追加時のデフォルト値は、1つ前の駅があればその駅の `operationId` を引き継ぎ、なければ `"0"` |
| `coordinate` | `[number\|null, number\|null]` | 緯度・経度（GPS連動用） |
| `transferText` / `transferTextEng` | string | 乗換案内テキスト（`:アイコンキー:` 記法対応） |
| `doorSide` | `'left'\|'right'` | 開くドアの方向 |
| `transferCountLineP` | string | ホーム乗換案内の行ごと表示数 |
| `slotNum` | string | ホームスロット分割数 |
| `leftSlotInd` | string | 列車左端スロット番号 |
| `otherLineInd` | string | 向かいホーム列車の路線ID |
| `otherCarNum` | string | 向かいホーム列車の両数 |
| `otherLeftSlotInd` | string | 向かいホーム列車の左端スロット |

#### `transferItemType` — 乗換路線エントリ
| フィールド | 型 | 説明 |
|---|---|---|
| `line` | `transferLineType` | 乗換路線情報（路線アイコン・名称を直接保持） |
| `station` | `transferStationType` | 乗換駅情報 |

#### `transferLineType` — 乗換路線情報
| フィールド | 型 | 説明 |
|---|---|---|
| `lineIconKey` | string[] | 路線アイコンの `iconDict` キーの配列。複数アイコンを順番に保持する。旧形式（文字列）は読み込み時に1要素配列に自動変換する |
| `name` | string | 路線名（日本語） |
| `kana` | string | 路線名（かな） |
| `eng` | string | 路線名（英語） |

#### `transferStationType` — 乗換駅情報
| フィールド | 型 | 説明 |
|---|---|---|
| `isDraw` | boolean | 駅描画フラグ（true のとき乗換一覧に駅名等を描画） |
| `type` | string | ナンバリングアイコンのプリセットキー |
| `symbol` | string | 路線記号文字（例: `TY`） |
| `color` | string | 路線カラー（HEX） |
| `number` | string | 乗換駅のナンバリング（例: `TY-01`） |
| `name` | string | 乗換駅名（日本語） |
| `eng` | string | 乗換駅名（英語） |

#### `lineType` — 路線定義
| フィールド | 型 | 説明 |
|---|---|---|
| `lineIconKey` | string | 路線アイコンの `iconDict` キー |
| `name` / `kana` / `eng` | string | 路線名（日本語・かな・英語） |
| `color` | string | 路線カラー（HEX） |
| `symbol` | string | 路線記号テキスト（例: `TY`） |
| `numIconPresetKey` | string | ナンバリングアイコンのプリセットキー（例: `N_tokyu`） |

#### `iconParamsType` — アイコンパラメータ（プリセット型）
| フィールド | 型 | 説明 |
|---|---|---|
| `presetType` | string | プリセット種別キー（例: `I_tokyu`） |
| `color` | string | 路線カラー（HEX） |
| `symbol` | string | 路線記号文字（例: `TY`） |

`iconDict` の値は `string`（base64 data URI）または `iconParamsType` の2種類。

#### `dispConfigType` — 表示設定
| フィールド | 型 | 説明 |
|---|---|---|
| `pageDispList` | `pageDispListType` | 走行状態ごとのページリスト（`{ [pageState]: pageObjType[] }`） |
| `langIdList` | `langIdEntryType[]` | 言語ローテーション設定リスト（順番に切り替え） |
| `isPageAuto` | boolean | `true`: タイマーによる自動ページ切換え / `false`: ユーザー操作による手動切換え。デフォルト `true` |

#### `pageDispListType` — ページ表示リスト
キー: `pageState`（0〜5）、値: `pageObjType[]`。各走行状態のページ表示順リストを保持する。

#### `pageObjType` — ページ表示エントリ
| フィールド | 型 | 説明 |
|---|---|---|
| `pageName` | string | ページファイル名。選択肢: `defaultLineSVG.svg` / `overLineSVG.svg` / `transfers.svg` / `platform.svg` / `trainTypeChange.svg` / `infoMessage.svg` |
| `dispTime` | number | このページを表示し続ける時間（ms） |
| `type` | number | 表示条件（0: 無条件 / 1: 乗換あり / 2: 次運用あり / 3: メッセージあり）|

#### `pageType=2`「次運用あり」の判定ロジック

`_buildConditionData()` が返す `hasNextOperation: boolean` で判定する。

**判定手順:**

1. 現在の運用の「参照駅インデックス」を決定する
   - `posState=0,1`（走行中・直前）: `prevInd = max(0, currentStationInd - 1)` の駅
   - `posState=2`（停車中）: `currentStationInd` の駅
2. 参照駅の `operationId`（= `currentOpId`）を取得する
3. 参照駅より後の駅を順番に走査し、`operationId !== currentOpId` となる最初の駅（= 種別変更駅）を探す
4. 種別変更駅が見つかった場合、その `operationId` で `operationDict` を参照して次の運用を取得する
5. 次の運用が存在し、かつ現在の運用と `trainType` または `trainTypeEng` のいずれかが異なれば `hasNextOperation = true`
   - 両方が空文字の場合は「同じ」として扱う（`"" !== ""` は false のため自然に処理される）

#### `pageType=3`「メッセージあり」の判定ロジック

`_buildConditionData()` が返す `hasMessage: boolean` で判定する。

**判定条件:** `settings.message?.text` が空文字でない場合に `true`

#### `infoMessage.svg` 複数ページ対応

メッセージが長い場合、コントローラ側で複数ページに分割して順番に表示する。

**定数（ProgressController.js にハードコード）:**

| 定数 | 説明 |
|---|---|
| `INFO_MSG_MAX_LINE_NUM` | 1 ページに表示できる最大行数 |
| `INFO_MSG_MAX_CHAR_NUM` | 1 行の最大文字数（これを超えると次の行に折り返す） |

**ページ分割アルゴリズム（`_buildInfoMsgPages()`）:**

```
message.text を \n で分割 → paragraphs[]
各 paragraph を MAX_CHAR_NUM 文字ごとに折り返す → allLines[]
allLines を MAX_LINE_NUM 行ごとに区切る → pages[]（各要素は \n 結合済みのテキスト）
```

**`conditionData` への追加フィールド:**

| フィールド | 型 | 説明 |
|---|---|---|
| `infoMsgTotalPage` | number | メッセージの総ページ数（1以上。メッセージなしのときも 1） |

**`drawParams` への追加フィールド:**

| フィールド | 型 | 説明 |
|---|---|---|
| `pages.nowPage` | number | 現在表示中のページ番号（1-indexed） |
| `pages.totalPage` | number | 総ページ数 |
| `message.text` | string | 現在ページのテキスト（\n 結合済み） |

**PageController の infoMessage 特別処理（案B）:**

`infoMessage.svg` 表示中に `pageRotate(conditionData)` が呼ばれたとき:

```
if currentPage === 'infoMessage.svg':
    if _infoMsgNowPage < conditionData.infoMsgTotalPage - 1:
        _infoMsgNowPage++          // 次サブページへ（pageDispList は進めない）
        _startTimer()
        return
    _infoMsgNowPage = 0            // 全サブページ完了: リセット

// 通常の次ページへ進む
_currentIndex = (_currentIndex + 1) % _currentList.length
...
```

`setPageState()` 呼び出し時（駅・状態移動）は `_infoMsgNowPage = 0` にリセットする。

**Controller.getDrawParams() の変更:**

`_pageController.getParams()` から `infoMsgNowPage`（0-indexed）を取得し、`progressController.getParams(infoMsgNowPage)` に渡す。ProgressController はこれを使って当該ページのテキストを `message.text` に格納し `pages` フィールドを生成する。

#### ページ設定デフォルト値（`initDispConfigObject`）

| pageState | ページ名 | dispTime | type | 追加位置 |
|---|---|---|---|---|
| 1（走行） | `trainTypeChange.svg` | 11000 | 2 | `defaultLineSVG.svg` の次 |
| 1（走行） | `infoMessage.svg` | 11000 | 3 | `transfers.svg` の次 |
| 3（停車） | `trainTypeChange.svg` | 11000 | 2 | `platform.svg` の次 |
| 3（停車） | `infoMessage.svg` | 11000 | 3 | `trainTypeChange.svg` の次 |

#### `pageState` — 走行状態
| 値 | 意味 | 条件 |
|---|---|---|
| 0 | 始発停車 | posState=2, runState=1, isTerminal=false, isStart=true |
| 1 | 走行 | posState=0, runState=0, isTerminal=false, isStart=false |
| 2 | 直前 | posState=1, runState=0, isTerminal=false, isStart=false |
| 3 | 停車 | posState=2, runState=1, isTerminal=false, isStart=false |
| 4 | 通過 | posState=2, runState=0, isTerminal=false, isStart=false |
| 5 | 終点停車 | posState=2, runState=1, isTerminal=true, isStart=false |
| -1 | 無効 | 上記のいずれにも該当しない（本来取りえない） |

#### `langIdEntryType` — 言語表示エントリ
| フィールド | 型 | 説明 |
|---|---|---|
| `langId` | number | 言語ID（0: 日本語, 1: ひらがな, 2: 英語） |
| `displayTime` | number | この言語を表示し続ける時間（ms） |
| `transTime` | number | 次言語への切り替えアニメーション時間（ms） |
| `gapTime` | number | アニメーション後の待機時間（ms） |

---

## 4. コンポーネント構成

### 4.1 コンポーネント図

```mermaid
graph TD
    Page["page.tsx\n(ルートページ)"]
    Header["Header\nタイトル表示"]
    Editor["Editor\n◀ settingType state 保持・アコーディオン管理 ▶"]
    DisplayToolbar["DisplayToolbar\n表示ボタン（sticky）"]
    EditorHead["EditorHead\nファイル操作・全体設定"]
    OperationForm["OperationForm\n運用設定フォーム"]
    MessageForm["MessageForm\nメッセージ設定フォーム"]
    StationList["StationList\n駅一覧テーブル"]
    LineList["LineList\n路線一覧テーブル"]
    IconList["IconList\nアイコン一覧テーブル"]
    DispConfig["DispConfig\n表示設定（言語ローテーション）"]
    GenericItemList["GenericItemList\n汎用テーブル（行選択）"]
    StationParamSetter["StationParamSetter\n選択駅の詳細設定（セクション切り替え式）"]
    MapComponent["MapComponent\nGoogle Mapsで座標設定"]

    Page --> Header
    Page --> Editor
    Editor --> DisplayToolbar
    Editor --> EditorHead
    Editor --> OperationForm
    Editor --> MessageForm
    Editor --> StationList
    Editor --> LineList
    Editor --> IconList
    Editor --> DispConfig
    TransferLinePopup["TransferLinePopup\n接続路線追加ポップアップ"]

    StationList --> GenericItemList
    LineList --> GenericItemList
    IconList --> GenericItemList
    StationList --> StationParamSetter
    StationList --> MapComponent
    StationParamSetter --> TransferLinePopup
    TransferLinePopup --> GenericItemList
    LineAddPopup["LineAddPopup\n路線追加ポップアップ"]
    StationParamSetter --> LineAddPopup
```

### 4.2 サイドバーナビゲーション

`Editor` 内の各セクション（ファイル操作・駅設定・運用設定・メッセージ設定・路線登録・アイコン登録・表示設定）は、画面左端の**サイドバー**に大項目として一覧表示し、選択した1項目のみをメインエリアに表示する形式とする（アコーディオン形式は廃止）。

#### 動作仕様

- `activeSectionId: string` state で選択中のセクションを管理する（排他選択、常に1つだけ選択される）
- 初期値は `"station"`（駅設定）
- サイドバー項目（`.editor-sidebar-item`）をクリックすると `activeSectionId` を更新する
- メインエリア（`.editor-content`）には `activeSectionId` に対応するセクションのコンポーネントのみを描画する（他のセクションはマウントしない）
- 選択中の項目は `.editor-sidebar-item--active` クラスでハイライトする
- 幅の狭い画面（モバイル等）でも、横タブ等への切り替えは行わず、幅を詰めた縦サイドバーのまま表示する
- サイドバーの横幅は狭くし、各項目は**アイコンを上、キャプション（小さい文字）を下**に縦に並べる形式で表示する（テキストのみの横並びラベルは廃止）
- `.editor-sidebar` の上端は `.editor-content`（編集画面）の上端と揃える（`.editor-layout` の `align-items: flex-start` による通常のフロー配置のみとし、`position: sticky` のような固定高さの推測値に依存するオフセットは使わない）

#### セクション一覧

| `activeSectionId` | 表示名 | アイコン | 内容コンポーネント |
|---|---|---|---|
| `file` | ファイル操作 | `IconFileOps`（フォルダ） | `EditorHead` |
| `station` | 駅設定 | `IconStation`（電車正面） | `StationList` |
| `operation` | 運用設定 | `IconOperation`（旗） | `OperationForm` |
| `message` | メッセージ設定 | `IconMessage`（吹き出し） | `MessageForm` |
| `line` | 路線登録 | `IconLineReg`（駅2つを結ぶ線） | `LineList` |
| `icon` | アイコン登録 | `IconShapes`（円と三角形） | `IconList` |
| `dispConfig` | 表示設定 | `IconDisplay`（モニター） | `DispConfig` |

アイコンは `app/components/SvgIcons.tsx` に既存の矢印・プラス・ゴミ箱アイコンと同じ方式（`viewBox="0 0 16 16"`、`fill="currentColor"`、塗りのみでくり抜きなし）で追加する。

#### 実装方針

- `Editor.tsx` 内に `sections: { id: string, title: string, icon: React.FC, element: React.ReactNode }[]` を定義し、サイドバーの一覧描画とメインエリアの描画の両方をこの配列から行う
- サイドバー項目は `<button>` 内にアイコンコンポーネントとキャプション `<span>` を縦に並べて配置する
- 旧 `AccordionSection` コンポーネント（`app/components/AccordionSection.tsx`）は本構成では使用しないため削除する
- 各子コンポーネント（`EditorHead` など）の内部 `<h2>` 見出しは引き続き不要（メインエリア側で選択中セクションのタイトルを見出しとして表示する）

#### CSS クラス

| クラス | 役割 |
|--------|------|
| `.editor-layout` | サイドバーとメインエリアを横並びにするコンテナ（旧 `.editor-container` を置き換え） |
| `.editor-sidebar` | 左端の縦サイドバー（狭い固定幅） |
| `.editor-sidebar-item` | サイドバーの各項目ボタン（`flex-direction: column` でアイコン・キャプションを縦並び） |
| `.editor-sidebar-item-icon` | アイコン表示領域 |
| `.editor-sidebar-item-caption` | アイコン下の小さいキャプション文字 |
| `.editor-sidebar-item--active` | 選択中の項目のハイライト |
| `.editor-content` | 選択中セクションを表示するメインエリア |
| `.editor-content-title` | メインエリア上部に表示する選択中セクションの見出し |

### 4.4 表示ツールバー（sticky ツールバー）

> 7.28節で表示ツールバーは廃止し、「表示」ボタンはヘッダー（タイトルの右）へ移した。以下は廃止前の仕様。

`Editor` コンポーネント内に sticky ツールバーを設け、ヘッダー直下に固定表示する。

- `position: sticky; top: [ヘッダー高さ]; z-index: 99` で画面スクロールに追従する
- **「表示」ボタン**（`btn-primary`）のみを配置する
- 表示タイプセレクタは `EditorHead` の元の位置に残す
- `displayType` state は `EditorHead` で引き続き管理する
- `openDisplay` 関数を `EditorHead` から `Editor` へ移動し、`displayType` を props で受け取る
  - または `EditorHead` が `openDisplay` コールバックを受け取り、ボタンだけ外に切り出す方式でも可
- `EditorHead` の `form-row` から「表示を開く」ボタンのみを撤去する

| 要素 | 詳細 |
|------|------|
| 表示ボタン | `btn-primary`、テキスト「表示」、クリックで `openDisplay()` を呼ぶ |

CSS クラス: `.display-toolbar`

### 4.5 `GenericItemList` — 汎用テーブルコンポーネント

`StationList`・`LineList`・`IconList` で共通している「テーブル描画＋行選択のハイライト」ロジックを一箇所に集約した汎用コンポーネント。

#### 型定義

```typescript
// カラム定義
type ColumnDef<T> = {
    header: React.ReactNode                     // <th> ヘッダー内容（文字列または <br/> を含むJSXなど）
    cell: (row: T, key: string) => React.ReactNode  // セル内容の描画関数
    isSelector?: boolean  // true のとき <th> として描画しクリックで行選択
    cellStyle?: (row: T, key: string) => React.CSSProperties  // <td> 自体に適用するスタイル
    headerWidth?: string  // ヘッダーが確保する幅を固定する（後述「ヘッダー幅の固定」参照）
    collapsible?: boolean
    defaultCollapsed?: boolean
    // セルクリック時のコールバック（isSelector以外の列で使用可能）。
    // 行データ・キー・クリックイベントを受け取る。指定した列はマウスホバー時にカーソルがポインタになる
    onClick?: (row: T, key: string, event: React.MouseEvent<HTMLElement>) => void
}

// カラムグループ定義（後述「カラムグループ」参照）
type ColumnGroup<T> = {
    groupHeader: React.ReactNode   // グループ見出し（ヘッダー1行目にcolspanで表示）
    collapsible?: boolean          // true のときグループ見出しクリックで子列をまとめて折りたたみ可能にする
    defaultCollapsed?: boolean     // true のとき初期状態で折りたたまれた状態にする
    columns: ColumnDef<T>[]        // グループに含める子カラム定義（子カラム自体は個別に折りたたみできない）
}

// Props
type GenericItemListProps<T> = {
    columns: (ColumnDef<T> | ColumnGroup<T>)[]
    rows: { key: string; data: T }[]    // 表示データ（key で行を識別）
    selectedKeys: string[]
    onRowClick: (key: string) => void   // 行クリック時のコールバック
    tableId?: string
    containerId?: string
    rangeStartKey?: string
}
```

#### カラムグループ（`ColumnGroup`）

複数の `ColumnDef` を1つの折りたたみ可能な見出しの下にまとめて表示するための機能。例えば `StationList` の「駅名かな」「駅名英語」を「駅名多言語」という1つの見出しの下にまとめ、見出しクリックで両方をまとめて折りたためるようにする場合に使う。

- `columns` 配列には `ColumnDef<T>` と `ColumnGroup<T>` を混在させてよい
- **`columns` に `ColumnGroup` が1つ以上含まれる場合のみ**、ヘッダーを2行構成（`<thead>` 内に2つの `<tr>`）にする。`ColumnGroup` を含まないテーブル（`LineList`・`IconList` など）は従来通り1行のみのヘッダーのままとし、見た目は変えない
- グループは `groupHeader` を `colSpan={columns.length}` で子カラムの数だけ横に広げて1行目に表示し、2行目に子カラムのヘッダーを並べる（`collapsible` の場合はクリックで折りたたみ可能。`.section-header` と同様、折りたたみ中は × の代わりに `▶` を付けた縦書き表示にし、`rowSpan={2}` で2行分の高さをまるごと占める。グループは入れ子構造のため、展開時は1行目・2行目に分かれて表示され、通常列とは異なり分割線が入ることがある）
- グループが折りたたまれている場合、本文側（`<tbody>`）もグループの子カラム全体を幅ゼロの1つの `<td>` に置き換える（既存の単一列折りたたみと同じ見た目）。展開中は子カラムをそれぞれ通常のセルとして描画する（`isSelector`・`onClick` など、通常の `ColumnDef` の描画規則がそのまま適用される）

##### 折りたたみ中のセルの斜線

折りたたまれている列・グループの本文側（`<tbody>`）のセルには、**全ての行に斜線を1本引く**（内容が隠れていることを示すため）。

- `background-image` に `linear-gradient` を指定し、左下から右上へ向かう1pxの斜線（`var(--border)` 色）を描画する。線以外の部分は透明にし、CSS側で指定されているセルの背景色（`#stationsTable td { background: var(--bg-base); }` など）や行ホバー・選択時の背景色をそのまま活かす
- `background-image` は longhand のインラインスタイルとして指定するため、CSS側の `background` ショートハンド（行ホバー時の `tr:hover td` など）に上書きされず、斜線は常に表示される
- ヘッダー側（折りたたみ中の縦書きラベルのセル）には斜線を引かない
- 子カラム自体には `collapsible`・`defaultCollapsed` を設定しない（個別の折りたたみは行わない。グループ単位でのみ折りたたむ）

#### 折りたたみ中の縦書きヘッダーの高さ

列（または列グループ）を折りたたんだときの縦書き見出し（`writing-mode: vertical-rl`）は、**▶ を含めて3文字ごとに `<br/>` で改行**を入れる（`renderCollapsedLabel` 関数）。これにより、見出しの文字数に関わらず縦書きテキストの高さは常に「3文字分」に収まり（4文字目以降は折り返して横方向に新しい列として広がる）、自動折り返し（`white-space`/`max-height` によるブラウザ依存の折り返し）には依存しない。

#### ヘッダー2行分の固定高さ・入れ子でない列の表示

`columns` に `ColumnGroup` が1つ以上含まれる場合、ヘッダー2行分（`<thead>` 内の2つの `<tr>`）の合計高さを、常に一定の固定値（`GROUPED_HEADER_HEIGHT` ＝ `4.4em`）にする。この値は元々「おおよそ4文字分」の縦書きテキストに合わせて決めた概算値だが、折りたたみ時の改行文字数（3文字／回）とは独立した定数であり、折り返し文字数を変更しても連動して変わるものではない。

**判明した問題**: 当初は `rowSpan={2}` のセルに `height: GROUPED_HEADER_HEIGHT` を指定する方式を試みたが、Chrome実機で計測したところ、2行とも `rowSpan` のみに頼っている状態（= どの列・グループも1行目・2行目を直接占めるセルを持たない状態。全列が折りたたまれている場合に発生）では、`rowSpan` セルの高さが1行目・2行目にどう配分されるかはブラウザ任せで信頼できず（実測で合計高さが指定値の `4.4em` 相当に届かず、1行目が0pxになる例を確認）、展開時との高さが一致しなかった。このため、**入れ子でない通常列・折りたたみ中の列も、2行目に直接のセル（＝`rowSpan` に頼らないセル）を必ず持たせる**ことで、1行目・2行目それぞれの高さをブラウザの配分任せにせず固定する方式に変更した。

- `GROUPED_HEADER_ROW_HEIGHT`（`GROUPED_HEADER_HEIGHT` の半分、`2.2em`）を1行あたりの固定高さとする
- **折りたたみ中の列・グループ**: 従来通り `rowSpan={2}`、`height: GROUPED_HEADER_HEIGHT` の縦書きセル1つで描画する（他の列が2行ともそれぞれ直接のセルで `GROUPED_HEADER_ROW_HEIGHT` を確保しているため、`rowSpan` セルも安定して2行分＝`GROUPED_HEADER_HEIGHT` の高さになる）
- **入れ子でない通常列（折りたたまれていない状態）**: `rowSpan` は使わず、1行目・2行目それぞれに実セルを描画する
  - 1行目の `<th>`: `height: GROUPED_HEADER_ROW_HEIGHT`、`position: relative`、`padding: 0`、`border-bottom: none`（2行目との間の分割線を非表示にする）。内部に `position: absolute; top: 0; height: GROUPED_HEADER_HEIGHT;` の `div` を配置し、`display: flex; align-items: center; justify-content: center;` で見出しテキストを描画する。この `div` は1行目の高さ（`GROUPED_HEADER_ROW_HEIGHT`）を超えて2行目の領域までオーバーフローして描画されるため、見出しテキストはヘッダー2行分（`GROUPED_HEADER_HEIGHT`）の縦方向中央に配置される
    - **判明した問題**: `<th>` 自身に `padding` を指定しない場合、各テーブルのCSS（`td, th { padding: 7px 12px; }`）由来のデフォルトの `padding`（左右12pxずつ）が適用される。一方、列の幅を確保している `widthSpacerStyle` 自身にも左右12pxずつの `padding` があるため、`<th>` 自身の `padding` と合わせて**左右の余白が二重**になり（合計で左右12px×2＝48px）、入れ子グループの子カラム（`<th>` 自身は `padding: 0` で、余白は `widthSpacerStyle` の左右12px×1＝24pxのみ）よりヘッダーが不必要に広くなっていた（Chrome実機で、同じ2文字の見出しでも `<th>` の幅が約71px対約48pxと大きく異なることを計測して確認）
    - 対策として、`<th>` 自身にも `padding: 0` を指定し、余白を `widthSpacerStyle` 側の左右12pxずつのみに統一する（入れ子グループの子カラムと同じ余白幅になる）
  - 2行目の `<th>`: `height: GROUPED_HEADER_ROW_HEIGHT`、`background: transparent`。内容は空（見えないプレースホルダー）。背景を透明にすることで、1行目からオーバーフローしてきた見出しテキストが隠れないようにする。`border-bottom` は上書きせず、他の列・グループと同様に各テーブルのCSS（`#stationsTable th { border-bottom: 1px solid var(--border); }` 等）由来のデフォルトの境界線をそのまま表示する（この2行目がヘッダーの実際の最下段にあたるため、ここで境界線を消すとヘッダー全体の下側境界線が入れ子でない列だけ欠けてしまう）
  - これにより、入れ子でない列は**常に2行それぞれに直接のセルを持つ**ため、`columns` 内の他の列・グループの状態（折りたたみ・展開）に関わらず、2行目の高さが不安定になることはない
  - **判明した問題**: `<th>` 自身の背景色（`#stationsTable th { background: var(--bg-overlay); }` 等、各テーブルのCSSで指定）は1行目の `<th>` 自身の実際のボックス（`GROUPED_HEADER_ROW_HEIGHT` 分のみ）にしか適用されない。2行目のプレースホルダーは `background: transparent` のため、入れ子でない列は見出し全体の**上半分にしか背景色が描画されない**不具合が生じていた（Chrome実機の `getComputedStyle` で、1行目 `background-color: rgb(28, 33, 40)`（＝ `--bg-overlay`）、2行目 `rgba(0, 0, 0, 0)` と計測して確認）
    - 対策として、1行目の見出しテキスト用の `div`（`position: absolute; height: GROUPED_HEADER_HEIGHT;`）に `backgroundColor: 'var(--bg-overlay)'` を指定し、背景の描画もテキストと同じ「2行分の高さを持つ絶対配置要素」に委ねる。`position: absolute` の要素は1行目の `<th>` 自身の高さ（サイジング）には寄与しないため、2行目の領域まで背景色を拡張してもレイアウト（各行の固定高さ）には影響しない。2行目のプレースホルダーは `background: transparent` のままとする（1行目からオーバーフローして描画される背景色付き `div` が、2行目の静的コンテンツより手前（上）にペイントされるため、透明な2行目セルを通して正しく見える）
- **グループ自身（展開時）**: 1行目の `colSpan` 見出し・2行目の子カラム見出しのどちらにも `height: GROUPED_HEADER_ROW_HEIGHT` を明示する
  - **判明した問題**: 高さ指定なしだと、見出しテキストが通常のフロー（`padding` 込み）で描画されるため自然な高さが `GROUPED_HEADER_ROW_HEIGHT` を超えてしまい、入れ子でない列（`position: absolute` で高さに影響しない）より行全体が高くなっていた（Chrome実機で、折りたたみ時48px・展開時64pxと不一致を計測）
  - 入れ子でない列と同様、`position: relative` の `<th>`（`padding: 0`）の内部に `position: absolute; height: GROUPED_HEADER_ROW_HEIGHT;` の `div` を配置し、見出しテキストはそちらに描画する（幅の確保については次項）

##### `position: absolute` にしたことによる幅崩れとその対策

見出しテキストを `position: absolute` の `div` に移したことで、そのテキストは `<th>` 自身の**幅**のサイジングに寄与しなくなる（本文側にデータがない状態のテーブルでは、列が幅ゼロに潰れる不具合が発生した）。

- **判明した問題1（検討のみ、不採用）**: 当初は、見た目に影響しない非表示テキスト（`visibility: hidden` の `<span>`、幅確保用スペーサー）を `<th>` 内の通常のフローに別途描画し、そのテキストで幅だけを確保する方式を検討したが、以下の問題が判明したため不採用とした
  - `visibility: hidden` の要素も通常のフローとして高さに影響する。特に「次駅までの所要時間」列のように見出しに `<br/>` を含む場合、スペーサーも2行分になり高さへの影響が大きくなる。`maxHeight: 0` と `overflow: hidden` で抑えようとしたが、`max-height` は `display: inline`（`<span>` のデフォルト）の要素には効かない（CSS仕様上、非置換インライン要素に `height`/`max-height`/`min-height` は適用されない）ため、`display: inline-block` を追加してようやく `max-height: 0` が効くようにできた
  - それでもなお、Chrome実機で計測したところ1行目の高さが2行目よりわずかに高くなり、入れ子ヘッダーが下にはみ出す不具合が解消しなかった。スペーサー自身の `getBoundingClientRect()` の高さがすでに0になっている状態でも、`display: none` でスペーサーを完全に取り除くと高さが正しい値（1行目・2行目とも同じ値）に揃うことを確認した。これは、インラインレベルの要素がフォントメトリクスに基づく行ボックスの高さ（いわゆる "strut"）に影響を与えるためで、要素自身の計測高さが0であっても親の行の高さを押し上げてしまう
- **判明した問題2**: 上記のstrut問題を避けるため、一旦は本文側のテキストでサイジングする方式自体を諦め、`<th>` に直接固定の `minWidth`（`nestedHeaderCellStyle` ＝ `{ minWidth: '4em' }`）だけを指定する方式に変更した。これで高さの不具合は解消したが、見出しテキストが4文字分より長い列（例: 「ナンバリング乗換路線」等）で、列の実際の幅が見出しテキストの幅に対して不足し、テキストが列の外へはみ出て表示される不具合が新たに発生した
- **最終的な対策**: 幅確保用スペーサーを**`display: block`** で描画する方式に変更した（`widthSpacerStyle`）。`visibility: hidden`、`whiteSpace: nowrap`、`height: 0`、`overflow: hidden` を指定し、実際の見出しテキストをそのままスペーサーの内容として描画する。ブロックレベルボックスはインライン行ボックスに一切参加しないため、`display: inline-block` 版で問題になったフォントメトリクス由来のstrutが原理的に発生せず、`height: 0` の指定がそのまま親の高さに反映される（Chrome実機で、スペーサー追加後も1行目・2行目の高さが変化しないことを確認済み）。一方で `white-space: nowrap` により、スペーサーの内容的な幅（≒ 見出しテキストの自然な幅）はそのまま `<th>` 自身の幅サイジングに反映されるため、見出しテキストがどんな長さでも列の幅がそれに追従し、はみ出さなくなる。`nestedHeaderCellStyle` の固定 `minWidth: '4em'` は、本文側・スペーサー側のどちらも幅を決定できない空のテーブルに対する保険として、`widthSpacerStyle` と併用で残す

##### ヘッダー幅の固定（`headerWidth`）

通常、列の幅は上記の `widthSpacerStyle`（見出しテキストの自然な幅＋左右12pxずつの余白）と `nestedHeaderCellStyle` の `minWidth: 4em` の大きい方を下限として決まる。しかし、本文のセルがテキストではなく細い図形のみで構成される列（運用列・路線列の縦線表示など）では、この既定の下限では必要以上に列が広くなる。

`ColumnDef.headerWidth` に CSS の長さ（例: `'32px'`）を指定した列は、その値をヘッダーが確保する幅として固定する。

- `<th>` に `width` と `minWidth` の両方として適用する（`minWidth` も上書きすることで、既定の `minWidth: 4em` の下限を外す）
- その列の `widthSpacerStyle` の左右 `padding` を `0` にする（指定した幅がそのまま列幅になるようにするため。見出しテキスト自体の幅より小さい値を指定した場合は、テキストの幅が下限になる）
- 省略した列は従来どおりの幅決定ルールのまま（見た目は変わらない）

#### 列境界の縦線

`GenericItemList` を使う各テーブル（`#stationsTable` / `#linesTable` / `#iconTable`）の CSS に、列と列の境目を示す縦の境界線を追加する。ヘッダー（`thead`）・本文（`tbody`）の両方が対象。

- 各テーブルの `td`、`th` セレクタに `border-right: 1px solid var(--border)` を追加する
- `table { border-collapse: collapse; }` が既に指定されているため、隣接するセルの境界線は1本に結合されて描画される
- `:first-child { border-left: none; }` は既存のCSSに用意済み（テーブル左端の二重線を防ぐため）
- **`:last-child { border-right: none; }` は使わない**: ヘッダーが2行構成の場合、2行目には折りたたみ中の列のセルが存在しない（`rowSpan` で1行目が2行分を占めるため）ので、`:last-child` が実際の右端列とは別の列（例: 「座標」グループが折りたたまれているときの「次駅までの所要時間」のプレースホルダー）に一致してしまい、本来必要な縦線が消える。また `#stationsTableContainer` は縦スクロールバーの分だけテーブルの右端がコンテナの枠線から離れるため、右端の縦線が二重になる問題は実際には起きない
- 入れ子ヘッダーの1行目（`colSpan` の `<th>`、例: 「駅名多言語」グループ見出し）は、2列分の幅をまとめた1つのセルであるため、`border-right` だけではその右端（グループ全体の境界）にしか縦線が引けず、内部の子カラム（「駅名かな」「駅名英語」）同士の境目には表示されない。これは意図的な仕様とする（1行目は1つの見出しとしてまとまって見せるため、内部の境目を示す線は1行目には引かない）
  - 2行目は子カラムごとに実セル（`<th>`）が分かれているため、そちらには通常の `border-right`（本節冒頭のルール）がそのまま適用され、子カラム間の縦線が表示される
  - **判明した問題（検討のみ、不採用）**: 一時期、2行目の子カラムの実セル自身の右端を基準に、`position: absolute` の縦線用 `div` を1行目の領域まで伸ばして描画する方式を試みたが、「2行目にも1行目にも線が表示される」仕様自体が過剰であることが判明し、不採用とした（この方式ではさらに、`position: absolute` の `right` オフセットが `<th>` の**パディング境界**を基準に計算されるため、新たに追加した `border-right: 1px solid` の分だけ本来の境界線より内側にずれて描画される不具合もあった）

#### データの正規化

配列・辞書どちらのデータも `rows: { key: string; data: T }[]` 形式に変換して渡す。

| 元データ | 変換例 |
|----------|--------|
| `stationList[]` | `stationList.map((s, i) => ({ key: String(i), data: s }))` |
| `lineDict{}` | `Object.entries(lineDict).map(([k, v]) => ({ key: k, data: v }))` |
| `iconDict{}` | `Object.entries(iconDict).map(([k, v]) => ({ key: k, data: v }))` |

#### 描画規則

- `isSelector: true` のカラムは `<th>` として描画し、クリックで `onRowClick(key)` を呼ぶ
- `selectedKeys` に含まれる行の `isSelector` セルに `className="selected"` を付与
- `isSelector: false` または未指定のカラムは `<td>` として描画

#### 各コンポーネントの責務（変更なし）

`GenericItemList` はテーブルの描画と行選択通知のみを担い、以下は各コンポーネントが引き続き担当する：

- `selectedKeys` の管理（単一選択 / 複数選択は各コンポーネントで実装）
- 追加・削除・編集・並び替え操作
- `ColumnDef.cell` 関数によるカスタムセル描画（アイコン表示、カラーセルなど）
- 追加フォーム・詳細設定パネルの表示

### 4.6 `LineIconPickerPopup` — 路線記号アイコン選択ポップアップ群

`LineList` の路線編集フォームおよび `StationParamSetter` の接続路線追加ポップアップ内フォームの「路線記号」欄から呼び出す、2 つの独立したポップアップコンポーネント。

#### 路線記号欄の表示仕様

`LineList` の路線編集フォームおよび接続路線追加ポップアップ「新規追加」タブの「路線記号」欄は、テキスト入力ではなくアイコンプレビューで表示する。

- **レイアウト（横並び）**: `路線記号` ラベル → アイコン画像エリア → `新規追加` ボタン → `リストから選択` ボタン
- アイコン画像エリア: 現在 `lineIconKey` に設定されているアイコンを `iconDict` から引いて描画する
  - `string`（base64）の場合: `<img>` で表示（30×30px）
  - `iconParamsType` の場合: `createNumIconFromPreset` で SVG を描画（30×30px）
  - 未設定・該当なしの場合: 空のプレースホルダー（最低幅 30px 程度）
- テキストボックスは廃止する

#### トリガー

路線記号欄の横に置いた 2 つのボタンから開く:
- **「新規追加」ボタン** → `IconNewPopup` を開く
- **「リストから選択」ボタン** → `IconListPopup` を開く

---

#### 4.6.1 `IconNewPopup` — アイコン新規追加ポップアップ

**ファイル**: `app/components/IconNewPopup.tsx`

- タイトル: `アイコン新規追加`
- サブタブ: `設定で追加` / `画像で追加`（初期値: `設定で追加`）
- **「設定で追加」サブタブ**:
  | ラベル | 内容 |
  |--------|------|
  | プリセットから登録 | `iconIndexes` をもとにした `<select>` |
  | アイコンの路線記号 | テキスト入力（例: `TY`） |
  | 路線カラー | カラーピッカー |
  - 「アイコン追加」ボタン（`btn-primary`）:
    1. `iconParamsType` オブジェクトを生成し、`iconDict` の末尾に追加（キーは既存数値キーの最大値+1）
    2. 追加したアイコンのキーを `onSelect` で親に通知してポップアップを閉じる
- **「画像で追加」サブタブ**:
  | ラベル | 内容 |
  |--------|------|
  | 画像アップロード | ファイル入力（base64 に変換して保持） |
  - 「アイコン追加」ボタン（`btn-primary`）:
    1. base64 文字列を `iconDict` の末尾に追加（キーは既存数値キーの最大値+1）
    2. 追加したアイコンのキーを `onSelect` で親に通知してポップアップを閉じる
- **フッターボタン**: `閉じる` のみ

**Props**:
| prop | 型 | 説明 |
|------|----|------|
| `setting` | `settingType` | 設定オブジェクト（`iconDict` の参照に使用） |
| `setSetting` | `Dispatch` | `iconDict` への追加時に使用 |
| `onSelect` | `(key: string) => void` | アイコン追加・決定時のコールバック（キーを返す） |
| `onClose` | `() => void` | ポップアップを閉じるコールバック |
| `isNested` | `boolean?` | `true` のとき `.modal-backdrop-top` を使用（入れ子モーダル対応） |

**内部状態**:
| state | 型 | 説明 |
|-------|----|------|
| `newTab` | `'preset' \| 'image'` | サブタブ（初期値 `'preset'`） |
| `presetType` | `string` | 設定で追加: プリセット種別 |
| `presetSymbol` | `string` | 設定で追加: 路線記号 |
| `presetColor` | `string` | 設定で追加: 路線カラー |
| `imageData` | `string` | 画像で追加: base64 画像 |

---

#### 4.6.2 `IconListPopup` — アイコンをリストから選択ポップアップ

**ファイル**: `app/components/IconListPopup.tsx`

- タイトル: `アイコンをリストから選択`
- `GenericItemList` で `iconDict` の一覧を表示（カラム: ID・アイコンプレビュー）、単一選択
- 「アイコン選択」ボタン（`btn-primary`、未選択時は `disabled`）:
  - 選択中のアイコンキーを `onSelect` で親に通知してポップアップを閉じる
- **フッターボタン**: `閉じる` のみ

**Props**:
| prop | 型 | 説明 |
|------|----|------|
| `setting` | `settingType` | 設定オブジェクト（`iconDict` の一覧表示に使用） |
| `onSelect` | `(key: string) => void` | アイコン決定時のコールバック（キーを返す） |
| `onClose` | `() => void` | ポップアップを閉じるコールバック |
| `isNested` | `boolean?` | `true` のとき `.modal-backdrop-top` を使用（入れ子モーダル対応） |

**内部状態**:
| state | 型 | 説明 |
|-------|----|------|
| `listSelectedKey` | `string` | 選択中のアイコンキー |

---

#### 呼び出し元の状態管理変更

`LineList`・`StationParamSetter` の `isIconPickerOpen: boolean` を `iconPickerMode: 'new' | 'list' | null` に置き換える。
- `null`: 非表示
- `'new'`: `IconNewPopup` を表示
- `'list'`: `IconListPopup` を表示

#### CSS

`StationParamSetter` の接続路線追加ポップアップ内から開く場合はポップアップが入れ子になるため、`isNested={true}` のとき `.modal-backdrop-top`（`z-index: 1100`）を使用する。

| クラス | 役割 |
|--------|------|
| `.modal-backdrop-top` | 最前面に表示するオーバーレイ（`z-index: 1100`） |

#### 移行方針

既存の `LineIconPickerPopup.tsx` は `IconNewPopup.tsx` と `IconListPopup.tsx` に分割し、元ファイルは削除する。

---

### 4.X `LineAddPopup` — 路線追加ポップアップ

`StationParamSetter` の「次区間路線」セレクトボックス右横に配置した **「新規追加」ボタン**（`btn-primary`）を押下すると表示されるモーダル。`LineList` の路線編集フォームと同一の入力項目（テーブルを除く）を持ち、確定すると `lineDict` に路線を追加し、選択中駅の `lineId` を新しいキーに設定する。

#### 表示トリガー

`StationParamSetter` の「次区間路線」行に「新規追加」ボタン（`btn-primary`）を追加する。クリックで `LineAddPopup` を表示する。

#### ポップアップ内容

`LineList` の路線編集フォームと同一構成（テーブルを除く）：

| フィールド | 内容 |
|-----------|------|
| 路線記号（アイコン）| アイコンプレビュー＋「新規追加」ボタン＋「リストから選択」ボタン。`IconNewPopup` / `IconListPopup` を入れ子で使用 |
| 路線名 | テキスト入力 |
| 路線名かな | テキスト入力（変更時に英語を自動生成） |
| 路線名英語 | テキスト入力 |
| 路線記号（symbol） | テキスト入力 |
| 路線カラー | カラーピッカー |
| ナンバリング記号 | セレクトボックス（`numberIndexes` 準拠） |

フッターに **「追加」ボタン**（`btn-primary`）と **「閉じる」ボタン** を配置する。

#### 追加ボタン押下時の動作

1. `lineDict` の既存キーの最大値 + 1 を新しいキーとして路線エントリを追加する
2. 選択中の全駅の `lineId` を新しいキーに設定する
3. `colorMode === 'auto'` の駅は `numIcon.color` / `numIcon.symbol` / `numIcon.presetKey` を新路線の値で上書きする
4. ポップアップを閉じる

#### 実装上の注意

- アイコン管理（`IconNewPopup`/`IconListPopup`）は `setting`/`setSetting` を受け取って処理する
- `lineDict` への追加と駅の `lineId` 更新は **単一の `setSetting` 呼び出し** で行い、state の二重更新を避ける
- ポップアップ内のフォームは全てローカル state で管理し、「追加」押下時に `onAdd(lineData: lineType)` コールバックで親に渡す

---

### 4.X+1 `StationParamSetter` — 次区間運用セレクト

「次区間路線」セレクトボックスの下に **「次区間運用」** セレクトボックスを追加する。

| 項目 | 内容 |
|---|---|
| ラベル | 次区間運用 |
| UI | `<select>` |
| 先頭選択肢 | `""` / `"(なし)"` — `station.operationId` に空文字を設定する |
| その後の選択肢 | `operationDict` の各エントリを `"[id]: [trainType] [direction] [destination]行"` 形式で表示 |
| 値 | 選択された `operationDict` のキー文字列（`station.operationId` に格納） |

---

### 4.7 `TransferLinePopup` — 接続路線追加ポップアップ

`StationParamSetter` 内の「乗換路線」欄に配置するモーダルポップアップ。

#### 乗換路線の表示・操作

「乗換路線」欄のテキストボックスを廃止し、`transfers`（`transferItemType[]`）に登録済みの路線を **`GenericItemList`** で表示・操作する。

- `transfers` の各エントリを行として表示
- **路線記号列** に `isSelector: true` を付与しクリックで行選択可能にする
- 路線カラーはカラムのセル背景で表示
- 選択状態は `transferSelectedIndex: number | null`（選択中のインデックス）で管理

**テーブルカラム定義**:

| カラムヘッダー | 内容 | 備考 |
|---|---|---|
| 路線記号 | `item.line.lineIconKey` の **先頭キー** のみアイコン描画 | `isSelector: true` |
| 路線名 | `item.line.name` | |
| ナンバリング | `station.type/symbol/number/color` で `createNumIconFromPreset` 描画、フォールバックでテキスト | 24px |
| 駅名 | `station.name` | |
| 駅名英語 | `station.eng` | |
| 駅描画 | `station.isDraw` チェックボックス | |

テーブル下部ボタン:

| ボタン | 動作 |
|--------|------|
| 上に移動 | 選択行を `transfers` 配列内で1つ上へ移動 |
| 下に移動 | 選択行を1つ下へ移動 |
| 削除 | 選択行を `transfers` から除去（`btn-danger`） |

並び替えは `listOperations.ts` の `moveArrayItemsUp` / `moveArrayItemsDown` を利用。操作結果は `stationList[].transfers` に即時反映する。

テーブル下に入力フォームを2グループ配置する。いずれも選択中エントリの編集用であり、未選択時はグレーアウト（disabled）する。

**路線情報フォーム**（テーブルと「ナンバリング記号」の間）:

| ラベル | フィールド | 入力型 | 備考 |
|--------|-----------|--------|------|
| 路線記号 | `item.line.lineIconKey` | アイコンリスト + 操作ボタン | 下記「複数アイコン形式」参照 |
| 路線名 | `item.line.name` | テキスト | |
| 路線名かな | `item.line.kana` | テキスト | |
| 路線名英語 | `item.line.eng` | テキスト | |

##### 路線記号フォームの複数アイコン形式

`lineIconKey: string[]` をそのまま配列として扱い、登録済みアイコンを **1 行横並びリスト** で表示する。

- **リスト**: ヘッダーなし・1 行・複数列。各セルはクリックで選択可能（選択中セルをハイライト）。アイコン描画は `iconDict` から引いて表示（base64 → `<img>`、プリセット型 → SVG 30×30px）
- **ボタン（リスト下）**: `新規追加` `リストから選択` `削除` `左` `右`
  - `新規追加`: `IconNewPopup` を開き、確定したキーを配列末尾に追加する
  - `リストから選択`: `IconListPopup` を開き、確定したキーを配列末尾に追加する
  - `削除`: 選択中インデックスを配列から除去する
  - `左` / `右`: 選択中インデックスの要素を配列内で入れ替えて移動する

内部状態として `selectedLineIconIndex: number | null`（選択中アイコンのインデックス）を保持する。

**テーブル・他箇所での表示**: データ作成画面の各テーブルでは `lineIconKey[0]`（先頭要素）のみ描画する。

**drawParams 抽出時の変換（ProgressController.js）**: `lineIconKey` 配列の各要素を `:key:` で囲んで結合した文字列として `lineIcon` フィールドに格納する（例: `["M","Y"]` → `":M::Y:"`）。旧形式（文字列）は後方互換として `:key:` に変換する。

**乗換駅情報フォーム**（「ナンバリング記号」以降）:

| ラベル | フィールド | 入力型 |
|--------|-----------|--------|
| ナンバリング記号 | `station.type` | `<select>`（駅基本設定上部と同じ） |
| 路線カラー | `station.color` | カラーピッカー |
| 路線記号 | `station.symbol` | テキスト |
| ナンバリング | `station.number` | テキスト |
| 駅名 | `station.name` | テキスト |
| 駅名英語 | `station.eng` | テキスト |

フォームの下に **「基本設定情報を反映」ボタン** を配置する。クリックすると以下を実行する。

1. 選択中駅の `station.name` / `station.eng` を自駅の基本設定（名前・英語名）で上書きする。
2. 選択中の乗換エントリの `line.lineIconKey` の **先頭キー** が指すアイコン（`iconDict` の値）が **オブジェクト型**（`{presetType, symbol, color}`）の場合：
   - `station.color` ← アイコンオブジェクトの `color`
   - `station.symbol` ← アイコンオブジェクトの `symbol`
   - `station.type` ← アイコンオブジェクトの `presetType` が `I_*` 形式のとき `N_` + 残部（例: `I_tokyu` → `N_tokyu`）を `numberIndexes` に照合し、存在すればセット（存在しない場合は変更しない）

追加操作は下記の「接続路線を追加」ボタンで行う。テキストボックスによる直接編集は廃止。

#### トリガー

「乗換路線」表示の下にある **「接続路線を追加」ボタン** をクリックするとポップアップが開く。

#### ポップアップ内容

- **タイトル**: 接続路線を追加
- **タブ切り替え**: `新規追加` / `リストから選択`（初期値: `新規追加`）
- **「新規追加」タブ**:
  - 入力フォーム（新規路線用）:
    | ラベル | フィールド |
    |--------|-----------|
    | 路線記号 | `lineIconKey` |
    | 路線名 | `name` |
    | 路線名かな | `kana` |
    | 路線名英語 | `eng` |
    | 路線カラー | `color` |
  - **「路線追加」ボタン（`btn-primary`）**:
    1. フォームの値で `line: { lineIconKey, name, kana, eng }` を生成し、`{ line, station: { isDraw: false, type: "", symbol: "", color: "", number: "", name: "", eng: "" } }` として、選択中の全駅の `transfers` 配列末尾に追加する
    2. ポップアップを閉じ、フォームをリセットする
- **「リストから選択」タブ**:
  - `GenericItemList` で路線一覧を表示（LineList と同じカラム定義：路線記号・路線名・路線カラー）
  - ボタン行: `複数選択`（`btn-toggle`）のみ
  - **「路線追加」ボタン（`btn-primary`）**:
    1. 選択中の路線キーを `lineDict` の並び順（上から）でソートして取得する
    2. 各路線キーについて `lineDict[key]` の `{ lineIconKey, name, kana, eng }` を `line` にコピーし、`{ line, station: { isDraw: false, type: "", symbol: "", color: "", number: "", name: "", eng: "" } }` として、選択中の全駅の `transfers` 配列末尾に追加する
    3. ポップアップを閉じる
- **フッターボタン**: `閉じる` のみ（追加実行はタブ内ボタンで行う）

#### 状態管理

`StationParamSetter` 内で以下の state を追加する（既存含む）：

| state | 型 | 説明 |
|-------|----|------|
| `isTransferPopupOpen` | `boolean` | ポップアップ表示フラグ |
| `popupTab` | `'new' \| 'list'` | アクティブタブ（初期値 `'new'`） |
| `transferPopupSelectedKey` | `string[]` | 「リストから選択」タブで選択中の路線キー |
| `isPopupMultiSelect` | `boolean` | リストタブの複数選択モードフラグ |
| `newLineIconKey` | `string` | 「新規追加」タブの路線記号入力値 |
| `newLineName` | `string` | 「新規追加」タブの路線名入力値 |
| `newLineKana` | `string` | 「新規追加」タブの路線名かな入力値 |
| `newLineEng` | `string` | 「新規追加」タブの路線名英語入力値 |
| `newLineColor` | `string` | 「新規追加」タブの路線カラー入力値（初期値 `#000000`） |

#### 入れ子アコーディオン（詳細設定）

`StationParamSetter` 内の「次区間所要時間(分)」以降の項目（次区間路線・乗換案内・乗換案内英語・ホーム乗換案内行ごと表示数・スロット関連・向側列車設定）を `AccordionSection` で包み、**デフォルト閉じ** で表示する。

- タイトル: `詳細設定`
- `defaultOpen={false}` を指定する
- 見出し行のスタイルは外側アコーディオンと統一するが、入れ子であることを示すため若干インデントを抑える（CSS は `.section-header` / `.section-body` をそのまま流用）

#### CSS

| クラス | 役割 |
|--------|------|
| `.modal-backdrop` | 画面全体を覆う半透明オーバーレイ（`position: fixed`, `z-index: 1000`） |
| `.modal-dialog` | ポップアップ本体（中央配置、最大高さ `70vh`、スクロール可能） |
| `.modal-title` | タイトル行 |
| `.modal-footer` | ボタン行（右寄せ） |

### 4.8 駅設定エリアのタブ構成

`StationList` エリア下部に表示するコンテンツを、5 つのタブで切り替える。

#### タブ一覧

| タブID | タブラベル | コンテンツ |
|--------|-----------|-----------|
| `basic` | 駅基本設定 | 駅名・かな・英語・路線記号・ナンバリング・路線カラー・ナンバリング記号・ナンバリング表示形式・乗換路線・開くドア・次区間所要時間・次区間路線（`lineDict` から選択するセレクトボックス＋「新規追加」ボタン）・次区間運用（`operationDict` から選択するセレクトボックス） |
| `defaultLine` | 詳細路線図表示 | 乗換案内（日英テキスト）・登録路線情報を反映ボタン |
| `transfersDisp` | 乗換一覧表示 | 乗換一覧の行分割指定テキストボックス・基本設定情報を反映ボタン |
| `platform` | ホーム案内表示 | ホーム乗換案内行ごと表示数・スロット分割数・列車左端スロット・ホーム向側列車の路線ID・向側列車両数・向側列車左端スロット |
| `map` | マップ | 既存の MapComponent（現在開発中） |

#### ナンバリング連番入力

駅一覧ボタン行（「ナンバリング補完降順」の右隣）に「ナンバリング連番入力」ボタンを配置する（トグルではなく通常ボタン）。

押下するとモーダルポップアップ（`.modal-backdrop` / `.modal-dialog`）を表示する。

**ポップアップ内容**

| 要素 | 内容 |
|------|------|
| 「開始」テキストボックス | 連番の開始数値を入力する（数値として解釈；非数値の場合は何もしない） |
| 「順序」セレクトボックス | 「昇順」（デフォルト）/ 「降順」 |
| 「決定」ボタン（`btn-primary`） | 選択駅に連番を適用して閉じる |
| 「閉じる」ボタン | 何もせず閉じる |

**決定時の動作**

- 選択中の駅を `stationList` 上の位置順（上から下、インデックス昇順）に並べ替える
- 先頭駅に `開始` の値を、以降は昇順（+1）または降順（−1）でインクリメントして `numIcon.number` に書き込む
- 数値が 0〜9 の場合は `"0"` を前置して 2 桁にそろえる
- `numIcon` のその他フィールド（symbol・presetKey・color・colorMode 等）は変更しない

#### 「詳細路線図表示」タブの「登録路線情報を反映」ボタン仕様

クリックすると、`transfers` の各エントリから `transferText` / `transferTextEng` を自動生成する。

- 各エントリの `line.lineIconKey` は `:key1::key2:` 形式で格納されているため、**そのまま文字列として連結**する（`:` を付け直さない）
- 旧形式（プレーン文字列 ＝ `:` を含まない）の場合は `:${lineIconKey}:` として埋め込む
- 生成ロジック（1エントリあたり）:
  - `transferText` += `line.lineIconKey`（空でなければ） + `line.name` + `"\n"`
  - `transferTextEng` += `line.lineIconKey`（空でなければ） + `line.eng` + `"\n"`

#### 「乗換一覧表示」タブの仕様

- `stationType.transferListTransfers` を編集する `<textarea>` を配置する（初期値: 空文字列）
- 値はそのまま `station.transferListTransfers` に書き込む
- **「基本設定情報を反映」ボタン**: クリックすると、現在の `station.transfers`（`transferItemType[]`）の各インデックス（0始まり）を1行スペース区切りで `<textarea>` に書き込み `station.transferListTransfers` を更新する
  - 例: `transfers` が3要素 → textarea 値 `"0 1 2"`（改行なし、ユーザが後で改行を挿入可能）

#### `transferListTransfers` の書式と drawParams への反映ロジック

```
transferListTransfers の例（ユーザが改行を挿入した状態）:
"0 1\n2"
→ 1行目: インデックス 0, 1 の乗換エントリ
→ 2行目: インデックス 2 の乗換エントリ
```

- **空の場合**: `transfers`（`transferItemType[]`）の各エントリを1行1路線として `transferList` を生成する（`line` / `station` 情報も含める）
- **空でない場合**: 改行で分割した各部分を1行とし、各行内をスペースで分割して配列インデックス（数値）として `transferList` を生成する
  - 範囲外のインデックスは除外する

#### 実装方針

- `StationList` の `TabType` を `'basic' | 'defaultLine' | 'transfersDisp' | 'platform' | 'map'` に変更する
- タブボタン行を 5 ボタンに更新する
- `StationParamSetter` に `activeSection: 'basic' | 'defaultLine' | 'transfersDisp' | 'platform'` prop を追加する
  - `StationList` から現在のアクティブタブを渡し、`StationParamSetter` 内で表示するフォーム群を切り替える
  - `map` タブは `StationParamSetter` ではなく `StationList` が直接 `MapComponent` をレンダリングする
- 既存の `AccordionSection`（詳細設定）は廃止し、タブで代替する
- グレーアウト（駅未選択時）は `basic` / `defaultLine` / `transfersDisp` / `platform` セクションすべてに適用する

---

### 4.9 リスト並び替え・複数選択

`StationList`・`LineList`・`IconList` の全リストに共通する「上に移動/下に移動/複数選択」操作を `app/modules/listOperations.ts` に集約する。各リストはこのモジュールの関数を呼び出して使用する。

#### 提供関数

```typescript
// 配列要素を上に移動（StationList 向け）
// selectedIndexes: 0-based インデックス
export function moveArrayItemsUp<T>(
    arr: T[],
    selectedIndexes: number[]
): { newArr: T[], newSelected: number[] }

// 配列要素を下に移動（StationList 向け）
export function moveArrayItemsDown<T>(
    arr: T[],
    selectedIndexes: number[]
): { newArr: T[], newSelected: number[] }

// 辞書エントリを上に移動（LineList・IconList 向け）
// orderedKeys: 現在の表示順キー配列
// swapped: 値が入れ替わったキーのペア（参照更新に利用）
// newSelected: 移動後の新しい選択キー
export function moveDictItemsUp<T>(
    dict: Record<string, T>,
    orderedKeys: string[],
    selectedKeys: string[]
): { newDict: Record<string, T>, swapped: [string, string][], newSelected: string[] }

// 辞書エントリを下に移動（LineList・IconList 向け）
export function moveDictItemsDown<T>(
    dict: Record<string, T>,
    orderedKeys: string[],
    selectedKeys: string[]
): { newDict: Record<string, T>, swapped: [string, string][], newSelected: string[] }
```

#### 動作仕様

**配列系（moveArrayItems\*）**
- 選択アイテムが境界（先頭/末尾）にある場合は操作を行わず現状を返す
- 複数選択時は選択グループ全体を1ステップ移動する
  - 上移動: 選択インデックスを昇順で処理（上から順に swap）
  - 下移動: 選択インデックスを降順で処理（下から順に swap）

**辞書系（moveDictItems\*）**
- `orderedKeys` の順序で移動対象の位置を決定する
- 隣接するキー同士の **値** を交換し、`swapped: [keyA, keyB][]` で交換ペアを返す
- 呼び出し側が `swapped` を使って cross-reference を更新する責任を持つ
  - `LineList`: `stationList[].lineId` を keyA ↔ keyB で入れ替える
  - `IconList`: `lineDict[].lineIconKey` を keyA ↔ keyB で入れ替える
- `newSelected` は移動後の新しい選択キーを示す

#### 複数選択の実装方針

各リストに `isMultiSelect: boolean` state を追加する。

| 状態 | `handleRowClick` の動作 |
|------|------------------------|
| `isMultiSelect = false` | クリックした1行のみ選択 |
| `isMultiSelect = true`  | クリックで選択トグル（追加/解除） |

#### 連続選択モード（`StationList` のみ）

`isMultiSelect = false` の時のみ有効。`isRangeSelectMode: boolean` と `rangeStartIndex: number | null`（1-based）で管理する。

| 操作 | 動作 |
|------|------|
| 選択中の駅をクリック | 「連続選択」モードへ移行。`selectedIndexes` を空にし、`rangeStartIndex` に当該インデックスを記録 |
| 連続選択モード中に別の駅をクリック | `rangeStartIndex` からクリック駅までの全インデックスを `selectedIndexes` にセットし、モード解除 |
| 連続選択モード中に `rangeStartIndex` の駅をクリック | モード解除、当該駅のみを通常選択状態に戻す |
| `isMultiSelect` を ON に切り替え | 連続選択モードを強制解除 |

連続選択モード中は、起点駅（`rangeStartIndex`）の行背景を **オレンジ**（`range-start` クラス）で表示し、青ハイライト（`selected`）は当てない。

`GenericItemList` に `rangeStartKey?: string` prop を追加し、該当行に `range-start` クラスを付与する（`selected` より優先）。CSS は `.range-start td, .range-start th { background-color: orange; }` 相当。

#### `StationList` テーブルカラム定義

| カラムヘッダー | 内容 | 備考 |
|---|---|---|
| 運用 | 縦線＋横棒（下記参照） | 区間ごとの運用を縦線で表現。クリックで運用情報の吹き出しを表示 |
| 路線 | 路線色の縦線＋〇マーカー（下記参照） | 区間ごとの路線を縦線で表現。クリックで路線情報の吹き出しを表示 |
| 駅名 | `station.name` | `isSelector: true`、クリックで行選択 |
| 通過 | `station.isPass` に応じた表示切替（下記参照） | クリックで `isPass` をトグル |
| 駅名多言語（グループ） | `ColumnGroup`。`collapsible: true`、`defaultCollapsed: true`（下記参照） | 子カラム: 駅名かな・駅名英語 |
| ├ 駅名かな | `station.kana` | 個別の折りたたみはしない |
| ├ 駅名英語 | `station.eng` | 個別の折りたたみはしない |
| ナンバリング | `numIcon` のアイコン描画。`numIconNext` があれば右に並べて2つ表示（下記参照） | |
| 次駅までの<br/>所要時間 | `station.sectionTime` | ヘッダーは `<br/>` で2行に改行表示 |
| 乗換 | `station.transfers` のアイコン描画 | |
| ドア | `station.doorSide` | |
| 座標（グループ） | `ColumnGroup`。`collapsible: true`、`defaultCollapsed: true`（駅名多言語と同じ構造） | 子カラム: 緯度・経度 |
| ├ 緯度 | `station.coordinate[0]` | 個別の折りたたみはしない |
| ├ 経度 | `station.coordinate[1]` | 個別の折りたたみはしない |

##### 2つ目のナンバリング（`numIconNext`）

路線をまたぐ駅は、ひとつ前の区間（今までの路線）と次の区間（次の路線）の2つの駅番号を持つ。これを表現するため、`stationType` に `numIcon` と同じ型の `numIconNext` を追加する。

- **意味**: `numIcon` ＝ 今までの路線のナンバリング、`numIconNext` ＝ 次の路線のナンバリング
- **既定値**: 全フィールド空文字（`presetKey` / `manualPresetKey` のみ `"N_tokyu"`）、`colorMode` は `'manual'`。2つ目は使わない駅のほうが多い任意項目のため、既定では自動補完を行わない
- **`colorMode: 'auto'` の挙動**: `numIcon` と同じく `lineDict[station.lineId]`（次区間路線）の `symbol`・`numIconPresetKey`・`color` を参照する。`numIcon` の自動補完が働く場面（次区間路線の変更、路線カラー設定の切替、`LineList` での路線情報変更）では `numIconNext` も同じ条件で追従する
- **駅情報表（`StationList`）の「ナンバリング」列**: `numIcon` のアイコンを描画し、その**右に並べて** `numIconNext` のアイコンを描画する。`numIconNext.number` が空の駅は2つ目を描画しない（`presetKey` だけが入っている駅で空のアイコンが並ぶのを防ぐため）
- **LCD表示側は路線図（defaultLine）ページのみ対応する**。ヘッダー（現在駅の大きい表示）と追加路線図（overLine）は `numIcon` のみを参照する従来の動作のままとする（下記参照）

##### LCD表示側（路線図ページ）への反映

路線図ページの描画は、drawParams の `defaultLine.dispStationList[i].numIconNext` を通して行う。この枠組みは既に用意されているため、エディタ側の値を流し込む変更だけで表示できる。

- **既存の仕組み**: `drawParamsSpec.md` に `numIconNext`（乗換先路線のナンバリングアイコン）が定義済みで、`defaultLineSVG.svg` にもテキスト形式・アイコン形式それぞれの描画指定がある。これらは `<g lcdParts="arrange" arrange-axis="y">` の中にあるため、`numIcon` と `numIconNext` の両方が `isDraw: true` のときは自動で縦に並ぶ（座標指定は同じだが arrange が再配置する）
- **変更点1**: `ProgressController._buildNumIconFromStation()` に参照するフィールド名の引数を追加し、`_buildDispStationList()` の `numIconNext` を `isDraw: false` のハードコードから `station.numIconNext` 由来の値に変更する。`isDraw` は `number` が空でないかで決まるため、2つ目を使わない駅では従来どおり描画されない
- **変更点2**: ナンバリングアイコンのSVGプリセットを事前読み込みしている箇所（`public/display.html`・`public/LcdSimulator/index.html`・`public/js/display.js`）の収集対象に `numIconNext.presetKey` を追加する。これがないとアイコン形式のとき2つ目のプリセットが読み込まれず描画できない
- **未対応**: 追加路線図（overLine）の `numIconSub` は `ProgressController` 側が `isDraw: false` のまま、`overLineSVG.svg` 側も描画指定がコメントアウトされたままとする。ヘッダーのSVGには2つ目のナンバリング用の枠自体が無いため、対応する場合はSVGテンプレートの追加が必要

##### 「路線記号２」設定エリア（`StationParamSetter`）

既存の「路線記号」`fieldset` の下に、`numIconNext` を編集する「路線記号２」エリアを追加する。

- 入力項目は「路線記号」エリアと同一（路線記号・ナンバリング・路線カラー・ナンバリング記号・路線カラー設定）で、編集対象が `numIconNext` になる
- **エリアごと折りたたみ可能**とし、**初期状態は折りたたみ**。`legend` をクリックで開閉し、折りたたみ中は `▶`、展開中は `×` を見出しに付ける（テーブルの列折りたたみと同じ記号の使い分け）

##### 通過列の表示仕様

チェックボックスは表示せず、セル内のテキストをクリックすることで `station.isPass` をトグルする。

- `isPass === true` の場合: `レ` を表示する
- `isPass === false` の場合: 始点駅（先頭駅、積算時間 `0`）からその駅までの積算所要時間を数値のみで表示する
  - 積算時間 = 先頭駅から当該駅の **直前の駅** までの各駅の `sectionTime` の合計（先頭駅自身は `0`）
  - 区間内のいずれかの駅で `sectionTime` が空文字（数値変換できない）場合、その駅以降の積算時間は計算不能として `-` を表示する

##### 運用列・路線列の表示仕様（鉄道路線図風）

両列とも **駅名列の左**（テーブル最左）に配置し、`station.operationId` / `station.lineId` が「この駅以降の区間」を表すことを利用して、区間を**縦線**で表現する。

描画は `StationList` 側の通常の `cell` として実装する。ひとつ前の駅のデータは `cell(station, key)` の `key`（0-based インデックス）から `setting.stationList[index - 1]` で取得する（描画は1つの `<td>` の内部だけで完結し、行をまたぐ描画は不要なため、`GenericItemList` 側に専用の仕組みは設けない）。

**共通の描画規則**

- `<td>` には `cellStyle` で `position: relative`、`padding: 0`、`border-bottom: none` を指定する（行ごとの横罫線は引かない。縦線が罫線で分断されるのを防ぐため）
- 本文が細い縦線のみで文字を含まないため、列幅は `headerWidth: '32px'`（前述「ヘッダー幅の固定」参照）で固定し、既定の幅決定ルールより狭くする
- セル内に `position: absolute; inset: 0` のコンテナを置き、セルの高さいっぱいを描画領域にする
- **上半分の線**（セル上端〜セル中央）: ひとつ前の駅の区間を表す。**先頭駅（index 0）には描画しない**
- **下半分の線**（セル中央〜セル下端）: 当該駅自身の区間を表す。**最終駅には描画しない**
- 線は太さ 3px で、セルの水平中央に配置する

**運用列**

- 線の色: `var(--text-primary)` 固定。`operationId` が未設定の区間は線を描画しない
- **横棒**: ひとつ前の駅と `operationId` が異なる駅（＝運用が切り替わる駅）のセル中央にのみ描画する。**先頭駅には描画しない**（先頭駅は「ひとつ前の駅」が無いため切替駅とはみなさない）
  - サイズは幅 14px・高さ 3px、色は線と同じ `var(--text-primary)`
- 運用番号のテキストは表示しない（運用の内容はクリック時の吹き出しで確認する）
- クリック時: `OperationInfoBalloon` を表示する（下記参照）

**路線列**

- 線の色: 上半分はひとつ前の駅の `lineDict[lineId].color`、下半分は当該駅の `lineDict[lineId].color`。色が取得できない場合はその半分の線を描画しない
- **〇マーカー**: **全駅**のセル中央に描画する。中心が白、輪が路線色の「白抜き」の円（鉄道路線図の駅マーカー風）
  - 輪の色は通常は当該駅の路線色とするが、ひとつ前の駅と `lineId` が異なる駅（＝路線が切り替わる駅）は**黒**にする。先頭駅は切替駅とはみなさない
  - 路線色が取得できない駅は輪の色を `var(--text-muted)` とする
- クリック時: 既存の `LineInfoBalloon` を表示する（従来どおり）

**路線セルクリック時の吹き出し表示**: `onClick`（4.5節参照）で、クリックされたセルの `station.lineId` に対応する `lineDict` の情報を吹き出し（`LineInfoBalloon` コンポーネント）で表示する。

- 表示内容: 路線名（`line.name`）・路線名かな（`line.kana`）・路線名英語（`line.eng`）・路線記号の画像（`line.numIconPresetKey` の `createNumIconFromPreset` に `line.symbol`・`line.color` を渡して生成したSVG）
- `lineId` が未設定、または `lineDict` に該当エントリが存在しない場合は吹き出しを表示しない
- 吹き出しはクリックされた位置（`event.clientX` / `event.clientY`）を基準に `position: fixed` で表示する
- 閉じる操作: 吹き出し右上の「×」ボタンをクリック、または吹き出し外側をクリック（`mousedown` を `document` で監視し、吹き出し自身の要素に含まれないクリックで閉じる）
- 別の路線セルをクリックした場合は、表示中の吹き出しの内容を新しいセルの路線情報に切り替える

##### テーブルヘッダーの重なり対策（CSS）

`#stationsTable` は `thead th` に `position: sticky; top: 0;` を適用してスクロール時にヘッダー行を固定表示している。この sticky 指定は **`thead th` にのみ** 適用し、`tbody` 側の `<th>`（`駅名` 列の選択セル）には適用しない。また `thead th` には明示的に `z-index` を設定し、`tbody` 側の `position: relative` を使うセルより常に手前に描画されるようにする。これにより、上方向スクロール時に本文側のセルがヘッダーに重なって表示される問題を防ぐ。

**判明した問題**: ヘッダーが2行構成のとき（`ColumnGroup` を含むテーブル）、入れ子でない列・グループの `<th>` には、内部の絶対配置要素の基準にするためインラインスタイルで `position: relative` を指定していた。インラインスタイルはCSSの `position: sticky` を上書きするため、これらのセルだけ固定表示されず、スクロールすると本文と一緒に流れてしまう不具合が生じていた（折りたたみ中の縦書きセルはインラインの `position` 指定が無いため固定されており、不具合は入れ子でない列にのみ現れていた）。

- 対策として、これらの `<th>` のインラインスタイルを `position: relative` から **`position: sticky`** に変更する。`sticky` も「位置指定された要素」であり絶対配置の子要素の containing block になるため、見出しテキスト用の絶対配置 `div` の基準としてはそのまま機能する
- 2行構成のヘッダーでは、1行目と2行目が同じ `top: 0` で固定されると重なってしまうため、**2行目のセルには `top` に1行分の高さ（`GROUPED_HEADER_ROW_HEIGHT`）を指定**し、1行目のすぐ下に固定されるようにする。1行目のセルと、2行分を `rowSpan` で占める折りたたみ中のセルは `top: 0` のままとする

**判明した問題（ヘッダー下側の境界線が消える）**: `border-collapse: collapse` のテーブルでは、隣接するセルで結合された境界線は個々のセルではなく**テーブル自身が描画する**ため、`position: sticky` で固定されたセルには追従しない。その結果、スクロールするとヘッダー下側の境界線だけが本文と一緒に流れて見えなくなっていた（Chrome実機で、`scrollTop: 0` では見えていた線がスクロール後に消えることを確認）。なお列同士の縦の境界線はセルと一緒に描画されるため影響を受けない。

- 対策として、ヘッダーの最下段にあたるセルに `box-shadow: inset 0 -1px 0 var(--border)` を指定する。`box-shadow` は境界線と違い要素自身が描画するため、sticky で固定されたセルにも追従する
- このとき、同じセルの `border-bottom` は `none` にする。両方を残すと、スクロール位置が先頭（固定されていない状態）のときに境界線と `box-shadow` の線が隣り合って描画され、**二重線**に見えてしまうため
- 対象は「ヘッダーの一番下に接しているセル」のみとする。具体的には、2行構成の場合は**2行目のセル**と**2行分を `rowSpan` で占める折りたたみ中のセル**、1行構成（`ColumnGroup` を含まないテーブル）の場合は**全てのヘッダーセル**。2行構成の1行目のセルには指定しない（1行目と2行目の間に分割線が入ってしまうため）

##### 運用情報の吹き出し表示（`OperationInfoBalloon`）

運用列のセルをクリックすると、その駅の `operationId` に対応する `operationDict` の運用情報を吹き出しで表示する。

- `operationId` が未設定、または `operationDict` に該当エントリが存在しない場合は吹き出しを表示しない
- クリック判定はセル全体とする（縦線は細く、線そのものだけを判定対象にすると押しにくいため）
- 表示位置・閉じる操作・デザインは `LineInfoBalloon` と共通とする（クリック位置を基準に `position: fixed` で表示、右上の「×」ボタンまたは吹き出し外側のクリックで閉じる、同じ CSS クラスを使用）
- 別の運用セルをクリックした場合は、表示中の吹き出しの内容を新しいセルの運用情報に切り替える

**表示項目**

| 項目 | 参照するフィールド |
|---|---|
| 運用ID | `station.operationId`（`operationDict` のキー） |
| 行先 | `operation.destination` |
| 行先かな | `operation.destinationKana` |
| 行先英語 | `operation.destinationEng` |
| 種別 | `operation.trainType` |
| 種別英語 | `operation.trainTypeEng` |
| 経由等 | `operation.direction` |
| 号車 | `operation.carNumber` |
| 行先番号 | `operation.destinationNum` を記号と番号に分割し、`operation.destinationNumIconKey`・`operation.destinationColor` とあわせて `createNumIconFromPreset` で生成したSVG |

`destinationNum` の分割規則は `public/Controller/src/utility/utils.js` の `parseStationNumber` と同じとする。半角スペースがあればそこで分割し（例: `"H 08"` → 記号 `H` / 番号 `08`）、なければ非数字と数字の境界で分割する（例: `"TY01"` → 記号 `TY` / 番号 `01`）。

#### UI（全リスト共通）

テーブル直下の `.btn-group` に以下ボタンを追加する：

| ボタン | 動作 |
|--------|------|
| 上に移動 | 選択行を1ステップ上へ |
| 下に移動 | 選択行を1ステップ下へ |
| 複数選択 | トグルボタン（`btn-toggle` クラス） |

#### 要素追加時の自動選択

全リストにおいて、要素を追加した直後に追加された行を自動選択状態にする。

| リスト | 追加操作 | 自動選択キー |
|--------|----------|-------------|
| `StationList` | 駅追加ボタン（`addStation`） | 追加された駅の 1-based インデックス |
| `LineList` | 路線追加ボタン（`addLine`） | 追加された路線の数値キー（文字列） |
| `IconList` | アイコン追加ボタン（`iconAddButtonClicked`） | 登録名として入力した文字列（`newIconName`） |

### 4.10 `DispConfig` — 表示設定コンポーネント

**ファイル**: `app/components/DispConfig.tsx`

`Editor` の「アイコン登録」アコーディオンセクションの直後に配置する「表示設定」セクション。`dispConfig.pageNameList` と `dispConfig.langIdList` を編集する UI を提供する。

---

#### 4.10.1 ページ設定（セクション上部）

`pageDispList` を走行状態ごとに編集するUI。セクション内の最上部に配置する。

**pageStateタブ**: 6タブ（始発停車 / 走行 / 直前 / 停車 / 通過 / 終点停車）を表の上に配置し、表示・編集対象の `pageState` を切り替える。

**利用可能なページ名（固定の選択肢）**:

| ページ名 | 説明 |
|---|---|
| `defaultLineSVG.svg` | 路線図（デフォルト） |
| `overLineSVG.svg` | 全線路線図 |
| `transfers.svg` | 乗換案内 |
| `platform.svg` | ホーム案内 |

**テーブルカラム定義**:

| カラムヘッダー | フィールド | 備考 |
|---|---|---|
| ページ名 | `pageName` | `isSelector: true`、クリックで行選択 |
| 表示時間(ms) | `dispTime` | 数値 |
| 表示条件 | `type` | 0: 無条件 / 1: 乗換あり / 2: 次運用あり / 3: Message |

**ボタン（テーブル直下・他リストと同じアイコン/色）**:

| ボタン | 動作 |
|--------|------|
| ↑（`btn-icon`） | 選択中エントリを1つ上へ移動 |
| ↓（`btn-icon`） | 選択中エントリを1つ下へ移動 |
| +（`btn-icon btn-primary`） | 選択行の直下（未選択時は末尾）に新規エントリを追加 |
| ゴミ箱（`btn-icon btn-danger`） | 選択中エントリを削除 |

**編集フォーム（ボタンの下）**: 非選択時はグレーアウト。

| ラベル | フィールド | 入力型 |
|--------|-----------|--------|
| ページ名 | `pageName` | `<select>`（AVAILABLE_PAGESから選択） |
| 表示時間(ms) | `dispTime` | number |
| 表示条件 | `type` | `<select>`（0〜3） |

**ページ自動切換えトグル（編集フォームの下・常時有効）**:

`dispConfig.isPageAuto` に対応するチェックボックス。ページ設定セクションの最下部に配置する。オン（`true`）でタイマー自動切換え、オフ（`false`）でユーザー操作による手動切換えになる。選択行の有無によるグレーアウトなし。

**内部状態**:

| state | 型 | 説明 |
|-------|----|------|
| `selectedPageStateTab` | `number` | 現在表示中のpageState（0〜5） |
| `selectedPageIndex` | `number \| null` | 選択中のページエントリインデックス |

---

#### 4.10.2 言語設定（セクション下部）

`langIdList` を編集するテーブル。ページ設定テーブルの下に配置する。

**テーブルカラム定義**:

| カラムヘッダー | フィールド | 備考 |
|---|---|---|
| 言語ID | `langId` | `isSelector: true`。0: 日本語, 1: ひらがな, 2: 英語 |
| 表示時間(ms) | `displayTime` | 数値 |
| 遷移時間(ms) | `transTime` | 数値 |
| ギャップ時間(ms) | `gapTime` | 数値 |

**ボタン**:

| ボタン | 動作 |
|--------|------|
| 追加 | `langIdList` の末尾に新エントリを追加（デフォルト: `{ langId: 0, displayTime: 4000, transTime: 400, gapTime: 100 }`） |
| 削除 | 選択中のエントリを削除（`btn-danger`、未選択時は `disabled`） |

**編集フォーム**: 非選択時もグレーアウト状態で常時表示。`.form-row` で各フィールドを `type="number"` で編集する。

| ラベル | フィールド |
|--------|-----------|
| 言語ID | `langId` |
| 表示時間(ms) | `displayTime` |
| 遷移時間(ms) | `transTime` |
| ギャップ時間(ms) | `gapTime` |

---

#### Props

| prop | 型 | 説明 |
|------|----|------|
| `setting` | `settingType` | 設定オブジェクト |
| `setSetting` | `Dispatch` | 設定更新コールバック |

#### 内部状態（全体）

| state | 型 | 説明 |
|-------|----|------|
| `selectedPageIndex` | `number \| null` | ページリストの選択中インデックス |
| `newPageName` | `string` | 追加ページ選択 `<select>` の値 |
| `selectedLangIndex` | `number \| null` | 言語リストの選択中インデックス |

---

### 4.9 `OperationForm` — 運用タブ UI

複数の運用を辞書形式で管理し、切り替えるUIをタブ形式で実装する。`lineDict` と同じ構造（数値文字列キー）。

#### データ構造

`settingType.operationDict: { [id: string]: operationType }` — キーは数値文字列（例: `"0"`, `"1"`, `"2"`）。

#### レイアウト

```
[ 運用を追加 ] [ 表示中を削除 ]
┌────────────────────┬────────────────────┬──────────┐
│ 0: 急行 渋谷経由 元町行 │ 1: 各停 元町行       │  ...  │  ← タブ行
└────────────────────┴────────────────────┴──────────┘
  選択中の運用IDに対応するフォーム内容
```

- タブは既存の `.tab-btn` / `.tab-btn.active` クラスを使用
- 選択中の運用IDは `operationId` state（文字列キー）で管理
- `operationDict` のエントリ追加・削除はキー操作で行う（`lineDict` と同じ方式）

#### タブラベルの生成ロジック

タブに表示するテキスト: **「[id]: [trainType] [direction] [destination]行」**

| フィールド | 内容 |
|---|---|
| `id` | `operationDict` のキー |
| `trainType` | `operation.trainType`（空の場合は省略） |
| `direction` | `operation.direction`（空の場合は省略） |
| `destination` | `operation.destination`（空の場合は `"行先未設定"`） |

例: `"0: 急行 渋谷経由 元町・中華街行"` / `"1: 各停 元町・中華街行"`

#### 運用追加・削除

| 操作 | 挙動 |
|---|---|
| 追加 | `operationDict` のキー最大値+1 を新キーとして空の運用を追加 |
| 削除 | 現在選択中のキーを `operationDict` から削除。前のキーを選択状態に戻す（なければ最初のキー） |

#### `startStationInd` の廃止

旧 `startStationInd` フィールドは廃止する。各駅が `operationId` を持つ方式に変更。フォームからも削除する。

### `MessageForm` — メッセージ設定フォーム

Editor上でOperationFormセクションの次に配置する独立したアコーディオンセクション。`setting.message` を編集するUIを提供する。

#### Props

| prop | 型 | 説明 |
|---|---|---|
| `setting` | `settingType` | 設定オブジェクト |
| `setSetting` | `Dispatch<SetStateAction<settingType>>` | 設定更新関数 |

#### UI構成

- **メッセージ** テキストエリア（複数行入力可能、`setting.message.text` に対応）

#### 対応するデータ

`settingType.message: { text: string }` — `infoMessage.svg` 表示時に参照するテキスト。空文字の場合、pageType=3 のページは表示されない。

### 4.10 駅プリセットから追加

#### 概要

CSVファイルで管理された路線・駅のプリセットデータから、任意の区間を選んで `stationList` に一括追加する機能。

#### CSVファイル

`public/csv/presetLines/` ディレクトリに配置し、クライアントから fetch で取得する。ユーザーが用意する。

| ファイル | 列構成 |
|----------|--------|
| `public/csv/presetLines/stationDB.csv` | 駅ID, 駅名, 駅名かな, 駅名英語, 緯度, 経度 |
| `public/csv/presetLines/lineDB.csv` | 路線ID, 事業者, 路線名, 路線名かな, 路線名英語, 路線カラー, 路線記号, 路線アイコン, ナンバリングアイコン |
| `public/csv/presetLines/lineConnectDB.csv` | 路線ID, 駅ID, 駅ナンバリング |
| `public/csv/presetLines/transferDB.csv` | 駅ID1, 駅ID2 |

- **駅ID**: 全駅にわたって一意な識別子
- **路線ID**: 全路線にわたって一意な識別子
- **lineConnectDB.csv**: 同一路線IDの行を上から順に抽出したとき、その順番がその路線上の駅のつながりを表す。駅の所属路線を求める際もこのファイルから導出する
- **transferDB.csv**: 別々の駅IDを持つ駅同士が乗り換え可能であることを表す（「乗換」エッジ）。下記「駅のグラフ構造」参照

**lineDB.csv の各列**:

| 列 | 内容 | 例 |
|---|---|---|
| 事業者 | 路線を運営する事業者名。路線選択UIの分類に使う | `JR東日本`、`東急電鉄` |
| 路線記号 | 路線のナンバリング記号 | `JK` |
| 路線アイコン | 路線記号アイコンのプリセットキー（`I_*`）。`iconDict` の `presetType` に使う | `I_JR_east` |
| ナンバリングアイコン | 駅ナンバリングのプリセットキー（`N_*`）。`lineDict.numIconPresetKey` と各駅の `numIcon.presetKey`・`numIconNext.presetKey` に使う | `N_JR_east` |

> 従来の `アイコン` 列は `I_*` が入っているのに `lineDict.numIconPresetKey`（本来 `N_*`）へ書き込まれ、駅のナンバリングは `N_tokyu` 固定になっていた。これを `路線アイコン`・`ナンバリングアイコン` の2列に分けて解消する。

#### 駅のグラフ構造

プリセットデータは、駅をノード、駅同士の関係をエッジとするグラフとして扱う。エッジは2種類ある。

| エッジ | 定義元 | 意味 | 区間選択での扱い |
|---|---|---|---|
| 路線 | `lineConnectDB.csv` | 同一路線上で隣り合う駅を結ぶ。列車で移動できる | 区間として選択できる |
| 乗換 | `transferDB.csv` | 別々の駅IDを持つ駅同士を結ぶ。徒歩などで乗り換えできる | **使わない**（データ保持と路線図表示のみ） |

#### 駅IDの定義

**駅ID** は stationDB.csv で全駅にわたって一意に定められた識別子。路線をまたいで同一駅を参照できる。

- **同じ駅（1つの駅ID）**: 駅名が同じで、駅施設を共有する駅。同一事業者の複数路線が乗り入れる駅、複数事業者の共同使用駅、直通運転の境界駅を含む
  - 例: JR東日本の新宿駅（山手線・中央線快速・埼京線などが同じ駅ID）
- **別の駅（別々の駅IDを「乗換」でつなぐ）**: 駅施設が別の駅、または事業者によって駅名・かな・英語名が異なる駅
  - 例: JR新宿 ⇔ 京王新宿、JR浜松町 ⇔ 都営大門
- 1つの駅IDは駅名・かな・英語名を1組しか持てない。事業者によって表記が異なる駅は、別々の駅IDにして「乗換」でつなぐ
- 最終的な判断はデータ作成者に委ねる

#### データ作成ルール

全国の路線データを登録する前提で、以下のルールに従ってCSVを作成する。

| 項目 | ルール |
|---|---|
| ID の形式 | 駅ID・路線IDともに0以上の整数とする（路線図の区間決定で数値として比較するため）。一度割り当てたIDは変更しない |
| CSV の値 | 値にカンマ（`,`）・ダブルクォート（`"`）・改行を含めない（パーサーは単純な `,` 区切りで引用符に対応しない）。前後の空白は読み込み時に除去される |
| 分岐線 | `lineConnectDB` は路線を1本の線（駅の並び）として表すため、分岐する路線は**支線ごとに別の路線ID**とする。分岐駅は本線・支線の両方に同じ駅IDで含める（例: 丸ノ内線の方南町支線は「丸ノ内線（分岐線）」として中野坂上〜方南町を登録する） |
| 環状線 | 起点駅を末尾にもう一度並べて輪を閉じる（例: 山手線は 大崎 → … → 大崎） |
| 6の字の路線 | 合流する駅を2回並べる（例: 大江戸線は 光が丘 → … → 都庁前 → 新宿西口 → … → 新宿 → 都庁前） |
| 駅ナンバリング | `記号 番号` の形式（スペース区切り）。ナンバリングのない路線は空欄 |
| transferDB | 1組の乗換を1行で表す（向きを持たない。`A,B` と `B,A` の両方は書かない）。同じ駅IDどうしは書かない |
| 路線の単位 | 正式な線名ではなく**案内上の路線**（事業者の路線図・車内案内で使われる系統名）を1路線とする（例: 湘南新宿ライン、総武線快速、中央・総武線各駅停車） |
| 他路線へ乗り入れる運行系統 | 系統として固有の駅ナンバリングを持つ区間だけを1路線とし、乗り入れ先は各路線で表す（例: 湘南新宿ラインは JS の付く逗子〜大宮）。固有の区間を持たない系統（中央線・地下鉄東西線直通など）は独立した路線にせず、乗り入れ先の路線どうしを区間選択でつないで表す。上野東京ラインは固有の区間（東京〜上野）だけを1路線とする |

#### ボタン配置

`StationList` の最上段（`GenericItemList` より上）に「路線図から追加」ボタンを配置する。クリックで `StationPresetPopup` が開く（7.25節で「駅プリセットから追加」から名称変更）。

#### `StationPresetPopup` コンポーネント

**ファイル**: `app/components/StationPresetPopup.tsx`

**Props**:

```typescript
type Props = {
    setting: settingType  // lineDict・iconDict の既存エントリを参照するために使用（読み取り専用）
    // 追加確定時のコールバック。stations に加え、新規作成が必要な lineDict・iconDict の
    // エントリ（既存と重複しないもの）を渡す
    onAdd: (result: { stations: stationType[], newLines: Record<string, lineType>, newIcons: Record<string, iconParamsType> }) => void
    onClose: () => void
}
```

**区間オブジェクト**:

```typescript
type StationSection = {
    lineId: string    // 路線ID
    prevIndex: number // 前駅の lineConnects 内位置インデックス（一意）
    nextIndex: number // 次駅の lineConnects 内位置インデックス（一意）
}
```

**前駅参照オブジェクト**:

```typescript
type PrevStationRef = {
    station: PresetStation // 駅データ
    lineId: string         // 選択された路線ID
    index: number          // その路線の lineConnects 内位置インデックス
}
```

> 7.34節でリストからの選択（路線選択リスト・駅選択リスト）を廃止し、路線図からの選択のみにした。以下のリスト選択に関する記述（UI レイアウト・状態遷移・路線選択リストの表示範囲・ガイダンステキスト）は廃止前の仕様。

**UI レイアウト**:

```
┌──────────────────────────────────────────────────────────┐
│  路線図から追加                                           │
├──────────────────┬──────────────────┬───────────────────┤
│  路線選択リスト  │  駅選択リスト    │  追加一覧リスト   │
├──────────────────┴──────────────────┴───────────────────┤
│                             [戻る]  [追加]                │
└──────────────────────────────────────────────────────────┘
```

**状態遷移**:

状態は `prevStation` の値から派生し、独立した状態変数としては管理しない。

| 状態 | 条件 | 説明 |
|------|------|------|
| `firstStation` | `prevStation === null` | 開始駅を選ぶ前。全路線を表示する |
| `continuing` | `prevStation !== null` | 2駅目以降を選択中。前駅の接続路線のみ表示する |

**遷移トリガー**:

| 操作 | 状態の遷移 | その他 |
|------|-----------|--------|
| 路線をクリック（任意の状態） | 変化なし | `selectedLineId` を更新（駅リストが切り替わる）。選択中路線をハイライト |
| 駅をクリック（`firstStation`） | → `continuing` | クリックした駅を `prevStation` に設定。`selectedLineId` をリセット |
| 駅をクリック（`continuing`） | 変化なし（`continuing` 維持） | 前駅→選択駅の区間を追加一覧に追加、選択駅を `prevStation` に更新。`selectedLineId` をリセット |
| 駅をクリック（`prevStation` と同一駅） | — | クリック不可・グレーアウト表示 |
| 「戻る」ボタン（`stagingList` が空のとき無効） | — | 末尾の区間を削除。残った区間がある場合は末尾区間の `nextIndex` の位置にある駅を `prevStation` に設定、ない場合は `prevStation` を `null` に戻す。`selectedLineId` もリセット |
| 「追加」ボタン | — | 追加一覧の全区間に含まれる駅を順番に `stationType` に変換して `onAdd` へ渡し、ポップアップを閉じる |

**「追加」ボタン押下時の駅抽出ロジック**:

追加一覧の各 `StationSection` から駅を以下の手順で展開し、`stationType[]` として `onAdd` に渡す。

1. 各区間 `{ lineId, prevIndex, nextIndex }` について、lineConnectDB から同一 `lineId` の行を上から順に抽出し、駅IDの順序リストを得る
2. 順序リスト中の `prevIndex` から `nextIndex` まで（両端含む）の駅IDを列挙する（`prevIndex > nextIndex` の場合は逆順）。駅IDではなく位置で指定するため、環状線のように同じ駅が2回現れる路線でも区間が一意に決まる
3. 区間をまたいで同じ駅IDが重複する場合は除去する（連続区間の接続駅が重複しないよう処理）
4. 列挙した駅IDで stationDB を引いて `toStationType` に変換する

**路線をまたぐ駅（乗り換えで路線が変わる接続駅）の扱い**

区間と区間で路線が変わる場合、その接続駅は「前の区間の最終駅」と「次の区間の開始駅」の両方に現れる。この駅は**1つの駅にまとめ**、2つのナンバリングを持たせる。

- `numIcon` ＝ **前の路線**のナンバリング（接続駅として最初に登録されたときの値をそのまま残す）
- `numIconNext` ＝ **次の路線**のナンバリング（`lineConnectDB` の次路線側の駅ナンバリングを、次路線の `color`・プリセットキーとあわせて設定する）
- `lineId` ＝ **次の路線**の解決済みキーで上書きする（`lineId` は「この駅以降の区間路線ID」のため）
- どちらの `colorMode` も `'manual'` とする（プリセット取り込みは値を確定させて書き込むため）

これにより、従来は同一駅が異なる `lineId` を持つ行として二重に登録されていた挙動を、2つのナンバリングを持つ1行に統合する。

**路線選択リストの表示範囲**:

| 状態 | 表示する路線 |
|------|-------------|
| `firstStation` | lineDB に存在する全路線 |
| `continuing` | lineConnectDB で `prevStation.station.id` が含まれる全路線 |

どちらの状態でも、選択中の路線（`selectedLineId`）はハイライト表示し、その他の路線は非表示にしない。

**ガイダンステキスト**（ポップアップ最上部に表示）:

| 条件 | 表示テキスト |
|------|------------|
| `prevStation === null && selectedLineId === null` | 開始駅の路線を選択してください |
| `prevStation === null && selectedLineId !== null` | 開始駅を選択してください |
| `prevStation !== null && selectedLineId === null` | 「{prevStation.name}」から続く路線を選択してください |
| `prevStation !== null && selectedLineId !== null` | 「{prevStation.name}」の次の駅を選択してください |

**追加一覧の表示**:

駅選択リストと同形式のリストとして、路線選択・駅選択の右に並べて表示する。各区間を `前駅名 → 次駅名（路線名）` の形式で1行ずつ表示する。クリックによる削除機能はない。

**`stationType` への変換**（CSVから取得できるフィールドのみ設定、その他は暫定デフォルト値）:

| stationType フィールド | 設定値 |
|------------------------|--------|
| `name` | 駅名（stationDB） |
| `kana` | 駅名かな（stationDB） |
| `eng` | 駅名英語（stationDB） |
| `numIcon.symbol` / `numIcon.number` | 駅ナンバリング（lineConnectDB）をスペースで分割 |
| `numIcon.color` / `numIcon.manualColor` | 路線カラー（lineDB から所属路線で引く） |
| `numIcon.presetKey` / `numIcon.manualPresetKey` | ナンバリングアイコン（lineDB から所属路線で引く。`numIconNext` も同様に次の路線から引く） |
| `lineId` | 下記「lineDict・iconDict への解決」で解決した `lineDict` のキー |
| `operationId` | `"0"` 固定（全駅に0番目の運用を設定する） |
| その他フィールド | 暫定デフォルト値 |

**挿入位置**: 未定（暫定: `stationList` 末尾）

**`lineDict`・`iconDict` への解決**:

各区間の路線（`PresetLine`）は、以下の手順で `lineDict`・`iconDict` のキーに解決する。同じプリセット路線が複数区間・複数駅にまたがって使われる場合（同一路線上を複数回クリックして区間を追加した場合や、別の「駅プリセットから追加」操作で同じ路線を再度使った場合）は、1つの `lineDict` エントリにまとめる（重複登録しない）。

1. **路線記号アイコン（`iconDict`）の解決**: `PresetLine` の `symbol`・`iconPresetKey`（路線アイコン列）が両方とも空でない場合、`{ presetType: iconPresetKey, symbol, color }` と**完全一致**するエントリを `setting.iconDict`（既存）→ 今回の呼び出し内で新規作成した分、の順に探す
   - 見つかった場合: そのキーを再利用する
   - 見つからない場合: `line_{路線ID}` をベースにした一意なキー（衝突時は `line_{路線ID}_2` のように連番を付与）で新規作成する
   - `iconPresetKey` が空の場合は作成しない（`lineIconKey` は空文字のまま）。`symbol` が空でも `iconPresetKey` があれば作成する（路線記号のない路線は `I_mono_color` で路線カラーの四角になる。7.32節）
2. **路線本体（`lineDict`）の解決**: `name`・`kana`・`eng`・`color`・`symbol`・`numIconPresetKey` が全て**完全一致**するエントリを `setting.lineDict`（既存）→ 今回の呼び出し内で新規作成した分、の順に探す
   - 見つかった場合: そのキーを再利用する
   - 見つからない場合: 既存キーの最大数値+1（数値キーが存在しない場合は `0`）を新しいキーとし、`lineIconKey` に手順1で解決したキーを設定して新規作成する
3. 区間内の各駅の `lineId` に、解決した `lineDict` のキーを設定する（区間内の全ての駅に同じキーを設定する。路線が変わる接続駅は前項「路線をまたぐ駅の扱い」に従って1行に統合し、`lineId` は次の路線のキーで上書きする）

新規作成された `lineDict`・`iconDict` のエントリは `onAdd` の戻り値（`newLines`・`newIcons`）として呼び出し元に渡され、呼び出し元（`StationList.handlePresetAdd`）が `setting.lineDict`・`setting.iconDict` にマージする。

#### 状態管理

| state | 型 | 説明 |
|-------|----|------|
| `lines` | `PresetLine[]` | 全路線リスト（lineDB.csv） |
| `allStations` | `PresetStation[]` | 全駅リスト（stationDB.csv） |
| `lineConnects` | `PresetLineConnect[]` | 全路線接続データ（lineConnectDB.csv） |
| `transfers` | `PresetTransfer[]` | 全乗換データ（transferDB.csv）。路線図の乗換エッジ描画にのみ使う |
| `selectedLineId` | `string \| null` | 路線選択リストで選択中の路線ID |
| `prevStation` | `PrevStationRef \| null` | 区間の開始駅（前駅）。`null` なら `firstStation` 状態、値があれば `continuing` 状態 |
| `stagingList` | `StationSection[]` | 追加一覧（区間オブジェクトの配列） |
| `loadError` | `string \| null` | CSV読み込みエラーメッセージ |

### 4.11 状態管理

`Editor.tsx` が `settingType` の React state（`useState`）を保有し、`setting` と `setSetting` を全子コンポーネントへ props で渡す。各コンポーネントは変更時に `structuredClone(setting)` でディープコピーを作成してから値を書き換え `setSetting` を呼ぶ。

```mermaid
sequenceDiagram
    participant User
    participant Component as 各コンポーネント
    participant Editor as Editor (state)
    participant Display as display.html

    User->>Component: フォーム入力
    Component->>Component: structuredClone(setting)
    Component->>Editor: setSetting(_setting)
    Editor-->>Component: 再レンダリング (setting)

    User->>Editor: 「表示」ボタン（sticky ツールバー）
    Editor->>localStorage: lcdStrage = JSON.stringify(setting)
    Editor->>Display: window.open('./display.html')
    Display->>localStorage: JSON.parse(lcdStrage)
    Display-->>User: LCD画面アニメーション
```

### 4.12 UI コンポーネント規約

#### トグルスイッチ (`ToggleSwitch`)

真偽値設定の入力UIは以下の3種類を使い分ける。

| 種別 | 実装 | 使用箇所 |
|------|------|----------|
| 駅通過判定（`isPass`） | クリックでトグルするテキスト表示（チェックボックスなし） | `StationList` 通過列（4.9節参照） |
| トグルスイッチ | `<ToggleSwitch>` コンポーネント | 設定値の ON/OFF |
| トグルボタン | `<button className="btn-toggle">` | モード切替・操作フラグ |

**トグルスイッチ** — `ToggleSwitch` コンポーネント (`app/components/ToggleSwitch.tsx`):

```typescript
type ToggleSwitchProps = {
    checked: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    id?: string
}
```

スタイル (`app/globals.css` の `.toggle-switch` / `.toggle-slider`):
- OFF 状態: `var(--border)` 色の pill 形状
- ON 状態: `var(--accent)` 色 + 白い円が右にスライド

適用箇所:

| コンポーネント | フィールド |
|---|---|
| `EditorHead` | `isLoop`、`isMoveByCoord` |
| `OperationForm` | `isDispTime`、`isDispLineName`、`isDrawStopText`、`isDrawLine` |

**トグルボタン** — `btn-toggle` / `btn-toggle--active` クラス (`app/globals.css`):
- 通常状態: 通常ボタンと同じ見た目
- アクティブ状態 (`.btn-toggle--active`): `var(--accent)` 背景色でハイライト

適用箇所:

| コンポーネント | 対象 |
|---|---|
| `OperationForm` | すべての運用に適用 |
| `StationList` | 複数選択、ナンバリング補完降順 |

---

## 5. モジュール構成

```mermaid
classDiagram

    class createIconFromPreset {
        <<client module>>
        +createIconFromPreset(presets, key, symbolText, numberText, lineColor, outlineWidth) SVGElement|null
    }

    class loadIconPresetTexts {
        <<module>>
        +loadIconPresetTexts() Record~string, string~
    }

    class presetIndex {
        <<module>>
        +iconIndexes presetIndexType[]
        +numberIndexes presetIndexType[]
    }

    class KanaConverter {
        <<module>>
        +kanaToAlphabet(kana, mode) string
    }

    class presetIconMaker {
        <<module>>
        +presetIconMaker(svgDoc, color, symbol) Document
    }

    class generateIconPresetTexts {
        <<build script>>
        +assets/iconPresets/*.svg を読み込み（I_* および N_* 両対応）
        +src/generated/iconPresetTexts.ts を生成
    }

    class listOperations {
        <<module>>
        +moveArrayItemsUp(arr, selectedIndexes) newArr, newSelected
        +moveArrayItemsDown(arr, selectedIndexes) newArr, newSelected
        +moveDictItemsUp(dict, orderedKeys, selectedKeys) newDict, swapped, newSelected
        +moveDictItemsDown(dict, orderedKeys, selectedKeys) newDict, swapped, newSelected
    }

    StationList ..> listOperations : 配列上下移動
    LineList ..> listOperations : 辞書上下移動
    IconList ..> listOperations : 辞書上下移動
    StationList ..> createIconFromPreset : 乗換アイコン生成
    LineList ..> createIconFromPreset : 路線アイコン生成
    IconList ..> createIconFromPreset : アイコンプレビュー
    StationParamSetter ..> KanaConverter : かな→ローマ字自動変換
    LineList ..> KanaConverter : かな→ローマ字自動変換
    createIconFromPreset ..> loadIconPresetTexts : SVGプリセット取得
    loadIconPresetTexts ..> generateIconPresetTexts : 生成済みtsを参照
    IconList ..> presetIndex : プリセット一覧取得
    OperationForm ..> presetIndex : ナンバリング一覧取得
    StationParamSetter ..> presetIndex : ナンバリング一覧取得
```

| モジュール | 説明 |
|---|---|
| `createIconFromPreset.client.ts` | SVGプリセットにシンボル文字・路線色を合成してSVG要素を返す（ブラウザ専用） |
| `loadIconPresetTexts.ts` | `src/generated/iconPresetTexts.ts` から全SVGプリセット（I_* / N_*）を辞書形式で返す |
| `presetIndex.ts` | アイコン・ナンバリングプリセットの key/name リスト定義 |
| `KanaConverter.tsx` | ひらがな/カタカナ → ローマ字変換（駅名・路線名の英語自動補完） |
| `presetIconMaker.tsx` | SVG DOM にカラー・シンボルを適用するユーティリティ |
| `listOperations.ts` | リスト並び替え共通ユーティリティ（配列系・辞書系それぞれの上下移動関数） |
| `generateIconPresetTexts.js` | ビルド用スクリプト。`assets/iconPresets/*.svg`（I_* / N_* 両対応）を読み込み TypeScript ファイルを生成 |

---

## 6. アイコンプリセット

### プリセット種別一覧

| キー | 名称 | 用途 |
|---|---|---|
| `I_tokyu` | 東急 | 路線アイコン |
| `I_JR_east` | JR東日本 | 路線アイコン |
| `I_tokyo_subway` | 東京地下鉄 | 路線アイコン |
| `I_JR_west` | JR西日本 | 路線アイコン |
| `I_mono_color` | 単色 | 路線アイコン |
| `I_train_normal1` | 地上路線汎用１ | 路線アイコン |
| `I_train_normal2` | 地上路線汎用２ | 路線アイコン |
| `I_train_subway1` | 地下路線汎用 | 路線アイコン |
| `N_tokyu` | 東急 | ナンバリング |
| `N_JR_east` | JR東日本 | ナンバリング |
| `N_tokyo_subway` | 東京地下鉄 | ナンバリング |
| `N_JR_west` | JR西日本 | ナンバリング |
| `N_JR_central` | JR東海 | ナンバリング |

### SVG プリセットの構造

SVGファイル内の予約済みID要素に対して `createIconFromPreset` が値を注入する。

| ID | 役割 |
|---|---|
| `lineColor` | `fill` 属性を引数 `lineColor` で上書き |
| `symbolArea` | 路線記号テキスト描画領域。`<rect>` の `data-style`（JSON）・`x`/`y`/`width`/`height`・`lang` 属性をもとに SVG `<text>` を生成して配置する |
| `numberArea` | ナンバリングテキスト描画領域。`symbolArea` と同じロジックで描画 |
| `outline` | アウトライン要素（`outlineWidth > 0` の時のみ追加） |

---

## 7. 表示出力仕様

lcdDisplay システムの詳細仕様は `public/lcdDisplay/doc/` を参照。

### 7.2 オブジェクトツリーシステム

全 lcdParts 要素をオブジェクト化してツリー構造で保持する描画パイプライン。可視/不可視アニメーションおよびパイプライン整理を目的とする。

#### 新規 lcdParts 値

| 値 | 対象 | 説明 |
|---|---|---|
| `group` | `<g>` 要素 | 子要素をツリーに保持するコンテナ。位置調整なし。 |

#### クラス設計

| クラス | 対象 | 親クラス | 主フィールド |
|---|---|---|---|
| `LcdPartsObj` | 基底 | なし | `visible`, `noFilter`, `colorOverride`, 各種レイアウト属性 |
| `GObj` | `<g>` 系コンテナ共通 | `LcdPartsObj` | `_filter`、filter 分割ヘルパー |
| `GroupObj` | トップ `<svg>` / `lcdParts="group"` | `GObj` | `children[]`, `transform` |
| `ArrangeObj` | `lcdParts="arrange"` | `GObj` | 配置ロジック |
| `SlotObj` | `lcdParts="slot"` | `GObj` | スロット配置ロジック |
| `StaticObj` | `lcdParts="static"` | `LcdPartsObj` | `_node`（クローンSVG要素） |
| `TextBoxObj` | `lcdParts="textBox"` | `LcdPartsObj` | テキスト描画 |
| `TextBlockObj` | `lcdParts="text"` | `LcdPartsObj` | 改行対応テキスト描画 |

**`GObj`（新規）**

`<g>` に対応するコンテナクラスの共通基底。`GroupObj` / `ArrangeObj` / `SlotObj` が継承する。

- `_filter` — SVG の `filter` 属性値を保持
- `_createFilteredG()` — `_filter` がある場合にフィルター用サブ `<g>` を生成して返す（ない場合は `null`）
- `_finalizeFilterSplit(container, filteredG)` — 子要素の描画後、`filteredG` に要素があれば `container` の先頭に挿入する（フィルター対象が非フィルター対象の下に描画されるよう順序を保証）

各クラスの `getElement()` は以下のパターンで `GObj` のヘルパーを使用する:
```javascript
const filteredG = this._createFilteredG();
// ... 子要素ループ内:
if (filteredG && !child.noFilter) filteredG.appendChild(el);
else                               container.appendChild(el);
// ループ後:
this._finalizeFilterSplit(container, filteredG);
```

**`GroupObj`**
- `GObj` を継承（従来は独立クラス）
- `LcdPartsObj` が重複して持っていたフィールド（`visible`, `fitX/Y`, `margin` 等）を削除し、`super()` で初期化
- `getElement()` でフィルター分割を使用

**`StaticObj`**
- `LcdPartsObj` を継承（従来は独立クラス）
- `LcdPartsObj` が重複して持っていたフィールド（`visible`, `_animType`, `fitX/Y`, `_domEl` 等）とメソッド（`_evalVisible()`, `setCoordinate()`, `getRealSize()`, `setSize()`）を削除し、`super()` で初期化
- `langChange()` は `_applyVisibleAnim()` を呼び出すよう簡略化
- コンストラクタシグネチャ `(svgDom, drawParams, colorOverride, args)` は変更しない（呼び出し側との互換性維持）

#### `colorOverride` フィールドとツリー伝播

全ノードクラス（`LcdPartsObj` を継承するすべてのクラス）が `colorOverride` フィールドを持つ。

**コンストラクタシグネチャへの追加:**

| クラス | 追加引数 |
|---|---|
| `LcdPartsObj` | 第4引数 `colorOverride = null` |
| `GObj` | 第4引数 `colorOverride = null`（`super()` に渡す） |
| `GroupObj` | 第2引数 `colorOverride = null`（`super(svgDom, null, null, colorOverride)` に渡す） |
| `ArrangeObj` | 第3引数 `colorOverride = null`（`super(svgDom, drawParams, args, colorOverride)` に渡す） |
| `SlotObj` | 第3引数 `colorOverride = null`（同上） |
| `StaticObj` | コンストラクタの第3引数 `colorOverride` を `super(svgDom, drawParams, args, colorOverride)` に渡す |

**ツリー伝播ルール（`_createChildObj` 内）:**

1. 呼び出し側から渡された `colorOverride`（配列展開の個別色）が最優先
2. null の場合は `this.colorOverride`（このコンテナ自身が継承した色）をフォールバックとする
3. これを `effectiveColor` として全子タイプ（arrange / slot / group / static）のコンストラクタに渡す

```javascript
const effectiveColor = colorOverride ?? this.colorOverride;
// static: new StaticObj(svgDom, drawParams, effectiveColor, args)
// group:  new GroupObj(svgDom, effectiveColor)（group自身のlcd-colorが優先）
// arrange: new ArrangeObj(svgDom, childCtx, effectiveColor)
// slot:   new SlotObj(svgDom, childCtx, effectiveColor)
```

**`_buildContainerChildren` への追加引数:**

`parentColorOverride = null` を末尾に追加し、ループ内の `_createChildObj` 呼び出しに渡す。  
グループ子要素のビルド時は、DOM カラーリング（`_applyColorToDOM`）後にそのグループの実効色（`domColor`）を `parentColorOverride` として渡すことで、グループの色が孫要素にも正しく伝播する。

#### `lcd-noFilter` 属性

| 属性 | 対象 | 値 | 説明 |
|---|---|---|---|
| `lcd-noFilter` | 任意の lcdParts 子要素 | `"true"` | 最も近い祖先の `filter` 付きコンテナの影響外に配置する |
| `noFilterZ` | `lcd-noFilter="true"` の要素 | `"up"`（デフォルト）/ `"down"` | フィルター外配置時の z-order。`"up"` = filteredG より上（手前）、`"down"` = filteredG より下（背後） |

`lcd-noFilter="true"` が付いた子要素は、祖先コンテナのどこかに `filter` が存在する場合でも、そのフィルターの影響外に配置される。位置は **`noFilterSink` パターン**（後述）によって座標が保証される。  
`noFilterZ="down"` を指定すると、フィルター付きグループ（filteredG）より **前（DOM上で先）** に挿入されるため、filteredG の内容が手前に重なる。

##### `noFilterSink` パターン（任意の深さの noFilter 対応）

直接の親だけでなく、任意の深さの祖先コンテナの `filter` を回避するための仕組み。

**動作原理:**

1. **`filter` を持つ `GObj` 系コンテナ（ArrangeObj / SlotObj）の `getElement()` が `noFilterSink = []` を生成**し、`ctx` に追加して子へ渡す。
2. **中間コンテナ（GroupObj）は `ctx.noFilterSink` を受け取り、自身の SVG transform でラップしたプロキシ sink を生成して子へ渡す。**  
   プロキシの `push(el)` は `<g transform="...">el</g>` にラップしてから親 sink に転送するため、座標が各段の transform を引き継いだ状態で保持される。
3. **`noFilter=true` の要素は `getElement()` の戻り値を親コンテナに渡す代わりに `ctx.noFilterSink.push(el)` を呼ぶ。**
4. **フィルター付きコンテナが描画後に `sink` の中身を `outer <g>` に追加する** → フィルター外・正しい座標に配置される。

**SVG 出力イメージ:**

```
ArrangeObj(filter="outline")  →  outer <g>
  ├─ <g transform="A">              ← 中間 GroupObj の transform ラッパー（noFilter要素用）
  │    └─ <TextBoxObj/>             ← noFilter=true（フィルター外・正しい座標）
  └─ filteredG <g filter="outline">
       └─ <g transform="A">        ← GroupObj の通常描画
            └─ 他の shapes...       ← フィルター適用
```

**`ctx` の追加フィールド:**

```javascript
ctx = {
    resolveValue,   // 既存
    exprParser,     // 既存
    noFilterSink,   // undefined | Array<{el, noFilterZ}> — undefined=フィルター祖先なし、Array=浮き上がり先
}
```

noFilterSink の各エントリは `{ el, noFilterZ }` オブジェクトで、`el` が配置する SVG 要素、`noFilterZ` が `"up"` または `"down"` を示す。

**`GObj` に集約する4つのヘルパー:**

```javascript
// filter持ちコンテナ用: this._filterがある場合のみnoFilterSink付きのchildCtxを生成する
// 戻り値: { childCtx, sink } — sinkはnullならfilterなし(変更不要)
_openSink(ctx) {
    if (!this._filter) return { childCtx: ctx, sink: null };
    const sink = [];
    return { childCtx: { ...(ctx || {}), noFilterSink: sink }, sink };
}

// _openSinkで生成したsinkの要素をgに追加する（フィルター外配置）
// noFilterZ="down" のエントリは filteredG の前に挿入し、"up" は g の末尾に追加する
_closeSink(sink, g, filteredG) {
    if (!sink) return;
    for (const { el, noFilterZ } of sink) {
        if (noFilterZ === 'down' && filteredG && filteredG.parentNode === g) {
            g.insertBefore(el, filteredG);
        } else {
            g.appendChild(el);
        }
    }
}

// 中間コンテナ（GroupObj）用: ctx.noFilterSinkを受け取り、transformWrappedなプロキシsinkを生成する
// transformStrがない、またはctx.noFilterSinkがない場合はそのまま返す
// 戻り値: { childCtx, flushProxy } — flushProxy()でproxySinkの内容を親sinkへ転送する
// noFilterZごとにグループ化してラップし、親sinkに {el: wrapperG, noFilterZ} として転送する
_proxyChildSink(ctx, transformStr) {
    if (!ctx || !ctx.noFilterSink) return { childCtx: ctx, flushProxy: null };
    if (!transformStr) return { childCtx: ctx, flushProxy: null };
    const parentSink = ctx.noFilterSink;
    const proxySink = [];
    const flushProxy = () => {
        if (!proxySink.length) return;
        // noFilterZ値ごとにグループ化し、それぞれtransformラッパーを生成して親sinkへ転送する
        const groups = {};
        for (const { el, noFilterZ } of proxySink) {
            if (!groups[noFilterZ]) groups[noFilterZ] = [];
            groups[noFilterZ].push(el);
        }
        for (const [noFilterZ, els] of Object.entries(groups)) {
            const w = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            w.setAttribute('transform', transformStr);
            for (const el of els) w.appendChild(el);
            parentSink.push({ el: w, noFilterZ });
        }
    };
    return { childCtx: { ...ctx, noFilterSink: proxySink }, flushProxy };
}

// 子要素の配置先を振り分ける（全GObj系getElement()の子ループ内で使用）
// noFilter=true かつ noFilterSink あり → sink に {el, noFilterZ} をpush（フィルター外へ浮き上がり）
// noFilter=false かつ filteredG あり    → filteredG に追加（フィルター適用）
// それ以外                             → container に追加
_placeChild(el, child, filteredG, container, childCtx) {
    if (child.noFilter && childCtx && childCtx.noFilterSink) {
        childCtx.noFilterSink.push({ el, noFilterZ: child.noFilterZ || 'up' });
    } else if (filteredG && !child.noFilter) {
        filteredG.appendChild(el);
    } else {
        container.appendChild(el);
    }
}
```

**各クラスの `getElement()` での呼び出しパターン:**

`ArrangeObj` / `SlotObj`（filter 保持コンテナ）:
```javascript
const { childCtx, sink } = this._openSink(ctx);
const filteredG = this._createFilteredG();
for (const child of ...) {
    const el = child.getElement(childCtx);
    if (!el) continue;
    this._placeChild(el, child, filteredG, outer, childCtx);
}
this._finalizeFilterSplit(outer, filteredG);
this._closeSink(sink, outer, filteredG);
```

`GroupObj`（中間コンテナ / transform 持ち）:
```javascript
const transformStr = this._hasGroupArea ? `translate(...)scale(...)` : null;
const { childCtx, flushProxy } = this._proxyChildSink(ctx, transformStr);
const filteredG = this._createFilteredG();
for (const child of this.children) {
    const el = child.getElement(childCtx);
    if (!el) continue;
    this._placeChild(el, child, filteredG, g, childCtx);
}
this._finalizeFilterSplit(g, filteredG);
if (flushProxy) flushProxy();
```

#### ファイル変更一覧（GObj 追加・colorOverride 伝播・StaticObj 継承・noFilterSink）

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/GObj.js` | 新規作成 | `GObj` クラス（`LcdPartsObj` 継承）、`_createFilteredG`・`_finalizeFilterSplit`・`_openSink`・`_closeSink`・`_proxyChildSink`・`_placeChild` |
| `public/lcdDisplay/LcdPartsObj.js` | 変更 | `noFilter` / `colorOverride` / `noFilterZ` プロパティ追加、`svgDom=null` ガード追加 |
| `public/lcdDisplay/GroupObj.js` | 変更 | `GObj` 継承、重複フィールド削除、`_proxyChildSink` / `_placeChild` を使用 |
| `public/lcdDisplay/ArrangeObj.js` | 変更 | `GObj` 継承、`_openSink` / `_closeSink` / `_placeChild` を使用、`colorOverride` 伝播 |
| `public/lcdDisplay/SlotObj.js` | 変更 | 同上 |
| `public/lcdDisplay/StaticObj.js` | 変更 | `LcdPartsObj` 継承へ変更、重複フィールド・メソッド削除、自身の `lcd-color` を `colorOverride` より優先する判定順に変更 |
| `public/lcdDisplay/index.html` | 変更 | `GObj.js` の `<script>` タグ追加（`LcdPartsObj.js` の直後）|

#### `visible` フィールド仕様

全クラスに `visible: string|null` フィールドを追加する（SVG 属性の生の値を保持）。

| 値 | 挙動 |
|---|---|
| `null` | 常に表示 |
| 文字列 | `ExprParser.eval(visible, resolveValue)` で評価 |

- `ctx = { resolveValue, exprParser }` を `getElement(ctx)` の引数として渡す
- arrange 子要素の `visible` は従来通り `ArrangeObj._createChildObj()` で構築時に評価する（arrange 子のアニメーション対応は将来課題）

#### `isDraw` 属性仕様

`isDraw` は **構築時に静的評価** され、false の場合はオブジェクトをツリーに追加しない（`null` を返す）。`visible` との違い:

| 属性 | false 時の挙動 | langChange 対応 | レイアウト参加 |
|---|---|---|---|
| `visible` | visibility:hidden で非表示（DOM に残る） | あり | する |
| `isDraw` | ツリーに追加しない（オブジェクト自体を生成しない） | なし（静的） | しない |

- SVG 属性名・オブジェクトフィールド名ともに `isDraw`
- 値の構文・評価方法は `visible` と同一（`ExprParser.eval(isDraw, resolveValue)`）
- 評価は `ArrangeObj._createChildObj()` および `Drawer._buildNode()` の **オブジェクト生成直前** に行い、false なら `null` を返してスキップする
- `resolveValue` の構築には `LcdPartsObj.makeResolveValue(drawParams, args)` を使用（args も参照可能）
- `isDraw` は各クラスのフィールドとしては保持しない（評価結果のみ使用）

> **効率化オプション（将来対応）**: 現状は生文字列を保持して描画ごとに `ExprParser.eval` でパース・評価する。高頻度な再評価が必要な場合は `ExprParser.compile(expr)` で AST を生成・保持し、文字列パースを構築時 1 回に限定できる。

#### トラバーサル規則（`Drawer.buildTree()`）

| 要素条件 | 生成オブジェクト |
|---|---|
| トップ `<svg>` | `GroupObj`（ルート） |
| `lcdParts="group"` | `GroupObj`（子要素を再帰的に処理） |
| `lcdParts="static"` | `StaticObj` |
| `lcdParts="textBox"` | `TextBoxObj`（drawParams・args={} で構築） |
| `lcdParts="text"` | `TextBlockObj`（drawParams・args={} で構築） |
| `lcdParts="arrange"` | `ArrangeObj`（`setSize()` まで完了） |
| `lcdParts` なし | **スキップ（子孫ごと無視）** |

#### `Drawer` 更新

```
buildTree()   →  templateSVG を走査しルート GroupObj を構築（this.root に格納）
_buildNode()  →  要素 1 つをオブジェクト化する再帰関数（_traverse / _createText を置換）
draw()        →  defs注入 → buildTree() → root.getElement(ctx) でSVG出力
```

---

### 7.3 テキスト遷移アニメーション

#### 概要

`Drawer.langChange(transTime, gapTime)` の呼び出しで、ツリー上の全オブジェクトが自身の `visible` を再評価し、前回との差分に応じて CSS アニメーションを適用する。`draw()` 実行後に呼ぶことを前提とし、`draw()` 内での再ビルドは行わない。

drawParams の更新 → `langChange()` の呼び出し、という順序を使用側が守ること。

#### アニメーション種別

| 種別 | `lcd-animType` 値 | 消失動作 | 発生動作 |
|---|---|---|---|
| くるくる | `"kuru"` | kuruBottom基準でscaleY 1→0、opacity 1→0、transTime[ms] | kuruTop基準でscaleY 0→1、opacity 0→1、gapTime後にtransTime[ms] |
| フェード | `"fade"` | opacity 1→0、transTime[ms] | opacity 0→1、gapTime後にtransTime[ms] |
| なし | `"nothing"`（省略時デフォルト） | gapTime後に瞬間消滅 | gapTime後に瞬間出現 |

タイムテーブル（消失・発生とも同じ基準時刻から開始）:

```
t=0               t=gapTime           t=gapTime+transTime
|                 |                   |
|--- 消失: transTime かけてアニメーション ----→|
|--- gapTime無表示 ---|--- 発生: transTime ---→|
```

「アニメーションなし」では transTime は使わず、t=gapTime で両者が瞬間切替する。

#### SVGテンプレート属性

| 属性 | 説明 | デフォルト |
|---|---|---|
| `lcd-animType` | `"kuru"` / `"fade"` / `"nothing"` | `"nothing"` |
| `lcd-kuruTop` | くるくる発生のtransform-origin Y座標（SVG座標） | オブジェクトの `y` 値 |
| `lcd-kuruBottom` | くるくる消失のtransform-origin Y座標（SVG座標） | オブジェクトの `y + height` 値 |

#### LcdAnimator クラス（新規）

**ファイル**: `public/jsMojules/utilClass/Animator.js`（既存クラスとは別の新規クラスとして同ファイルに追記）

```
LcdAnimator
├── constructor()
│     — CSS @keyframes（lcd-kuru-in/out, lcd-fade-in/out）を document.head に1回注入
├── applyAppear(element, animType, transTime, gapTime, kuruTop, kuruBottom)
│     1. 進行中のアニメーション・タイマーをキャンセル
│     2. visibility: visible に設定
│     3. 種別に応じた初期状態を設定（kuru: scaleY=0+opacity=0、fade: opacity=0）
│     4. gapTime[ms] 後に CSS animation を適用（nothing はsetTimeoutで visibility 設定のみ）
│     5. animationend でスタイルをクリア（完全表示状態に戻す）
└── applyDisappear(element, animType, transTime, gapTime, kuruTop, kuruBottom)
      1. 進行中のアニメーション・タイマーをキャンセル
      2. CSS animation を即座に適用（nothing は setTimeout で gapTime 後に visibility: hidden）
      3. animationend で visibility: hidden を設定しスタイルをクリア
```

@keyframes は以下4つを定義する:
- `lcd-kuru-in`: `scaleY(0)+opacity:0` → `scaleY(1)+opacity:1`
- `lcd-kuru-out`: `scaleY(1)+opacity:1` → `scaleY(0)+opacity:0`
- `lcd-fade-in`: `opacity:0` → `opacity:1`
- `lcd-fade-out`: `opacity:1` → `opacity:0`

`transform-origin` は CSS animation の前に element.style で直接設定する。

**グローバルインスタンス**: `window.lcdAnimator = new LcdAnimator()` を `index.html` で初期化し、各オブジェクトから参照する。

#### 各オブジェクトへの共通変更（フィールド追加）

全クラス（GroupObj・StaticObj・TextBoxObj・ArrangeObj）に以下を追加する:

| フィールド | 型 | 設定タイミング |
|---|---|---|
| `_domEl` | Element\|null | `getElement()` で生成した要素の参照 |
| `_prevVisible` | boolean | `getElement()` または `_createChildObj()` での初回visible評価結果 |
| `_resolveValue` | Function | visible再評価用（live参照） |
| `_exprParser` | ExprParser | visible再評価用 |
| `_animType` | string | コンストラクタで `lcd-animType` 属性から読み取り |
| `_kuruTop` | number\|null | コンストラクタで `lcd-kuruTop` 属性から読み取り（null=デフォルト） |
| `_kuruBottom` | number\|null | コンストラクタで `lcd-kuruBottom` 属性から読み取り（null=デフォルト） |

`_animType` / `_kuruTop` / `_kuruBottom` は `LcdPartsObj` コンストラクタで読み取り、TextBoxObj・ArrangeObj が継承する。GroupObj・StaticObj はそれぞれのコンストラクタで読み取る。

#### `getElement(ctx)` の変更

全クラス共通:

1. ctx が渡された場合: `this._resolveValue = ctx.resolveValue`、`this._exprParser = ctx.exprParser` を保存
2. `this.visible` を評価（`_resolveValue` が既に設定されていれば ctx=null でも評価可能）
3. 評価結果を `this._prevVisible` に保存
4. DOM要素を生成し `this._domEl` に保存
5. `_prevVisible === false` なら `this._domEl.style.visibility = 'hidden'` を設定
6. **null を返さず** 常にDOM要素を返す

ArrangeObj の `getElement()`:
- 全 children（visible=false 含む）の `getElement()` を呼び出してDOM追加
- 自身の visible 評価は ctx が渡された場合のみ（内部子要素は `_resolveValue` 保持済みのため ctx 不要）

#### ArrangeObj の `_createChildObj()` 変更

- **visible フィルタを削除** — visible=false でも子オブジェクトを常に生成する
- 生成した子に `_resolveValue = LcdPartsObj.makeResolveValue(drawParams, args)` を設定（`drawParams` はDrawerの参照のため変更が自動反映）
- 生成した子に `_exprParser = exprParser` を設定
- 初回visible評価結果を `child._prevVisible` に設定

#### ArrangeObj — `_buildContainerChildren` による arrange/group 共通の子ビルド

arrange と group はどちらも「直接子を走査して子オブジェクトを生成する」ループを持つ。このロジックを共通メソッド `_buildContainerChildren` に抽出し、両者から呼び出す。

```
_buildContainerChildren(svgDom, drawParams, args, skipLcdParts, parentArgMap = {})
  → 子オブジェクトの配列を返す
```

| 引数 | 説明 |
|---|---|
| `svgDom` | 走査対象のコンテナDOM要素 |
| `drawParams` | 描画パラメータ |
| `args` | 親から引き継いだ引数マップ |
| `skipLcdParts` | スキップするlcdParts値（`'arrangeArea'` or `'groupArea'`）|
| `parentArgMap` | このコンテナが `lcd-arg` 属性で宣言した配列マップ（arrange 用、group は `{}`）|

処理内容:
1. `lcdParts === skipLcdParts` の子はスキップ
2. `lcdParts="group"` の子に lcd-color 配列 + groupArea がある場合: 配列要素ごとに `colorOverride` 付きで `_createChildObj` を呼んで展開
3. `lcd-arg="argName:drawParamsVarName"` の子: `argName` が参照時の名前、`drawParamsVarName` が drawParams / parentArgMap 上の変数名。`parentArgMap[drawParamsVarName]` → `LcdPartsObj.resolveDrawParam(drawParamsVarName, drawParams)` の順で解決し、配列なら要素数分コピー。コロンを含まない値は無効として無視する。
4. それ以外: `_createChildObj` を1回呼んで単一オブジェクトを生成

#### `arrangeDirection` 属性

| 属性 | 対象 | 値 | デフォルト | 説明 |
|---|---|---|---|---|
| `arrangeDirection` | `lcdParts="arrange"` | `0` / `1` | `0` | `getElement()` での子要素の配置順。`0` = SVG 記述順（先頭から）、`1` = 逆順（末尾から） |

`arrangeDirection=1` のとき、`getElement()` 内の子要素ループで `[...this.children].reverse()` した順序で配置する。サイズ計算（`setSize()`）は従来どおり SVG 記述順で行うため、各子要素の `getRealSize()` は正しく返る。軸方向の積算（`axisCursor`）は変わらず先頭から開始し、逆順に並んだ子要素を順に配置していく。

変更ファイル: `public/lcdDisplay/GObj.js`（`arrangeDirection` フィールド追加）、`public/lcdDisplay/ArrangeObj.js`（`getElement()` に逆順処理追加）

**lcd-arg の設定側と参照側の書き分け:**

| 用途 | 属性 / 書き方 | 例 |
|---|---|---|
| コピー展開の設定（drawParams参照） | `lcd-arg="argName:varName"` | `lcd-arg="station:dispStationList"` |
| コピー展開の設定（args参照） | `lcd-arg="argName:$parentArg.field"` | `lcd-arg="transferText:$dispStation.transfersText"` |
| lcdText での drawParams 参照 | `#{varName}` | `#{destination}` |
| lcdText での args 参照 | `#{$argName.field}` | `#{$station.name}` |
| visible での args 参照 | `$argName.field` | `$station.isPass == false` |

`argName` と右辺はコロンで必ず区切る。省略形はない。右辺が `$` で始まる場合は `args` を `resolveArgToken` で解決し、それ以外は `drawParams` を `resolveDrawParam` で解決する。

**`argOrder` — 配列展開順の制御:**

`lcd-arg` と同じ要素に `argOrder` 属性を付与することで、配列展開の順序を制御できる。

| 値 | 動作 |
|---|---|
| `"0"`（デフォルト） | 配列の先頭から順に展開（従来通り） |
| `"1"` | 配列を逆順に展開（末尾から先頭へ） |

arrange・slot の `_buildContainerChildren` および slot の `_buildSlotChildren` における lcd-arg 展開ループに適用される。配列の取得自体は変わらず、`forEach` の前に `argOrder="1"` の場合のみ `[...argArray].reverse()` した配列を使う。

`lcdText` のテンプレート展開（`resolveTemplate`）は `#{...}` 構文のみを使用する。`$` で始まる場合は args 参照、それ以外は drawParams 参照として解決する。`visible` 式は `exprParser` 経由のため引き続き `$argName.field` のまま。

**ArrangeObj コンストラクタ**: inline だった子ビルドループを `this._buildContainerChildren(svgDom, drawParams, args, 'arrangeArea', this.arg)` に置き換え。

**`_createChildObj` の group ケース**: group の子ビルドループを `this._buildContainerChildren(domForChildren, drawParams, args, 'groupArea', {})` に置き換え。

#### GroupObj.getElement — `!== undefined` ガード追加

ArrangeObj は子の `getElement` へ `{ debug }` のみの ctx を渡す。GroupObj.getElement で `ctx.resolveValue` / `ctx.exprParser` を無条件に上書きすると、`_createChildObj` で設定した args 込みの `_resolveValue` が `undefined` に書き換わり、GroupObj 自身の `visible` 評価が壊れる。

StaticObj と同様に `!== undefined` ガードを追加する:
```javascript
if (ctx.resolveValue !== undefined) this._resolveValue = ctx.resolveValue;
if (ctx.exprParser   !== undefined) this._exprParser   = ctx.exprParser;
```

#### ArrangeObj のレイアウト変更

- **visible の値はレイアウトに影響しない** — visible=false の子も全サイズでレイアウト計算に参加する
- `_childNaturalSizes` は全子要素（visible=false 含む）の getRealSize() から計算する

#### `langChange()` の実装

**Drawer**:
```javascript
langChange(transTime, gapTime) {
    this.root.langChange(transTime, gapTime);
}
```

**各オブジェクト** に `langChange(transTime, gapTime)` メソッドを追加:
```
1. this.visible が null → visible変化なし → 子要素への伝播のみ実施
2. newVisible = this._exprParser.eval(this.visible, this._resolveValue)
3. newVisible !== this._prevVisible の場合:
   - false→true: lcdAnimator.applyAppear(this._domEl, type, transTime, gapTime, top, bottom)
   - true→false: lcdAnimator.applyDisappear(this._domEl, type, transTime, gapTime, top, bottom)
4. this._prevVisible = newVisible
5. 子要素の langChange(transTime, gapTime) を呼び出し（GroupObj: this.children, ArrangeObj: this.children）
```

kuruTop/kuruBottom のデフォルト値:
- `_kuruTop === null` → `this.y`
- `_kuruBottom === null` → `this.y + this.height`
- GroupObj・StaticObj で y/height が未定義の場合は `0` をフォールバック

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/jsMojules/utilClass/Animator.js` | 追記 | `LcdAnimator` クラスを追加 |
| `public/lcdDisplay/LcdPartsObj.js` | 変更 | `_animType`/`_kuruTop`/`_kuruBottom` フィールド追加 |
| `public/lcdDisplay/StaticObj.js` | 変更 | 上記フィールド＋`_domEl`/`_prevVisible`/`_resolveValue`/`_exprParser`、`getElement()` 変更、`langChange()` 追加 |
| `public/lcdDisplay/GroupObj.js` | 変更 | 同上 |
| `public/lcdDisplay/TextBoxObj.js` | 変更 | `_domEl`/`_prevVisible` 追加、`getElement()` 変更、`langChange()` 追加 |
| `public/lcdDisplay/ArrangeObj.js` | 変更 | `_createChildObj()` visible フィルタ削除、レイアウト全参加、`getElement()` 変更、`langChange()` 追加 |
| `public/lcdDisplay/Drawer.js` | 変更 | `langChange()` メソッド追加 |
| `public/lcdDisplay/index.html` | 変更 | `LcdAnimator` インスタンス初期化（`window.lcdAnimator`）、スクリプトタグ追加 |

---

### 7.1 TextDrawer — fontWeight の正規化

`textBox` の `data-style` に Canvas API で無効な値（`"regular"` 等）が `fontWeight` として指定された場合、`getTextWidth()` 内で Canvas に渡す前に `"normal"` に正規化する。これにより `textAnchor: "middle"` / `"end"` 時のテキスト幅計算が正しく行われ、位置ズレを防ぐ。

| ドキュメント | 内容 |
|---|---|
| `doc/overview.md` | システム概要・入出力・内部アーキテクチャ |
| `doc/lcdParts.md` | lcdParts / visible / lcdText 属性仕様 |
| `doc/debug.md` | デバッグDrawerのファイル構成・クラスAPI |

---

### 7.2 TextDrawer — iOS Safari `measureCapHeightRatio` 修正と viewport meta 追加

**問題**: iOS Safari では、`sans-serif` などのシステムフォント generic 名で `ctx.font` を設定すると `ctx.textBaseline` が `'alphabetic'`（デフォルト）にリセットされる場合がある。現在のコードは `ctx.textBaseline = 'top'` を先に設定しているため、font 設定後にリセットされると cap 高さの測定が誤った値になる。

**影響**: `measureCapHeightRatio` が実際の cap height より小さい値を返す → `getFontSize` が過大なフォントサイズを算出 → `sans-serif` 指定のテキストが枠より大きく表示される（`BIZ UDGothic` 等の named font は非影響）

**修正1: `TextDrawer.js` `measureCapHeightRatio`**  
`ctx.textBaseline = 'top'` を `ctx.font` 設定の**後**に移動する（iOS がフォント設定時に baseline をリセットしても上書きできるようにする）。これにより開始位置のずれが解消される。

**修正2: `lcdDisplay/index.html` — `lang="ja"` 削除（サイズずれの根本原因）**  
iOS では CSS の generic フォントファミリー（`sans-serif`）の解決がドキュメントの `lang` 属性に依存する。  
- デバッグ環境: `<html lang="ja">` → `sans-serif` = 日本語系フォント（Hiragino Sans 等）  
- 本番環境: `<html>` (lang なし) → `sans-serif` = Latin 系フォント（SF Pro 等）  
- Canvas の `measureCapHeightRatio`: lang コンテキストなし → Latin 系フォントで測定  

デバッグ環境では SVG が Hiragino Sans で描画するが測定は SF Pro のキャップハイト比で行うため、フォントサイズがずれる。  
`<html lang="ja">` を `<html>` に変更し、本番と同じフォント解決にする。

**修正3: `lcdDisplay/index.html`**  
本番環境（`display.html`）に合わせ viewport meta を追加する。これにより iOS の仮想ビューポート（980px）によるスケール差異を排除する。

**修正4: `TextDrawer.js` `getTextWidth` — generic フォントファミリーのクォート除去**  
`getTextWidth` は Canvas のフォント文字列を `'${styleJson.fontFamily}'` と single quote で囲んで組み立てている。CSS 仕様では `sans-serif` 等の generic フォントファミリーはクォートなしで使う必要があり、クォートすると「sans-serif という名前の具体的なフォント」として解釈されてフォールバックする。iOS では、このフォールバック先フォントが SVG の `font-family: sans-serif`（クォートなし）と異なるため、Canvas 幅測定値 < SVG 実描画幅 となり右側にはみ出す。本番環境では文字列長が常に `maxWidth` を超えて `textLength` 圧縮が適用されるため露出しない。

Generic フォントファミリー名（`sans-serif`, `serif`, `monospace`, `cursive`, `fantasy`, `system-ui`）は quote なし、スペースを含む named font（`BIZ UDGothic` 等）は quote ありとする。

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/jsMojules/utilClass/TextDrawer.js` | バグ修正 | `measureCapHeightRatio` で `ctx.textBaseline = 'top'` を `ctx.font` 設定後に移動 |
| `public/jsMojules/utilClass/TextDrawer.js` | バグ修正 | `getTextWidth` で generic フォントファミリーをクォートしない |
| `public/lcdDisplay/index.html` | 変更 | `<html lang="ja">` → `<html>`（`lang` 属性を削除して本番と同じ `sans-serif` フォント解決にする） |
| `public/lcdDisplay/index.html` | 変更 | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` 追加（既適用） |

---

### 7.2b lcdDisplay デバッグ画面 ツールバー仕様

`public/lcdDisplay/index.html` のツールバー（`#svg-toolbar`）に配置するボタンとキーボードショートカットの一覧。

| ボタン | キー | 対象パラメータ | 動作 |
|---|---|---|---|
| 言語切替 | `L` | `langId` | 0→1→2→0 サイクル（`langChange()` アニメーション遷移） |
| runState | `R` | `runState` | 0→1→2→0 サイクル（再描画） |
| isTerminal | `T` | `isTerminal` | boolean トグル（再描画） |
| direction | `M` | `direction` | 0→1→0 トグル（再描画） |
| isDrawTime | `E` | `isDrawTime` | boolean トグル（再描画） |
| isDrawLineName | `N` | `isDrawLineName` | boolean トグル（再描画） |
| isDrawNextStation | `S` | `isDrawNextStation` | boolean トグル（再描画） |

入力欄（`INPUT`・`TEXTAREA`）にフォーカスがある場合はキーボードショートカットを無視する。

変更ファイル: `public/lcdDisplay/index.html`（ボタン追加、`doDirectionToggle` 関数追加、`M` キーハンドラ追加）

---

### 7.3 lcdParts="numbering" — NumIconObj の実装

`rect` 要素の範囲内にナンバリングアイコン（路線記号＋番号）を表示する lcdParts。

#### 属性仕様

| 属性 | 説明 |
|---|---|
| `lcd-numKey` | NumIconDrawer のプリセットキー。`#{...}` / `$...` テンプレート展開対応 |
| `symbolText` | 路線記号テキスト。テンプレート展開対応 |
| `numberText` | 番号テキスト。テンプレート展開対応 |
| `lineColor` | 路線カラー。テンプレート展開対応 |
| `lcd-minComRatio` | 最小圧縮率（0〜1）。`setSize` でアイコンサイズが `naturalSize × minComRatio` を下回らないよう保護する |

#### サイズ規則

- `min(width, height)` を `naturalSize` とし、左/上詰めの正方形が描画範囲
- `flexible = false` と同等: `setSize(w, h)` では縮小のみ（拡大しない）
- `lcd-minComRatio` が設定されている場合、`setSize(w, h)` で決定するアイコンサイズが `naturalSize × minComRatio` を下回らない（axis・cross 両方向に適用）
- `realWidth = realHeight`（常に正方形）

#### デバッグ環境での読み込み

`drawParams.json` に `numIconPresetKeys` 配列を追加し、`Drawer.load()` で drawParams ロード後に各キーの SVG プリセットを `/iconPresets/${key}.svg` から fetch して `NumIconDrawer` を初期化する。

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/NumIconObj.js` | 変更 | `setSize` に `lcd-minComRatio` 下限保護を追加 |
| `public/lcdDisplay/Drawer.js` | 変更 | `load()` に numIconDrawer 初期化を追加、`_buildNode` に `numbering` 追加、`arrangeCtx` に `numIconDrawer` を追加 |
| `public/lcdDisplay/ArrangeObj.js` | 変更 | `_createChildObj` に `numbering` 追加 |
| `public/lcdDisplay/drawParams.json` | 変更 | `numIconPresetKeys` 配列を追加 |
| `public/lcdDisplay/index.html` | 変更 | `NumIconObj.js` スクリプトタグ追加 |
| `public/lcdDisplay/headerSVG.svg` | 変更 | テスト用 numbering 要素を追加 |

---

### 7.4 Drawer — defaultLineSVG の読み込みとツリー統合

デバッグ環境の `Drawer` に `defaultLineSVG.svg` のフェッチ・ツリー構築・出力統合を追加する。

#### 仕様

- `_fetchSVG()` に HTTP 非 2xx 時の `throw` を追加し、ファイルが存在しない場合を検出できるようにする。
- `load()` で `./defaultLineSVG.svg` を `headerSVG.svg` と同様の手順（フェッチ→パース→`_normalizeSVGDefsRefs`）でフェッチする。ファイルが存在しない場合（`_fetchSVG` が throw した場合）は警告を出して `this.defaultLineSVG = null` とし、処理を続行する。
- `buildTree()` で `this.defaultLineSVG` から `this.defaultLineRoot`（`GroupObj`）を構築する（`templateSVG` → `root` と同様の手順）。`defaultLineSVG` が `null` の場合は空の `GroupObj` のままにする。
- `draw()` が返す `<g>` は **defaultLine のツリー → header のツリー** の順に子要素を結合して返す。
- `langChange()` は `defaultLineRoot` → `root` の順に両 root へ伝播する。

#### 変更ファイル

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/Drawer.js` | 変更 | `_fetchSVG` に `res.ok` チェック追加、`load()` に defaultLineSVG フェッチ追加、`buildTree()` に defaultLineRoot 構築追加、`draw()` を defaultLine+header 結合に変更、`langChange()` を両 root 伝播に変更 |

---

### 7.5 lcdParts="group" — groupArea による範囲定義と拡大縮小

`lcdParts="group"` の `<g>` 要素に範囲定義と拡大縮小機能を追加する。配下の static・textBox・arrange 等あらゆる子要素を SVG transform でまとめて変形できる。

#### groupArea の指定

`<g lcdParts="group">` の直接子として `lcdParts="groupArea"` を持つ `<rect>` を置く。このrectがグループの「自然サイズ」を定義し、レンダリングはされない（arrangeArea と同様）。

```svg
<g lcdParts="group">
  <rect lcdParts="groupArea" x="100" y="50" width="200" height="100" />
  <rect lcdParts="static" x="105" y="55" width="190" height="90" fill="..." />
  <g lcdParts="textBox" x="105" y="55" width="190" height="40" .../>
</g>
```

`groupArea` rect は `_buildNode` で `null` を返す（未知の lcdParts）ため、GroupObj の children には追加されない。

#### 拡大縮小仕様

- `setSize(width, height)` を呼ぶと、自然サイズ（groupArea の width/height）から指定サイズへの拡大率 `sx = width/naturalWidth`、`sy = height/naturalHeight` を算出する。
- 拡大・縮小どちらも適用する（NumIconObj の縮小のみとは異なる）。
- スケールは子要素の属性を書き換えるのではなく、出力 `<g>` に SVG transform を設定することで適用する。これにより static・textBox・arrange 等あらゆる子タイプに対してスケールが効く。
- transform 式: `translate(this.x - areaX*sx, this.y - areaY*sy) scale(sx, sy)`

#### `getRealSize()` / `setSize()` の返値

- groupArea が存在する場合: `setSize()` 後は指定サイズを返す。初期値は自然サイズ（groupArea の width/height）。
- groupArea が存在しない場合: `getRealSize()` は `{ width: 0, height: 0 }` を返し、`setSize()` は何もしない。

#### `setCoordinate(x, y)` の仕様

- `this.x = x`、`this.y = y` を更新する。
- `getElement()` 内で transform に反映される（translate の tx/ty が再計算される）。
- groupArea が存在しない場合: `this.x / this.y` は更新されるが、レンダリングへの影響はない。

#### arrange 配下への対応

groupArea を持つ group 要素は ArrangeObj の子要素としても機能する。

- `ArrangeObj._createChildObj()` に `lcdParts="group"` のケースを追加し、`new GroupObj(svgDom)` を生成する（再帰的に子要素をビルド）。
- GroupObj のコンストラクタに ArrangeObj が参照するレイアウト属性フィールドを追加する（`fitX`・`fitY`・`flexible`・`minComRatio`・`margin`・`verticalAlign`・`horizontalAlign`）。これらは SVG 属性から読み取り、未指定時はデフォルト値を使用する。

| フィールド | SVG 属性 | デフォルト値 | 説明 |
|---|---|---|---|
| `minComRatio` | `lcd-minComRatio` | `0` | axis 方向の最小圧縮率（0〜1）。`0` = 完全に自由に圧縮可能。`1` = 圧縮不可（自然サイズを保持）。`LcdPartsObj` コンストラクタで `parseFloat` し、`NaN` の場合は `0` とする。 |
- groupArea なしの group は `getRealSize()` が `{0, 0}` を返すため、arrange のレイアウトには参加しない。

#### lcd-arg による複数コピー生成（arrange 配下）

arrange 配下の group に `lcd-arg="argName:drawParamsVarName"`（または省略形 `lcd-arg="argName"`）を設定すると、配列の要素数分コピーして並べられる。args は group の子要素（textBox・static 等）にも伝播する。

- `_buildContainerChildren` が `lcd-arg` を `argName:drawParamsVarName` の形でパースし（コロンなしは無視）、`parentArgMap[drawParamsVarName]` → drawParams フォールバックの順で配列を取得。
- 配列要素ごとに `childArgs = { ...args, [argName]: element }` を作って `_createChildObj` を呼ぶ。
- `_createChildObj` 内で group の子オブジェクトを構築する際、`args` が再帰呼び出しに渡されるため、nested textBox の `#{$argName.field}` テンプレートや visible 式も正しく解決される。
- GroupObj.getElement では `ctx.resolveValue` / `ctx.exprParser` が `undefined` の場合は上書きしない（`!== undefined` ガード）。

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/GroupObj.js` | 変更 | groupArea 検出、`_sx`・`_sy`・`_areaX`・`_areaY` フィールド追加、`getRealSize()`・`setSize()`・`setCoordinate()` 追加、`getElement()` に transform 出力を追加、レイアウト属性フィールドを追加 |
| `public/lcdDisplay/StaticObj.js` | 変更 | `<g>` + staticArea 対応コード（`_takeSnapshot()`・`_applyScale()`・`_scalePath()`・range 関連フィールド・setSize range 実装・getElement transform ブロック）を削除し、`StaticObj` を `<rect>` 等の単一要素のみに戻す |
| `public/lcdDisplay/ArrangeObj.js` | 変更 | `_createChildObj()` に `lcdParts="group"` のケースを追加、コンストラクタの lcd-color 配列展開チェックを staticArea → groupArea に更新 |

---

### 7.6 lcd-color 属性によるfill設定

`lcdParts="static"` / `lcdParts="group"` / `lcdParts="textBox"` 要素に `lcd-color` 属性を追加し、`fill` を動的に設定できるようにする。

#### 値の記法

| 記法 | 例 | 動作 |
|---|---|---|
| CSS 色リテラル | `#FF0000`・`rgb(0,255,0)`・`rgba(...)`・`hsl(...)` など | そのまま `fill` に設定 |
| SVG グラデーション参照 | `url(#gradientId)` | そのまま `fill` に設定（defs に定義されたグラデーションを参照） |
| drawParams 変数名 | `nowStation.lineColor`・`sectionColors` | ドット記法でdrawParamsを解決した値を使用 |
| args 参照 | `$sectionColor`・`$sectionColor[0]` | args を解決した値を使用 |

判定: `#`・`rgb(`・`rgba(`・`hsl(`・`hsla(`・`url(` で始まる場合は色リテラル（または参照値）としてそのまま使用、`$` で始まる場合は args 参照、それ以外は drawParams 変数名として扱う。

- `url(#...)` 指定時は mulShadow の乗算処理は適用されない（グラデーションfillはRGBパースができないためスキップ）

#### 適用対象

- `lcdParts="static"` の図形要素（`rect` 等）に `lcd-color` がある場合: その要素自身の `fill` に設定する。
- `lcdParts="static"` の `<g>` 要素、または `lcdParts="group"` に `lcd-color` がある場合: 配下の全図形要素の `fill` に一括設定する。
- `lcdParts="textBox"` に `lcd-color` がある場合: `data-style` の `fill` に設定し、テキスト色として反映する。スカラー値のみ対応（配列の場合は先頭要素を使用）。

#### スカラー値の適用

drawParams 変数がスカラー（単一色）の場合、またはCSS色リテラルの場合:

- `lcdParts="static"`: StaticObj コンストラクタで `this._node` に直接適用する。
- `lcdParts="group"` の場合: 子要素ビルド前にsvgDomをクローンし、クローン内の全shape要素にfillを適用してから各子オブジェクトを構築する。これにより static・textBox 等あらゆる子タイプに対して色が反映される。
  - ArrangeObj._createChildObj（group ケース）と Drawer._buildNode（group ケース）の両方で処理する。
- `lcdParts="textBox"`: TextBoxObj コンストラクタで `lcd-color` 属性を `StaticObj._resolveLcdColor` で解決し、`this._style.fill` に設定する（TextDrawer に渡す styleJson に反映される）。

#### lcd-color の階層優先ルール

入れ子になった `<g>` 要素にそれぞれ `lcd-color` がある場合、**階層が深い方（内側）の `lcd-color` を優先する**。

- 再帰traversal時に `currentColor` を引き継ぎ、各要素が自身の `lcd-color` を持つ場合はそれで `currentColor` を上書きしてからサブツリーへ伝播する。
- 図形要素（`rect` 等）が自身に `lcd-color` を持つ場合も同様に自身の色を優先する。

```
例:
<g lcdParts="group" lcd-color="outerColor">
  <rect />                        ← outerColor が適用される
  <g lcd-color="innerColor">
    <rect />                      ← innerColor が適用される（優先）
  </g>
</g>
```

**`lcdParts="static"` 要素の自身の `lcd-color` とコンテキスト伝播色（`colorOverride`）の優先順位:**

`lcdParts="static"` 要素が自身に `lcd-color` 属性を持つ場合、親グループから伝播された `colorOverride` より **自身の `lcd-color` を優先する**。  
`colorOverride` は自身の `lcd-color` を持たない `static` 要素にのみ適用される（フォールバック）。

```
例:
<g lcdParts="group" lcd-color="rootSection.color">
  <rect lcdParts="static" />               ← rootSection.color が適用される（colorOverride）
  <rect lcdParts="static" lcd-color="#555555" />  ← #555555 が優先（自身のlcd-colorが勝つ）
</g>
```

**StaticObj コンストラクタの判定順序:**
1. 自身の `lcd-color` 属性が存在する → `_resolveLcdColor` で解決して適用
2. 自身の `lcd-color` がなく `colorOverride` がある → `colorOverride` を適用
3. どちらもない → 色変更なし

#### 配列値の扱い

drawParams 変数が配列の場合:

- **arrange 配下かつ groupArea あり**: 配列要素ごとに group オブジェクトをコピーし、各コピーに対応する色を配下の全 shape 要素へ適用する。コピーは arrange の通常レイアウト（敷き詰め）で配置される。
- **上記以外**（standalone、または groupArea なし）: 配列の最初の要素の色のみを使用し、コピーしない。

#### 実装詳細

- `StaticObj._resolveLcdColor(attr, drawParams, args)` 静的メソッド: 色リテラル・グラデーション参照判定（`#`・`rgb(`・`rgba(`・`hsl(`・`hsla(`・`url(` で始まる場合はそのまま返す） → `$` プレフィックスなら `LcdPartsObj.resolveArgToken` で args を解決 → それ以外は `LcdPartsObj.resolveDrawParam` で drawParams を解決して返す。
- `StaticObj._applyColorToDOM(containerEl, baseColor, drawParams, args)`: `args` パラメータを追加し、内側 `lcd-color` 解決時に `_resolveLcdColor(attr, drawParams, args)` を呼ぶ。
- `StaticObj` コンストラクタ: `args` パラメータを追加し、`_resolveLcdColor(attr, drawParams, args)` に渡す。
- `ArrangeObj._createChildObj()` の static ケース: `new StaticObj(svgDom, drawParams, colorOverride, args)` と `args` を渡す。
- `ArrangeObj._createChildObj()` の group ケース: `_resolveLcdColor` / `_applyColorToDOM` の呼び出しに `args` を追加。
- `Drawer._buildNode()` の group ケース: `_resolveLcdColor` / `_applyColorToDOM` の呼び出しに `args={}` を追加。

#### ブラケット記法によるインデックスアクセス

`resolveArgToken` / `resolveDrawParam` において、`[n]` 記法による配列インデックスアクセスをサポートする。

- パース時に `[n]` を独立したキーとして分解する（例: `sectionColor[0]` → `['sectionColor', '0']`）
- 配列に対して数値インデックスでアクセスする（`val[0]` など）
- ドット記法との混在も可能（例: `$station.colors[1]`）
- 実装: トークンを `.` で分割した後、各キーの末尾に `[n]` がある場合は `[n]` 部分を取り出して別キーとして扱う

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/StaticObj.js` | 変更 | コンストラクタに `drawParams`・`colorOverride` 追加、`_resolveLcdColor()`・`_applyColor()`・`_applyColorToShapes()` 追加 |
| `public/lcdDisplay/ArrangeObj.js` | 変更 | コンストラクタループに lcd-color 配列展開を追加、`_createChildObj()` に `colorOverride` 引数とgroup向けスカラー色適用を追加 |
| `public/lcdDisplay/Drawer.js` | 変更 | `_buildNode()` の group ケースに lcd-color スカラー適用を追加 |

---

### 7.7 lcdParts="mulShadow" — グラデーション乗算影

#### 概要

`lcdParts="mulShadow"` は影指定専用の新しい lcdParts 値（`<rect>` 要素）。自身は描画されず、`shadowId` 属性で対応付けた対象要素の fill に対してグラデーション乗算結果を構築時に直接適用する（CSS `mix-blend-mode` を使わない）。

#### 属性

| 属性 | 対象要素 | 値 | 説明 |
|---|---|---|---|
| `lcdParts="mulShadow"` | 影指定 rect | — | 影指定要素。自身は描画しない |
| `fill="url(#gradientId)"` | 影指定 rect | SVG グラデーション参照 | 乗算に使うグラデーションを defs から参照 |
| `x, y, width, height` | 影指定 rect | 数値 | グラデーションの絶対座標変換に使用する rect の範囲 |
| `shadowId="N"` | 影指定 rect | 文字列 | この影の識別子 |
| `shadowId="id1, id2, ..."` | 対象要素 | カンマ区切り文字列 | 適用する影をカンマ区切りで複数指定可能 |
| `shadowId=""` | 対象要素 | 空文字列 | 祖先から伝播された影を明示的に無効化する |

- `shadowId` は影指定 rect と対象要素の両方に付ける
- 対象要素の `shadowId` はカンマ区切りで複数指定でき、指定した順に逐次乗算して1つのグラデーションに統合する
- 対象が `<g>` の場合、配下の全 shape 要素（rect・path 等）に適用する

**`shadowId` による上書きルール:**

子要素が `shadowId` 属性を**明示的に持つ**場合（空文字含む）、祖先から伝播されてきた `activeShadows` を上書きする。

| 子の `shadowId` | 動作 |
|---|---|
| 属性なし | 祖先の影をそのまま継承（従来通り） |
| `shadowId="someId"` | 指定したIDの影を使用（祖先の影を上書き） |
| `shadowId=""` | 影を無効化（祖先の影を上書きして影なしにする） |

この上書きは当該要素とその子孫全体に適用される（上書き後の `activeShadows` が子ツリーへ伝播する）。

#### グラデーション座標の変換

影指定 rect のグラデーション（`fill="url(#...)"` で参照）は `gradientUnits="objectBoundingBox"` の % 形式で定義する。適用時に rect の絶対座標へ変換する。

```
mulShadow rect: x=rx, y=ry, width=rw, height=rh
元グラデーション (objectBoundingBox): x1%, y1%, x2%, y2%

変換後 (userSpaceOnUse):
  abs_x1 = rx + x1% * rw
  abs_y1 = ry + y1% * rh
  abs_x2 = rx + x2% * rw
  abs_y2 = ry + y2% * rh
```

変換後の絶対座標は全対象シェイプで共通に使用する。

#### 乗算計算と新グラデーション生成（複数影の統合）

対象シェイプごとに以下を実行する:

1. シェイプの現在の fill（ソリッドカラー）をパース → base color Cb (R, G, B)
2. 先頭 shadow のグラデーション軸（絶対座標変換後の x1,y1→x2,y2）を出力グラデーションの座標系とする
3. 全 shadow のストップ絶対位置を先頭軸に射影してオフセットリストをマージ（ソート済み）
4. 各オフセット t で全 shadow を**逐次乗算**（CSS multiply + source-over, αb=1 前提）:
   ```
   result(t) = Cb × f1(t) × f2(t) × ...   where fi(t) = αi(t) × Ci(t)/255 + (1 - αi(t))
   異なる軸の shadow は先頭軸上の点を各軸に射影して ti を求めて補間する
   ```
5. 統合後のストップ列で新 `linearGradient` を defs に1つだけ動的生成（ID は自動採番）
6. シェイプの `fill` を `url(#新ID)` に設定

#### 処理パイプライン（プリパス）

`_buildContainerChildren`（ArrangeObj）および `Drawer._buildNode`（group ケース）の子要素ループ前にプリパスを実行する:

1. 子要素から `lcdParts="mulShadow"` を収集 → `{ shadowId, gradientId, rect }` のリスト
2. `shadowId` が一致する対象要素をクローンし、グラデーション乗算を適用
3. 以降の処理ではクローンを元 svgDom の代わりに使用
4. `lcdParts="mulShadow"` 自体はオブジェクト生成せずスキップ

#### ctx への defsEl 追加

動的生成 `linearGradient` の挿入先として、`_ctx` に `defsEl`（SVG defs DOM 要素）を追加する。`Drawer` は `this._defsEl` を ctx に含めて渡す。

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/ArrangeObj.js` | 変更 | `_buildContainerChildren` にプリパス追加、新静的メソッド群追加、`_ctx` に `defsEl` を追加、`shadowId` 上書きロジック追加 |
| `public/lcdDisplay/SlotObj.js` | 変更 | `shadowId` 上書きロジック追加 |
| `public/lcdDisplay/Drawer.js` | 変更 | `_buildNode` の group ケースにプリパス追加、ctx に `defsEl` を追加 |

---

### 7.8 lcdParts="slot" — スロット配置

#### 概要

`lcdParts="slot"` は `<g>` 要素に付与するコンテナ。slotArea で定義した領域を等間隔の `slotNum` 点に区切り、子要素を `slotPoint` 属性で指定した位置に配置する。

#### 属性

| 属性 | 対象要素 | 値 | 説明 |
|---|---|---|---|
| `lcdParts="slot"` | `<g>` | — | スロット配置コンテナ |
| `slotNum` | slot `<g>` | 数値または式（デフォルト: 1） | スロット数。drawParams / args の値を参照する式を記述可能 |
| `axis` | slot `<g>` | `"x"`（デフォルト）/ `"y"` | 主軸方向（x: 横、y: 縦） |
| `setPoint` | slot `<g>` | `"edge"`（デフォルト）/ `"center"` | スロット座標の計算モード（後述） |
| `slotStart` | slot `<g>` | `"start"`（デフォルト）/ `"end"` | `slotPoint="auto"` 要素の割り当て開始方向 |
| `interval` | slot `<g>` | 数値（デフォルト: 0） | スロット間の間隔（px）。`setPoint="center"` の場合のみ座標計算に影響する |
| `lcdParts="slotArea"` | slot 直接子 `<rect>` | — | スロット領域の範囲を定義する |
| `slotPoint` | slot 直接子要素 | 数値または式（0 始まり）/ `"auto"` | 配置先スロット番号。`"auto"` を指定すると自動割り当て（後述） |

#### 動的評価

`slotNum` および `slotPoint`（数値の場合）は `ExprParser.evalNumber()` で評価される。

- **`slotNum`**: slot `<g>` 要素が属するスコープの `drawParams` と `args` を使用して評価する。
- **`slotPoint`**: 各子要素のオブジェクト構築時点のスコープで評価する。`lcd-arg` 展開がある場合は、展開後の `args`（例: `$dispStation`）を使用して要素ごとに個別に評価する。`"auto"` の場合は数値評価を行わず自動割り当て対象とする。

評価結果は整数に丸めて使用する。評価結果が数値でない場合や範囲外の場合はその子要素をスキップする。`slotPoint` 属性がない要素は引き続きスキップする。

#### ExprParser.evalNumber() — 数値式評価メソッド

`ExprParser` に `evalNumber(expr, resolveValue)` メソッドを追加する。`eval()` が boolean 固定であるのに対し、`evalNumber()` は数値を返す。

対応する構文:

| 種別 | 例 |
|---|---|
| 数値リテラル | `3`, `0`, `-1` |
| 変数参照 | `numStations`, `$dispStation.slotIndex` |
| 加減算 | `numStations + 1`, `count - 2` |
| 乗除算 | `total * 2`, `width / 3` |
| 括弧 | `(a + b) * 2` |
| 単項マイナス | `-n` |

演算子の優先順位は通常の算術規則（`*`/`/` > `+`/`-`）に従う。変数は `resolveValue` で解決する。ゼロ除算の場合は `NaN` を返す。

変更ファイル: `public/lcdDisplay/ExprParser.js`（`evalNumber` メソッド追加、`tokenize` に `+`・`-`・`*`・`/` トークン追加）

#### ExprParser.eval() — 不等号演算子の追加

`eval()` の `parseComparison` に以下の比較演算子を追加する。

| 記法 | トークン | 意味 |
|---|---|---|
| `!=` | `NEQ` | 不等 |
| `<`  | `LT`  | より小さい |
| `>`  | `GT`  | より大きい |
| `<=` | `LTE` | 以下 |
| `>=` | `GTE` | 以上 |

**数値比較の規則**: 両辺が数値に変換できる場合は数値比較、それ以外は文字列比較（`==` と同一の規則）。

**`tokenize()` の変更点**:
- `!=` を `!` より先にチェックして `NEQ` トークンを生成する（`!` 単体は引き続き `NOT`）
- `<=`・`>=` を `<`・`>` より先にチェックする
- 識別子スキャンの終端文字に `<`・`>` を追加する

変更ファイル: `public/lcdDisplay/ExprParser.js`（`tokenize` にトークン追加、`parseComparison` に演算子追加）

#### スロット位置の計算（setPoint）

slotArea の主軸方向の先頭座標を S、長さを L とする。

**`setPoint="edge"`（デフォルト）**

| slotNum | 位置 |
|---|---|
| 1 | S + L/2（中心のみ） |
| N > 1 | 位置_i = S + i / (N-1) × L　（i = 0 … N-1） |

例: slotNum=3 → S, S+L/2, S+L（両端＋中心）

**`setPoint="center"`**

スロット領域を interval で区切り、各スロットセル幅 `w = (L - (N-1) × interval) / N` の中心に座標を置く。

| 位置 |
|---|
| 位置_i = S + i × (w + interval) + w / 2　（i = 0 … N-1） |

interval = 0 のとき `w = L/N` となり、位置_i = S + (i + 0.5) × L / N（各セル中心）

例: slotNum=3, interval=0 → S+L/6, S+L/2, S+5L/6（各セル中心）

#### slotPoint="auto" — 自動スロット割り当て

`slotPoint="auto"` を指定した子要素は、明示的 `slotPoint` 数値を持つ要素が使用済みのスロットを除いた残りのスロットに、DOM 順で順番に割り当てられる。

**割り当てアルゴリズム:**

1. 数値 `slotPoint` を持つ全子要素を構築し、使用済みスロット番号のセットを収集する
2. `slotStart="start"`: スロット 0 → N-1 の順に未使用スロットをリストアップ
   `slotStart="end"`: スロット N-1 → 0 の順に未使用スロットをリストアップ
3. `slotPoint="auto"` の子要素を DOM 順に走査し、リストから先頭のスロットを順に割り当てる
4. 利用可能スロット数を超えた `auto` 要素は配置しない

**例（slotNum=5、スロット2を数値指定済み、slotStart="start"）:**

利用可能スロット = [0, 1, 3, 4] → auto要素1番目→0, 2番目→1, 3番目→3, …

#### 子要素の配置ルール

- **主軸**: 子要素の中心が slotPoint に対応するスロット座標と一致するように移動する
- **交差軸**: slotArea の交差軸方向中心に揃える
- `slotPoint` 属性のない要素はスキップする
- `slotPoint="auto"` は自動割り当て後、スロット範囲外になった場合はスキップする
- `getRealSize()` で非ゼロサイズを返すオブジェクトのみ対象とする（path / polygon 単体は不可）

#### 対応子要素

arrange と同じ lcdParts 種別が使用可能: `arrange`, `slot`, `group`, `static`, `textBox`, `numbering`

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/SlotObj.js` | 新規作成 | SlotObj クラス |
| `public/lcdDisplay/ArrangeObj.js` | 変更 | `_createChildObj` に `slot` ケース追加 |
| `public/lcdDisplay/Drawer.js` | 変更 | `_buildNode` に `slot` ケース追加 |
| `public/lcdDisplay/index.html` | 変更 | `SlotObj.js` の `<script>` タグ追加 |

#### 追加機能のファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/SlotObj.js` | 変更 | `setPoint`・`slotStart` 読み取り、`slotPoint="auto"` 自動割り当てロジック、`setPoint="center"` 座標計算 |
| `public/lcdDisplay/SlotObj.js` | 変更 | `interval` 読み取り、`setPoint="center"` 座標計算への interval 反映 |

---

### 7.9 lcd-funcDef / lcd-funcCall — SVG内関数定義と呼び出し

#### 概要

入力SVG内に「関数定義」と「関数呼び出し」を記述できる仕組み。定義側で描画内容を再利用可能なまとまりとして宣言し、呼び出し側でその内容を任意の矩形領域に非均等伸縮して配置する。ツリーシステム構築前の事前プロセスとして DOM を書き換えるため、既存のオブジェクトツリー処理はそのまま使用する。

---

#### 定義側: `lcd-funcDef`

```svg
<g lcd-funcDef="[関数名]">
  <rect lcdParts="funcArea" x="…" y="…" width="…" height="…" />
  <!-- コンテンツ要素（あらゆるlcdParts要素を記述可能） -->
</g>
```

| 項目 | 仕様 |
|---|---|
| 対象要素 | SVG直下の **トップレベル `<g>`** のみ有効。ネストされた配下にある `lcd-funcDef` は無視する |
| `lcdParts="funcArea"` | 定義領域の基準矩形。直接子 `<rect>` に付与する。この rect の x/y/width/height を「元サイズ」として使用する |
| コンテンツ要素 | funcArea 以外のすべての直接・間接子要素 |
| 表示 | 非表示・非レンダリング。ツリーシステムは funcDef `<g>` を処理しない |

---

#### 呼び出し側: `lcd-funcCall`

```svg
<rect lcd-funcCall="[関数名]" x="…" y="…" width="…" height="…" />
```

| 項目 | 仕様 |
|---|---|
| 対象要素 | SVG内の任意の場所に配置可能な `<rect>` |
| rect の役割 | 配置先領域（target area）を x/y/width/height で指定する。この rect 自体はレンダリングされない |
| 同名関数の複数呼び出し | 可能。毎回独立したクローンを展開する |
| 属性の引き渡し | `lcd-funcCall`・`x`・`y`・`width`・`height`・`fill` を除く呼び出し元 rect の全属性を、展開後の各トップレベル要素ノードにコピーする（既存属性は上書き） |

---

#### 事前プロセスの動作

`Drawer.buildTree()` 呼び出し前に `Drawer._resolveFuncCalls(svgDoc)` を実行し、SVG DOM を書き換える。

1. **funcDef の収集**: SVGルートの直接子 `<g>` で `lcd-funcDef` 属性を持つものをすべて走査し、`funcName → { funcAreaRect, contentNodes[] }` のマップを構築する。`contentNodes` は funcArea rect を除いた残りの子ノード（テキストノードを含む）のリスト。収集後、funcDef `<g>` 自体は SVG DOM から取り除く。

2. **funcDef 内 funcCall の展開（ネスト対応）**: 全 funcDef の収集が完了した後、各 funcDef の `contentNodes` 内に含まれる `lcd-funcCall` を展開する。一時的な `<g>` コンテナに contentNodes を移し、そのコンテナに対して funcCall 展開（スケール・オフセット・クローン・属性コピー・DOM置換）を実行する。展開後のコンテナ子ノード列を新しい `contentNodes` とする。これにより funcDef が別の funcDef を参照できる。

3. **funcCall の解決**: SVG DOM 全体（書き換え後）を走査し、`lcd-funcCall` 属性を持つ `<rect>` をすべて列挙する。各 funcCall rect に対して以下を実行する:
   - **スケール計算**: funcArea の width/height を元サイズ、funcCall rect の width/height を目標サイズとして非均等スケールを計算する。
     ```
     sx = callWidth  / funcAreaWidth
     sy = callHeight / funcAreaHeight
     ```
   - **オフセット計算**: funcArea の左上 (ax, ay) が funcCall rect の左上 (cx, cy) に対応するよう移動量を計算する。
     ```
     tx = cx - ax*sx
     ty = cy - ay*sy
     ```
   - **クローン生成・インライン展開**: `contentNodes` の各ノードを `cloneNode(true)` で深コピーし、**座標属性を直接書き換え**てスケール・移動を適用する（`_scaleNode`）。transform 属性は使用しない。
   - **属性コピー**: `lcd-funcCall`・`x`・`y`・`width`・`height`・`fill` を除く呼び出し元 rect の全属性を収集し、各トップレベルクローン要素ノードに設定する（既存属性は上書き）。
   - **DOM置換**: スケール済みクローンを funcCall `<rect>` の直前に `insertBefore` で挿入し、rect を `removeChild` で除去する。**ラッパー `<g>` は使用しない**（`lcdParts` なしの `<g>` に包むと ArrangeObj が子要素としてスキップするため）。

4. **結果**: 置換後の SVG DOM をそのまま `buildTree()` に渡す。ツリーシステムは展開済みの通常要素として処理する。

---

#### ファイル変更一覧

#### `_scaleNode(el, sx, sy, tx, ty)` の動作

SVG要素の座標属性を再帰的に直接書き換える。transform ではなく属性値を変換するため、`filter` 等の効果がスケール後座標に正しく適用される。

- `transform="translate(a,b)"` 属性がある場合: tx/ty にbake-in（`tx' = a*sx+tx`）して transform を除去し、子を再帰処理する
- 上記以外の transform（rotate 等）がある場合: `translate(tx,ty) scale(sx,sy)` を前合成して終了（子再帰不要）
- `transform` なし: 要素種別に応じて座標属性を書き換え、子要素を再帰処理する

| 要素 | 書き換える属性 |
|---|---|
| `rect`, `image`, `foreignObject` | `x`, `y`, `width`, `height` |
| `circle` | `cx`, `cy`, `r`（min(sx,sy) でスケール） |
| `ellipse` | `cx`, `cy`, `rx`, `ry` |
| `line` | `x1`, `y1`, `x2`, `y2` |
| `text`, `tspan` | `x`, `y`, `dx`, `dy` |
| `use` | `x`, `y`, `width`, `height` |
| `polygon`, `polyline` | `points` 各座標値 |
| `path` | `d` 属性（`_scalePath` で変換） |

#### `_scalePath(d, sx, sy, tx, ty)` の動作

SVGパスの `d` 属性を非均等スケール変換する。絶対コマンド（大文字）は sx/sy+tx/ty、相対コマンド（小文字）は sx/sy のみ適用する。`A`/`a` コマンドの x-rotation・largeArcFlag・sweepFlag はスケールしない。

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/Drawer.js` | 変更 | `_resolveFuncCalls(svgElement)`・`_scaleNode(el, sx, sy, tx, ty)`・`_scalePath(d, sx, sy, tx, ty)` を追加。`load()` の正規化処理直後に `_resolveFuncCalls` を呼び出す |

---

### 7.10 transform — 要素変換

ツリーシステム上の要素に SVG 標準の `transform` 属性による変換を付与する機能。入力 SVG 要素に記述された `transform` 属性を、`getElement()` の出力に対してそのまま反映する。

#### 対象要素

| クラス | ファイル |
|---|---|
| `TextBoxObj` | `TextBoxObj.js` |
| `ArrangeObj` | `ArrangeObj.js` |
| `GroupObj` | `GroupObj.js` |
| `NumIconObj` | `NumIconObj.js` |
| `SlotObj` | `SlotObj.js` |
| `StaticObj` | `StaticObj.js` |

#### 実装方法

`LcdPartsObj`（基底クラス）のコンストラクタで `transform` 属性を読み取り、`_transform` フィールドに保持する。各対象クラスはそれぞれの `getElement()` の末尾で `_wrapTransform(el)` を呼ぶ。

##### `_wrapTransform(el)` — 変換ラッパー生成

`_transform` が未指定または空の場合は `el` をそのまま返す。指定されている場合は以下の処理を行う：

1. `<g transform="（_transform の値）">` 要素を生成し、`el` を子として追加する
2. ラッパー `<g>` を返す

既存の `el` に設定されている `transform` 属性は変更しない。

##### コンストラクタでの読み取り

`LcdPartsObj` のコンストラクタで以下を読み取る：

```js
this._transform = attr('transform') || null;  // null なら変換なし
```

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/LcdPartsObj.js` | 変更 | コンストラクタで `_transform` を読み取る。`_wrapTransform(el)` メソッドを追加 |
| `public/lcdDisplay/TextBoxObj.js` | 変更 | `getElement()` 末尾で `_wrapTransform` を呼び出す |
| `public/lcdDisplay/ArrangeObj.js` | 変更 | `getElement()` 末尾で `_wrapTransform` を呼び出す |
| `public/lcdDisplay/GroupObj.js` | 変更 | `getElement()` 末尾で `_wrapTransform` を呼び出す |
| `public/lcdDisplay/NumIconObj.js` | 変更 | `getElement()` 末尾で `_wrapTransform` を呼び出す |
| `public/lcdDisplay/SlotObj.js` | 変更 | `getElement()` 末尾で `_wrapTransform` を呼び出す |
| `public/lcdDisplay/StaticObj.js` | 変更 | `getElement()` 末尾で `_wrapTransform` を呼び出す |

---

### 7.11 ページシステム — lcdDisplay デバッグ環境

ボディ部分を複数の SVG ページに切り替えられる仕組み。ヘッダーは固定、ボディのみ切り替える。

#### フォルダ構成

```
public/lcdDisplay/
  pageInput/
    tokyu/
      header/
        headerSVG.svg        （ヘッダー定義、<defs> を含む）
      body/
        defaultLineSVG.svg   （ボディ定義、<defs> を含む）
        （追加ページ）.svg   （同様に <defs> を含む）
  drawParams.json            （移動なし）
  iconList.json              （移動なし）
  defs.svg                   （廃止）
```

`defs.svg` は廃止する。グラデーション・フィルター等の defs 要素は各 SVG ファイルが独自の `<defs>` セクションとして保持する。

#### drawParams.Pages

```json
"Pages": ["defaultLineSVG.svg", ...]
```

- 要素はファイル名のみ（パスなし）。`pageInput/tokyu/body/` 以下を基準とする
- 空配列または未定義の場合はボディ部分を何も表示しない

#### defs の出力処理

描画時に header SVG と body SVG それぞれの `<defs>` 直下の子要素を収集し、重複を除外して出力 SVG の `<defs>` に注入する。

- 重複判定は `id` 属性値による。同名 id が複数存在する場合は最初に現れた方を採用し、後続を捨てる
- `id` を持たない defs 子要素はすべて出力に含める

#### 初期化時のプリフェッチ

`load()` 時に `drawParams.Pages` の全要素を並列フェッチし、正規化・funcCall 展開まで済ませてキャッシュする。`pageReload()` はキャッシュ済みの SVG を使用するため追加フェッチは発生しない。

#### pageReload() の動作

1. `drawParams.Pages` の現在インデックスを 1 進める（末尾の次は先頭に戻る）
2. キャッシュ済みの body SVG を取り出す
3. ツリーを再構築して再描画する
4. `drawParams.Pages` が空または未定義の場合は body を空にして再描画する

#### デバッグ環境のトリガー

| 操作 | 動作 |
|---|---|
| 「ページ切替」ボタン | `pageReload()` を呼び出して再描画 |
| `P` キー | 同上（入力欄フォーカス中は無効） |

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/lcdDisplay/pageInput/tokyu/header/headerSVG.svg` | 新規（移動） | `headerSVG.svg` を移動し `<defs>` を追加 |
| `public/lcdDisplay/pageInput/tokyu/body/defaultLineSVG.svg` | 新規（移動） | `defaultLineSVG.svg` を移動し `<defs>` を追加 |
| `public/lcdDisplay/defs.svg` | 廃止 | 各 SVG ファイルへ内容を移管 |
| `public/lcdDisplay/drawParams.json` | 変更 | `Pages` フィールドを追加 |
| `public/lcdDisplay/Drawer.js` | 変更 | 読み込みパスを新構成に変更。defs 収集・重複除外・注入処理を追加。`pageReload()` メソッドを追加 |
| `public/lcdDisplay/index.html` | 変更 | 「ページ切替 [P]」ボタンを追加。`P` キーハンドラを追加 |

---

### 7.12 TextDrawer — createIconTextByArea の letterSpacing 対応

#### 概要

`createIconTextByArea`（コロン区切りのアイコン付きテキスト描画）において、アイコンを 1 文字として扱い、`letterSpacing` で指定した間隔をアイコン間・テキスト間・アイコンとテキスト間のすべてに適用する。

#### 文字単位数のカウント

テキストセグメントは文字数（`.length`）、アイコンは 1 としてカウントする。空文字セグメントはカウントしない。

例: `:M::D:` → アイコン2個 → 総単位数 = 2  
例: `:M:東急` → アイコン1 + テキスト2文字 → 総単位数 = 3

#### letterSpacing の解決

| styleJson.letterSpacing の型 | 解決方法 |
|---|---|
| オブジェクト `{"2": "30px"}` | 総文字単位数をキーとして値を取り出す。キーが存在しない場合は 0px |
| 文字列 `"30px"` | そのまま使用 |
| 未指定 | 0px |

解決した letterSpacing をテキストセグメントへの `createByArea` 呼び出し時にも渡す（テキスト内部の文字間隔にも適用される）。

#### 幅の算出と圧縮

1. 各ユニットの自然幅を算出する
   - アイコン: `height` px
   - テキスト: `getTextWidth(text, fontSize, resolvedStyleJson)` の返り値
2. N ユニット間に letterSpacing を N-1 箇所挿入した総自然幅を計算する
3. 総自然幅 > maxWidth の場合: `scale = maxWidth / 総自然幅` を全ユニット幅・間隔に均等適用

#### 配置

ユニットを左から順番に配置する。最後のユニットの後には gap を加えない。

| ユニット種別 | 処理 |
|---|---|
| テキスト | `createByArea(text, nowX, y+offset, unitWidth, height*textHeightRatio, resolvedStyleJson, lang)` |
| アイコン（base64） | `<image>` 要素を生成。`width` に圧縮後の unitWidth を設定 |
| アイコン（preset） | `numIconDrawer.createNumIconFromPreset` を呼び出し。geometry.width に unitWidth を設定 |

#### ファイル変更一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/jsMojules/utilClass/TextDrawer.js` | 変更 | `createIconTextByArea` を書き換え。固定テキスト幅割り当てを廃止し、letterSpacing を考慮した自然幅ベースの配置に変更 |

---

### データ受け渡し

```
設定エディタ  ──(JSON.stringify)──▶  localStorage['lcdStrage']  ──▶  display.html
```

### 対応表示タイプ

| 値 | ファイル | 対象車両 |
|---|---|---|
| `tokyu` | `public/display.html` | 東急スタイル |
| `JW-225` | `public/Display_JW-225.html` | JR西日本 225系 |
| `JE-E131` | （未実装） | JR東日本 E131系 |

### 表示SVGファイル構成と読み込み処理

表示ロジックの明確化のため、入力SVGファイルをヘッダー・ボディ種別ごとに分割して管理する。

#### ファイル分割方針

`public/displaySvg/tokyu/` 以下の `header-body.svg`（1ファイル）を以下4ファイルに分割する。

| ファイル名 | 含む要素 | 対応Drawer |
|---|---|---|
| `defs.svg` | `<defs id="defs">` （全グラデーション・フィルター） | — （全Drawer共通参照元） |
| `header.svg` | `<rect id="background">` / `<g id="header">` | HeaderDrawer |
| `defaultLine.svg` | `<g id="body-defaultLine">` / `<g id="footer">` | DefaultLineDrawer、OverLineDrawer、FooterDrawer |
| `platform.svg` | `<g id="body-platform">` / `<image id="platform-jitubutu">` | PlatformDrawer、TransferDrawer |

- グラデーション・フィルターはすべて `defs.svg` に集約し、他ファイルはJSで参照する
- `defs` の取得元は `defs.svg`、`background` の取得元は `header.svg`
- `viewBox` の基準は `header.svg` の値を使用する
- `header.svg` / `defaultLine.svg` / `platform.svg` 内のグラデーション・フィルター参照は `url(./defs.svg#id)` 形式の外部参照で記述し、SVG単体プレビュー（ブラウザ・VSCode拡張等）で正しく描画されるようにする
- ランタイムでは `display.js` の `normalizeSVGDefsRefs()` が外部参照 `url(./defs.svg#id)` をローカル参照 `url(#id)` に変換してから `LCDController` へ渡す

#### 読み込み処理（`display.js`）

4ファイルを並列フェッチして `LCDController` に渡す。

```javascript
const [defsSVG, headerSVG, defaultLineSVG, platformSVG] = await Promise.all([
    getSVGElementFromUrl(`/displaySvg/tokyu/defs.svg`),
    getSVGElementFromUrl(`/displaySvg/tokyu/header.svg`),
    getSVGElementFromUrl(`/displaySvg/tokyu/defaultLine.svg`),
    getSVGElementFromUrl(`/displaySvg/tokyu/platform.svg`),
]);
lcdController = new LCDController(settings, defsSVG, headerSVG, defaultLineSVG, platformSVG, numIconPresets, displaySVG);
```

グローバル変数 `mapSVG` は廃止し、各SVGは `LCDController` コンストラクタへの引数としてのみ渡す。

#### `LCDController` コンストラクタ変更

```
変更前: constructor(setting, mapSVG, numIconPresets, displaySVG)
変更後: constructor(setting, defsSVG, headerSVG, defaultLineSVG, platformSVG, numIconPresets, displaySVG)
```

各Drawerへ渡すSVG:

| Drawer | 渡すSVG |
|---|---|
| `HeaderDrawer` | `headerSVG` |
| `FooterDrawer` | `defaultLineSVG` |
| `DefaultLineDrawer` | `defaultLineSVG` |
| `OverLineDrawer` | `defaultLineSVG` |
| `PlatformDrawer` | `platformSVG` |
| `TransferDrawer` | `platformSVG` |

`createLCD()` 内での取得元:
- `defs` → `this.defsSVG`
- `background` → `this.headerSVG`

---

### 行先データのフォールバック（`LCDController.getOperation`）

以下の 2 段階で末尾停車駅の情報を行先データに補完する。

**「末尾停車駅」の定義：** `stationList` のうち `isPass` が `false` の最後の駅。該当駅がなければ `stationList` の最後の要素を使用する。

#### ① operation 自体が存在しない場合

`operationDict` が空、または現在の区間の `station.operationId` に対応するエントリが存在しない場合（`nowOperation === null`）、全フィールドをデフォルト値で構成した **フォールバック operation オブジェクト** を生成する（行先フィールドは後述の ② で補完）。

**運用の決定ロジック（`LCDController.getOperation`）:**

- 停車中（posState=2）: `nowStation.operationId` で `operationDict` を参照する
- 走行中・直前（posState=0,1）: `prevStation.operationId`（前駅の `operationId`）で `operationDict` を参照する（「まもなく」段階はまだ前区間の運用を使用）
- `operationId` が空文字または `operationDict` にキーが存在しない場合: `nowOperation = null` とし、フォールバック処理へ進む

#### ② 行先パラメータが空の場合（① の後に必ず実施）

`nowOperation` の行先関連フィールドが空文字・`null`・`undefined` の場合、末尾停車駅の対応する値で上書きする。

| operation フィールド | 参照元（末尾停車駅） |
|---|---|
| `destination` | `.name` |
| `destinationKana` | `.kana` |
| `destinationEng` | `.eng` |
| `destinationNum` | `.number` |
| `destinationColor` | `.lineColor` |
| `destinationNumIconKey` | `.numIconPresetKey` |
| `carNumber` | `"1"`（固定） |
| `trainType` | `"普通"`（固定） |
| `trainTypeEng` | `"Local"`（固定） |
| `trainTypeColor` | `"#0185ff"`（固定） |
| `trainTypeBackColor` | `""`（固定） |
| `isStart` | `false`（固定） |

---

### drawParams — `trainTypeChange` フィールド

`ProgressController.getDrawParams()` が返す drawParams に `trainTypeChange` フィールドを追加する。

```
drawParams.trainTypeChange = {
    rootType:        { name, eng, backColor }  // 現在の運用の種別
    arrowType:       { name, eng, backColor }  // 次の運用の種別
    changeStation:   { name, eng }             // 次運用最初の駅（種別変更駅）
    rootLine:        { name, eng }             // 現在の参照駅の lineId が指す路線名
    arrowLine:       { name, eng }             // 種別変更駅の lineId が指す路線名
    rootSection:     { color }                 // 現在の区間の路線色（停車中なら次区間）
    arrowSection:    { color }                 // 次運用最初の区間の路線色
    leftSection:     { color }                 // 現在の運用の最後の区間の路線色
    rightSection:    { color }                 // 次運用最初の区間の路線色
    isDrawLinename:  boolean                   // rootLine と arrowLine が全フィールド一致するとき true
}
```

| フィールド | 取得元 |
|---|---|
| `rootType.name` | 現在の運用（フォールバック適用済み）の `trainType` |
| `rootType.eng` | 現在の運用の `trainTypeEng` |
| `rootType.backColor` | 現在の運用の `trainTypeBackColor` |
| `arrowType.name` | 次の運用（operationDict から直接取得、フォールバックなし）の `trainType` |
| `arrowType.eng` | 次の運用の `trainTypeEng` |
| `arrowType.backColor` | 次の運用の `trainTypeBackColor` |
| `changeStation.name` | 種別変更駅（最初に operationId が変わる駅）の `name` |
| `changeStation.eng` | 種別変更駅の `eng` |
| `rootLine.name` | `lineDict[参照駅.lineId].name`（参照駅 = 現在運用を決定した駅） |
| `rootLine.eng` | `lineDict[参照駅.lineId].eng` |
| `arrowLine.name` | `lineDict[種別変更駅.lineId].name` |
| `arrowLine.eng` | `lineDict[種別変更駅.lineId].eng` |
| `rootSection.color` | 現在の区間の路線色。posState=2（停車中）なら `lineDict[currentStation.lineId].color`（次区間）、それ以外は `lineDict[prevStation.lineId].color` |
| `arrowSection.color` | 次運用最初の区間の路線色 = `lineDict[種別変更駅.lineId].color` |
| `leftSection.color` | 現在の運用の最後の区間の路線色 = `lineDict[種別変更駅直前の駅.lineId].color` |
| `rightSection.color` | 次運用最初の区間の路線色 = `lineDict[種別変更駅.lineId].color`（`arrowSection.color` と同値） |
| `isDrawLinename` | `rootLine` と `arrowLine` のいずれかのフィールドが異なるとき `true`、全フィールド一致のとき `false` |

次の運用が存在しない場合（`hasNextOperation=false`）でも `trainTypeChange` フィールドは常に生成し、各フィールドを空文字で埋めた構造体を返す。`trainTypeChange.svg` 側で表示条件（type=2）によって非表示にされるため、`null` にはしない。

---

## 8. ファイル入出力

### 設定ファイル（JSON）

`settingType` オブジェクトをそのまま JSON シリアライズしたファイル。拡張子は `.json`。

**インポート時の補完処理：**
ファイル読み込み時に `mergeProperties` 関数で、JSONに存在しないフィールドを初期値で補完する。これにより旧バージョンの設定ファイルも互換動作する。

### ローカルストレージ

| キー | 内容 |
|---|---|
| `lcdStrage` | `settingType` の JSON 文字列 |

---

## 9. 乗換案内テキスト記法

`stationType.transferText` / `transferTextEng` フィールドでは、アイコンの埋め込みに以下の記法を使用する。

```
:アイコンキー:路線名
```

例：
```
:TY:東急東横線
:MG:東急目黒線
```

`iconDict` に登録されたキーを `:key:` 形式で記述すると、表示側で対応するアイコン画像に置換される。

---

### 7.13 ArrangeObj — cross 方向圧縮対応 (`setSize` 修正)

#### 問題

y 軸 arrange が子要素の高さを圧縮した場合（例: 88px → 61.5px）、子要素の x 軸 arrange は `setSize(width, 61.5)` を受け取る。  
しかし `setSize` 内の pass1・pass3 では `_childNaturalSizes[i].height`（構築時の 88px）をそのまま cross 方向サイズとして使い続けていたため、子要素のアイコン・テキストが構築時の高さで自然幅を計算してしまい、圧縮後の高さ基準より広い自然幅が算出される。その結果、実際には十分なスペースがあるにもかかわらず横方向も過剰に圧縮された。

#### 修正方針

`setSize` の pass1・pass3 で `crossNatural` を使う箇所を `Math.min(crossNatural, actualCross)` に変更する。

- `actualCross = isX ? this.height : this.width`（`setSize` 冒頭で更新済みの圧縮後サイズ）
- cross が圧縮されていない場合は `min` の結果が変わらないため後方互換

#### 変更箇所

| ファイル | 対象 |
|---|---|
| `public/lcdDisplay/ArrangeObj.js` | `setSize` pass1・pass3 の `crossSize` 算出ロジック |

#### 修正内容

**pass1（fit 子要素の自然サイズ取得）**

```javascript
// 修正前
const crossSize = crossFit ? INFINITE : crossNatural;
// 修正後
const actualCross = isX ? this.height : this.width;
const crossSize = crossFit ? INFINITE : Math.min(crossNatural, actualCross);
```

**pass3（最終 setSize）**

```javascript
// 修正前
const crossSize = (isX ? child.fitY : child.fitX) ? (isX ? this.height : this.width) : crossNatural;
// 修正後
const actualCross = isX ? this.height : this.width;
const crossSize = (isX ? child.fitY : child.fitX) ? actualCross : Math.min(crossNatural, actualCross);
```

---

### 7.14 ArrangeObj — 入れ子 arrange の内部固定幅を考慮した均等圧縮

#### 問題

arrange が 2 段以上入れ子になっている場合、外側 arrange が子要素の幅を均等圧縮する際、子 arrange の内部構造（固定要素の存在）が考慮されない。

**具体例**：外側 x 軸 arrange に 2 つの転送項目（子 arrange）が並ぶ。
- 項目 A：アイコン（固定 88px）＋テキスト（自然幅 200px）→ 自然幅計 288px
- 項目 B：アイコン（固定 88px）＋テキスト（自然幅 150px）→ 自然幅計 238px
- 利用可能幅：400px（interval 40px を除いた 360px）

**現在の動作**（一律圧縮）:
- 圧縮率 = 360 / (288+238) = 0.684
- 項目 A → 197px（テキスト 197-88-10=99px、テキスト圧縮率 99/200 = 49.5%）
- 項目 B → 163px（テキスト 163-88-10=65px、テキスト圧縮率 65/150 = 43.3%）
→ テキストの圧縮率が項目によって異なる

**期待する動作**（内部固定幅を考慮した圧縮）:
- 固定幅合計 = 88+10 + 88+10 = 196px
- 自由幅合計 = 200+150 = 350px
- 自由要素への圧縮率 = (360-196) / 350 = 164/350 ≈ 46.9%
- 項目 A → (88+10) + 200×0.469 = 98+93.7 = 191.7px
- 項目 B → (88+10) + 150×0.469 = 98+70.3 = 168.3px
→ テキストの圧縮率が両項目で同一（46.9%）

#### 設計

各子要素に **`getMinAxisSize(isX)`** メソッドを追加し、「自由要素をすべて 0 に圧縮したときの最小 axis サイズ」を再帰的に計算する。

| 要素種別 | `getMinAxisSize(isX)` の返し値 |
|---|---|
| **ArrangeObj（axis 方向がクエリと一致）** | `子要素の getMinAxisSize の合計 + interval合計` |
| **ArrangeObj（cross 方向、fitX/Y あり）** | `0`（外から与えられるサイズに適応できる） |
| **ArrangeObj（cross 方向、fitX/Y なし）** | `realWidth / realHeight`（固定サイズ） |
| **リーフ要素** | `naturalAxisSize × minComRatio` |

`setSize` の pass2 で `minAxisSizes` を算出し、`_calcAxisSizes` へ渡す。

#### `_calcAxisSizes` の変更

引数を `minComRatios[]`（相対比率）から `minSizes[]`（絶対最小幅）に変更し、以下の一段計算に置き換える。

```
fixedTotal      = Σ minSizes[i]
freeNaturals[i] = naturalSizes[i] − minSizes[i]
freeTotal       = Σ freeNaturals[i]
availableForFree = availableForContent − fixedTotal
ratio           = availableForFree / freeTotal
target[i]       = minSizes[i] + freeNaturals[i] × ratio
```

**フォールバック**（`freeTotal ≤ 0` または `availableForFree ≤ 0`）：全要素を均等圧縮。

#### `minAxisSizes` の算出タイミング

外側 arrange の pass1（`child.setSize(INFINITE, crossSize)` 呼び出し後）に計算する。このとき fit 子 arrange の `_axisSizes` は最新状態になっているため、`getMinAxisSize` が正確な値を返せる。

fit でない子（`hasFitAxis = false`）は `_axisSizes` が未更新の可能性があるため、`naturalSize × child.minComRatio` を保守的な最小値として使用する。

最終的な `minAxisSizes[i]` は内部最小値と外部 `minComRatio` 制約の大きい方をとる:
```
minAxisSizes[i] = max(computedInternalMin, naturalSizes[i] × child.minComRatio)
```

#### 変更箇所

| ファイル | 対象 |
|---|---|
| `public/lcdDisplay/ArrangeObj.js` | `getMinAxisSize(isX)` メソッド追加、`setSize` pass2、`_calcAxisSizes` 全面変更 |

---

### 7.15 TextDrawer — `createIconTextByArea` のアイコン固定オプション（`isComIcon`）

#### 概要

アイコン交じりテキスト描画時に、テキスト圧縮の際にアイコンを縮小しないオプションを追加する。

`textBox` 要素の `data-style` に `"isComIcon"` フィールドを追加する。

| 値 | 動作 |
|---|---|
| `false`（デフォルト） | アイコンを固定幅として扱う。テキスト部分のみ圧縮して残りのスペースに収める。 |
| `true` | 全ユニット（アイコン・テキスト）を均等な比率で圧縮する（従来動作）。 |

#### `isComIcon: false` 時のアルゴリズム

アイコンを arrange における `minComRatio=1` 要素と同様に扱う。

```
iconFixedWidth    = Σ アイコンユニットの自然幅（= height）
allGapsWidth      = letterSpacingPx × (units.length − 1)
textTotalNatural  = Σ テキストユニットの自然幅

fixedTotal        = iconFixedWidth + allGapsWidth
availableForText  = width − fixedTotal
```

- `availableForText > 0` かつ `textTotalNatural > 0`：
  `textRatio = availableForText / textTotalNatural` をテキストユニットのみに適用。アイコンは `height` のまま。
- それ以外（テキストなし or 固定要素だけで超過）：
  全ユニットを均等比率で圧縮するフォールバック（`isComIcon: true` と同じ計算）。

#### letterSpacing の扱い

`isComIcon: false` の場合、ユニット間の letterSpacing 間隔はすべて固定値（`letterSpacingPx` のまま）として扱い、スケーリングしない。

#### 変更箇所

| ファイル | 対象 |
|---|---|
| `public/jsMojules/utilClass/TextDrawer.js` | `createIconTextByArea` |

---

### 7.16 ArrangeObj — y軸 arrange の列左端揃え（`arrange-alignDepth`）

#### 概要

y軸 arrange 内に複数の x軸 arrange（行）が縦に並ぶ構造において、対応する列位置の左端 x 座標を全行間で揃えるオプションを追加する。

#### 新属性

| 属性 | 対象 | 型 | デフォルト | 説明 |
|---|---|---|---|---|
| `arrange-alignDepth` | `lcdParts="arrange"`（y軸のみ有効） | 整数 ≥ 1 | なし（無効） | 指定した深さまで、対応する列の左端を全行間で揃える |
| `arrange-lineAlign` | `lcdParts="arrange"`（y軸のみ有効） | `"center"` / `"left"` | `"center"` | 列数が異なる行グループ間の左端揃えモード。`"center"` = グループごとに独立してコンテナ内中央揃え。`"left"` = 全グループの開始 x を `min(startX)` に統一して左端を揃える |

#### 対象構造

```
[外側 y軸 arrange: arrange-alignDepth="N"]
  ├─ [行A: x軸 arrange]          ← 深さ1の「行」
  │    ├─ [列A-0: 任意要素]
  │    ├─ [列A-1: x軸 arrange]   ← 深さ2の「行」（axis="x" の場合のみ対象）
  │    │    ├─ [列A-1-0]
  │    │    └─ [列A-1-1]
  │    └─ [列A-2: 任意要素]
  └─ [行B: x軸 arrange]
       ├─ [列B-0: 任意要素]
       ├─ [列B-1: x軸 arrange]
       │    ├─ [列B-1-0]
       │    └─ [列B-1-1]
       └─ [列B-2: 任意要素]
```

#### 動作仕様

**深さ1の動作（列左端を揃える）:**

1. 外側 y軸 arrange の直接子要素のうち x軸 ArrangeObj を「行」として収集する（`lcd-arg` 展開による生成物も同様に扱う）
2. 行を「直接子要素の数」でグループ化し、同数グループ内の行同士でのみ揃えを行う
3. 各列位置 `i` について、グループ内全行の自然幅の最大値 `maxWidth[i]` を計算する
4. 各行の列 `i` は `maxWidth[i]` を有効自然幅として使用し、圧縮のベースとする

**深さ2以上の動作:**

深さ1の処理に加えて、各列位置 `i` に対応する子要素が x軸 ArrangeObj である場合、それらを「行」として再帰的に同じ揃え処理を深さ `N-1` で適用する。

**圧縮との兼ね合い:**

強制された自然幅（maxWidth）は最小自然幅として機能する。全行が同一の強制幅から始まり、同一の利用可能幅（外側 arrange の幅）を受け取るため、通常の圧縮アルゴリズムにより全行で同一の圧縮率が適用され、圧縮後も列左端の揃えが維持される。

#### アルゴリズム（絶対 x 座標配置方式）

`setSize` のセンタリングフローに依存せず、`_prepareAlignment` が列ごとの **絶対 x 座標** を事前計算し、`getElement` 時に直接配置する。

**`_prepareAlignment(rows, depth, containerX, containerWidth, containerAlign)` メソッド（新規）:**

```
rows:           揃え対象の x軸 ArrangeObj の配列
depth:          残り深さ
containerX:     このグループの配置基準となるコンテナ左端 x（初回: 外側 arrange の this.x）
containerWidth: コンテナ幅（初回: 外側 arrange の this.width）
containerAlign: コンテナの水平揃え（初回: 外側 arrange の horizontalAlign）

Step 1: 列数ごとにグループ化
  groups = groupBy(rows, r => r.children.length)

Step 2: 各グループで列最大幅・全体幅を計算、必要に応じて圧縮
  for each (colCount, groupRows) in groups:
    for each row in groupRows:
      row._forcedAxisSizes = null; row._alignedColPositions = null
      row.setSize(INFINITE, row.height)   // 自然幅計測
      natWidths[row] = [...row._axisSizes]
    maxWidths[i]  = max(natWidths[row][i])  for all row in groupRows
    wholeWidth    = sum(maxWidths) + interval × max(0, colCount − 1)

    // wholeWidth > containerWidth の場合、_calcAxisSizes で圧縮する
    finalWidths = maxWidths
    if wholeWidth > containerWidth:
      minSizes[i] = maxWidths[i] × max(row.children[i].minComRatio for each row)
      finalWidths = _calcAxisSizes(maxWidths, minSizes, containerWidth, interval)
    finalWholeWidth = sum(finalWidths) + interval × max(0, colCount − 1)

Step 3: containerAlign からグループの開始 x を求める
  if containerAlign == 'center':
    startX = containerX + (containerWidth − finalWholeWidth) / 2
  else:  // 'left'
    startX = containerX
  // ← Step 2&3 を全グループ分収集してから Step 3.5 へ

Step 3.5: arrange-lineAlign="left" の場合、全グループのstartXを統一する
  if _lineAlign == 'left' and グループ数 > 1:
    minX = min(startX for each group)
    for each group: startX = minX

Step 4: 各列の絶対 x 座標を設定し、行に記録する
  cumX = 0
  colPositions[i] = { x: startX + cumX, width: finalWidths[i] };  cumX += finalWidths[i] + interval
  for each row in groupRows:
    row._forcedAxisSizes     = finalWidths   // 圧縮後の列幅（setSize 用）
    row._alignedColPositions = colPositions  // getElement 用絶対 x 座標

Step 5: depth > 1 なら対応列を再帰的に揃える
  for each column i:
    subRows = [row.children[i] for row in groupRows]
              .filter(c => c instanceof ArrangeObj && c.axis === 'x')
    if subRows.length == groupRows.length:
      _prepareAlignment(subRows, depth − 1,
          colPositions[i].x, colPositions[i].width, 'left')
      // コンテナ = 列 i の絶対 x 範囲。align は 'left' 固定
```

**`setSize` の変更（外側 y軸 arrange）:**

通常フロー（pass1〜3）の前に `_prepareAlignment` を呼び出す：

```
if (_alignDepth > 0 && axis === 'y'):
  rowChildren = children.filter(c => c instanceof ArrangeObj && c.axis === 'x')
  _prepareAlignment(rowChildren, _alignDepth, this.x, this.width, this.horizontalAlign)
// 以降は通常の pass1〜3
```

**`setSize` の変更（各行 x軸 arrange）:**

pass1 完了後、`_forcedAxisSizes` が設定されていれば有効自然サイズを上書きして pass2 へ進む：

```
// pass1 完了後
if (_forcedAxisSizes !== null):
  effectiveNaturalAxes[i] = max(effectiveNaturalAxes[i], _forcedAxisSizes[i])  for each i
// 以降は通常の pass2〜3
```

**`setSize` の変更（外側 y軸 arrange） — pass3 crossSize:**

`_forcedAxisSizes` が設定された行は `crossSize = min(forcedTotal, actualCross)` として、行の setSize に正確な幅を渡す（子要素のテキスト圧縮幅を正しく保つため）：

```
// pass3 ループ内（y軸 arrange かつ child._forcedAxisSizes が設定されている行）
forcedTotal = sum(child._forcedAxisSizes) + child.interval × (列数 − 1)
crossSize   = min(forcedTotal, actualCross)
```

**`getElement` の変更（各行 x軸 arrange）:**

`_alignedColPositions` が設定されている場合、axisCursor ベースの配置をバイパスして絶対 x 座標で各列を配置する：

```
if isX and _alignedColPositions is not null:
  for each (child, origIdx) in children (元のインデックスを保持):
    crossPos = _calcCrossPos(crossAvail, child.realHeight, child)
    childX   = _alignedColPositions[origIdx].x   // 絶対 x 座標
    childY   = this.y + crossPos
    child.setCoordinate(childX, childY)
    el = child.getElement(childCtx)
    // el を outer に追加
else:
  // 既存の axisCursor ベース配置（変更なし）
```

#### 実装詳細

**新規プロパティ（ArrangeObj）:**

| プロパティ | 設定元 | 説明 |
|---|---|---|
| `_alignDepth` | `arrange-alignDepth` 属性（整数） | 0 = 無効（デフォルト）、1 以上 = 有効 |
| `_lineAlign` | `arrange-lineAlign` 属性 | `'center'`（デフォルト）/ `'left'`。列数が異なるグループ間の左端揃えモード |
| `_forcedAxisSizes` | `_prepareAlignment` が設定 | 強制列幅の配列。`null` の場合は通常動作 |
| `_alignedColPositions` | `_prepareAlignment` が設定 | `[{x, width}]` 列ごとの絶対 x 座標と幅。`null` の場合は通常動作 |

**再帰時のコンテナ境界について:**

深さ 1 では外側 y軸 arrange の `this.x` / `this.width` / `horizontalAlign` をコンテナとして使用する。深さ 2 以降では、親レベルで確定した `colPositions[i].x` / `colPositions[i].width` を再帰先のコンテナとして渡すことで、各深さで正確な絶対座標が計算される。

#### 変更ファイル

| ファイル | 対象 |
|---|---|
| `public/lcdDisplay/ArrangeObj.js` | コンストラクタに `_alignedColPositions` 追加、`_prepareAlignment` 書き換え、`setSize` の `_prepareAlignment` 呼び出し引数更新・pass3 crossSize 維持、`getElement` に絶対 x 配置ブランチ追加 |

---

### 7.17 lcdParts="text" — TextBlockObj の実装

#### 概要

`lcdParts="text"` は `<g>` 要素に指定し、改行を含むテキストを複数行で描画するブロック要素。  
各行の描画処理は `TextBoxObj` と同じ `textDrawer.create()` を使用する。

#### SVG 記述例

```xml
<g lcdParts="text"
   lcd-holAlign="center"
   lcd-verAlign="top"
   interval="4"
   lcdText="#{message}\n2行目テキスト">
  <rect lcdParts="textArea" x="10" y="20" width="300" height="80"/>
  <rect lcdParts="textLine" height="24"
        data-style='{"fill":"#ffffff","fontSize":20,"fontFamily":"BIZ UDGothic"}'/>
</g>
```

#### 属性仕様

| 属性 | デフォルト | 説明 |
|---|---|---|
| `lcdText` | `""` | 描画テキスト。`#{...}` 変数参照と `\n` による改行をサポート |
| `lcd-holAlign` | `"left"` | 水平揃え: `left` / `center` / `right` |
| `lcd-verAlign` | `"top"` | 垂直揃え: `top` / `center` / `bottom` |
| `interval` | `0` | 行間ピクセル数 |
| `breakType` | `"0"` | `"0"`: 従来通り（幅超過時に圧縮）/ `"1"`: 圧縮なしで収まる文字数で自動折り返し |

#### 子要素

| `lcdParts` 値 | 要素 | 役割 |
|---|---|---|
| `textArea` | `<rect>` | テキストブロック全体の範囲（x, y, width, height）を定義 |
| `textLine` | `<rect>` | 1 行分のスタイル定義。`height` で行高さを指定。`data-style` 属性に TextBoxObj と同形式の JSON スタイルを記述 |

- `textLine` は 1 つだけ配置し、全行で共通使用する。
- `textLine` の横幅は `textArea` の width に従う（`textLine` の width 属性は無視する）。

#### レイアウトアルゴリズム

```
lcdText を \n で分割 → segments[]

breakType="1" の場合: 各 segment を自動折り返しして lines[] に展開する
  fontSize = textDrawer.getFontSize(lineH, fontFamily, lang)
  segment ごとに再帰的に折り返す:
    if getTextWidth(segment) <= areaW: lines に追加（折り返し不要）
    else: 二分探索で収まる最大文字数 k を求め、
          lines に segment[0..k] を追加し、残り segment[k..] を再帰的に処理する

breakType="0" の場合: segments をそのまま lines[] として使用する

lineH   = textLine.height
N       = lines.length
totalH  = lineH * N + interval * (N - 1)

lcd-verAlign に応じてブロック先頭 y（blockStartY）を計算:
  top    → blockStartY = textArea.y
  center → blockStartY = textArea.y + (textArea.height - totalH) / 2
  bottom → blockStartY = textArea.y + textArea.height - totalH

各行 i (0-indexed):
  lineY = blockStartY + i * (lineH + interval)
  // textArea の下端を超える行はスキップ
  if lineY + lineH > textArea.y + textArea.height: continue

  x      = textArea.x
  width  = textArea.width
  axis   = lcd-holAlign → textAnchor ("left"→"start", "center"→"middle", "right"→"end")
  textDrawer.create(lines[i], { x, y: lineY, width, height: lineH, styleJson, lang, axis, ... })
```

#### 変数参照

`lcdText` の `#{...}` は `LcdPartsObj.resolveTemplate()` で解決する。  
`\n` による改行は `resolveTemplate` 呼び出し後に `split('\n')` で分割する。

#### TextBlockObj クラス設計

```javascript
class TextBlockObj extends LcdPartsObj {
    constructor(svgDom, drawParams, args, textDrawer) {
        super(svgDom, drawParams, args);
        // textArea, textLine を svgDom の子要素から取得
        // lcdText を resolveTemplate で解決し \n で分割
        // 各行に対し textDrawer.create() を呼んで SVG 要素を生成
        // 結果を this._groupEl (<g>) に蓄積
    }
    getElement(ctx) {
        // this._groupEl を返す（_wrapTransform を適用）
    }
    langChange(transTime, gapTime) {
        this._applyVisibleAnim(transTime, gapTime);
    }
}
```

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `public/Drawer/src/objects/TextBlockObj.js` | 新規作成 |
| `public/Drawer/src/main/Drawer.js` | `_buildNode()` に `lcdParts="text"` ケースを追加 |
| `public/display.html` | `<script src="./Drawer/src/objects/TextBlockObj.js">` を追加 |

### 7.18 GroupObj — 回転要素の圧縮方向指定（`lcd-fitDir`）

#### 背景・不具合

`lcdParts="group"` は `groupArea` に収めるため、`getElement()` で配下全体をラッパー `<g>` の `transform="translate(tx,ty) scale(sx,sy)"` でまとめてスケールする。このスケールは**子要素自身の `transform`（`rotate` など）の外側**に適用されるため、回転した子に非一様スケール（`sx ≠ sy`）がかかると、回転後の座標系で縦横が別々に縮むことになり、**直交性が崩れて平行四辺形状（ひし形）に歪む**。

`defaultLineSVG.svg` の英語駅名は `transform="rotate(-60, 1634, 680)"` を持ち、親グループが `lcd-fitY="true"` のため、駅名が長い場合にこの歪みが発生していた。Chrome実機で描画行列を分解し、2軸のなす角が **79.66°**（直交なら90°）であることを確認した。

#### 仕様

回転を持つ要素に対し、圧縮方向を選べる属性 `lcd-fitDir` を追加する。

| 値 | 意味 |
|---|---|
| `screenY`（デフォルト） | 従来どおり、画面の縦方向に圧縮する（回転要素では歪みが発生する） |
| `localY` | オブジェクト基準の縦方向（回転前の座標系のY方向）に圧縮する |
| `localX` | オブジェクト基準の横方向（回転前の座標系のX方向）に圧縮する。横書きテキストではベースライン方向＝文字の進行方向にあたる |

デフォルトを `screenY` とすることで、属性を指定していない既存の要素の見た目は一切変わらない。

#### 圧縮率の算出

回転角 θ、要素のローカル寸法 w×h のとき、画面上の外接矩形（AABB）の高さは次式で表される。

```
H = kx·w·|sinθ| + ky·h·|cosθ|
```

従来（`screenY`）と同じ高さに収めるため、目標の高さを `H = sy × (w·|sinθ| + h·|cosθ|)` とし、各モードで未知数を解く。

- `localY`: `ky = (H − w·|sinθ|) / (h·|cosθ|)`（`kx = 1`）
- `localX`: `kx = (H − h·|cosθ|) / (w·|sinθ|)`（`ky = 1`）

求めた比率が **0以下になる場合は幾何的に解が存在しない**ため、`screenY` の従来動作にフォールバックし、コンソールに警告を出す。例えば英語駅名（w=333, h=70, θ=60°, sy=0.811）では `localY` の解が `ky = −0.74` となり成立しないが、`localX` は `kx = 0.788` で成立する。

#### 実装方針

歪みの原因が「回転の外側での非一様スケール」であるため、`localX` / `localY` の要素は**ラッパーのスケールをかけず、子自身のサイズを縮める**方式とする。

1. `GroupObj.getElement()` で、各子の `lcd-fitDir` を確認する
2. `localX` / `localY` の子は、上式で求めた比率を使って `child.setSize(w·kx, h·ky)` を呼ぶ。`TextBoxObj` はこれを受けて自分の座標系で再描画するため、`TextDrawer` の既存のベースライン方向圧縮（`textLength`）がそのまま働く
3. その子は**スケールを持たない別のラッパー `<g>`** に入れて出力する。位置は、回転中心 P が従来のスケール後と同じ位置に来るよう `translate(Px·sx + tx − Px, Py·sy + ty − Py)` を与える

これにより、変換の線形部分が `Diag(sx,sy)·Rot(θ)`（シアーあり）から `Rot(θ)·Diag(kx,ky)`（シアーなし）に変わる。

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `public/Drawer/src/objects/LcdPartsObj.js` | `lcd-fitDir` 属性の読み取りを追加 |
| `public/Drawer/src/objects/GroupObj.js` | `getElement()` に回転子要素の個別スケール処理を追加 |
| `public/Drawer/pageInput/tokyu/body/defaultLineSVG.svg` | 英語駅名に `lcd-fitDir="localX"` を付与 |
| `public/Drawer/pageInput/tokyu/body/overLineSVG.svg` | 同上 |
| `public/Drawer/doc/lcdParts.md` | 属性表に `lcd-fitDir` を追記 |

### 7.19 駅プリセット — 路線図からの区間選択（仮実装）

既存のリスト選択（路線→駅）に加え、路線図上で駅をクリックして区間を選べるUIを追加する。**仮実装**のため既存のリストUIは残し、ポップアップ内のタブで切り替える。

#### 駅座標（`stationDB.csv` の拡張）

路線図の配置に座標が必要なため、`stationDB.csv` に `緯度`・`経度` 列を追加する。

| 列 | 内容 |
|---|---|
| 駅ID / 駅名 / 駅名かな / 駅名英語 | 既存 |
| 緯度 / 経度 | 追加。路線図上の配置に使用する |

現在の値は**仮値**である。主要駅（大宮・浦和・赤羽・田端・上野・東京・品川・川崎・横浜・大船・駒込・池袋・新宿・渋谷・大崎）におおよその実座標を与え、その間の駅は路線の駅順に沿って線形補間したもの。正式な座標は後から差し替える前提とする。

#### 描画

> 座標変換・表示範囲・スクロール操作は 7.21節で作り直した。以下のうち座標変換の記述は 7.21節が優先する。

- 緯度経度を画面座標へ変換する（経度→x、緯度→y。緯度は北が上になるよう符号を反転し、全駅の範囲が収まるよう等方スケールで正規化する）
- 駅は**駅IDごとに1つのノード**として描画する。複数路線が通る駅（乗換駅）も1ノードとし、そこから各路線が伸びる形になる
- 路線は `lineConnectDB` の駅順に従って駅ノード間を結ぶ折れ線とし、`lineDB` の路線カラーで描画する
- 乗換エッジ（`transferDB`）は駅ノード間を結ぶグレーの点線で描画する（路線より下、駅ノードより下のレイヤー）。表示のみでクリックできず、ハイライト・区間選択には影響しない（7.20節参照）

#### 選択操作

1. 駅をクリックして始点駅を選ぶ
2. 始点駅をオレンジでハイライトし、**始点駅を通る全路線とその路線上の全駅**を白くハイライトする（それ以外はグレーアウトしてクリック不可）
3. ハイライトされた駅をクリックする
4. 始点駅からその駅までの区間を追加一覧に追加し、その駅を新しい始点駅として 2. に戻る

始点未選択の状態では全駅がクリック可能とする。

#### 区間の路線が一意に定まらない場合の規則

乗換駅同士を選んだ場合、始点駅と対象駅の両方を含む路線が複数存在しうる。また環状線では同一駅が駅順リストに2回現れるため、同じ路線内でも候補が複数になりうる。そこで候補 `(路線ID, 始点index, 終点index)` を全て列挙し、次の順で1つに決定する。

1. 区間に含まれる駅数が**最も少ない**もの
2. 同数の場合は路線IDが小さいもの
3. さらに同数の場合は始点indexが小さいもの

これは仮実装の規則であり、将来的にユーザーへ路線を選ばせるUIに変更する余地を残す。

> この規則は 7.23節で廃止し、候補が複数ある場合はルート選択ポップアップでユーザーが選ぶ方式に変更した。

#### 既存ロジックの再利用

区間の状態管理（`stagingList`・`prevStation`）、「戻る」「追加」、および `extractStationsFromSections`（路線をまたぐ接続駅を1駅に統合し2つのナンバリングを設定する処理）は既存のものをそのまま使う。路線図UIは `handleStationClick` 相当の入口を共有し、区間生成の結果は従来と同一形式（`StationSection`）とする。

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `public/csv/presetLines/stationDB.csv` | `緯度`・`経度` 列を追加（仮値） |
| `app/modules/loadStationPresets.ts` | `PresetStation` に `lat`・`lon` を追加しパース |
| `app/components/StationPresetMap.tsx` | 新規。路線図の描画・ハイライト・クリック処理 |
| `app/components/StationPresetPopup.tsx` | リスト／路線図のタブ切り替えを追加 |

### 7.20 駅プリセット — 全国データ対応のためのデータ構造整理

日本全国の路線（駅 約9,000・路線 約600規模）を登録する前提で、CSVのデータ構造とデータ作成ルールを整理する。詳細は 4.10節「CSVファイル」「駅のグラフ構造」「駅IDの定義」「データ作成ルール」を参照。本節では変更点をまとめる。

#### 変更点

1. **乗換エッジの追加**: `transferDB.csv`（駅ID1, 駅ID2）を新設する。別々の駅IDを持つ駅同士が乗り換え可能であることを表す。今回は**データ保持と路線図表示のみ**に使い、区間選択（リスト・路線図とも）や `stationType` への変換には使わない
2. **同一駅の定義**: 駅施設を共有する駅は1つの駅ID、駅施設が別の駅や表記が異なる駅は別々の駅IDにして乗換エッジでつなぐ
3. **lineDB.csv の列変更**: `事業者` 列を追加し、`アイコン` 列を `路線アイコン`（`I_*`）と `ナンバリングアイコン`（`N_*`）の2列に分ける
   - 変更後の列順: 路線ID, 事業者, 路線名, 路線名かな, 路線名英語, 路線カラー, 路線記号, 路線アイコン, ナンバリングアイコン
   - `事業者` は今回は読み込んで保持するのみ（路線選択UIでの分類は別途対応）
4. **ナンバリングプリセットの固定値を廃止**: 駅の `numIcon`・`numIconNext` の `presetKey`/`manualPresetKey` を `N_tokyu` 固定から、所属路線の `ナンバリングアイコン` 列の値に変更する。`lineDict.numIconPresetKey` にも同列の値を設定する
5. **データ作成ルールの明文化**: ID の形式、CSV に使えない文字、分岐線・環状線・6の字の路線の表し方、transferDB の書き方を定める

#### 型定義の変更（`app/modules/loadStationPresets.ts`）

```typescript
export type PresetLine = {
    id: string
    operator: string          // 事業者（追加）
    name: string
    kana: string
    eng: string
    color: string
    symbol: string
    iconPresetKey: string     // 路線アイコンのプリセットキー I_*（追加）
    numIconPresetKey: string  // ナンバリングアイコンのプリセットキー N_*（参照する列を変更）
}

// 乗換エッジ（追加）: 別々の駅IDを持つ駅同士の乗換。向きは持たない
export type PresetTransfer = {
    stationId1: string
    stationId2: string
}
```

- `loadTransferDB()` を追加する。`transferDB.csv` が存在しない（fetch が失敗する）場合は空配列として扱い、ポップアップ全体の読み込みエラーにはしない

#### 既存データの移行

- `lineDB.csv`: 新しい列構成に書き換える（京浜東北線・山手線: 事業者 `JR東日本`、路線アイコン `I_JR_east`、ナンバリングアイコン `N_JR_east`）
- `transferDB.csv`: ヘッダー行のみで新規作成する（既存データの京浜東北線・山手線は同じ駅IDを共有しているため、乗換エッジは不要）

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `public/csv/presetLines/lineDB.csv` | 列構成を変更し既存データを移行 |
| `public/csv/presetLines/transferDB.csv` | 新規（ヘッダーのみ） |
| `app/modules/loadStationPresets.ts` | `PresetLine` の列変更、`PresetTransfer` と `loadTransferDB()` を追加 |
| `app/components/StationPresetPopup.tsx` | `transfers` の読み込み、`numIcon` のプリセットキーを路線から設定、`iconDict` の `presetType` を `iconPresetKey` に変更 |
| `app/components/StationPresetMap.tsx` | 乗換エッジを点線で描画 |

#### 今回の対象外（今後の検討事項）

全国データ規模での速度・操作性の改善は別途仕様化する。

- 駅・路線の検索を `Map` による索引にする、CSV の読み込み結果をキャッシュする
- 駅名のインクリメンタル検索、事業者 → 路線の2階層の路線選択
- 路線図のズーム・パン、画面内のみの描画、ズームに応じた駅名表示（または Canvas・地図ライブラリへの移行） → 7.21節で対応
- 乗換エッジを使った乗換案内（`transfers`）の自動設定

### 7.21 駅プリセット — 路線図の作り直し（ドラッグ移動・ズーム）

7.19節の路線図は、全駅を固定サイズ（緯度方向 1500px）の SVG に描き、スクロールバーで動かしていた。全国データ（約9,000駅）では、駅が重なって選べない・描画が重いため、表示と操作を作り直す。区間選択のルール（ハイライト、区間の決定、`onSelect` の形式）は 7.19節から変更しない。

#### 方針

- 描画は SVG のまま、**画面座標で直接描く**（SVG 全体を拡大縮小するのではなく、表示中の倍率で各駅の画面位置を計算して描く）。これにより、ズームしても駅ノードの大きさ・駅名の文字サイズ・線の太さは一定になる
- スクロールバーは使わない。コンテナは `overflow: hidden` とし、移動はドラッグ、拡大縮小はホイールとボタンで行う
- 画面外の駅は描画しない。ズームアウト時は駅ノード・駅名を省略して描画量を抑える

#### 座標系

- 駅の緯度経度を、**km 単位の平面座標（ワールド座標）**に変換する
  - x = (経度 − 基準経度) × 111.32 × cos(基準緯度)、y = (基準緯度 − 緯度) × 110.57（北が上）
  - 基準緯度・基準経度は全駅の範囲の中心とする。cos(基準緯度) を掛けることで、経度方向の伸び（東京付近で約1.2倍）を補正する
- 表示状態（ビュー）は次の3つで表す

| 値 | 意味 |
|---|---|
| `scale` | 倍率（1km あたりの画面 px） |
| `offsetX` / `offsetY` | 画面左上に来るワールド座標（km） |

- 画面座標 = (ワールド座標 − offset) × `scale`

#### 操作

| 操作 | 動作 |
|---|---|
| ドラッグ（マウス・ペン・1本指） | 路線図を移動する。空白部分だけでなく駅ノードや路線の上から始めてもよい |
| クリック（タップ） | 押してから離すまでの移動が **4px 未満**のときだけクリックとみなし、駅ノード上なら駅を選択する。4px 以上動いた場合はドラッグとみなし、駅は選択しない |
| マウスホイール | カーソル位置を中心に拡大縮小する（1目盛りで約1.2倍）。ポップアップ自体はスクロールさせない |
| ＋ / − ボタン | 表示の中心を基準に拡大縮小する（1.5倍） |
| 「全体表示」ボタン | 全駅が収まる倍率・位置に戻す |
| 「始点へ移動」ボタン | 始点駅が画面中央に来るよう移動する（倍率は変えない）。始点未選択のときは無効 |

- カーソルは通常 `grab`、ドラッグ中は `grabbing`、選択可能な駅ノード上は `pointer` とする
- ボタンは路線図の右上に重ねて表示する
- 2本指のピンチ操作による拡大縮小は 7.26節で対応した

#### 倍率の範囲と初期表示

| 項目 | 値 |
|---|---|
| 初期表示 | 全駅が余白 40px で収まる倍率・位置（「全体表示」と同じ） |
| 最小倍率 | 全体表示の倍率の 0.5 倍 |
| 最大倍率 | 400 px/km |

- コンテナの大きさは `ResizeObserver` で取得する。大きさが変わっても表示中の中心位置は保つ
- 始点駅の選択・区間の追加では表示位置を自動で動かさない

#### 描画の省略（ズームに応じた表示）

| 要素 | 表示条件 |
|---|---|
| 路線（折れ線） | 常に表示 |
| 乗換エッジ（点線） | 駅ノードを表示する倍率のとき |
| 駅ノード | 倍率が **15 px/km 以上**のとき。ただし始点駅は常に表示する |
| 駅名 | 倍率が **40 px/km 以上**のとき。ただし始点駅は常に表示する |

- 駅ノード・駅名・乗換エッジは、画面の外側（上下左右に 50px の余白を含めた範囲の外）にあるものを描画しない
- 路線は、駅の範囲（バウンディングボックス）が画面と重ならないものを描画しない
- 駅ノードを表示しない倍率では駅をクリックできない。この場合のガイダンス表示は変えない
- 閾値（15・40 px/km）は定数とし、実データを入れながら調整する

#### パフォーマンス上の工夫

- 駅のワールド座標、路線ごとの駅順・範囲は、データの読み込み時に1回だけ計算する（`useMemo`）
- ドラッグ・ホイール中の再描画は `requestAnimationFrame` で1フレームに1回までにまとめる
- ホイールは React の `onWheel` ではなく `addEventListener('wheel', …, { passive: false })` で登録する（ページのスクロールを止めるため）

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/StationPresetMap.tsx` | 座標系・ドラッグ移動・ズーム・描画の省略を実装。`MAP_HEIGHT`・`LABEL_SPACE` とスクロールバーによる表示を廃止 |
| `app/components/StationPresetPopup.tsx` | 変更なし（`StationPresetMap` の Props は変えない） |

### 7.22 駅プリセット — 路線図の並走区間の平行描画

田端〜品川の京浜東北線・山手線のように、同じ2駅間を複数の路線が通る区間（並走区間）では、これまで折れ線が重なって1本に見えていた。これを路線ごとに横にずらした平行線で描き、駅ノードは並んだ線をまとめて覆うカプセル型にする。描画だけの変更で、データ・区間選択のルール・ハイライトの条件は変えない。

#### 並走区間の検出

- 各路線の駅順で隣り合う2駅（座標のある駅どうし）を**辺**とする
- 同じ2駅を結ぶ辺を、向きを問わず1つの**辺グループ**にまとめる。グループ内の路線は路線IDの数値順に並べる（同じ路線が同じ辺を2回通る場合は1本として数える）
- グループの**基準方向**は、グループ内で路線IDが最も小さい路線がその辺を進む向きとする。並走が続く区間ではこの路線が連続して通るため、区間の途中で左右が入れ替わらない

#### 線のずらし方

- グループ内の路線数を n、並び順を k（0 始まり）とすると、路線 k のずらし量は **(k − (n − 1) / 2) × 6px**（画面上の px で一定。ズームしても変わらない）
  - 例: 2本なら −3px と +3px、3本なら −6px・0・+6px。線の太さ（6px）と同じ間隔なので、線どうしは隙間なく接する
- ずらす向きは基準方向に垂直な向き（基準方向を時計回りに90°回した向きを正）とする。路線自身の進行方向には依存しない
- 路線の折れ線の各頂点は次のように決める
  - 始点・終点: 駅の位置を、接する辺のずらし量だけずらした点
  - 途中の駅: 前後の辺のずらし量が同じ（ずらし量 0 を除く）で、かつ前後の辺の垂直方向のなす角が 90° 未満の場合は、ずらした2本の線の交点（マイター）とする（90° 以上の場合は折り返しに近いか、前後で基準方向が逆向きのため、下記の中間点とする）。ただし折れ角が鋭く交点が遠くなりすぎる場合は、ずらし量の2倍の距離までに抑える。前後でずらし量が異なる場合（並走の本数が変わる駅など）は、前後の辺でずらした点の中間とする
- 駅ノードを表示しない倍率（縮小時）でも、ずらしたまま描画する

#### 駅ノードの形

| 条件 | 形 |
|---|---|
| その駅に接する辺グループの路線数の最大値が1以下 | 従来どおり半径 7px の丸 |
| 最大値 m が2以上 | **カプセル型**（両端が半円の長方形）。太さ 14px、長さ (m − 1) × 6px + 14px。長手方向は、路線数が最大の辺グループの基準方向に垂直な向き（＝線を並べた向き） |

- カプセルの中心は駅の位置とする（線のずらしは中心に対して対称なので、並んだ線がカプセルに収まる）
- 色・枠線・不透明度のルールは丸の場合と同じ（始点＝オレンジ、選択可能＝白、それ以外＝グレーアウト）
- クリック判定を広げる透明な領域も、同じ向きのカプセル（各辺 6px 拡大）とする
- 駅名はノードの右端のさらに 3px 右に表示する
- 乗換エッジ（点線）は従来どおり駅の位置どうしを結ぶ

#### 既知の制約

- 路線の並び順は路線IDの順で固定のため、分岐・合流の前後で線どうしが交差して見えることがある。交差が最小になる並び順の自動決定は今回の対象外とする
- ずらし量は画面上で一定のため、大きく縮小すると近くの駅・路線と重なって見えることがある

#### パフォーマンス

- 辺グループ・各辺の向き（単位ベクトル）・ずらし量・駅ノードの形は、データの読み込み時に1回だけワールド座標で計算する（`useMemo`）。描画のたびに行うのは画面座標への変換とずらし量の加算のみ

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/StationPresetMap.tsx` | 並走区間の検出、平行線の描画、カプセル型の駅ノードを実装 |

### 7.23 駅プリセット — 路線図のルート選択ポップアップ

路線図で次の駅をクリックしたとき、始点駅からその駅までのルートが複数ある場合は、自動で1つに決める（7.19節の「区間の駅数が最少」の規則）のをやめ、ポップアップでユーザーに選ばせる。

例:
- 田端 → 品川: 京浜東北線、山手線（駒込経由）、山手線（西日暮里経由）の3通り
- 新宿 → 渋谷: 山手線（代々木経由）、山手線（新大久保経由）の2通り

#### ルート候補の列挙

始点駅を通る選択可能な路線（`activeLineIds`）それぞれについて、始点駅から対象駅までのルートを列挙する。

- **環状線以外の路線**: 駅順リストで始点駅の位置 i と対象駅の位置 j の組（i ≠ j）ごとに、i から j までの1区間を候補とする（6の字の路線のように同じ駅が2回現れる場合は、組の数だけ候補になる）
- **環状線**（駅順リストの先頭と末尾が同じ駅で、駅数が3以上の路線）: 輪を時計回り・反時計回りの両方向にたどる2つのルートを候補とする
  - 継ぎ目（末尾の位置 L と先頭の位置 0。同じ駅を指す）をまたがないルートは1区間で表す
  - 継ぎ目をまたぐルートは、継ぎ目で分けた**同じ路線の2区間**で表す（例: 山手線の新宿 → 新大久保 → … → 東京 → … → 渋谷 は「新宿 → 東京（位置 L）」「東京（位置 0）→ 渋谷」）
  - 始点駅・対象駅のどちらかが継ぎ目の駅の場合は、継ぎ目をまたがずに済む側の位置（0 または L）を使い、1区間で表す
- 同じ路線で通る駅の並びが完全に同じ候補は1つにまとめる

候補が1つだけの場合は、従来どおりポップアップを出さずにそのまま追加する。候補が0の場合は何もしない。

#### ルート候補の並び順

1. ルートに含まれる駅数が少ない順
2. 同数の場合は路線IDの数値順
3. さらに同数の場合は始点駅の位置が小さい順

#### ルート選択ポップアップ

- 路線図の領域の中央に重ねて表示する。表示中は背後の路線図を操作できない（半透明の背景で覆う）
- タイトル: 「「{始点駅名}」→「{対象駅名}」のルートを選択」
- 候補を1行ずつボタンとして列挙する。表示形式は **`[ナンバリング記号][路線名] 次駅：[始点駅の次の駅] 中間駅数：[中間駅の数]`**
  - ナンバリング記号は `lineDB` の路線記号。路線カラーの枠で囲んだ小さなバッジとして表示する。路線記号が空の場合はバッジを出さない
  - 次駅は、そのルートで始点駅の次に停まる駅（駅順で隣の駅）の駅名
  - 中間駅数は、そのルートで始点駅と対象駅の間にある駅の数（両端を含まない。環状線の継ぎ目の駅は1駅として数える）
  - 例（田端 → 品川）: `[JK]京浜東北線 次駅：西日暮里 中間駅数：13`、`[JY]山手線 次駅：西日暮里 中間駅数：13`、`[JY]山手線 次駅：駒込 中間駅数：15`
- 候補をクリックすると、そのルートの区間を追加一覧に追加し、対象駅を新しい始点駅にしてポップアップを閉じる
- 「キャンセル」ボタン、または半透明の背景のクリックで、何も追加せずに閉じる（始点駅は変わらない）

#### 追加一覧の単位（ルート）

継ぎ目をまたぐルートは2区間になるため、追加一覧の要素を「区間」から「**ルート**（1つ以上の区間のまとまり）」に変更する。

```typescript
// 追加一覧の1要素。通常は区間1つ、環状線の継ぎ目をまたぐ場合は同じ路線の区間2つ
type StagedRoute = {
    sections: StationSection[]
    // ルート選択ポップアップで選んだ場合の次駅名（追加一覧の表示に使う）
    nextStationName?: string
}
```

| 項目 | 変更内容 |
|---|---|
| `stagingList` | `StationSection[]` → `StagedRoute[]` |
| リストUIでの駅クリック | 区間1つのルートとして追加する（動作は従来と同じ） |
| 「戻る」ボタン | 末尾の**ルート**を丸ごと削除する。前駅は、残った末尾ルートの最後の区間の `nextIndex` の駅に戻す |
| 追加一覧の表示 | 1ルート1行。`前駅名 → 次駅名（路線名） 中間駅数：{中間駅の数}`。前駅名はルートの最初の区間の始点、次駅名は最後の区間の終点。`nextStationName` がある場合は `前駅名 → 次駅名（路線名・次駅：{nextStationName}） 中間駅数：{中間駅の数}` とする。中間駅数の数え方はルート選択ポップアップと同じで、リストUIで追加したルートにも表示する |
| 「追加」ボタン | 全ルートの区間を順に並べたものを従来の駅抽出処理に渡す |

#### 駅抽出処理の変更（環状線の継ぎ目）

継ぎ目をまたぐルートでは、「新宿 → 東京（位置 L）」の終点と「東京（位置 0）→ 渋谷」の始点が同じ駅になる。従来の処理ではこれを「路線が変わる接続駅」とみなして `numIconNext` を設定してしまうため、次のように変更する。

- 連続する2区間の接続駅が同じ駅IDで、かつ**2区間の路線IDが同じ**場合は、1行に統合するだけとし、`numIconNext` と `lineId` は変更しない
- 路線IDが異なる場合は従来どおり（`numIconNext` に次の路線のナンバリングを設定し、`lineId` を次の路線で上書きする）

#### コンポーネント間のインターフェース変更

`StationPresetMap` の `onSelect` を、区間の配列を渡す形に変更する。

```typescript
// 変更前
onSelect: (lineId: string, prevIndex: number, nextIndex: number, station: PresetStation) => void
// 変更後: 始点駅の選択時は sections が空配列
onSelect: (sections: StationSection[], station: PresetStation, nextStationName?: string) => void
```

- `StationSection` 型・`StagedRoute` 型は、両コンポーネントから使えるよう `app/modules/loadStationPresets.ts` に移して export する（コンポーネント同士の相互 import を避けるため）
- ルート候補の列挙・ルート選択ポップアップの表示は `StationPresetMap` が担当する

#### 対象外

- リストUI（路線 → 駅の選択）は変更しない。リストUIでは環状線の継ぎ目をまたぐルートは選べない（従来どおり）
- 追加済みのルートを路線図上で強調表示する機能は今回の対象外とする

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/StationPresetMap.tsx` | ルート候補の列挙（環状線の両方向を含む）、ルート選択ポップアップ、`onSelect` の形式変更 |
| `app/components/StationPresetPopup.tsx` | `stagingList` をルート単位に変更、「戻る」・追加一覧の表示・駅抽出処理（継ぎ目の統合）を変更 |
| `app/modules/loadStationPresets.ts` | `StationSection`・`StagedRoute` 型を定義して export |

### 7.24 駅プリセットデータ — 関東のJR線

駅プリセット（`public/csv/presetLines/`）に、関東地方の JR 東日本の在来線を全線登録する。コードの変更はなく、CSV データのみの変更である。

#### 収録方針

| 項目 | 方針 |
|---|---|
| 路線の分け方・路線名 | JR東日本「東京近郊路線図（車内掲出版）」の凡例の系統名に合わせる（4.10節「データ作成ルール」の「路線の単位」）。凡例で複数の系統をまとめた名前（例: 横須賀線・総武線快速）は、固有の区間ごとに分ける |
| 収録範囲 | 関東1都6県内の駅を通る JR 東日本の在来線を全線。県境を越える路線は関東内の最後の駅まで。ただし路線図に描かれている県外部分（熱海・伊東、中央線の甲府方面）は含める |
| 対象外 | 新幹線、JR東海の路線（御殿場線など）、JR以外の路線（りんかい線・相鉄線・東京モノレールなど） |
| 駅の同一性 | JR の駅は駅名が同じなら同じ駅（1つの駅ID）とする。JR同士で駅名が異なる駅の乗換（transferDB）は今回は登録しない |
| 駅ナンバリング | JR東日本の駅ナンバリングがある路線・駅のみ設定し、ない場合は空欄。同じ駅でも路線ごとに番号が異なる（例: 鎌倉は横須賀線 JO 07・湘南新宿ライン JS 07） |
| 路線アイコン・ナンバリングアイコン | 全路線 `I_JR_east`・`N_JR_east` |
| 路線カラー | 路線図の色に近い値を設定する |
| 緯度経度・かな・英語名 | 外部データは使わず、作成者の知識で作成する。緯度経度はおおよその値（駅の位置関係が分かる程度）で、誤りを含む可能性がある。英語名は JR東日本の表記に合わせる |
| 既存データ | 京浜東北線・山手線の既存データ（仮の座標）は破棄し、駅ID・路線IDも振り直す。駅IDは路線の登録順に初出の駅から 0 始まりで、路線IDも表の順に 0 始まりで振る |
| 駅順・ナンバリング・区間の確認 | 路線図と Wikipedia の各路線の記事で確認する |

#### 収録路線

| # | 路線名 | 区間 | 記号 | 備考 |
|---|---|---|---|---|
| 0 | 東海道線 | 東京〜熱海 | JT | |
| 1 | 伊東線 | 熱海〜伊東 | JT | 静岡県。路線図に掲載。東海道線から続く JT 22〜26（Wikipedia による） |
| 2 | 横須賀線 | 東京〜久里浜 | JO | 凡例「横須賀線・総武線快速」を分割 |
| 3 | 総武線快速 | 東京〜成田空港 | JO | 同上。千葉以東は総武本線・成田線（空港支線）を経由し、JO 29〜37 |
| 4 | 湘南新宿ライン | 逗子〜大宮 | JS | JS の付く区間（JS 06〜24） |
| 5 | 京浜東北線・根岸線 | 大宮〜大船 | JK | |
| 6 | 横浜線 | 東神奈川〜八王子 | JH | 凡例「横浜線・根岸線」の根岸線部分は京浜東北線・根岸線で表す |
| 7 | 相模線 | 茅ケ崎〜橋本 | | |
| 8 | 南武線 | 川崎〜立川 | JN | |
| 9 | 南武線（浜川崎支線） | 尻手〜浜川崎 | | 分岐線のため別路線 |
| 10 | 鶴見線 | 鶴見〜扇町 | JI | |
| 11 | 鶴見線（海芝浦支線） | 浅野〜海芝浦 | JI | 分岐線のため別路線 |
| 12 | 鶴見線（大川支線） | 安善〜大川 | JI | 分岐線のため別路線 |
| 13 | 山手線 | 東京〜（環状）〜東京 | JY | |
| 14 | 中央線快速 | 東京〜高尾 | JC | |
| 15 | 中央線 | 高尾〜韮崎 | CO | 山梨県部分は路線図の範囲（韮崎）まで。各駅の番号は高尾〜大月が JC 24〜32、初狩以西が CO 33〜（Wikipedia による） |
| 16 | 中央・総武線各駅停車 | 三鷹〜千葉 | JB | |
| 17 | 青梅線 | 立川〜奥多摩 | JC | |
| 18 | 五日市線 | 拝島〜武蔵五日市 | JC | |
| 19 | 八高線 | 八王子〜高崎 | | 凡例は高麗川で2系統に分かれるが、同じ線名で一続きのため1路線とする |
| 20 | 上野東京ライン | 東京〜上野 | JU | 固有の区間のみ。色・ナンバリングは高崎線と同じ |
| 21 | 宇都宮線 | 上野〜黒磯 | JU | 上野〜大宮は高崎線と並走 |
| 22 | 東北本線 | 黒磯〜豊原 | | 栃木県内の残り |
| 23 | 高崎線 | 上野〜高崎 | JU | |
| 24 | 埼京線 | 羽沢横浜国大〜大宮 | JA | 相鉄直通区間（羽沢横浜国大〜武蔵小杉〜西大井〜大崎）を含む |
| 25 | 川越線 | 大宮〜高麗川 | JA | 番号は大宮（JA 26）のみ。日進以西にはナンバリングがない |
| 26 | 常磐線快速 | 上野〜取手 | JJ | 凡例「常磐線快速・成田線」の成田線部分は #29 |
| 27 | 常磐線各駅停車 | 綾瀬〜取手 | JL | |
| 28 | 常磐線 | 取手〜大津港 | | 取手以北。茨城県内の最後の駅まで |
| 29 | 成田線（我孫子支線） | 我孫子〜成田 | | |
| 30 | 成田線 | 佐倉〜銚子 | | |
| 31 | 成田線（空港支線） | 成田〜成田空港 | | |
| 32 | 総武線 | 千葉〜銚子 | | 総武本線の千葉以東 |
| 33 | 東金線 | 大網〜成東 | | |
| 34 | 内房線 | 蘇我〜安房鴨川 | | |
| 35 | 外房線 | 千葉〜安房鴨川 | | |
| 36 | 久留里線 | 木更津〜上総亀山 | | 路線図には未掲載。久留里〜上総亀山は運休中・2027年4月廃止予定だが、現時点では路線として存在するため含める |
| 37 | 京葉線 | 東京〜蘇我 | JE | |
| 38 | 京葉線（高谷支線） | 市川塩浜〜西船橋 | JE | 武蔵野線直通。西船橋には JE の番号がないため空欄 |
| 39 | 京葉線（二俣支線） | 西船橋〜南船橋 | JE | 武蔵野線直通。西船橋は空欄（同上） |
| 40 | 武蔵野線 | 府中本町〜西船橋 | JM | |
| 41 | 上越線 | 高崎〜土合 | | 群馬県内の最後の駅まで |
| 42 | 吾妻線 | 渋川〜大前 | | 路線図には未掲載 |
| 43 | 信越線 | 高崎〜横川 | | 路線図には未掲載 |
| 44 | 両毛線 | 小山〜新前橋 | | |
| 45 | 水戸線 | 小山〜友部 | | |
| 46 | 日光線 | 宇都宮〜日光 | | |
| 47 | 烏山線 | 宝積寺〜烏山 | | 路線図には未掲載 |
| 48 | 水郡線 | 水戸〜下野宮 | | 路線図には未掲載。茨城県内の最後の駅まで |
| 49 | 水郡線（常陸太田支線） | 上菅谷〜常陸太田 | | 路線図には未掲載 |
| 50 | 鹿島線 | 香取〜鹿島神宮 | | 路線図には未掲載。鹿島サッカースタジアムは臨時駅のため含めない |

- 「要確認」の記号は、データ作成時に Wikipedia で確認して決める（ナンバリングがなければ空欄）
- 凡例の「中央線・地下鉄東西線直通」は固有の区間がないため路線を作らない（4.10節「他路線へ乗り入れる運行系統」）
- 凡例の「東京モノレール」は JR の路線ではないため対象外

#### 作成手順

- 路線ごとの駅データ（駅名・かな・英語名・緯度経度・駅ナンバリング）を `scripts/presetData/sources/*.json` に作成し、`scripts/presetData/build_presets.py` で駅IDを振って `stationDB.csv`・`lineDB.csv`・`lineConnectDB.csv` を生成する（7.33節）
- 生成後、駅順のつながり（隣の駅との距離が極端に離れていないか）と、同じ駅名の駅に同じ駅IDが振られているかを機械的に確認する

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `public/csv/presetLines/stationDB.csv` | 全面的に作り直し |
| `public/csv/presetLines/lineDB.csv` | 全面的に作り直し |
| `public/csv/presetLines/lineConnectDB.csv` | 全面的に作り直し |

### 7.25 駅プリセット — 路線図表示をデフォルトにする

駅プリセットのポップアップは路線図からの選択を主とし、リストからの選択を補助とする。

| 項目 | 変更前 | 変更後 |
|---|---|---|
| `StationList` のボタン名 | 駅プリセットから追加 | **路線図から追加** |
| ポップアップを開いたときの表示 | リストから選択 | **路線図から選択** |
| 切り替えボタンの並び | 「リストから選択」「路線図から選択」 | **「路線図から選択」「リストから選択」** |

- ポップアップのタイトルは 7.26節で「路線図から追加」に変更した
- 表示の切り替えはポップアップを開くたびに路線図に戻る（前回の選択は記憶しない）

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/StationList.tsx` | ボタン名を変更 |
| `app/components/StationPresetPopup.tsx` | `viewMode` の初期値を `'map'` に変更、切り替えボタンの順序を入れ替え |

### 7.26 スマホ（縦画面）対応 — エディタのセクション選択・路線図から追加

スマホの縦画面で操作しやすいよう、エディタのセクション選択と「路線図から追加」ポップアップのレイアウトを変える。「縦画面」は CSS の `@media (orientation: portrait)`（表示領域の高さ ≧ 幅）で判定する。横画面のレイアウトは変えない。

#### エディタのセクション選択（大項目の選択ボタン）

| 項目 | 横画面（従来） | 縦画面 |
|---|---|---|
| 配置 | メインエリアの左に縦1列（`.editor-sidebar`） | ヘッダーの下、メインエリアの上に**横1列** |
| 各ボタン | アイコンの下にキャプション | 同じ（アイコンの下にキャプション）。7つのボタンで横幅を等分する |
| はみ出す場合 | — | 横幅が足りないときはボタン列を横スクロールできる（折り返さない） |

- `.editor-layout` を縦並び（`flex-direction: column`）にし、`.editor-sidebar` を横並び（`flex-direction: row`）・幅いっぱいにする
- 縦画面ではボタン列はスクロールに追従しない（ページと一緒にスクロールする）

#### 「路線図から追加」ポップアップ

| 項目 | 横画面（従来） | 縦画面 |
|---|---|---|
| 路線図表示時の配置 | 「路線図」と「追加一覧」を左右に並べる | 「路線図」を**上**、「追加一覧」を**下**に並べる |
| 高さの割合 | — | 路線図：追加一覧 = **2：1** |
| リスト表示時の配置 | 「路線選択」「駅選択」「追加一覧」を左右に並べる | 変更しない |

- ポップアップのタイトルを「駅プリセットから追加」から「**路線図から追加**」に変更する（縦横とも）

#### 路線図の2本指操作（ピンチ）

7.21節の操作に、タッチ端末の2本指操作を追加する。

| 操作 | 動作 |
|---|---|
| 2本指で広げる・狭める | 2本の指の中点を中心に拡大縮小する。倍率の変化は指の間隔の変化に比例し、倍率の範囲（7.21節）を超えない |
| 2本指のまま動かす | 拡大縮小と同時に、中点の移動に合わせて路線図を移動する |
| 2本指から1本を離す | 残った指でそのままドラッグ移動を続けられる |

- 2本目の指が触れた時点で、その操作はクリックとみなさない（指を離しても駅は選択されない）
- 3本目以降の指は無視する
- 再描画は従来どおり `requestAnimationFrame` で1フレーム1回にまとめる

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/globals.css` | 縦画面用のメディアクエリ（セクション選択の横並び、ポップアップの上下配置） |
| `app/components/StationPresetPopup.tsx` | タイトル変更、上下配置用のクラス名を付与（従来のインラインの `flex` 指定をクラスへ移す） |
| `app/components/StationPresetMap.tsx` | 2本指のピンチ操作に対応（複数ポインタの追跡） |

### 7.27 エディタの設定データの自動読み込み・自動保存

スマホではブラウザが裏に回ったタブを破棄し、戻ったときに再読み込みすることが多い。そのため、表示画面（別タブ）からエディタのタブへ戻ると設定が初期値に戻ってしまっていた。これを防ぐため、`localStorage['lcdStrage']` を起動時に自動で読み込み、編集のたびに自動で保存する。

#### 起動時の自動読み込み

- `Editor` の初回表示時（マウント時）に `lcdStrage` を確認し、データがあれば読み込んで state に反映する
- 読み込み時の旧形式の正規化（マイグレーション）は、「LocalStorageから読み込み」ボタンと同じ処理を使う（処理を共通化する）
- データがない場合は初期値（`initSettingObject`）のまま。警告は出さない
- データが壊れていて読み込めない（JSON として解釈できない等）場合は、初期値のままにしてコンソールに警告を出す。保存済みデータは自動保存で上書きされないよう、読み込みに失敗した場合はそのセッションでは自動保存を行わない

#### 編集のたびの自動保存

- `setting` が変わるたびに `lcdStrage` へ保存する
- 連続した入力で書き込みが多発しないよう、最後の変更から **300ms** 後にまとめて保存する
- タブが裏に回るとき（`visibilitychange` で hidden、`pagehide`）は、保存待ちの内容を直ちに保存する
- 起動時の自動読み込みが終わるまでは保存しない（初期値で保存済みデータを上書きしないため）
- 保存に失敗した場合（容量超過など）はコンソールに警告を出す
- 「表示」ボタンを押したときの保存（従来どおり）はそのまま残す

#### 「LocalStorageから読み込み」ボタン

> 7.28節でこのボタンは削除した。以下は削除前の仕様。

- 残す（動作は従来どおり。データがない場合は警告を出す）
- 自動保存により通常は画面の内容と保存内容が一致するため、主に別タブで保存された内容を取り込むときに使う

#### 対象外

- エディタを複数のタブで同時に開いた場合、後から編集したタブの内容で上書きされる（タブ間の同期は行わない）

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/Editor.tsx` | 読み込み処理の共通化、起動時の自動読み込み、自動保存（300ms 遅延・タブが裏に回るときの即時保存） |

### 7.28 ヘッダーの整理（「表示」ボタンの移動・表示ツールバーの廃止）

画面上部の2段（タイトルのヘッダー＋表示ツールバー）を1段にまとめる。

| 要素 | 変更前 | 変更後 |
|---|---|---|
| ヘッダー（`.app-header`） | タイトル「LCDシミュレーター」のみ | タイトルの**右**に「表示」ボタン（`btn-primary`）を置く。ヘッダーは従来どおりスクロールに追従する（sticky） |
| 表示ツールバー（`.display-toolbar`） | 「LCDシミュレータ」「Controllerデバッグ」「デバッグ」「LocalStorageから読み込み」「表示」 | **削除**（「表示」以外の4つのボタンも削除する） |

- 「表示」ボタンの動作（`openDisplay`：設定を `lcdStrage` に保存して表示画面を別タブで開く）は変えない
- 削除したデバッグ画面（`/LcdSimulator/index.html`・`/Controller/index.html`・`/lcdDisplay/index.html`）は、URL を直接開けば従来どおり使える
- 「LocalStorageから読み込み」は、起動時の自動読み込み（7.27節）があるため削除する。読み込み処理（`normalizeLoadedSetting`）は起動時の自動読み込みで引き続き使う

#### 実装方針

- `Header` コンポーネントに「表示」ボタンのクリック時に呼ぶ `onDisplay` を props で渡す
- `openDisplay` と設定の state は `Editor` が持っているため、`Header` は `page.tsx` ではなく `Editor` の中で描画する
- `.display-toolbar` の CSS と `--header-height` 変数（表示ツールバーの位置決めにのみ使用）を削除する

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/Header.tsx` | タイトルの右に「表示」ボタンを追加（`onDisplay` を受け取る） |
| `app/components/Editor.tsx` | `Header` を描画し、表示ツールバーと「LocalStorageから読み込み」の処理を削除 |
| `app/page.tsx` | `Header` の描画を削除（`Editor` 内で描画するため） |
| `app/globals.css` | `.display-toolbar` と `--header-height` を削除 |

### 7.29 駅プリセットデータ — JR東海の在来線

駅プリセットに、JR東海（東海旅客鉄道）の在来線を全線登録する。作り方・ルールは 7.24節（関東のJR線）と同じで、以下の点だけが異なる。コードの変更はなく、CSV データのみの変更である。

#### 収録方針（7.24節との違い）

| 項目 | 方針 |
|---|---|
| 収録範囲 | JR東海の在来線の全線・全駅（県境で打ち切らない）。新幹線（東海道新幹線）は含めない。旅客駅のない区間（新垂井線）と、JR東海が列車を運行しない城北線は含めない |
| 事業者 | `JR東海` |
| 路線アイコン | `I_mono_color`（JR東海用の路線アイコンのプリセットがないため） |
| ナンバリングアイコン | `N_JR_central` |
| 路線記号・駅ナンバリング | JR東海の駅ナンバリング（CA〜CJ。CH は欠番）。ナンバリングはTOICAエリアを中心とした一部の駅のみのため、番号のない駅は空欄。ナンバリングが導入されていない路線（紀勢本線・参宮線・名松線・美濃赤坂線）は記号も空欄 |
| 路線名 | JR東海の正式な線名を使い、「本線」は省略しない（例: 東海道本線、関西本線）。JR東日本の「東海道線」「中央線」と区別できる |
| 路線カラー | JR東海のラインカラー（Wikipedia「日本の鉄道ラインカラー一覧」に載っている、JR東海のプレスリリース準拠の値）。ラインカラーのない路線（紀勢本線・参宮線・名松線）は作成者が決める |
| 駅の同一性 | 7.24節と同じく、JR の駅は駅名が同じなら同じ駅ID とする。JR東日本と共用の駅（熱海・国府津・甲府）は既存の駅IDを使う。ただし、離れた場所にある別の駅が同じ駅名の場合は別の駅ID にする（両毛線の富田〔栃木県〕と関西本線の富田〔三重県〕。駅名はどちらも「富田」のまま） |
| 既存データ | 関東のJR線（路線ID 0〜50、駅ID 0〜666）は変更しない。JR東海の路線は路線ID 51 から、新しい駅は駅ID 667 から振る |

#### 収録路線

| # | 路線名 | 区間 | 記号 | 備考 |
|---|---|---|---|---|
| 51 | 東海道本線 | 熱海〜米原 | CA | CA 00〜83 |
| 52 | 東海道本線（美濃赤坂支線） | 大垣〜美濃赤坂 | | 分岐線のため別路線 |
| 53 | 御殿場線 | 国府津〜沼津 | CB | |
| 54 | 身延線 | 富士〜甲府 | CC | 番号は富士〜西富士宮のみ |
| 55 | 飯田線 | 豊橋〜辰野 | CD | 番号は豊橋〜豊川のみ |
| 56 | 武豊線 | 大府〜武豊 | CE | |
| 57 | 中央本線 | 名古屋〜塩尻 | CF | 番号は名古屋〜中津川と一部の駅のみ |
| 58 | 関西本線 | 名古屋〜亀山 | CJ | |
| 59 | 高山本線 | 岐阜〜猪谷 | CG | 番号は岐阜〜美濃太田と一部の駅のみ |
| 60 | 太多線 | 多治見〜美濃太田 | CI | |
| 61 | 紀勢本線 | 亀山〜新宮 | | ナンバリングなし |
| 62 | 参宮線 | 多気〜鳥羽 | | ナンバリングなし |
| 63 | 名松線 | 松阪〜伊勢奥津 | | ナンバリングなし |

- 各路線の駅順・駅ナンバリング・ラインカラーは、データ作成時に Wikipedia で確認する

#### 作成手順

- 7.24節と同じ作業用スクリプトで、関東のJR線のデータに JR東海の路線を加えて CSV 3種を生成し直す（既存の路線ID・駅IDが変わらないことを確認する）
- 同じ駅名なのに座標が大きく離れている駅（別の駅が同名になっている可能性）がないかを機械的に確認する

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `public/csv/presetLines/stationDB.csv` | JR東海の駅を追加 |
| `public/csv/presetLines/lineDB.csv` | JR東海の路線（ID 51〜63）を追加 |
| `public/csv/presetLines/lineConnectDB.csv` | JR東海の路線の駅順を追加 |

### 7.30 駅プリセットデータ — JR西日本の在来線

駅プリセットに、JR西日本（西日本旅客鉄道）の在来線を全線登録する。作り方は 7.24節・7.29節と同じで、以下の点が異なる。コードの変更はなく、CSV データのみの変更である。

#### 収録方針（7.24節・7.29節との違い）

| 項目 | 方針 |
|---|---|
| 収録範囲 | JR西日本の在来線の全線・全駅。新幹線は含めない。博多南線（新幹線の設備を使うが在来線扱い）は含める。廃止された三江線は含めない。運休中の路線（美祢線など）は、路線として存在する限り含める |
| 事業者 | `JR西日本` |
| 路線アイコン・ナンバリングアイコン | `I_JR_west`・`N_JR_west` |
| 路線の分け方・路線名 | JR西日本の**案内上の愛称**と**路線記号**の区間ごとに1路線とする（例: 東海道本線は「琵琶湖線」「JR京都線」「JR神戸線」に分ける）。愛称のない区間は JR西日本の案内どおり「本線」を省いた線名を使う（例: 山陽本線 → 山陽線、山陰本線 → 山陰線）。分岐線も案内上の名前を使う（例: 和田岬線、羽衣線）。記号・色が区間で変わる路線（山陽線・山陰線・赤穂線など）は、その区間ごとに別の路線にする（同じ路線名の路線が複数できる） |
| 路線記号 | JR西日本の路線記号（アルファベット1文字）。地域ごとに振られているため、同じ記号が別の地域の別の路線を指すことがある（例: A は琵琶湖線などと山陰本線〔城崎温泉〜米子〕） |
| 駅ナンバリング | 駅番号のある駅のみ。JR西日本の表記「JR-A31」は、記号「A」・番号「31」として `A 31` の形式で登録する。番号のない駅は空欄 |
| 路線カラー | Wikipedia「日本の鉄道ラインカラー一覧」の JR西日本の値（色1）。ラインカラーのない路線は作成者が決める |
| 駅の同一性 | 7.24節と同じく、JR の駅は駅名が同じなら同じ駅ID とする（JR東海との境界駅の米原・亀山・新宮・猪谷、JR東日本との境界駅の南小谷・糸魚川なども同じ駅ID）。離れた場所にある別の駅が同じ駅名の場合は別の駅ID にする |
| 既存データ | 既存の路線ID（0〜63）・駅ID（0〜1066）は変更しない。JR西日本の路線は路線ID 64 から振る |

#### 収録路線

| # | 路線名 | 区間 | 記号 | 備考 |
|---|---|---|---|---|
| 64 | 北陸線 | 米原〜敦賀 | A | 愛称なし。記号は琵琶湖線と同じ A |
| 65 | 琵琶湖線 | 米原〜京都 | A | 東海道本線 |
| 66 | JR京都線 | 京都〜大阪 | A | 東海道本線 |
| 67 | JR神戸線 | 大阪〜姫路 | A | 東海道本線・山陽本線 |
| 68 | 山陽線 | 姫路〜上郡 | A |  |
| 69 | 和田岬線 | 兵庫〜和田岬 |  | 分岐線 |
| 70 | 赤穂線 | 相生〜播州赤穂 | A |  |
| 71 | 湖西線 | 山科〜近江塩津 | B |  |
| 72 | 草津線 | 柘植〜草津 | C |  |
| 73 | 奈良線 | 京都〜木津 | D |  |
| 74 | 嵯峨野線 | 京都〜園部 | E | 山陰本線 |
| 75 | 山陰線 | 園部〜城崎温泉 | E |  |
| 76 | おおさか東線 | 新大阪〜久宝寺 | F |  |
| 77 | JR宝塚線 | 尼崎〜篠山口 | G | 福知山線 |
| 78 | 福知山線 | 篠山口〜福知山 | G |  |
| 79 | JR東西線 | 尼崎〜京橋 | H |  |
| 80 | 学研都市線 | 京橋〜木津 | H | 片町線 |
| 81 | 加古川線 | 加古川〜谷川 | I |  |
| 82 | 播但線 | 姫路〜和田山 | J |  |
| 83 | 姫新線 | 姫路〜新見 | K |  |
| 84 | 舞鶴線 | 綾部〜東舞鶴 | L |  |
| 85 | 大阪環状線 | 大阪〜（環状）〜大阪 | O |  |
| 86 | JRゆめ咲線 | 西九条〜桜島 | P | 桜島線 |
| 87 | 大和路線 | JR難波〜加茂 | Q | 関西本線 |
| 88 | 関西線 | 加茂〜亀山 | V |  |
| 89 | 阪和線 | 天王寺〜和歌山 | R |  |
| 90 | 羽衣線 | 鳳〜東羽衣 |  | 分岐線 |
| 91 | 関西空港線 | 日根野〜関西空港 | S |  |
| 92 | 和歌山線 | 王寺〜和歌山 | T |  |
| 93 | 万葉まほろば線 | 奈良〜高田 | U | 桜井線 |
| 94 | きのくに線 | 和歌山〜新宮 | W | 紀勢本線 |
| 95 | 紀勢線 | 和歌山〜和歌山市 |  | 愛称・記号なし |
| 96 | 小浜線 | 敦賀〜東舞鶴 |  |  |
| 97 | 九頭竜線 | 越前花堂〜九頭竜湖 |  | 越美北線 |
| 98 | 七尾線 | 津幡〜和倉温泉 |  |  |
| 99 | 城端線 | 高岡〜城端 |  |  |
| 100 | 氷見線 | 高岡〜氷見 |  |  |
| 101 | 高山線 | 猪谷〜富山 |  | JR西日本区間 |
| 102 | 大糸線 | 南小谷〜糸魚川 |  | JR西日本区間 |
| 103 | 山陽線 | 上郡〜岡山 | S |  |
| 104 | 山陽線 | 岡山〜福山 | W |  |
| 105 | 山陽線 | 福山〜糸崎 | X |  |
| 106 | 赤穂線 | 播州赤穂〜東岡山 | N |  |
| 107 | 津山線 | 岡山〜津山 | T |  |
| 108 | 桃太郎線 | 岡山〜総社 | U | 吉備線 |
| 109 | 伯備線 | 倉敷〜伯耆大山 | V |  |
| 110 | 瀬戸大橋線 | 岡山〜児島 | M | 宇野線・本四備讃線 |
| 111 | 宇野みなと線 | 茶屋町〜宇野 | L | 宇野線 |
| 112 | 福塩線 | 福山〜塩町 | Z |  |
| 113 | 山陰線 | 城崎温泉〜米子 | A |  |
| 114 | 山陰線 | 米子〜益田 | D |  |
| 115 | 因美線 | 鳥取〜東津山 | B |  |
| 116 | 境線 | 米子〜境港 | C |  |
| 117 | 木次線 | 宍道〜備後落合 | E |  |
| 118 | 山陽線 | 糸崎〜広島 | G |  |
| 119 | 山陽線 | 広島〜岩国 | R |  |
| 120 | 呉線 | 三原〜海田市 | Y |  |
| 121 | 可部線 | 横川〜あき亀山 | B |  |
| 122 | 芸備線 | 備中神代〜広島 | P | 広島エリア以外の区間も含めて1路線 |
| 123 | 山陽線 | 岩国〜下関 |  | 記号なし |
| 124 | 山陰線 | 益田〜幡生 |  | 記号なし |
| 125 | 山陰線（仙崎支線） | 長門市〜仙崎 |  | 分岐線 |
| 126 | 岩徳線 | 岩国〜櫛ケ浜 |  |  |
| 127 | 山口線 | 新山口〜益田 |  |  |
| 128 | 宇部線 | 新山口〜宇部 |  |  |
| 129 | 小野田線 | 居能〜小野田 |  |  |
| 130 | 小野田線（本山支線） | 雀田〜長門本山 |  | 分岐線 |
| 131 | 美祢線 | 厚狭〜長門市 |  | 災害により運休中だが路線として存在するため含める |
| 132 | 博多南線 | 博多〜博多南 |  |  |

- 正式な線名との対応は備考に書いた。区間の端の駅・記号・番号は、データ作成時に Wikipedia で確認して必要なら修正する
- 離れた場所にある同じ駅名の別の駅は、別の駅ID にした（駅名は同じまま）: 大久保（JR神戸線）、柏原（JR宝塚線・福知山線／大和路線。東海道本線の柏原とも別）、野崎（学研都市線）、滝（加古川線）、三郷（大和路線）、橋本（和歌山線）、上道（境線）、横川（山陽線・可部線）、下松（山陽線）、戸田（山陽線）
- 駅番号は、Wikipedia で駅ごとの番号が確認できた区間のみ設定した。記号だけで駅番号のない区間（山陰エリア、加古川線・播但線・舞鶴線・姫新線・草津線・和歌山線・きのくに線など）は空欄
- 作成グループ間で座標が食い違った境界駅（猪谷・久宝寺・伯耆大山など）は、作成者の知識で位置を決め直した。このため、JR東海のデータの猪谷（駅ID 997）の座標も修正した

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `public/csv/presetLines/stationDB.csv` | JR西日本の駅を追加 |
| `public/csv/presetLines/lineDB.csv` | JR西日本の路線を追加 |
| `public/csv/presetLines/lineConnectDB.csv` | JR西日本の路線の駅順を追加 |

### 7.31 駅プリセット — 乗換路線の自動追加

「路線図から追加」で駅を追加するとき、ルート上の各駅に、その駅から出ている路線のうちルートで使っていない路線を、乗換路線（`stationType.transfers`）として自動で登録する。

#### 乗換路線にする路線

ルート上の各駅（`extractStationsFromSections` で生成する各行）について、次の路線を乗換路線にする。

1. **その駅を通る路線**: `lineConnectDB` でその駅の駅IDを含む全路線
2. **乗換エッジでつながった駅を通る路線**: `transferDB` でその駅とつながっている駅（別の駅ID）を含む全路線（現在のデータには乗換エッジがないため、実際にはまだ追加されない）

ただし、**その駅でルートが使っている路線**（その駅に到着する区間の路線と、その駅から出発する区間の路線）は除く。

- 路線は**路線ID**で区別する。路線名が同じでも路線IDが違えば別の路線として扱う（例: 山陽線〔岡山〜福山〕で福山に到着してルートが終わる場合、山陽線〔福山〜糸崎〕は乗換路線になる）
- 除くのは「その駅で」使っている路線のみ。ルートの別の駅で使っている路線でも、この駅で使っていなければ乗換路線になる（例: 東京 →〔中央線快速〕→ 新宿 →〔山手線〕→ 渋谷 の場合、東京では山手線が乗換路線になる）
- 同じ路線が同じ駅を2回通る場合（環状線の継ぎ目、6の字の路線）は1つにまとめる

#### ルートで使っている路線の、使っていない方向（「○○方面」）

その駅でルートが使っている路線でも、その駅から**ルートが進まない方向**が残っている場合は、その方向を乗換路線として追加する。

- 対象: ルートが使っている各路線について、その路線上でその駅の隣にある駅（前後の駅。環状線の継ぎ目や6の字の路線では、すべての出現位置の前後）のうち、ルートがその路線で行き来しない駅ごとに1件
- 名前: `[路線名]（[その方向の隣の駅名]方面）`（かな・英語も同様に、例: `とうかいどうほんせん（ふじかわほうめん）`、`Tokaido Main Line (for Fujikawa)`）
- 例
  - 熱海 →〔東海道本線〕→ 富士 →〔身延線〕→ 甲府: 富士で「東海道本線（富士川方面）」を追加する（身延線は富士が端の駅のため追加しない）。熱海では「東海道本線」の熱海より先の方向はないため追加しない
  - 新宿 →〔中央線快速〕→ 高尾: 始点の新宿で「中央線快速（四ツ谷方面）」を追加する
  - 中央線快速で新宿止まりのルート: 終点の新宿で「中央線快速（中野方面）」を追加する
- ルートの途中の駅で、同じ路線のまま通過する場合は前後とも使っているため追加しない
- その他の値（路線アイコン・ナンバリング・色・駅名など）は通常の乗換路線と同じ。並び順は、その路線の路線IDで並べる

#### 並び順

1. **自社の路線**を先頭にする。自社とは、その駅でルートが使っている路線の事業者（到着する区間の路線の事業者、次に出発する区間の路線の事業者の順）
2. 続いて、その他の事業者の路線を**事業者順**に並べる。事業者順は `lineDB` に事業者が初めて現れる順（現在のデータでは JR東日本 → JR東海 → JR西日本）
3. 同じ事業者の中では**路線IDの順**（登録順）

#### 登録する値（`transferItemType`）

| フィールド | 値 |
|---|---|
| `line.lineIconKey` | 乗換先の路線の路線記号アイコンの `iconDict` キー（1要素の配列）。ルートの路線と同じ規則（4.10節「`lineDict`・`iconDict` への解決」の手順1）で既存の `iconDict` から探し、なければ新規作成する。路線アイコンが空の路線は空配列 |
| `line.name` / `line.kana` / `line.eng` | 乗換先の路線名（日本語・かな・英語） |
| `station.isDraw` | 常に `false`（手動で追加する場合と同じ） |
| `station.type` | 乗換先の路線のナンバリングアイコン（`lineDB` の「ナンバリングアイコン」列） |
| `station.symbol` / `station.number` | 乗換先の路線での、その駅の駅ナンバリングをスペースで分けたもの（例: `JY 01` → `JY` と `01`）。ナンバリングがなければ空欄 |
| `station.color` | 乗換先の路線の色 |
| `station.name` / `station.eng` | その駅の駅名（日本語・英語）。乗換エッジでつながった駅の路線の場合は、つながった先の駅の駅名 |

- 乗換路線のためだけに `lineDict` へ路線を登録することはしない（`iconDict` のみ必要に応じて追加し、`onAdd` の `newIcons` で返す）
- 路線をまたぐ接続駅（1行に統合する駅）では、到着・出発の両方の路線を除いた残りを乗換路線にする

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/StationPresetPopup.tsx` | 駅抽出時に各駅でルートが使う路線を記録し、乗換路線を生成して `transfers` に設定。路線記号アイコンの解決処理を、乗換路線でも使えるよう分ける |

### 7.32 駅プリセット — 路線記号のない路線のアイコンを路線カラーの四角にする

路線記号（`lineDB` の「路線記号」列）が空の路線は、路線記号アイコンが作られず、路線の表示にアイコンが出なかった。これを、路線カラーで塗った四角のアイコンにする。

#### データの変更（`lineDB.csv`）

- 路線記号が空の路線（現在46路線: 相模線・八高線・東北本線・常磐線・成田線〔3路線〕・総武線・東金線・内房線・外房線・久留里線・上越線・吾妻線・信越線・両毛線・水戸線・日光線・烏山線・水郡線〔2路線〕・鹿島線・東海道本線〔美濃赤坂支線〕・紀勢本線・参宮線・名松線・和田岬線・羽衣線・紀勢線・小浜線・九頭竜線・七尾線・城端線・氷見線・高山線・大糸線・山陽線〔岩国〜下関〕・山陰線〔益田〜幡生・仙崎支線〕・岩徳線・山口線・宇部線・小野田線〔2路線〕・美祢線・博多南線）の「路線アイコン」列を **`I_mono_color`**（路線カラーで塗った四角。文字は描かない）にする
- 路線記号のある路線の「路線アイコン」列は変えない

#### コードの変更（`StationPresetPopup.tsx`）

- 路線記号アイコンの解決（`resolveIconKey`）で、路線記号が空でも路線アイコンがあれば `iconDict` にアイコンを作る（`{ presetType: "I_mono_color", symbol: "", color: 路線カラー }`）。同じ色の四角は1つの `iconDict` エントリにまとめる（既存の完全一致による再利用と同じ）
- 路線（`lineDict`）の `lineIconKey` と、乗換路線（`transfers`）の `line.lineIconKey` の両方に適用される

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `public/csv/presetLines/lineDB.csv` | 路線記号が空の路線の「路線アイコン」列を `I_mono_color` に変更 |
| `app/components/StationPresetPopup.tsx` | 路線記号が空でも路線アイコンを作成する |

### 7.33 駅プリセットの生成スクリプトと元データ

駅プリセットのCSVは手で編集せず、元データから生成スクリプトで作る。これまで一時フォルダにあった元データとスクリプトをリポジトリに置く。

| パス | 内容 |
|---|---|
| `scripts/presetData/sources/*.json` | 路線ごとの元データ（事業者ごとに分割: `jr_east_*.json`・`jr_central_*.json`・`jr_west_*.json`）。各路線は路線ID（`no`）・路線名・かな・英語名・色・路線記号と、駅の並び（駅名・かな・英語名・緯度経度・駅ナンバリング）を持つ |
| `scripts/presetData/build_presets.py` | 元データを統合して `public/csv/presetLines/` の `stationDB.csv`・`lineDB.csv`・`lineConnectDB.csv` を生成する |

#### 使い方

```bash
python scripts/presetData/build_presets.py            # public/csv/presetLines/ に上書き
python scripts/presetData/build_presets.py <出力先>   # 別の場所に出力（確認用）
```

#### 生成スクリプトの処理

- 路線ID 順に路線を並べ、初めて現れた駅から駅IDを振る（既存の路線ID・駅IDを変えないよう、路線は末尾にのみ追加する）
- 事業者・路線アイコン・ナンバリングアイコンは路線IDの範囲で決める。路線記号のない路線の路線アイコンは `I_mono_color`
- 事業者ごとのプリセットがない場合の代用: 路線アイコンは `I_mono_color`（路線カラーの四角）、ナンバリングアイコンは `N_JR_east`。例: JR東海は路線アイコンのプリセットがないため `I_mono_color`、ナンバリングアイコンは専用の `N_JR_central` を使う。事業者ごとのプリセットができたら差し替える
- 手動の補正（ユーザー指定のナンバリング・色、同名の別駅の区別、作成時に食い違った駅の座標の統一など）はスクリプト内に記述する
- 次の点を機械的に確認して警告を出す: 同名駅の座標・かな・英語名の食い違い、駅ナンバリングの書式、隣駅との距離（0.2km 未満・12km 超）、大きな遠回り
- 生成前の CSV と比べ、既存の行が変わっていないか（追加のみか）を報告する
- 改行コードは OS 標準（Windows では git の改行変換に合わせて CRLF）

### 7.34 駅プリセット — リストからの選択を廃止し路線図のみにする

「路線図から追加」ポップアップの選択方法を路線図のみにする。

| 項目 | 変更前 | 変更後 |
|---|---|---|
| 選択方法 | 「路線図から選択」「リストから選択」を切り替え | **路線図からの選択のみ** |
| 切り替えボタン | 「路線図から選択」「リストから選択」 | **削除** |
| 画面構成 | 路線図表示時は「路線図」「追加一覧」、リスト表示時は「路線選択」「駅選択」「追加一覧」 | 「路線図」と「追加一覧」のみ（横画面は左右、縦画面は上下 2:1 の配置は 7.26節のまま） |
| ポップアップの幅 | 表示方法によって切り替え | 常に路線図表示時の幅（`min(1100px, 95vw)`） |
| ガイダンステキスト | 表示方法ごとに切り替え | 路線図用のみ（「路線図から開始駅を選択してください」「「{始点駅名}」からハイライトされた駅を選択してください」） |

#### 削除するもの（`StationPresetPopup.tsx`）

- 表示切り替えの state（`viewMode`）と切り替えボタン
- リスト選択用の state・処理: `selectedLineId`、路線選択リストの絞り込み（`filteredLines`）、選択中路線の駅リスト（`lineConnectsForLine`・`stationsForLine`）、`handleLineClick`、`handleStationClick`、`isPrevStation`、リスト選択用のガイダンステキスト
- 路線選択リスト・駅選択リストの描画

#### 残すもの

- 追加一覧（`stagingList`）・始点駅（`prevStation`）・「戻る」「追加」・駅抽出処理（`extractStationsFromSections`）・乗換路線の自動登録は変更しない
- 縦画面用のクラス（`preset-popup-body--map` など）は、常に路線図表示として適用する

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `app/components/StationPresetPopup.tsx` | リスト選択と表示切り替えを削除 |

### 7.35 駅プリセット — 事業者単位の駅の区別と乗換エッジの生成

私鉄を含めた全国の路線を登録できるよう、駅を同じとみなすルールを事業者単位に変え、乗換エッジ（`transferDB.csv`）を生成スクリプトで作る。

#### 駅の区別（生成スクリプト）

- 駅は **「事業者＋駅名」** で区別する。事業者が違えば、駅名が同じでも別の駅ID にする（例: JR東日本の新宿と京王電鉄の新宿は別の駅）
- **共同使用駅**（複数の事業者が駅施設を共有する駅）は、設定ファイルで明示したものだけ同じ駅ID にする（例: JR東日本と JR東海の熱海）
- 同じ事業者で同じ駅名の別の駅（例: 両毛線と関西本線の富田は別事業者のため自動的に別の駅だが、同じ事業者内で同名の別駅がある場合）は、従来どおり区別の指定（`DISTINCT`）で別の駅ID にする
- 既存の JR 3社のデータは、事業者をまたいで同じ駅ID になっている駅（熱海・国府津・甲府・米原・亀山・新宮・猪谷など、事業者の境界の駅）を共同使用駅として設定し、**既存の駅ID が変わらない**ことを生成時に確認する

#### 乗換エッジ（`transferDB.csv`）

- 乗換できる別の駅の組を **乗換グループ** として設定ファイルに書く（例: JR東日本の新宿・京王電鉄の新宿・小田急電鉄の新宿…）
- 生成スクリプトは、乗換グループごとに、グループ内の全駅を **1本の道（パス）** でつなぐ乗換エッジを作る。つなぐ順番は、駅間の距離の合計が最短になる順とする（駅数が8以下なら全通りを調べ、それより多い場合は近い駅から順につないでから入れ替えで改善する近似で決める）
  - 全ての駅どうしをつなぐことはしない。乗換エッジにループ（輪）はできない
- 乗換エッジは `transferDB.csv` に `駅ID1,駅ID2` の形で書き出す（駅ID の小さい方を駅ID1 にする）
- 現在の JR 3社のデータには、名前の違う別の駅どうしの乗換がないため、乗換グループは空から始める

#### 乗換グループの候補の作り方

- 主に **Wikidata の「乗換駅」（P833）** を使い、補助として **近くにある別の事業者の駅**（例: 300m 以内）を候補に挙げる
- 候補を一覧にして確認してから、乗換グループの設定ファイルに登録する（候補を自動で確定させることはしない）
- 候補を作るスクリプトは、私鉄の追加に合わせて用意する

#### 設定ファイル

| パス | 内容 |
|---|---|
| `scripts/presetData/sources/shared_stations.json` | 共同使用駅の一覧。1件は「同じ駅として扱う `事業者:駅名` の配列」 |
| `scripts/presetData/sources/transfer_groups.json` | 乗換グループの一覧。1件は「乗換できる駅の `事業者:駅名` の配列」 |

#### アプリ側の変更（乗換路線の自動登録）

- 7.31節の「乗換エッジでつながった駅を通る路線」は、乗換エッジが1本道でつながるため、**乗換エッジを端までたどって**グループ内の全ての駅を対象にする（1本先の駅だけを見ると、2本以上先の駅の路線が漏れるため）
- 路線図の乗換エッジの描画（7.19節）は変更しない

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `scripts/presetData/build_presets.py` | 駅の区別を事業者単位に変更、共同使用駅・乗換グループの読み込み、乗換エッジ（パス）の生成と `transferDB.csv` の書き出し |
| `scripts/presetData/sources/shared_stations.json` | 新規。既存の JR 3社の境界の駅を登録 |
| `scripts/presetData/sources/transfer_groups.json` | 新規（空） |
| `app/components/StationPresetPopup.tsx` | 乗換路線の自動登録で、乗換エッジを端までたどる |

### 7.36 駅プリセット — Wikidata による座標の差し替え

駅の座標は、これまで作成者の知識によるおおよその値だった（JR東日本の関東の駅では、Wikidata と比べて中央値 0.49km、2km 以上ずれた駅が約1割）。これを Wikidata の座標に差し替える。Wikidata のデータは CC0（パブリックドメイン相当）のため、クレジット表記は不要。

#### 取得（`scripts/presetData/fetch_wikidata.py`）

- Wikidata の問い合わせ窓口（SPARQL）から、日本にある鉄道駅（「鉄道駅」とその下位分類）で座標を持つものを、1回の問い合わせでまとめて取得する
- 取得する値: 項目ID・日本語名・座標・事業者の日本語名・廃止日の有無
- 日本語名から駅名部分を取り出す（例: 「新宿駅」→ 新宿、「大久保駅 (東京都)」→ 大久保）
- 結果を `scripts/presetData/wikidata/stations.json` に保存し、リポジトリに含める（生成時に毎回取得しない）
- 問い合わせ窓口の回数制限（HTTP 429）にかかった場合は、指示された時間待って再試行する
- 使い方: `python scripts/presetData/fetch_wikidata.py`（駅データを更新したいときだけ実行する）

#### 照合と差し替え（`scripts/presetData/build_presets.py`）

各駅（駅の識別キーごと）について、`stations.json` から次の手順で1件を選び、その座標で差し替える。

1. 駅名が一致する候補を集める（廃止された駅は除く）
2. 候補のうち、事業者が一致するもの（Wikidata の事業者にその駅の路線の事業者が含まれるもの）があれば、それに絞る
3. 残った候補のうち、今の座標（作成者の知識による値）に最も近いものを選ぶ
4. 選んだ候補が今の座標から **10km 以上離れている場合は差し替えない**（同名の別の駅と取り違えるのを防ぐため）

- 見つからなかった駅・差し替えなかった駅は今の座標のまま残し、一覧を報告する
- 駅名・かな・英語名・駅ID は変更しない（座標のみ）
- 共同使用駅は代表の駅の値で1回だけ照合する
- 生成前の CSV との比較では、座標の変更とそれ以外（駅ID・駅名など）の変更を分けて報告する

#### 照合時の安全策

- 照合は表記の揺れ（ヶ/ケ、驒/騨）をそろえて行う
- Wikidata 上で別の名前の駅とまったく同じ座標になっている項目は、座標の誤り（コピーなど）の可能性が高いため使わない（例: 北陸線の坂田・田村が長浜と同じ座標になっていた）
- 事業者が一致した候補は 30km まで、一致しない候補は 10km までのずれを許して差し替える
- 差し替えた結果、その駅の前後で大きな遠回り（前後の駅を直接結ぶ距離の1.8倍超）になる場合は、差し替えを取り消して元の座標に戻す

#### 現在の状態（2026-10-17）

- 取得は「鉄道駅」に直接分類された日本の駅（9,404件）のみ。取得スクリプトの補完の問い合わせ（見つからなかった駅名を駅名で探す）は、Wikidata の問い合わせ窓口の回数制限・応答遅延により完了しておらず、保留中
- 2,203駅のうち 2,178駅の座標を差し替えた。見つからなかった19駅（新宿・池袋・新大阪など、複数事業者の駅として別の分類で登録されている大きな駅が中心）と、取り違え防止で差し替えなかった6駅は、作成者の知識による座標のまま

#### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `scripts/presetData/fetch_wikidata.py` | 新規。Wikidata から駅の座標を取得して保存 |
| `scripts/presetData/wikidata/stations.json` | 新規。取得結果（CC0） |
| `scripts/presetData/build_presets.py` | Wikidata の座標で差し替え、照合結果を報告 |
| `public/csv/presetLines/stationDB.csv` | 座標を更新 |
