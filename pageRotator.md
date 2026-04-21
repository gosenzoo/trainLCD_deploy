# PageRotator 仕様書

ページ（表示コンテンツ）をパターンに従って自動切り替えするクラス。  
`restart(pattern)` でパターンを設定して動作を開始し、`stop()` で停止する。

---

## コンストラクタ引数

| 引数名 | 型 | 説明 |
|---|---|---|
| `onSwitch` | `Function` | ページ切り替え時に呼び出すコールバック。`PageRotator` インスタンス自身が引数として渡される |

---

## 設定値

| 変数名 | 型 | 説明 |
|---|---|---|
| `onSwitch` | `Function` | ページ切り替え時コールバック（constructor で固定） |

---

## 可変状態

| 変数名 | 型 | 初期値 | 説明 |
|---|---|---|---|
| `pattern` | `[any, number][] \| null` | `null` | 切り替えパターン。各要素は `[pageObj, 表示時間ms]` のタプル |
| `index` | `number` | `0` | 次に表示するパターン要素のインデックス |
| `currentPage` | `any \| null` | `null` | 現在表示中のページオブジェクト |
| `timerId` | `number \| null` | `null` | 次回切り替えのタイマーID。停止中は `null` |
| `isRunning` | `boolean` | `false` | 切り替えループが動作中かどうか |

---

## メソッド

| メソッド名 | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `restart(pattern)` | `pattern: [any, number][]` | `void` | 現在の動作を停止し、新しいパターンで切り替えを再開始する |
| `stop()` | なし | `void` | タイマーをクリアして切り替えループを停止する |
| `getCurrentPage()` | なし | `any \| null` | `currentPage` をそのまま返す |
| `getCurrentIndex()` | なし | `number` | 現在表示中のパターンインデックスを返す（`pattern` が空なら `-1`） |

---

## プライベートメソッド

| メソッド名 | 説明 |
|---|---|
| `#switchAndSchedule()` | パターン長に応じて `#switchSingle` または `#switchMultiple` を呼び分ける |
| `#switchSingle()` | パターン要素数1のとき。先頭ページを固定表示し、以後タイマーを設定しない |
| `#switchMultiple()` | パターン要素数2以上のとき。現在インデックスのページを表示し、`durationMs` 後に次のページへ切り替えるタイマーをセット |

---

## pattern の構造

```
pattern = [
  [pageObj, durationMs],  // index 0
  [pageObj, durationMs],  // index 1
  ...
]
```

| フィールド | 型 | 説明 |
|---|---|---|
| `pageObj` | `any` | `onSwitch` コールバックに渡す任意のページオブジェクト |
| `durationMs` | `number` | このページを表示し続ける時間（ミリ秒） |

---

## getCurrentIndex の算出ロジック

`index` は「次に表示するインデックス」を指すため、現在表示中のインデックスは1つ前になる。

```
getCurrentIndex = (index - 1 + pattern.length) % pattern.length
```

---

## 動作フロー

```
restart(pattern)
  └─ stop()                      // 既存タイマーをクリア
  └─ pattern / index / isRunning をリセット
  └─ #switchAndSchedule()
       ├─ pattern.length === 1 → #switchSingle()
       │    └─ currentPage を固定、onSwitch 呼び出し、タイマーなし
       └─ pattern.length >= 2 → #switchMultiple()
            └─ currentPage を更新、onSwitch 呼び出し
            └─ durationMs 後に #switchAndSchedule() を再帰スケジュール
```
