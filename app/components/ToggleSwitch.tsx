"use client"

import React from 'react'

type ToggleSwitchProps = {
    checked: boolean
    onChange: (checked: boolean) => void
}

// CSS のみで実装したトグルスイッチコンポーネント
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange }) => {
    return (
        <label className="toggle-switch">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="toggle-slider"></span>
        </label>
    )
}

export default ToggleSwitch
