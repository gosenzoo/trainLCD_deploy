"use client"

import React, { useState } from 'react'
import EditorHead from "./EditorHead"
import OperationForm from './OperationForm'
import MessageForm from './MessageForm'
import StationList from "./StationList"
import LineList from "./LineList"
import IconList from './IconList'
import DispConfig from './DispConfig'
import { IconFileOps, IconStation, IconOperation, IconMessage, IconLineReg, IconShapes, IconDisplay } from './SvgIcons'
import "../type"
import initSettingObject from '../initSettingObject'

import {loadIconPresetTexts} from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

const Editor = () => {
    const [setting, setSetting] = useState<settingType>(initSettingObject.setting)

    const [presetIconDict, setPresetIconDict] = useState<Record<string, string>>(loadIconPresetTexts());

    // 表示タイプ状態を Editor で管理し、sticky ツールバーの「表示」ボタンから参照する
    const [displayType, setDisplayType] = useState<string>("tokyu")

    // サイドバーで選択中のセクションID（排他選択、常に1つだけ選択される）
    const [activeSectionId, setActiveSectionId] = useState<string>("station")

    // localStorageから設定を読み込み、旧形式を正規化して state に反映する
    const loadFromLocalStorage = () => {
        const lcdStrageItem = localStorage.getItem('lcdStrage');
        if (!lcdStrageItem) {
            alert("localStrageにアイテムがありません");
            return;
        }
        const loaded = JSON.parse(lcdStrageItem);
        // operationList（旧配列形式）→ operationDict（辞書形式）へマイグレーション
        if (loaded.operationList && !loaded.operationDict) {
            loaded.operationDict = {}
            ;(loaded.operationList as any[]).forEach((op: any, i: number) => {
                const { startStationInd: _, ...rest } = op
                loaded.operationDict[String(i)] = rest
            })
            delete loaded.operationList
        }
        if (!loaded.operationDict || Object.keys(loaded.operationDict).length === 0) {
            loaded.operationDict = structuredClone(initSettingObject.setting.operationDict)
        }
        if (!loaded.dispConfig) {
            loaded.dispConfig = structuredClone(initSettingObject.dispConfig);
        }
        if (!loaded.dispConfig.pageDispList) {
            loaded.dispConfig.pageDispList = structuredClone(initSettingObject.dispConfig.pageDispList);
        }
        if (loaded.dispConfig.isPageAuto === undefined) {
            loaded.dispConfig.isPageAuto = true;
        }
        // lineDict の各路線に symbol/numIconPresetKey がなければ空文字で補完する
        Object.values(loaded.lineDict ?? {}).forEach((line: any) => {
            if (line.symbol === undefined) line.symbol = ""
            if (line.numIconPresetKey === undefined) line.numIconPresetKey = ""
        })
        loaded.stationList.forEach((station: any) => {
            // numIcon サブオブジェクトへのマイグレーション（旧: symbol/number/numIconPresetKey/lineColor が平坦）
            if (station.numIcon === undefined) {
                // さらに旧形式（symbol 分離前）: number が "TY 01" 形式の場合はスペースで分割する
                const rawNumber = station.number ?? ''
                const hasSymbol = station.symbol !== undefined
                const spaceIdx = hasSymbol ? -1 : rawNumber.indexOf(' ')
                station.numIcon = {
                    symbol:    hasSymbol ? (station.symbol ?? '') : (spaceIdx !== -1 ? rawNumber.slice(0, spaceIdx) : ''),
                    number:    hasSymbol ? rawNumber : (spaceIdx !== -1 ? rawNumber.slice(spaceIdx + 1) : rawNumber),
                    presetKey: station.numIconPresetKey ?? '',
                    color:     station.lineColor ?? '',
                }
            }
            // colorMode が未定義の場合は 'auto' を補完する
            if (station.numIcon.colorMode === undefined) {
                station.numIcon.colorMode = 'auto'
            }
            // manual* が未定義の場合は有効値フィールドを引き継ぐ
            if (station.numIcon.manualColor === undefined) {
                station.numIcon.manualColor = station.numIcon.color ?? ''
            }
            if (station.numIcon.manualSymbol === undefined) {
                station.numIcon.manualSymbol = station.numIcon.symbol ?? ''
            }
            if (station.numIcon.manualPresetKey === undefined) {
                station.numIcon.manualPresetKey = station.numIcon.presetKey ?? ''
            }
            // auto モード時は lineId が指す路線の設定値を3フィールドに書き込む
            if (station.numIcon.colorMode === 'auto' && station.lineId) {
                const line = loaded.lineDict?.[station.lineId]
                if (line?.color)            station.numIcon.color     = line.color
                if (line?.symbol)           station.numIcon.symbol    = line.symbol
                if (line?.numIconPresetKey) station.numIcon.presetKey = line.numIconPresetKey
            }
            // operationId が未定義の場合は空文字で補完する
            if (station.operationId === undefined) {
                station.operationId = ""
            }
            // transferCountLineP（旧）→ transferListPlatform（新）へマイグレーション
            if (station.transferListPlatform === undefined) {
                station.transferListPlatform = ""
            }
            if (station.headerNumberingType === undefined) {
                station.headerNumberingType = "0"
            }
            // transfersListDisp（旧）→ transferListTransfers（新）へマイグレーション
            if (station.transferListTransfers === undefined) {
                station.transferListTransfers = station.transfersListDisp ?? ""
            }
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

    // サイドバーに表示するセクション一覧。id・表示名・アイコン・内容コンポーネントをここで一元管理する
    const sections: { id: string, title: string, icon: React.FC, element: React.ReactNode }[] = [
        {
            id: "file", title: "ファイル操作", icon: IconFileOps,
            element: <EditorHead setting={setting} setSetting={setSetting}
                displayType={displayType} setDisplayType={setDisplayType}/>,
        },
        { id: "station", title: "駅設定", icon: IconStation, element: <StationList setting={setting} setSetting={setSetting}/> },
        { id: "operation", title: "運用設定", icon: IconOperation, element: <OperationForm setting={setting} setSetting={setSetting}/> },
        { id: "message", title: "メッセージ設定", icon: IconMessage, element: <MessageForm setting={setting} setSetting={setSetting}/> },
        { id: "line", title: "路線登録", icon: IconLineReg, element: <LineList setting={setting} setSetting={setSetting}/> },
        { id: "icon", title: "アイコン登録", icon: IconShapes, element: <IconList setting={setting} setSetting={setSetting}/> },
        { id: "dispConfig", title: "表示設定", icon: IconDisplay, element: <DispConfig setting={setting} setSetting={setSetting}/> },
    ]
    const activeSection = sections.find(s => s.id === activeSectionId) ?? sections[0]

    return(
        <div>
            {/* editor-layout の外に置くことで overflow-x:hidden の影響を受けず sticky が機能する */}
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
            <div className="editor-layout">
                {/* 左端のセクション選択サイドバー（アイコン＋キャプションの縦並び） */}
                <nav className="editor-sidebar">
                    {sections.map(s => {
                        const Icon = s.icon
                        return (
                            <button
                                key={s.id}
                                className={`editor-sidebar-item${s.id === activeSectionId ? ' editor-sidebar-item--active' : ''}`}
                                onClick={() => setActiveSectionId(s.id)}
                                title={s.title}
                            >
                                <span className="editor-sidebar-item-icon"><Icon/></span>
                                <span className="editor-sidebar-item-caption">{s.title}</span>
                            </button>
                        )
                    })}
                </nav>
                {/* 選択中セクションのみを表示するメインエリア */}
                <div className="editor-content">
                    <h2 className="editor-content-title">{activeSection.title}</h2>
                    {activeSection.element}
                </div>
            </div>
        </div>
    )
}

export default Editor