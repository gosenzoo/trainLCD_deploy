"use client"

import React, { useEffect, useRef, useState } from 'react'
import EditorHead from "./EditorHead"
import Header from "./Header"
import OperationForm from './OperationForm'
import MessageForm from './MessageForm'
import StationList from "./StationList"
import LineList from "./LineList"
import IconList from './IconList'
import DispConfig from './DispConfig'
import DisplaySettingPopup from './DisplaySettingPopup'
import { IconFileOps, IconStation, IconOperation, IconMessage, IconLineReg, IconShapes, IconDisplay } from './SvgIcons'
import "../type"
import initSettingObject from '../initSettingObject'
import { APP_VERSION } from '../version'

import {loadIconPresetTexts} from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

// localStorage から読み込んだ設定の旧形式を正規化（マイグレーション）して返す。
// 起動時の自動読み込みで使う
const normalizeLoadedSetting = (loaded: any): settingType => {
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
    // isAutoDestination がない旧データは、行先が空ならオン・入力済みならオフにする（7.49節）
    Object.values(loaded.operationDict).forEach((op: any) => {
        if (op.isAutoDestination === undefined) op.isAutoDestination = !op.destination
        // 表示タイプがない旧データは東急にする（7.52節）
        if (!op.displayType) op.displayType = 'tokyu'
    })
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
        // 中国語・韓国語・副駅名がない旧データは空文字にする（7.54節。駅設定の入力欄は存在する項目だけを更新するため）
        if (station.zh === undefined) station.zh = ''
        if (station.ko === undefined) station.ko = ''
        if (station.subName === undefined) station.subName = ''
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
        // 2つ目のナンバリング（numIconNext）が未定義の場合は空の手動モードで補完する
        if (station.numIconNext === undefined) {
            station.numIconNext = { symbol: '', number: '', presetKey: 'N_tokyu', color: '', manualSymbol: '', manualPresetKey: 'N_tokyu', manualColor: '', colorMode: 'manual' }
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
    return loaded
}

// 自動保存の遅延時間（ミリ秒）。連続した入力で書き込みが多発しないよう、最後の変更からこの時間後にまとめて保存する
const AUTO_SAVE_DELAY = 300

const Editor = () => {
    const [setting, setSetting] = useState<settingType>(initSettingObject.setting)

    const [presetIconDict, setPresetIconDict] = useState<Record<string, string>>(loadIconPresetTexts());

    // 「表示設定」ポップアップの開閉（7.52節）
    const [isDisplaySettingOpen, setIsDisplaySettingOpen] = useState<boolean>(false)

    // サイドバーで選択中のセクションID（排他選択、常に1つだけ選択される）
    const [activeSectionId, setActiveSectionId] = useState<string>("station")

    // ---- 起動時の自動読み込み・編集のたびの自動保存 ----
    // 起動時の読み込みが終わったら true。それまでは自動保存しない（初期値で保存済みデータを上書きしないため）。
    // 読み込みに失敗した場合は false のままにして、そのセッションでは自動保存しない
    const [isStorageReady, setIsStorageReady] = useState(false)
    // 保存待ちの設定（最後の変更から一定時間後にまとめて保存する）とタイマー
    const pendingSaveRef = useRef<settingType | null>(null)
    const saveTimerRef = useRef<number | null>(null)

    // 保存待ちの設定があれば直ちに localStorage へ書き込む
    const flushSave = () => {
        if (saveTimerRef.current !== null) {
            clearTimeout(saveTimerRef.current)
            saveTimerRef.current = null
        }
        const pending = pendingSaveRef.current
        if (!pending) return
        pendingSaveRef.current = null
        try {
            localStorage.setItem('lcdStrage', JSON.stringify(pending))
        } catch (e) {
            // 容量超過などで保存できなかった場合
            console.warn('lcdStrage への自動保存に失敗しました', e)
        }
    }

    // 起動時（初回表示時）に localStorage のデータがあれば自動で読み込む。データがなければ初期値のまま
    useEffect(() => {
        const item = localStorage.getItem('lcdStrage')
        if (!item) {
            setIsStorageReady(true)
            return
        }
        try {
            setSetting(normalizeLoadedSetting(JSON.parse(item)))
            setIsStorageReady(true)
        } catch (e) {
            console.warn('lcdStrage のデータを読み込めなかったため初期値で起動します（自動保存は行いません）', e)
        }
    }, [])

    // 設定データのバージョン情報（0_metadata.version）を常に現在のアプリのバージョンにそろえる（7.39節）。
    // 読み込んだ古いデータ（0_metadata がない・バージョンが違う）は、正規化後のこの時点で現在のバージョンになる
    useEffect(() => {
        if (setting['0_metadata']?.version === APP_VERSION) return
        setSetting(prev => ({ ...prev, '0_metadata': { version: APP_VERSION } }))
    }, [setting])

    // 設定が変わるたびに、最後の変更から AUTO_SAVE_DELAY ミリ秒後にまとめて保存する
    useEffect(() => {
        if (!isStorageReady) return
        pendingSaveRef.current = setting
        if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = window.setTimeout(flushSave, AUTO_SAVE_DELAY)
    }, [setting, isStorageReady])

    // タブが裏に回るとき・ページを離れるときは、保存待ちの内容を直ちに保存する
    useEffect(() => {
        const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flushSave() }
        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('pagehide', flushSave)
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('pagehide', flushSave)
            // アンマウント時も保存待ちの内容を残さない
            flushSave()
        }
        // flushSave は ref 経由で最新値を参照するため、登録は1回でよい
    }, [])

    // LCD 画面を別タブで開く。表示タイプは運用ごとの設定になったため、常に display.html を開く（7.52節）
    const openDisplay = () => {
        localStorage.setItem('lcdStrage', JSON.stringify(setting))
        window.open('./display.html', '_blank', 'noopener')
    }

    console.log(createNumIconFromPreset(presetIconDict, "I_JR_west", "A", "", "#000000"))

    console.log(presetIconDict)

    // サイドバーに表示するセクション一覧。id・表示名・アイコン・内容コンポーネントをここで一元管理する
    const sections: { id: string, title: string, icon: React.FC, element: React.ReactNode }[] = [
        {
            id: "file", title: "ファイル", icon: IconFileOps,
            element: <EditorHead setting={setting} setSetting={setSetting}/>,
        },
        { id: "station", title: "駅", icon: IconStation, element: <StationList setting={setting} setSetting={setSetting}/> },
        { id: "operation", title: "運用", icon: IconOperation, element: <OperationForm setting={setting} setSetting={setSetting}/> },
        { id: "message", title: "メッセージ", icon: IconMessage, element: <MessageForm setting={setting} setSetting={setSetting}/> },
        // ページ・言語はメッセージの次に置く（7.52節）
        { id: "dispConfig", title: "ページ・言語", icon: IconDisplay, element: <DispConfig setting={setting} setSetting={setSetting}/> },
        { id: "icon", title: "アイコン", icon: IconShapes, element: <IconList setting={setting} setSetting={setSetting}/> },
        { id: "line", title: "路線", icon: IconLineReg, element: <LineList setting={setting} setSetting={setSetting}/> },
    ]
    const activeSection = sections.find(s => s.id === activeSectionId) ?? sections[0]

    return(
        <div>
            {/* ヘッダー（タイトルの右に「表示」ボタン）。openDisplay が設定の state を使うため Editor 内で描画する。
                editor-layout の外に置くことで overflow-x:hidden の影響を受けず sticky が機能する */}
            <Header onDisplay={openDisplay} onDisplaySetting={() => setIsDisplaySettingOpen(true)}/>
            {/* 「表示設定」ポップアップ（環状運転・座標による駅移動） */}
            {isDisplaySettingOpen && (
                <DisplaySettingPopup setting={setting} setSetting={setSetting} onClose={() => setIsDisplaySettingOpen(false)}/>
            )}
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