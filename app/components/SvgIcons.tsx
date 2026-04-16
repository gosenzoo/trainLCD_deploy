/**
 * 共有SVGアイコンコンポーネント群
 * ボタン内に直接SVGを埋め込まず、ここから参照する。
 * サイズは font-size に追従する 1em 基準。
 */

import React from 'react'

type SvgIconProps = {
    className?: string
}

/** 上矢印（上に移動） */
export const IconArrowUp: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <polygon points="8,2 15,14 1,14"/>
    </svg>
)

/** 下矢印（下に移動） */
export const IconArrowDown: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <polygon points="8,14 15,2 1,2"/>
    </svg>
)

/** プラス（追加） */
export const IconPlus: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <rect x="7" y="1" width="2" height="14"/>
        <rect x="1" y="7" width="14" height="2"/>
    </svg>
)

/** ゴミ箱（削除） */
export const IconTrash: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <rect x="5" y="0" width="6" height="2.5" rx="1"/>
        <rect x="1" y="2.5" width="14" height="2" rx="0.5"/>
        <path d="M2.5 4.5 L3.5 15.5 L12.5 15.5 L13.5 4.5 Z"/>
    </svg>
)
