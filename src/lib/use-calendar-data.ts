"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { addDays, dateKey, startOfWeek } from "@/lib/dates";
import { DEFAULT_COLOR, type CalEvent, type EventDraft, type Profile } from "@/lib/types";

// 最近載入過的行程和兩人的資料存在手機上（localStorage），離線打開也看得到。
// 換了存的格式就改 key 的版本號。
const CACHE_KEY = "nn-cache-v1";

type Cache = { userId: string; profiles: Profile[]; events: Record<string, CalEvent> };

export type Range = { start: Date; end: Date };

export type CalendarData = {
  ready: boolean;
  demo: boolean;
  offline: boolean;
  me: Profile | null;
  profiles: Profile[];
  events: CalEvent[];
  setRange: (range: Range) => void;
  save: (draft: EventDraft) => Promise<string | null>; // 回傳錯誤訊息
  remove: (id: string) => Promise<string | null>;
  skipOnce: (id: string, date: string) => Promise<string | null>; // 每週重複的行程「只刪這一次」
  setMyColor: (color: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    return null;
  }
}

function writeCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 私密瀏覽或空間滿了：不存也能用
  }
}

function without(map: Record<string, CalEvent>, id: string) {
  const next = { ...map };
  delete next[id];
  return next;
}

/** 這筆行程會不會出現在這段期間（重新拿這段期間時，要先把它們拿掉） */
function coversRange(e: CalEvent, r: Range) {
  if (e.repeat) return new Date(e.start_at) < r.end && (!e.repeat_until || e.repeat_until >= dateKey(r.start));
  return new Date(e.start_at) < r.end && new Date(e.end_at) >= r.start;
}

export function useCalendarData(): CalendarData {
  // isSupabaseConfigured 在建置時就決定了，不會在執行中改變，所以可以這樣選
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return isSupabaseConfigured ? useSupabaseData() : useDemoData();
}

// ───────────────────────── Supabase ─────────────────────────

