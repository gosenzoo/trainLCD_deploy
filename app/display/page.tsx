'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

// 画面サイズにフィットさせる関数
const resizeCanvas = (displayDom:any) => {
    displayDom = displayDom.querySelector("#display")
    let originalWidth, originalHeight
    if (window.innerWidth < 1333 / 1000 * window.innerHeight){
        originalWidth = Math.floor(window.innerWidth);
        originalHeight = Math.floor(window.innerWidth * 1000 / 1333);
    }   
    else{
        originalWidth = Math.floor(window.innerHeight * 1333 / 1000);
        originalHeight = Math.floor(window.innerHeight);
    }
    displayDom.style.width = originalWidth;
    displayDom.style.height = originalHeight;
}

const drawDefaultLine = () => {

}

const Display = () => {
    // settingの取得
    const searchParams = useSearchParams()
    const setting_uri = searchParams.get('setting_uri')
    if(!setting_uri) { return <div>設定がありません</div> }
    const setting = JSON.parse(decodeURIComponent(setting_uri))

    const displayRef = useRef<HTMLDivElement>(null)

    const dispStationNum = 8
    let defaultLineParams = {
        leftStationX : 0,
        rightStationX : 0,
        lineCenterY : 0,
        lineWidth : 0,
        lineEndPolygons : [],
    }

    // 初回レンダリング時の初期化
    useEffect(() => {
        fetch(`/displaySvg/tokyu/defaultLine.svg`)
            .then(res => res.text())
            .then(data => {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(data, "image/svg+xml");
                const svgElement = svgDoc.documentElement;

                // 初期化してから追加
                const container = displayRef.current;
                if (container) {
                container.innerHTML = ""; // 一度クリア（重要）
                container.appendChild(svgElement);
                }

                resizeCanvas(displayRef.current)
            })
        
        window.addEventListener("resize", () => {resizeCanvas(displayRef.current)});
    }, [])

    return (
        <div ref={displayRef}>
            {/* <svg id="display" viewBox={`0 0 ${viewboxWidth} ${viewboxHeight}`}></svg> */}
        </div>
    )
}

export default Display