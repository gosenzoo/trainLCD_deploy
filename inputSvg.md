# インプットSVG ID 一覧

JSコードが `getElementById` / `querySelector` で参照するSVG要素のID一覧。  
プレフィックスのないIDは複数カテゴリをまたぐ汎用要素。

---

## 共通 (Common)

| ID | 用途 |
|----|------|
| `defs` | SVG定義ブロック |
| `background` | 背景 |

---

## ヘッダー (Header)

参照元: `HeaderDrawer.js`

### 背景・種別

| ID | 用途 |
|----|------|
| `header-back` | 背景SVG全体 |
| `header-trainType` | 種別SVGグループ |
| `trainTypeBackColor` | 種別背景色矩形（`header-trainType`内） |
| `trainTypeText` | 種別テキスト領域（`header-trainType`内） |
| `trainTypeTextEng` | 種別テキスト領域・英語（`header-trainType`内） |
| `trainTypeSubText` | 種別補足テキスト領域（`header-trainType`内） |
| `trainTypeSubTextEng` | 種別補足テキスト領域・英語（`header-trainType`内） |

### 駅名・ナンバリング・号車

| ID | 用途 |
|----|------|
| `header-stationNameText` | 駅名テキスト領域 |
| `header-stationNameTextEng` | 駅名テキスト領域・英語 |
| `header-numbering-rect` | ナンバリングSVGグループ |
| `header-carNum` | 号車SVGグループ |
| `carNumText` | 号車番号テキスト領域（`header-carNum`内） |
| `carText` | 「号車」テキスト領域（`header-carNum`内） |
| `carTextEng` | 「Car No.」テキスト領域（`header-carNum`内） |

### 行先・方面

| ID | 用途 |
|----|------|
| `header-viaText` | 方面テキスト領域 |
| `header-destinationText` | 行先テキスト領域 |
| `header-destinationTextEng` | 行先テキスト領域・英語 |
| `header-viaTextStop` | 方面テキスト領域（長時間停車表示用） |
| `header-viaTextStopEng` | 方面テキスト領域・英語（長時間停車表示用） |

### 状態テキスト

| ID | 用途 |
|----|------|
| `header-runStateText` | 走行状態テキスト領域（つぎは／まもなく等） |
| `header-runStateTextEng` | 走行状態テキスト領域・英語 |
| `header-stopYukiText` | 長時間停車「ゆき」テキスト領域 |
| `header-stopYukiTextEng` | 長時間停車「ゆき」テキスト領域・英語 |
| `header-runStateTerminalText` | 終着駅状態テキスト領域 |
| `header-runStateTerminalTextEng` | 終着駅状態テキスト領域・英語 |

---

## ボディ - DefaultLine

参照元: `DefaultLineDrawer.js`

### レイアウト基準点・ライン

| ID | 用途 |
|----|------|
| `lineStart` | 路線ラインの始端（座標・幅の基準） |
| `lineStartEdge` | 路線ライン始端（路線端用） |
| `lineEnd` | 路線ラインの終端 |
| `lineEndEdge` | 路線ライン終端（路線端用） |
| `lineBase` | 路線ライン中間部テンプレート |
| `lineLeap1` | 路線ライン跳び越し部テンプレート1 |
| `lineLeap2` | 路線ライン跳び越し部テンプレート2 |

### 駅マーカー

| ID | 用途 |
|----|------|
| `stationStart` | 根本駅マーカー |
| `stationEnd` | 先端駅マーカー |
| `passStation` | 通過駅マーカー |
| `hereIcon` | 現在地アイコン |

### 駅テキスト・ナンバリング

| ID | 用途 |
|----|------|
| `body-defaultLine-stationText` | 駅テキスト全体（`data-basePoint`属性を使用） |
| `body-defaultLine-stationName` | 駅名テキスト領域（日本語） |
| `body-defaultLine-stationNameEng` | 駅名テキスト領域（英語） |
| `body-defaultLine-numRect` | ナンバリング番号テキスト領域 |
| `body-defaultLine-numIconRect` | ナンバリングアイコン領域 |
| `body-defaultLine-timeText` | 所要時間テキスト領域 |

### 乗換路線

| ID | 用途 |
|----|------|
| `body-defaultLine-transferArea` | 乗換路線表示エリア矩形 |
| `body-defaultLine-transferLine` | 乗換路線テキスト領域（日本語） |
| `body-defaultLine-transferLineEng` | 乗換路線テキスト領域（英語） |

### 路線名テキスト

| ID | 用途 |
|----|------|
| `lineNameStartText` | 路線名テキスト領域・始端側（日本語） |
| `lineNameEndText` | 路線名テキスト領域・終端側（日本語） |
| `lineNameStartTextEng` | 路線名テキスト領域・始端側（英語） |
| `lineNameEndTextEng` | 路線名テキスト領域・終端側（英語） |
| `MinuteText` | 所要時間「分」テキスト領域（日本語） |
| `MinuteTextEng` | 所要時間「分」テキスト領域（英語） |

---

## ボディ - Platform

参照元: `PlatformDrawer.js`

| ID | 用途 |
|----|------|
| `body-platform-transferList` | 乗換案内リストSVGグループ |
| `transferListBack` | 乗換案内リスト背景 |
| `transferListTextRect` | 「のりかえ」テキスト領域 |
| `transferListTextEngRect` | 「Transfer」テキスト領域 |
| `transferListArea` | 乗換案内表示エリア（1列用）（`body-platform-transferList`内） |
| `transferListAreaMulti` | 乗換案内表示エリア（複数列用）（`body-platform-transferList`内） |

---

## フッター (Footer)

参照元: `FooterDrawer.js`

| ID | 用途 |
|----|------|
| `footer-estimateTimeText` | 所要時間テキスト領域（英語） |
| `footer-stopText` | 「〇〇を出ますと～にとまります」テキスト領域 |

---

## NumIconDrawer（アイコン内部）

参照元: `NumIconDrawer.js`

| ID | 用途 |
|----|------|
| `lineColor` | アイコンSVG内の路線カラー塗り矩形 |
