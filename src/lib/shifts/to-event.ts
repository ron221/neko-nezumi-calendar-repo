import type { Shift } from "./parse.ts";

import { SHIFT_SOURCE } from "../types.ts";

export { SHIFT_SOURCE };

// 班表上的時間是台灣時間；伺服器在 UTC 跑，所以直接寫 +08:00
const TZ = "+08:00";

function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** 一天的班 → events 的一筆。source_key 用日期：同一天重排班會更新同一筆 */
export function shiftToEvent(s: Shift, createdBy: string) {
  const note = s.notes.length ? s.notes.join("\n") : null;
  const base = { source: SHIFT_SOURCE, source_key: s.date, created_by: createdBy, note };
  if (s.kind === "work") {
    const overnight = s.end <= s.start; // 例如 22:00~06:00
    return {
      ...base,
      title: "上班",
      all_day: false,
      location: s.branch ? `原岩 ${s.branch}` : null,
      start_at: `${s.date}T${s.start}:00${TZ}`,
      end_at: `${overnight ? nextDay(s.date) : s.date}T${s.end}:00${TZ}`,
    };
  }
  return {
    ...base,
    title: s.label,
    all_day: true,
    location: null,
    start_at: `${s.date}T00:00:00${TZ}`,
    end_at: `${nextDay(s.date)}T00:00:00${TZ}`,
  };
}
