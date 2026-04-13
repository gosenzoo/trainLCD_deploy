import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import "../type"
import initSettingObject from "../initSettingObject"
import ToggleSwitch from './ToggleSwitch'

type editorHeadType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

function mergeProperties<T extends object, U extends object>(A: T, B: U): T & U {
  for (const key of Object.keys(B) as Array<keyof U>) {
    if (!Object.hasOwn(A, key)) {
      // @ts-expect-error: AとBの型をマージしているため
      A[key] = B[key];
    }
  }
  return A as T & U;
}

const EditorHead: React.FC<editorHeadType> = ({setting, setSetting}) => {
    const [displayType, setDisplayType] = useState<string>("tokyu")
    const router = useRouter()
    let readData: settingType;

    const inputToSetting = (e: any) => {
        try{
            const file = e.target.files[0]

            if (file) {
                const reader = new FileReader()
                reader.onload = (ee: any) => {
                    try {
                        readData = JSON.parse(ee.target.result)
                        mergeProperties(readData.operationList, initSettingObject.operation);
                        readData.stationList.forEach(station => {
                            mergeProperties(station, initSettingObject.station);
                        });
                        Object.values(readData.lineDict).forEach(line => {
                            mergeProperties(line, initSettingObject.line);
                        });
                    }
                    catch (err) {
                        alert('設定ファイル読み込み時にエラーが発生')
                    }
                }
                reader.readAsText(file);
            }
        }
        catch(err){
            alert('設定ファイル読み込み時にエラーが発生')
        }
    }
    
    const downloadFromSettings = () => {
        const promptReturn = window.prompt("名前を付けてダウンロード", setting.info.settingName)
        if(!promptReturn){ return }
        
        const _setting = structuredClone(setting)
        _setting.info.settingName = promptReturn
        setSetting(_setting)
        if (setting && promptReturn) {
            const blob = new Blob([JSON.stringify(setting, null, ' ')], {type: 'application\/json'});
            const downloadUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.href = downloadUrl;
            downloadLink.download = `${promptReturn}.json`;
            downloadLink.click();
        }
    }
    const displayTypeSelectChanged = (e: any) => {
        setDisplayType(e.target.value)
    }
    const openDisplay = () => {
        if(displayType === "JW-225"){ 
            localStorage.setItem('lcdStrage', JSON.stringify(setting))
            window.open('./Display_JW-225.html')
        }
        if(displayType === "tokyu"){ 
            localStorage.setItem('lcdStrage', JSON.stringify(setting))
            window.open(`./display.html`, '_blank', 'noopener')
        }
        if(displayType === "JE-E131"){ console.log("ないです") }
    }

    const formUpdated = (e:any, field: infoMembers) => {
        if(!setting){
            return
        }
        if(!setting.info){
            return
        }

        const _setting: settingType = structuredClone(setting)

        //テキストボックス入力の場合
        // infoMembers は値型が混在するユニオンのため as never でキャストする
        _setting.info[field] = e.target.value as never

        setSetting(_setting)
    }

    // トグルスイッチ用ハンドラ（boolean 値を直接受け取る）
    const toggleUpdated = (checked: boolean, field: infoMembers) => {
        if(!setting || !setting.info){ return }
        const _setting: settingType = structuredClone(setting)
        _setting.info[field] = checked as never
        setSetting(_setting)
    }

    return(
        <div>
            <h2>ファイル操作</h2>
            <div className="btn-group">
                <button onClick={e => {
                    const lcdStrageItem = localStorage.getItem('lcdStrage');
                    if(!lcdStrageItem){
                        alert("localStrageにアイテムがありません");
                        return;
                    }
                    const setting = JSON.parse(lcdStrageItem);
                    setSetting(setting);
                }}>LocalStorageから読み込み</button>
                <button onClick={downloadFromSettings} className="btn-primary">設定をダウンロード</button>
                <button onClick={(e) => {
                    if(window.confirm("全ての設定を初期化します\nダウンロードしていないデータは戻りません")){
                        setSetting(initSettingObject.setting);
                    }
                    return;
                }} className="btn-danger">設定を初期化</button>
            </div>
            <div className="form-row">
                <label>設定ファイル入力</label>
                <input id="settingInput" type="file" onChange={inputToSetting}></input>
            </div>
            <div className="btn-group">
                <button onClick={(e) => {
                    let _setting = setting;
                    _setting.operationList = readData.operationList;
                    setSetting(_setting);
                }}>運用読み込み</button>
                <button onClick={(e) => {
                    let _setting = setting;
                    _setting.stationList = readData.stationList;
                    setSetting(_setting);
                }}>駅読み込み</button>
                <button onClick={(e) => {
                    let _setting = setting;
                    _setting.lineDict = readData.lineDict;
                    setSetting(_setting);
                }}>路線読み込み</button>
                <button onClick={(e) => {
                    let _setting = setting;
                    _setting.iconDict = structuredClone(readData.iconDict);
                    console.log(_setting)
                    setSetting(_setting);
                }}>アイコン読み込み</button>
                <button onClick={(e) => {
                    setSetting(readData);
                }} className="btn-primary">すべて読み込み</button>
            </div>

            <h2>全体設定</h2>
            <div className="form-row">
                <label>設定名</label>
                <input type="text" onChange={(e) => {formUpdated(e, 'settingName')}} value={setting.info.settingName}></input>
            </div>
            <div className="form-row">
                <label>環状運転</label>
                <ToggleSwitch checked={setting.info.isLoop} onChange={(v) => toggleUpdated(v, 'isLoop')} />
            </div>
            <div className="form-row">
                <label>座標による駅移動</label>
                <ToggleSwitch checked={setting.info.isMoveByCoord} onChange={(v) => toggleUpdated(v, 'isMoveByCoord')} />
            </div>
            <div className="form-row">
                <label>表示タイプ</label>
                <select onChange={displayTypeSelectChanged}>
                    <option value="tokyu">東急</option>
                    <option value="JW-225">JR西日本 225系</option>
                    <option value="JE-E131">JR東日本 E131系</option>
                </select>
                <button onClick={openDisplay} className="btn-primary">表示を開く</button>
            </div>
        </div>
    )
}

export default EditorHead