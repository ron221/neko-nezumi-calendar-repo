-- 貓鼠日曆：初始資料表（2026-11-12）
-- 在 Supabase → SQL Editor 整份貼上執行。

-- 誰是貓、誰是鼠，各自的顏色。一個登入帳號對應一筆。
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null unique check (role in ('neko', 'nezumi')),
  name text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz not null default now()
);

-- 行程。全天行程的 start_at 是第一天 00:00（台灣時間），end_at 是最後一天的隔天 00:00。
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text check (char_length(location) <= 200),
  note text check (char_length(note) <= 2000),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);

create index events_range_idx on public.events (start_at, end_at);

-- 更新時間自動改成現在
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- 建立者不能被改掉
create function public.keep_created_by() returns trigger
language plpgsql as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger events_keep_created_by before update on public.events
  for each row execute function public.keep_created_by();

-- 目前登入的人是不是這兩個人之一（profiles 裡有沒有他）
create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()));
$$;

revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- RLS：只有 profiles 裡的兩個已登入帳號能讀寫
alter table public.profiles enable row level security;
alter table public.events enable row level security;

revoke all on public.profiles from anon;
revoke all on public.events from anon;
grant select, update (name, color) on public.profiles to authenticated;
grant select, insert, update, delete on public.events to authenticated;

create policy "兩人可以看彼此的資料" on public.profiles
  for select to authenticated using ((select public.is_member()));

create policy "只能改自己的名字和顏色" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "兩人可以看所有行程" on public.events
  for select to authenticated using ((select public.is_member()));

create policy "新增的行程建立者是自己" on public.events
  for insert to authenticated
  with check ((select public.is_member()) and created_by = (select auth.uid()));

create policy "兩人都能改行程" on public.events
  for update to authenticated
  using ((select public.is_member()))
  with check ((select public.is_member()));

create policy "兩人都能刪行程" on public.events
  for delete to authenticated using ((select public.is_member()));

-- Realtime：對方新增、修改、刪除行程時即時推過來
alter publication supabase_realtime add table public.events;
