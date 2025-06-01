export function measureCapHeight(fontFamily: string): number | null {
    // Canvas 要素を作成（DOMに追加しない）
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const fontSize = 100; // 比率を安定させるために大きめ
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillText('H', 50, 50);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let top: number | null = null;
    let bottom: number | null = null;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const alpha = data[idx + 3];
            if (alpha > 0) {
                if (top === null) top = y;
                bottom = y;
                break; // この行で1ピクセルでも描画されていればそのyを記録
            }
        }
    }

    // console.log(`Top: ${top}, Bottom: ${bottom}`);

    if (top !== null && bottom !== null) {
        return (bottom - top + 1) / fontSize;
    }

    return null; // 何も描画されていなかった場合
}
