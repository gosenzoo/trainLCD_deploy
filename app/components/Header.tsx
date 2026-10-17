type Props = {
    // 「表示」ボタンのクリック時に呼ぶ（設定を保存して表示画面を別タブで開く）
    onDisplay: () => void
}

// 画面上部のヘッダー。タイトルの右に「表示」ボタンを置く
const Header = ({ onDisplay }: Props) => {
    return(
        <div className="app-header">
            <h1>LCDシミュレーター</h1>
            <button onClick={onDisplay} className="btn-primary app-header-display-btn">表示</button>
        </div>
    )
}

export default Header
