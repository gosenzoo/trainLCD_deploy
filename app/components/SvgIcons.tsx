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

/** フォルダ（ファイル操作） */
export const IconFileOps: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <path d="M1 3 H6.5 L8 4.5 H15 V13 H1 Z"/>
    </svg>
)

/** 電車正面（駅設定） */
export const IconStation: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <rect x="2.5" y="3" width="11" height="7" rx="2.5"/>
        <circle cx="5.5" cy="13" r="1.6"/>
        <circle cx="10.5" cy="13" r="1.6"/>
    </svg>
)

/** 旗（運用設定） */
export const IconOperation: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <rect x="3" y="1" width="1.4" height="14"/>
        <path d="M4.4 2 H13 L10.2 5 L13 8 H4.4 Z"/>
    </svg>
)

/** 吹き出し（メッセージ設定） */
export const IconMessage: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <rect x="1" y="2" width="14" height="8.5" rx="2"/>
        <polygon points="4,10.5 4,14 7.2,10.5"/>
    </svg>
)

/** 駅2つを結ぶ線（路線登録） */
export const IconLineReg: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <rect x="2" y="7.2" width="12" height="1.6"/>
        <circle cx="3.2" cy="8" r="2.6"/>
        <circle cx="12.8" cy="8" r="2.6"/>
    </svg>
)

/** 円と三角形（アイコン登録） */
export const IconShapes: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <circle cx="5.2" cy="6.2" r="3.2"/>
        <polygon points="9.2,13.5 14.5,13.5 11.8,4.5"/>
    </svg>
)

/** モニター（表示設定） */
export const IconDisplay: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className}>
        <rect x="1" y="2" width="14" height="9" rx="1"/>
        <rect x="6.5" y="11.5" width="3" height="1.6"/>
        <rect x="4" y="13.3" width="8" height="1.3" rx="0.5"/>
    </svg>
)

/** 右向きの三角形（7.70節。iOSで「▶」などの文字が絵文字になるのを避けるためSVGで描く） */
export const IconTriangleRight: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className} style={{ verticalAlign: '-0.125em' }}>
        <polygon points="4,2 14,8 4,14"/>
    </svg>
)

/** 左向きの三角形（7.70節。iOSで「▶」などの文字が絵文字になるのを避けるためSVGで描く） */
export const IconTriangleLeft: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className} style={{ verticalAlign: '-0.125em' }}>
        <polygon points="12,2 2,8 12,14"/>
    </svg>
)

/** 上向きの三角形（7.70節。iOSで「▶」などの文字が絵文字になるのを避けるためSVGで描く） */
export const IconTriangleUp: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className} style={{ verticalAlign: '-0.125em' }}>
        <polygon points="8,3 14,13 2,13"/>
    </svg>
)

/** 下向きの三角形（7.70節。iOSで「▶」などの文字が絵文字になるのを避けるためSVGで描く） */
export const IconTriangleDown: React.FC<SvgIconProps> = ({ className }) => (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" aria-hidden="true" className={className} style={{ verticalAlign: '-0.125em' }}>
        <polygon points="2,3 14,3 8,13"/>
    </svg>
)
