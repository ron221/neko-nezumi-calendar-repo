# 貓鼠日曆（neko-nezumi-calendar）

🐱 貓和 🐭 鼠兩個人共用的日曆 PWA。Next.js + Supabase + Vercel。

```bash
cp .env.example .env.local   # 填 Supabase 的網址、金鑰和兩個帳號的 email
npm install
npm run dev
```

沒填 `.env.local` 也能跑，首頁會是示範模式（假資料）。

- 資料庫：`supabase/migrations/` 依序在 Supabase SQL Editor 執行；建好兩個帳號後執行 `supabase/setup-profiles.sql`。
- 圖示：`npm run icons:build`（暫時的圖示）。
- 開發規則：`AGENTS.md`；待辦：`TODO.md`。
