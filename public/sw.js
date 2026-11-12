// 貓鼠日曆的 Service Worker：把 App 殼存在手機上，沒網路也打得開。
// ・頁面（/、/login）：先拿網路上的（最多等 PAGE_WAIT_MS），等不到或沒網路就用存的；拿到的新版也存起來
//   頁面本身不含行程資料（行程在瀏覽器端讀，最近載入過的存在 localStorage），所以存起來沒有個資問題
// ・/_next/static/（程式、CSS，檔名帶版本）：存過就直接用
// ・/icons/、manifest：先用存的，背景再更新
// ・其他（伺服器動作、Supabase）一律走網路
// 換了這個檔案的快取方式要改 VERSION，舊的存檔會在新的 Service Worker 啟用時刪掉
const VERSION = "v1";
const PAGE_CACHE = `nn-page-${VERSION}`;
const STATIC_CACHE = `nn-static-${VERSION}`;
const KEEP = [PAGE_CACHE, STATIC_CACHE];
const PAGES = ["/", "/login"];
const PAGE_WAIT_MS = 2500;
const STATIC_MAX = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(["/manifest.webmanifest", "/icons/icon-192.png"]).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (!KEEP.includes(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" && PAGES.includes(url.pathname)) {
    event.respondWith(page(req, url.pathname));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
  } else if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function page(req, path) {
  const cache = await caches.open(PAGE_CACHE);
  const network = fetch(req)
    .then(async (res) => {
      // 被轉址（例如沒登入轉到 /login）的不存，不然離線時會打開錯的頁面
      if (res.ok && !res.redirected && res.type === "basic") await cache.put(path, res.clone());
      return res;
    })
    .catch(() => null);
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), PAGE_WAIT_MS));
  const first = await Promise.race([network, timeout]);
  if (first) return first;
  const cached = await cache.match(path);
  if (cached) return cached;
  return (await network) ?? new Response("沒有網路", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    trim(cache);
  }
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  const network = fetch(req)
    .then(async (res) => {
      if (res.ok) await cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return hit ?? (await network) ?? Response.error();
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - STATIC_MAX; i++) await cache.delete(keys[i]);
}
