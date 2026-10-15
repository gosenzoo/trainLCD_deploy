"use client"

import React, { useEffect, useRef } from 'react'
import "../type"
import { loadIconPresetTexts } from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

type LineInfoBalloonProps = {
    line: lineType
    // 吹き出しの表示位置（クリックされた位置を基準にする）
    x: number
    y: number
    onClose: () => void
}

// 路線セルクリック時に路線情報（路線名・かな・英語・記号画像）を表示する吹き出し。
// position: fixed でクリック位置の近くに表示し、外側クリックで閉じる。
const LineInfoBalloon: React.FC<LineInfoBalloonProps> = ({ line, x, y, onClose }) => {
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

    const symbolHtml = createNumIconFromPreset(presetIconDict, line.numIconPresetKey, line.symbol, '', line.color)?.outerHTML

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
                {symbolHtml
                    ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: symbolHtml }} />
                    : null}
            </div>
        </div>
    )
}

export default LineInfoBalloon
