"use client"

import React, { useState } from 'react'

// カラム定義型。各コンポーネントがテーブルの列構成をこの型で宣言する。
export type ColumnDef<T> = {
    // ヘッダーセルに表示するテキスト
    header: string
    // 行データとキーを受け取り、セル内容を返す描画関数
    cell: (row: T, key: string) => React.ReactNode
    // true のとき <th> として描画し、クリックで行選択をトリガーする
    isSelector?: boolean
    // <td> 自体に適用するスタイル（背景色など）。isSelector が true の列には無効。
    cellStyle?: (row: T, key: string) => React.CSSProperties
    // true のとき列ヘッダーに × ボタンを表示し、折りたたみ可能にする
    collapsible?: boolean
    // true のとき初期状態で折りたたまれた状態にする（collapsible と併用）
    defaultCollapsed?: boolean
    // 半セルずれた色帯列として描画する場合に指定する（「この駅以降の区間路線」のような、
    // 行と行の間（区間）に属する値の表示に使う）。指定した場合、cell は無視される。
    // 前の行の値と当該行の値から縦グラデーション背景を自動生成する（詳細はrenderHalfCellColorTdのコメント参照）。
    // cellStyle を併用した場合、width など任意のスタイルを指定できる
    // （background・padding・borderBottom は常に自動生成の値で上書きされる）
    halfCellColor?: (row: T) => string | undefined
    // 半セルずれたテキスト列として描画する場合に指定する。指定した場合、cell は無視される。
    // 当該行自身の値を1つだけセル中央に表示する（前の行の値は境界線の判定にのみ使用し、表示はしない）。
    // cellStyle の扱いはhalfCellColorと同様
    halfCellText?: (row: T) => string
    // halfCellColor・halfCellText共通: 半セル境界線の表示方法。省略時は'auto'
    // 'auto': 前後の値が異なる場合のみ表示 / 'always': 常に表示 / 'never': 表示しない
    halfCellBorder?: 'auto' | 'always' | 'never'
}

// GenericItemList が受け取る Props
type GenericItemListProps<T> = {
    // 列定義の配列
    columns: ColumnDef<T>[]
    // 表示データ。配列・辞書どちらも { key, data } 形式に変換して渡す。
    rows: { key: string; data: T }[]
    // 選択中の行キーの配列
    selectedKeys: string[]
    // 行クリック時に選択キーを通知するコールバック
    onRowClick: (key: string) => void
    // テーブルコンテナの id（CSS スタイル適用用）
    tableId?: string
    containerId?: string
    // 連続選択モードの起点行キー（該当行に range-start クラスを付与し selected より優先する）
    rangeStartKey?: string
}

// halfCellBorderの指定とprev/this値の比較から、境界線を表示するかどうかを判定する
function shouldShowHalfCellBorder(border: 'auto' | 'always' | 'never' | undefined, valuesDiffer: boolean): boolean {
    if (border === 'always') return true
    if (border === 'never') return false
    return valuesDiffer  // 'auto'（デフォルト）
}

// halfCellColor列のtdを描画する。
// <td>自体のbackgroundを縦方向グラデーションにすることで、前の行の色→当該行の色を
// 半セルずれた境界（中央）で表示する。グラデーションの色停止点は<td>自身の最終的な
// 描画サイズに対して解決されるため、<td>の高さが行の高さから暗黙的に決まる場合でも
// 安定して中央で分割できる（position: absoluteや子要素のパーセント高さ指定は使わない）。
function renderHalfCellColorTd<T>(getColor: (row: T) => string | undefined, data: T, prevData: T | undefined, key: number, baseStyle: React.CSSProperties, border: 'auto' | 'always' | 'never' | undefined) {
    const prevColor = (prevData ? getColor(prevData) : undefined) || 'var(--bg-base)'
    const thisColor = getColor(data) || 'var(--bg-base)'
    const background = shouldShowHalfCellBorder(border, prevColor !== thisColor)
        ? `linear-gradient(to bottom, ${prevColor} 0, ${prevColor} calc(50% - 0.5px), var(--border) calc(50% - 0.5px), var(--border) calc(50% + 0.5px), ${thisColor} calc(50% + 0.5px), ${thisColor} 100%)`
        : (prevColor === thisColor ? prevColor : `linear-gradient(to bottom, ${prevColor} 0, ${prevColor} 50%, ${thisColor} 50%, ${thisColor} 100%)`)
    return <td key={key} style={{ ...baseStyle, padding: 0, borderBottom: 'none', background }} />
}

