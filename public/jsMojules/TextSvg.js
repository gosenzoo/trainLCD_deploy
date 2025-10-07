class TextSVG{
    constructor(type){
        this.type = type;
        this.outerHtml = ``;
        this.attributes = "";
    }

    getAllText(){
        return `<${this.type} ${this.attributes}>${this.outerHtml}</${this.type}>`;
    }
    setInnerText(innerHtml){
        this.outerHtml += innerHtml;
    }

    setAttribute(key, value){
        this.attributes += `${key}="${value}" `;
    }

    startGroup(styleJson={}){
        let additionalText = this.styleProcess(styleJson);

        this.outerHtml += `<g${additionalText}>`;
    }

    setImage(src, x, y, width, height, styleJson={}){
        let additionalText = this.styleProcess(styleJson);

        this.outerHtml += `<image xlink:href="${src}" preserveAspectRatio="none" x="${x}" y="${y}" width="${width}" height="${height}"${additionalText}></image>`;
    }
    setRect(x, y, width, height, styleJson={}){
        let additionalText = this.styleProcess(styleJson);
        
        this.outerHtml += `<rect x="${x}" y="${y}" width="${width}" height="${height}"${additionalText}></rect>`;
    }
    setCircle(cx, cy, r, styleJson={}){
        let additionalText = this.styleProcess(styleJson);

        this.outerHtml += `<circle cx="${cx}" cy="${cy}" r="${r}"${additionalText}></circle>`;
    }
    setPolygon(points, styleJson={}){
        let additionalText = this.styleProcess(styleJson);
        
        this.outerHtml += `<polygon points="${points}"${additionalText}></polygon>`;
    }
    setText(x, y, text, styleJson){
        let additionalText = this.styleProcess(styleJson);

        this.outerHtml += `<text x="${x}" y="${y}"${additionalText}>${text}</text>`
    }

    displaySVG(element){
        element.innerHTML = this.outerHtml;
    }

    styleProcess(styleJson){
        let additionalText = "";

        if ("transform" in styleJson) {
            additionalText += ` transform="${styleJson.transform}"`;
            delete styleJson.transform;
        }
        if ("fill" in styleJson) {
            additionalText += ` fill="${styleJson.fill}"`;
            delete styleJson.fill;
        }
        if ("stroke" in styleJson) {
            additionalText += ` stroke="${styleJson.stroke}"`;
            delete styleJson.stroke;
        }
        if ("strokeWidth" in styleJson) {
            additionalText += ` stroke-width="${styleJson.strokeWidth}"`;
            delete styleJson.strokeWidth;
        }
        if ("xlen" in styleJson) {
            additionalText += ` transform="${styleJson.strokeWidth}"`;
            delete styleJson.xlen;
        }
        let styleText = "";
        for (let key in styleJson) {
            let keyCss = this.toSnake(key);
            styleText += `${keyCss}:${styleJson[key]};`
        }
        additionalText += ` style="${styleText}"`;

        return additionalText;
    }

    toSnake(str){
        return str.replace(/([A-Z])/g, (s) => {return '-' + s.charAt(0).toLowerCase();})
    }
}
