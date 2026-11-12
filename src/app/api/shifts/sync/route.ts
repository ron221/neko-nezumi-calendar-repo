import { createClient } from "@/lib/supabase/server";
import { syncShifts } from "@/lib/shifts/sync";

// 登入班表網站加上讀兩個月，給它多一點時間
export const maxDuration = 60;

// Vercel Cron 每天呼叫一次（vercel.json），會帶 Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "沒有權限" }, { status: 401 });
  }
  return run();
}

// 設定裡的「現在同步」：貓或鼠登入後按的
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims.sub;
  const { data: me } = uid ? await supabase.from("profiles").select("id").eq("id", uid).maybeSingle() : { data: null };
  if (!me) return Response.json({ ok: false, error: "沒有權限" }, { status: 401 });
  return run();
}

async function run() {
  try {
    return Response.json({ ok: true, ...(await syncShifts()) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
