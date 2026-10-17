// アプリのバージョン情報（7.39節）。バージョンを変えるときは次の2か所だけを書き換える:
// - 数字: package.json の "version"（唯一の定義元）
// - 付記: 下の APP_VERSION_SUFFIX（beta など。付けない場合は空文字）
import packageJson from '../package.json'

// バージョンの数字（例: 0.1.0）。設定データの 0_metadata.version にも入れる
export const APP_VERSION: string = packageJson.version

// バージョンの付記（例: beta）。空文字なら付けない
export const APP_VERSION_SUFFIX: string = 'beta'

// 画面に表示するバージョン文字列（例: 0.1.0(beta)）
export const APP_VERSION_LABEL: string = APP_VERSION_SUFFIX ? `${APP_VERSION}(${APP_VERSION_SUFFIX})` : APP_VERSION
