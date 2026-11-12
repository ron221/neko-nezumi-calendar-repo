/** 把 #RRGGBB 和白色（紙色）混在一起，得到不透明的淡色（amount 超過 1 會比原色更深）。比半透明穩定，疊在哪裡都一樣 */
export function tint(hex: string, amount: number, base = "#fffcf7") {
  const a = parse(hex);
  const b = parse(base);
  const mix = a.map((v, i) => Math.min(255, Math.max(0, Math.round(b[i] + (v - b[i]) * amount))));
  return `rgb(${mix.join(" ")})`;
}

function parse(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
