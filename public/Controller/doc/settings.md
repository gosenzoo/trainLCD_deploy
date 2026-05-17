# settings オブジェクト仕様

`Controller` コンストラクタの第1引数 `settings` の全フィールドを記載する。

---

## トップレベル

| 変数名 | 型 | 用途 |
|---|---|---|
| `info` | `infoType` | 全体設定 |
| `dispConfig` | `dispConfigType` | 表示制御設定（言語切替タイマー等） |
| `operationList` | `operationType[]` | 運行情報リスト（複数運用切替に対応） |
| `stationList` | `stationType[]` | 駅リスト（運行順に並べる） |
| `lineDict` | `{ [lineId: string]: lineType }` | 路線辞書（乗換・路線名表示に使用） |
| `iconDict` | `{ [id: string]: string \| iconParamsType }` | アイコン辞書（Drawerへそのまま渡す） |

---

## info

| 変数名 | 型 | 用途 |
|---|---|---|
| `settingName` | `string` | 設定の名称（表示・識別用） |
| `isLoop` | `boolean` | 環状運転の場合 `true`。末尾から先頭へ循環する |
| `isMoveByCoord` | `boolean` | GPS座標連動移動を使用する場合 `true`（将来用途・Controller未使用） |

---

## dispConfig

| 変数名 | 型 | 用途 |
|---|---|---|
| `langIdList` | `langIdEntryType[]` | 言語切替タイマーの設定リスト（表示順に並べる） |

### langIdEntryType（langIdList の各要素）

| 変数名 | 型 | 用途 |
|---|---|---|
| `langId` | `number` | 言語ID（0: 日本語、1: 英語） |
| `displayTime` | `number` | この言語を表示し続ける時間（ms） |
| `transTime` | `number` | 次の言語への切替アニメーション時間（ms） |
| `gapTime` | `number` | アニメーション開始前の待機時間（ms） |

---

## operationType（operationList の各要素）

`startStationInd` 以降の区間に適用される。複数登録することで途中から運用を切り替えられる。

### 行先

| 変数名 | 型 | 用途 |
|---|---|---|
| `startStationInd` | `string` | この運用を適用し始める駅インデックス（数値文字列） |
| `destination` | `string` | 行先駅名（日本語） |
| `destinationKana` | `string` | 行先駅名（かな） |
| `destinationEng` | `string` | 行先駅名（英語） |
| `destinationNum` | `string` | 行先駅の駅番号（例: `"TY01"`、`"MM-06"`）。空の場合は非表示 |
| `destinationColor` | `string` | 行先駅番号アイコンの色（CSS色文字列） |
| `destinationNumIconKey` | `string` | 行先駅番号アイコンのプリセットキー |
| `direction` | `string` | 経由・直通表示テキスト（例: `"花島線直通"`）。空の場合は非表示 |

### 種別

| 変数名 | 型 | 用途 |
|---|---|---|
| `trainType` | `string` | 列車種別（日本語）（例: `"急行"`, `"普通"`）。空の場合は `"普通"` |
| `trainTypeEng` | `string` | 列車種別（英語）（例: `"Express"`, `"Local"`）。空の場合は `"Local"` |
| `trainTypeSub` | `string` | 補足種別テキスト（日本語）（例: `"源島から普通"`）。空の場合は非表示 |
| `trainTypeSubEng` | `string` | 補足種別テキスト（英語）。空の場合は非表示 |
| `trainTypeColor` | `string` | 種別帯の色（CSS色文字列）。空の場合は `"#0185ff"` |

### 路線・表示制御

| 変数名 | 型 | 用途 |
|---|---|---|
| `lineLogo` | `string` | 路線ロゴのキー（Drawer用途） |
| `lineColor` | `string` | 路線色（Drawer用途） |
| `leftOrRight` | `"left" \| "right"` | 進行方向（`"left"` → direction=1、`"right"` → direction=0） |
| `isDispTime` | `boolean` | 所要時間表示の有無。`sectionTime` が設定された駅が存在する場合のみ有効 |
| `isDispLineName` | `boolean` | 路線名表示の有無（`isDrawLineName` として出力） |
| `isDrawStopText` | `boolean` | 次停車駅名表示の有無（終点の場合は常に非表示） |
| `isDrawLine` | `boolean` | 車両位置ライン描画の有無（Drawer用途） |

### 両数・ドア位置

