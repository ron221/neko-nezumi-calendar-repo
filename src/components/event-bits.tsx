import { isSameDay, timeKey } from "@/lib/dates";
import { ROLE_EMOJI, mapUrl, type CalEvent, type Profile } from "@/lib/types";
import { MapIcon, Pin } from "./icons";
import { TOGETHER_EMOJI, fill, usePaint } from "./paint";

export { FALLBACK_COLOR } from "./paint";

/** 左邊時間欄的兩行字：[大字, 小字]，以 day 這天的角度來看 */
export function timeParts(e: CalEvent, day: Date): [string, string] {
  if (e.all_day) return ["全天", ""];
  const s = new Date(e.start_at);
  const end = new Date(e.end_at);
  const startsToday = isSameDay(s, day);
  const endsToday = isSameDay(end, day) || end.getTime() === s.getTime();
  if (startsToday && endsToday) return [timeKey(s), end > s ? timeKey(end) : ""];
  if (startsToday) return [timeKey(s), "跨天"];
  if (isSameDay(end, day)) return ["到", timeKey(end)];
  return ["整天", ""];
}

/** 一個行程的卡片（月曆下方當天清單、週曆用） */
export function EventRow({ event, day, onOpen }: {
  event: CalEvent;
  day: Date;
  onOpen: (e: CalEvent) => void;
}) {
  const paint = usePaint()(event);
  const [main, sub] = timeParts(event, day);
  const isText = !/\d/.test(main);
  return (
    <div className="flex w-full items-stretch rounded-2xl bg-card shadow-soft">
      <button
        type="button"
        onClick={() => onOpen(event)}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 pl-3.5 text-left active:bg-[#f9f3ea] ${event.location ? "pr-1" : "pr-3"}`}
      >
        <span className="flex w-11 shrink-0 flex-col">
          <span className={isText ? "font-round text-[14px] leading-tight" : "num text-[16px] leading-tight font-medium"}>{main}</span>
          {sub && <span className="num mt-0.5 text-[12px] leading-tight text-ink-soft">{sub}</span>}
        </span>
        <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: fill(paint.colors).replace("90deg", "180deg") }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] leading-snug font-medium">
            {paint.emoji && `${paint.emoji} `}
            {event.title}
          </span>
          {event.location && (
            <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-ink-soft">
              <Pin className="shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </span>
      </button>
      {event.location && (
        <a
          href={mapUrl(event.location, event.location_url)}
          target="_blank"
          rel="noreferrer"
          aria-label={`在 Google 地圖打開「${event.location}」`}
          className="m-2 ml-0 grid w-10 shrink-0 place-items-center rounded-xl bg-paper text-ink-soft active:bg-line"
        >
          <MapIcon />
        </a>
      )}
    </div>
  );
}

export type ShiftToggle = { hidden: boolean; onToggle: () => void };

/** 兩人的顏色圖例，旁邊是「顯示／隱藏鼠的班表」 */
export function Legend({ profiles, shiftToggle }: { profiles: Profile[]; shiftToggle?: ShiftToggle }) {
  if (!profiles.length) return null;
  const order = [...profiles].sort((a, b) => (a.role === "neko" ? 0 : 1) - (b.role === "neko" ? 0 : 1));
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-ink-soft">
      {order.map((p) => (
        <span key={p.id} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          {ROLE_EMOJI[p.role]} {p.name}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: fill(order.map((p) => p.color)) }} />
        {TOGETHER_EMOJI} 一起
      </span>
      {shiftToggle && (
        <button
          type="button"
          onClick={shiftToggle.onToggle}
          aria-pressed={!shiftToggle.hidden}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3 font-round text-[13px] ${
            shiftToggle.hidden ? "bg-line/60 text-ink-soft" : "bg-card text-ink shadow-soft"
          }`}
        >
          <span
            className={`size-2 rounded-full ${shiftToggle.hidden ? "border border-ink-soft/60" : ""}`}
            style={shiftToggle.hidden ? undefined : { backgroundColor: order.find((p) => p.role === "nezumi")?.color }}
          />
          {shiftToggle.hidden ? "顯示鼠的班表" : "隱藏鼠的班表"}
        </button>
      )}
    </div>
  );
}
