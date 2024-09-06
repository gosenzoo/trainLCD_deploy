import React, { useState, useEffect } from "react"
import "../type"
import initSettingObject from "../initSettingObject"

type editorHeadType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const EditorHead: React.FC<editorHeadType> = ({setting, setSetting}) => {
    const [displayType, setDisplayType] = useState<string>("JW-225")

    const inputToSetting = (e: any) => {
        try{
            const file = e.target.files[0]

            if (file) {
                const reader = new FileReader()
                reader.onload = (ee: any) => {
                    try {
                        setSetting(JSON.parse(ee.target.result))
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
        localStorage.setItem('lcdStrage', JSON.stringify(setting))
        if(displayType === "JW-225"){ window.open('./Display_JW-225.html') }
        if(displayType === "JE-E131"){ console.log("ないです") }
    }
    const deleteSetting = () => {
        if(window.confirm("全ての設定を初期化します\nダウンロードしていないデータは戻りません")){
            setSetting(initSettingObject)
        }
        return
    }

    return(
        <div>
            <label>設定ファイル入力</label>
            <input id="settingInput" type="file" onChange={inputToSetting}></input>
            <br></br>
            <button onClick={downloadFromSettings}>設定をダウンロード</button>
            <br></br>
            <select onChange={displayTypeSelectChanged}>
                <option value="JW-225">JR西日本 225系</option>
                <option value="JE-E131">JR東日本 E131系</option>
            </select>
            <button onClick={openDisplay}>表示</button>
            <br></br>
            <button onClick={deleteSetting}>設定を初期化</button>
        </div>
    )
}

export default EditorHead