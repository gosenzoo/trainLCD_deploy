"use client"

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { iconIndexes, numberIndexes, iconCategories, numberCategories } from '../modules/presetIndex'
import { loadIconPresetTexts } from '../modules/loadIconPresetTexts'
import { getPresetInfo } from '../modules/presetInfo.client'
import createIconFromPreset from '../modules/createIconFromPreset.client'

// 選ぶもの: 'icon' = 路線アイコンの種類（I_*）、'number' = 駅アイコンの種類（N_*）
export type PresetPickerKind = 'icon' | 'number'

// プリセットの初期値（<data>）で描いたアイコンの SVG 文字列を返す（7.78節）
export const presetPreviewHtml = (key: string): string | null => {
    if (!key) return null
    const presetTexts = loadIconPresetTexts()
    const info = getPresetInfo(presetTexts, key)
    if (!info) return null
    return createIconFromPreset(presetTexts, key, info.symbol, info.number, info.color)?.outerHTML ?? null
}

type PresetPickerPopupProps = {
    kind: PresetPickerKind
    // 今選んでいる種類（空は ""）
    value: string
    // 種類を選んだとき（「空にする」は ""）
    onSelect: (key: string) => void
    onClose: () => void
}

// 路線アイコン・駅アイコンの種類を選ぶポップアップ（7.78節）。大項目のタブと画像付きの一覧
const PresetPickerPopup: React.FC<PresetPickerPopupProps> = ({ kind, value, onSelect, onClose }) => {
    const indexes = kind === 'icon' ? iconIndexes : numberIndexes
    const categories = kind === 'icon' ? iconCategories : numberCategories
    // 開いたときは今選んでいる種類の大項目のタブ（空なら先頭のタブ）
    const [category, setCategory] = useState<string>(
        indexes.find(idx => idx.key === value)?.category ?? categories[0]
    )
    const presetTexts = loadIconPresetTexts()

    // 表現できる要素の札（路線アイコンには駅番号がない）
    const elementLabels: { label: string, prop: 'hasSymbol' | 'hasNumber' | 'hasColor' }[] = kind === 'icon'
        ? [{ label: '路線記号', prop: 'hasSymbol' }, { label: '路線カラー', prop: 'hasColor' }]
        : [{ label: '路線記号', prop: 'hasSymbol' }, { label: '駅番号', prop: 'hasNumber' }, { label: '路線カラー', prop: 'hasColor' }]

    const select = (key: string) => {
        onSelect(key)
        onClose()
    }

    // 入れ子のポップアップより前に出すため body 直下に描画する
    return createPortal(
        <div className="modal-backdrop-picker" onClick={onClose}>
            <div className="modal-dialog preset-picker" onClick={e => e.stopPropagation()}>
                <div className="modal-title-row">
                    <p className="modal-title">{kind === 'icon' ? '路線アイコンの種類' : '駅アイコンの種類'}</p>
                    <button className="modal-close-btn" onClick={onClose} title="閉じる">×</button>
                </div>
                {/* 大項目のタブ */}
                <div className="operation-tabs">
                    {categories.map(c => (
                        <button key={c} onClick={() => setCategory(c)}
                            className={`tab-btn${category === c ? ' active' : ''}`}
                        >{c}</button>
                    ))}
                </div>
                {/* 一覧（ここだけ縦にスクロールする） */}
                <div className="preset-picker-list">
                    {indexes.filter(idx => idx.category === category).map(idx => {
                        const info = getPresetInfo(presetTexts, idx.key)
                        const html = presetPreviewHtml(idx.key)
                        return (
                            <div key={idx.key}
                                className={`preset-picker-row${idx.key === value ? ' selected' : ''}`}
                                onClick={() => select(idx.key)}
                            >
                                <div className="preset-picker-image">
                                    {html && <svg viewBox="0 0 225 225" width="48" height="48" dangerouslySetInnerHTML={{ __html: html }} />}
                                </div>
                                <div className="preset-picker-name">{idx.name}</div>
                                <div className="preset-picker-tags">
                                    {elementLabels.map(e => (
                                        <span key={e.label} className={`preset-picker-tag${info?.[e.prop] ? ' on' : ''}`}>{e.label}</span>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="btn-group">
                    <button onClick={() => select('')}>空にする</button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default PresetPickerPopup
