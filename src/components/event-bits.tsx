import { isSameDay, timeKey } from "@/lib/dates";
import { ROLE_EMOJI, type CalEvent } from "@/lib/types";
import type { ProfileLookup } from "./calendar-app";

export const FALLBACK_COLOR = "#9a9187";

/** 「全天」「09:00–10:30」「11/14 起」之類的時間說明，以 day 這天的角度來看 */
export function timeLabel(e: CalEvent, day: Date) {
  const s = new Date(e.start_at);
  const end = new Date(e.end_at);
  if (e.all_day) return "全天";
  const startsToday = isSameDay(s, day);
  const endsToday = isSameDay(end, day) || end.getTime() === s.getTime();
  if (startsToday && endsToday) return end > s ? `${timeKey(s)}–${timeKey(end)}` : timeKey(s);
  if (startsToday) return `${timeKey(s)} 起`;
  if (isSameDay(end, day)) return `到 ${timeKey(end)}`;
  return "整天";
}

/** 一個行程的列（月曆下方當天清單、週曆用） */
export function EventRow({ event, day, profileOf, onOpen }: {
  event: CalEvent;
  day: Date;
  profileOf: ProfileLookup;
  onOpen: (e: CalEvent) => void;
}) {
  const owner = profileOf(event.created_by);
  const color = owner?.color ?? FALLBACK_COLOR;
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="flex w-full items-stretch gap-3 rounded-xl bg-card px-3 py-2.5 text-left ring-1 ring-line active:bg-line/50"
    >
      <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{event.title}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-soft">
          {timeLabel(event, day)}
          {event.location ? `・${event.location}` : ""}
        </span>
      </span>
      <span className="self-center text-lg" aria-label={owner?.name}>
        {owner ? ROLE_EMOJI[owner.role] : ""}
      </span>
    </button>
  );
}
