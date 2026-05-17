# Drawer API リファレンス

`public/lcdDisplay/src/main/Drawer.js` が提供するクラス `Drawer` の公開APIをまとめる。

---

## メソッド一覧

| メソッド | 戻り値 | 概要 |
|---|---|---|
| `load(drawParams, iconList, numIconPresets, headerSVG, bodySVGMap)` | — | 初期化。ロード済みの全リソースを受け取り内部状態をセットアップする |
| `draw(drawParams)` | `DocumentFragment` | 描画パラメータを受け取りツリーを構築、`<defs>` + コンテンツ `<g>` を返す |
| `setDebug(value)` | — | デバッグ境界表示の有効/無効を切り替える |
| `langChange(newLangId, transTime, gapTime)` | — | 言語を切り替え、visible の変化をアニメーション遷移させる |

---

## メソッド詳細

### `load(drawParams, iconList, numIconPresets, headerSVG, bodySVGMap)`

初期化。index.html 側でロード済みの全リソースを受け取り、内部状態をセットアップする。

| 引数 | 型 | 内容 |
|---|---|---|
| `drawParams` | object | `drawParams.json` の内容 |
| `iconList` | object | `iconList.json` の内容 |
| `numIconPresets` | `{ key: SVGElement }` | ナンバリングアイコンのプリセットSVGマップ |
| `headerSVG` | SVGElement | ヘッダーSVG (`headerSVG.svg`) の DOM |
| `bodySVGMap` | `Map<filename, SVGElement>` | ボディSVG群の DOM マップ |

内部処理として、`_normalizeSVGDefsRefs` / `_resolveFuncCalls` をヘッダー・ボディ全SVGに適用してキャッシュし、`TextDrawer` と `NumIconDrawer` を生成する。初期表示ページは `drawParams.Pages[0]` にセットされる。

---

### `draw(drawParams)`

描画パラメータを受け取り、オブジェクトツリーを構築して `<defs>` とコンテンツ `<g>` をまとめた `DocumentFragment` を返す。呼び出し側は受け取ったフラグメントをそのまま描画先SVGに `appendChild` すればよい。表示するボディSVGは `drawParams.page` のファイル名で決まる。

| 引数 | 型 | 内容 |
|---|---|---|
| `drawParams` | object | 描画パラメータ（`drawParams.json` 相当）。`page` フィールドで表示ページを指定する |

**戻り値：** `DocumentFragment`（`<defs>` + ボディ/ヘッダーを含む `<g>`）

---

### `setDebug(value)`

デバッグ表示の有効/無効を切り替える。有効にすると arrangeArea 境界（青）・末端要素境界（赤）が表示される。次の `draw()` 呼び出し時に反映される。

| 引数 | 型 | 内容 |
|---|---|---|
| `value` | boolean | `true` で有効、`false` で無効 |

---

### `langChange(newLangId, transTime, gapTime)`

表示言語を切り替え、オブジェクトツリー全体に `langChange` を伝播する。`visible` の変化をアニメーション遷移させる。

| 引数 | 型 | 内容 |
|---|---|---|
| `newLangId` | number | 切り替え先の言語ID |
| `transTime` | number | フェードイン/アウトの遷移時間 [ms] |
| `gapTime` | number | 遷移開始までの遅延時間 [ms] |

---

## ページ管理

ボディSVGのページ切替に関する責務の分担は以下の通り。

| 責務 | 担当 |
|---|---|
| ページ一覧の管理 | `pageNameList.json` |
| ボディSVGのフェッチ・キャッシュ | index.html（`loadBodySVGs`）→ `load()` |
| 現在のページインデックス管理 | index.html（`currentPageIndex` 変数） |
| 表示ページの指定 | `drawParams.page`（`draw()` に渡す） |

- ページ一覧は `pageNameList.json` で管理し、`drawParams` には含まない。
- `load()` 時点で `pageNameList.json` に列挙された全ボディSVGがキャッシュされる。ページ切替時にフェッチは発生しない。
- 表示するページは `drawParams.page` のファイル名で決まる。ページ送り時は index.html がインデックスを進め、`drawParams.page` を更新してから `draw()` を呼ぶ。

---

## プロパティ

公開プロパティはありません。
