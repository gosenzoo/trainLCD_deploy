# lcdParts / visible / lcdText 属性仕様書

入力SVGの要素に各属性を付与することで、DrawerがSVGをトラバースする際の処理を制御する。

---

## lcdParts 属性

### パーツ一覧

| lcdParts 値 | 対象要素 | 概要 |
|---|---|---|
| `static` | 全ての要素 | 要素をそのまま出力に追加する。変換・加工なし。 |
| `textBox` | `<rect>` | rectの範囲内にテキストを描画する。テキスト内容は `lcdText` 属性で指定する。 |
| `numberingIcon` | `<rect>` | rectの範囲内に路線ナンバリングアイコンを描画する。 |
| `group` | `<g>` | 子要素を再帰的にオブジェクト化してグループとして出力する。`visible` 属性で表示制御可能。 |
| `arrange` | `<g>` | `<g>` 直下の `arrangeArea` 矩形の範囲内に、その他の子要素を整列・収納する。入れ子可能。 |
| `arrangeArea` | `<rect>`（`arrange` の `<g>` 直下） | `arrange` の描画領域を定義する矩形。出力には含まない。 |
| `generate` | `<g>` | 生成関数（`genfunc`）で作った要素を出力に追加する（生成部品）。線路・ホーム・車両など、遠近法で形が変わるものに使う。 |
| （なし） | — | `lcdParts` を持たない要素はその子孫ごとスキップする。必要な場合は `lcdParts="group"` を付与すること。 |

### static

- **対象要素**: 全ての要素（`<rect>`, `<text>`, `<g>`, `<path>` など）
- **動作**: 要素を参照渡しで出力SVGに追加する（テンプレート保護のため `StaticObj` コンストラクタで一度だけクローンし、以降は参照渡し）。
- **パラメータ**: なし

### textBox

- **対象要素**: `<rect>`
- **動作**: rectの `x`, `y`, `width`, `height` を描画領域として、`lcdText` 属性で指定したテキストを描画する。rect自体は出力に含まない。

| 属性 | 説明 |
|---|---|
| `lcdText` | 描画するテキストのテンプレート文字列（後述） |
| `data-style` | フォント・色・揃え等のスタイル定義（JSON） |

### numberingIcon

- **対象要素**: `<rect>`
- **動作**: rectの範囲内に指定プリセットのナンバリングアイコンを描画する。

| パラメータ名 | 型 | 説明 |
|---|---|---|
| 路線記号 | string | 路線を示すアルファベット記号（例: `JY`, `G`） |
| 駅番号 | string | 駅番号（例: `01`, `23`） |
| アイコン種類 | string | 使用するSVGプリセット名（例: `JR_east`, `tokyu`） |

### group

- **対象要素**: `<g>`
- **動作**: 子要素を `_buildNode()` で再帰的にオブジェクト化し、`getElement(ctx)` で描画した結果を `<g>` にまとめて返す。`visible` 属性で表示制御可能。`lcdParts` を持たない `<g>` をDrawerに認識させたい場合に使用する。
- **パラメータ**: `visible` 属性のみ（子要素の配置は行わない）

### arrange

- **対象要素**: `<g>`
- **動作**: `<g>` 直下の `lcdParts="arrangeArea"` を持つ `<rect>` の `x`, `y`, `width`, `height` を描画領域として、その他の子要素を整列・収納する。入れ子可能。

**arrange 自身の属性**

| 属性 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `arrange-axis` | string | `x` | 整列方向。`x`（横並び）または `y`（縦並び）。 |
| `arrange-interval` | number | `0` | 子要素間の余白（px）。 |
| `lcd-flex` | boolean | `false` | `true` のとき arrange 自身の flexible モード（axis 方向圧縮のみ）。`false` のとき overflow 時に全体を均等縮小（uniformScale）。 |

**子要素共通属性**（arrange / textBox / numberingIcon に指定可）

| 属性 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `lcd-fitX` | boolean | `false` | `true` のとき、x方向の初期自然サイズ計算を「無制限」として行う（後述）。 |
| `lcd-fitY` | boolean | `false` | 同上、y方向版。 |
| `lcd-flex` | boolean | textBox=`true`、arrange=`false` | `true` で再描画による圧縮、`false` で均等縮小。 |
| `lcd-verAlign` | string | `top` | x軸arrange内でのcross方向（縦）の揃え位置。`top` / `middle` / `bottom`。 |
| `lcd-holAlign` | string | `left` | y軸arrange内でのcross方向（横）の揃え位置。`left` / `center` / `right`。 |
| `lcd-margin` | number | `0` | cross方向の揃えで使うマージン（px）。`top`/`bottom`/`left`/`right` 揃え時のみ有効。 |
| `lcd-minComRatio` | number | `0` | 圧縮の最小比率（0〜1）。この比率を下限として確保する。 |
| `lcd-fitDir` | string | `screenY` | 親 group の fit 圧縮をかける方向。`screenY`（従来通り画面の縦方向）/ `localY` / `localX`（オブジェクト基準＝回転前の座標系の縦/横方向）。後述。 |

#### lcd-fitDir の動作詳細

