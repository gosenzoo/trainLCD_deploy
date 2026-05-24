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
                    {rows.map(({ key, data }) => (
                        <tr key={key} className={selectedKeys.includes(key) ? 'selected' : ''}>
                            {columns.map((col, i) => {
                                const isCollapsed = collapsedCols.has(i)
                                // 折りたたみ中の列: 幅ゼロの空セルを描画する
                                if (col.collapsible && isCollapsed) {
                                    return <td key={i} style={{ width: 0, padding: 0, overflow: 'hidden' }} />
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
