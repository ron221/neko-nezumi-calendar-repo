import { WEEKDAYS, isSameDay, overlapsDay } from "@/lib/dates";
import type { CalEvent } from "@/lib/types";
import type { ProfileLookup } from "./calendar-app";
import { EventRow } from "./event-bits";

// 手機上 7 欄的時間格太擠，週曆用一天一列的清單
export function WeekView({ days, today, events, profileOf, onAdd, onOpen }: {
  days: Date[];
  today: Date;
  events: CalEvent[];
  profileOf: ProfileLookup;
  onAdd: (d: Date) => void;
  onOpen: (e: CalEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-1 px-1">
      {days.map((d) => {
        const list = events.filter((e) => overlapsDay(e.start_at, e.end_at, d));
        const isToday = isSameDay(d, today);
        const weekend = d.getDay() === 0 || d.getDay() === 6;
        return (
          <div key={d.getTime()} className="flex gap-2 border-b border-line py-2 last:border-b-0">
            <button
              type="button"
              onClick={() => onAdd(d)}
              aria-label={`在 ${d.getMonth() + 1}月${d.getDate()}日 新增`}
              className="flex w-12 shrink-0 flex-col items-center pt-1"
            >
              <span className={`text-xs ${weekend ? "text-accent/80" : "text-ink-soft"}`}>週{WEEKDAYS[d.getDay()]}</span>
              <span
                className={`mt-0.5 grid size-8 place-items-center rounded-full text-lg ${
                  isToday ? "bg-accent font-bold text-white" : "font-medium"
                }`}
              >
                {d.getDate()}
              </span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {list.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onAdd(d)}
                  className="h-11 rounded-xl text-left text-sm text-ink-soft/60 active:bg-line/50"
                >
                  <span className="px-3">—</span>
                </button>
              ) : (
                list.map((e) => <EventRow key={e.id} event={e} day={d} profileOf={profileOf} onOpen={onOpen} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