function useSupabaseData(): CalendarData {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [eventMap, setEventMap] = useState<Record<string, CalEvent>>({});
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const rangeRef = useRef<Range | null>(null);

  const fetchRange = useCallback(
    async (client: SupabaseClient, range: Range) => {
      // 一般行程：落在這段期間的；每週重複：在這段期間結束前開始、還沒結束重複的
      const [once, weekly] = await Promise.all([
        client
          .from("events")
          .select("*")
          .is("repeat", null)
          .lt("start_at", range.end.toISOString())
          .gte("end_at", range.start.toISOString()),
        client
          .from("events")
          .select("*")
          .not("repeat", "is", null)
          .lt("start_at", range.end.toISOString())
          .or(`repeat_until.is.null,repeat_until.gte.${dateKey(range.start)}`),
      ]);
      if (once.error || weekly.error) {
        setOffline(true);
        return;
      }
      setOffline(false);
      setEventMap((prev) => {
        // 這段期間以伺服器為準：先拿掉舊的，再放進新的（對方離線時刪掉的也會消失）
        const next: Record<string, CalEvent> = {};
        for (const e of Object.values(prev)) if (!coversRange(e, range)) next[e.id] = e;
        for (const e of [...once.data, ...weekly.data] as CalEvent[]) next[e.id] = e;
        return next;
      });
    },
    [],
  );

  // 先用手機上存的資料畫出來，再確認登入、從網路拿最新的
  useEffect(() => {
    let cancelled = false;
    const cache = readCache();

    (async () => {
      const { data } = await supabase.auth.getSession(); // 讀 cookie，不用網路
      // 離線又剛好 token 過期時拿不到 session：先用手機上存的看，連上網路再說
      const uid = data.session?.user.id ?? (!navigator.onLine ? cache?.userId : undefined);
      if (!uid) {
        router.replace("/login");
        return;
      }
      if (cancelled) return;
      if (cache?.userId === uid) {
        setProfiles(cache.profiles);
        setEventMap(cache.events);
      }
      setUserId(uid);
      setReady(true);

      const { data: rows, error } = await supabase.from("profiles").select("id, role, name, color");
      if (cancelled) return;
      if (error) setOffline(true);
      else setProfiles(rows as Profile[]);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, router]);

  // 存到手機上
  useEffect(() => {
    if (userId) writeCache({ userId, profiles, events: eventMap });
  }, [userId, profiles, eventMap]);

  // Realtime：對方新增、修改、刪除時即時更新
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (id) setEventMap((prev) => without(prev, id));
        } else {
          const row = payload.new as CalEvent;
          setEventMap((prev) => ({ ...prev, [row.id]: row }));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const row = payload.new as Profile;
        setProfiles((prev) => prev.map((p) => (p.id === row.id ? { ...p, ...row } : p)));
      })
      .subscribe((status) => {
        // 連上（或斷線後重新連上）時補拿一次，斷線期間錯過的改動才不會漏掉
        if (status === "SUBSCRIBED" && rangeRef.current) void fetchRange(supabase, rangeRef.current);
      });

    // iPhone 把 App 放到背景時連線會被切斷：回到前景時重新拿一次
    const onVisible = () => {
      if (document.visibilityState === "visible" && rangeRef.current) void fetchRange(supabase, rangeRef.current);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, fetchRange]);

  const setRange = useCallback(
    (range: Range) => {
      rangeRef.current = range;
      if (userId) void fetchRange(supabase, range);
    },
    [supabase, userId, fetchRange],
  );

  // 登入確認之後補拿一次目前畫面的範圍
  useEffect(() => {
    if (userId && rangeRef.current) void fetchRange(supabase, rangeRef.current);
  }, [supabase, userId, fetchRange]);

  const save = useCallback(
    async (draft: EventDraft) => {
      const { id, ...fields } = draft;
      const query = id
        ? supabase.from("events").update(fields).eq("id", id).select().single()
        : supabase.from("events").insert(fields).select().single();
      const { data, error } = await query;
      if (error) return friendlyError(error.message);
      const row = data as CalEvent;
      setEventMap((prev) => ({ ...prev, [row.id]: row }));
      return null;
    },
    [supabase],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) return friendlyError(error.message);
      setEventMap((prev) => without(prev, id));
      return null;
    },
    [supabase],
  );

  const skipOnce = useCallback(
    async (id: string, date: string) => {
      const skip = [...new Set([...(eventMap[id]?.skip_dates ?? []), date])];
      const { data, error } = await supabase.from("events").update({ skip_dates: skip }).eq("id", id).select().single();
      if (error) return friendlyError(error.message);
      const row = data as CalEvent;
      setEventMap((prev) => ({ ...prev, [row.id]: row }));
      return null;
    },
    [supabase, eventMap],
  );

  const setMyColor = useCallback(
    async (color: string) => {
      if (!userId) return null;
      const { error } = await supabase.from("profiles").update({ color }).eq("id", userId);
      if (error) return friendlyError(error.message);
      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, color } : p)));
      return null;
    },
    [supabase, userId],
  );

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    await supabase.auth.signOut();
    router.replace("/login");
  }, [supabase, router]);

  const events = useMemo(() => Object.values(eventMap), [eventMap]);
  const me = profiles.find((p) => p.id === userId) ?? null;

  return { ready, demo: false, offline, me, profiles, events, setRange, save, remove, skipOnce, setMyColor, signOut };
}

function friendlyError(message: string) {
  if (/fetch|network/i.test(message)) return "沒有網路，等一下再試";
  return `沒有存成功：${message}`;
}

// ───────────────────────── 示範模式（沒填 Supabase 環境變數） ─────────────────────────

const DEMO_PROFILES: Profile[] = [
  { id: "demo-neko", role: "neko", name: "貓", color: DEFAULT_COLOR.neko },
  { id: "demo-nezumi", role: "nezumi", name: "鼠", color: DEFAULT_COLOR.nezumi },
];

