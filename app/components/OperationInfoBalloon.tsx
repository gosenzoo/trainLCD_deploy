"use client"

import React, { useEffect, useRef } from 'react'
import "../type"
import { loadIconPresetTexts } from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

type OperationInfoBalloonProps = {
    // 表示する運用のID（operationDictのキー）と運用データ
    operationId: string
    operation: operationType
    // 吹き出しの表示位置（クリックされた位置を基準にする）
    x: number
    y: number
    onClose: () => void
}

// 行先ナンバリング文字列を記号と番号に分割する。
// 分割規則は public/Controller/src/utility/utils.js の parseStationNumber と同一にする
// （表示側と編集側で同じ見た目のアイコンになるようにするため）。
const parseStationNumber = (numberStr: string): { symbol: string, number: string } => {
    if (!numberStr) return { symbol: '', number: '' }
    // スペース区切りで記号と番号を分割する（例: "H 08" → symbol="H", number="08"）
    const spaceIdx = numberStr.indexOf(' ')
    if (spaceIdx !== -1) {
        return { symbol: numberStr.slice(0, spaceIdx), number: numberStr.slice(spaceIdx + 1) }
    }
    // スペースなしの場合は非数字／数字の境界で分割する（例: "TY01"）
    const match = numberStr.match(/^([^0-9]*)([0-9].*)$/)
    if (match) return { symbol: match[1], number: match[2] }
    return { symbol: '', number: numberStr }
}

// 運用セルクリック時に運用情報（行先・種別・経由等・号車・行先番号）を表示する吹き出し。
// 表示位置・閉じる操作・デザインは LineInfoBalloon と共通にする。
const OperationInfoBalloon: React.FC<OperationInfoBalloonProps> = ({ operationId, operation, x, y, onClose }) => {
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

    const { symbol, number } = parseStationNumber(operation.destinationNum)
    const destNumHtml = createNumIconFromPreset(presetIconDict, operation.destinationNumIconKey, symbol, number, operation.destinationColor)?.outerHTML

    return (
        <div
            ref={balloonRef}
            className="line-info-balloon"
            style={{ position: 'fixed', left: x, top: y }}
            onClick={e => e.stopPropagation()}
        >
            <button className="line-info-balloon-close" onClick={onClose} title="閉じる">×</button>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">運用ID</span>
                <span>{operationId}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">行先</span>
                <span>{operation.destination}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">行先かな</span>
                <span>{operation.destinationKana}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">行先英語</span>
                <span>{operation.destinationEng}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">種別</span>
                <span>{operation.trainType}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">種別英語</span>
                <span>{operation.trainTypeEng}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">経由等</span>
                <span>{operation.direction}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">号車</span>
                <span>{operation.carNumber}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">行先番号</span>
                {destNumHtml
                    ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: destNumHtml }} />
                    : null}
            </div>
        </div>
    )
}

export default OperationInfoBalloon
