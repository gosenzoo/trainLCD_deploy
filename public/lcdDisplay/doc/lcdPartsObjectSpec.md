# lcdParts オブジェクト仕様書

`arrange` の描画は、SVG要素を再帰的にオブジェクト化してから配置処理を行う。
各要素の「描画後の実際のサイズ」に基づいてレイアウトを決定するためである。

---

## オブジェクト共通仕様

すべての lcdParts オブジェクトが持つフィールド・メソッド。

### 共通フィールド

| フィールド | SVG属性名 | 型 | 説明 |
|---|---|---|---|
| `x, y` | — | number | 配置座標（親から指定される） |
| `width, height` | — | number | 割り当て領域のサイズ（親から指定される） |
| `realX, realY` | — | number | 実際の描画座標 |
| `realWidth, realHeight` | — | number | 実際の描画サイズ |
| `verticalAlign` | `lcd-verAlign` | `"top"` \| `"center"` \| `"bottom"` | 縦方向の揃え位置 |
| `horizontalAlign` | `lcd-holAilgn` | `"left"` \| `"center"` \| `"right"` | 横方向の揃え位置 |
| `flexible` | `lcd-flex` | boolean | axis方向のみの圧縮（比率変更）を許可するか |
| `margin` | `lcd-margin` | number | axis と逆方向の余白（px）。align の端からの距離 |
| `minComRatio` | `lcd-minComRatio` | number | 最小圧縮率。この比率を超えて圧縮が必要になると、圧縮余裕のある他要素が優先的に圧縮される |

### 共通メソッド

| メソッド | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| コンストラクタ | SVG DOM要素 | — | 要素からフィールドを初期化する |
| 座標設定 | `x, y` | なし | 引数をそのままフィールドに格納する |
| 実際の大きさ取得 | なし | `{ width, height }` | 実際の描画サイズを返す |
| 実際の大きさ設定 | `width, height` | `{ width, height }` | 指定サイズで再描画し、実際に設定されたサイズを返す（指定値と異なる場合がある） |
| svg要素出力 | なし | SVG要素 | 描画結果のSVG要素を返す |

### `margin` の適用方向

`margin` は **axis と逆方向** の align にのみ適用される。

| axis | 適用される align | 動作 |
|---|---|---|
| `"x"` | `verticalAlign="top"` | 上端から `margin` px 下げる |
| `"x"` | `verticalAlign="bottom"` | 下端から `margin` px 上げる |
| `"x"` | `verticalAlign="center"` | 無効（margin は 0 として扱う） |
| `"y"` | `horizontalAlign="left"` | 左端から `margin` px 右へ |
| `"y"` | `horizontalAlign="right"` | 右端から `margin` px 左へ |
| `"y"` | `horizontalAlign="center"` | 無効（margin は 0 として扱う） |

### `flexible` による「実際の大きさ設定」の挙動

| `flexible` | 動作 |
|---|---|
| `true` | 渡された `width`/`height` で再描画する。axis方向にはみ出す場合はその方向のみ圧縮する（縦横比が変わる） |
| `false` | `verticalAlign`/`horizontalAlign` に対応する基準点（四隅またはcenter）を固定し、縦横比を維持したまま全体を縮小する |

---

## ArrangeArea オブジェクト（`lcdParts="arrange"` の `<g>` に対応）

### フィールド

共通フィールドに加えて：

| フィールド | SVG属性名 | 型 | 説明 |
|---|---|---|---|
| `axis` | `arrange-axis` | `"x"` \| `"y"` | 子要素を並べる方向（横 or 縦） |
| `interval` | `arrange-interval` | number | 子要素間の間隔（px） |
| `arg` | `lcd-arg` | `{ [引数名]: 配列 }` | `lcd-arg` 属性から取得。引数名と描画パラメータの配列値を対応付けて保持 |
| `children` | — | オブジェクト配列 | 子要素のオブジェクト |

### コンストラクタの処理順序

