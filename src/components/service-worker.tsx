"use client";

import { useEffect } from "react";

// 只在正式版註冊（npm run dev 時 Service Worker 會把舊程式存住，改了看不到）
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
