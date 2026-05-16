# drawParams 仕様

`drawParams.json` の変数名・型・用途の一覧。共通オブジェクト型は末尾にまとめて定義する。

---

## トップレベル

| 変数名 | 型 | 用途 |
|---|---|---|
| Pages | string[] | 表示するSVGページファイル名のリスト |
| langId | number | 表示言語ID（0:日本語, 1:英語, 2:その他） |
| runState | number | 運行状態（0:ただいま停車中, 1:つぎは, 2:まもなく） |
| isStopping | boolean | 長時間停車中かの判定（行先表示パターンの切り替え） |
| numIconPresetKeys | string[] | 読み込むナンバリングアイコンプリセットキーの一覧 |
| isTerminal | boolean | 終点かの判定（次駅表示の切り替え） |
| isNextStation | boolean | 次の駅情報を表示するかの判定 |
| trainType | string | 種別名（日本語） |
| trainTypeEng | string | 種別名（英語） |
| trainTypeSubText | string | 種別補足テキスト（日本語） |
| trainTypeSubTextEng | string | 種別補足テキスト（英語） |
| nowStation | [NowStation](#nowstation) | 現在停車駅の情報 |
| nextStopName | string | 次の停車駅名（フッター表示用） |
| viaText | string | 経由路線テキスト |
| destination | [Destination](#destination) | 行先駅の情報 |
| carNumber | number | 号車番号 |
| direction | number | 進行方向（0:右向き, 1:左向き） |
| sections | [SectionItem](#sectionitem)[] | 路線図の駅間セクション配列（線色・形状） |
| rootSection | [SectionFull](#sectionfull) | 路線図の後方側末端セクション |
| arrowSection | [SectionFull](#sectionfull) | 路線図の前方側末端セクション |
| drawPos | number | 路線図の現在位置オフセット（何駅目を中央に描くか） |
| stationFrameNum | number | 路線図の駅枠の総数 |
| isDrawNextStation | boolean | フッターの次停車駅表示の要否 |
| isDrawTime | boolean | 駅間所要時間表示の要否 |
| isDrawLineName | boolean | 路線名表示の要否 |
| dispStationList | [DispStation](#dispstation)[] | 路線図に表示する駅のリスト |
| overLine | [OverLine](#overline) | 駅数が多い場合の追加路線図データ |
| platform | [Platform](#platform) | 乗車位置案内ページのデータ |
| transfers | [Transfers](#transfers) | 乗換案内ページのデータ |

---

## NowStation

現在停車駅の情報。

| 変数名 | 型 | 用途 |
|---|---|---|
| name | string | 駅名（日本語） |
| kana | string | 駅名（ひらがな） |
| eng | string | 駅名（英語） |
| numIcon | [NumIcon](#numicon) | ナンバリングアイコン情報 |
| transferText | string | 乗換情報テキスト（日本語） |
| transferTextEng | string | 乗換情報テキスト（英語） |
| doorSide | string | ドア開方向（"left" / "right"） |
| transferCountLineP | string | 乗換路線数（テキスト表示用） |
| otherLineInd | string | 他路線インジケーター |
| slotNum | string | スロット番号 |
| leftSlotInd | string | 左スロットインジケーター |
| otherCarNum | string | 他車両数 |
| otherLeftSlotInd | string | 他左スロットインジケーター |

---

## Destination

行先駅の情報。

| 変数名 | 型 | 用途 |
|---|---|---|
| name | string | 行先駅名（日本語） |
| kana | string | 行先駅名（ひらがな） |
| eng | string | 行先駅名（英語） |
| numIcon | [NumIcon](#numicon) | 行先駅のナンバリングアイコン情報 |

---

## DispStation

路線図に表示する各駅の情報。

| 変数名 | 型 | 用途 |
|---|---|---|
| name | string | 駅名（日本語） |
| kana | string | 駅名（ひらがな） |
| eng | string | 駅名（英語） |
| numIcon | [NumIcon](#numicon) | 当駅のナンバリングアイコン |
| numIconNext | [NumIcon](#numicon) | 乗換先路線のナンバリングアイコン |
| numIconType | string | ナンバリング表示タイプ（"0":テキスト, "1":プリセット） |
| stationIconType | string | 駅アイコンタイプ（"0":停車駅, "1":通過駅） |
| sectionTime | string | 次駅までの所要時間 |
| transfersText | string[] | 乗換路線テキスト配列（日本語） |
| transfersTextEng | string[] | 乗換路線テキスト配列（英語） |
| isGray | boolean | グレースケール表示か（通過済み駅など） |

---

## OverLine

駅数が路線図1行に収まらない場合の追加路線図データ。

| 変数名 | 型 | 用途 |
|---|---|---|
| stationFrameNum | number | 追加路線図の駅枠総数 |
| drawPos | number | 追加路線図の現在位置オフセット |
| rootSection | [SectionFull](#sectionfull) | 追加路線図の後方側末端セクション |
| arrowSection | [SectionFull](#sectionfull) | 追加路線図の前方側末端セクション |
| sections | [SectionItem](#sectionitem)[] | 追加路線図の駅間セクション配列 |
| dispStationList | [OverLineStation](#overlinestation)[] | 追加路線図に表示する駅リスト |

### OverLineStation

追加路線図に表示する各駅の情報。

| 変数名 | 型 | 用途 |
|---|---|---|
| name | string | 駅名（日本語） |
| eng | string | 駅名（英語） |
| numIcon | [NumIcon](#numicon) | 当駅のナンバリングアイコン |
| numIconSub | [NumIcon](#numicon) | サブナンバリングアイコン（乗換先路線等） |
| numIconType | string | ナンバリング表示タイプ（"0":テキスト, "1":プリセット） |
| stationIconType | string | 駅アイコンタイプ（"0":停車駅, "1":通過駅） |
| sectionTime | string | 次駅までの所要時間 |
| isGray | boolean | グレースケール表示か |

---

## Platform

乗車位置案内ページのデータ。

| 変数名 | 型 | 用途 |
|---|---|---|
| transfers | [TransferItem](#transferitem)[][] | ホームごとの乗換路線情報の二次元配列 |

---

## Transfers

乗換案内ページのデータ。

| 変数名 | 型 | 用途 |
|---|---|---|
| transferList | [TransferItemWithStation](#transferitemwithstation)[][] | 乗換先ごとの路線情報の二次元配列（行数で表示行数が変わる） |

---

## 共通オブジェクト型

### NumIcon

ナンバリングアイコンの表示情報。複数箇所で共通使用。

| 変数名 | 型 | 用途 |
|---|---|---|
| isDraw | boolean | ナンバリングアイコンを表示するか |
| presetKey | string | 使用するアイコンプリセットのキー |
| symbol | string | 路線記号（アルファベット等） |
| number | string | 駅番号 |
| color | string | アイコンの色 |

### SectionItem

`sections[]` および `overLine.sections[]` の各要素。駅間の線区を表す。

| 変数名 | 型 | 用途 |
|---|---|---|
| color1 | string | セクション左側（後方）の色 |
| color2 | string | セクション右側（前方）の色 |
| type | number | セクションの形状タイプ（0:通常, 1:省略形） |
| lineName | string | 路線名（日本語） |
| lineNameEng | string | 路線名（英語） |
| lineNameColor | string | 路線名テキストの色 |

### SectionFull

`rootSection` / `arrowSection` の末端セクション。

| 変数名 | 型 | 用途 |
|---|---|---|
| color | string | セクションの色 |
| type | number | セクションの形状タイプ（0:通常, 1:省略形） |
| lineName | string | 路線名（日本語） |
| lineNameEng | string | 路線名（英語） |
| lineNameColor | string | 路線名テキストの色 |
| isConnect | boolean | 他路線への直通・接続有無 |

### TransferItem

`platform.transfers[][]` の各要素。乗車位置案内での路線情報。

| 変数名 | 型 | 用途 |
|---|---|---|
| lineIcon | string | 路線アイコンのテキスト表現 |
| name | string | 路線名（日本語） |
| eng | string | 路線名（英語） |

### TransferItemWithStation

`transfers.transferList[][]` の各要素。乗換案内での路線情報。`station` は省略可。

| 変数名 | 型 | 用途 |
|---|---|---|
| lineIcon | string | 路線アイコンのテキスト表現 |
| name | string | 路線名（日本語） |
| eng | string | 路線名（英語） |
| station? | [TransferStation](#transferstation) | 乗換先の駅情報（駅ナンバリング表示時に使用） |

### TransferStation

乗換先駅のナンバリング・名称情報。

| 変数名 | 型 | 用途 |
|---|---|---|
| name | string | 駅名（日本語） |
| eng | string | 駅名（英語） |
| type | string | ナンバリングプリセットキー |
| symbol | string | 路線記号 |
| number | string | 駅番号 |
| color | string | アイコンの色 |
