# デバッグDrawer

本番Drawer実装に先行して、単独動作可能なデバッグ用Drawerを `public/lcdDisplay/` に配置する。

---

## 配置ファイル

| ファイル | 役割 |
|---|---|
| `Drawer.js` | Drawerクラス本体。同フォルダの `drawParams.json` / `iconList.json` / `headerSVG.svg` / `defs.svg` を固定パスで読み込む |
| `ExprParser.js` | `visible` 属性の論理式を評価する再帰下降パーサー |
| `index.html` | テスト用HTMLページ。描画結果の表示と drawParams の編集・再描画UIを提供する |
| `drawParams.json` | テスト用描画パラメータ（boolean フラグ・テキスト・入れ子オブジェクト） |
| `iconList.json` | テスト用アイコンリスト |
| `headerSVG.svg` | テスト用SVGテンプレート。`lcdParts` / `visible` / `lcdText` 属性を使って記述 |
| `defs.svg` | グラデーション・フィルター定義（`header.svg` / `defaultLine.svg` 等と共通形式） |
| `doc/` | 本仕様書ディレクトリ |

---

## Drawer クラス API

| メソッド | 説明 |
|---|---|
| `async load()` | `drawParams.json` / `iconList.json` / `headerSVG.svg` / `defs.svg` を並列フェッチして初期化する。テンプレートSVGの URL を正規化する |
| `draw(targetSVG)` | `<defs>` を `targetSVG` の先頭に注入し、コンテンツの `<g>` を返す |
| `_normalizeSVGDefsRefs(svgEl)` | `url(./defs.svg#id)` → `url(#id)` に変換する |
| `_traverse(element, parent)` | 再帰トラバース。`visible` 評価 → `lcdParts` 分岐 |
| `_resolveValue(token)` | drawParams からドット記法で値を解決して返す |
| `_createText(rectEl)` | `textBox` 用テキスト生成（TextDrawer 呼び出し） |

---

## ExprParser クラス API

| メソッド | 説明 |
|---|---|
| `tokenize(expr)` | 式文字列をトークン列に変換する |
| `eval(expr, resolveValue)` | 式を評価して boolean を返す。`resolveValue` は変数名→生の値を返す関数 |

---

## defs の読み込みと URL 正規化

`headerSVG.svg` 内の `url(./defs.svg#id)` 形式の参照はブラウザが外部ファイル参照として解決できない環境（Vercel 等）では描画されない。そのため Drawer は以下の処理を行う。

1. `load()` で `defs.svg` を並列フェッチして保持する
2. フェッチ後に `_normalizeSVGDefsRefs()` でテンプレートSVG内の `url(./defs.svg#id)` を `url(#id)` に変換する
3. `draw(targetSVG)` でコンテンツの `<g>` を返す前に、`<defs>` 要素をターゲット `<svg>` の最初の子として直接注入する

---

## index.html の描画パラメータ編集UI

- drawParams の各エントリを型に応じた入力フィールドとして自動生成する
  - `boolean` → チェックボックス
  - `number` → 数値入力
  - `object` / `array` → JSON テキストエリア
  - `string` → テキスト入力
- 「再描画」ボタン押下で入力値を `drawer.drawParams` に反映し、SVGを再描画する
