import { APP_VERSION_LABEL } from '../version'

type Props = {
    // 「表示」ボタンのクリック時に呼ぶ（設定を保存して表示画面を別タブで開く）
    onDisplay: () => void
}

// 画面上部のヘッダー。左にアプリ名とバージョン、右端に「表示」ボタンを置く
const Header = ({ onDisplay }: Props) => {
    return(
        <div className="app-header">
            <h1>ポケットLCD</h1>
            <span className="app-header-version">{APP_VERSION_LABEL}</span>
            <button onClick={onDisplay} className="btn-primary app-header-display-btn">表示</button>
        </div>
    )
}

export default Header
