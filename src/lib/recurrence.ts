import { addDays, dateKey, startOfDay } from "./dates";
import type { CalEvent } from "./types";

/** 畫面上的一筆：一般行程，或每週重複行程的其中一次 */
export type Occurrence = CalEvent & {
  seriesId?: string; // 重複行程的本體 id
  occurrenceDate?: string; // 這一次的日期 "2026-11-16"
};

/** 第 k 次的開始時間：每週加 7 天，每年加 1 年（同月同日、同時間） */
function nth(s0: Date, repeat: "weekly" | "yearly", k: number) {
  if (repeat === "weekly") return addDays(s0, 7 * k);
  return new Date(s0.getFullYear() + k, s0.getMonth(), s0.getDate(), s0.getHours(), s0.getMinutes());
}

/** 把重複的行程（每週、每年）展開成 [start, end) 期間裡的每一次 */
export function expand(events: CalEvent[], start: Date, end: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const e of events) {
    if (e.repeat !== "weekly" && e.repeat !== "yearly") {
      out.push(e);
      continue;
    }
    const s0 = new Date(e.start_at);
    const length = new Date(e.end_at).getTime() - s0.getTime();
    const until = e.repeat_until ? addDays(startOfDay(new Date(`${e.repeat_until}T00:00:00`)), 1) : null;
    const skip = new Set(e.skip_dates ?? []);
    // 從 start 前一次開始算（跨天的行程可能從前一次延伸過來）
    const first =
      e.repeat === "weekly"
        ? Math.max(0, Math.floor((start.getTime() - s0.getTime()) / (7 * 864e5)) - 1)
        : Math.max(0, start.getFullYear() - s0.getFullYear() - 1);
    for (let k = first; ; k++) {
      const s = nth(s0, e.repeat, k);
      if (s >= end || (until && s >= until)) break;
      const e1 = new Date(s.getTime() + length);
      if (e1 <= start && !(e1.getTime() === s.getTime() && s >= start)) continue;
      const date = dateKey(s);
      if (skip.has(date)) continue;
      out.push({ ...e, id: `${e.id}@${date}`, start_at: s.toISOString(), end_at: e1.toISOString(), seriesId: e.id, occurrenceDate: date });
    }
  }
  return out;
}
