import React, { useState, useEffect, TextareaHTMLAttributes } from 'react'
import "../type"
import kanaToAlphabet from "../modules/KanaConverter"
import { text } from 'stream/consumers'
import { iconIndexes, numberIndexes } from '../modules/presetIndex'
import GenericItemList, { ColumnDef } from './GenericItemList'
import { loadPresetNumIconTexts } from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { moveArrayItemsUp, moveArrayItemsDown } from '../modules/listOperations'
import IconNewPopup from './IconNewPopup'
import IconListPopup from './IconListPopup'
import { IconArrowUp, IconArrowDown, IconTrash } from './SvgIcons'

type stationParamsSetterProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    selectedIndexes: number[],
    // 表示するセクション（StationList のアクティブタブに連動）
    activeSection: 'basic' | 'defaultLine' | 'platform'
}

const StationParamSetter: React.FC<stationParamsSetterProps> = ({setting, setSetting, selectedIndexes, activeSection}) => {
    // 接続路線追加ポップアップの表示フラグ
    const [isTransferPopupOpen, setIsTransferPopupOpen] = useState<boolean>(false)
    // ポップアップ内アクティブタブ（新規追加 / リストから選択）
    const [popupTab, setPopupTab] = useState<'new' | 'list'>('new')
    // 「リストから選択」タブ: 選択中の路線キー
    const [transferPopupSelectedKey, setTransferPopupSelectedKey] = useState<string[]>([])
    const [isPopupMultiSelect, setIsPopupMultiSelect] = useState<boolean>(false)
    // 「新規追加」タブ: 新規路線フォームの入力値
    const [newLineIconKey, setNewLineIconKey] = useState<string>('')
    const [newLineName, setNewLineName] = useState<string>('')
    const [newLineKana, setNewLineKana] = useState<string>('')
    const [newLineEng, setNewLineEng] = useState<string>('')
    const [newLineColor, setNewLineColor] = useState<string>('#000000')
    // 路線記号ポップアップの表示モード（null: 非表示 / 'new': 新規追加 / 'list': リストから選択）
    const [iconPickerMode, setIconPickerMode] = useState<'new' | 'list' | null>(null)
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
    // 「新規追加」タブ: lineDict に新しい路線を追加し、選択駅の transfers にも追記する
    const addNewLine = () => {
        const _setting = structuredClone(setting)
        // 既存キーの最大値+1 を新しいキーにする
        const nextKey = Object.keys(_setting.lineDict).length > 0
            ? String(Math.max(...Object.keys(_setting.lineDict).map(Number)) + 1)
            : '0'
        _setting.lineDict[nextKey] = {
            lineIconKey: newLineIconKey,
            name: newLineName,
            kana: newLineKana,
            eng: newLineEng,
            color: newLineColor,
        }
        // 選択中の全駅の transfers に新しい路線IDを追記する
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (!station) return
            const ids = station.transfers ? station.transfers.split(' ').filter(id => id) : []
            if (!ids.includes(nextKey)) ids.push(nextKey)
            station.transfers = ids.join(' ')
        })
        setSetting(_setting)
        setIsTransferPopupOpen(false)
        // フォームをリセット
        setNewLineIconKey('')
        setNewLineName('')
        setNewLineKana('')
        setNewLineEng('')
        setNewLineColor('#000000')
    }

    // 「リストから選択」タブ: 選択済み路線を lineDict の並び順でソートして transfers に追記する
    const addTransferLineFromList = () => {
        if (transferPopupSelectedKey.length === 0) return
        const orderedKeys = Object.keys(setting.lineDict).sort((a, b) => Number(a) - Number(b))
        // lineDict の並び順（上から）でソート
        const sortedSelected = [...transferPopupSelectedKey].sort(
            (a, b) => orderedKeys.indexOf(a) - orderedKeys.indexOf(b)
        )
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (!station) return
            const ids = station.transfers ? station.transfers.split(' ').filter(id => id) : []
            sortedSelected.forEach(key => {
                if (!ids.includes(key)) ids.push(key)
            })
            station.transfers = ids.join(' ')
        })
        setSetting(_setting)
        setIsTransferPopupOpen(false)
        setTransferPopupSelectedKey([])
    }

    // 「リストから選択」タブの行クリックハンドラ
    const popupHandleRowClick = (key: string) => {
        if (!isPopupMultiSelect) {
            setTransferPopupSelectedKey([key])
        } else {
            setTransferPopupSelectedKey(prev =>
                prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
            )
        }
    }

    // アイコンが決定されたとき、新規追加タブの路線記号にセットする
    const handleIconSelect = (key: string) => {
        setNewLineIconKey(key)
        setIconPickerMode(null)
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
    // 路線一覧テーブルのカラム定義（ID列は非表示・路線記号列でクリック選択）
    const lineColumns: ColumnDef<lineType>[] = [
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

    // 駅が1つも選択されていない場合はフォームをグレーアウトする
    const isNoSelection = selectedIndexes.length === 0

    return (
        <div className={isNoSelection ? 'form-disabled' : ''}>

            {/* ===== 駅基本設定タブ ===== */}
            {activeSection === 'basic' && (<>
                <label>駅名</label>
                <input type="text" id="nameInput" onChange={(e) => formUpdated(e, 'name')}
                    value={targetStation?.name}
                ></input>
                <br></br>
                <label>駅名かな</label>
                <input type="text" id="kanaInput" onChange={(e) => formUpdated(e, 'kana')}
                    value={targetStation?.kana}
                ></input>
                <br></br>
                <label>駅名英語</label>
                <input type="text" id="engInput" onChange={(e) => formUpdated(e, 'eng')}
                    value={targetStation?.eng}
                ></input>
                <br></br>
                <label>駅ナンバリング</label>
                <input type="text" id="numberInput" onChange={(e) => formUpdated(e, 'number')}
                    value={targetStation?.number}
                ></input>
                <br></br>
                <label>路線カラー</label>
                <input type="color" id="lineColorInput" onChange={(e) => formUpdated(e, 'lineColor')}
                    value={targetStation?.lineColor}
                ></input>
                <br></br>
                <label>ナンバリング記号</label>
                <select onChange={(e) => {formUpdated(e, 'numIconPresetKey')}} value={targetStation?.numIconPresetKey}>
                    {numberIndexes.map(num => (
                        <option key={num.key} value={num.key}>{num.name}</option>
                    ))}
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
                    {/* 上矢印・下矢印・削除(ゴミ箱) をSVGアイコンで表示 */}
                    <button onClick={moveTransferUp} className="btn-icon" title="上に移動"><IconArrowUp/></button>
                    <button onClick={moveTransferDown} className="btn-icon" title="下に移動"><IconArrowDown/></button>
                    <button onClick={deleteTransfer} className="btn-icon btn-danger" title="削除"><IconTrash/></button>
                    {/* 接続路線追加ボタン: クリックでポップアップを開く */}
                    <button onClick={() => { setTransferPopupSelectedKey([]); setIsPopupMultiSelect(false); setIsTransferPopupOpen(true) }}>
                        接続路線を追加
                    </button>
                </div>

                {/* 接続路線追加ポップアップ */}
                {isTransferPopupOpen && (
                    <div className="modal-backdrop" onClick={() => setIsTransferPopupOpen(false)}>
                        {/* modal-dialog--tall: タブ状態によらず縦いっぱいに固定表示 */}
                        <div className="modal-dialog modal-dialog--tall" onClick={e => e.stopPropagation()}>
                            <p className="modal-title">接続路線を追加</p>
                            {/* タブ切り替え */}
                            <div className="operation-tabs" style={{margin: '0 0 0 0'}}>
                                <button
                                    onClick={() => setPopupTab('new')}
                                    className={`tab-btn${popupTab === 'new' ? ' active' : ''}`}
                                >新規追加</button>
                                <button
                                    onClick={() => setPopupTab('list')}
                                    className={`tab-btn${popupTab === 'list' ? ' active' : ''}`}
                                >リストから選択</button>
                            </div>
                            <div className="tab-form-body">
                                {/* 新規追加タブ: 縦いっぱいダイアログ内で余白を埋めてコンテンツをスクロール可能にする */}
                                {popupTab === 'new' && (
                                    <div style={{flex: 1, minHeight: 0, overflowY: 'auto'}}>
                                        <div className="form-row">
                                            <label>路線記号</label>
                                            {/* テキストボックスの代わりに現在設定中のアイコンをプレビュー表示する */}
                                            {(() => {
                                                const iconParams = newLineIconKey ? setting.iconDict[newLineIconKey] : undefined
                                                if (typeof iconParams === 'string') {
                                                    return iconParams
                                                        ? <img src={iconParams} alt={newLineIconKey} width="30px" height="30px" />
                                                        : <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                                                } else if (iconParams) {
                                                    const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                                                    return html
                                                        ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} />
                                                        : <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                                                }
                                                return <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                                            })()}
                                            {/* 新規追加ポップアップ / リストから選択ポップアップを開くボタン */}
                                            <button onClick={() => setIconPickerMode('new')}>新規追加</button>
                                            <button onClick={() => setIconPickerMode('list')}>リストから選択</button>
                                        </div>
                                        <div className="form-row">
                                            <label>路線名</label>
                                            <input type="text" value={newLineName}
                                                onChange={e => setNewLineName(e.target.value)} />
                                        </div>
                                        <div className="form-row">
                                            <label>路線名かな</label>
                                            <input type="text" value={newLineKana}
                                                onChange={e => {
                                                    setNewLineKana(e.target.value)
                                                    // かな入力時にローマ字を自動補完
                                                    setNewLineEng(kanaToAlphabet(e.target.value, 1))
                                                }} />
                                        </div>
                                        <div className="form-row">
                                            <label>路線名英語</label>
                                            <input type="text" value={newLineEng}
                                                onChange={e => setNewLineEng(e.target.value)} />
                                        </div>
                                        <div className="form-row">
                                            <label>路線カラー</label>
                                            <input type="color" value={newLineColor}
                                                onChange={e => setNewLineColor(e.target.value)} />
                                        </div>
                                        <div className="btn-group" style={{marginTop: '8px'}}>
                                            <button onClick={addNewLine} className="btn-primary">路線追加</button>
                                        </div>
                                    </div>
                                )}
                                {/* リストから選択タブ: 縦いっぱいダイアログ内でリストが残り領域を占める */}
                                {popupTab === 'list' && (
                                    <div style={{flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}}>
                                        <GenericItemList
                                            columns={lineColumns}
                                            rows={Object.entries(setting.lineDict).map(([key, line]) => ({ key, data: line }))}
                                            selectedKeys={transferPopupSelectedKey}
                                            onRowClick={popupHandleRowClick}
                                            tableId="transferLinePopupTable"
                                            containerId="transferLinePopupContainer"
                                        />
                                        <div className="btn-group" style={{marginTop: '8px'}}>
                                            {/* 複数選択ボタンのみ */}
                                            <button
                                                onClick={() => setIsPopupMultiSelect(v => !v)}
                                                className={`btn-toggle${isPopupMultiSelect ? ' btn-toggle--active' : ''}`}
                                            >複数選択</button>
                                        </div>
                                        <div className="btn-group">
                                            <button
                                                onClick={addTransferLineFromList}
                                                className="btn-primary"
                                                disabled={transferPopupSelectedKey.length === 0}
                                            >路線追加</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setIsTransferPopupOpen(false)}>閉じる</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* アイコン新規追加ポップアップ（接続路線ポップアップ内から開くため isNested=true で z-index を上げる） */}
                {iconPickerMode === 'new' && (
                    <IconNewPopup
                        setting={setting}
                        setSetting={setSetting}
                        onSelect={handleIconSelect}
                        onClose={() => setIconPickerMode(null)}
                        isNested={true}
                    />
                )}
                {/* アイコンをリストから選択ポップアップ（同じく入れ子モーダル） */}
                {iconPickerMode === 'list' && (
                    <IconListPopup
                        setting={setting}
                        onSelect={handleIconSelect}
                        onClose={() => setIconPickerMode(null)}
                        isNested={true}
                    />
                )}
                <br></br>
                <label>開くドア</label>
                <select onChange={(e) => {formUpdated(e, 'doorSide')}} value={targetStation?.doorSide}>
                    <option value={'right'}>右</option>
                    <option value={'left'}>左</option>
                </select>
                <br></br>
            </>)}

            {/* ===== 路線図タブ (defaultLine) ===== */}
            {activeSection === 'defaultLine' && (<>
                <label>次区間所要時間(分)</label>
                <input type="text" id="sectionTimeInput" onChange={(e) => formUpdated(e, 'sectionTime')}
                    value={targetStation?.sectionTime}
                ></input>
                <br></br>
                <label>次区間路線ID</label>
                <input type="text" id="lineIdInput" onChange={(e) => formUpdated(e, 'lineId')}
                    value={targetStation?.lineId}
                ></input>
                <br></br>
                <label>乗換案内</label>
                <textarea id="transferTextInput" rows={6} cols={30} onChange={(e) => formUpdated(e, 'transferText')}
                    value={targetStation?.transferText}
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
                    {Object.keys(setting.iconDict).map((key, index) => (
                        <option key={index} value={key}>{key}</option>
                    ))}
                </select>
                <br></br>
                <label>乗換案内(英語)</label>
                <textarea id="transferTextEngInput" rows={6} cols={30} onChange={(e) => formUpdated(e, 'transferTextEng')}
                    value={targetStation?.transferTextEng}
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
                    {Object.keys(setting.iconDict).map((key, index) => (
                        <option key={index} value={key}>{key}</option>
                    ))}
                </select>
                <br></br>
                <button onClick={() => {
                    let transferText: string = "";
                    let transferTextEng: string = "";
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
            </>)}

            {/* ===== ホーム案内タブ (platform) ===== */}
            {activeSection === 'platform' && (<>
                <label>ホーム乗換案内行ごと表示数</label>
                <input type="text" onChange={(e) => formUpdated(e, 'transferCountLineP')}
                    value={targetStation?.transferCountLineP}
                ></input>
                <br></br>
                <label>スロット分割数</label>
                <input type="text" onChange={(e) => formUpdated(e, 'slotNum')}
                    value={targetStation?.slotNum}
                ></input>
                <br></br>
                <label>列車左端スロット</label>
                <input type="text" onChange={(e) => formUpdated(e, 'leftSlotInd')}
                    value={targetStation?.leftSlotInd}
                ></input>
                <br></br>
                <label>ホーム向側列車の路線ID</label>
                <input id="otherTrainIDInput" type="text" onChange={(e) => formUpdated(e, 'otherLineInd')}
                    value={targetStation?.otherLineInd}
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
                    {Object.keys(setting.lineDict).map((key, index) => (
                        <option key={index} value={key}>{setting.lineDict[key].name}</option>
                    ))}
                </select>
                <br></br>
                <label>向側列車両数</label>
                <input type="text" onChange={(e) => formUpdated(e, 'otherCarNum')}
                    value={targetStation?.otherCarNum}
                ></input>
                <br></br>
                <label>向側列車左端スロット</label>
                <input type="text" onChange={(e) => formUpdated(e, 'otherLeftSlotInd')}
                    value={targetStation?.otherLeftSlotInd}
                ></input>
                <br></br>
            </>)}

        </div>
    )
}

export default StationParamSetter