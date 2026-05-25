"use client"

import React, { useState } from 'react'
import "../type"
import GenericItemList, { ColumnDef } from './GenericItemList'
import { IconArrowUp, IconArrowDown, IconPlus, IconTrash } from './SvgIcons'
import ToggleSwitch from './ToggleSwitch'

type dispConfigProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>
}

// 選択可能なページ名の固定リスト
const AVAILABLE_PAGES = [
    "defaultLineSVG.svg",
    "overLineSVG.svg",
    "transfers.svg",
    "platform.svg",
    "doorAnim.svg",
    "trainTypeChange.svg",
    "infoMessage.svg",
]

// pageStateの表示名（0〜5）
const PAGE_STATE_LABELS = ['始発停車', '走行', '直前', '停車', '通過', '終点停車']

// pageTypeの表示名（0〜3）
const PAGE_TYPE_LABELS = ['無条件', '乗換あり', '次運用あり', 'メッセージあり']

// 言語IDに対応する表示名（0:日本語, 1:ひらがな, 2:英語）
const LANG_NAMES: Record<number, string> = {
    0: '日本語',
    1: 'ひらがな',
    2: '英語'
}

const DispConfig: React.FC<dispConfigProps> = ({ setting, setSetting }) => {
    // ページ設定の状態
    const [selectedPageStateTab, setSelectedPageStateTab] = useState<number>(0)
    const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null)

    // 言語設定の選択状態
    const [selectedLangIndex, setSelectedLangIndex] = useState<number | null>(null)

    const pageDispList = setting.dispConfig?.pageDispList ?? {}
    const langIdList   = setting.dispConfig?.langIdList ?? []

    // 現在タブのページリスト
    const currentPageList: pageObjType[] = pageDispList[String(selectedPageStateTab)] ?? []

    // ============================================================
    // ページ設定操作
    // ============================================================

    const pageColumns: ColumnDef<pageObjType>[] = [
        {
            header: 'ページ名',
            isSelector: true,
            cell: (row) => row.pageName
        },
        {
            header: '表示時間(ms)',
            cell: (row) => String(row.dispTime)
        },
        {
            header: '表示条件',
            cell: (row) => PAGE_TYPE_LABELS[row.type] ?? String(row.type)
        }
    ]

    const handlePageStateTabChange = (tab: number) => {
        setSelectedPageStateTab(tab)
        setSelectedPageIndex(null)
    }

    const handlePageRowClick = (key: string) => {
        const idx = Number(key)
        setSelectedPageIndex(prev => prev === idx ? null : idx)
    }

    // 選択行の直下（未選択時は末尾）に新規エントリを挿入する
    const addPage = () => {
        const _setting = structuredClone(setting)
        const list: pageObjType[] = [...((_setting.dispConfig.pageDispList ?? {})[String(selectedPageStateTab)] ?? [])]
        const insertAt = selectedPageIndex !== null ? selectedPageIndex + 1 : list.length
        list.splice(insertAt, 0, { pageName: AVAILABLE_PAGES[0], dispTime: 8000, type: 0 })
        if (!_setting.dispConfig.pageDispList) _setting.dispConfig.pageDispList = {}
        _setting.dispConfig.pageDispList[String(selectedPageStateTab)] = list
        setSetting(_setting)
        setSelectedPageIndex(insertAt)
    }

    const deletePage = () => {
        if (selectedPageIndex === null) return
        const _setting = structuredClone(setting)
        const list = [...((_setting.dispConfig.pageDispList ?? {})[String(selectedPageStateTab)] ?? [])]
        list.splice(selectedPageIndex, 1)
        _setting.dispConfig.pageDispList[String(selectedPageStateTab)] = list
        setSetting(_setting)
        setSelectedPageIndex(null)
    }

    const movePageUp = () => {
        if (selectedPageIndex === null || selectedPageIndex === 0) return
        const _setting = structuredClone(setting)
        const list = [...((_setting.dispConfig.pageDispList ?? {})[String(selectedPageStateTab)] ?? [])]
        ;[list[selectedPageIndex - 1], list[selectedPageIndex]] = [list[selectedPageIndex], list[selectedPageIndex - 1]]
        _setting.dispConfig.pageDispList[String(selectedPageStateTab)] = list
        setSetting(_setting)
        setSelectedPageIndex(selectedPageIndex - 1)
    }

    const movePageDown = () => {
        if (selectedPageIndex === null || selectedPageIndex >= currentPageList.length - 1) return
        const _setting = structuredClone(setting)
        const list = [...((_setting.dispConfig.pageDispList ?? {})[String(selectedPageStateTab)] ?? [])]
        ;[list[selectedPageIndex], list[selectedPageIndex + 1]] = [list[selectedPageIndex + 1], list[selectedPageIndex]]
        _setting.dispConfig.pageDispList[String(selectedPageStateTab)] = list
        setSetting(_setting)
        setSelectedPageIndex(selectedPageIndex + 1)
    }

    // 選択中エントリのフィールドを更新する
    const updateSelectedPage = (field: keyof pageObjType, value: string | number) => {
        if (selectedPageIndex === null) return
        const _setting = structuredClone(setting)
        const list = [...((_setting.dispConfig.pageDispList ?? {})[String(selectedPageStateTab)] ?? [])]
        list[selectedPageIndex] = { ...list[selectedPageIndex], [field]: value }
        _setting.dispConfig.pageDispList[String(selectedPageStateTab)] = list
        setSetting(_setting)
    }

    const selectedPage = selectedPageIndex !== null ? currentPageList[selectedPageIndex] : null
    const pageFormDisabled = selectedPage === null

    // ============================================================
    // 言語設定操作
    // ============================================================

    const langColumns: ColumnDef<langIdEntryType>[] = [
        {
            header: '言語ID',
            isSelector: true,
            cell: (row) => `${row.langId} (${LANG_NAMES[row.langId] ?? '不明'})`
        },
        { header: '表示時間(ms)', cell: (row) => row.displayTime },
        { header: '遷移時間(ms)', cell: (row) => row.transTime   },
        { header: 'ギャップ時間(ms)', cell: (row) => row.gapTime },
    ]

    const handleLangRowClick = (key: string) => {
        const idx = Number(key)
        setSelectedLangIndex(prev => prev === idx ? null : idx)
    }

    const addLang = () => {
        const _setting = structuredClone(setting)
        _setting.dispConfig.langIdList.push({ langId: 0, displayTime: 4000, transTime: 400, gapTime: 100 })
        setSetting(_setting)
        setSelectedLangIndex(_setting.dispConfig.langIdList.length - 1)
    }

    const deleteLang = () => {
        if (selectedLangIndex === null) return
        const _setting = structuredClone(setting)
        _setting.dispConfig.langIdList.splice(selectedLangIndex, 1)
        setSetting(_setting)
        setSelectedLangIndex(null)
    }

    const updateLangField = (field: keyof langIdEntryType, value: string) => {
        if (selectedLangIndex === null) return
        const _setting = structuredClone(setting)
        _setting.dispConfig.langIdList[selectedLangIndex][field] = Number(value) as never
        setSetting(_setting)
    }

    const selectedLang = selectedLangIndex !== null ? langIdList[selectedLangIndex] : null
    const langFormDisabled = selectedLang === null

    // ============================================================
    // レンダリング
    // ============================================================

    return (
        <div>
            {/* ---- ページ設定 ---- */}
            <h3>ページ設定</h3>
            {/* pageStateタブ（6状態） */}
            <div className="operation-tabs">
                {PAGE_STATE_LABELS.map((label, i) => (
                    <button
                        key={i}
                        onClick={() => handlePageStateTabChange(i)}
                        className={`tab-btn${selectedPageStateTab === i ? ' active' : ''}`}
                    >{label}</button>
                ))}
            </div>
            <div className="tab-form-body">
                <GenericItemList
                    columns={pageColumns}
                    rows={currentPageList.map((entry, i) => ({ key: String(i), data: entry }))}
                    selectedKeys={selectedPageIndex !== null ? [String(selectedPageIndex)] : []}
                    onRowClick={handlePageRowClick}
                    tableId="dispConfigPageTable"
                    containerId="dispConfigPageContainer"
                />
                {/* 操作ボタン（他リストと同じアイコン/色） */}
                <div className="btn-group" style={{marginTop: '4px'}}>
                    <button onClick={movePageUp} className="btn-icon" title="上に移動"><IconArrowUp/></button>
                    <button onClick={movePageDown} className="btn-icon" title="下に移動"><IconArrowDown/></button>
                    <button onClick={addPage} className="btn-icon btn-primary" title="追加"><IconPlus/></button>
                    <button onClick={deletePage} disabled={selectedPageIndex === null} className="btn-icon btn-danger" title="削除"><IconTrash/></button>
                </div>
                {/* 編集フォーム（非選択時グレーアウト） */}
                <div className={`param-setter${pageFormDisabled ? ' disp-config-disabled' : ''}`}>
                    <div className="form-row">
                        <label>ページ名</label>
                        <select
                            value={selectedPage?.pageName ?? AVAILABLE_PAGES[0]}
                            disabled={pageFormDisabled}
                            onChange={e => updateSelectedPage('pageName', e.target.value)}
                        >
                            {AVAILABLE_PAGES.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-row">
                        <label>表示時間(ms)</label>
                        <input
                            type="number"
                            value={selectedPage?.dispTime ?? ''}
                            disabled={pageFormDisabled}
                            onChange={e => updateSelectedPage('dispTime', Number(e.target.value))}
                        />
                    </div>
                    <div className="form-row">
                        <label>表示条件</label>
                        <select
                            value={selectedPage?.type ?? 0}
                            disabled={pageFormDisabled}
                            onChange={e => updateSelectedPage('type', Number(e.target.value))}
                        >
                            {PAGE_TYPE_LABELS.map((label, i) => (
                                <option key={i} value={i}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* ページ自動切換えトグル（グレーアウトなし・常時有効） */}
                <div className="form-row" style={{marginTop: '8px'}}>
                    <label>ページ自動切換え</label>
                    <ToggleSwitch
                        checked={setting.dispConfig?.isPageAuto ?? true}
                        onChange={checked => {
                            const _setting = structuredClone(setting)
                            _setting.dispConfig.isPageAuto = checked
                            setSetting(_setting)
                        }}
                    />
                </div>
            </div>

            {/* ---- 言語設定 ---- */}
            <h3>言語設定</h3>
            <GenericItemList
                columns={langColumns}
                rows={langIdList.map((entry, i) => ({ key: String(i), data: entry }))}
                selectedKeys={selectedLangIndex !== null ? [String(selectedLangIndex)] : []}
                onRowClick={handleLangRowClick}
                tableId="dispConfigLangTable"
            />
            <div className="btn-group">
                <button className="btn-icon btn-primary" title="追加" onClick={addLang}><IconPlus/></button>
                <button className="btn-icon btn-danger" title="削除" onClick={deleteLang} disabled={selectedLangIndex === null}><IconTrash/></button>
            </div>

            {/* 言語編集フォーム（非選択時グレーアウト） */}
            <div className={`param-setter${langFormDisabled ? ' disp-config-disabled' : ''}`}>
                <div className="form-row">
                    <label>言語ID</label>
                    <input
                        type="number"
                        value={selectedLang?.langId ?? ''}
                        disabled={langFormDisabled}
                        onChange={e => updateLangField('langId', e.target.value)}
                    />
                    <span className="form-hint">{selectedLang ? (LANG_NAMES[selectedLang.langId] ?? '不明') : ''}</span>
                </div>
                <div className="form-row">
                    <label>表示時間(ms)</label>
                    <input
                        type="number"
                        value={selectedLang?.displayTime ?? ''}
                        disabled={langFormDisabled}
                        onChange={e => updateLangField('displayTime', e.target.value)}
                    />
                </div>
                <div className="form-row">
                    <label>遷移時間(ms)</label>
                    <input
                        type="number"
                        value={selectedLang?.transTime ?? ''}
                        disabled={langFormDisabled}
                        onChange={e => updateLangField('transTime', e.target.value)}
                    />
                </div>
                <div className="form-row">
                    <label>ギャップ時間(ms)</label>
                    <input
                        type="number"
                        value={selectedLang?.gapTime ?? ''}
                        disabled={langFormDisabled}
                        onChange={e => updateLangField('gapTime', e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}

export default DispConfig
