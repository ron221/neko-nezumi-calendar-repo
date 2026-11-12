import { WEEKDAYS, isSameDay, overlapsDay } from "@/lib/dates";
import { tint } from "@/lib/color";
import type { CalEvent, Profile } from "@/lib/types";
import type { ProfileLookup } from "./calendar-app";
import { EventRow, FALLBACK_COLOR, Legend } from "./event-bits";

const MAX_CHIPS = 2;

export function MonthView({ days, month, today, selected, events, profiles, profileOf, onSelect, onOpen }: {
  days: Date[];
  month: number;
  today: Date;
  selected: Date;
  events: CalEvent[];
  profiles: Profile[];
  profileOf: ProfileLookup;
  onSelect: (d: Date) => void;
  onOpen: (e: CalEvent | "new") => void;
}) {
  const byDay = days.map((d) => events.filter((e) => overlapsDay(e.start_at, e.end_at, d)));
  const selectedIndex = days.findIndex((d) => isSameDay(d, selected));
  const selectedEvents = selectedIndex >= 0 ? byDay[selectedIndex] : [];

  return (
    <>
      <div className="rounded-[28px] bg-card px-1.5 pt-2.5 pb-1.5 shadow-soft">
        <div className="grid grid-cols-7 pb-1.5 text-center font-round text-[12px]">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={i === 0 || i === 6 ? "text-accent" : "text-ink-soft"}>
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const inMonth = d.getMonth() === month;
            const isToday = isSameDay(d, today);
            const isSelected = isSameDay(d, selected);
            const list = byDay[i];
            const overflow = list.length > MAX_CHIPS;
            const shown = overflow ? list.slice(0, MAX_CHIPS - 1) : list;
            return (
              <button
                key={d.getTime()}
                type="button"
                onClick={() => (isSelected ? onOpen("new") : onSelect(d))}
                aria-label={`${d.getMonth() + 1}月${d.getDate()}日，${list.length} 個行程`}
                className={`flex h-16 min-w-0 flex-col items-stretch rounded-2xl px-[3px] pt-1 ${
                  isSelected && !isToday ? "bg-[#f6eee3]" : ""
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={`num mx-auto grid size-[26px] place-items-center rounded-full text-[14px] ${
                    isToday ? "bg-accent font-semibold text-white" : isSelected ? "font-semibold" : ""
                  }`}
                >
                  {d.getDate()}
                </span>
                <span className="mt-[3px] flex min-w-0 flex-col gap-px">
                  {shown.map((e) => {
                    const color = profileOf(e.created_by)?.color ?? FALLBACK_COLOR;
                    return (
                      <span
                        key={e.id}
                        className="block truncate rounded-[5px] px-[3px] text-left text-[9.5px] leading-[13px]"
                        style={
                          e.all_day
                            ? { backgroundColor: color, color: "#fff" }
                            : { backgroundColor: tint(color, 0.2), color: "#4a3d33" }
                        }
                      >
                        {e.title}
                      </span>
                    );
                  })}
                  {overflow && (
                    <span className="block rounded-[5px] bg-line/60 text-center text-[9.5px] leading-[13px] text-ink-soft">
                      +{list.length - shown.length}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <Legend profiles={profiles} />
      </div>

      <section className="mt-6 px-1">
        <div className="mb-3 flex items-end gap-2.5 px-1">
          <span className="num text-[30px] leading-[0.8] font-medium">
            {selected.getMonth() + 1}/{selected.getDate()}
          </span>
          <span className="flex-1 pb-px font-round text-[15px] leading-none text-ink-soft">週{WEEKDAYS[selected.getDay()]}</span>
        </div>
        {selectedEvents.length === 0 ? (
          <button
            type="button"
            onClick={() => onOpen("new")}
            className="w-full rounded-2xl border-[1.5px] border-dashed border-line px-3 py-5 text-center font-round text-[14px] text-ink-soft active:bg-card/60"
          >
            這天還沒有安排，點這裡新增
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedEvents.map((e) => (
              <EventRow key={e.id} event={e} day={selected} profileOf={profileOf} onOpen={onOpen} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
