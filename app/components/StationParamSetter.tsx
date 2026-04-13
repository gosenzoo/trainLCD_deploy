import React, { useState, useEffect, TextareaHTMLAttributes } from 'react'
import "../type"
import kanaToAlphabet from "../modules/KanaConverter"
import { text } from 'stream/consumers'
import { iconIndexes, numberIndexes } from '../modules/presetIndex'
import GenericItemList, { ColumnDef } from './GenericItemList'
import { loadPresetNumIconTexts } from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { moveArrayItemsUp, moveArrayItemsDown } from '../modules/listOperations'

type stationParamsSetterProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    selectedIndexes: number[]
}

const StationParamSetter: React.FC<stationParamsSetterProps> = ({setting, setSetting, selectedIndexes}) => {
    // 接続路線追加ポップアップの表示フラグと選択中路線キー
    const [isTransferPopupOpen, setIsTransferPopupOpen] = useState<boolean>(false)
    const [transferPopupSelectedKey, setTransferPopupSelectedKey] = useState<string>('')
    // 乗換路線リストの選択状態（路線IDリスト）
    const [transferSelectedKeys, setTransferSelectedKeys] = useState<string[]>([])

    const presetIconDict = loadPresetNumIconTexts()

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
    // ポップアップで「この路線を追加」を押したときの処理
    const addTransferLine = () => {
        if (!transferPopupSelectedKey) return
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (!station) return
            // スペース区切りで路線IDを追記する（重複は追加しない）
            const ids = station.transfers ? station.transfers.split(' ') : []
            if (!ids.includes(transferPopupSelectedKey)) {
                ids.push(transferPopupSelectedKey)
                station.transfers = ids.join(' ')
            }
        })
        setSetting(_setting)
        setIsTransferPopupOpen(false)
        setTransferPopupSelectedKey('')
    }

    // 乗換路線リストの操作対象配列（targetStation の transfers をスペース分割したもの）
    const targetStation = setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]
    const transfersArr = (targetStation?.transfers ?? '').split(' ').filter(id => id && setting.lineDict[id])

    // 乗換路線を上に移動する
    const moveTransferUp = () => {
        if (transferSelectedKeys.length === 0) return
        const selectedPositions = transferSelectedKeys.map(k => transfersArr.indexOf(k)).filter(i => i !== -1)
        const { newArr, newSelected } = moveArrayItemsUp(transfersArr, selectedPositions)
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            if (_setting.stationList[ind - 1]) _setting.stationList[ind - 1].transfers = newArr.join(' ')
        })
        setSetting(_setting)
        setTransferSelectedKeys(newSelected.map(i => newArr[i]))
    }

    // 乗換路線を下に移動する
    const moveTransferDown = () => {
        if (transferSelectedKeys.length === 0) return
        const selectedPositions = transferSelectedKeys.map(k => transfersArr.indexOf(k)).filter(i => i !== -1)
        const { newArr, newSelected } = moveArrayItemsDown(transfersArr, selectedPositions)
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            if (_setting.stationList[ind - 1]) _setting.stationList[ind - 1].transfers = newArr.join(' ')
        })
        setSetting(_setting)
        setTransferSelectedKeys(newSelected.map(i => newArr[i]))
    }

    // 選択中の乗換路線を削除する
    const deleteTransfer = () => {
        if (transferSelectedKeys.length === 0) return
        const newArr = transfersArr.filter(id => !transferSelectedKeys.includes(id))
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            if (_setting.stationList[ind - 1]) _setting.stationList[ind - 1].transfers = newArr.join(' ')
        })
        setSetting(_setting)
        setTransferSelectedKeys([])
    }

    // 乗換路線表示カラム定義（路線記号列でクリック選択可能）
    const transferDisplayColumns: ColumnDef<lineType>[] = [
        {
            header: '路線記号',
            isSelector: true,  // クリックで行選択
            cell: (line) => {
                const iconParams = setting.iconDict[line.lineIconKey]
                if (typeof iconParams === 'string') {
                    return iconParams ? <img src={iconParams} alt="" width="24px" height="24px" /> : null
                } else if (iconParams) {
                    const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                    return html ? <svg viewBox='0 0 225 225' width="24px" height="24px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                }
                return null
            },
        },
        {
            header: '路線名',
            cell: (line) => line.name,
        },
        {
            header: '路線カラー',
            cell: () => null,
            cellStyle: (line) => ({ backgroundColor: line.color, minWidth: '40px' }),
        },
    ]

    // 路線一覧テーブルのカラム定義（LineList と同じ、ポップアップ用）
    const lineColumns: ColumnDef<lineType>[] = [
        {
            header: 'ID',
            isSelector: true,
            cell: (_, key) => key,
        },
        {
            header: '路線記号',
            cell: (line) => {
                const iconParams = setting.iconDict[line.lineIconKey]
                if (typeof iconParams === 'string') {
                    return iconParams ? <img src={iconParams} alt="" width="24px" height="24px" /> : null
                } else if (iconParams) {
                    const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                    return html ? <svg viewBox='0 0 225 225' width="24px" height="24px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                }
                return null
            },
        },
        {
            header: '路線名',
            cell: (line) => line.name,
        },
        {
            header: '路線カラー',
            cell: () => null,
            cellStyle: (line) => ({ backgroundColor: line.color, minWidth: '40px' }),
        },
    ]

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
                {
                    numberIndexes.map(num => {
                        return(
                            <option value={num.key}>{num.name}</option>
                        )
                    })
                }
            </select>
            <br></br>
            <label>ナンバリング表示形式</label>
            <select onChange={(e) => {formUpdated(e, 'lineNumberType')}} value={targetStation?.lineNumberType}>
                <option value="0">テキスト</option>
                <option value="1">アイコン</option>
            </select>
            <br></br>
            <label>乗換路線</label>
            {/* transfers に登録済みの路線を選択・操作可能なテーブルで表示する */}
            <GenericItemList
                columns={transferDisplayColumns}
                rows={transfersArr.map(id => ({ key: id, data: setting.lineDict[id] }))}
                selectedKeys={transferSelectedKeys}
                onRowClick={key => setTransferSelectedKeys([key])}
                tableId="transferLineDisplayTable"
                containerId="transferLineDisplayContainer"
            />
            <div className="btn-group" style={{marginTop: '4px', marginBottom: '6px'}}>
                <button onClick={moveTransferUp}>上に移動</button>
                <button onClick={moveTransferDown}>下に移動</button>
                <button onClick={deleteTransfer} className="btn-danger">削除</button>
                {/* 接続路線追加ボタン: クリックでポップアップを開く */}
                <button onClick={() => { setTransferPopupSelectedKey(''); setIsTransferPopupOpen(true) }}>
                    接続路線を追加
                </button>
            </div>

            {/* 接続路線追加ポップアップ */}
            {isTransferPopupOpen && (
                <div className="modal-backdrop" onClick={() => setIsTransferPopupOpen(false)}>
                    <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                        <p className="modal-title">接続路線を追加</p>
                        <div className="modal-body">
                            <GenericItemList
                                columns={lineColumns}
                                rows={Object.entries(setting.lineDict).map(([key, line]) => ({ key, data: line }))}
                                selectedKeys={transferPopupSelectedKey ? [transferPopupSelectedKey] : []}
                                onRowClick={key => setTransferPopupSelectedKey(key)}
                                tableId="transferLinePopupTable"
                                containerId="transferLinePopupContainer"
                            />
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setIsTransferPopupOpen(false)}>閉じる</button>
                            <button
                                onClick={addTransferLine}
                                className="btn-primary"
                                disabled={!transferPopupSelectedKey}
                            >この路線を追加</button>
                        </div>
                    </div>
                </div>
            )}
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
            <br></br>
            <label>ホーム乗換案内行ごと表示数</label>
            <input type="text" onChange={(e) => formUpdated(e, 'transferCountLineP')}
                value={ targetStation?.transferCountLineP}
            ></input>
            <br></br>
            <br></br>
            <label>スロット分割数</label>
            <input type="text" onChange={(e) => formUpdated(e, 'slotNum')}
                value={ targetStation?.slotNum}
            ></input>
            <br></br>
            <label>列車左端スロット</label>
            <input type="text" onChange={(e) => formUpdated(e, 'leftSlotInd')}
                value={ targetStation?.leftSlotInd}
            ></input>
            <br></br>
            <label>ホーム向側列車の路線ID</label>
            <input id="otherTrainIDInput" type="text" onChange={(e) => formUpdated(e, 'otherLineInd')}
                value={ targetStation?.otherLineInd}
            ></input>
            <select onChange={e => {
                if (!e.target.value) return;
                let otherTrainIDInput = document.getElementById("otherTrainIDInput") as HTMLTextAreaElement;
                if(!otherTrainIDInput){ return; }
                otherTrainIDInput.value = e.target.value;
                targetStation.otherLineInd = otherTrainIDInput.value;
                // 選択をリセット（連続で同じ項目を挿入できるように）
                e.target.value = '接続路線を追加';
            }}>
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
            <label>向側列車両数</label>
            <input type="text" onChange={(e) => formUpdated(e, 'otherCarNum')}
                value={ targetStation?.otherCarNum}
            ></input>
            <br></br>
            <label>向側列車左端スロット</label>
            <input type="text" onChange={(e) => formUpdated(e, 'otherLeftSlotInd')}
                value={ targetStation?.otherLeftSlotInd}
            ></input>
        </div>
    )
}

export default StationParamSetter