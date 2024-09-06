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

    const indexClicked = (e: any) => {
        setSelectedIndexes([e.target.innerHTML])
    }
    const iconAddButtonClicked = () => {
        const _setting: settingType = structuredClone(setting)
        if(newIconName === '' || newIconImage === ''){
            alert("アイコン名または画像データが設定されていません")
            return
        }
        if(Object.keys(_setting.iconDict).includes(newIconName)){
            alert("そのアイコン名は既に登録されています")
            return
        }

        _setting.iconDict[newIconName] = newIconImage
        setSetting(_setting)
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
            <label>名前</label>
            <input type="text" id="iconNameTextBox" onChange={iconNameTextboxChanged}></input>
            <br></br>
            <label>画像アップロード</label>
            <input type="file" id="iconImgInput" onChange={iconImageInputChanged}></input>
            <br></br>
            <button onClick={iconAddButtonClicked}>アイコン追加</button>
        </div>
    )
}

export default IconList