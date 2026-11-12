"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, isSameDay, monthGrid, startOfDay, weekDays } from "@/lib/dates";
import { useCalendarData } from "@/lib/use-calendar-data";
import { ROLE_EMOJI, type CalEvent, type Profile } from "@/lib/types";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { EventSheet } from "./event-sheet";
import { SettingsSheet } from "./settings-sheet";

type View = "month" | "week";
const VIEW_KEY = "nn-view";

export type ProfileLookup = (id: string) => Profile | undefined;

export function CalendarApp() {
  const data = useCalendarData();
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "week" ? "week" : "month"; // 記住上次看月曆還是週曆
    } catch {
      return "month";
    }
  });
  const [today, setToday] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<CalEvent | "new" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 過了午夜「今天」要跟著換
  useEffect(() => {
    const timer = setInterval(() => {
      const d = startOfDay(new Date());
      setToday((t) => (isSameDay(t, d) ? t : d));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const days = useMemo(() => (view === "month" ? monthGrid(selected) : weekDays(selected)), [view, selected]);

  // 告訴資料層現在畫面上是哪段期間，好去拿那段的行程
  const { setRange } = data;
  const rangeKey = `${days[0].getTime()}-${days.length}`;
  useEffect(() => {
    setRange({ start: days[0], end: addDays(days[days.length - 1], 1) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, setRange]);

  const profileOf: ProfileLookup = (id) => data.profiles.find((p) => p.id === id);

  const sorted = useMemo(
    () =>
      [...data.events].sort(
        (a, b) => Number(b.all_day) - Number(a.all_day) || a.start_at.localeCompare(b.start_at),
      ),
    [data.events],
  );

  const move = (dir: -1 | 1) => {
    if (view === "month") {
      const m = addMonths(selected, dir);
      // 換到今天所在的月份就選今天，其他月份選 1 號
      setSelected(m.getMonth() === today.getMonth() && m.getFullYear() === today.getFullYear() ? today : m);
    } else {
      setSelected(addDays(selected, dir * 7));
    }
  };

  const title = `${selected.getFullYear()}年${selected.getMonth() + 1}月`;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="sticky top-0 z-10 bg-paper px-4 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <div className="flex items-center gap-2">
          <h1 className="min-w-0 flex-1 truncate text-[22px] font-bold">{title}</h1>
          <button
            type="button"
            onClick={() => setSelected(today)}
            className="h-9 rounded-full bg-card px-3.5 text-sm font-medium ring-1 ring-line active:bg-line"
          >
            今天
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="設定"
            className="grid size-9 place-items-center rounded-full text-xl ring-2"
            style={{ backgroundColor: data.me ? `${data.me.color}33` : undefined, ["--tw-ring-color" as string]: data.me?.color ?? "var(--color-line)" }}
          >
            {data.me ? ROLE_EMOJI[data.me.role] : "·"}
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex rounded-full bg-line/70 p-0.5" role="tablist">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => changeView(v)}
                className={`h-8 w-14 rounded-full text-sm font-medium ${view === v ? "bg-card shadow-sm" : "text-ink-soft"}`}
              >
                {v === "month" ? "月" : "週"}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button type="button" onClick={() => move(-1)} aria-label="上一個" className="grid size-9 place-items-center rounded-full text-xl active:bg-line">
            ‹
          </button>
          <button type="button" onClick={() => move(1)} aria-label="下一個" className="grid size-9 place-items-center rounded-full text-xl active:bg-line">
            ›
          </button>
        </div>

        {(data.demo || data.offline) && (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs text-amber-900">
            {data.demo ? "示範模式：還沒設定 Supabase，資料不會存起來" : "離線中：顯示的是上次載入的行程"}
          </p>
        )}
      </header>

      <main className="px-2 pb-28">
        {view === "month" ? (
          <MonthView
            days={days}
            month={selected.getMonth()}
            today={today}
            selected={selected}
            events={sorted}
            profileOf={profileOf}
            onSelect={setSelected}
            onOpen={setEditing}
          />
        ) : (
          <WeekView
            days={days}
            today={today}
            events={sorted}
            profileOf={profileOf}
            onAdd={(d) => {
              setSelected(d);
              setEditing("new");
            }}
            onOpen={setEditing}
          />
        )}
      </main>

      <button
        type="button"
        onClick={() => setEditing("new")}
        aria-label="新增行程"
        className="fixed right-5 z-20 grid size-14 place-items-center rounded-full bg-accent text-3xl leading-none text-white shadow-lg active:brightness-95"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
      >
        +
      </button>

      {editing && (
        <EventSheet
          event={editing === "new" ? null : editing}
          defaultDay={selected}
          profileOf={profileOf}
          onSave={data.save}
          onDelete={data.remove}
          onClose={() => setEditing(null)}
        />
      )}

      {settingsOpen && data.me && (
        <SettingsSheet
          me={data.me}
          demo={data.demo}
          onColor={data.setMyColor}
          onSignOut={data.signOut}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
