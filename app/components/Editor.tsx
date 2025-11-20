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
import createNumIconFromPreset from '../modules/createIconFromPreset'

const Editor = () => {
    const [setting, setSetting] = useState<settingType>(initSettingObject.setting)

    const [presetIconDict, setPresetIconDict] = useState<Record<string, string>>(loadPresetNumIconTexts());

    console.log(createNumIconFromPreset(presetIconDict, "I_JR_west", "A", "", "#000000"))

    console.log(presetIconDict)

    return(
        <div>
            <EditorHead setting={setting} setSetting={setSetting}/>
            <br></br>
            <OperationForm setting={setting} setSetting={setSetting}/>
            <br></br>
            <StationList setting={setting} setSetting={setSetting}/>
            <br></br>
            <LineList setting={setting} setSetting={setSetting}/>
            <br></br>
            <IconList setting={setting} setSetting={setSetting}/>
        </div>
    )
}

export default Editor