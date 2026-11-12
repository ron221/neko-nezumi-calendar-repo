-- 每年重複（生日、紀念日）（2026-11-12）
-- repeat = 'yearly'：每年同一個月、同一天出現

alter table public.events drop constraint if exists events_repeat_check;
alter table public.events
  add constraint events_repeat_check check (repeat in ('weekly', 'yearly'));
