-- 每週重複的行程（2026-11-12）
-- repeat = 'weekly'：從 start_at 那天開始，每 7 天出現一次，長度一樣
-- repeat_until：最後一天（含），null = 一直重複
-- skip_dates：「只刪這一次」跳過的日期

alter table public.events
  add column repeat text check (repeat in ('weekly')),
  add column repeat_until date,
  add column skip_dates date[] not null default '{}';

create index events_repeat_idx on public.events (start_at) where repeat is not null;
