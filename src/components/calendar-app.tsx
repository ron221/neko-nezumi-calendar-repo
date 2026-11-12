"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, isSameDay, monthGrid, startOfDay, weekDays } from "@/lib/dates";
import { useCalendarData } from "@/lib/use-calendar-data";
import { expand, type Occurrence } from "@/lib/recurrence";
import { ROLE_EMOJI, isShift, type Profile } from "@/lib/types";
import { tint } from "@/lib/color";
import { Chevron, Plus } from "./icons";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { EventSheet } from "./event-sheet";
import { SettingsSheet } from "./settings-sheet";

type View = "month" | "week";
const VIEW_KEY = "nn-view";
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
  const [editing, setEditing] = useState<Occurrence | "new" | null>(null);
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

  const rangeStart = days[0];
  const rangeEnd = addDays(days[days.length - 1], 1);
  const sorted = useMemo(
    () =>
      expand(data.events, rangeStart, rangeEnd).sort(
        (a, b) =>
          Number(isShift(b)) - Number(isShift(a)) || // 班表排最前面
          Number(b.all_day) - Number(a.all_day) ||
          a.start_at.localeCompare(b.start_at),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.events, rangeKey],
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

  const monthEn = MONTHS_EN[selected.getMonth()];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header
        className="sticky top-0 z-10 bg-paper px-5 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="flex min-w-0 flex-1 items-end gap-2.5" aria-label={`${selected.getFullYear()}年${selected.getMonth() + 1}月`}>
            <span className="num text-[54px] leading-[0.8] font-medium tracking-tight">{selected.getMonth() + 1}</span>
            <span className="flex min-w-0 flex-col pb-px">
              <span className="font-round text-[19px] leading-none">月</span>
              <span className="mt-1.5 truncate text-[10.5px] leading-none font-medium tracking-[0.22em] text-ink-soft uppercase">
                {view === "week"
                  ? `${days[0].getMonth() + 1}/${days[0].getDate()} – ${days[6].getMonth() + 1}/${days[6].getDate()}`
                  : `${monthEn} ${selected.getFullYear()}`}
              </span>
            </span>
          </h1>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="設定"
            className="grid size-11 shrink-0 place-items-center rounded-full text-[22px] shadow-soft ring-2 ring-card"
            style={{ backgroundColor: data.me ? tint(data.me.color, 0.28) : "var(--color-card)" }}
          >
            {data.me ? ROLE_EMOJI[data.me.role] : "·"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex rounded-full bg-line/55 p-[3px]" role="tablist" aria-label="檢視方式">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => changeView(v)}
                className={`h-8 w-[52px] rounded-full font-round text-[15px] ${
                  view === v ? "bg-card text-ink shadow-soft" : "text-ink-soft"
                }`}
              >
                {v === "month" ? "月" : "週"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSelected(today)}
            className="h-[38px] rounded-full px-3.5 font-round text-[15px] text-accent active:bg-accent-soft"
          >
            今天
          </button>
          <div className="flex-1" />
          <div className="flex rounded-full bg-card shadow-soft">
            <button type="button" onClick={() => move(-1)} aria-label="上一個" className="grid h-[38px] w-11 place-items-center rounded-l-full text-ink-soft active:bg-line/60">
              <Chevron dir="left" />
            </button>
            <span className="my-2.5 w-px bg-line" />
            <button type="button" onClick={() => move(1)} aria-label="下一個" className="grid h-[38px] w-11 place-items-center rounded-r-full text-ink-soft active:bg-line/60">
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        {(data.demo || data.offline) && (
          <p className="mt-3 rounded-xl bg-accent-soft/70 px-3 py-2 text-xs text-[#8a4a2b]">
            {data.demo ? "示範模式：還沒設定 Supabase，資料不會存起來" : "離線中：顯示的是上次載入的行程"}
          </p>
        )}
      </header>

      <main className="px-3 pb-32">
        {view === "month" ? (
          <MonthView
            days={days}
            month={selected.getMonth()}
            today={today}
            selected={selected}
            events={sorted}
            profiles={data.profiles}
            profileOf={profileOf}
            onSelect={setSelected}
            onOpen={setEditing}
          />
        ) : (
          <WeekView
            days={days}
            today={today}
            events={sorted}
            profiles={data.profiles}
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
        className="fixed right-5 z-20 grid size-[58px] place-items-center rounded-full bg-ink text-paper shadow-[0_10px_24px_-8px_rgb(59_49_42/0.55)] active:bg-[#2b231e]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 22px)" }}
      >
        <Plus />
      </button>

      {editing && (
        <EventSheet
          event={editing === "new" ? null : editing}
          defaultDay={selected}
          profileOf={profileOf}
          onSave={data.save}
          onDelete={data.remove}
          onSkip={data.skipOnce}
          series={editing !== "new" && editing.seriesId ? data.events.find((e) => e.id === editing.seriesId) : undefined}
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
