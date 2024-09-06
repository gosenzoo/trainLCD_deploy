import React, { useState, useEffect } from 'react'
import "../type"
import kanaToAlphabet from '../modules/KanaConverter'

type lineListProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const LineList: React.FC<lineListProps> = ({ setting, setSetting }) => {
    const [selectedIndexes, setSelectedIndexes] = useState<string[]>([])

    const indexClicked = (e: any) => {
        setSelectedIndexes([e.target.innerHTML])
    }
    const addLine = () => {
        if(!setting.lineDict){
            return
        }
        const _setting: settingType = structuredClone(setting)
        let _index = 0
        if(Object.keys(_setting.lineDict).length > 0){
            _index = Math.max(...Object.keys(_setting.lineDict).map(Number)) + 1
        }
        _setting.lineDict[_index] = {
            lineIconKey: "",
            name: "",
            kana: "",
            eng: ""
        }
        setSetting(_setting)
    }
    const deleteLine = () => {
        const _setting = structuredClone(setting)

        selectedIndexes.map((key, index) => { delete _setting.lineDict[key] })
        setSelectedIndexes([])

        setSetting(_setting)
    }

    const formUpdated = (e:any, field: lineMembers) => {
        if(!setting){
            return
        }

        const _setting: settingType = structuredClone(setting)

        selectedIndexes.forEach(key => {
            if(!_setting.lineDict[key]){
                return
            }
            if(!(field in _setting.lineDict[key])){
                return
            }
            _setting.lineDict[key][field] = e.target.value

            //かなに変更があった場合、ローマ字も更新
            if(field === "kana"){
                _setting.lineDict[key].eng = kanaToAlphabet(e.target.value)
            }
        })

        setSetting(_setting)
    }

    return(
        <div>
            <h2>路線登録</h2>
            <div id="linesTableContainer">
                <table id="linesTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>路線記号</th>
                            <th>路線名</th>
                            <th>路線名かな</th>
                            <th>路線名英語</th>
                        </tr>
                    </thead>
                    <tbody id="linesTableBody">
                        {
                            Object.keys(setting.lineDict).map((key, index) => {
                                return(
                                    <tr key={index}>
                                        <th className={ selectedIndexes.includes(key) ? 'selected' : '' } onClick={indexClicked}>
                                            {key}
                                        </th>
                                        <td>
                                            <img
                                                src={(setting.iconDict[setting.lineDict[key].lineIconKey] as string) || ""}
                                                alt=""
                                                width="30px"
                                                height="30px"
                                            />
                                        </td>
                                        <td>
                                            {setting.lineDict[key].name}
                                        </td>
                                        <td>
                                            {setting.lineDict[key].kana}
                                        </td>
                                        <td>
                                            {setting.lineDict[key].eng}
                                        </td>
                                    </tr>
                                )
                            })
                        }
                    </tbody>
                </table>
            </div>
            <button onClick={addLine}>路線追加</button>
            <button onClick={deleteLine}>路線削除</button>
            <br></br>
            <label>路線記号</label>
            <input type="text" id="lineIconKeyInput" onChange={(e) => formUpdated(e, 'lineIconKey')}
                value={ setting && selectedIndexes.length > 0 ? setting.lineDict[selectedIndexes[selectedIndexes.length - 1]]?.lineIconKey : ''}
            ></input>
            <br></br>
            <label>路線名</label>
            <input type="text" id="lineNameInput" onChange={(e) => formUpdated(e, 'name')}
                value={ setting && selectedIndexes.length > 0 ? setting.lineDict[selectedIndexes[selectedIndexes.length - 1]]?.name : ''}
            ></input>
            <br></br>
            <label>路線名かな</label>
            <input type="text" id="lineKanaInput" onChange={(e) => formUpdated(e, 'kana')}
                value={ setting && selectedIndexes.length > 0 ? setting.lineDict[selectedIndexes[selectedIndexes.length - 1]]?.kana : ''}
            ></input>
            <br></br>
            <label>路線名英語</label>
            <input type="text" id="lineEngInput" onChange={(e) => formUpdated(e, 'eng')}
                value={ setting && selectedIndexes.length > 0 ? setting.lineDict[selectedIndexes[selectedIndexes.length - 1]]?.eng : ''}
            ></input>
            <br></br>
        </div>
    )
}

export default LineList