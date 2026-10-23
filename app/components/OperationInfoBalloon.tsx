"use client"

import React, { useEffect, useRef } from 'react'
import "../type"
import { loadIconPresetTexts } from '../modules/loadIconPresetTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'
import { resolveDestination } from '../modules/resolveDestination'

type OperationInfoBalloonProps = {
    // 表示する運用のID（operationDictのキー）と運用データ
    operationId: string
    // 運用が未設定の区間は null（「運用未設定」と表示する。7.60節）
    operation: operationType | null
    // 実際に表示される行先（7.49節）を求めるための駅一覧
    stationList: stationType[]
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
const OperationInfoBalloon: React.FC<OperationInfoBalloonProps> = ({ operationId, operation, stationList, x, y, onClose }) => {
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

    // 運用が未設定（またはoperationDictに無い）区間は「運用未設定」とだけ表示する（7.60節）
    if (!operation) {
        return (
            <div
                ref={balloonRef}
                className="line-info-balloon"
                style={{ position: 'fixed', left: x, top: y }}
                onClick={e => e.stopPropagation()}
            >
                <button className="line-info-balloon-close" onClick={onClose} title="閉じる">×</button>
                <div className="line-info-balloon-row">
                    <span>運用未設定</span>
                </div>
            </div>
        )
    }

    // 行先は実際に表示されるもの（「行先を自動で設定する」がオンなら末尾停車駅の値）を出す（7.49節）
    const isAuto = operation.isAutoDestination !== false
    const dest = resolveDestination(operation, stationList)
    const { symbol, number } = parseStationNumber(dest.destinationNum)
    const destNumHtml = createNumIconFromPreset(presetIconDict, dest.destinationNumIconKey, symbol, number, dest.destinationColor)?.outerHTML

    return (
        <div
            ref={balloonRef}
            className="line-info-balloon"
            style={{ position: 'fixed', left: x, top: y }}
            onClick={e => e.stopPropagation()}
        >
            <button className="line-info-balloon-close" onClick={onClose} title="閉じる">×</button>
            {/* 1行目: 「運用[id]」と、行先自動がオンなら同じ行にハイライトした札を並べる */}
            <div className="line-info-balloon-row">
                <span>運用{operationId}</span>
                {isAuto && <span className="operation-auto-dest-badge">行先自動</span>}
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">行先</span>
                <span>{dest.destination}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">行先かな</span>
                <span>{dest.destinationKana}</span>
            </div>
            <div className="line-info-balloon-row">
                <span className="line-info-balloon-label">行先英語</span>
                <span>{dest.destinationEng}</span>
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
                <span className="line-info-balloon-label">行先の駅アイコン</span>
                {destNumHtml
                    ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: destNumHtml }} />
                    : null}
            </div>
        </div>
    )
}

export default OperationInfoBalloon
