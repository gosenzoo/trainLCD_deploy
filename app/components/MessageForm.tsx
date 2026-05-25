"use client"

import React from "react"
import "../type"

type MessageFormProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

const MessageForm: React.FC<MessageFormProps> = ({ setting, setSetting }) => {
    const text = setting.message?.text ?? ""

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const _setting: settingType = structuredClone(setting)
        // message フィールドが旧データに存在しない場合に備えて初期化する
        if (!_setting.message) _setting.message = { text: "" }
        _setting.message.text = e.target.value
        setSetting(_setting)
    }

    return (
        <div>
            <div className="form-row">
                <label>メッセージ</label>
                <textarea
                    value={text}
                    onChange={handleChange}
                    rows={10}
                    style={{ resize: "vertical", width: "100%" }}
                />
            </div>
        </div>
    )
}

export default MessageForm
