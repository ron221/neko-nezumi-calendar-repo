import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

// 瀏覽器端的 client 會自動更新 token（autoRefreshToken），所以 App 一直開著也不會被登出
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
