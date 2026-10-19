"use client"

import React, { useEffect, useRef } from 'react'
import "../type"
import { loadIconPresetTexts } from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { iconIndexes, numberIndexes } from '../modules/presetIndex'

type LineInfoBalloonProps = {
    // 路線が未設定の区間は null（「路線未設定」と表示する。7.60節）
    line: lineType | null
    // 路線記号（line.lineIconKey）を引くためのアイコン辞書
    iconDict: settingType['iconDict']
    // 吹き出しの表示位置（クリックされた位置を基準にする）
    x: number
    y: number
    onClose: () => void
}

// 路線セルクリック時に路線情報（路線名・かな・英語・記号画像）を表示する吹き出し。
// position: fixed でクリック位置の近くに表示し、外側クリックで閉じる。
const LineInfoBalloon: React.FC<LineInfoBalloonProps> = ({ line, iconDict, x, y, onClose }) => {
    const balloonRef = useRef<HTMLDivElement>(null)
    const presetIconDict = loadIconPresetTexts()

    // 吹き出し外側をクリックしたら閉じる
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (balloonRef.current && !balloonRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleMouseDown)
        return () => document.removeEventListener('mousedown', handleMouseDown)
    }, [onClose])

    // 路線が未設定（またはlineDictに無い）区間は「路線未設定」とだけ表示する（7.60節）
    if (!line) {
        return (
            <div
                ref={balloonRef}
                className="line-info-balloon"
                style={{ position: 'fixed', left: x, top: y }}
                onClick={e => e.stopPropagation()}
            >
                <button className="line-info-balloon-close" onClick={onClose} title="閉じる">×</button>
                <div className="line-info-balloon-row">
                    <span>路線未設定</span>
                </div>
            </div>
        )
    }

    // プリセットのアイコンと [プリセット名] を描く。一覧にないキーはアイコンを描けないので「キー:[キー](未登録)」の文字にする（7.50節）
    const renderPreset = (indexes: { key: string, name: string }[], presetKey: string, symbol: string, color: string) => {
        const index = indexes.find(i => i.key === presetKey)
        if (!index) return <span>キー:{presetKey}(未登録)</span>
        const html = createNumIconFromPreset(presetIconDict, presetKey, symbol, '', color)?.outerHTML
        return (<>
            {html ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} /> : null}
            <span>[{index.name}]</span>
        </>)
    }

    // 路線記号: 路線設定の一覧（LineList）と同じく iconDict から描く。画像なら [画像]、未設定なら空欄
    const iconParams = line.lineIconKey ? iconDict[line.lineIconKey] : undefined
    let lineIcon: React.ReactNode = null
    if (typeof iconParams === 'string') {
        lineIcon = iconParams ? (<><img src={iconParams} alt="" width="30px" height="30px" /><span>[画像]</span></>) : null
    } else if (iconParams) {
        lineIcon = renderPreset(iconIndexes, iconParams.presetType, iconParams.symbol, iconParams.color)
    }

    // ナンバリングフォーマット: これまで路線記号欄に出していたナンバリングの画像。キーが空なら空欄
    const numFormat = line.numIconPresetKey
        ? renderPreset(numberIndexes, line.numIconPresetKey, line.symbol, line.color)
        : null

    return (
        <div
            ref={balloonRef}
            className="line-info-balloon"
            style={{ position: 'fixed', left: x, top: y }}
            onClick={e => e.stopPropagation()}
        >
            <button className="line-info-balloon-close" onClick={onClose} title="閉じる">×</button>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">路線名</span>
                <span>{line.name}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">路線名かな</span>
                <span>{line.kana}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">路線名英語</span>
                <span>{line.eng}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">路線記号</span>
                {lineIcon}
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">ナンバリングフォーマット</span>
                {numFormat}
            </div>
        </div>
    )
}

export default LineInfoBalloon
