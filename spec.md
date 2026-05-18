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
        +operationType[] operationList
        +stationType[] stationList
        +lineDict : Dict~string, lineType~
        +iconDict : Dict~string, string|iconParamsType~
        +dispConfigType dispConfig
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
        +string startStationInd
    }

    class stationType {
        +string name
        +string kana
        +string eng
        +string number
        +string lineColor
        +string numIconPresetKey
        +string lineNumberType
        +transferItemType[] transfers
        +boolean isPass
        +string sectionTime
        +string lineId
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

    class transferItemType {
        +transferLineType line
        +transferStationType station
    }

    class transferLineType {
        +string lineIconKey
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
    }

    class iconParamsType {
        +string presetType
        +string color
        +string symbol
    }

    class dispConfigType {
        +pageEntryType[] pageList
        +langIdEntryType[] langIdList
    }

    class pageEntryType {
        +string pageName
        +number dispTime
    }

    class langIdEntryType {
        +number langId
        +number displayTime
        +number transTime
        +number gapTime
    }

    settingType "1" *-- "1" infoType : info
    settingType "1" *-- "0..*" operationType : operationList
    settingType "1" *-- "0..*" stationType : stationList
    settingType "1" *-- "0..*" lineType : lineDict (ID→lineType)
    settingType "1" *-- "0..*" iconParamsType : iconDict (ID→iconParamsType\nor base64 string)
    settingType "1" *-- "1" dispConfigType : dispConfig

    stationType "1" *-- "0..*" transferItemType : transfers
    transferItemType "1" *-- "1" transferLineType : line
    transferItemType "1" *-- "1" transferStationType : station
    stationType --> lineType : lineId で参照（区間路線）
    stationType --> iconParamsType : numIconPresetKey で参照
    operationType --> iconParamsType : destinationNumIconKey で参照
    dispConfigType "1" *-- "1..*" pageEntryType : pageList
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
| `startStationInd` | string | 運用開始駅のインデックス |

#### `stationType` — 駅設定
| フィールド | 型 | 説明 |
|---|---|---|
| `name` / `kana` / `eng` | string | 駅名（日本語・かな・英語） |
| `number` | string | 駅ナンバリング（例: `TY 01`） |
| `lineColor` | string | この駅の路線カラー（HEX） |
| `numIconPresetKey` | string | ナンバリングアイコンのプリセットキー |
| `lineNumberType` | string | ナンバリング表示形式（`"0"`: テキスト, `"1"`: アイコン） |
| `transfers` | `transferItemType[]` | 乗換路線のリスト。各エントリに路線IDと乗換駅情報を持つ |
| `transfersListDisp` | string | 乗換一覧表示の行分割指定。スペース区切りの路線IDと改行の組み合わせ。空の場合は `transfers` をもとに自動生成 |
| `isPass` | boolean | 通過駅フラグ |
| `sectionTime` | string | 次駅までの所要時間（分） |
| `lineId` | string | この駅以降の区間路線ID |
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
| `lineIconKey` | string | 路線アイコンの `iconDict` キー |
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
| `pageList` | `pageEntryType[]` | 表示するページのリスト（表示順） |
| `langIdList` | `langIdEntryType[]` | 言語ローテーション設定リスト（順番に切り替え） |

#### `pageEntryType` — ページ表示エントリ
| フィールド | 型 | 説明 |
|---|---|---|
| `pageName` | string | ページファイル名。選択肢: `defaultLineSVG.svg` / `overLineSVG.svg` / `transfers.svg` / `platform.svg` |
| `dispTime` | number | このページを表示し続ける時間（ms） |

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
```

### 4.2 セクションアコーディオン

`Editor` 内の各セクション（ファイル操作・運用設定・駅設定・路線登録・アイコン登録・表示設定）は、見出し行クリックで本体を開閉するアコーディオン形式とする。

#### 動作仕様

- 各セクションに `isOpen: boolean` state を持ち、初期値はすべて `true`（展開済み）
- 見出し行（`.section-header`）をクリック/タップすると `isOpen` をトグルする
- `isOpen === false` のとき本体（`.section-body`）を非表示にする（`display: none`）
- 開閉状態を示す矢印アイコン（`▼` / `▶`）を見出し右端に表示する

#### 実装方針

- `Editor.tsx` の各 `editor-section` div を **`AccordionSection`** コンポーネントに置き換える
- `AccordionSection` は `title: string` と `children` を受け取る汎用コンポーネントとして `app/components/AccordionSection.tsx` に定義する
- 各子コンポーネント（`EditorHead` など）の内部 `<h2>` 見出しは不要になるため削除する

#### CSS クラス

| クラス | 役割 |
|--------|------|
| `.section-header` | クリック可能な見出し行（`cursor: pointer`） |
| `.section-header-title` | 見出しテキスト（既存 `h2` スタイルを流用） |
| `.section-header-arrow` | 開閉矢印（右端に配置） |
| `.section-body` | 開閉対象の本体コンテンツ領域 |

### 4.4 表示ツールバー（sticky ツールバー）

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
    header: string                              // <th> ヘッダーテキスト
    cell: (row: T, key: string) => React.ReactNode  // セル内容の描画関数
    isSelector?: boolean  // true のとき <th> として描画しクリックで行選択
}

// Props
type GenericItemListProps<T> = {
    columns: ColumnDef<T>[]
    rows: { key: string; data: T }[]    // 表示データ（key で行を識別）
    selectedKeys: string[]
    onRowClick: (key: string) => void   // 行クリック時のコールバック
    tableId?: string
    containerId?: string
}
```

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
| 路線記号 | `item.line.lineIconKey` でアイコン描画 | `isSelector: true` |
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
| 路線記号 | `item.line.lineIconKey` | アイコンピッカー | 4.6節と同じ形式 |
| 路線名 | `item.line.name` | テキスト | |
| 路線名かな | `item.line.kana` | テキスト | |
| 路線名英語 | `item.line.eng` | テキスト | |

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
2. 選択中の乗換エントリの `line.lineIconKey` が指すアイコン（`iconDict` の値）が **オブジェクト型**（`{presetType, symbol, color}`）の場合：
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

`StationParamSetter` 内の「次区間所要時間(分)」以降の項目（次区間路線ID・乗換案内・乗換案内英語・ホーム乗換案内行ごと表示数・スロット関連・向側列車設定）を `AccordionSection` で包み、**デフォルト閉じ** で表示する。

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
| `basic` | 駅基本設定 | 駅名・かな・英語・ナンバリング・路線カラー・ナンバリング記号・ナンバリング表示形式・乗換路線・開くドア |
| `defaultLine` | 詳細路線図表示 | 次区間所要時間・次区間路線ID・乗換案内（日英テキスト）・登録路線情報を反映ボタン |
| `transfersDisp` | 乗換一覧表示 | 乗換一覧の行分割指定テキストボックス・基本設定情報を反映ボタン |
| `platform` | ホーム案内表示 | ホーム乗換案内行ごと表示数・スロット分割数・列車左端スロット・ホーム向側列車の路線ID・向側列車両数・向側列車左端スロット |
| `map` | マップ | 既存の MapComponent（現在開発中） |

#### 「乗換一覧表示」タブの仕様

- `stationType.transfersListDisp` を編集する `<textarea>` を配置する（初期値: 空文字列）
- 値はそのまま `station.transfersListDisp` に書き込む
- **「基本設定情報を反映」ボタン**: クリックすると、現在の `station.transfers`（`transferItemType[]`）の各インデックス（0始まり）を1行スペース区切りで `<textarea>` に書き込み `station.transfersListDisp` を更新する
  - 例: `transfers` が3要素 → textarea 値 `"0 1 2"`（改行なし、ユーザが後で改行を挿入可能）

#### `transfersListDisp` の書式と drawParams への反映ロジック

```
transfersListDisp の例（ユーザが改行を挿入した状態）:
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

`pageList` を編集するテーブル。セクション内の最上部に配置する。

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

**ボタン**:

| ボタン | 動作 |
|--------|------|
| 追加 | 利用可能なページ名を `<select>` で選択して末尾に追加（`dispTime` デフォルト: 8000） |
| 削除 | 選択中のエントリを削除（`btn-danger`、未選択時は `disabled`） |
| 上に移動 | 選択中のエントリを1つ上へ移動（未選択・先頭時は `disabled`） |
| 下に移動 | 選択中のエントリを1つ下へ移動（未選択・末尾時は `disabled`） |

**編集フォーム**: 非選択時もグレーアウト状態で常時表示。

| ラベル | フィールド | 入力型 |
|--------|-----------|--------|
| 表示時間(ms) | `dispTime` | number |

**内部状態**:

| state | 型 | 説明 |
|-------|----|------|
| `selectedPageIndex` | `number \| null` | 選択中のページエントリインデックス |
| `newPageName` | `string` | 追加する選択中のページ名（`<select>` の値） |

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

複数の運用を切り替えるUIをタブ形式で実装する。

#### レイアウト

```
[ 運用を追加 ] [ 表示中を削除 ]
┌──────────────┬──────────────┬──────────────┐
│ 渋谷→元町・中華街 │ 元町・中華街→渋谷 │  ...  │  ← タブ行
└──────────────┴──────────────┴──────────────┘
  選択中のタブに対応するフォーム内容
```

- タブは既存の `.tab-btn` / `.tab-btn.active` クラスを使用
- 選択中の運用インデックスは `operationInd` state で管理（既存）
- 従来の `<select>` は廃止し、タブに置き換える

#### `startStationInd` の入力 UI

| 項目 | 内容 |
|------|------|
| ラベル | 運用開始駅（旧: 設定開始駅ID） |
| UI | `<select>` で駅リストから選択 |
| 選択肢 | `stationList` の各駅を `[インデックス] - 駅名` 形式で列挙 |
| 値 | 選択された駅の 0-based インデックス（文字列） |
| 駅名が空の場合 | `[インデックス] - 駅名未定義` と表示 |

#### タブラベルの生成ロジック

タブに表示するテキスト: **「[開始駅名] → [終了駅名]」**

```
getOperationTabLabel(operation, index, operationList, stationList) → string
```

| 変数 | 内容 |
|------|------|
| 開始駅インデックス | `parseInt(operation.startStationInd)` |
| 終了駅インデックス | 次の運用の `startStationInd`（そのまま）。最後の運用は `stationList.length - 1` |
| 次の運用の決定 | `operationList` を `startStationInd` の昇順でソートし、対象運用の次のエントリを参照 |
| 範囲外クランプ | インデックスが `[0, stationList.length - 1]` の範囲外なら近い方の端にクランプ |
| 駅名 | `stationList[clampedIndex]?.name` が空の場合は `"駅名未定義"` を表示 |

例：
- `startStationInd = "0"`, 次の運用なし → `"渋谷 → 元町・中華街"`
- `startStationInd = "-5"` → インデックス 0 にクランプ → `"渋谷 → ..."`

#### 未使用運用の判定とスタイル

実際の表示で使われない運用（適用範囲が駅リストと重ならない）は、タブを視覚的に区別する。

**未使用の判定**

```
isOperationUnused(operation, index, operationList, stationList) → boolean
```

操作の適用範囲 `[startInd, endInd]` が `[0, stationList.length - 1]` と重ならない場合に `true`。

| 条件 | 判定 |
|------|------|
| `startInd > stationList.length - 1` | 未使用（開始が範囲外） |
| `endInd < 0` | 未使用（終了が範囲外） |
| stationList が空 | 全運用が未使用 |

※ クランプ前の生のインデックス値で判定する（クランプ後では境界ケースが消えるため）

**スタイル**

- タブラベルの先頭に `(未使用)` を付与
- CSS クラス `.tab-btn--unused` を追加し、選択状態によらず暗い外観にする

### 4.10 駅プリセットから追加

#### 概要

CSVファイルで管理された路線・駅のプリセットデータから、任意の区間を選んで `stationList` に一括追加する機能。

#### CSVファイル

`public/csv/presetLines/` ディレクトリに配置し、クライアントから fetch で取得する。ユーザーが用意する。

| ファイル | 列構成 |
|----------|--------|
| `public/csv/presetLines/stationDB.csv` | 駅ID, 駅名, 駅名かな, 駅名英語 |
| `public/csv/presetLines/lineDB.csv` | 路線ID, 路線名, 路線名かな, 路線名英語, 路線カラー |
| `public/csv/presetLines/lineConnectDB.csv` | 路線ID, 駅ID, 駅ナンバリング |

- **駅ID**: 全駅にわたって一意な識別子
- **路線ID**: 全路線にわたって一意な識別子
- **lineConnectDB.csv**: 同一路線IDの行を上から順に抽出したとき、その順番がその路線上の駅のつながりを表す。駅の所属路線を求める際もこのファイルから導出する

#### 駅IDの定義

**駅ID** は stationDB.csv で全駅にわたって一意に定められた識別子。路線をまたいで同一駅を参照できる。

#### ボタン配置

`StationList` の最上段（`GenericItemList` より上）に「駅プリセットから追加」ボタンを配置する。クリックで `StationPresetPopup` が開く。

#### `StationPresetPopup` コンポーネント

**ファイル**: `app/components/StationPresetPopup.tsx`

**Props**:

```typescript
type Props = {
    onAdd: (stations: stationType[]) => void   // 追加確定時のコールバック
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

**UI レイアウト**:

```
┌──────────────────────────────────────────────────────────┐
│  駅プリセットから追加                                     │
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
| 「戻る」ボタン（`stagingList` が空のとき無効） | — | 末尾の区間を削除。残った区間がある場合は末尾区間の `nextStationId` の駅を `prevStation` に設定、ない場合は `prevStation` を `null` に戻す。`selectedLineId` もリセット |
| 「追加」ボタン | — | 追加一覧の全区間に含まれる駅を順番に `stationType` に変換して `onAdd` へ渡し、ポップアップを閉じる |

**「追加」ボタン押下時の駅抽出ロジック**:

追加一覧の各 `StationSection` から駅を以下の手順で展開し、`stationType[]` として `onAdd` に渡す。

1. 各区間 `{ lineId, prevStationId, nextStationId }` について、lineConnectDB から同一 `lineId` の行を上から順に抽出し、駅IDの順序リストを得る
2. 順序リスト中の `prevStationId` と `nextStationId` のインデックスを求め、その間（両端含む）の駅IDを列挙する（`prevStationId` が後にある場合は逆順）
3. 区間をまたいで同じ駅IDが重複する場合は除去する（連続区間の接続駅が重複しないよう処理）
4. 列挙した駅IDで stationDB を引いて `toStationType` に変換する

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

**`stationType` への変換**（CSVから取得できるフィールドのみ設定、その他は未定）:

| stationType フィールド | 設定値 |
|------------------------|--------|
| `name` | 駅名（stationDB） |
| `kana` | 駅名かな（stationDB） |
| `eng` | 駅名英語（stationDB） |
| `lineColor` | 路線カラー（lineDB から所属路線で引く） |
| `number` | 空文字固定（CSVに列なし） |
| その他フィールド | 未定（暫定デフォルト値） |

**挿入位置**: 未定（暫定: `stationList` 末尾）

#### 状態管理

| state | 型 | 説明 |
|-------|----|------|
| `lines` | `PresetLine[]` | 全路線リスト（lineDB.csv） |
| `allStations` | `PresetStation[]` | 全駅リスト（stationDB.csv） |
| `lineConnects` | `PresetLineConnect[]` | 全路線接続データ（lineConnectDB.csv） |
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

### 4.11 UI コンポーネント規約

#### トグルスイッチ (`ToggleSwitch`)

真偽値設定の入力UIは以下の3種類を使い分ける。

| 種別 | 実装 | 使用箇所 |
|------|------|----------|
| 駅通過判定（`isPass`） | `<input type="checkbox">` のまま | `StationList` 通過列 |
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

`operationList` が空、または現在の区間インデックスに対応するエントリが存在しない場合（`nowOperation === null`）、全フィールドをデフォルト値で構成した **フォールバック operation オブジェクト** を生成する（行先フィールドは後述の ② で補完）。

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
