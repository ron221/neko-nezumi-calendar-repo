"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { WEEKDAYS, addDays, dateKey, fromKeys, timeKey } from "@/lib/dates";
import { ROLE_EMOJI, ROLE_NAME, isShift, mapUrl, type CalEvent, type EventDraft, type Place, type Profile, type Role } from "@/lib/types";
import { tint } from "@/lib/color";
import { MapIcon, Pin } from "./icons";
import type { ProfileLookup } from "./calendar-app";
import type { Occurrence } from "@/lib/recurrence";
import { Sheet } from "./sheet";
import { TOGETHER_EMOJI } from "./paint";

type Form = {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  locationUrl: string;
  note: string;
  repeat: "" | "weekly" | "yearly"; // "" = 不重複
  repeatUntil: string; // "" = 一直重複
  who: Role | "together"; // 是誰的行程
};

function initialForm(event: CalEvent | null, defaultDay: Date, whoOf: (e: CalEvent) => Form["who"], myRole: Role): Form {
  if (event) {
    const s = new Date(event.start_at);
    let e = new Date(event.end_at);
    if (event.all_day) e = addDays(e, -1); // 存的是隔天 00:00，畫面上顯示最後一天
    return {
      title: event.title,
      allDay: event.all_day,
      startDate: dateKey(s),
      startTime: timeKey(s),
      endDate: dateKey(e),
      endTime: event.all_day ? "10:00" : timeKey(e),
      location: event.location ?? "",
      locationUrl: event.location_url ?? "",
      note: event.note ?? "",
      repeat: event.repeat ?? "",
      repeatUntil: event.repeat_until ?? "",
      who: whoOf(event),
    };
  }
  // 新的行程：選的那天、下一個整點開始、一小時
  const now = new Date();
  const hour = Math.min(now.getHours() + 1, 23);
  return {
    title: "",
    allDay: false,
    startDate: dateKey(defaultDay),
    startTime: `${String(hour).padStart(2, "0")}:00`,
    endDate: dateKey(defaultDay),
    endTime: hour === 23 ? "23:59" : `${String(hour + 1).padStart(2, "0")}:00`,
    location: "",
    locationUrl: "",
    note: "",
    repeat: "",
    repeatUntil: "",
    who: myRole, // 預設是自己的
  };
}

