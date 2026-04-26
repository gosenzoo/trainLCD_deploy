# lcdDisplay システム概要・アーキテクチャ

## システム概要

**lcdDisplay** は鉄道LCD行先表示をリアルタイムに描画・制御するシステムで、`public/display.html` 上で動作する。

### システム図

```
┌──────────────────────────────────────────────────────────────┐
│  lcdDisplay                                                  │
│                                                              │
│  入力                                    出力                │
│  ─────────────────────────────────────   ──────────────────  │
│  stationList   ──┐                       lcdSVG             │
│  operationList ──┤                       （現在状態を反映    │
│  lineList      ──┼──▶  描画・制御  ──▶   したSVG要素）      │
│  headerSVG     ──┤                                           │
│  defaultLineSVG──┤                                           │
│  platformSVG   ──┤                                           │
│  iconList      ──┘                                           │
│                                                              │
│  インターフェイス（ユーザー操作）                             │
│  ─────────────────────────────────────                       │
│  駅を進める / 戻す  ──▶  表示を再描画                        │
│  状態を進める / 戻す ──▶  表示を再描画                       │
└──────────────────────────────────────────────────────────────┘
```

### 入力

| 入力 | 説明 |
|---|---|
| `stationList` | 駅リスト（`stationType[]`） |
| `operationList` | 運用リスト（`operationType[]`） |
| `lineList` | 路線定義（`Record<string, lineType>`） |
| `headerSVG` | ヘッダー・背景用SVGテンプレート（`header.svg`） |
| `defaultLineSVG` | 標準路線図ボディ・フッター用SVGテンプレート（`defaultLine.svg`） |
| `platformSVG` | ホーム案内ボディ用SVGテンプレート（`platform.svg`） |
| `iconList` | アイコン定義（`Record<string, string \| iconParamsType>`） |

`headerSVG` / `defaultLineSVG` / `platformSVG` は `defs.svg`（グラデーション・フィルター定義）を参照する形式で管理される。

### 出力

| 出力 | 説明 |
|---|---|
| `lcdSVG` | 現在の進行状態・駅・運用を反映したSVG要素。`<g>` ルート要素として構成され、`display.html` 内の `<svg id="display">` に書き込まれる。 |

### インターフェイス（ユーザー操作）

| 操作 | キーボード | タッチ（スマートフォン） |
|---|---|---|
| 状態を戻す（つぎは→ただいま 等） | `←` | 画面左下タップ |
| 状態を進める（ただいま→まもなく 等） | `→` | 画面右下タップ |
| 駅を戻す | `a` | 画面左上タップ |
| 駅を進める | `d` | 画面右上タップ |

---

## 内部処理アーキテクチャ

### データフロー全体図

```
                  ┌──────────────────────────────────────────────┐
stationList ──────┼──▶ progressController ──▶ 進行パラメータ ──┐ │
operationList ────┼──▶ pageController     ──▶ ページパラメータ─┼─┼──▶ dataProcessor ──▶ 描画パラメータ ──▶ drawer ──▶ lcdSVG
lineList ─────────┼──▶ langController     ──▶ 言語パラメータ ──┘ │                                            ↑
                  └──────────────────────────────────────────────┘                              headerSVG ──┤
                                                                                             defaultLineSVG ─┤
                                                                                                platformSVG ─┤
                                                                                                   iconList ──┘
```

### コントローラー層

3つのコントローラーが独立して状態を管理し、それぞれパラメータを出力する。

| コントローラー | 旧名称 | 役割 | 出力パラメータ |
|---|---|---|---|
| `progressController` | `progressController`（同一） | 現在駅・走行状態（つぎは/まもなく/ただいま/通過中）を管理 | 進行パラメータ |
| `pageController` | `pageRotator` | 表示するボディページ種別・切り替えタイミングを管理 | ページパラメータ |
| `langController` | 新規 | 表示言語（日本語/英語）・切り替えタイミングを管理 | 言語パラメータ |

各コントローラーは `stationList` / `operationList` / `lineList` を参照して状態を決定する。

### dataProcessor

3つのコントローラーが出力した各パラメータを受け取り、`stationList` / `operationList` / `lineList` と突き合わせて **描画パラメータ** に変換する処理機構。

- 入力: 進行パラメータ・ページパラメータ・言語パラメータ・stationList・operationList・lineList
- 出力: 描画パラメータ（実際に表示するテキスト内容・色・表示位置等を含む）

コントローラーが「何の状態か」を決定するのに対し、dataProcessor は「その状態で何を描くか」を決定する役割を担う。

### drawer 機構

描画パラメータと入力SVGテンプレート・iconList を組み合わせて `lcdSVG` を生成する。

- 入力: 描画パラメータ・headerSVG・defaultLineSVG・platformSVG・iconList
- 出力: lcdSVG

内部では `HeaderDrawer` / `DefaultLineDrawer` / `PlatformDrawer` / `FooterDrawer` 等の各Drawerが、ページパラメータに応じて組み合わされる。

SVG要素のトラバース処理・`visible` 属性・`lcdParts` 属性の仕様は [lcdParts.md](./lcdParts.md) を参照。
