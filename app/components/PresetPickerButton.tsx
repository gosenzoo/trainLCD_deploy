"use client"

import React, { useState } from 'react'
import { iconIndexes, numberIndexes } from '../modules/presetIndex'
import PresetPickerPopup, { PresetPickerKind, presetPreviewHtml } from './PresetPickerPopup'

type PresetPickerButtonProps = {
    kind: PresetPickerKind
    // 今選んでいる種類（空は ""）
    value: string
    onChange: (key: string) => void
    disabled?: boolean
}

// 路線アイコン・駅アイコンの種類の選択欄（7.78節）。今の種類の画像と名前を表示し、押すとポップアップを開く
const PresetPickerButton: React.FC<PresetPickerButtonProps> = ({ kind, value, onChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false)
    const indexes = kind === 'icon' ? iconIndexes : numberIndexes
    const name = indexes.find(idx => idx.key === value)?.name
    const html = presetPreviewHtml(value)

    return (
        <>
            <button type="button" className="preset-picker-button" disabled={disabled} onClick={() => setIsOpen(true)}>
                {html && <svg viewBox="0 0 225 225" width="30" height="30" dangerouslySetInnerHTML={{ __html: html }} />}
                {/* 何も選んでいないときは「（空）」 */}
                <span>{value ? (name ?? value) : '（空）'}</span>
            </button>
            {isOpen && (
                <PresetPickerPopup kind={kind} value={value} onSelect={onChange} onClose={() => setIsOpen(false)} />
            )}
        </>
    )
}

export default PresetPickerButton
