-- 兩人一起的行程（2026-11-12）
-- together = true：貓鼠共同的行程，標題前面顯示 🐱🐭、用兩人的顏色；建立者（created_by）還是記著誰新增的

alter table public.events
  add column together boolean not null default false;
