"use client"

import React, { useEffect, useState } from 'react'
import "../type"
import initObjects from "../initSettingObject"
import OperationFields from './OperationFields'

type OperationAddPopupProps = {
    // 「追加」を押したときに、入力した運用を渡す
    onAdd: (operation: operationType) => void
    onClose: () => void
}

// 運用追加ポップアップ（7.61節）。区間の運用を設定するポップアップの「新規追加」から開く。
// 内容は運用設定の各運用の設定項目（表示・行先・種別・列車・表示タイプ）と同じで、縦にスクロールできる
const OperationAddPopup: React.FC<OperationAddPopupProps> = ({ onAdd, onClose }) => {
    // 入力中の運用（新しい運用の初期値から始める）
    const [operation, setOperation] = useState<operationType>(() => structuredClone(initObjects.operation))

    // Esc で何も追加せずに閉じる
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    const valueUpdated = (field: operationMembers, value: string | boolean) => {
        setOperation(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                <div className="modal-title-row">
                    <p className="modal-title">運用追加</p>
                    <button className="modal-close-btn" onClick={onClose} title="閉じる">×</button>
                </div>
                {/* 項目が多いため、この部分だけ縦にスクロールする */}
                <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
                    <OperationFields
                        operation={operation}
                        onValue={valueUpdated}
                        onCarNumberListChange={(value) => valueUpdated('carNumberList', value)}
                    />
                </div>
                <div className="modal-footer">
                    <button className="btn-primary" onClick={() => onAdd(operation)}>追加</button>
                    <button onClick={onClose}>閉じる</button>
                </div>
            </div>
        </div>
    )
}

export default OperationAddPopup
