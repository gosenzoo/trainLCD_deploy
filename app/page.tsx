import Image from "next/image";
import styles from "./page.module.css";
import Editor from "./components/Editor";

export default function Home() {
  return (
    <div>
      {/* ヘッダーは「表示」ボタンが設定の state を使うため Editor 内で描画する */}
      <Editor/>
      <footer className="app-footer">
        <p>ポケットLCD — 鉄道LCD行先表示器シミュレーション</p>
      </footer>
    </div>
  );
}
