import Image from "next/image";
import styles from "./page.module.css";
import Header from "./components/Header";
import Editor from "./components/Editor";

export default function Home() {
  return (
    <div>
      <Header/>
      <Editor/>
      <footer className="app-footer">
        <p>LCDシミュレーター — 鉄道LCD行先表示器シミュレーション</p>
      </footer>
    </div>
  );
}
