"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Role } from "@/lib/types";

// 畫面上只有頭像和 6 位數密碼；這裡把頭像對應到固定的 email，用 Supabase 的 email + 密碼登入。
// email 放在只有伺服器讀得到的環境變數，不會出現在瀏覽器裡。
const EMAILS: Record<Role, string | undefined> = {
  neko: process.env.NEKO_EMAIL,
  nezumi: process.env.NEZUMI_EMAIL,
};

export async function signIn(role: Role, pin: string): Promise<{ error?: string }> {
  if (role !== "neko" && role !== "nezumi") return { error: "選一個頭像" };
  if (!/^\d{6}$/.test(pin)) return { error: "密碼是 6 位數字" };

  const email = EMAILS[role];
  if (!isSupabaseConfigured || !email) return { error: "還沒設定 Supabase（看 .env.example）" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: pin });
  if (error) {
    if (error.status === 429) return { error: "試太多次了，過幾分鐘再試" };
    if (error.status === 400) return { error: "密碼不對" };
    return { error: `登入失敗：${error.message}` };
  }
  return {};
}