export function EventSheet({ event: picked, series, defaultDay, profiles, me, profileOf, onSave, onDelete, onSkip, loadPlaces, onClose }: {
  event: Occurrence | null;
  series?: CalEvent; // 點的是每週重複的其中一次時，它的本體
  defaultDay: Date;
  profiles: Profile[];
  me: Profile | null;
  profileOf: ProfileLookup;
  onSave: (draft: EventDraft) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onSkip: (id: string, date: string) => Promise<string | null>;
  loadPlaces: () => Promise<Place[]>;
  onClose: () => void;
}) {
  const [places, setPlaces] = useState<Place[]>([]);
  useEffect(() => {
    let alive = true;
    loadPlaces().then((p) => alive && setPlaces(p));
    return () => {
      alive = false;
    };
  }, [loadPlaces]);
  // 每週重複的行程：改的、刪的都是整個系列（本體），「只刪這一次」另外處理
  const event = series ?? picked;
  const once = picked?.occurrenceDate;
  const byRole = (r: Role) => profiles.find((p) => p.role === r);
  const whoOf = (e: CalEvent): Form["who"] => (e.together ? "together" : (profileOf(e.owner_id ?? e.created_by)?.role ?? "neko"));
  const [form, setForm] = useState(() => initialForm(event, defaultDay, whoOf, me?.role ?? "neko"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  // 改開始時間時，結束時間跟著移動，長度不變
  const setStart = (date: string, time: string) => {
    setForm((f) => {
      const oldStart = fromKeys(f.startDate, f.startTime).getTime();
      const oldEnd = fromKeys(f.endDate, f.endTime).getTime();
      const newStart = fromKeys(date, time);
      const end = new Date(newStart.getTime() + Math.max(0, oldEnd - oldStart));
      return { ...f, startDate: date, startTime: time, endDate: dateKey(end), endTime: timeKey(end) };
    });
  };

  const toDraft = (): EventDraft | string => {
    const title = form.title.trim();
    if (!title) return "寫一下標題";
    if (!form.startDate || !form.endDate) return "選一下日期";
    let start: Date, end: Date;
    if (form.allDay) {
      start = fromKeys(form.startDate);
      end = addDays(fromKeys(form.endDate), 1);
    } else {
      start = fromKeys(form.startDate, form.startTime);
      end = fromKeys(form.endDate, form.endTime);
    }
    if (end < start) return "結束不能比開始早";
    if (form.repeat && form.repeatUntil && form.repeatUntil < form.startDate) return "重複的最後一天不能比開始早";
    const url = form.locationUrl.trim();
    if (url && !/^https?:\/\/\S+$/.test(url)) return "地圖連結要是網址（https:// 開頭）";
    return {
      id: event?.id,
      title,
      all_day: form.allDay,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      location: form.location.trim() || null,
      location_url: form.location.trim() && url ? url : null,
      note: form.note.trim() || null,
      repeat: form.repeat || null,
      repeat_until: form.repeat && form.repeatUntil ? form.repeatUntil : null,
      together: form.who === "together",
      owner_id: form.who === "together" ? null : (byRole(form.who)?.id ?? null),
    };
  };

  const submit = async () => {
    const draft = toDraft();
    if (typeof draft === "string") return setError(draft);
    setBusy(true);
    const err = await onSave(draft);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  const remove = async () => {
    if (!event) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    const err = await onDelete(event.id);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  const skip = async () => {
    if (!event || !once) return;
    setBusy(true);
    const err = await onSkip(event.id, once);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  const creator = event ? profileOf(event.created_by) : undefined;

  return (
    <Sheet title={event ? "編輯行程" : "新增行程"} onClose={onClose}>
      <div className="flex items-center justify-between py-2">
        <button type="button" onClick={onClose} className="h-9 px-1 text-[15px] text-ink-soft">
          取消
        </button>
        <h2 className="font-round text-[17px]">{event ? "編輯行程" : "新增行程"}</h2>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="h-9 rounded-full bg-ink px-4 text-[15px] font-medium text-paper disabled:opacity-50"
        >
          {busy ? "存檔中" : "儲存"}
        </button>
      </div>

      <form
        className="mt-2 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="標題"
          maxLength={200}
          enterKeyHint="done"
          className="h-12 rounded-2xl bg-card px-3.5 text-[17px] font-medium shadow-soft outline-none focus:ring-2 focus:ring-accent/50"
        />

        <div className="flex h-[52px] items-center gap-2 rounded-2xl bg-card px-3.5 shadow-soft">
          <span className="shrink-0">誰的</span>
          <div className="ml-auto flex rounded-full bg-line/55 p-[3px]" role="radiogroup" aria-label="是誰的行程">
            {(["neko", "nezumi", "together"] as const).map((w) => {
              const on = form.who === w;
              const color = w === "together" ? null : byRole(w)?.color;
              return (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set("who", w)}
                  className={`h-8 rounded-full px-2.5 text-[14px] whitespace-nowrap ${on ? "text-ink shadow-soft" : "text-ink-soft"}`}
                  style={
                    on
                      ? {
                          background:
                            w === "together"
                              ? `linear-gradient(90deg, ${tint(byRole("neko")?.color ?? "#F2994A", 0.3)}, ${tint(byRole("nezumi")?.color ?? "#6C9BD2", 0.3)})`
                              : tint(color ?? "#cccccc", 0.3),
                        }
                      : undefined
                  }
                >
                  {w === "together" ? `${TOGETHER_EMOJI} 一起` : `${ROLE_EMOJI[w]} ${ROLE_NAME[w]}`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-card shadow-soft">
          <label className="flex h-[52px] items-center justify-between px-3.5">
            <span>全天</span>
            <Switch checked={form.allDay} onChange={(v) => set("allDay", v)} />
          </label>
          <Row label="開始">
            <PickerField
              type="date"
              value={form.startDate}
              display={shortDate(form.startDate)}
              onChange={(v) => setStart(v, form.startTime)}
              className="flex-1"
            />
            {!form.allDay && (
              <PickerField type="time" value={form.startTime} display={form.startTime} onChange={(v) => setStart(form.startDate, v)} className="w-[76px]" />
            )}
          </Row>
          <Row label="結束">
            <PickerField
              type="date"
              value={form.endDate}
              display={shortDate(form.endDate)}
              onChange={(v) => set("endDate", v)}
              className="flex-1"
            />
            {!form.allDay && (
              <PickerField type="time" value={form.endTime} display={form.endTime} onChange={(v) => set("endTime", v)} className="w-[76px]" />
            )}
          </Row>
          <div className="flex h-[52px] items-center justify-between gap-2 border-t border-line/70 px-3.5">
            <span className="shrink-0">重複</span>
            <div className="flex rounded-full bg-line/55 p-[3px]" role="radiogroup" aria-label="重複">
              {(
                [
                  ["", "不重複"],
                  ["weekly", "每週"],
                  ["yearly", "每年"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={form.repeat === v}
                  onClick={() => set("repeat", v)}
                  className={`h-8 rounded-full px-3 text-[14px] ${form.repeat === v ? "bg-card text-ink shadow-soft" : "text-ink-soft"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {form.repeat && (
            <Row label="直到">
              {form.repeatUntil && (
                <button type="button" onClick={() => set("repeatUntil", "")} className="h-9 px-1 text-[13px] text-ink-soft">
                  清除
                </button>
              )}
              <PickerField
                type="date"
                value={form.repeatUntil || form.startDate}
                display={form.repeatUntil ? shortDate(form.repeatUntil) : "一直重複"}
                onChange={(v) => set("repeatUntil", v)}
                className="w-[150px]"
              />
            </Row>
          )}
        </div>

        <LocationField
          value={form.location}
          url={form.locationUrl}
          places={places}
          onChange={(location, locationUrl) => setForm((f) => ({ ...f, location, locationUrl: locationUrl ?? f.locationUrl }))}
          onUrl={(v) => set("locationUrl", v)}
        />
        <textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="備註"
          rows={3}
          maxLength={2000}
          className="resize-none rounded-2xl bg-card px-3.5 py-3 shadow-soft outline-none focus:ring-2 focus:ring-accent/50"
        />

        <p className="min-h-5 text-sm text-danger" role="alert">
          {error}
        </p>

        {event && isShift(event) && (
          <p className="rounded-xl bg-[#e9eff7] px-3 py-2 text-[13px] leading-relaxed text-[#3d5675]">
            這是從鼠的班表自動匯入的，每天早上 6 點會重新同步。在這裡改的內容，下次同步時會被班表蓋掉；要改班請到班表網站。
          </p>
        )}
        {once && (
          <p className="rounded-xl bg-accent-soft/70 px-3 py-2 text-[13px] leading-relaxed text-[#8a4a2b]">
            {event!.repeat === "yearly"
              ? `這是每年 ${new Date(event!.start_at).getMonth() + 1}/${new Date(event!.start_at).getDate()} 重複的行程。在這裡改的會套用到每一年。`
              : `這是每週${WEEKDAYS[new Date(event!.start_at).getDay()]}重複的行程。在這裡改的會套用到每一週；只有某一週不去的話，按下面的「只刪這一次」。`}
          </p>
        )}
        {event && (
          <>
            <p className="text-center text-xs text-ink-soft">
              {creator ? `${ROLE_EMOJI[creator.role]} ${creator.name}新增的` : ""}
              ・最後修改 {new Date(event.updated_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
            </p>
            {once && (
              <button
                type="button"
                onClick={skip}
                disabled={busy}
                className="h-12 rounded-2xl bg-card text-[15px] font-medium text-danger shadow-soft"
              >
                只刪 {Number(once.slice(5, 7))}/{Number(once.slice(8, 10))} 這一次
              </button>
            )}
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className={`h-12 rounded-2xl text-[15px] font-medium ${
                confirmDelete ? "bg-danger text-white" : "bg-card text-danger shadow-soft"
              }`}
            >
              {confirmDelete ? "確定要刪除嗎？再按一次" : once ? (event?.repeat === "yearly" ? "刪除每一年" : "刪除每一週") : "刪除行程"}
            </button>
          </>
        )}
      </form>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-[52px] items-center gap-2 border-t border-line/70 px-3.5">
      <span className="w-9 shrink-0">{label}</span>
      <div className="flex min-w-0 flex-1 justify-end gap-2">{children}</div>
    </div>
  );
}

/** iOS 風格的開關 */
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[30px] w-[50px] rounded-full transition-colors ${checked ? "bg-accent" : "bg-line"}`}
    >
      <span
        className={`absolute top-[3px] left-[3px] size-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function shortDate(key: string) {
  if (!key) return "";
  const d = fromKeys(key);
  return `${d.getMonth() + 1}月${d.getDate()}日 週${WEEKDAYS[d.getDay()]}`;
}

/**
 * 日期、時間欄位：自己畫出好看的字，透明的原生欄位蓋在上面。
 * 點下去一樣是手機原生的選擇器（iPhone 的滾輪、Android 的日曆），各家瀏覽器的欄位樣式就不會不一樣
 */
function PickerField({ type, value, display, onChange, className = "" }: {
  type: "date" | "time";
  value: string;
  display: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className={`relative grid h-9 min-w-0 place-items-center rounded-[10px] bg-paper px-2 text-[15px] tabular-nums ${className}`}>
      <span className="truncate">{display}</span>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)} // iPhone 的「清除」會給空字串，不理它
        onClick={() => {
          try {
            ref.current?.showPicker(); // 電腦上點一下就打開選擇器
          } catch {}
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </label>
  );
}

/**
 * 地點：打字時下面列出用過的地點（常用的在前面），點一下就填好（連同之前貼過的地圖連結）。
 * 下面一欄可以貼 Google 地圖的連結；沒貼的話，地圖按鈕會用地點名稱去 Google 地圖搜尋
 */
function LocationField({ value, url, places, onChange, onUrl }: {
  value: string;
  url: string;
  places: Place[];
  onChange: (location: string, url?: string) => void;
  onUrl: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const matches = places.filter((p) => p.name !== value.trim() && (!q || p.name.toLowerCase().includes(q))).slice(0, 5);

  return (
    <div className="rounded-2xl bg-card shadow-soft">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // 晚一點才關，點建議的地點時才點得到
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="地點"
        maxLength={200}
        autoComplete="off"
        className="h-12 w-full rounded-2xl bg-transparent px-3.5 outline-none"
      />
      {open && matches.length > 0 && (
        <ul className="border-t border-line/70 py-1" aria-label="用過的地點">
          {matches.map((p) => (
            <li key={p.name}>
              <button
                type="button"
                onClick={() => {
                  onChange(p.name, p.url ?? "");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left active:bg-paper"
              >
                <Pin className="shrink-0 text-ink-soft" />
                <span className="min-w-0 flex-1 truncate text-[15px]">{p.name}</span>
                {p.url && <MapIcon className="shrink-0 text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.trim() && (
        <div className="flex items-center gap-2 border-t border-line/70 pr-2 pl-3.5">
          <MapIcon className="shrink-0 text-ink-soft" />
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => onUrl(e.target.value)}
            placeholder="貼上 Google 地圖連結（可不填）"
            maxLength={500}
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-[14px]"
          />
          <a
            href={mapUrl(value.trim(), url.trim())}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 font-round text-[13px] text-accent"
          >
            開地圖
          </a>
        </div>
      )}
    </div>
  );
}
