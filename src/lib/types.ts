export type Role = "neko" | "nezumi";

export const ROLE_EMOJI: Record<Role, string> = { neko: "🐱", nezumi: "🐭" };
export const ROLE_NAME: Record<Role, string> = { neko: "貓", nezumi: "鼠" };
export const DEFAULT_COLOR: Record<Role, string> = { neko: "#F2994A", nezumi: "#6C9BD2" };

/** 設定裡可以選的顏色 */
export const COLOR_CHOICES = [
  "#F2994A", "#EB5757", "#E86FA5", "#9B6BD6",
  "#6C9BD2", "#2D9CDB", "#3FB58E", "#8A9A5B",
];

export type Profile = {
  id: string;
  role: Role;
  name: string;
  color: string;
};

export type CalEvent = {
  id: string;
  title: string;
  start_at: string; // ISO
  end_at: string; // ISO；全天行程是最後一天的隔天 00:00
  all_day: boolean;
  location: string | null;
  location_url?: string | null; // 地點的 Google 地圖連結
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  source?: string | null; // "tup-shift" = 從鼠的班表自動匯入；自己新增的是 null
  source_key?: string | null;
  repeat?: "weekly" | "yearly" | null; // 每週、每年重複
  repeat_until?: string | null; // "2027-03-31"（含這天），null = 一直重複
  skip_dates?: string[]; // 「只刪這一次」跳過的日期
  together?: boolean; // 貓鼠兩人一起的行程
};

export const SHIFT_SOURCE = "tup-shift";
export const isShift = (e: CalEvent) => e.source === SHIFT_SOURCE;

export type EventDraft = {
  id?: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  location_url: string | null;
  note: string | null;
  repeat: "weekly" | "yearly" | null;
  repeat_until: string | null;
  together: boolean;
};

/** 用過的地點（新增行程時的建議清單） */
export type Place = { name: string; url: string | null; count: number };

/** 地點在 Google 地圖上的網址：有貼連結就用連結，沒有就用名稱搜尋 */
export function mapUrl(location: string, url?: string | null) {
  return url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
