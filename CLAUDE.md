# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へ提供するガイダンスです。

## 開発フロー

機能追加・変更・バグ修正を行う際は、必ず以下の順序で進めること：

1. **`spec.md` を先に更新する** — 変更内容をデータモデル・コンポーネント・仕様に反映する
2. **ユーザーに確認をとる** — 仕様書の更新が完了した時点で内容を提示し、承認を得てからコード修正に進む
3. **コードを修正する** — 承認された仕様書に従って実装する

## コーディング規約

ソースコードを編集する際は、要所要所に **日本語** でコメントを書き込むこと。  
既存のコメントは、内容が変更になる場合や誤りがある場合を除き改変しないこと。

## コマンド

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # Next.js リント実行

# SVGプリセットを追加・変更した後にアイコン型定義を再生成する
node scripts/generatePresetNumIconTexts.js
```

## アーキテクチャ

**Next.js 15 (App Router) + TypeScript** で構築された、日本の鉄道LCD行先表示器をシミュレートするWebアプリケーション。設定可能なエディタを通じて、列車の表示画面設定を生成する。

### データモデル (`app/type.ts`)

中核となる `settingType` オブジェクトがすべてを制御する：
- `info` — 全体設定（名前、ループモード、GPS連動移動）
- `operationList[]` — 行先表示エントリ（行先、種別、両数、タイミング、路線情報）
- `stationList[]` — 駅データ（駅名、番号、乗換情報、ドア位置、駅アイコン）
- `lineDict` — IDをキーとした路線メタデータ（アイコンキー、多言語名、色）
- `iconDict` — IDをキーとしたアイコンプリセット割り当て

### コンポーネント構成 (`app/components/`)

`Editor.tsx` がメインのオーケストレーターで、トップレベルの状態を保持し、以下へ渡す：
- `EditorHead.tsx` — 全体設定フォーム
- `LineList.tsx` — 路線設定パネル
- `StationList.tsx` / `StationParamSetter.tsx` — 駅設定
- `OperationForm.tsx` — 運行ごとの行先表示設定
- `IconList.tsx` — アイコンプリセット管理
- `MapComponent.tsx` — Google Maps連携（`@react-google-maps/api`）

### アイコン生成パイプライン

SVGプリセットは `assets/presetNumIcons/` に配置（例：`I_JR_east.svg`、`I_tokyu.svg`）。`scripts/generatePresetNumIconTexts.js` を実行すると、`src/generated/presetNumIconTexts.ts` にTypeScript定数としてコンパイルされる。アイコンプリセットを追加・変更した際はこのスクリプトを実行すること。

クライアントサイドのアイコン描画は `app/modules/createIconFromPreset.client.ts` で処理（`.client.ts` サフィックス = ブラウザ専用コード）。

### 表示出力 (`public/`)

実際にシミュレートされるLCD画面のテンプレートは `public/display.html` および `public/Display_JW-225.html` に配置。関連するCSS/JSは `public/css/`、`public/js/`、`public/displaySvg/` にある。

### パスエイリアス

`@/*` はプロジェクトルート（`./`）にマップされており、`tsconfig.json` で設定されている。
