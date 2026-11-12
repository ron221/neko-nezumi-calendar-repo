import { isSameDay, timeKey } from "@/lib/dates";
import { ROLE_EMOJI, type CalEvent, type Profile } from "@/lib/types";
import type { ProfileLookup } from "./calendar-app";
import { Pin } from "./icons";

export const FALLBACK_COLOR = "#a89b8e";

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

/** 標題前面的建立者 emoji（🐱 或 🐭），讓人一眼看出是誰的行程 */
export function ownerEmoji(owner?: Profile) {
  return owner ? `${ROLE_EMOJI[owner.role]} ` : "";
}

/** 一個行程的卡片（月曆下方當天清單、週曆用） */
export function EventRow({ event, day, profileOf, onOpen }: {
  event: CalEvent;
  day: Date;
  profileOf: ProfileLookup;
  onOpen: (e: CalEvent) => void;
}) {
  const owner = profileOf(event.created_by);
  const color = owner?.color ?? FALLBACK_COLOR;
  const [main, sub] = timeParts(event, day);
  const isText = !/\d/.test(main);
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="flex w-full items-center gap-3 rounded-2xl bg-card py-3 pr-3 pl-3.5 text-left shadow-soft active:bg-[#f9f3ea]"
    >
      <span className="flex w-11 shrink-0 flex-col">
        <span className={isText ? "font-round text-[14px] leading-tight" : "num text-[16px] leading-tight font-medium"}>{main}</span>
        {sub && <span className="num mt-0.5 text-[12px] leading-tight text-ink-soft">{sub}</span>}
      </span>
      <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15.5px] leading-snug font-medium">
          {ownerEmoji(owner)}
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
  );
}

/** 兩人的顏色圖例 */
export function Legend({ profiles }: { profiles: Profile[] }) {
  if (!profiles.length) return null;
  const order = [...profiles].sort((a, b) => (a.role === "neko" ? 0 : 1) - (b.role === "neko" ? 0 : 1));
  return (
    <div className="flex justify-center gap-4 text-[12px] text-ink-soft">
      {order.map((p) => (
        <span key={p.id} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          {ROLE_EMOJI[p.role]} {p.name}
        </span>
      ))}
    </div>
  );
}
