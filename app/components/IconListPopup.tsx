"use client"

import React, { useState } from 'react'
import "../type"
import GenericItemList, { ColumnDef } from './GenericItemList'
import { loadPresetNumIconTexts } from '../modules/loadPresetNumIconTexts'
import createNumIconFromPreset from '../modules/createIconFromPreset.client'

type IconListPopupProps = {
    setting: settingType
    // アイコン決定時のコールバック（選択したアイコンのキーを渡す）
    onSelect: (key: string) => void
    // ポップアップを閉じるコールバック
    onClose: () => void
    // true のとき入れ子モーダル用 z-index クラスを使用する
    isNested?: boolean
}

const IconListPopup: React.FC<IconListPopupProps> = ({
    setting, onSelect, onClose, isNested = false
}) => {
    // 選択中のアイコンキー
    const [listSelectedKey, setListSelectedKey] = useState<string>('')

    const presetIconDict = loadPresetNumIconTexts()

    // リストのカラム定義（ID列 + アイコンプレビュー列）
    const listColumns: ColumnDef<string | iconParamsType>[] = [
        {
            header: 'ID',
            isSelector: true,
            cell: (_, key) => key,
        },
        {
            header: 'アイコン',
            cell: (iconObj) => {
                if (typeof iconObj === 'string') {
                    return iconObj ? <img src={iconObj} alt="" width="30px" height="30px" /> : null
                } else if (iconObj) {
                    const html = createNumIconFromPreset(presetIconDict, iconObj.presetType, iconObj.symbol, '', iconObj.color)?.outerHTML
                    return html
                        ? <svg viewBox='0 0 225 225' width="30px" height="30px" dangerouslySetInnerHTML={{ __html: html }} />
                        : null
                }
                return null
            },
        },
    ]

    // 入れ子モーダルかどうかで z-index クラスを切り替える
    const backdropClass = isNested ? 'modal-backdrop-top' : 'modal-backdrop'

    return (
        <div className={backdropClass} onClick={onClose}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                <p className="modal-title">アイコンをリストから選択</p>
                <GenericItemList
                    columns={listColumns}
                    rows={Object.entries(setting.iconDict).map(([key, iconObj]) => ({ key, data: iconObj }))}
                    selectedKeys={listSelectedKey ? [listSelectedKey] : []}
                    onRowClick={key => setListSelectedKey(key)}
                    tableId="iconListPopupTable"
                    containerId="iconListPopupContainer"
                />
                <div className="btn-group" style={{marginTop: '8px'}}>
                    <button
                        onClick={() => { if (listSelectedKey) onSelect(listSelectedKey) }}
                        className="btn-primary"
                        disabled={!listSelectedKey}
                    >アイコン選択</button>
                </div>
                <div className="modal-footer">
                    <button onClick={onClose}>閉じる</button>
                </div>
            </div>
        </div>
    )
}

export default IconListPopup
