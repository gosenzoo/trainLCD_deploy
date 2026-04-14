"use client"

import React, { useState } from 'react'

type AccordionSectionProps = {
    title: string
    children: React.ReactNode
}

// 見出しクリックで本体を開閉するアコーディオンセクション
const AccordionSection: React.FC<AccordionSectionProps> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(true)

    return (
        <div className="editor-section">
            {/* クリックで開閉をトグルする見出し行 */}
            <div
                className={`section-header${isOpen ? '' : ' section-header--closed'}`}
                onClick={() => setIsOpen(v => !v)}
            >
                <span className="section-header-title">{title}</span>
                <span className="section-header-arrow">{isOpen ? '▼' : '▶'}</span>
            </div>
            {/* isOpen が false のとき本体を非表示にする */}
            {isOpen && (
                <div className="section-body">
                    {children}
                </div>
            )}
        </div>
    )
}

export default AccordionSection
