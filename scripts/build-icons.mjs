// 產生暫時的 App 圖示（使用者之後會給正式的）：米色底、橘色頁首的日曆，下面一橘一藍兩個點代表貓和鼠
// 執行：npm run icons:build
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#fbf7f0"/>
  <rect x="96" y="116" width="320" height="300" rx="44" fill="#ffffff" stroke="#ebe3d8" stroke-width="8"/>
  <path d="M96 160a44 44 0 0 1 44-44h232a44 44 0 0 1 44 44v40H96z" fill="#e07a3f"/>
  <rect x="170" y="86" width="22" height="64" rx="11" fill="#2f2a26"/>
  <rect x="320" y="86" width="22" height="64" rx="11" fill="#2f2a26"/>
  <circle cx="206" cy="306" r="44" fill="#F2994A"/>
  <circle cx="306" cy="306" r="44" fill="#6C9BD2"/>
</svg>`;

await mkdir("public/icons", { recursive: true });
const out = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/apple-touch-icon.png", 180],
  ["src/app/icon.png", 64],
];
for (const [file, size] of out) {
  await sharp(Buffer.from(svg(size))).png().toFile(file);
  console.log("✓", file);
}