| 変数名 | 型 | 用途 |
|---|---|---|
| `carNumber` | `string` | 編成両数（数値文字列）。空の場合は `"1"` |
| `carNumberList` | `string` | 車両番号リスト（コンマ区切り、`*` で先頭車を示す、例: `"1*,2,3,4,5,6,7,8"`）（Drawer用途） |
| `headOffset` | `string` | 先頭車のオフセット（ピクセル文字列）（Drawer用途） |
| `backOffset` | `string` | 後方車のオフセット（ピクセル文字列）（Drawer用途） |
| `carLineColor` | `string` | 車両位置ラインの色（CSS色文字列）（Drawer用途） |

---

## stationType（stationList の各要素）

### 駅名・番号

| 変数名 | 型 | 用途 |
|---|---|---|
| `name` | `string` | 駅名（日本語） |
| `kana` | `string` | 駅名（かな） |
| `eng` | `string` | 駅名（英語） |
| `number` | `string` | 駅番号（例: `"TY01"`, `"G12"`）。先頭の非数字部分が路線記号、残りが番号になる |
| `numIconPresetKey` | `string` | 駅番号アイコンのプリセットキー（例: `"I_tokyu"`, `"I_tokyo_metro"`） |
| `lineNumberType` | `string` | 番号アイコンの表示タイプ（Drawer用途） |

### 路線

| 変数名 | 型 | 用途 |
|---|---|---|
| `lineColor` | `string` | 路線色（CSS色文字列）。路線図の帯色として使用 |
| `lineId` | `string` | この駅が属する路線のID（`lineDict` のキー）。路線名変化検出に使用 |

### 走行情報

| 変数名 | 型 | 用途 |
|---|---|---|
| `isPass` | `boolean` | 通過駅の場合 `true`。「まもなく」状態をスキップし走行中扱いになる |
| `sectionTime` | `string` | この駅から次駅までの所要時間（分、数値文字列）。空の場合は時間非表示 |
| `coordinate` | `[number \| null, number \| null]` | GPS座標 `[緯度, 経度]`。GPS連動移動時に使用（将来用途） |

### 乗換

| 変数名 | 型 | 用途 |
|---|---|---|
| `transfers` | `string` | 乗換路線のlineIdをスペース区切りで並べた文字列（例: `"line_ginza line_hanzomon"`）。`lineDict` のキーと対応 |
| `transferText` | `string` | 乗換案内テキスト（日本語）（Drawer用途・将来拡張） |
| `transferTextEng` | `string` | 乗換案内テキスト（英語）（Drawer用途・将来拡張） |
| `doorSide` | `"left" \| "right"` | 乗降ドア位置（`whole.nowStation.doorSide` として出力） |

### ホーム停車位置（Drawer用途・将来拡張）

| 変数名 | 型 | 用途 |
|---|---|---|
| `transferCountLineP` | `string` | 乗換路線数（ホーム表示用）（現在Controller未使用） |
| `otherLineInd` | `string` | 他路線のインデックス（ホーム表示用）（現在Controller未使用） |
| `slotNum` | `string` | ドア位置スロット数（現在Controller未使用） |
| `leftSlotInd` | `string` | 左端スロットインデックス（現在Controller未使用） |
| `otherCarNum` | `string` | 他路線の編成両数（現在Controller未使用） |
| `otherLeftSlotInd` | `string` | 他路線の左端スロットインデックス（現在Controller未使用） |

---

## lineType（lineDict の各値）

`lineDict` のキーは任意のlineId文字列（例: `"line_ginza"`, `"line_tokyu_toyoko"`）。

| 変数名 | 型 | 用途 |
|---|---|---|
| `lineIconKey` | `string` | 路線アイコンのプリセットキー（transfers・platform表示に使用） |
| `name` | `string` | 路線名（日本語）（乗換案内・路線名変化表示に使用） |
| `kana` | `string` | 路線名（かな）（現在Controller未使用） |
| `eng` | `string` | 路線名（英語）（乗換案内・路線名変化表示に使用） |
| `color` | `string` | 路線色（CSS色文字列）（路線名変化の帯色として使用） |

---

## iconParamsType（iconDict の各値）

`iconDict` の値は `string`（プリセットキー直指定）または `iconParamsType` オブジェクト。内容はDrawerへそのまま渡す。

| 変数名 | 型 | 用途 |
|---|---|---|
| `presetType` | `string` | アイコンプリセットの種別 |
| `color` | `string` | アイコンの色 |
| `symbol` | `string` | アイコンに表示する路線記号 |
