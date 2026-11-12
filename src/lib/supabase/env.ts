// NEXT_PUBLIC_ 開頭的會在建置時寫進程式，瀏覽器和伺服器都讀得到
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** 沒填 Supabase 環境變數時，首頁用示範資料（只在記憶體裡），登入頁會提示要先設定 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
