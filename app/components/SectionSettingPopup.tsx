"use client"

import React, { useEffect, useState } from 'react'
import "../type"
import LineAddPopup from './LineAddPopup'
import { getOperationLabel } from '../modules/resolveDestination'

type SectionSettingPopupProps = {
    setting: settingType
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
    // 設定する項目（路線: lineId / 運用: operationId）
    kind: 'line' | 'operation'
    // 区間の範囲（0-based の駅インデックス。start〜end のあいだの区間 = start〜end-1 の駅の値を書き換える）
    start: number
    end: number
    onClose: () => void
}

// 駅一覧の路線列・運用列から、選択中の区間の路線・運用をまとめて設定するポップアップ（7.58節）
const SectionSettingPopup: React.FC<SectionSettingPopupProps> = ({ setting, setSetting, kind, start, end, onClose }) => {
    const stations = setting.stationList
    const field = kind === 'line' ? 'lineId' : 'operationId'
    // 一覧の初期値は始発側の最初の区間の値
    const [value, setValue] = useState<string>(stations[start]?.[field] ?? '')
    const [isLineAddOpen, setIsLineAddOpen] = useState<boolean>(false)

    // Esc で何も変えずに閉じる（路線追加ポップアップを開いているときはそちらを優先する）
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isLineAddOpen) onClose() }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [onClose, isLineAddOpen])

    // 範囲の区間（start〜end-1 の駅）を選んだ値に書き換える
    const apply = () => {
        const _setting: settingType = structuredClone(setting)
        for (let i = start; i < end; i++) {
            const s = _setting.stationList[i]
            if (!s) continue
            if (kind === 'operation') {
                s.operationId = value
                continue
            }
            s.lineId = value
            // 旧「次区間路線」と同じく、ナンバリングが自動（auto）の欄は新しい路線の値にする
            const line = _setting.lineDict[value]
            if (!line) continue
            ;(['numIcon', 'numIconNext'] as const).forEach(target => {
                if ((s[target]?.colorMode ?? 'auto') !== 'auto') return
                s[target].color     = line.color
                s[target].symbol    = line.symbol
                s[target].presetKey = line.numIconPresetKey
            })
        }
        setSetting(_setting)
        onClose()
    }

    // 路線追加ポップアップから受け取った路線を lineDict に追加し、一覧で選んだ状態にする（範囲への反映は「設定」で行う）
    const handleLineAdd = (lineData: lineType) => {
        const keys = Object.keys(setting.lineDict)
        const newKey = keys.length > 0 ? String(Math.max(...keys.map(Number)) + 1) : '0'
        // LineAddPopup 側でもアイコン登録などで設定を更新するため、最新の設定に追加する
        setSetting(prev => ({ ...prev, lineDict: { ...prev.lineDict, [newKey]: lineData } }))
        setValue(newKey)
        setIsLineAddOpen(false)
    }

    const title = `「${stations[start]?.name ?? ''}」～「${stations[end]?.name ?? ''}」の${kind === 'line' ? '路線' : '運用'}を設定`

    return (
        <>
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                <div className="modal-title-row">
                    <p className="modal-title">{title}</p>
                    <button className="modal-close-btn" onClick={onClose} title="閉じる">×</button>
                </div>
                <div className="form-row">
                    {kind === 'line' ? (<>
                        {/* 旧「次区間路線」と同じ一覧（lineDict の路線を数値キー昇順で列挙）と「新規追加」 */}
                        <select onChange={e => setValue(e.target.value)} value={value}>
                            <option value="">（未設定）</option>
                            {Object.entries(setting.lineDict)
                                .sort((a, b) => Number(a[0]) - Number(b[0]))
                                .map(([key, line]) => (
                                    <option key={key} value={key}>{line.name}</option>
                                ))
                            }
                        </select>
                        <button className="btn-primary" onClick={() => setIsLineAddOpen(true)}>新規追加</button>
                    </>) : (
                        // 旧「次区間運用」と同じ一覧（運用タブと同じラベル）
                        <select onChange={e => setValue(e.target.value)} value={value}>
                            <option value="">（なし）</option>
                            {Object.entries(setting.operationDict ?? {})
                                .sort((a, b) => Number(a[0]) - Number(b[0]))
                                .map(([key, op]) => (
                                    <option key={key} value={key}>{getOperationLabel(key, op, setting.stationList ?? [])}</option>
                                ))
                            }
                        </select>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn-primary" onClick={apply}>設定</button>
                    <button onClick={onClose}>閉じる</button>
                </div>
            </div>
        </div>
        {isLineAddOpen && (
            <LineAddPopup
                setting={setting}
                setSetting={setSetting}
                onAdd={handleLineAdd}
                onClose={() => setIsLineAddOpen(false)}
            />
        )}
        </>
    )
}

export default SectionSettingPopup
