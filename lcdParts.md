# lcdParts 属性仕様書

入力SVGの要素に `lcdParts` 属性を付与することで、描画処理を統一的に行う。

---

## パーツ一覧

| lcdParts 値 | 対象要素 | 概要 | パラメータ |
|---|---|---|---|
| `static` | 全ての要素 | 要素をそのまま出力に追加する。変換・加工なし。 | なし |
| `textBox` | `<rect>` | rectの範囲内にテキストを描画する。 | テキスト内容、フォントサイズ、フォントファミリー、色、行揃え（左・中央・右）、縦揃え（上・中・下）など |
| `numberingIcon` | `<rect>` | rectの範囲内に路線ナンバリングアイコンを描画する。 | 路線記号（例: `JY`）、駅番号（例: `01`）、アイコン種類（プリセット名） |
| `arrangeArea` | `<g>` 直下の最初の `<rect>` | 同じ `<g>` 内の複数の子要素を、rectの範囲内に整列・収納する。入れ子可能。 | 要素間の間隔（gap）、整列方向（横・縦）、揃え位置（左・中・右 / 上・中・下）など |

---

## visible 属性

`visible` 属性は `lcdParts` とは独立して全ての要素に付与できる。DrawerがSVGをトラバースする際に評価され、`false` と評価された要素はその子孫も含めて出力に追加されない。

### 式の文法

```
expr  = orExpr
orExpr  = andExpr ( "||" andExpr )*
andExpr = atom ( "&&" atom )*
atom    = [ "!" ] varName
varName = drawParams のキー名 | "true" | "false"
```

### 例

| visible 値 | 意味 |
|---|---|
| `"isJapanese"` | drawParams.isJapanese が truthy のとき表示 |
| `"!isEnglish"` | drawParams.isEnglish が falsy のとき表示 |
| `"isJapanese && isStation"` | 両方 truthy のとき表示 |
| `"isJapanese \|\| isEnglish"` | いずれか truthy のとき表示 |
| `"nowStation.lineNumberType == 0"` | drawParams.nowStation.lineNumberType が 0 のとき表示 |
| `"carNum == 3"` | drawParams.carNum が 3 のとき表示 |

**優先順位**: `!` > `==` > `&&` > `||`

- `==` の両辺はそれぞれ変数（ドット記法可）または数値定数
- 両辺が数値に変換できる場合は数値比較、それ以外は文字列比較

---

## 各パーツ詳細

### static

- **対象要素**: 全ての要素（`<rect>`, `<text>`, `<g>`, `<path>` など）
- **動作**: 要素をそのままコピーして出力SVGに追加する。
- **パラメータ**: なし

---

### textBox

- **対象要素**: `<rect>`
- **動作**: rectの `x`, `y`, `width`, `height` を描画領域として、指定されたテキストを描画する。rectは出力に含まない（描画領域としてのみ使用）。
- **パラメータ**:

| パラメータ名 | 型 | 説明 |
|---|---|---|
| テキスト内容 | string | 描画するテキスト |
| フォントサイズ | number | フォントサイズ（px） |
| フォントファミリー | string | 使用するフォント名 |
| 文字色 | string | テキストの色（CSS色指定） |
| 水平揃え | string | `left` / `center` / `right` |
| 垂直揃え | string | `top` / `middle` / `bottom` |

### lcdText 属性（テキスト内容テンプレート）

描画するテキスト内容は `lcdText` 属性で指定するテンプレート文字列から生成する。  
`#{変数名}` の形式で drawParams の値を埋め込める。

```xml
<!-- 変数のみ -->
<rect lcdParts="textBox" lcdText="#{stationName}" ... />

<!-- 固定文字＋変数 -->
<rect lcdParts="textBox" lcdText="次は#{stationName}駅" ... />

<!-- 複数変数 -->
<rect lcdParts="textBox" lcdText="#{trainType} #{destination}行" ... />
```

- `#{変数名}` は `.` 区切りで入れ子オブジェクトを参照できる（例: `#{station.eng}` → `drawParams.station.eng`）
- 参照先が存在しない場合は空文字として展開する
- テンプレート展開後の文字列が空文字の場合はその要素を出力に追加しない

---

### numberingIcon

- **対象要素**: `<rect>`
- **動作**: rectの範囲内に、指定されたプリセットのナンバリングアイコンを描画する。rectは出力に含まない（描画領域としてのみ使用）。
- **パラメータ**:

| パラメータ名 | 型 | 説明 |
|---|---|---|
| 路線記号 | string | 路線を示すアルファベット記号（例: `JY`, `G`） |
| 駅番号 | string | 駅番号（例: `01`, `23`） |
| アイコン種類 | string | 使用するSVGプリセット名（例: `JR_east`, `tokyu`） |

---

### arrangeArea

- **対象要素**: `<g>` 直下の最初の `<rect>`
- **動作**: `<g>` 内の子要素（`<rect>` を除く）を、rectの範囲内に指定方向で整列・収納する。子要素のサイズに応じてスケーリングまたは配置を行う。`arrangeArea` を持つ `<g>` を入れ子にすることができる。
- **パラメータ**:

| パラメータ名 | 型 | 説明 |
|---|---|---|
| 整列方向 | string | `horizontal`（横並び）/ `vertical`（縦並び） |
| 要素間の間隔（gap） | number | 子要素間の余白（px） |
| 水平揃え | string | `left` / `center` / `right` |
| 垂直揃え | string | `top` / `middle` / `bottom` |
