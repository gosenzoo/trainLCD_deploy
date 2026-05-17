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
    activeSection: 'basic' | 'defaultLine' | 'transfersDisp' | 'platform'
}

const StationParamSetter: React.FC<stationParamsSetterProps> = ({setting, setSetting, selectedIndexes, activeSection}) => {
    // 路線情報フォームのアイコンピッカー用
    const [lineFormIconPickerMode, setLineFormIconPickerMode] = useState<'new' | 'list' | null>(null)
    // 乗換路線リストの選択インデックス（0-based、null: 未選択）
    const [transferSelectedIndex, setTransferSelectedIndex] = useState<number | null>(null)
    // 「リストから追加」ポップアップ
    const [isLineListPopupOpen, setIsLineListPopupOpen] = useState<boolean>(false)
    const [lineListPopupSelectedIndex, setLineListPopupSelectedIndex] = useState<number | null>(null)
    const [cachedTransferLines, setCachedTransferLines] = useState<transferLineType[]>([])

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

    // stationList 内の全 transfer.line を収集して重複排除し、ポップアップを開く
    const openLineListPopup = () => {
        const lines: transferLineType[] = []
        const seen = new Set<string>()
        setting.stationList.forEach(station => {
            ;(station.transfers || []).forEach((t: transferItemType) => {
                if (!t.line) return
                // 全フィールドが空の場合はスキップする
                if (!t.line.lineIconKey && !t.line.name && !t.line.kana && !t.line.eng) return
                const key = `${t.line.lineIconKey}|${t.line.name}|${t.line.kana}|${t.line.eng}`
                if (!seen.has(key)) {
                    seen.add(key)
                    lines.push({ ...t.line })
                }
            })
        })
        setCachedTransferLines(lines)
        setLineListPopupSelectedIndex(null)
        setIsLineListPopupOpen(true)
    }

    // ポップアップで選択した line を現在の transfer エントリに適用する
    const applyLineFromList = () => {
        if (lineListPopupSelectedIndex === null || transferSelectedIndex === null) return
        const selected = cachedTransferLines[lineListPopupSelectedIndex]
        if (!selected) return
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (!station || !station.transfers[transferSelectedIndex]) return
            station.transfers[transferSelectedIndex].line = { ...selected }
        })
        setSetting(_setting)
        setIsLineListPopupOpen(false)
    }

    // 路線情報フォームのアイコンピッカーで決定されたとき、選択中エントリの line.lineIconKey を更新する
    const handleLineFormIconSelect = (key: string) => {
        updateTransferLine('lineIconKey', key)
        setLineFormIconPickerMode(null)
    }

    // 旧形式エントリ（line が未定義）を line オブジェクトで初期化するヘルパー
    const ensureTransferLine = (t: any): void => {
        if (!t.line) {
            t.line = { lineIconKey: '', name: '', kana: '', eng: '' }
        }
    }

    // 選択中の乗換路線エントリの line フィールドを更新する
    const updateTransferLine = (field: 'lineIconKey' | 'name' | 'kana' | 'eng', value: string) => {
        if (transferSelectedIndex === null) return
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (!station || !station.transfers[transferSelectedIndex]) return
            // 旧形式データで line が未定義の場合は初期化する
            ensureTransferLine(station.transfers[transferSelectedIndex])
            station.transfers[transferSelectedIndex].line[field] = value
        })
        setSetting(_setting)
    }

    // kana/eng を同時更新する（かな入力時の自動ローマ字補完用）
    const updateTransferLineKanaEng = (kana: string) => {
        if (transferSelectedIndex === null) return
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (!station || !station.transfers[transferSelectedIndex]) return
            // 旧形式データで line が未定義の場合は初期化する
            ensureTransferLine(station.transfers[transferSelectedIndex])
            station.transfers[transferSelectedIndex].line.kana = kana
            station.transfers[transferSelectedIndex].line.eng = kanaToAlphabet(kana, 1)
        })
        setSetting(_setting)
    }

    // 乗換路線リストの操作対象配列（targetStation の transfers）
    const targetStation = setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]
    // transfers は transferItemType[] として扱う
    const transfersArr: transferItemType[] = targetStation?.transfers ?? []

    // 乗換路線を上に移動する
    const moveTransferUp = () => {
        if (transferSelectedIndex === null) return
        const { newArr, newSelected } = moveArrayItemsUp(transfersArr, [transferSelectedIndex])
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            if (_setting.stationList[ind - 1]) _setting.stationList[ind - 1].transfers = newArr
        })
        setSetting(_setting)
        setTransferSelectedIndex(newSelected[0] ?? null)
    }

    // 乗換路線を下に移動する
    const moveTransferDown = () => {
        if (transferSelectedIndex === null) return
        const { newArr, newSelected } = moveArrayItemsDown(transfersArr, [transferSelectedIndex])
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            if (_setting.stationList[ind - 1]) _setting.stationList[ind - 1].transfers = newArr
        })
        setSetting(_setting)
        setTransferSelectedIndex(newSelected[0] ?? null)
    }

    // 選択中の乗換路線を削除する
    const deleteTransfer = () => {
        if (transferSelectedIndex === null) return
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (station) station.transfers.splice(transferSelectedIndex, 1)
        })
        setSetting(_setting)
        setTransferSelectedIndex(null)
    }

    // 乗換路線エントリの isDraw チェックボックス変更ハンドラ（行インデックスを直接受け取る）
    const transferIsDrawChanged = (e: React.ChangeEvent<HTMLInputElement>, transferIndex: number) => {
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (!station || !station.transfers[transferIndex]) return
            station.transfers[transferIndex].station.isDraw = e.target.checked
        })
        setSetting(_setting)
    }

    // 選択中の乗換路線エントリの station フィールドを更新する
    const updateTransferStation = (field: 'type' | 'symbol' | 'color' | 'number' | 'name' | 'eng', value: string) => {
        if (transferSelectedIndex === null) return
        const _setting = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const station = _setting.stationList[ind - 1]
            if (!station || !station.transfers[transferSelectedIndex]) return
            station.transfers[transferSelectedIndex].station[field] = value
        })
        setSetting(_setting)
    }

    // 乗換路線表示カラム定義（路線記号列でクリック選択可能、ナンバリング・駅名・駅名英語を追加）
    const transferDisplayColumns: ColumnDef<transferItemType>[] = [
        {
            header: '路線記号',
            isSelector: true,  // クリックで行選択
            // item.line.lineIconKey を直接参照（lineDictへの参照は使わない）
            cell: (item) => {
                const iconParams = item.line?.lineIconKey ? setting.iconDict[item.line.lineIconKey] : undefined
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
            cell: (item) => item.line?.name ?? '',
        },
        {
            header: 'ナンバリング',
            // station の type/symbol/color/number から NumIcon を生成して表示する。未設定時はテキストで表示
            cell: (item) => {
                const { type, symbol, color, number } = item.station
                if (type && (symbol || number)) {
                    const html = createNumIconFromPreset(presetIconDict, type, symbol, number, color)?.outerHTML
                    if (html) return <svg viewBox='0 0 225 225' width="24px" height="24px" dangerouslySetInnerHTML={{ __html: html }} />
                }
                return <>{number}</>
            },
        },
        {
            header: '駅名',
            cell: (item) => item.station.name,
        },
        {
            header: '駅名英語',
            cell: (item) => item.station.eng,
        },
        {
            header: '駅描画',
            // チェックが入っている行は station.isDraw = true としてdrawParamsに渡す
            cell: (item, key) => (
                <input
                    type="checkbox"
                    checked={!!item.station.isDraw}
                    onChange={e => transferIsDrawChanged(e, parseInt(key))}
                />
            ),
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
                    value={targetStation?.name ?? ''}
                ></input>
                <br></br>
                <label>駅名かな</label>
                <input type="text" id="kanaInput" onChange={(e) => formUpdated(e, 'kana')}
                    value={targetStation?.kana ?? ''}
                ></input>
                <br></br>
                <label>駅名英語</label>
                <input type="text" id="engInput" onChange={(e) => formUpdated(e, 'eng')}
                    value={targetStation?.eng ?? ''}
                ></input>
                <br></br>
                <label>駅ナンバリング</label>
                <input type="text" id="numberInput" onChange={(e) => formUpdated(e, 'number')}
                    value={targetStation?.number ?? ''}
                ></input>
                <br></br>
                <label>路線カラー</label>
                <input type="color" id="lineColorInput" onChange={(e) => formUpdated(e, 'lineColor')}
                    value={targetStation?.lineColor ?? '#000000'}
                ></input>
                <br></br>
                <label>ナンバリング記号</label>
                <select onChange={(e) => {formUpdated(e, 'numIconPresetKey')}} value={targetStation?.numIconPresetKey ?? ''}>
                    {numberIndexes.map(num => (
                        <option key={num.key} value={num.key}>{num.name}</option>
                    ))}
                </select>
                <br></br>
                <label>ナンバリング表示形式</label>
                <select onChange={(e) => {formUpdated(e, 'lineNumberType')}} value={targetStation?.lineNumberType ?? '0'}>
                    <option value="0">テキスト</option>
                    <option value="1">アイコン</option>
                </select>
                <br></br>
                <label>乗換路線</label>
                {/* transfers に登録済みの路線を選択・操作可能なテーブルで表示する。行キーは 0-based 配列インデックス */}
                <GenericItemList
                    columns={transferDisplayColumns}
                    rows={transfersArr.map((item, i) => ({ key: String(i), data: item }))}
                    selectedKeys={transferSelectedIndex !== null ? [String(transferSelectedIndex)] : []}
                    onRowClick={key => setTransferSelectedIndex(parseInt(key))}
                    tableId="transferLineDisplayTable"
                    containerId="transferLineDisplayContainer"
                />
                <div className="btn-group" style={{marginTop: '4px', marginBottom: '6px'}}>
                    {/* 上矢印・下矢印・削除(ゴミ箱) をSVGアイコンで表示 */}
                    <button onClick={moveTransferUp} className="btn-icon" title="上に移動"><IconArrowUp/></button>
                    <button onClick={moveTransferDown} className="btn-icon" title="下に移動"><IconArrowDown/></button>
                    <button onClick={deleteTransfer} className="btn-icon btn-danger" title="削除"><IconTrash/></button>
                    {/* 選択行の直下（未選択時は末尾）に空エントリを挿入するボタン */}
                    <button onClick={() => {
                        const insertAt = transferSelectedIndex !== null ? transferSelectedIndex + 1 : transfersArr.length
                        const newEntry: transferItemType = { line: { lineIconKey: '', name: '', kana: '', eng: '' }, station: { isDraw: false, type: '', symbol: '', color: '', number: '', name: '', eng: '' } }
                        const _setting = structuredClone(setting)
                        selectedIndexes.forEach(ind => {
                            const station = _setting.stationList[ind - 1]
                            if (!station) return
                            station.transfers.splice(insertAt, 0, structuredClone(newEntry))
                        })
                        setSetting(_setting)
                        // 挿入した行を選択状態にする
                        setTransferSelectedIndex(insertAt)
                    }}>追加</button>
                </div>

                {/* 選択中の乗換路線エントリの編集フォーム */}
                {(() => {
                    const selectedItem = transferSelectedIndex !== null ? transfersArr[transferSelectedIndex] : undefined
                    // 乗換路線が未選択の場合はグレーアウト
                    const isFormEnabled = transferSelectedIndex !== null && !!selectedItem
                    return (
                        <>
                        {/* ── 乗換路線設定（路線記号〜路線名英語） ── */}
                        <fieldset className={isFormEnabled ? '' : 'disp-config-disabled'} style={{marginBottom: '6px'}}>
                            <legend>乗換路線設定</legend>
                            <div className="form-row">
                                <label>路線記号</label>
                                {/* 現在設定中のアイコンをプレビュー表示し、ピッカーボタンで変更する */}
                                {(() => {
                                    const iconParams = selectedItem?.line?.lineIconKey
                                        ? setting.iconDict[selectedItem.line.lineIconKey]
                                        : undefined
                                    if (typeof iconParams === 'string') {
                                        return iconParams
                                            ? <img src={iconParams} alt="" width="30px" height="30px" />
                                            : <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                                    } else if (iconParams) {
                                        const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                                        return html
                                            ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} />
                                            : <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                                    }
                                    return <span style={{display:'inline-block', width:'30px', height:'30px'}} />
                                })()}
                                <button onClick={() => setLineFormIconPickerMode('new')}>新規追加</button>
                                <button onClick={() => setLineFormIconPickerMode('list')}>リストから選択</button>
                            </div>
                            <div className="form-row">
                                <label>路線名</label>
                                <input type="text"
                                    value={selectedItem?.line?.name ?? ''}
                                    onChange={e => updateTransferLine('name', e.target.value)}
                                />
                            </div>
                            <div className="form-row">
                                <label>路線名かな</label>
                                <input type="text"
                                    value={selectedItem?.line?.kana ?? ''}
                                    onChange={e => updateTransferLineKanaEng(e.target.value)}
                                />
                            </div>
                            <div className="form-row">
                                <label>路線名英語</label>
                                <input type="text"
                                    value={selectedItem?.line?.eng ?? ''}
                                    onChange={e => updateTransferLine('eng', e.target.value)}
                                />
                            </div>
                            {/* 既登録の line をリストから選んでフォームに転記する */}
                            <div className="btn-group" style={{marginTop: '4px'}}>
                                <button onClick={openLineListPopup} disabled={!isFormEnabled}>リストから追加</button>
                            </div>
                        </fieldset>

                        {/* ── リストから追加ポップアップ ── */}
                        {isLineListPopupOpen && (
                            <div className="modal-backdrop" onClick={() => setIsLineListPopupOpen(false)}>
                                <div className="modal-dialog modal-dialog--tall" onClick={e => e.stopPropagation()}>
                                    <div className="modal-title-row">
                                        <p className="modal-title">リストから追加</p>
                                        <button className="modal-close-btn" onClick={() => setIsLineListPopupOpen(false)} title="閉じる">×</button>
                                    </div>
                                    {/* リスト部分: 残り領域をすべて使い、あふれたらスクロール */}
                                    <div style={{flex: 1, minHeight: 0, overflowY: 'auto'}}>
                                        {cachedTransferLines.length === 0 ? (
                                            <p style={{padding: '8px'}}>登録済みの路線がありません</p>
                                        ) : (
                                            <GenericItemList
                                                columns={[
                                                    {
                                                        header: '路線記号',
                                                        isSelector: true,
                                                        cell: (line) => {
                                                            const iconParams = line.lineIconKey ? setting.iconDict[line.lineIconKey] : undefined
                                                            if (typeof iconParams === 'string') {
                                                                return iconParams ? <img src={iconParams} alt="" width="24px" height="24px" /> : null
                                                            } else if (iconParams) {
                                                                const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                                                                return html ? <svg viewBox='0 0 225 225' width="24px" height="24px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                                                            }
                                                            return null
                                                        },
                                                    },
                                                    { header: '路線名', cell: (line) => line.name },
                                                    { header: '路線名かな', cell: (line) => line.kana },
                                                    { header: '路線名英語', cell: (line) => line.eng },
                                                ]}
                                                rows={cachedTransferLines.map((line, i) => ({ key: String(i), data: line }))}
                                                selectedKeys={lineListPopupSelectedIndex !== null ? [String(lineListPopupSelectedIndex)] : []}
                                                onRowClick={key => setLineListPopupSelectedIndex(parseInt(key))}
                                                tableId="lineListPopupTable"
                                                containerId="lineListPopupContainer"
                                            />
                                        )}
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            className="btn-primary"
                                            onClick={applyLineFromList}
                                            disabled={lineListPopupSelectedIndex === null}
                                        >追加</button>
                                        <button onClick={() => setIsLineListPopupOpen(false)}>閉じる</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* ── 乗換駅設定（ナンバリング記号〜基本設定情報を反映） ── */}
                        <fieldset className={isFormEnabled ? '' : 'disp-config-disabled'} style={{marginBottom: '6px'}}>
                            <legend>乗換駅設定</legend>
                            <div className="form-row">
                                <label>ナンバリング記号</label>
                                {/* 駅基本設定の「ナンバリング記号」と同じ選択肢。値は station.type に保存 */}
                                <select
                                    value={selectedItem?.station.type ?? ''}
                                    onChange={e => updateTransferStation('type', e.target.value)}
                                >
                                    {numberIndexes.map(num => (
                                        <option key={num.key} value={num.key}>{num.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <label>路線カラー</label>
                                {/* ナンバリングアイコンの背景色 */}
                                <input type="color"
                                    value={selectedItem?.station.color || '#000000'}
                                    onChange={e => updateTransferStation('color', e.target.value)}
                                />
                            </div>
                            <div className="form-row">
                                <label>路線記号</label>
                                {/* ナンバリングアイコンの記号部分（例: "TY"） */}
                                <input type="text"
                                    value={selectedItem?.station.symbol ?? ''}
                                    onChange={e => updateTransferStation('symbol', e.target.value)}
                                />
                            </div>
                            <div className="form-row">
                                <label>ナンバリング</label>
                                <input type="text"
                                    value={selectedItem?.station.number ?? ''}
                                    onChange={e => updateTransferStation('number', e.target.value)}
                                />
                            </div>
                            <div className="form-row">
                                <label>駅名</label>
                                <input type="text"
                                    value={selectedItem?.station.name ?? ''}
                                    onChange={e => updateTransferStation('name', e.target.value)}
                                />
                            </div>
                            <div className="form-row">
                                <label>駅名英語</label>
                                <input type="text"
                                    value={selectedItem?.station.eng ?? ''}
                                    onChange={e => updateTransferStation('eng', e.target.value)}
                                />
                            </div>
                            {/* 選択中駅の駅名・駅名英語を乗換駅名フィールドにコピーする */}
                            <button onClick={() => {
                                if (transferSelectedIndex === null || !targetStation) return
                                const _setting = structuredClone(setting)
                                selectedIndexes.forEach(ind => {
                                    const station = _setting.stationList[ind - 1]
                                    if (!station || !station.transfers[transferSelectedIndex]) return
                                    station.transfers[transferSelectedIndex].station.name = targetStation.name
                                    station.transfers[transferSelectedIndex].station.eng = targetStation.eng
                                })
                                setSetting(_setting)
                            }}>基本設定情報を反映</button>
                        </fieldset>
                        {/* 路線情報フォームのアイコンピッカー（ポップアップとは別の通常モーダル） */}
                        {lineFormIconPickerMode === 'new' && (
                            <IconNewPopup
                                setting={setting}
                                setSetting={setSetting}
                                onSelect={handleLineFormIconSelect}
                                onClose={() => setLineFormIconPickerMode(null)}
                            />
                        )}
                        {lineFormIconPickerMode === 'list' && (
                            <IconListPopup
                                setting={setting}
                                onSelect={handleLineFormIconSelect}
                                onClose={() => setLineFormIconPickerMode(null)}
                            />
                        )}
                        </>
                    )
                })()}

                <br></br>
                <label>開くドア</label>
                <select onChange={(e) => {formUpdated(e, 'doorSide')}} value={targetStation?.doorSide ?? 'right'}>
                    <option value={'right'}>右</option>
                    <option value={'left'}>左</option>
                </select>
                <br></br>
            </>)}

            {/* ===== 路線図タブ (defaultLine) ===== */}
            {activeSection === 'defaultLine' && (<>
                <label>次区間所要時間(分)</label>
                <input type="text" id="sectionTimeInput" onChange={(e) => formUpdated(e, 'sectionTime')}
                    value={targetStation?.sectionTime ?? ''}
                ></input>
                <br></br>
                <label>次区間路線ID</label>
                <input type="text" id="lineIdInput" onChange={(e) => formUpdated(e, 'lineId')}
                    value={targetStation?.lineId ?? ''}
                ></input>
                <br></br>
                <label>乗換案内</label>
                <textarea id="transferTextInput" rows={6} cols={30} onChange={(e) => formUpdated(e, 'transferText')}
                    value={targetStation?.transferText ?? ''}
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
                    value={targetStation?.transferTextEng ?? ''}
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
                {/* transfers の各路線情報（item.line直接参照）を乗換案内テキストに反映する */}
                <button onClick={() => {
                    let transferText: string = "";
                    let transferTextEng: string = "";
                    targetStation.transfers.forEach((item: transferItemType) => {
                        const line = item.line
                        if (!line) return
                        if (line.lineIconKey) transferText += `:${line.lineIconKey}:`
                        transferText += line.name;
                        transferText += "\n";
                        if (line.lineIconKey) transferTextEng += `:${line.lineIconKey}:`
                        transferTextEng += line.eng;
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

            {/* ===== 乗換一覧表示タブ (transfersDisp) ===== */}
            {activeSection === 'transfersDisp' && (<>
                <label>乗換一覧行分割指定</label>
                <br></br>
                <textarea
                    rows={8}
                    cols={30}
                    onChange={(e) => formUpdated(e, 'transfersListDisp')}
                    value={targetStation?.transfersListDisp ?? ''}
                ></textarea>
                <br></br>
                {/* 基本設定情報を反映: transfers の各インデックス（0始まり）をスペース区切りでテキストボックスに書き込む */}
                <button onClick={() => {
                    if (!targetStation) return
                    const _setting = structuredClone(setting)
                    selectedIndexes.forEach(ind => {
                        if (_setting.stationList[ind - 1]) {
                            _setting.stationList[ind - 1].transfersListDisp =
                                _setting.stationList[ind - 1].transfers.map((_: transferItemType, i: number) => String(i)).join(' ')
                        }
                    })
                    setSetting(_setting)
                }}>基本設定情報を反映</button>
                <br></br>
            </>)}

            {/* ===== ホーム案内タブ (platform) ===== */}
            {activeSection === 'platform' && (<>
                <label>ホーム乗換案内行ごと表示数</label>
                <input type="text" onChange={(e) => formUpdated(e, 'transferCountLineP')}
                    value={targetStation?.transferCountLineP ?? ''}
                ></input>
                <br></br>
                <label>スロット分割数</label>
                <input type="text" onChange={(e) => formUpdated(e, 'slotNum')}
                    value={targetStation?.slotNum ?? ''}
                ></input>
                <br></br>
                <label>列車左端スロット</label>
                <input type="text" onChange={(e) => formUpdated(e, 'leftSlotInd')}
                    value={targetStation?.leftSlotInd ?? ''}
                ></input>
                <br></br>
                <label>ホーム向側列車の路線ID</label>
                <input id="otherTrainIDInput" type="text" onChange={(e) => formUpdated(e, 'otherLineInd')}
                    value={targetStation?.otherLineInd ?? ''}
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
                    value={targetStation?.otherCarNum ?? ''}
                ></input>
                <br></br>
                <label>向側列車左端スロット</label>
                <input type="text" onChange={(e) => formUpdated(e, 'otherLeftSlotInd')}
                    value={targetStation?.otherLeftSlotInd ?? ''}
                ></input>
                <br></br>
            </>)}

        </div>
    )
}

export default StationParamSetter
