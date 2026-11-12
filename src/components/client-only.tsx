"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

/** 只在瀏覽器裡畫（要用到今天日期、localStorage 的畫面）。伺服器預先產生的 App 殼先放 fallback */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? children : fallback;
}
