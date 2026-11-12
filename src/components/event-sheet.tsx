"use client";

import { useRef, useState, type ReactNode } from "react";
import { WEEKDAYS, addDays, dateKey, fromKeys, timeKey } from "@/lib/dates";
import { ROLE_EMOJI, isShift, type CalEvent, type EventDraft } from "@/lib/types";
import type { ProfileLookup } from "./calendar-app";
import type { Occurrence } from "@/lib/recurrence";
import { Sheet } from "./sheet";

type Form = {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  note: string;
  repeat: boolean;
  repeatUntil: string; // "" = 一直重複
};

function initialForm(event: CalEvent | null, defaultDay: Date): Form {
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
      note: event.note ?? "",
      repeat: event.repeat === "weekly",
      repeatUntil: event.repeat_until ?? "",
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
    note: "",
    repeat: false,
    repeatUntil: "",
  };
}

export function EventSheet({ event: picked, series, defaultDay, profileOf, onSave, onDelete, onSkip, onClose }: {
  event: Occurrence | null;
  series?: CalEvent; // 點的是每週重複的其中一次時，它的本體
  defaultDay: Date;
  profileOf: ProfileLookup;
  onSave: (draft: EventDraft) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onSkip: (id: string, date: string) => Promise<string | null>;
  onClose: () => void;
}) {
  // 每週重複的行程：改的、刪的都是整個系列（本體），「只刪這一次」另外處理
  const event = series ?? picked;
  const once = picked?.occurrenceDate;
  const [form, setForm] = useState(() => initialForm(event, defaultDay));
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
    return {
      id: event?.id,
      title,
      all_day: form.allDay,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      location: form.location.trim() || null,
      note: form.note.trim() || null,
      repeat: form.repeat ? "weekly" : null,
      repeat_until: form.repeat && form.repeatUntil ? form.repeatUntil : null,
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

  const owner = event ? profileOf(event.created_by) : undefined;

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
          <label className="flex h-[52px] items-center justify-between border-t border-line/70 px-3.5">
            <span>每週重複</span>
            <Switch checked={form.repeat} onChange={(v) => set("repeat", v)} />
          </label>
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

        <input
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="地點"
          maxLength={200}
          className="h-12 rounded-2xl bg-card px-3.5 shadow-soft outline-none focus:ring-2 focus:ring-accent/50"
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
            這是每週{WEEKDAYS[new Date(event!.start_at).getDay()]}重複的行程。在這裡改的會套用到每一週；只有某一週不去的話，按下面的「只刪這一次」。
          </p>
        )}
        {event && (
          <>
            <p className="text-center text-xs text-ink-soft">
              {owner ? `${ROLE_EMOJI[owner.role]} ${owner.name}建立的` : ""}
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
              {confirmDelete ? "確定要刪除嗎？再按一次" : once ? "刪除每一週" : "刪除行程"}
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