`lcdParts="group"` は `groupArea` に収めるため、配下をラッパー `<g>` の `scale(sx, sy)` でまとめて縮小する。このスケールは子要素自身の `transform`（`rotate` など）の**外側**に適用されるため、回転した子に非一様スケール（`sx ≠ sy`）がかかると直交性が崩れ、**平行四辺形状（ひし形）に歪む**。

`lcd-fitDir` に `localX` / `localY` を指定した回転要素は、ラッパーのスケールを打ち消したうえで、`setSize` により**自分の座標系で**縮められる。変換の線形部分が `Diag(sx,sy)·Rot(θ)`（シアーあり）から `Rot(θ)·Diag(kx,ky)`（シアーなし）に変わるため歪まない。

圧縮率は、回転後の外接矩形の高さが従来（`screenY`）と一致するよう決定する。回転角 θ、ローカル寸法 w×h のとき `H = kx·w·|sinθ| + ky·h·|cosθ|` であり、目標 `H = sy·(w·|sinθ| + h·|cosθ|)` から

- `localY`: `ky = (H − w·|sinθ|) / (h·|cosθ|)`
- `localX`: `kx = (H − h·|cosθ|) / (w·|sinθ|)`

を得る。求めた比率が 0 以下になる場合は幾何的に解が存在しないため、`screenY` の従来動作にフォールバックし、コンソールに警告を出す。

#### lcd-fitX / lcd-fitY の動作詳細

fitX/Y を持つ子要素のサイズ決定は3パスで行われる。

**パス1（真の自然サイズ取得）**: その方向の範囲を擬似無限値（1e9）として `setSize` を呼び出し、コンテンツの真の自然サイズを取得する。
- `lcd-flex=true` の textBox：TextDrawer に上限なしの maxWidth を渡し、テキストの真の幅（TextDrawer による圧縮なし）を返す。
- 入れ子 arrange：内部コンテンツの自然サイズを再帰的に計算する。自然幅が内部コンテンツの合計で決まるため、親の範囲に引きずられない。

**パス2（比率計算）**: パス1で得た各子要素の自然サイズを合計し、親arrangeの利用可能幅（arrangeAreaのwidth - interval合計）との比率を算出する。全子要素に**同一の圧縮比率**を適用する（minComRatioによる下限あり）。

**パス3（最終サイズ設定）**: 圧縮比率を適用した実際のサイズで各子要素の `setSize` を呼び出し、描画を確定する。

> **例**: 親arrange width=500, interval=10  
> 子A（多数あ、真の自然幅=3990px、lcd-fitX=true）  
> 子B（東急、真の自然幅=173px、lcd-fitX=true）  
> 圧縮比率 = (500-10) / (3990+173) ≈ 0.118  
> → A=471px、B=20px（同比率で圧縮）

> **注意**: `lcd-flex=false` の textBox は `setSize` で再描画しないため、fitX/Y を指定しても constructor 時の自然幅（入力SVG width で決まる）が effectiveNatural として使われる。真の自然幅を反映させるには `lcd-flex=true` を併用すること。

### arrangeArea

- **対象要素**: `<rect>`（`lcdParts="arrange"` の `<g>` 直下）
- **動作**: 親 `arrange` の描画領域を定義する。`x`, `y`, `width`, `height` を領域として使用する。rect 自体は出力に含まない。

### generate（生成部品）

- **対象要素**: `<g>`（子要素は持たない。あっても無視する）
- **動作**: `genfunc` の生成関数を `genfunc-params` の引数で呼び、返ってきた `<g>` をそのまま出力に追加する。生成関数は画面の座標（1920×1080）で描くため、拡大縮小・移動はしない。重なり順はテンプレートに書いた順。`isDraw` / `visible` はほかの部品と同じ。`svg` 直下と `group` の中で使える（`arrange` / `slot` の中では使えない）。
- **言語の切り替え**: 作り直さない（入線のアニメーションを続ける）。`visible` の変化だけ反映する。
- **後始末**: 生成関数が返した要素に `__cleanup` があれば、次の `draw()` の始めに呼ぶ（アニメーションのタイマーを止める）。

| 属性 | 説明 |
|---|---|
| `genfunc` | 生成関数の名前（下表） |
| `genfunc-params` | 生成関数の引数（JSON）。キーが引数名。書かなかった引数は生成関数の初期値を使う |

**`genfunc-params` の値**

| 値 | 渡すもの |
|---|---|
| 値全体が `"#{変数名}"` 1つの文字列 | drawParams の値を型を変えずに（数値・真偽値・配列・オブジェクト）。参照先が無ければその引数を渡さない |
| `#{変数名}` を含むそれ以外の文字列 | 展開した文字列（`lcdText` と同じ） |
| 数値・真偽値・null・配列・オブジェクト | そのまま（配列・オブジェクトの中も同じ規則で展開する） |

JSON として読めない場合・生成関数が無い場合・生成関数でエラーが起きた場合は、その部品を描かずにコンソールに警告を出す。

**生成関数**（`src/generators/generators.js` の `GENERATORS`）

