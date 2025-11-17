import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import "../type"
import initSettingObject from "../initSettingObject"

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
                        mergeProperties(readData.operation, initSettingObject.operation);
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
        if(!setting.operation){
            return
        }

        const _setting: settingType = structuredClone(setting)

        if((field !== "isMoveByCoord") && (field !== "isLoop")){
            //テキストボックス入力の場合
            _setting.info[field] = e.target.value
        }
        else{
            //チェックボックス入力の場合
            _setting.info[field] = e.target.checked
        }

        setSetting(_setting)
    }

    return(
        <div>
            <label>設定ファイル入力</label>
            <input id="settingInput" type="file" onChange={inputToSetting}></input>
            <br></br>
            <button onClick={() => {
                let _setting = setting;
                _setting.operation = readData.operation;
                setSetting(_setting);
            }}>info読み込み</button>
            <br></br>
            <button onClick={() => {
                let _setting = setting;
                _setting.stationList = readData.stationList;
                setSetting(_setting);
            }}>駅読み込み</button>
            <br></br>
            <button onClick={() => {
                let _setting = setting;
                _setting.lineDict = readData.lineDict;
                setSetting(_setting);
            }}>路線読み込み</button>
            <br></br>
            <button onClick={() => {
                let _setting = setting;
                _setting.iconDict = structuredClone(readData.iconDict);
                console.log(_setting)
                setSetting(_setting);
            }}>アイコン読み込み</button>
            <br></br>
            <button onClick={() => {
                setSetting(readData);
            }}>すべて読み込み</button>
            <br></br>
            <br></br>
            <button onClick={downloadFromSettings}>設定をダウンロード</button>
            <button onClick={() => {
                if(window.confirm("全ての設定を初期化します\nダウンロードしていないデータは戻りません")){
                    setSetting(initSettingObject.setting);
                }
                return;
            }}>設定を初期化</button>
            <br></br>
            <br></br>

            <h2>全体設定</h2>
            <label>設定名</label>
            <input type="text" onChange={(e) => {formUpdated(e, 'settingName')}} value={setting.info.settingName}></input>
            <br></br>
            環状運転<input type="checkbox" onChange={(e) => {formUpdated(e, 'isLoop')}} checked={setting.info.isLoop}></input>
            <br></br>
            座標による駅移動<input type="checkbox" onChange={(e) => {formUpdated(e, 'isMoveByCoord')}} checked={setting.info.isMoveByCoord}></input>
            <br></br>
            <select onChange={displayTypeSelectChanged}>
                <option value="tokyu">東急</option>
                <option value="JW-225">JR西日本 225系</option>
                <option value="JE-E131">JR東日本 E131系</option>
            </select>
            <button onClick={openDisplay}>表示</button>
        </div>
    )
}

export default EditorHead