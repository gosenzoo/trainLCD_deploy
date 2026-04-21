# ProgressController 状態変数一覧

## 設定値（constructor で固定）

| 変数名 | 型 | 説明 |
|---|---|---|
| `passList` | `number[]` | 各駅の通過フラグ一覧（通過なら1） |
| `isLoop` | `boolean` | 環状運転かどうか |
| `stationNum` | `number` | 移動可能範囲の駅数（`passList.length`） |
| `statesPerStation` | `number` | 1駅あたりの状態数（固定値: 3） |
| `stateIndNum` | `number` | 全状態数（`statesPerStation × stationNum`） |
| `stationIndMin` | `number` | 状態インデックスの最小値（非環状: 2、環状: 0） |
| `stationIndMax` | `number` | 状態インデックスの最大値（`3 × stationNum - 1`） |
| `stopTimeLimit` | `number` | 長時間停車とみなすまでの時間（ミリ秒、固定値: 30000） |

---

## 可変状態

| 変数名 | 型 | 説明 |
|---|---|---|
| `_stateInd` | `number` | 状態インデックス本体（`stateInd` getter/setter 経由でアクセス） |
| `isLongStop` | `boolean` | 長時間停車中かどうか |
| `stopTimerId` | `number \| null` | 長時間停車計測タイマーのID |
| `stopTimer` | `number \| null` | タイマーリセット用（`stateInd` setter 内でクリア） |
| `_onLongStop` | `Function \| null` | 長時間停車イベント時に呼び出すコールバック |

---

## getter（派生値）

| getter名 | 型 | 算出ロジック |
|---|---|---|
| `stateInd` | `number` | `_stateInd` をそのまま返す |
| `currentStationInd` | `number` | `stateInd ÷ statesPerStation`（切り捨て）― 現在駅インデックス |
| `sectionInd` | `number` | `(stateInd - (statesPerStation - 1)) ÷ statesPerStation`（切り捨て）― 現在区間インデックス |
| `posState` | `number` | `stateInd % statesPerStation` ― 位置状態（0: 線路上前方, 1: 駅手前, 2: 駅の上） |
| `runState` | `number` | 通過駅または `posState !== 2` なら 0（走行中）、停車駅かつ `posState === 2` なら 1（停車中） |
| `isCurrentStationPass` | `boolean` | `passList[currentStationInd]` ― 現在駅が通過駅かどうか |
| `isTerminal` | `boolean` | 非環状運転時のみ有効。現在駅以降に停車駅がなければ `true` |
| `isFinalSection` | `boolean` | 非環状運転時のみ有効。`currentStationInd === stationNum - 1` で `true` |

---

## `progressParams`（外部公開スナップショット）

`progressParams` getter がまとめて返すオブジェクト。Drawerクラス等への受け渡しに使用。

| フィールド名 | 元の getter |
|---|---|
| `currentStationInd` | `currentStationInd` |
| `sectionInd` | `sectionInd` |
| `posState` | `posState` |
| `runState` | `runState` |
| `isCurrentStationPass` | `isCurrentStationPass` |
| `isLongStop` | `isLongStop`（可変状態） |
| `isTerminal` | `isTerminal` |

---

## posState・runState の値の意味

### posState（位置状態）

| 値 | 意味 |
|---|---|
| `0` | 直前駅と現在駅の間の線路上 |
| `1` | 現在駅の手前（通過駅では使用されない） |
| `2` | 現在駅の上（停車位置） |

### runState（走行状態）

| 値 | 意味 |
|---|---|
| `0` | 走行中（または通過） |
| `1` | 停車中 |
