import { CalendarApp } from "@/components/calendar-app";
import { ClientOnly } from "@/components/client-only";

// 頁面本身是固定的 App 殼（不含任何人的資料），行程在瀏覽器端讀取，所以 Service Worker 可以把它存起來離線用
export default function Home() {
  return (
    <ClientOnly fallback={<div className="min-h-dvh" />}>
      <CalendarApp />
    </ClientOnly>
  );
}
