import { addDays, dateKey, startOfDay } from "./dates";
import type { CalEvent } from "./types";

/** 畫面上的一筆：一般行程，或每週重複行程的其中一次 */
export type Occurrence = CalEvent & {
  seriesId?: string; // 每週重複的本體 id
  occurrenceDate?: string; // 這一次的日期 "2026-11-16"
};

/** 把每週重複的行程展開成 [start, end) 期間裡的每一次 */
export function expand(events: CalEvent[], start: Date, end: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const e of events) {
    if (e.repeat !== "weekly") {
      out.push(e);
      continue;
    }
    const s0 = new Date(e.start_at);
    const length = new Date(e.end_at).getTime() - s0.getTime();
    const until = e.repeat_until ? addDays(startOfDay(new Date(`${e.repeat_until}T00:00:00`)), 1) : null;
    const skip = new Set(e.skip_dates ?? []);
    // 從 start 前一週那次開始算（跨天的行程可能從前一週延伸過來）
    const weeks = Math.max(0, Math.floor((start.getTime() - s0.getTime()) / (7 * 864e5)) - 1);
    for (let k = weeks; ; k++) {
      const s = addDays(s0, 7 * k);
      if (s >= end || (until && s >= until)) break;
      const e1 = new Date(s.getTime() + length);
      if (e1 < start) continue;
      const date = dateKey(s);
      if (skip.has(date)) continue;
      out.push({ ...e, id: `${e.id}@${date}`, start_at: s.toISOString(), end_at: e1.toISOString(), seriesId: e.id, occurrenceDate: date });
    }
  }
  return out;
}
