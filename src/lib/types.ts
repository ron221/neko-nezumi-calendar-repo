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
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  source?: string | null; // "tup-shift" = 從鼠的班表自動匯入；自己新增的是 null
  source_key?: string | null;
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
  note: string | null;
};