// halfCellText列のtdを描画する。
// 表示するテキストは当該行自身の値を1つだけ表示する（2つ並べて表示はしない）。
// ひとつ前の行の値は、境界線を表示するかどうかの判定にのみ内部的に使用する。
// 子要素をposition: absolute; top: 50%; height: 100%で配置することで、当該行の縦方向中央
// から次行の縦方向中央まで（= 半セルずれたセル）を占める領域を作り、その中をflexで中央揃え
// することで、tdの高さが行の高さから暗黙的に決まる場合でも値が1つだけ確実にその中央に表示される。
function renderHalfCellTextTd<T>(getText: (row: T) => string, data: T, prevData: T | undefined, key: number, baseStyle: React.CSSProperties, border: 'auto' | 'always' | 'never' | undefined, isSelected: boolean) {
    const prevText = prevData ? getText(prevData) : ''
    const thisText = getText(data)
    const showBorder = shouldShowHalfCellBorder(border, prevText !== thisText)
    return (
        <td key={key} style={{
            ...baseStyle,
            position: 'relative',
            padding: 0,
            // 半セルずれていない通常の行境界線は表示しない（境界線は半セルの境界にのみ描画する）
            borderBottom: 'none',
            // 未選択時は透明にし、次行からオーバーフローしてくる要素（＝次行自身のテキスト）が
            // 隠れないようにする。選択中の行は tr.selected のハイライト色が透過して見えないよう
            // 不透明にする（この場合、前行からオーバーフローしてきたテキストの下側は隠れるが、
            // 選択時の一時的な見た目として許容する）
            backgroundColor: isSelected ? 'var(--bg-base)' : 'transparent',
        }}>
            <div style={{
                position: 'absolute', top: '50%', left: 0, right: 0, height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderTop: showBorder ? '1px solid var(--border)' : undefined,
            }}>{thisText}</div>
        </td>
    )
}

// 汎用テーブルコンポーネント。
// テーブルの描画と行選択ハイライトのみを担当し、
// 追加・削除・編集などの操作は各呼び出し元が引き続き担当する。
function GenericItemList<T,>({
    columns,
    rows,
    selectedKeys,
    onRowClick,
    tableId,
    containerId,
    rangeStartKey,
}: GenericItemListProps<T>) {
    // defaultCollapsed: true の列を初期折りたたみ状態にする
    const [collapsedCols, setCollapsedCols] = useState<Set<number>>(
        () => new Set(columns.flatMap((col, i) => col.defaultCollapsed ? [i] : []))
    )

    const collapseCol = (i: number) => setCollapsedCols(prev => new Set([...prev, i]))
    const expandCol   = (i: number) => setCollapsedCols(prev => { const s = new Set(prev); s.delete(i); return s })

    return (
        <div id={containerId}>
            <table id={tableId}>
                <thead>
                    <tr>
                        {columns.map((col, i) => {
                            const isCollapsed = collapsedCols.has(i)
                            // 折りたたみ中: 縦書き帯として表示し、クリックで展開する
                            if (col.collapsible && isCollapsed) {
                                return (
                                    <th
                                        key={i}
                                        onClick={() => expandCol(i)}
                                        title="クリックして展開"
                                        style={{ writingMode: 'vertical-rl', cursor: 'pointer', padding: '4px 2px', whiteSpace: 'nowrap', userSelect: 'none' }}
                                    >
                                        ▶ {col.header}
                                    </th>
                                )
                            }
                            // 通常表示: セル全体クリックで折りたたみ、× はビジュアルインジケーター
                            return (
                                <th
                                    key={i}
                                    onClick={col.collapsible ? () => collapseCol(i) : undefined}
                                    title={col.collapsible ? '列を折りたたむ' : undefined}
                                    style={col.collapsible ? { cursor: 'pointer', userSelect: 'none' } : undefined}
                                >
                                    {col.header}
                                    {col.collapsible && (
                                        <span style={{ marginLeft: '4px', fontSize: '10px', verticalAlign: 'middle' }}>×</span>
                                    )}
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ key, data }, rowIndex) => (
                        <tr key={key} className={selectedKeys.includes(key) ? 'selected' : ''}>
                            {columns.map((col, i) => {
                                const isCollapsed = collapsedCols.has(i)
                                // 折りたたみ中の列: 幅ゼロの空セルを描画する
                                if (col.collapsible && isCollapsed) {
                                    return <td key={i} style={{ width: 0, padding: 0, overflow: 'hidden' }} />
                                }
                                // ひとつ前の行のデータ（半セルずれ列で使用。先頭行には存在しない）
                                const prevData = rowIndex > 0 ? rows[rowIndex - 1].data : undefined
                                if (col.halfCellColor) {
                                    return renderHalfCellColorTd(col.halfCellColor, data, prevData, i, col.cellStyle ? col.cellStyle(data, key) : {}, col.halfCellBorder)
                                }
                                if (col.halfCellText) {
                                    return renderHalfCellTextTd(col.halfCellText, data, prevData, i, col.cellStyle ? col.cellStyle(data, key) : {}, col.halfCellBorder, selectedKeys.includes(key))
                                }
                                return col.isSelector ? (
                                    // isSelector: true の列は <th> として描画し、クリックで onRowClick を呼ぶ
                                    // range-start は選択可能セルのみに付与する（行全体には付与しない）
                                    <th
                                        key={i}
                                        className={key === rangeStartKey ? 'range-start' : selectedKeys.includes(key) ? 'selected' : ''}
                                        onClick={() => onRowClick(key)}
                                    >
                                        {col.cell(data, key)}
                                    </th>
                                ) : (
                                    // 通常列は <td> として描画。cellStyle が指定されている場合はセル自体に適用する。
                                    <td
                                        key={i}
                                        style={col.cellStyle ? col.cellStyle(data, key) : undefined}
                                    >
                                        {col.cell(data, key)}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default GenericItemList
