"use client";

import { createContext, use } from "react";
import { tint } from "@/lib/color";
import { ROLE_EMOJI, type CalEvent, type Profile } from "@/lib/types";

export const TOGETHER_EMOJI = "🐱🐭";
export const FALLBACK_COLOR = "#a89b8e";

/** 兩個人的 profile，給畫行程顏色和 emoji 用 */
export const ProfilesContext = createContext<Profile[]>([]);

export type Paint = {
  emoji: string; // 標題前面的 🐱、🐭 或 🐱🐭
  colors: string[]; // 一個人的行程一個顏色；兩人一起的是貓、鼠兩個顏色
  owner?: Profile;
};

/** 依照行程是誰的，決定 emoji 和顏色 */
export function usePaint() {
  const profiles = use(ProfilesContext);
  return (e: CalEvent): Paint => {
    const owner = profiles.find((p) => p.id === e.created_by);
    if (e.together) {
      const neko = profiles.find((p) => p.role === "neko");
      const nezumi = profiles.find((p) => p.role === "nezumi");
      return { emoji: TOGETHER_EMOJI, colors: [neko?.color ?? FALLBACK_COLOR, nezumi?.color ?? FALLBACK_COLOR], owner };
    }
    return { emoji: owner ? ROLE_EMOJI[owner.role] : "", colors: [owner?.color ?? FALLBACK_COLOR], owner };
  };
}

/** 顏色的背景：一個顏色就是純色，兩個顏色左右漸層。amount 是淡的程度（tint） */
export function fill(colors: string[], amount = 1) {
  const c = colors.map((x) => (amount === 1 ? x : tint(x, amount)));
  return c.length > 1 ? `linear-gradient(90deg, ${c[0]}, ${c[1]})` : c[0];
}
