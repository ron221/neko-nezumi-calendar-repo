<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 貓鼠日曆 開發規則（電腦和雲端的 Claude Code 都照這個做）

只給兩個人用的日曆 PWA：🐱 貓 = 使用者本人，🐭 鼠 = 女友。Next.js（App Router）+ Supabase（Postgres、Auth、Realtime、RLS）+ Vercel。

- **回覆用繁體中文**。使用者常用手機操作，每次結尾直接寫出要問的問題和可以選的答案。
- **部署**：推到 `main` 就會由 Vercel 上線（目前網址 https://neko-nezumi-calendar-repo21.vercel.app ，GitHub repo `ron221/neko-nezumi-calendar-repo`）。
  - **還沒正式開始用之前**：改完在 localhost 確認、提交之後，可以直接推 `main`，不用等使用者說「推送」。
  - 改到資料庫（`supabase/migrations`）的，一律先請使用者在 Supabase 的 SQL Editor 執行 SQL、確認生效後才推送。
- **小手機**：改到畫面就用三種手機大小檢查——iPhone SE 375×667、iPhone 15 393×852、Android 360 寬——說出哪些放不下，並附截圖。
- **iPhone Safari**：提交前想一下圖層變化會不會造成閃爍或 1px 跳動（加減 transform、opacity、z-index、will-change、position: fixed、底部安全區域時特別注意）。
- **Service Worker**：改了 `public/sw.js` 的快取方式，要同時改它的 `VERSION`。
- **待辦**：在 `TODO.md`。使用者說「寫進 TODO」就加在對應的段落，寫日期。

### 架構速記

- 登入：`src/app/login`。畫面只有兩個頭像，點了輸入 6 位數密碼；伺服器動作 `src/app/login/actions.ts` 依身分對應到 `NEKO_EMAIL`／`NEZUMI_EMAIL`（只在伺服器端的環境變數），用 Supabase 的 email + 密碼登入。沒有註冊頁；兩個帳號是在 Supabase 後台手動建立的。
- 保持登入：`src/proxy.ts` 每次導覽刷新 session，瀏覽器端的 Supabase client 也會自動更新 token；cookie 保存 400 天。
- 行程資料全部在瀏覽器端讀寫（`src/lib/use-events.ts`），用 Realtime 收對方的改動；最近載入過的行程存在 localStorage，離線也看得到。
- 沒填 Supabase 環境變數時，首頁是「示範模式」（假資料、存在記憶體），方便在 localhost 看畫面。
- 鼠的班表：`src/lib/shifts/`。Vercel Cron 每天台灣 06:00（`vercel.json`）呼叫 `/api/shifts/sync`，用 `HR_USERNAME`／`HR_PASSWORD` 登入 hr.tup.j91.me、讀這個月和下個月，存成鼠的行程（`source = 'tup-shift'`、`source_key` = 日期）。只有有變動的才寫入。設定裡的「現在同步」也會呼叫它。
  - 改了解析就用存下來的班表頁測：`node --experimental-strip-types scripts/test-shifts.mjs <班表.html>`
  - Claude 不使用班表網站的帳號密碼登入；要實測同步，請使用者在正式站按「現在同步」。
- 國定假日：`src/lib/holidays.json`（`npm run holidays:build -- <年>` 產生，來源是人事行政總處辦公日曆表），只在畫面上顯示，不存資料庫。
- 資料庫：`supabase/migrations`。`profiles`（誰是貓誰是鼠、顏色）、`events`（行程）。RLS 只讓 `profiles` 裡的兩個人讀寫。

### 設計速記

- 手帳風：紙色底（`--color-paper`），白色卡片配柔和陰影（`shadow-soft`），盡量不用框線。
- 字型：標題、按鈕用粉圓體 `font-round`（Huninn）；大數字（月份、日期、時間）用 `.num`（Fraunces）；內文用系統字（蘋方）。
- 兩人的顏色用 `tint()`（`src/lib/color.ts`）調成不透明的淡色當底，不用半透明。
- 日期、時間欄位用 `PickerField`：自己畫字，透明的原生欄位蓋在上面。
