function getCanvasTextSize(textContent, fontSize, fontFamily) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = fontSize + ' ' + fontFamily;

    var width = context.measureText(textContent).width;
    return { width: width, height: parseInt(fontSize) };
}