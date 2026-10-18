"use client"

import React from "react"
import "../type"
import ToggleSwitch from './ToggleSwitch'

type displaySettingPopupType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    onClose: () => void,
}

// 画面送りの選択肢（7.53節）。この順に横に並べる
const PAGE_ADVANCE_MODES: { value: infoType['pageAdvanceMode'], label: string }[] = [
    { value: 'manual', label: '手動' },
    { value: 'time', label: '自動(時間)' },
    { value: 'coord', label: '自動(座標)' },
]

// ヘッダーの「表示設定」ボタンから開くポップアップ（7.52節・7.53節）。
// 画面送り・環状運転を設定する。変更はその場で設定に反映する（決定ボタンはない）
const DisplaySettingPopup: React.FC<displaySettingPopupType> = ({ setting, setSetting, onClose }) => {
    // 画面送りを切り替える
    const modeUpdated = (mode: infoType['pageAdvanceMode']) => {
        const _setting: settingType = structuredClone(setting)
        _setting.info.pageAdvanceMode = mode
        setSetting(_setting)
    }
    const currentMode = setting.info.pageAdvanceMode ?? 'manual'

    // 手動操作を許可を切り替える
    const allowManualUpdated = (checked: boolean) => {
        const _setting: settingType = structuredClone(setting)
        _setting.info.allowManualControl = checked
        setSetting(_setting)
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                <div className="modal-title-row">
                    <p className="modal-title">表示設定</p>
                    <button className="modal-close-btn" onClick={onClose} title="閉じる">×</button>
                </div>
                <div className="form-row">
                    <label>画面送り</label>
                    {/* 3つのうち1つを選ぶ切り替えスイッチ。選んだものをハイライトする */}
                    <div className="segmented-switch">
                        {PAGE_ADVANCE_MODES.map(m => (
                            <button
                                key={m.value}
                                className={`segmented-switch-item${currentMode === m.value ? ' segmented-switch-item--active' : ''}`}
                                onClick={() => modeUpdated(m.value)}
                            >{m.label}</button>
                        ))}
                    </div>
                </div>
                {/* 手動操作を許可。画面送りが「手動」のときは常に操作できるため、グレーアウトする */}
                <div className={`form-row${currentMode === 'manual' ? ' form-disabled' : ''}`}>
                    <label>手動操作を許可</label>
                    <ToggleSwitch checked={setting.info.allowManualControl ?? true} onChange={allowManualUpdated} />
                </div>
                {/* 環状運転は準備中のためグレーアウトして変更できなくする（LCD表示では常にオフとして扱う） */}
                <div className="form-row form-disabled">
                    <label>環状運転(準備中)</label>
                    <ToggleSwitch checked={setting.info.isLoop} onChange={() => {}} />
                </div>
                <div className="modal-footer">
                    <button onClick={onClose}>閉じる</button>
                </div>
            </div>
        </div>
    )
}

export default DisplaySettingPopup
