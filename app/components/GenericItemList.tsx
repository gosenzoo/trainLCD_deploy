"use client"

import React from 'react'

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
}: GenericItemListProps<T>) {
    return (
        <div id={containerId}>
            <table id={tableId}>
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ key, data }) => (
                        <tr key={key}>
                            {columns.map((col, i) =>
                                // isSelector: true の列は <th> として描画し、クリックで onRowClick を呼ぶ
                                col.isSelector ? (
                                    <th
                                        key={i}
                                        className={selectedKeys.includes(key) ? 'selected' : ''}
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
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default GenericItemList
