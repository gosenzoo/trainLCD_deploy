import React, { useState, useEffect, TextareaHTMLAttributes } from 'react'
import "../type"
import kanaToAlphabet from "../modules/KanaConverter"
import { text } from 'stream/consumers'

type stationParamsSetterProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    selectedIndexes: number[]
}

const StationParamSetter: React.FC<stationParamsSetterProps> = ({setting, setSetting, selectedIndexes}) => {
    const formUpdated = (e:any, field: stationMembers) => {
        if(!setting){
            return
        }

        const _setting: settingType = structuredClone(setting)

        selectedIndexes.forEach(ind => {
            if(!_setting.stationList[ind - 1]){
                return
            }
            if(!(field in _setting.stationList[ind - 1])){
                return
            }
            _setting.stationList[ind - 1][field] = e.target.value

            //かなに変更があった場合、ローマ字も更新
            if(field === "kana"){
                _setting.stationList[ind - 1].eng = kanaToAlphabet(e.target.value, 0)
            }
        })
        
        setSetting(_setting)
    }
    const lineSelectChanged = (e: any) => {
        const _setting = structuredClone(setting)
        selectedIndexes.map((ind, index) => {
            let c = ''
            if(_setting.stationList[ind - 1].transfers !== ''){ c = ' ' }
            _setting.stationList[ind - 1].transfers += c + e.target.value
        })
        setSetting(_setting)

        e.target.selectedIndex = 0
    }

    const insertAtCaret = (el: HTMLTextAreaElement | HTMLInputElement, text: string) => {
        el.focus();

        const start = el.selectionStart ?? 0;
        const end   = el.selectionEnd   ?? start;

        // スクロール位置を保持
        const prevScrollTop = el.scrollTop;

        if (typeof el.setRangeText === 'function') {
        // 置換（選択範囲があれば置換、なければ挿入）
        el.setRangeText(text, start, end, 'end'); // 'end' = 挿入後にカーソルを末尾へ
        } else {
        // 古い実装向けフォールバック
        const before = el.value.slice(0, start);
        const after  = el.value.slice(end);
        el.value = before + text + after;

        const newPos = start + text.length;
        if (el.setSelectionRange) el.setSelectionRange(newPos, newPos);
        }

        // スクロール位置を復元
        el.scrollTop = prevScrollTop;
    }

    //編集対象の駅
    const targetStation = setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1];
    
    return (
        <div>
            <label>駅名</label>
            <input type="text" id="nameInput" onChange={(e) => formUpdated(e, 'name')}
                value={ targetStation?.name}
            ></input>
            <br></br>
            <label>駅名かな</label>
            <input type="text" id="kanaInput" onChange={(e) => formUpdated(e, 'kana')}
                value={ targetStation?.kana}
            ></input>
            <br></br>
            <label>駅名英語</label>
            <input type="text" id="engInput" onChange={(e) => formUpdated(e, 'eng')}
                value={ targetStation?.eng}
            ></input>
            <br></br>
            <label>駅ナンバリング</label>
            <input type="text" id="numberInput" onChange={(e) => formUpdated(e, 'number')}
                value={ targetStation?.number}
            ></input>
            <br></br>
            <label>路線カラー</label>
            <input type="color" id="lineColorInput" onChange={(e) => formUpdated(e, 'lineColor')}
                value={ targetStation?.lineColor}
            ></input>
            <br></br>
            <label>ナンバリング記号</label>
            <select onChange={(e) => {formUpdated(e, 'numIconPresetKey')}} value={targetStation?.numIconPresetKey}>
                <option value="tokyu">東急</option>
                <option value="JR_east">JR東日本</option>
            </select>
            <br></br>
            <label>乗換路線</label>
            <input type="text" id="transfersInput" onChange={(e) => formUpdated(e, 'transfers')}
                value={ targetStation?.transfers}
            ></input>
            <select onChange={lineSelectChanged}>
                <option>接続路線を追加</option>
                {
                    Object.keys(setting.lineDict).map((key, index) => {
                        return(
                            <option key={index} value={key}>
                                {setting.lineDict[key].name}
                            </option>
                        )
                    })
                }
            </select>
            <br></br>
            <label>開くドア</label>
            <select onChange={(e) => {formUpdated(e, 'doorSide')}} value={targetStation?.doorSide}>
                <option value={'right'}>右</option>
                <option value={'left'}>左</option>
            </select>
            <br></br>
            <label>次区間所要時間(分)</label>
            <input type="text" id="sectionTimeInput" onChange={(e) => formUpdated(e, 'sectionTime')}
                value={ targetStation?.sectionTime}
            ></input>
            <br></br>
            <label>次区間路線ID</label>
            <input type="text" id="lineIdInput" onChange={(e) => formUpdated(e, 'lineId')}
                value={ targetStation?.lineId}
            ></input>
            <br></br>
            <label>乗換案内</label>
            <textarea id="transferTextInput" rows={6} cols={30} onChange={(e) => formUpdated(e, 'transferText')}
                value={ targetStation?.transferText}
            ></textarea>
            <select onChange={(e) => {
                if (!e.target.value) return;
                let textArea = document.getElementById("transferTextInput") as HTMLTextAreaElement;
                if(!textArea){ return; }
                insertAtCaret(textArea, `:${e.target.value}:`);
                targetStation.transferText = textArea.value;
                // 選択をリセット（連続で同じ項目を挿入できるように）
                e.target.value = '路線記号を追加';
            }}>
                <option>路線記号を追加</option>
                {
                    Object.keys(setting.iconDict).map((key, index) => {
                        return(
                            <option key={index} value={key}>
                                {key}
                            </option>
                        )
                    })
                }
            </select>
            <br></br>
            <label>乗換案内(英語)</label>
            <textarea id="transferTextEngInput" rows={6} cols={30} onChange={(e) => formUpdated(e, 'transferTextEng')}
                value={ targetStation?.transferTextEng }
            ></textarea>
            <select onChange={(e) => {
                if (!e.target.value) return;
                let textAreaEng = document.getElementById("transferTextEngInput") as HTMLTextAreaElement;
                if(!textAreaEng){ return; }
                insertAtCaret(textAreaEng, `:${e.target.value}:`);
                targetStation.transferTextEng = textAreaEng.value;
                // 選択をリセット（連続で同じ項目を挿入できるように）
                e.target.value = '路線記号を追加';
            }}>
                <option>路線記号を追加</option>
                {
                    Object.keys(setting.iconDict).map((key, index) => {
                        return(
                            <option key={index} value={key}>
                                {key}
                            </option>
                        )
                    })
                }
            </select>
            <br></br>
            <button onClick={(e) => {
                let transferText: string = "";
                let transferTextEng :string = "";
                targetStation.transfers.split(" ").forEach(id => {
                    transferText += `:${setting.lineDict[id].lineIconKey}:`
                    transferText += setting.lineDict[id].name;
                    transferText += "\n";
                    transferTextEng += `:${setting.lineDict[id].lineIconKey}:`
                    transferTextEng += setting.lineDict[id].eng;
                    transferTextEng += "\n";
                });

                let textArea = document.getElementById("transferTextInput") as HTMLTextAreaElement;
                textArea.value = transferText;
                let textAreaEng = document.getElementById("transferTextEngInput") as HTMLTextAreaElement;
                textAreaEng.value = transferTextEng;
                targetStation.transferText = transferText;
                targetStation.transferTextEng = transferTextEng;
            }}>登録路線情報を反映</button>
        </div>
    )
}

export default StationParamSetter