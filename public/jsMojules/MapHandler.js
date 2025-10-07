function getObjByRectEL(areaEl){
    const areaParams = {
        x: parseFloat(areaEl.getAttribute("x")),
        y: parseFloat(areaEl.getAttribute("y")),
        width: parseFloat(areaEl.getAttribute("width")),
        height: parseFloat(areaEl.getAttribute("height")),
        styleJson: JSON.parse(areaEl.getAttribute("data-style")),
        lang: areaEl.getAttribute("lang"),
        axis: areaEl.getAttribute("axis"),
        spacing: parseFloat(areaEl.getAttribute("spacing")),
        base: areaEl.getAttribute("base")
    };
    return areaParams;
}