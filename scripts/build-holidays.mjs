// 產生台灣國定假日資料 src/lib/holidays.json
// 來源：行政院人事行政總處「政府行政機關辦公日曆表」，用 ruyut/TaiwanCalendar 整理好的 JSON
// 執行：npm run holidays:build -- 2026 2027（每年 6 月左右會公布隔年的）
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = "src/lib/holidays.json";
const years = process.argv.slice(2).length ? process.argv.slice(2) : [String(new Date().getFullYear()), String(new Date().getFullYear() + 1)];

// 月曆小格子很窄，長的名字用簡稱；清單裡顯示全名
const SHORT = {
  開國紀念日: "元旦",
  和平紀念日: "228",
  "孔子誕辰紀念日/教師節": "教師節",
  臺灣光復暨金門古寧頭大捷紀念日: "光復節",
  行憲紀念日: "行憲",
  農曆除夕: "除夕",
};

const all = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
for (const y of years) {
  const res = await fetch(`https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${y}.json`);
  if (!res.ok) {
    console.log(`✗ ${y}：還沒有資料（HTTP ${res.status}）`);
    continue;
  }
  const days = await res.json();
  for (const k of Object.keys(all)) if (k.startsWith(`${y}-`)) delete all[k];
  let n = 0;
  for (const d of days) {
    if (!d.description) continue; // 一般的週末不算
    const date = `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`;
    // off = true：放假；false：補班（要上班）
    all[date] = { name: d.description, short: SHORT[d.description] ?? d.description, off: Boolean(d.isHoliday) };
    n++;
  }
  console.log(`✓ ${y}：${n} 天`);
}
const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, JSON.stringify(sorted, null, 1) + "\n");
