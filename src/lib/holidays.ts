import data from "./holidays.json";
import { dateKey } from "./dates";

// 台灣國定假日（含補假）。資料由 npm run holidays:build 產生，每年 6 月左右公布隔年的，記得更新
export type Holiday = { name: string; short: string; off: boolean };

const HOLIDAYS = data as Record<string, Holiday>;

export function holidayOn(d: Date): Holiday | undefined {
  return HOLIDAYS[dateKey(d)];
}