| `genfunc` | 内容 | 主な引数 |
|---|---|---|
| `rail` | 遠近法の線路1本（枕木・レール） | `anchorY`（線路の位置）、`vanishY`、色など（`RAIL_DEFAULTS`） |
| `platform` | 遠近法のホーム（上面・側面・黄色い線・影） | `referencePos`（`front` / `back`）、`anchorX`・`anchorY`、`width`、`hideTop`・`hideBottom`、`colors` など（`PLATFORM_DEFAULTS`） |
| `train` | 車両の編成 | `cars`・`carLength`・`gap`・`baseX`・`baseY`・`baseMode`、`highlightCarId`・`highlight`・`carLabels`、`drawLine`・`lineColor` など（`TRAIN_DEFAULTS`）。追加の引数: `approach`（入線のアニメーション）、`highlightMixColor`（強調号車の4色に混ぜる色）、`lineLabel`（`{ lineIcon, name, eng }`。列車の上に路線名を描く。`wholeLength` も渡す） |

```xml
<g lcdParts="generate" genfunc="rail" genfunc-params='{"anchorY": 837}' />
<g lcdParts="generate" genfunc="train" genfunc-params='{"cars": "#{platform.train.cars}", "baseY": 818, "approach": true}' />
```

---

## lcdText 属性（テキスト内容テンプレート）

`textBox` / `numberingIcon` 要素が描画する内容を指定するテンプレート文字列。`#{変数名}` の形式で drawParams の値を埋め込める。

```
フォーマット: 任意文字列 + #{変数名} の組み合わせ
```

```xml
<!-- 変数のみ -->
<rect lcdParts="textBox" lcdText="#{stationName}" ... />

<!-- 固定文字＋変数 -->
<rect lcdParts="textBox" lcdText="次は#{stationName}駅" ... />

<!-- 複数変数 -->
<rect lcdParts="textBox" lcdText="#{trainType} #{destination}行" ... />

<!-- ドット記法で入れ子オブジェクトを参照 -->
<rect lcdParts="textBox" lcdText="#{nowStation.eng}" ... />
```

| 記述例 | 展開例（drawParams: `{stationName:"渋谷", nowStation:{eng:"Shibuya"}}`） |
|---|---|
| `"#{stationName}"` | `"渋谷"` |
| `"次は#{stationName}駅"` | `"次は渋谷駅"` |
| `"#{nowStation.eng}"` | `"Shibuya"` |

- `#{変数名}` は `.` 区切りで入れ子オブジェクトを参照できる
- 参照先が存在しない場合は空文字として展開する
- テンプレート展開後の文字列が空文字の場合はその要素を出力に追加しない

---

## visible 属性

`visible` 属性は `lcdParts` とは独立して全ての要素に付与できる。DrawerがSVGをトラバースする際に評価され、`false` と評価された要素はその子孫も含めて出力に追加されない。

### 演算子一覧

| 演算子 | 説明 | 例 |
|---|---|---|
| （なし） | 変数参照。drawParams のキーを参照し、truthy なら `true` | `visible="isJapanese"` |
| `!` | 否定 | `visible="!isEnglish"` |
| `==` | 等価比較。両辺は変数またはリテラル | `visible="nowStation.lineNumberType == 0"` |
| `and` | AND（前後を空白で区切る） | `visible="isJapanese and isStation"` |
| `or` | OR（前後を空白で区切る） | `visible="isJapanese or isEnglish"` |
| `(` `)` | グループ化・優先順位の制御 | `visible="(isA or isB) and isC"` |

**優先順位**: `!` > `==` > `and` > `or`

### 式の文法

```
expr       = orExpr
orExpr     = andExpr ( ' or ' andExpr )*
andExpr    = notExpr ( ' and ' notExpr )*
notExpr    = '!' notExpr | primary
primary    = '(' expr ')' | comparison
comparison = value ( '==' value )?
value      = IDENT | NUMBER
```

実装は `ExprParser.js` の再帰下降パーサーによる。

### 変数解決ルール

- 変数名は `.` 区切りで入れ子オブジェクトを参照できる（例: `nowStation.lineNumberType`）
- `true` / `false` はリテラルとして評価する
- 数値定数は整数・小数いずれも記述可（例: `0`, `3`, `1.5`）
- `==` の両辺が数値に変換できる場合は数値比較、それ以外は文字列比較
- `()` は入れ子可能（例: `!(nowStation.lineNumberType == 0)`）

### 使用例

| visible 値 | 意味 |
|---|---|
| `"isJapanese"` | drawParams.isJapanese が truthy のとき表示 |
| `"!isEnglish"` | drawParams.isEnglish が falsy のとき表示 |
| `"isJapanese and isStation"` | 両方 truthy のとき表示 |
| `"isJapanese or isEnglish"` | いずれか truthy のとき表示 |
| `"nowStation.lineNumberType == 0"` | drawParams.nowStation.lineNumberType が 0 のとき表示 |
| `"(isA or isB) and isC"` | isC が true かつ isA か isB のいずれかが true のとき表示 |
| `"!(nowStation.lineNumberType == 0)"` | lineNumberType が 0 以外のとき表示 |
