"use client"

import React, { useState } from 'react'
import EditorHead from "./EditorHead"
import OperationForm from './OperationForm'
import StationList from "./StationList"
import LineList from "./LineList"
import IconList from './IconList'
import "../type"
import initSettingObject from '../initSettingObject'

const Editor = () => {
    const [setting, setSetting] = useState<settingType>(initSettingObject.setting)

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