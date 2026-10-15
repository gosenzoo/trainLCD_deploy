"use client"

import React, { useState } from 'react'

// カラム定義型。各コンポーネントがテーブルの列構成をこの型で宣言する。
export type ColumnDef<T> = {
    // ヘッダーセルに表示する内容（文字列、または <br/> を含むJSXなど）
    header: React.ReactNode
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
    // セルクリック時のコールバック（isSelector以外の列で使用可能。halfCellColor・halfCellText列でも使用できる）
    onClick?: (row: T, key: string, event: React.MouseEvent<HTMLElement>) => void
}

// カラムグループ定義。複数のColumnDefを1つの折りたたみ可能な見出しの下にまとめる場合に使う
// （例: 「駅名かな」「駅名英語」を「駅名多言語」という1つの見出しの下にまとめる）。
// 子カラム自体には collapsible・defaultCollapsed を設定しない（個別の折りたたみは行わない）。
export type ColumnGroup<T> = {
    // グループ見出し（ヘッダー1行目にcolSpanで表示）
    groupHeader: React.ReactNode
    // true のときグループ見出しクリックで子列をまとめて折りたたみ可能にする
    collapsible?: boolean
    // true のとき初期状態で折りたたまれた状態にする（collapsible と併用）
    defaultCollapsed?: boolean
    // グループに含める子カラム定義
    columns: ColumnDef<T>[]
}

// colがColumnGroupかどうかを判定する（ColumnDefにはcolumnsフィールドがないため、その有無で判定する）
function isColumnGroup<T>(col: ColumnDef<T> | ColumnGroup<T>): col is ColumnGroup<T> {
    return 'columns' in col
}

