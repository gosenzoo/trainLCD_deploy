"use client"

import React, { useState } from 'react'
import EditorHead from "./EditorHead"
import OperationForm from './OperationForm'
import StationList from "./StationList"
import LineList from "./LineList"
import IconList from './IconList'
import "../type"
import initSettingObject from '../initSettingObject'

import {loadPresetNumIconTexts} from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

const Editor = () => {
    const [setting, setSetting] = useState<settingType>(initSettingObject.setting)

    const [presetIconDict, setPresetIconDict] = useState<Record<string, string>>(loadPresetNumIconTexts());

    console.log(createNumIconFromPreset(presetIconDict, "I_JR_west", "A", "", "#000000"))

    console.log(presetIconDict)

    return(
        <div className="editor-container">
            <div className="editor-section">
                <EditorHead setting={setting} setSetting={setSetting}/>
            </div>
            <div className="editor-section">
                <OperationForm setting={setting} setSetting={setSetting}/>
            </div>
            <div className="editor-section">
                <StationList setting={setting} setSetting={setSetting}/>
            </div>
            <div className="editor-section">
                <LineList setting={setting} setSetting={setSetting}/>
            </div>
            <div className="editor-section">
                <IconList setting={setting} setSetting={setSetting}/>
            </div>
        </div>
    )
}

export default Editor