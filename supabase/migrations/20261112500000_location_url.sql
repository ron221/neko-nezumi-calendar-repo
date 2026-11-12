-- 地點的 Google 地圖連結（2026-11-12）
-- 貼了連結的地點，點地圖圖示會打開這個連結；沒貼就用地點名稱去 Google 地圖搜尋

alter table public.events
  add column location_url text check (char_length(location_url) <= 500 and location_url ~ '^https?://');
