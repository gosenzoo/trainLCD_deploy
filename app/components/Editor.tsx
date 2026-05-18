"use client"

import React, { useState } from 'react'
import EditorHead from "./EditorHead"
import OperationForm from './OperationForm'
import StationList from "./StationList"
import LineList from "./LineList"
import IconList from './IconList'
import DispConfig from './DispConfig'
import AccordionSection from './AccordionSection'
import "../type"
import initSettingObject from '../initSettingObject'

import {loadIconPresetTexts} from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

const Editor = () => {
    const [setting, setSetting] = useState<settingType>(initSettingObject.setting)

    const [presetIconDict, setPresetIconDict] = useState<Record<string, string>>(loadIconPresetTexts());

    // 表示タイプ状態を Editor で管理し、sticky ツールバーの「表示」ボタンから参照する
    const [displayType, setDisplayType] = useState<string>("tokyu")

    // localStorageから設定を読み込み、旧形式を正規化して state に反映する
    const loadFromLocalStorage = () => {
        const lcdStrageItem = localStorage.getItem('lcdStrage');
        if (!lcdStrageItem) {
            alert("localStrageにアイテムがありません");
            return;
        }
        const loaded = JSON.parse(lcdStrageItem);
        if (!loaded.dispConfig) {
            loaded.dispConfig = structuredClone(initSettingObject.dispConfig);
        }
        if (!loaded.dispConfig.pageList) {
            loaded.dispConfig.pageList = structuredClone(initSettingObject.dispConfig.pageList);
        }
        loaded.stationList.forEach((station: any) => {
            if (typeof station.transfers === 'string') {
                station.transfers = station.transfers
                    ? station.transfers.split(' ').filter((id: string) => id).map((id: string) => {
                        const lineData = loaded.lineDict?.[id]
                        return { line: { lineIconKey: lineData?.lineIconKey ? [lineData.lineIconKey] : [], name: lineData?.name ?? '', kana: lineData?.kana ?? '', eng: lineData?.eng ?? '' }, station: { isDraw: false, type: '', symbol: '', color: '', number: '', name: '', eng: '' } }
                    })
                    : [];
            } else if (Array.isArray(station.transfers)) {
                station.transfers = station.transfers.map((t: any) => {
                    if (t.lineId !== undefined && t.line === undefined) {
                        const lineData = loaded.lineDict?.[t.lineId]
                        return { line: { lineIconKey: lineData?.lineIconKey ? [lineData.lineIconKey] : [], name: lineData?.name ?? '', kana: lineData?.kana ?? '', eng: lineData?.eng ?? '' }, station: t.station ?? { isDraw: false, type: '', symbol: '', color: '', number: '', name: '', eng: '' } }
                    }
                    if (t.line && typeof t.line.lineIconKey === 'string') {
                        t = { ...t, line: { ...t.line, lineIconKey: t.line.lineIconKey ? [t.line.lineIconKey] : [] } }
                    }
                    return t
                })
            }
        });
        setSetting(loaded);
    }

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
                {/* LcdSimulator画面を別タブで開く */}
                <button onClick={() => window.open('/LcdSimulator/index.html', '_blank')} className="btn-secondary">LCDシミュレータ</button>
                {/* Controllerデバッグ画面を別タブで開く */}
                <button onClick={() => window.open('/Controller/index.html', '_blank')} className="btn-secondary">Controllerデバッグ</button>
                {/* Drawerデバッグ画面を別タブで開く */}
                <button onClick={() => window.open('/lcdDisplay/index.html', '_blank')} className="btn-secondary">デバッグ</button>
                <button onClick={loadFromLocalStorage}>LocalStorageから読み込み</button>
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
                <AccordionSection title="表示設定" defaultOpen={false}>
                    <DispConfig setting={setting} setSetting={setSetting}/>
                </AccordionSection>
            </div>
        </div>
    )
}

export default Editor