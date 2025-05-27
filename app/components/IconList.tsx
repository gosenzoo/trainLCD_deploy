import React, { useState, useEffect } from 'react'
import "../type"

type iconListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const IconList: React.FC<iconListProps> = ({ setting, setSetting }) => {
    const [selectedIndexes, setSelectedIndexes] = useState<string[]>([])
    const [newIconName, setNewIconName] = useState<string>("")
    const [newIconImage, setNewIconImage] = useState<string>("")
    const [iconPresetType, setIconPresetType] = useState<string>("JR_east")
    const [iconPresetSymbol, setIconPresetSymbol] = useState<string>("")
    const [iconPresetColor, setIconPresetColor] = useState<string>("")

    const toBase64Utf8 = (str: string) => {
        return btoa(
            new TextEncoder().encode(str)
            .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
        );
    }

    const indexClicked = (e: any) => {
        setSelectedIndexes([e.target.innerHTML])
    }
    const iconAddButtonClicked = (method: String) => {
        const _setting: settingType = structuredClone(setting)
        if(newIconName === ''){
            alert("アイコン名が設定されていません")
            return
        }
        if(Object.keys(_setting.iconDict).includes(newIconName)){
            alert("そのアイコン名は既に登録されています")
            return
        }

        if(method === 'img'){
            if(newIconImage === ''){
                alert("アイコン画像が設定されていません")
                return
            }
            _setting.iconDict[newIconName] = newIconImage

            setSetting(_setting)
        }
        if(method === 'preset'){
            fetch(`/presetIcons/${iconPresetType}.svg`)
                .then((res) => res.text())
                .then((data) => {
                    const parser = new DOMParser();
                    const iconDOM = parser.parseFromString(data, 'image/svg+xml');

                    const lineElement = iconDOM.getElementById('lineColor');
                    if (lineElement) {
                        lineElement.setAttribute('fill', iconPresetColor);
                    }

                    const serializer = new XMLSerializer();
                    const svgIconText = serializer.serializeToString(iconDOM.documentElement);
                    //svgIconTextをdata URIに変換
                    const iconBase64 = toBase64Utf8(svgIconText);
                    _setting.iconDict[newIconName] = 'data:image/svg+xml;base64,' + iconBase64;

                    setSetting(_setting)
                });
        }
    }
    const iconDeleteButtonClicked = () => {
        const _setting = structuredClone(setting)

        selectedIndexes.map((key, index) => {
            delete _setting.iconDict[key]
        })

        setSelectedIndexes([])

        setSetting(_setting)
    }

    const iconNameTextboxChanged = (e: any) => {
        setNewIconName(e.target.value)
    }
    const iconImageInputChanged = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onloadend = () => {
                if(typeof reader.result !== 'string'){
                    return
                }
                setNewIconImage(reader.result);
            }

            reader.readAsDataURL(file);
        }
    }
    const iconPresetSelectChanged = (e:any) => {
        setIconPresetType(e.target.value)
        console.log("typechanged")
    }
    const iconPresetSymbolInputChanged = (e: any) => {
        setIconPresetSymbol(e.target.value)
        console.log("symbolchanged")
    }
    const iconPresetColorInputChanged = (e: any) => {
        setIconPresetColor(e.target.value)
        console.log("colorchanged")
    }

    return(
        <div>
            <h2>アイコン登録</h2>
            <div id="iconTableContainer">
                <table id="iconTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>アイコン</th>
                        </tr>
                    </thead>
                    <tbody id="iconTableBody">
                        {
                            Object.keys(setting.iconDict).map((key, index) => {
                                return(
                                    <tr key={index}>
                                        <th className={ selectedIndexes.includes(key) ? 'selected' : '' } onClick={indexClicked}>
                                            {key}
                                        </th>
                                        <td>
                                            <img
                                                src={(setting.iconDict[key] as string) || ""}
                                                alt=""
                                                width="30px"
                                                height="30px"
                                            />
                                        </td>
                                    </tr>
                                )
                            })
                        }
                    </tbody>
                </table>
            </div>
            <button onClick={iconDeleteButtonClicked}>削除</button>
            <br></br>
            <label>登録する名前</label>
            <input type="text" id="iconNameTextBox" onChange={iconNameTextboxChanged} placeholder="例：jt"></input>
            <br></br>
            <br></br>
            <label>画像アップロード</label>
            <input type="file" id="iconImgInput" onChange={iconImageInputChanged}></input>
            <br></br>
            <button onClick={() => {iconAddButtonClicked('img')}}>アイコン追加</button>
            <br></br>
            <br></br>
            プリセットから登録<br></br>
            <select id="iconPresetSelect" onChange={iconPresetSelectChanged}>
                <option value="JR_east">JR東日本</option>
                <option value="tokyo_subway">東京地下鉄</option>
                <option value="train_normal">地上路線汎用</option>
                <option value="train_subway">地下路線汎用</option>
            </select>
            <br></br>
            アイコンの路線記号
            <input type="text" id="iconPresetLineSymbolInput" onChange={iconPresetSymbolInputChanged} placeholder='例：JT'></input>
            <br></br>
            路線カラー
            <input type="color" id="iconPresetLineColorInput" onChange={iconPresetColorInputChanged}></input>
            <br></br>
            <button onClick={() => { iconAddButtonClicked('preset') }}>アイコン追加</button>
        </div>
    )
}

export default IconList