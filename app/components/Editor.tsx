"use client"

import React, { useState } from 'react'
import EditorHead from "./EditorHead"
import OperationForm from './OperationForm'
import StationList from "./StationList"
import LineList from "./LineList"
import IconList from './IconList'
import AccordionSection from './AccordionSection'
import "../type"
import initSettingObject from '../initSettingObject'

import {loadPresetNumIconTexts} from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

const Editor = () => {
    const [setting, setSetting] = useState<settingType>(initSettingObject.setting)

    const [presetIconDict, setPresetIconDict] = useState<Record<string, string>>(loadPresetNumIconTexts());

    // 表示タイプ状態を Editor で管理し、sticky ツールバーの「表示」ボタンから参照する
    const [displayType, setDisplayType] = useState<string>("tokyu")

    // 選択中の表示タイプに対応する LCD 画面を別タブで開く
    const openDisplay = () => {
        if (displayType === "JW-225") {
            localStorage.setItem('lcdStrage', JSON.stringify(setting))
            window.open('./Display_JW-225.html')
        }
        if (displayType === "tokyu") {
            localStorage.setItem('lcdStrage', JSON.stringify(setting))
            window.open('./display.html', '_blank', 'noopener')
        }
        if (displayType === "JE-E131") { console.log("ないです") }
    }

    console.log(createNumIconFromPreset(presetIconDict, "I_JR_west", "A", "", "#000000"))

    console.log(presetIconDict)

    return(
        <div>
            {/* editor-container の外に置くことで overflow-x:hidden の影響を受けず sticky が機能する */}
            <div className="display-toolbar">
                {/* デバッグ画面を別タブで開く */}
                <button onClick={() => window.open('/lcdDisplay/index.html', '_blank')} className="btn-secondary">デバッグ</button>
                <button onClick={openDisplay} className="btn-primary">表示</button>
            </div>
            <div className="editor-container">
                {/* 各セクションをアコーディオン形式で表示 */}
                <AccordionSection title="ファイル操作">
                    <EditorHead setting={setting} setSetting={setSetting}
                        displayType={displayType} setDisplayType={setDisplayType}/>
                </AccordionSection>
                <AccordionSection title="駅設定">
                    <StationList setting={setting} setSetting={setSetting}/>
                </AccordionSection>
                <AccordionSection title="運用設定">
                    <OperationForm setting={setting} setSetting={setSetting}/>
                </AccordionSection>
                <AccordionSection title="路線登録" defaultOpen={false}>
                    <LineList setting={setting} setSetting={setSetting}/>
                </AccordionSection>
                <AccordionSection title="アイコン登録" defaultOpen={false}>
                    <IconList setting={setting} setSetting={setSetting}/>
                </AccordionSection>
            </div>
        </div>
    )
}

export default Editor