// 用存下來的班表頁測試解析：node --experimental-strip-types scripts/test-shifts.mjs <班表.html>
import { readFileSync } from "node:fs";
import { parseShiftPage } from "../src/lib/shifts/parse.ts";
import { shiftToEvent } from "../src/lib/shifts/to-event.ts";

const file = process.argv[2];
if (!file) throw new Error("給我一個班表 .html 檔");
const shifts = parseShiftPage(readFileSync(file, "utf8"));
for (const s of shifts) {
  const e = shiftToEvent(s, "profile-id");
  console.log(s.date, "│", e.title.padEnd(8), "│", e.all_day ? "全天" : `${e.start_at} → ${e.end_at}`, e.note ? `│ ${e.note}` : "");
}
console.log(`共 ${shifts.length} 天：上班 ${shifts.filter((s) => s.kind === "work").length}、休 ${shifts.filter((s) => s.kind === "off").length}`);
