import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { parseShiftPage } from "./parse.ts";
import { SHIFT_SOURCE, shiftToEvent } from "./to-event.ts";

// 鼠的班表同步：用 HR_USERNAME／HR_PASSWORD 登入班表網站，讀這個月和下個月，寫進 events。
// 只會登入、讀頁面（GET），不會在班表網站上按任何按鈕。
const BASE = "https://hr.tup.j91.me";
const UA = "Mozilla/5.0 (neko-nezumi-calendar shift sync)";

export type SyncResult = { months: string[]; added: number; updated: number; removed: number; unchanged: number };

/** 簡單的 cookie 罐：記住登入後的 session cookie */
class CookieJar {
  private map = new Map<string, string>();
  take(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const pair = c.split(";")[0];
      const i = pair.indexOf("=");
      if (i > 0) this.map.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  header() {
    return [...this.map].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function login(username: string, password: string) {
  const jar = new CookieJar();
  const page = await fetch(`${BASE}/user/login`, { headers: { "User-Agent": UA }, cache: "no-store" });
  jar.take(page);
  const html = await page.text();
  const formBuildId = html.match(/name="form_build_id" value="([^"]+)"/)?.[1];
  if (!formBuildId) throw new Error("班表網站的登入頁跟預期的不一樣（可能改版了）");

  const res = await fetch(`${BASE}/user/login`, {
    method: "POST",
    redirect: "manual",
    cache: "no-store",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jar.header(),
      Origin: BASE,
      Referer: `${BASE}/user/login`,
    },
    body: new URLSearchParams({
      name: username,
      pass: password,
      form_build_id: formBuildId,
      form_id: "user_login_form",
      op: "登入",
    }),
  });
  jar.take(res);
  // 登入成功會轉址到別的頁面；失敗會停在登入頁（200）
  const location = res.headers.get("location") ?? "";
  if (res.status < 300 || res.status >= 400 || location.includes("/user/login")) {
    throw new Error("登入班表網站失敗：帳號或密碼不對（HR_USERNAME／HR_PASSWORD）");
  }
  return jar;
}

async function fetchMonth(jar: CookieJar, month: string) {
  const res = await fetch(`${BASE}/shift?month=${month}`, {
    redirect: "manual",
    cache: "no-store",
    headers: { "User-Agent": UA, Cookie: jar.header() },
  });
  if (res.status !== 200) throw new Error(`讀不到 ${month} 的班表（HTTP ${res.status}）`);
  return res.text();
}

/** 台灣時間的這個月和下個月，"2026-11" */
function months() {
  const now = new Date(Date.now() + 8 * 3600_000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return [0, 1].map((k) => {
    const d = new Date(Date.UTC(y, m + k, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const FIELDS = ["title", "start_at", "end_at", "all_day", "location", "note"] as const;

function same(a: Record<string, unknown>, b: Record<string, unknown>) {
  return FIELDS.every((f) =>
    f.endsWith("_at") ? new Date(a[f] as string).getTime() === new Date(b[f] as string).getTime() : (a[f] ?? null) === (b[f] ?? null),
  );
}

export async function syncShifts(): Promise<SyncResult> {
  const { HR_USERNAME, HR_PASSWORD, SUPABASE_SECRET_KEY } = process.env;
  if (!HR_USERNAME || !HR_PASSWORD) throw new Error("還沒設定 HR_USERNAME、HR_PASSWORD");
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("還沒設定 SUPABASE_SECRET_KEY");

  // secret key 會略過 RLS，只在這裡（伺服器）用
  const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: nezumi, error: pErr } = await db.from("profiles").select("id").eq("role", "nezumi").single();
  if (pErr || !nezumi) throw new Error("資料庫裡找不到鼠的 profile");

  const jar = await login(HR_USERNAME, HR_PASSWORD);
  const result: SyncResult = { months: months(), added: 0, updated: 0, removed: 0, unchanged: 0 };

  for (const month of result.months) {
    const shifts = parseShiftPage(await fetchMonth(jar, month));
    const rows = shifts.map((s) => shiftToEvent(s, nezumi.id));

    const { data: existing, error: eErr } = await db
      .from("events")
      .select("id, source_key, title, start_at, end_at, all_day, location, note")
      .eq("source", SHIFT_SOURCE)
      .like("source_key", `${month}-%`);
    if (eErr) throw new Error(`讀資料庫失敗：${eErr.message}`);
    const byKey = new Map(existing.map((e) => [e.source_key as string, e]));

    // 有變的才寫，沒變的不動（不然每天都會更新一次、對方的畫面也會跟著閃）
    const changed = rows.filter((r) => {
      const old = byKey.get(r.source_key);
      if (!old) result.added++;
      else if (same(old, r)) {
        result.unchanged++;
        return false;
      } else result.updated++;
      return true;
    });
    if (changed.length) {
      const { error } = await db.from("events").upsert(changed, { onConflict: "source,source_key" });
      if (error) throw new Error(`寫入資料庫失敗：${error.message}`);
    }

    // 班表上已經沒有的日子（例如還沒排班的下個月、被取消的班）就刪掉。
    // 這個月一筆都沒讀到時不刪，避免網站出問題時把整個月清空
    const keys = new Set(rows.map((r) => r.source_key));
    const gone = existing.filter((e) => !keys.has(e.source_key as string)).map((e) => e.id);
    if (rows.length && gone.length) {
      const { error } = await db.from("events").delete().in("id", gone);
      if (error) throw new Error(`刪除舊班失敗：${error.message}`);
      result.removed += gone.length;
    }
  }
  return result;
}
