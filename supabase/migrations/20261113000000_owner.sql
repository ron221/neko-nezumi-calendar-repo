-- 行程是誰的（2026-11-13）
-- 貓也可能幫鼠新增她的行程，所以「是誰的」和「誰新增的」（created_by）分開記。
-- owner_id = null：沿用 created_by（舊的行程、班表）。together = true 時是兩人一起，不看 owner_id。

alter table public.events
  add column owner_id uuid references public.profiles (id);
