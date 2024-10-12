"use client"

import React, { useState } from 'react'
import EditorHead from "./EditorHead"
import InfoForm from './InfoForm'
import StationList from "./StationList"
import LineList from "./LineList"
import IconList from './IconList'
import "../type"
import initSettingObject from '../initSettingObject'

const Editor = () => {
    const [setting, setSetting] = useState<settingType>(initSettingObject)

    return(
        <div>
            <EditorHead setting={setting} setSetting={setSetting}/>
            <br></br>
            <InfoForm setting={setting} setSetting={setSetting}/>
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