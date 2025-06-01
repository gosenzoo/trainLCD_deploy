import { measureCapHeight } from '../modules/measureCapHeight';

export function presetIconMaker(
  svgDoc: Document,
  color: string,
  drawText: string
): Document {
  const lineColorElem = svgDoc.getElementById("lineColor");
  if (lineColorElem) {
    (lineColorElem as HTMLElement).setAttribute("fill", color);
  }

  const symbolRect = svgDoc.getElementById("symbolArea") as SVGRectElement | null;
  if (!symbolRect) return svgDoc;

  const x = parseFloat(symbolRect.getAttribute("x") || "0");
  const y = parseFloat(symbolRect.getAttribute("y") || "0");
  const width = parseFloat(symbolRect.getAttribute("width") || "0");
  const height = parseFloat(symbolRect.getAttribute("height") || "0");

  const textElem = svgDoc.createElementNS("http://www.w3.org/2000/svg", "text");

  const capHeightRatio = measureCapHeight("Overused Grotesk, sans-serif");
  if (capHeightRatio === null) {
    console.error("キャップハイトの測定に失敗しました");
    return svgDoc; // キャップハイトの測定に失敗した場合はそのまま返す
  }
  const fontSize = height / capHeightRatio;
  console.log(capHeightRatio);

  textElem.textContent = drawText;
  textElem.setAttribute("x", String(x + width / 2));
  textElem.setAttribute("y", String(y + height));
  textElem.setAttribute("fill", "black");
  textElem.setAttribute("font-family", "Overused Grotesk, sans-serif");
  textElem.setAttribute("font-size", fontSize.toString());
  textElem.setAttribute("font-weight", "600");
  textElem.setAttribute("text-anchor", "middle");
  textElem.setAttribute("dominant-baseline", "alphabetic");

  svgDoc.documentElement.appendChild(textElem);
  symbolRect.remove();

  return svgDoc;
}
