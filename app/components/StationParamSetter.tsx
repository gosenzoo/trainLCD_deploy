import React, { useState, useEffect, TextareaHTMLAttributes } from 'react'
import "../type"
import kanaToAlphabet from "../modules/KanaConverter"
import kanaToHangul from "../modules/KanaToHangul"
import { text } from 'stream/consumers'
import { iconIndexes, numberIndexes } from '../modules/presetIndex'
import GenericItemList, { ColumnDef } from './GenericItemList'
import { loadIconPresetTexts } from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { moveArrayItemsUp, moveArrayItemsDown } from '../modules/listOperations'
import IconNewPopup from './IconNewPopup'
import IconListPopup from './IconListPopup'
import PresetPickerButton from './PresetPickerButton'
import ToggleSwitch from './ToggleSwitch'
import PlatformEditor, { PlatformPatch } from './PlatformEditor'
import { IconArrowUp, IconArrowDown, IconTrash, IconPlus, IconTriangleRight, IconTriangleLeft } from './SvgIcons'

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
    // 「路線記号２」エリアの開閉状態（路線をまたぐ駅でのみ使うため初期状態は折りたたみ）
    const [isNumIconNextOpen, setIsNumIconNextOpen] = useState<boolean>(false)
    // 乗換路線リストの選択インデックス（0-based、null: 未選択）
    const [transferSelectedIndex, setTransferSelectedIndex] = useState<number | null>(null)
    // 路線記号アイコンリストの選択インデックス（0-based、null: 未選択）
    const [selectedLineIconIndex, setSelectedLineIconIndex] = useState<number | null>(null)
    // 「リストから追加」ポップアップ
    const [isLineListPopupOpen, setIsLineListPopupOpen] = useState<boolean>(false)
    const [lineListPopupSelectedIndex, setLineListPopupSelectedIndex] = useState<number | null>(null)
    const [cachedTransferLines, setCachedTransferLines] = useState<transferLineType[]>([])

    const presetIconDict = loadIconPresetTexts()

    // 編集対象のナンバリング欄。'numIcon': 路線記号（今までの路線） / 'numIconNext': 路線記号２（次の路線）
    type NumIconTarget = 'numIcon' | 'numIconNext'

    // numIcon サブオブジェクトのフィールドを更新するハンドラ
    const numIconUpdated = (value: string, field: keyof stationNumIconType, target: NumIconTarget) => {
        if (!setting) return
        const _setting: settingType = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const s = _setting.stationList[ind - 1]
            // keyof のユニオン型と string の不一致を抑制するため as never でキャストする
            if (s) s[target][field] = value as never
        })
        setSetting(_setting)
    }

    // カラーピッカー変更: manualColor を更新し、手動モードなら color（有効色）も同時に更新する
    const manualColorUpdated = (value: string, target: NumIconTarget) => {
        if (!setting) return
        const _setting: settingType = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const s = _setting.stationList[ind - 1]
            if (!s) return
            s[target].manualColor = value
            if (s[target].colorMode !== 'auto') s[target].color = value
        })
        setSetting(_setting)
    }

    // 路線記号入力変更: manualSymbol を更新し、手動モードなら symbol（有効値）も同時に更新する
    const manualSymbolUpdated = (value: string, target: NumIconTarget) => {
        if (!setting) return
        const _setting: settingType = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const s = _setting.stationList[ind - 1]
            if (!s) return
            s[target].manualSymbol = value
            if (s[target].colorMode !== 'auto') s[target].symbol = value
        })
        setSetting(_setting)
    }

    // ナンバリング記号セレクト変更: manualPresetKey を更新し、手動モードなら presetKey（有効値）も同時に更新する
    const manualPresetKeyUpdated = (value: string, target: NumIconTarget) => {
        if (!setting) return
        const _setting: settingType = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const s = _setting.stationList[ind - 1]
            if (!s) return
            s[target].manualPresetKey = value
            if (s[target].colorMode !== 'auto') s[target].presetKey = value
        })
        setSetting(_setting)
    }

    // colorMode 変更: auto → 路線設定値を3フィールドに書き込む / manual → manual* から各有効値を復元する
    const colorModeUpdated = (value: string, target: NumIconTarget) => {
        if (!setting) return
        const _setting: settingType = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const s = _setting.stationList[ind - 1]
            if (!s) return
            s[target].colorMode = value as 'auto' | 'manual'
            const line = _setting.lineDict[s.lineId]
            if (value === 'auto') {
                // 空欄を含め路線設定値をそのまま反映する（if ガードを外す）
                if (line) {
                    s[target].color     = line.color
                    s[target].symbol    = line.symbol
                    s[target].presetKey = line.numIconPresetKey
                }
            } else {
                s[target].color     = s[target].manualColor
                s[target].symbol    = s[target].manualSymbol
                s[target].presetKey = s[target].manualPresetKey
            }
        })
        setSetting(_setting)
    }

    // ホームの編集画面（7.76節）で向かい側の列車の値を変える。選択中のすべての駅に反映する
    const platformUpdated = (patch: PlatformPatch) => {
        if (!setting) return
        const _setting: settingType = structuredClone(setting)
        selectedIndexes.forEach(ind => {
            const s = _setting.stationList[ind - 1]
            if (s) Object.assign(s, patch)
        })
        setSetting(_setting)
    }

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
                // 韓国語も自動で上書きする（7.54節）
                _setting.stationList[ind - 1].ko = kanaToHangul(e.target.value)
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
                if (!t.line.lineIconKey?.length && !t.line.name && !t.line.kana && !t.line.eng) return
                const key = `${(t.line.lineIconKey || []).join(',')}|${t.line.name}|${t.line.kana}|${t.line.eng}`
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

    // 路線情報フォームのアイコンピッカーで決定されたとき、選択中エントリの lineIconKey 末尾にキーを追加する
    const handleLineFormIconSelect = (key: string) => {
        if (transferSelectedIndex === null) return
        // 選択中アイコンの右隣に挿入する。未選択の場合は末尾に追加する
        const insertAt = selectedLineIconIndex !== null ? selectedLineIconIndex + 1 : null
        setSetting(prev => {
            const _setting = structuredClone(prev)
            selectedIndexes.forEach(ind => {
                const station = _setting.stationList[ind - 1]
                if (!station || !station.transfers[transferSelectedIndex]) return
                ensureTransferLine(station.transfers[transferSelectedIndex])
                const keys = [...(station.transfers[transferSelectedIndex].line.lineIconKey || [])]
                if (insertAt !== null && insertAt <= keys.length) {
                    keys.splice(insertAt, 0, key)
                } else {
                    keys.push(key)
                }
                station.transfers[transferSelectedIndex].line.lineIconKey = keys
            })
            return _setting
        })
        // 挿入したアイコンを選択状態にする
        setSelectedLineIconIndex(insertAt !== null ? insertAt : null)
        setLineFormIconPickerMode(null)
    }

    // 路線記号アイコンリストで選択中のアイコンを削除する
    const deleteLineIcon = () => {
        if (transferSelectedIndex === null || selectedLineIconIndex === null) return
        setSetting(prev => {
            const _setting = structuredClone(prev)
            selectedIndexes.forEach(ind => {
                const station = _setting.stationList[ind - 1]
                if (!station || !station.transfers[transferSelectedIndex]) return
                ensureTransferLine(station.transfers[transferSelectedIndex])
                const keys = [...(station.transfers[transferSelectedIndex].line.lineIconKey || [])]
                keys.splice(selectedLineIconIndex, 1)
                station.transfers[transferSelectedIndex].line.lineIconKey = keys
            })
            return _setting
        })
        setSelectedLineIconIndex(null)
    }

    // 路線記号アイコンリストで選択中のアイコンを左右に移動する
    const moveLineIcon = (dir: -1 | 1) => {
        if (transferSelectedIndex === null || selectedLineIconIndex === null) return
        setSetting(prev => {
            const _setting = structuredClone(prev)
            selectedIndexes.forEach(ind => {
                const station = _setting.stationList[ind - 1]
                if (!station || !station.transfers[transferSelectedIndex]) return
                ensureTransferLine(station.transfers[transferSelectedIndex])
                const keys = [...(station.transfers[transferSelectedIndex].line.lineIconKey || [])]
                const newIdx = selectedLineIconIndex + dir
                if (newIdx < 0 || newIdx >= keys.length) return
                ;[keys[selectedLineIconIndex], keys[newIdx]] = [keys[newIdx], keys[selectedLineIconIndex]]
                station.transfers[transferSelectedIndex].line.lineIconKey = keys
            })
            return _setting
        })
        setSelectedLineIconIndex(prev => prev !== null ? prev + dir : null)
    }

    // 旧形式エントリ（line が未定義）を line オブジェクトで初期化するヘルパー
    const ensureTransferLine = (t: any): void => {
        if (!t.line) {
            t.line = { lineIconKey: [], name: '', kana: '', eng: '' }
        }
    }

    // 選択中の乗換路線エントリの line フィールドを更新する
    // functional updater を使い、IconNewPopup の setSetting と競合しないようにする
    const updateTransferLine = (field: 'name' | 'kana' | 'eng', value: string) => {
        if (transferSelectedIndex === null) return
        setSetting(prev => {
            const _setting = structuredClone(prev)
            selectedIndexes.forEach(ind => {
                const station = _setting.stationList[ind - 1]
                if (!station || !station.transfers[transferSelectedIndex]) return
                // 旧形式データで line が未定義の場合は初期化する
                ensureTransferLine(station.transfers[transferSelectedIndex])
                station.transfers[transferSelectedIndex].line[field] = value
            })
            return _setting
        })
    }

    // kana/eng を同時更新する（かな入力時の自動ローマ字補完用）
    // functional updater を使い、IconNewPopup の setSetting と競合しないようにする
    const updateTransferLineKanaEng = (kana: string) => {
        if (transferSelectedIndex === null) return
        setSetting(prev => {
            const _setting = structuredClone(prev)
            selectedIndexes.forEach(ind => {
                const station = _setting.stationList[ind - 1]
                if (!station || !station.transfers[transferSelectedIndex]) return
                // 旧形式データで line が未定義の場合は初期化する
                ensureTransferLine(station.transfers[transferSelectedIndex])
                station.transfers[transferSelectedIndex].line.kana = kana
                station.transfers[transferSelectedIndex].line.eng = kanaToAlphabet(kana, 1)
            })
            return _setting
        })
    }

    // 乗換路線リストの操作対象配列（targetStation の transfers）
    const targetStation = setting.stationList[selectedIndexes[selectedIndexes.length - 1] - 1]
    // transfers は transferItemType[] として扱う
    const transfersArr: transferItemType[] = targetStation?.transfers ?? []

    // ナンバリング設定欄（路線記号／路線記号２で共通）を描画する。
    // bare が true の場合は fieldset で包まず入力欄のみを返す（呼び出し側が折りたたみ用の枠を持つため）
    const renderNumIconFields = (target: NumIconTarget, bare = false) => {
        const numIcon = targetStation?.[target]
        const isAuto = numIcon?.colorMode === 'auto'
        const fields = (
            <>
                {/* 所属路線の設定を使う（オン＝自動）: lineId 変更・切替時に symbol・presetKey・color を路線設定値で自動更新する（7.59節） */}
                <div className="form-row">
                    <label>所属路線の設定を使う</label>
                    <ToggleSwitch checked={(numIcon?.colorMode ?? 'auto') === 'auto'} onChange={(v) => colorModeUpdated(v ? 'auto' : 'manual', target)} />
                </div>
                <label>路線記号</label>
                {/* 自動モード時は disabled。値は常に manualSymbol を表示する */}
                <input type="text" id={target === 'numIcon' ? 'symbolInput' : undefined}
                    disabled={isAuto}
                    onChange={(e) => manualSymbolUpdated(e.target.value, target)}
                    value={numIcon?.manualSymbol ?? ''}
                ></input>
                <br></br>
                <label>駅番号</label>
                <input type="text" id={target === 'numIcon' ? 'numberInput' : undefined}
                    onChange={(e) => numIconUpdated(e.target.value, 'number', target)}
                    value={numIcon?.number ?? ''}
                ></input>
                <br></br>
                <label>路線カラー</label>
                {/* 自動モード時は disabled。値は常に manualColor を表示する */}
                <input
                    type="color"
                    id={target === 'numIcon' ? 'lineColorInput' : undefined}
                    disabled={isAuto}
                    onChange={(e) => manualColorUpdated(e.target.value, target)}
                    value={numIcon?.manualColor || '#000000'}
                ></input>
                <br></br>
                <label>駅アイコンの種類</label>
                {/* 自動モード時は disabled。値は常に manualPresetKey を表示する */}
                {/* 画像付きの一覧のポップアップで選ぶ（7.78節） */}
                <PresetPickerButton kind="number" disabled={isAuto}
                    onChange={key => manualPresetKeyUpdated(key, target)}
                    value={numIcon?.manualPresetKey ?? ''}
                />
                <br></br>
            </>
        )
        if (bare) return fields
        return (
            <fieldset style={{marginBottom: '6px'}}>
                <legend>駅アイコン</legend>
                {fields}
            </fieldset>
        )
    }

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
            header: '路線アイコン',
            isSelector: true,  // クリックで行選択
            // 4つ以上ある場合は先頭3つを表示し、残り数を "+N" で示す
            cell: (item) => {
                const keys = item.line?.lineIconKey ?? []
                const displayKeys = keys.length >= 4 ? keys.slice(0, 3) : keys
                const remaining = keys.length >= 4 ? keys.length - 3 : 0
                return (
                    <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                        {displayKeys.map((key, ki) => {
                            const iconParams = setting.iconDict[key]
                            if (typeof iconParams === 'string') {
                                return iconParams ? <img key={ki} src={iconParams} alt="" width="24px" height="24px" /> : null
                            } else if (iconParams) {
                                const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                                return html ? <svg key={ki} viewBox='0 0 225 225' width="24px" height="24px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                            }
                            return null
                        })}
                        {remaining > 0 && <span style={{fontSize: '11px', marginLeft: '2px'}}>+{remaining}</span>}
                    </div>
                )
            },
        },
        {
            header: '路線名',
            cell: (item) => item.line?.name ?? '',
        },
        {
            header: '駅アイコン',
            // station の type/symbol/color/number から NumIcon を生成して表示する。type 未設定時はテキストで表示
            cell: (item) => {
                const { type, symbol, color, number } = item.station
                // type が設定されていれば symbol/number が空でも画像を生成する（空文字のまま渡す）
                if (type) {
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
        <>
        <div className={isNoSelection ? 'form-disabled' : ''}>

            {/* ===== 駅基本設定タブ ===== */}
            {activeSection === 'basic' && (<>
                {/* ── 駅名グループ ── */}
                <fieldset style={{marginBottom: '6px'}}>
                    <legend>駅名</legend>
                    <label>駅名</label>
                    <input type="text" id="nameInput" onChange={(e) => formUpdated(e, 'name')}
                        value={targetStation?.name ?? ''}
                    ></input>
                    <br></br>
                    <label>かな</label>
                    <input type="text" id="kanaInput" onChange={(e) => formUpdated(e, 'kana')}
                        value={targetStation?.kana ?? ''}
                    ></input>
                    <br></br>
                    <label>英語</label>
                    <input type="text" id="engInput" onChange={(e) => formUpdated(e, 'eng')}
                        value={targetStation?.eng ?? ''}
                    ></input>
                    <br></br>
                    {/* 中国語（簡体字）・韓国語・副駅名（7.54節）。韓国語はかなの入力で自動補完される */}
                    <label>中国語</label>
                    <input type="text" onChange={(e) => formUpdated(e, 'zh')}
                        value={targetStation?.zh ?? ''}
                    ></input>
                    <br></br>
                    <label>韓国語</label>
                    <input type="text" onChange={(e) => formUpdated(e, 'ko')}
                        value={targetStation?.ko ?? ''}
                    ></input>
                    <br></br>
                    <label>副駅名</label>
                    <input type="text" onChange={(e) => formUpdated(e, 'subName')}
                        value={targetStation?.subName ?? ''}
                    ></input>
                    <br></br>
                </fieldset>
                {/* ── 路線記号グループ（numIcon: 今までの路線 / numIconNext: 次の路線） ── */}
                {renderNumIconFields('numIcon')}
                {/* 路線記号２は路線をまたぐ駅でのみ使うため、エリアごと折りたたみ可能にし初期状態は閉じておく */}
                <fieldset style={{marginBottom: '6px'}}>
                    <legend
                        onClick={() => setIsNumIconNextOpen(v => !v)}
                        style={{cursor: 'pointer', userSelect: 'none'}}
                        title={isNumIconNextOpen ? '折りたたむ' : '展開する'}
                    >
                        {/* 三角形は文字ではなくSVGアイコン（7.70節） */}
                        駅アイコン２ {isNumIconNextOpen ? '×' : <IconTriangleRight/>}
                    </legend>
                    {isNumIconNextOpen && renderNumIconFields('numIconNext', true)}
                </fieldset>
                {/* 次区間路線・次区間運用は駅一覧の路線列・運用列から設定する（7.58節） */}
                <label>上部の駅アイコンの形式</label>
                <select onChange={(e) => {formUpdated(e, 'headerNumberingType')}} value={targetStation?.headerNumberingType ?? '0'}>
                    <option value="0">通常</option>
                    <option value="1">地下鉄</option>
                </select>
                <br></br>
                <label>下部の駅番号の表示形式</label>
                <select onChange={(e) => {formUpdated(e, 'lineNumberType')}} value={targetStation?.lineNumberType ?? '0'}>
                    <option value="0">テキスト</option>
                    <option value="1">駅アイコン</option>
                </select>
                <br></br>
                {/* ── 乗換路線グループ ── */}
                <fieldset style={{marginBottom: '6px'}}>
                <legend>乗換路線</legend>
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
                    {/* 上矢印・下矢印・追加(+)・削除(ゴミ箱) をSVGアイコンで表示 */}
                    <button onClick={moveTransferUp} className="btn-icon" title="上に移動"><IconArrowUp/></button>
                    <button onClick={moveTransferDown} className="btn-icon" title="下に移動"><IconArrowDown/></button>
                    {/* 選択行の直下（未選択時は末尾）に空エントリを挿入するボタン */}
                    <button className="btn-icon btn-primary" title="追加" onClick={() => {
                        const insertAt = transferSelectedIndex !== null ? transferSelectedIndex + 1 : transfersArr.length
                        const newEntry: transferItemType = { line: { lineIconKey: [], name: '', kana: '', eng: '' }, station: { isDraw: false, type: '', symbol: '', color: '', number: '', name: '', eng: '' } }
                        const _setting = structuredClone(setting)
                        selectedIndexes.forEach(ind => {
                            const station = _setting.stationList[ind - 1]
                            if (!station) return
                            station.transfers.splice(insertAt, 0, structuredClone(newEntry))
                        })
                        setSetting(_setting)
                        // 挿入した行を選択状態にする
                        setTransferSelectedIndex(insertAt)
                    }}><IconPlus/></button>
                    <button onClick={deleteTransfer} className="btn-icon btn-danger" title="削除"><IconTrash/></button>
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
                            <div className="form-row" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                                <label>路線アイコン</label>
                                {/* 登録アイコンを横並びで表示するリスト（1行複数列、ヘッダーなし、セル選択可能） */}
                                {(() => {
                                    const keys = selectedItem?.line?.lineIconKey ?? []
                                    return (
                                        // overflowX: auto で横スクロール可能にし、要素が増えてもはみ出さないようにする
                                        <div style={{overflowX: 'auto', width: '100%', marginBottom: '4px'}}>
                                        <div style={{display: 'flex', flexDirection: 'row', gap: '4px', minHeight: '34px', flexWrap: 'nowrap'}}>
                                            {keys.map((key, i) => {
                                                const iconParams = setting.iconDict[key]
                                                const isSelected = selectedLineIconIndex === i
                                                const cellStyle: React.CSSProperties = {
                                                    border: isSelected ? '2px solid #0066cc' : 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    padding: '1px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '34px',
                                                    height: '34px',
                                                    boxSizing: 'border-box',
                                                }
                                                let content: React.ReactNode = null
                                                if (typeof iconParams === 'string') {
                                                    content = iconParams ? <img src={iconParams} alt="" width="30px" height="30px" /> : null
                                                } else if (iconParams) {
                                                    const html = createNumIconFromPreset(presetIconDict, iconParams.presetType, iconParams.symbol, '', iconParams.color)?.outerHTML
                                                    content = html ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} /> : null
                                                }
                                                return (
                                                    <div key={i} style={cellStyle} onClick={() => setSelectedLineIconIndex(isSelected ? null : i)}>
                                                        {content}
                                                    </div>
                                                )
                                            })}
                                            {keys.length === 0 && (
                                                <div style={{width: '34px', height: '34px', border: '2px dashed #ccc', borderRadius: '3px'}} />
                                            )}
                                        </div>
                                        </div>
                                    )
                                })()}
                                <div className="btn-group">
                                    <button onClick={() => setLineFormIconPickerMode('new')} className="btn-primary">新規追加</button>
                                    <button onClick={() => setLineFormIconPickerMode('list')} className="btn-primary">リストから追加</button>
                                    <button onClick={deleteLineIcon} disabled={selectedLineIconIndex === null} className="btn-icon btn-danger" title="削除"><IconTrash/></button>
                                    <button onClick={() => moveLineIcon(-1)} disabled={selectedLineIconIndex === null}><IconTriangleLeft/></button>
                                    <button onClick={() => moveLineIcon(1)} disabled={selectedLineIconIndex === null}><IconTriangleRight/></button>
                                </div>
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
                                                        header: '路線アイコン',
                                                        isSelector: true,
                                                        cell: (line) => {
                                                            // 先頭キーのみ表示する
                                                            const firstKey = (line.lineIconKey ?? [])[0]
                                                            const iconParams = firstKey ? setting.iconDict[firstKey] : undefined
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
                                <label>駅アイコンの種類</label>
                                {/* 駅基本設定の「ナンバリング記号」と同じ選択肢。値は station.type に保存 */}
                                {/* 画像付きの一覧のポップアップで選ぶ（7.78節） */}
                                <PresetPickerButton kind="number"
                                    value={selectedItem?.station.type ?? ''}
                                    onChange={key => updateTransferStation('type', key)}
                                />
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
                                <label>駅番号</label>
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
                            {/* 選択中駅の駅名・英語名、およびアイコンオブジェクト情報を乗換駅設定に反映する */}
                            <button onClick={() => {
                                if (transferSelectedIndex === null || !targetStation) return
                                const _setting = structuredClone(setting)

                                // 参照元となる乗換エントリの先頭アイコンキーを取得する
                                const sourceTransfer = targetStation.transfers[transferSelectedIndex]
                                const firstKey = (sourceTransfer?.line?.lineIconKey ?? [])[0]
                                const iconValue = firstKey ? setting.iconDict[firstKey] : undefined
                                // アイコンがオブジェクト型（プリセット形式）かどうかを判定する
                                const isIconObject = !!iconValue && typeof iconValue !== 'string'

                                selectedIndexes.forEach(ind => {
                                    const station = _setting.stationList[ind - 1]
                                    if (!station || !station.transfers[transferSelectedIndex]) return
                                    // 駅名・英語名を自駅の基本設定から上書きする
                                    station.transfers[transferSelectedIndex].station.name = targetStation.name
                                    station.transfers[transferSelectedIndex].station.eng = targetStation.eng
                                    // アイコンがオブジェクト型の場合、路線カラー・路線記号・ナンバリング記号を反映する
                                    if (isIconObject) {
                                        station.transfers[transferSelectedIndex].station.color = (iconValue as iconParamsType).color
                                        station.transfers[transferSelectedIndex].station.symbol = (iconValue as iconParamsType).symbol
                                        // I_xxx → N_xxx に変換し numberIndexes に存在すればセットする
                                        const presetType = (iconValue as iconParamsType).presetType
                                        if (presetType?.startsWith('I_')) {
                                            const candidateType = 'N_' + presetType.slice(2)
                                            if (numberIndexes.some(n => n.key === candidateType)) {
                                                station.transfers[transferSelectedIndex].station.type = candidateType
                                            }
                                        }
                                    }
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
                </fieldset>
                {/* ── その他設定（開くドア・走行時間・停車時間。7.59節） ── */}
                <fieldset style={{marginBottom: '6px'}}>
                <legend>その他設定</legend>
                <label>開くドア</label>
                <select onChange={(e) => {formUpdated(e, 'doorSide')}} value={targetStation?.doorSide ?? 'right'}>
                    <option value={'right'}>右</option>
                    <option value={'left'}>左</option>
                </select>
                <br></br>
                <label>次駅までの走行時間(秒)</label>
                <input type="text" id="sectionTimeInput" onChange={(e) => formUpdated(e, 'sectionTime')}
                    value={targetStation?.sectionTime ?? ''}
                ></input>
                <br></br>
                {/* 停車時間（秒）。自動(時間)の画面送りと所要時間の表示に使う（7.53節） */}
                <label>停車時間(秒)</label>
                <input type="text" onChange={(e) => formUpdated(e, 'stopTime')}
                    value={targetStation?.stopTime ?? ''}
                ></input>
                <br></br>
                </fieldset>

            </>)}

            {/* ===== 路線図タブ (defaultLine) ===== */}
            {activeSection === 'defaultLine' && (<>
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
                    e.target.value = '路線アイコンを追加';
                }}>
                    <option>路線アイコンを追加</option>
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
                    e.target.value = '路線アイコンを追加';
                }}>
                    <option>路線アイコンを追加</option>
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
                        // lineIconKey 配列の各要素を :key: で囲んで結合する
                        const iconKeyStr = (line.lineIconKey || []).map((k: string) => `:${k}:`).join('')
                        if (iconKeyStr) transferText += iconKeyStr
                        transferText += line.name;
                        transferText += "\n";
                        if (iconKeyStr) transferTextEng += iconKeyStr
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
                    onChange={(e) => formUpdated(e, 'transferListTransfers')}
                    value={targetStation?.transferListTransfers ?? ''}
                ></textarea>
                <br></br>
                {/* 基本設定情報を反映: transfers の各インデックス（0始まり）をスペース区切りでテキストボックスに書き込む */}
                <button onClick={() => {
                    if (!targetStation) return
                    const _setting = structuredClone(setting)
                    selectedIndexes.forEach(ind => {
                        if (_setting.stationList[ind - 1]) {
                            _setting.stationList[ind - 1].transferListTransfers =
                                _setting.stationList[ind - 1].transfers.map((_: transferItemType, i: number) => String(i)).join(' ')
                        }
                    })
                    setSetting(_setting)
                }}>基本設定情報を反映</button>
                <br></br>
            </>)}

            {/* ===== ホーム案内タブ (platform) ===== */}
            {activeSection === 'platform' && (<>
                {/* ホームの編集画面: 静止画の上で向かい側の列車の路線・両数・位置を設定する（7.76節） */}
                {targetStation && (
                    <PlatformEditor setting={setting} stationIndex={selectedIndexes[selectedIndexes.length - 1] - 1} onChange={platformUpdated} />
                )}
                <label>乗換一覧行分割指定</label>
                <textarea
                    rows={4}
                    cols={30}
                    onChange={(e) => formUpdated(e, 'transferListPlatform')}
                    value={targetStation?.transferListPlatform ?? ''}
                ></textarea>
                <br></br>
                {/* 基本設定情報を反映: transfers の各インデックスをスペース区切り1行で書き込む */}
                <button onClick={() => {
                    if (!targetStation) return
                    const _setting = structuredClone(setting)
                    selectedIndexes.forEach(ind => {
                        if (_setting.stationList[ind - 1]) {
                            _setting.stationList[ind - 1].transferListPlatform =
                                _setting.stationList[ind - 1].transfers.map((_: transferItemType, i: number) => String(i)).join(' ')
                        }
                    })
                    setSetting(_setting)
                }}>基本設定情報を反映</button>
                <br></br>
            </>)}

        </div>
        </>
    )
}

export default StationParamSetter