1. `svgDom` の `lcdParts` が `"arrange"` であることを確認する
2. 最初の子要素が `lcdParts="arrangeArea"` の `<rect>` であることを確認し、その `x`, `y`, `width`, `height` を自身の領域フィールドに保存する
3. `svgDom` に `lcd-arg` 属性があれば、カンマ区切りで引数名を取り出し、各引数名に対応する描画パラメータを探す。値が配列であれば `{ 引数名: 配列 }` として `arg` フィールドに保持する
4. `svgDom` の子要素をすべて探索し、各要素の `lcdParts` に対応するオブジェクトを生成して `children` に格納する

### `lcd-arg` と `$引数名` の展開

**親 arrange での引数宣言**

- `<g lcdParts="arrange" lcd-arg="a, b">` のようにカンマ区切りで引数名を宣言する
- 各引数名について `drawParams` から値を取得し、`{ 引数名: 配列 }` として `arg` フィールドに保持する
- 引数の配列は入れ子（配列の要素が配列）も許容する。配列要素の型は問わない

**子要素での複製指定**

- 子要素に `lcd-arg="$a"` と指定すると、その子要素が引数 `a` の配列要素数だけ複製され、親の `children` に順番に追加される
- 別の子要素に `lcd-arg="$b"` を指定すると、その子要素は `b` の要素数だけ独立して複製される

**実装方針：DOM置換ではなくコンストラクタ引数で渡す**

- 属性値をDOMレベルで文字列置換するのではなく、各コピーのコンストラクタに現在の配列要素を引数として渡す
- コンストラクタは `args` パラメータ（`{ 引数名: 現在の配列要素 }`）を追加で受け取る
- 属性値中の `$a` や `$a.name`（ドット記法対応）は、`args.a` または `args.a.name` として解決する
  - ドット記法の解決は drawParams の `#{...}` 参照と同じロジック
- `$引数名` はすべての属性値で置換対象となる（`lcdText`・`visible`・その他カスタム属性含む）

```xml
<!-- 例: drawParams.stations = [{name:"渋谷", eng:"Shibuya"}, {name:"恵比寿", eng:"Ebisu"}] -->
<g lcdParts="arrange" arrange-axis="x" lcd-arg="stations">
  <rect lcdParts="arrangeArea" x="0" y="0" width="600" height="50" />
  <!-- この子要素は2つ複製。コンストラクタに args={stations: {name:"渋谷",...}} が渡される -->
  <rect lcdParts="textBox" lcdText="$stations.name" lcd-arg="$stations" ... />
</g>
```

### 実際の大きさ取得

`children` を `axis` 方向に順番に並べた際の全体 width / height を計算して返す。

### svg要素出力

`children` を `axis` 方向に、揃え位置（align）に詰めて `interval` 間隔で並べ、`<g>` にまとめて返す。

### `minComRatio` による圧縮優先制御アルゴリズム

同一 arrange 内の子要素を axis 方向に並べる際、合計サイズが領域を超えた場合に圧縮を行う。

1. すべての子要素を同一の圧縮率で圧縮できるか試みる
2. ある要素の圧縮率が `minComRatio` を下回る場合、その要素の圧縮率を `minComRatio` で止め、残りの要素を対象に等圧縮率で再計算する
3. 手順2を繰り返す
4. すべての要素が `minComRatio` に達してもなお領域が不足する場合、全要素をさらに等圧縮率で圧縮する

---

## TextBox オブジェクト（`lcdParts="textBox"` の `<rect>` に対応）

### フィールド

共通フィールドに加えて：

| フィールド | 型 | 説明 |
|---|---|---|
| `text` | string | 展開済みテキスト文字列 |
| `style` | object | `data-style` 属性の値（JSON） |

### コンストラクタの処理順序

1. `lcdParts="textBox"` の `<rect>` DOM を受け取る
2. `x`, `y`, `width`, `height`（最大領域）をフィールドに格納する
3. `lcdText` を展開してテキスト文字列を `text` に格納する。`data-style` を `style` に格納する
4. TextDrawer で従来の処理通り描画し、**実際に描画された範囲**（文字数等によって最大領域より小さくなる）を `realWidth`, `realHeight` として格納する
   - 参考実装: `TransferListWidget` 周辺の処理

### 実際の大きさ取得

保持している `realWidth`, `realHeight` を返す。

### 実際の大きさ設定

指定された `width`, `height` で TextDrawer を使って再描画し、設定後の実サイズを返す。

### svg要素出力

描画済みの SVG テキスト要素を返す。

