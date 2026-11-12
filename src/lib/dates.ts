// 日期都用手機的當地時間（兩個人都在台灣）。一週從星期日開始。

export const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function startOfWeek(d: Date) {
  return addDays(startOfDay(d), -d.getDay());
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 月曆要顯示的所有日子：從第一週的星期日到最後一週的星期六（5 或 6 週） */
export function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = startOfWeek(first);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const end = addDays(startOfWeek(last), 7);
  const days: Date[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "2026-11-12"（當地時間），給 <input type="date"> 用 */
export function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "09:30"，給 <input type="time"> 用 */
export function timeKey(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromKeys(date: string, time = "00:00") {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDay(d: Date) {
  return `${d.getMonth() + 1}月${d.getDate()}日 週${WEEKDAYS[d.getDay()]}`;
}

/** 這個行程有沒有落在這一天 */
export function overlapsDay(startIso: string, endIso: string, day: Date) {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  const ds = startOfDay(day).getTime();
  const de = addDays(startOfDay(day), 1).getTime();
  if (e <= s) return s >= ds && s < de; // 沒有長度的行程
  return s < de && e > ds;
}
