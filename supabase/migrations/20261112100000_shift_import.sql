-- 鼠的班表自動匯入（2026-11-12）
-- 匯入的行程記下來源和來源裡的代號，同一天的班重複匯入時用來更新，不會變成兩筆。
-- 自己新增的行程這兩欄是 null。

alter table public.events
  add column source text,
  add column source_key text;

-- 一般的唯一索引（null 可以重複），upsert 的 on conflict (source, source_key) 要用到
create unique index events_source_key_idx on public.events (source, source_key);
