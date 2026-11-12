-- 建好兩個帳號之後執行一次（不是 migration，只是設定資料）。
-- 把下面兩個 email 換成你在 Authentication → Users 建立的帳號，
-- 也就是 .env 裡的 NEKO_EMAIL、NEZUMI_EMAIL。

insert into public.profiles (id, role, name, color)
select id, 'neko', '貓', '#F2994A' from auth.users where email = 'neko@example.com'
on conflict (id) do update set role = excluded.role;

insert into public.profiles (id, role, name, color)
select id, 'nezumi', '鼠', '#6C9BD2' from auth.users where email = 'nezumi@example.com'
on conflict (id) do update set role = excluded.role;

-- 確認：應該看到兩筆
select p.role, p.name, p.color, u.email from public.profiles p join auth.users u on u.id = p.id;