function demoEvents(): Record<string, CalEvent> {
  const week = startOfWeek(new Date());
  const at = (day: number, h: number, m = 0) => {
    const d = addDays(week, day);
    d.setHours(h, m);
    return d.toISOString();
  };
  const now = new Date().toISOString();
  const list: Omit<CalEvent, "created_at" | "updated_at">[] = [
    { id: "d1", title: "一起吃早午餐", start_at: at(0, 10, 30), end_at: at(0, 12), all_day: false, location: "大稻埕", note: null, created_by: "demo-nezumi" },
    { id: "d2", title: "看牙醫", start_at: at(2, 15), end_at: at(2, 16), all_day: false, location: null, note: "記得帶健保卡", created_by: "demo-neko" },
    { id: "d3", title: "鼠鼠加班", start_at: at(3, 19), end_at: at(3, 22), all_day: false, location: null, note: null, created_by: "demo-nezumi" },
    { id: "d4", title: "週末小旅行", start_at: at(5, 0), end_at: at(7, 0), all_day: true, location: "宜蘭", note: null, created_by: "demo-neko" },
    { id: "d5", title: "電影：晚場", start_at: at(5, 20, 40), end_at: at(5, 23), all_day: false, location: "信義威秀", note: null, created_by: "demo-nezumi" },
    { id: "d6", title: "貓貓健身", start_at: at(9, 7), end_at: at(9, 8), all_day: false, location: null, note: null, created_by: "demo-neko" },
  ];
  // 鼠的班表（示範）
  const shifts = [1, 2, 8, 9].map((day) => ({
    id: `s${day}`, title: "上班", start_at: at(day, 10), end_at: at(day, 18), all_day: false,
    location: "原岩 新店", note: null, created_by: "demo-nezumi", source: "tup-shift", source_key: `d${day}`,
  }));
  const offs = [4, 11].map((day) => ({
    id: `o${day}`, title: "排休", start_at: at(day, 0), end_at: at(day + 1, 0), all_day: true,
    location: null, note: null, created_by: "demo-nezumi", source: "tup-shift", source_key: `o${day}`,
  }));
  // 每週重複（示範）
  const weekly = [
    { id: "w1", title: "跑班", start_at: at(1, 19, 30), end_at: at(1, 21), all_day: false, location: "板橋第二運動場", note: null, created_by: "demo-neko", repeat: "weekly" as const, repeat_until: null, skip_dates: [] },
    { id: "w2", title: "日文課", start_at: at(4, 19, 30), end_at: at(4, 21), all_day: false, location: "川崎太太日文俱樂部", note: null, created_by: "demo-neko", repeat: "weekly" as const, repeat_until: null, skip_dates: [] },
  ];
  return Object.fromEntries(
    [...list, ...shifts, ...offs, ...weekly].map((e) => [e.id, { ...e, created_at: now, updated_at: now }]),
  );
}

function useDemoData(): CalendarData {
  const [profiles, setProfiles] = useState(DEMO_PROFILES);
  const [eventMap, setEventMap] = useState(demoEvents);

  const save = useCallback(async (draft: EventDraft) => {
    const now = new Date().toISOString();
    setEventMap((prev) => {
      const id = draft.id ?? crypto.randomUUID();
      const old = prev[id];
      return {
        ...prev,
        [id]: { ...draft, id, created_by: old?.created_by ?? "demo-neko", created_at: old?.created_at ?? now, updated_at: now },
      };
    });
    return null;
  }, []);

  const remove = useCallback(async (id: string) => {
    setEventMap((prev) => without(prev, id));
    return null;
  }, []);

  const skipOnce = useCallback(async (id: string, date: string) => {
    setEventMap((prev) => ({ ...prev, [id]: { ...prev[id], skip_dates: [...(prev[id].skip_dates ?? []), date] } }));
    return null;
  }, []);

  const setMyColor = useCallback(async (color: string) => {
    setProfiles((prev) => prev.map((p) => (p.id === "demo-neko" ? { ...p, color } : p)));
    return null;
  }, []);

  const events = useMemo(() => Object.values(eventMap), [eventMap]);
  return {
    ready: true,
    demo: true,
    offline: false,
    me: profiles[0],
    profiles,
    events,
    setRange: () => {},
    save,
    remove,
    skipOnce,
    setMyColor,
    signOut: async () => {},
  };
}
