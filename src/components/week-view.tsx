import { WEEKDAYS, isSameDay, overlapsDay } from "@/lib/dates";
import type { CalEvent, Profile } from "@/lib/types";
import type { ProfileLookup } from "./calendar-app";
import { EventRow, Legend, type ShiftToggle } from "./event-bits";

// 手機上 7 欄的時間格太擠，週曆用一天一列的清單
export function WeekView({ days, today, events, profiles, shiftToggle, profileOf, onAdd, onOpen }: {
  days: Date[];
  today: Date;
  events: CalEvent[];
  profiles: Profile[];
  shiftToggle?: ShiftToggle;
  profileOf: ProfileLookup;
  onAdd: (d: Date) => void;
  onOpen: (e: CalEvent) => void;
}) {
  return (
    <>
      <div className="flex flex-col">
        {days.map((d) => {
          const list = events.filter((e) => overlapsDay(e.start_at, e.end_at, d));
          const isToday = isSameDay(d, today);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div key={d.getTime()} className="flex gap-3 border-b border-line/70 py-3 last:border-b-0">
              <button
                type="button"
                onClick={() => onAdd(d)}
                aria-label={`在 ${d.getMonth() + 1}月${d.getDate()}日 新增`}
                className="flex w-11 shrink-0 flex-col items-center pt-0.5"
              >
                <span className={`font-round text-[12px] ${weekend || isToday ? "text-accent" : "text-ink-soft"}`}>
                  週{WEEKDAYS[d.getDay()]}
                </span>
                <span
                  className={`num mt-1 grid size-9 place-items-center rounded-full text-[20px] font-medium ${
                    isToday ? "bg-accent text-white" : ""
                  }`}
                >
                  {d.getDate()}
                </span>
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {list.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => onAdd(d)}
                    className="flex h-[58px] items-center rounded-2xl px-4 text-left font-round text-[13px] text-ink-soft/70 active:bg-card/70"
                  >
                    ＋
                  </button>
                ) : (
                  list.map((e) => <EventRow key={e.id} event={e} day={d} profileOf={profileOf} onOpen={onOpen} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <Legend profiles={profiles} shiftToggle={shiftToggle} />
      </div>
    </>
  );
}
