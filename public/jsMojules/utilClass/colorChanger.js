// CSS色文字列 → {r,g,b} に変換（ブラウザ前提）
function cssToRgb(color) {
  const el = document.createElement("span");
  el.style.color = color;
  document.body.appendChild(el);
  const cs = getComputedStyle(el).color; // "rgb(r, g, b)" or "rgba(r, g, b, a)"
  document.body.removeChild(el);

  const m = cs.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/i);
  if (!m) throw new Error("Unsupported color: " + color);
  return { r: +m[1], g: +m[2], b: +m[3] };
}

// ===== sRGB <-> OKLab/OKLCH 変換ユーティリティ =====

function srgbToLinear(u) {
  u /= 255;
  if (u <= 0.04045) return u / 12.92;
  return Math.pow((u + 0.055) / 1.055, 2.4);
}

function linearToSrgb(u) {
  const x = Math.max(0, Math.min(1, u));
  if (x <= 0.0031308) return Math.round(x * 12.92 * 255);
  return Math.round((1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255);
}

function rgbToOklab(rgb) {
  const R = srgbToLinear(rgb.r);
  const G = srgbToLinear(rgb.g);
  const B = srgbToLinear(rgb.b);

  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  return { L: L, a: a, b: b2 };
}

function oklabToRgb(lab) {
  const L = lab.L;
  const a = lab.a;
  const b = lab.b;

  const l_ = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m_ = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s_ = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);

  const R = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const G = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const B = 0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_;

  return {
    r: linearToSrgb(R),
    g: linearToSrgb(G),
    b: linearToSrgb(B)
  };
}

function oklabToOklch(lab) {
  const L = lab.L;
  const a = lab.a;
  const b = lab.b;
  const C = Math.hypot(a, b);
  const h = Math.atan2(b, a) * 180 / Math.PI; // -180..180
  const H = (h + 360) % 360;
  return { L: L, C: C, H: H };
}

function oklchToOklab(lch) {
  const L = lch.L;
  const C = lch.C;
  const H = lch.H;
  const hr = H * Math.PI / 180;
  return {
    L: L,
    a: C * Math.cos(hr),
    b: C * Math.sin(hr)
  };
}

// ===== メイン：色1の(H,C)と色2の(L)をOKLCHで合成 =====

function combineByOKLCH(color1, gray2) {
  const rgb1 = cssToRgb(color1);
  const rgb2 = cssToRgb(gray2);

  const lch1 = oklabToOklch(rgbToOklab(rgb1));
  const lch2 = oklabToOklch(rgbToOklab(rgb2)); // グレースケール側

  // 明るさLを gray2 から、色味(H,C)を color1 から取る
  var L = lch2.L;
  var C = lch1.C;
  var H = lch1.H;

  // 彩度が強すぎて飛ぶ場合は少し抑えると安全
  // C = Math.min(C, 0.37);

  var lab = oklchToOklab({ L: L, C: C, H: H });
  var rgb = oklabToRgb(lab);

  // sRGB範囲にクリップ
  rgb.r = Math.min(255, Math.max(0, rgb.r));
  rgb.g = Math.min(255, Math.max(0, rgb.g));
  rgb.b = Math.min(255, Math.max(0, rgb.b));

  var toHex = function (x) { return x.toString(16).padStart(2, "0"); };
  return "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
}

// 使い方例
// const result2 = combineByOKLCH("deeppink", "rgb(180,180,180)");
// console.log(result2);
