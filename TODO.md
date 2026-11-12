# 待辦

## 設定狀態（2026-11-12）

- [x] Supabase 專案、跑完 `20261112000000_init.sql`、關閉註冊、建好兩個帳號和 profiles
- [x] GitHub repo `ron221/neko-nezumi-calendar-repo`，Vercel 部署好、填好 4 個環境變數（2026-11-12 從 Vercel 自動複製的 `neko-nezumi-calendar-repo21` 改連到這個 repo）
- [ ] 鼠的班表自動同步：執行 `20261112100000_shift_import.sql`、在 Vercel 填 `HR_USERNAME`、`HR_PASSWORD`、`SUPABASE_SECRET_KEY`、`CRON_SECRET`，按「現在同步」確認（2026-11-12）
- [ ] 確認自動部署正常後，刪掉 GitHub 上用不到的 `neko-nezumi-calendar-repo21`
- [x] 兩人登入、新增行程、即時同步實測 OK
- [ ] 想要的話把網址改成 `neko-nezumi-calendar.vercel.app`（Vercel → Settings → Domains），Supabase 的 Site URL 也要跟著改

## 之後要做的功能（2026-11-12）

- [ ] **推播提醒**：行程開始前提醒對方或自己。
  - iPhone 要 iOS 16.4 以上，而且要先「加入主畫面」從主畫面打開才能收推播。
  - 需要產生 VAPID 金鑰（公鑰放 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`，私鑰只放伺服器）、存每支手機的訂閱（新的資料表）、Service Worker 加 `push` 和 `notificationclick`。
  - 需要排程：Vercel Cron 或 Supabase `pg_cron` 定時找出快開始的行程並送出。
- [ ] **重複行程與紀念日**：每週、每月、每年重複；紀念日（交往紀念、生日）每年自動出現，可以顯示「第幾年」「還有幾天」。
- [ ] **ICS 訂閱匯出**：產生帶密鑰的訂閱網址，讓 iPhone／Google 日曆訂閱。
- [ ] **Face ID 登入（Passkey）**：WebAuthn，登入頁點頭像後直接用 Face ID，6 位數密碼留著當備用。
- [ ] **留言和照片**：在行程底下留言、附照片（Supabase Storage）。

## 小事

- [ ] 換上正式的 App 圖示（使用者之後會給）：`public/icons/icon-192.png`、`icon-512.png`、`apple-touch-icon.png`（180）、`src/app/icon.png`。目前是 `npm run icons:build` 產生的暫時圖示。（2026-11-12）
- [ ] iOS 主畫面打開時的啟動畫面（apple-touch-startup-image）。（2026-11-12）
