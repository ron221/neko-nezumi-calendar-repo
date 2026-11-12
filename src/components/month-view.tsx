import { WEEKDAYS, formatDay, isSameDay, overlapsDay } from "@/lib/dates";
import type { CalEvent } from "@/lib/types";
import type { ProfileLookup } from "./calendar-app";
import { EventRow, FALLBACK_COLOR } from "./event-bits";

const MAX_CHIPS = 3;

export function MonthView({ days, month, today, selected, events, profileOf, onSelect, onOpen }: {
  days: Date[];
  month: number;
  today: Date;
  selected: Date;
  events: CalEvent[];
  profileOf: ProfileLookup;
  onSelect: (d: Date) => void;
  onOpen: (e: CalEvent | "new") => void;
}) {
  const byDay = days.map((d) => events.filter((e) => overlapsDay(e.start_at, e.end_at, d)));
  const selectedIndex = days.findIndex((d) => isSameDay(d, selected));
  const selectedEvents = selectedIndex >= 0 ? byDay[selectedIndex] : [];

  return (
    <>
      <div className="grid grid-cols-7 pb-1 text-center text-xs text-ink-soft">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={i === 0 || i === 6 ? "text-accent/80" : ""}>
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-2xl bg-line ring-1 ring-line" style={{ gap: 1 }}>
        {days.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, selected);
          const list = byDay[i];
          return (
            <button
              key={d.getTime()}
              type="button"
              onClick={() => (isSelected ? onOpen("new") : onSelect(d))}
              className={`flex h-16 min-w-0 flex-col items-stretch px-0.5 pt-1 text-left ${
                isSelected ? "bg-[#fff3e6]" : "bg-card"
              }`}
            >
              <span
                className={`mx-auto grid size-6 place-items-center rounded-full text-[13px] ${
                  isToday ? "bg-accent font-bold text-white" : inMonth ? "" : "text-ink-soft/50"
                }`}
              >
                {d.getDate()}
              </span>
              <span className="mt-0.5 flex min-w-0 flex-col gap-px">
                {list.slice(0, MAX_CHIPS).map((e) => {
                  const color = profileOf(e.created_by)?.color ?? FALLBACK_COLOR;
                  return (
                    <span
                      key={e.id}
                      className={`block truncate rounded-[3px] px-1 text-[10px] leading-[14px] ${inMonth ? "" : "opacity-50"}`}
                      style={
                        e.all_day
                          ? { backgroundColor: color, color: "#fff" }
                          : { backgroundColor: `${color}2e`, boxShadow: `inset 2px 0 0 ${color}` }
                      }
                    >
                      {e.title}
                    </span>
                  );
                })}
                {list.length > MAX_CHIPS && (
                  <span className="px-1 text-[10px] leading-[12px] text-ink-soft">+{list.length - MAX_CHIPS}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <section className="mt-4 px-2">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-bold">{formatDay(selected)}</h2>
          <button type="button" onClick={() => onOpen("new")} className="text-sm font-medium text-accent">
            ＋ 新增
          </button>
        </div>
        {selectedEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-sm text-ink-soft">
            這天沒有行程
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedEvents.map((e) => (
              <EventRow key={e.id} event={e} day={selected} profileOf={profileOf} onOpen={onOpen} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
