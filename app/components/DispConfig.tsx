"use client"

import React, { useState } from 'react'
import "../type"
import GenericItemList, { ColumnDef } from './GenericItemList'
import initSettingObject from '../initSettingObject'

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
]

// 言語IDに対応する表示名（0:日本語, 1:ひらがな, 2:英語）
const LANG_NAMES: Record<number, string> = {
    0: '日本語',
    1: 'ひらがな',
    2: '英語'
}

const DispConfig: React.FC<dispConfigProps> = ({ setting, setSetting }) => {
    // ページ設定の選択状態
    const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null)
    const [newPageName, setNewPageName] = useState<string>(AVAILABLE_PAGES[0])

    // 言語設定の選択状態
    const [selectedLangIndex, setSelectedLangIndex] = useState<number | null>(null)

    const pageList   = setting.dispConfig?.pageList   ?? []
    const langIdList = setting.dispConfig?.langIdList ?? []

    // ============================================================
    // ページ設定操作
    // ============================================================

    const pageColumns: ColumnDef<pageEntryType>[] = [
        {
            header: 'ページ名',
            isSelector: true,
            cell: (row) => row.pageName
        },
        {
            header: '表示時間(ms)',
            cell: (row) => row.dispTime
        }
    ]

    const handlePageRowClick = (key: string) => {
        const idx = Number(key)
        setSelectedPageIndex(prev => prev === idx ? null : idx)
    }

    const addPage = () => {
        const _setting = structuredClone(setting)
        _setting.dispConfig.pageList.push({ pageName: newPageName, dispTime: initSettingObject.pageEntry.dispTime })
        setSetting(_setting)
        setSelectedPageIndex(_setting.dispConfig.pageList.length - 1)
    }

    const deletePage = () => {
        if (selectedPageIndex === null) return
        const _setting = structuredClone(setting)
        _setting.dispConfig.pageList.splice(selectedPageIndex, 1)
        setSetting(_setting)
        setSelectedPageIndex(null)
    }

    const movePageUp = () => {
        if (selectedPageIndex === null || selectedPageIndex === 0) return
        const _setting = structuredClone(setting)
        const list = _setting.dispConfig.pageList
        ;[list[selectedPageIndex - 1], list[selectedPageIndex]] =
            [list[selectedPageIndex], list[selectedPageIndex - 1]]
        setSetting(_setting)
        setSelectedPageIndex(selectedPageIndex - 1)
    }

    const movePageDown = () => {
        if (selectedPageIndex === null || selectedPageIndex >= pageList.length - 1) return
        const _setting = structuredClone(setting)
        const list = _setting.dispConfig.pageList
        ;[list[selectedPageIndex], list[selectedPageIndex + 1]] =
            [list[selectedPageIndex + 1], list[selectedPageIndex]]
        setSetting(_setting)
        setSelectedPageIndex(selectedPageIndex + 1)
    }

    const updatePageDispTime = (value: string) => {
        if (selectedPageIndex === null) return
        const _setting = structuredClone(setting)
        _setting.dispConfig.pageList[selectedPageIndex].dispTime = Number(value)
        setSetting(_setting)
    }

    const selectedPage = selectedPageIndex !== null ? pageList[selectedPageIndex] : null
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
        _setting.dispConfig.langIdList.push({ ...initSettingObject.langIdEntry })
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
            <GenericItemList
                columns={pageColumns}
                rows={pageList.map((entry, i) => ({ key: String(i), data: entry }))}
                selectedKeys={selectedPageIndex !== null ? [String(selectedPageIndex)] : []}
                onRowClick={handlePageRowClick}
                tableId="dispConfigPageTable"
            />
            <div className="btn-group">
                <select value={newPageName} onChange={e => setNewPageName(e.target.value)}>
                    {AVAILABLE_PAGES.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
                <button className="btn-secondary" onClick={addPage}>追加</button>
                <button
                    className="btn-secondary"
                    onClick={movePageUp}
                    disabled={selectedPageIndex === null || selectedPageIndex === 0}
                >↑ 上へ</button>
                <button
                    className="btn-secondary"
                    onClick={movePageDown}
                    disabled={selectedPageIndex === null || selectedPageIndex >= pageList.length - 1}
                >↓ 下へ</button>
                <button
                    className="btn-danger"
                    onClick={deletePage}
                    disabled={selectedPageIndex === null}
                >削除</button>
            </div>

            {/* ページ編集フォーム（非選択時グレーアウト） */}
            <div className={`param-setter${pageFormDisabled ? ' disp-config-disabled' : ''}`}>
                <div className="form-row">
                    <label>表示時間(ms)</label>
                    <input
                        type="number"
                        value={selectedPage?.dispTime ?? ''}
                        disabled={pageFormDisabled}
                        onChange={e => updatePageDispTime(e.target.value)}
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
                <button className="btn-secondary" onClick={addLang}>追加</button>
                <button
                    className="btn-danger"
                    onClick={deleteLang}
                    disabled={selectedLangIndex === null}
                >削除</button>
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
