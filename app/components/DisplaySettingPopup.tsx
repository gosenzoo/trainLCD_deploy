"use client"

import React from "react"
import "../type"
import ToggleSwitch from './ToggleSwitch'

type displaySettingPopupType = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    onClose: () => void,
}

// ヘッダーの「表示設定」ボタンから開くポップアップ（7.52節）。
// 環状運転・座標による駅移動を設定する。変更はその場で設定に反映する（決定ボタンはない）
const DisplaySettingPopup: React.FC<displaySettingPopupType> = ({ setting, setSetting, onClose }) => {
    // トグルスイッチ用ハンドラ（boolean 値を直接受け取る）
    const toggleUpdated = (checked: boolean, field: 'isLoop' | 'isMoveByCoord') => {
        const _setting: settingType = structuredClone(setting)
        _setting.info[field] = checked
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
                    <label>環状運転</label>
                    <ToggleSwitch checked={setting.info.isLoop} onChange={(v) => toggleUpdated(v, 'isLoop')} />
                </div>
                <div className="form-row">
                    <label>座標による駅移動</label>
                    <ToggleSwitch checked={setting.info.isMoveByCoord} onChange={(v) => toggleUpdated(v, 'isMoveByCoord')} />
                </div>
                <div className="modal-footer">
                    <button onClick={onClose}>閉じる</button>
                </div>
            </div>
        </div>
    )
}

export default DisplaySettingPopup