// GenericItemList が受け取る Props
type GenericItemListProps<T> = {
    // 列定義の配列（ColumnGroupを混在させて折りたたみ可能なグループ見出しを作れる）
    columns: (ColumnDef<T> | ColumnGroup<T>)[]
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
function renderHalfCellColorTd<T>(getColor: (row: T) => string | undefined, data: T, prevData: T | undefined, key: React.Key, baseStyle: React.CSSProperties, border: 'auto' | 'always' | 'never' | undefined, onClick: ((e: React.MouseEvent<HTMLElement>) => void) | undefined) {
    const prevColor = (prevData ? getColor(prevData) : undefined) || 'var(--bg-base)'
    const thisColor = getColor(data) || 'var(--bg-base)'
    const background = shouldShowHalfCellBorder(border, prevColor !== thisColor)
        ? `linear-gradient(to bottom, ${prevColor} 0, ${prevColor} calc(50% - 0.5px), var(--border) calc(50% - 0.5px), var(--border) calc(50% + 0.5px), ${thisColor} calc(50% + 0.5px), ${thisColor} 100%)`
        : (prevColor === thisColor ? prevColor : `linear-gradient(to bottom, ${prevColor} 0, ${prevColor} 50%, ${thisColor} 50%, ${thisColor} 100%)`)
    return <td key={key} onClick={onClick} style={{ ...baseStyle, padding: 0, borderBottom: 'none', background, cursor: onClick ? 'pointer' : undefined }} />
}

// halfCellText列のtdを描画する。
// 表示するテキストは当該行自身の値を1つだけ表示する（2つ並べて表示はしない）。
// ひとつ前の行の値は、境界線を表示するかどうかの判定にのみ内部的に使用する。
// 子要素をposition: absolute; top: 50%; height: 100%で配置することで、当該行の縦方向中央
// から次行の縦方向中央まで（= 半セルずれたセル）を占める領域を作り、その中をflexで中央揃え
// することで、tdの高さが行の高さから暗黙的に決まる場合でも値が1つだけ確実にその中央に表示される。
function renderHalfCellTextTd<T>(getText: (row: T) => string, data: T, prevData: T | undefined, key: React.Key, baseStyle: React.CSSProperties, border: 'auto' | 'always' | 'never' | undefined, isSelected: boolean, onClick: ((e: React.MouseEvent<HTMLElement>) => void) | undefined) {
    const prevText = prevData ? getText(prevData) : ''
    const thisText = getText(data)
    const showBorder = shouldShowHalfCellBorder(border, prevText !== thisText)
    return (
        <td key={key} onClick={onClick} style={{
            ...baseStyle,
            position: 'relative',
            padding: 0,
            cursor: onClick ? 'pointer' : undefined,
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

// ColumnGroupを含むテーブルでの、ヘッダー2行分の固定高さ（おおよそ「4文字分」の概算値）と、
// その半分（1行あたり）の高さ。rowSpan={2}のセルの高さ配分はブラウザ依存で不安定なため
// （Chrome実機計測で、全列がrowSpanのみに頼る状態だと1行目が0pxになることを確認済み）、
// 入れ子でない通常列は1行目・2行目それぞれに直接height指定したセルを持つようにする
// （詳細は各セルのレンダリング箇所のコメントを参照）。
const GROUPED_HEADER_HEIGHT = '4.4em'
const GROUPED_HEADER_ROW_HEIGHT = '2.2em'

// position: absoluteの子要素は<th>自身の幅サイジングに寄与しない（本文側が空のテーブルでは
// 列が幅ゼロに潰れてしまう）。当初は見た目に影響しない非表示テキスト（幅確保用スペーサー）を
// display: inline-blockで通常のフローに追加する方式を試みたが、Chrome実機で計測したところ、
// インライン要素はmax-height: 0を効かせても、フォントメトリクスに基づく行の高さ（いわゆるstrut）が
// ヘッダー1行目にだけ残ってしまい、1行目が2行目より高くなる問題が解消できなかった。
// そこで一旦は固定のmin-widthのみを指定する方式に変更したが、見出しテキストが長い列で
// 幅が足りずテキストが列からはみ出す不具合が新たに発生した。
// 最終的に、幅確保用スペーサーをdisplay: blockで描画する方式にした。ブロックレベルボックスは
// インライン行ボックスに一切参加しないためstrutが発生せず、height: 0 + overflow: hiddenで
// 縦方向の占有スペースを確実にゼロにできる。white-space: nowrapにより、実際の見出しテキストの
// 自然な幅がそのまま<th>自身の幅サイジングに反映されるため、テキストの長さに関わらずはみ出さない
const widthSpacerStyle: React.CSSProperties = {
    visibility: 'hidden',
    display: 'block',
    whiteSpace: 'nowrap',
    height: 0,
    overflow: 'hidden',
    padding: '0 12px',
}

// 本文側・スペーサー側のどちらも幅を決定できない「データが空のテーブル」に対する保険として、
// 最低限の幅を確保しておく（widthSpacerStyleと併用）
const nestedHeaderCellStyle: React.CSSProperties = { minWidth: '4em' }

// 折りたたみ中の縦書き見出し（writing-mode: vertical-rl）のスタイル
const collapsedHeaderStyle: React.CSSProperties = {
    writingMode: 'vertical-rl', cursor: 'pointer', padding: '4px 2px', userSelect: 'none',
}

// 折りたたみ時の縦書き見出しラベルを描画する。▶を含めて3文字ごとに改行（<br/>）を入れることで、
// 見出しの文字数に関わらず常に「3文字分の高さ」に収まるようにする（自動折り返しに頼らない）。
// labelが文字列でない場合は改行できないため、▶を先頭に付けてそのまま表示する
function renderCollapsedLabel(label: React.ReactNode): React.ReactNode {
    if (typeof label !== 'string') return <>▶ {label}</>
    const text = '▶' + label
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += 3) chunks.push(text.slice(i, i + 3))
    return chunks.map((chunk, i) => (
        <React.Fragment key={i}>
            {i > 0 && <br/>}
            {chunk}
        </React.Fragment>
    ))
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
    // defaultCollapsed: true の列・グループを初期折りたたみ状態にする（トップレベルのインデックスで管理）
    const [collapsedCols, setCollapsedCols] = useState<Set<number>>(
        () => new Set(columns.flatMap((col, i) => col.defaultCollapsed ? [i] : []))
    )

    const collapseCol = (i: number) => setCollapsedCols(prev => new Set([...prev, i]))
    const expandCol   = (i: number) => setCollapsedCols(prev => { const s = new Set(prev); s.delete(i); return s })

    // 1つの通常カラムの本文セル（<td>/<th>）を描画する。トップレベルの列・グループの子列どちらからも呼ばれる。
    // isCollapsed は呼び出し元が判定して渡す（子列は個別折りたたみがないため常にfalse）
    const renderBodyCell = (col: ColumnDef<T>, data: T, key: string, rowIndex: number, cellKey: React.Key, isCollapsed: boolean) => {
        if (col.collapsible && isCollapsed) {
            return <td key={cellKey} style={{ width: 0, padding: 0, overflow: 'hidden' }} />
        }
        // ひとつ前の行のデータ（半セルずれ列で使用。先頭行には存在しない）
        const prevData = rowIndex > 0 ? rows[rowIndex - 1].data : undefined
        const handleCellClick = col.onClick
            ? (e: React.MouseEvent<HTMLElement>) => col.onClick!(data, key, e)
            : undefined
        if (col.halfCellColor) {
            return renderHalfCellColorTd(col.halfCellColor, data, prevData, cellKey, col.cellStyle ? col.cellStyle(data, key) : {}, col.halfCellBorder, handleCellClick)
        }
        if (col.halfCellText) {
            return renderHalfCellTextTd(col.halfCellText, data, prevData, cellKey, col.cellStyle ? col.cellStyle(data, key) : {}, col.halfCellBorder, selectedKeys.includes(key), handleCellClick)
        }
        return col.isSelector ? (
            // isSelector: true の列は <th> として描画し、クリックで onRowClick を呼ぶ
            // range-start は選択可能セルのみに付与する（行全体には付与しない）
            <th
                key={cellKey}
                className={key === rangeStartKey ? 'range-start' : selectedKeys.includes(key) ? 'selected' : ''}
                onClick={() => onRowClick(key)}
            >
                {col.cell(data, key)}
            </th>
        ) : (
            // 通常列は <td> として描画。cellStyle が指定されている場合はセル自体に適用する。
            <td
                key={cellKey}
                onClick={handleCellClick}
                style={{ ...(col.cellStyle ? col.cellStyle(data, key) : undefined), cursor: handleCellClick ? 'pointer' : undefined }}
            >
                {col.cell(data, key)}
            </td>
        )
    }

    // グループが1つでもあるかどうか。ある場合のみヘッダーを2行構成にする（ない場合は従来通り1行のみ）
    const hasGroups = columns.some(isColumnGroup)

    return (
        <div id={containerId}>
            <table id={tableId}>
                <thead>
                    <tr>
                        {columns.map((col, i) => {
                            const isCollapsed = collapsedCols.has(i)
                            if (isColumnGroup(col)) {
                                // グループが折りたたまれている場合: 単一列の折りたたみと同じ縦書き表示にする（入れ子構造のため、
                                // 下記の通常列とは異なり分割線が入ることがある）。rowSpanで2行分の高さをまるごと占める
                                if (col.collapsible && isCollapsed) {
                                    return (
                                        <th
                                            key={i}
                                            rowSpan={hasGroups ? 2 : undefined}
                                            onClick={() => expandCol(i)}
                                            title="クリックして展開"
                                            style={{ ...collapsedHeaderStyle, height: hasGroups ? GROUPED_HEADER_HEIGHT : undefined }}
                                        >
                                            {renderCollapsedLabel(col.groupHeader)}
                                        </th>
                                    )
                                }
                                // 展開中: 子カラムの数だけcolSpanで横に広げる（1行目のみ、2行目に子カラムの見出しを並べる）。
                                // 文字を通常のフロー（padding込み）で描画すると自然な高さがGROUPED_HEADER_ROW_HEIGHTを
                                // 超えてしまい、折りたたみ時とヘッダーの高さが揃わなくなる。入れ子でない列と同様、
                                // position: absoluteの中央揃えdivに文字を入れて自然な高さへの影響をなくす
                                return (
                                    <th
                                        key={i}
                                        colSpan={col.columns.length}
                                        onClick={col.collapsible ? () => collapseCol(i) : undefined}
                                        title={col.collapsible ? '列を折りたたむ' : undefined}
                                        style={{
                                            ...nestedHeaderCellStyle,
                                            position: 'relative', padding: 0, height: GROUPED_HEADER_ROW_HEIGHT,
                                            ...(col.collapsible ? { cursor: 'pointer', userSelect: 'none' } : {}),
                                        }}
                                    >
                                        <div style={widthSpacerStyle}>
                                            {col.groupHeader}
                                            {col.collapsible && <>×</>}
                                        </div>
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, right: 0, height: GROUPED_HEADER_ROW_HEIGHT,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {col.groupHeader}
                                            {col.collapsible && (
                                                <span style={{ marginLeft: '4px', fontSize: '10px', verticalAlign: 'middle' }}>×</span>
                                            )}
                                        </div>
                                    </th>
                                )
                            }
                            // 折りたたみ中: 縦書き帯として表示し、クリックで展開する。他の列が2行とも直接の
                            // セルでGROUPED_HEADER_ROW_HEIGHTを確保しているため、rowSpanでも安定して
                            // 2行分（GROUPED_HEADER_HEIGHT）の高さになる
                            if (col.collapsible && isCollapsed) {
                                return (
                                    <th
                                        key={i}
                                        rowSpan={hasGroups ? 2 : undefined}
                                        onClick={() => expandCol(i)}
                                        title="クリックして展開"
                                        style={{ ...collapsedHeaderStyle, height: hasGroups ? GROUPED_HEADER_HEIGHT : undefined }}
                                    >
                                        {renderCollapsedLabel(col.header)}
                                    </th>
                                )
                            }
                            if (!hasGroups) {
                                // グループを含まないテーブル: 従来通り1行のみのヘッダー
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
                            }
                            // 入れ子でない通常列（グループを含むテーブル、折りたたまれていない状態）:
                            // rowSpanには頼らず、1行目に直接height指定したセルを描画する（2行目は後述のmapで
                            // 透明なプレースホルダーを描画する）。1行目のセル内に2行分の高さを持つ絶対配置の
                            // divを重ね、flexで縦中央揃えすることで、分割線なしでヘッダー全体の高さの中央に
                            // テキストを配置する（border-bottomは2行目との間の分割線を消すためnoneにする）
                            return (
                                <th
                                    key={i}
                                    onClick={col.collapsible ? () => collapseCol(i) : undefined}
                                    title={col.collapsible ? '列を折りたたむ' : undefined}
                                    style={{
                                        ...nestedHeaderCellStyle,
                                        position: 'relative',
                                        padding: 0,
                                        height: GROUPED_HEADER_ROW_HEIGHT,
                                        borderBottom: 'none',
                                        ...(col.collapsible ? { cursor: 'pointer', userSelect: 'none' } : {}),
                                    }}
                                >
                                    <div style={widthSpacerStyle}>
                                        {col.header}
                                        {col.collapsible && <>×</>}
                                    </div>
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, height: GROUPED_HEADER_HEIGHT,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: 'var(--bg-overlay)',
                                    }}>
                                        {col.header}
                                        {col.collapsible && (
                                            <span style={{ marginLeft: '4px', fontSize: '10px', verticalAlign: 'middle' }}>×</span>
                                        )}
                                    </div>
                                </th>
                            )
                        })}
                    </tr>
                    {/* グループが1つもない場合は2行目自体を描画しない（グループ機能を使わないテーブルの見た目は変えない） */}
                    {hasGroups && (
                        <tr>
                            {columns.map((col, i) => {
                                const isCollapsed = collapsedCols.has(i)
                                // 折りたたみ中の列・グループ: 1行目でrowSpan済みのため何も描画しない
                                if (col.collapsible && isCollapsed) return null
                                if (isColumnGroup(col)) {
                                    // 展開中のグループ: 子カラムの見出しを並べる。1行目と同じ理由で、
                                    // position: absoluteの中央揃えdivに文字を入れて自然な高さへの影響をなくす
                                    return col.columns.map((child, j) => (
                                        <th key={`${i}-${j}`} style={{ ...nestedHeaderCellStyle, position: 'relative', padding: 0, height: GROUPED_HEADER_ROW_HEIGHT }}>
                                            <div style={widthSpacerStyle}>{child.header}</div>
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, height: GROUPED_HEADER_ROW_HEIGHT,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {child.header}
                                            </div>
                                        </th>
                                    ))
                                }
                                // 入れ子でない通常列: 1行目からオーバーフローしてきたテキストが隠れないよう
                                // 背景を透明にした、見えないプレースホルダー（高さ確保専用）。
                                // このセルがヘッダーの実際の最下段にあたるため、border-bottomは上書きせず
                                // 他の列・グループと同様にCSS側のデフォルトの境界線をそのまま表示する
                                return (
                                    <th key={i} style={{ height: GROUPED_HEADER_ROW_HEIGHT, padding: 0, background: 'transparent' }} />
                                )
                            })}
                        </tr>
                    )}
                </thead>
                <tbody>
                    {rows.map(({ key, data }, rowIndex) => (
                        <tr key={key} className={selectedKeys.includes(key) ? 'selected' : ''}>
                            {columns.map((col, i) => {
                                if (isColumnGroup(col)) {
                                    const isCollapsed = collapsedCols.has(i)
                                    // グループが折りたたまれている場合: 幅ゼロの空セル1つに置き換える
                                    if (col.collapsible && isCollapsed) {
                                        return <td key={i} style={{ width: 0, padding: 0, overflow: 'hidden' }} />
                                    }
                                    // 展開中: 子カラムをそれぞれ通常のセルとして描画する（個別の折りたたみはない）
                                    return col.columns.map((child, j) => renderBodyCell(child, data, key, rowIndex, `${i}-${j}`, false))
                                }
                                return renderBodyCell(col, data, key, rowIndex, i, collapsedCols.has(i))
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default GenericItemList
