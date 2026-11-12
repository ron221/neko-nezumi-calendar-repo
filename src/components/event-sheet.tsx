"use client";

import { useState, type ReactNode } from "react";
import { addDays, dateKey, fromKeys, timeKey } from "@/lib/dates";
import { ROLE_EMOJI, type CalEvent, type EventDraft } from "@/lib/types";
import type { ProfileLookup } from "./calendar-app";
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
  };
}

export function EventSheet({ event, defaultDay, profileOf, onSave, onDelete, onClose }: {
  event: CalEvent | null;
  defaultDay: Date;
  profileOf: ProfileLookup;
  onSave: (draft: EventDraft) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onClose: () => void;
}) {
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
    return {
      id: event?.id,
      title,
      all_day: form.allDay,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      location: form.location.trim() || null,
      note: form.note.trim() || null,
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

  const owner = event ? profileOf(event.created_by) : undefined;

  return (
    <Sheet title={event ? "編輯行程" : "新增行程"} onClose={onClose}>
      <div className="flex items-center justify-between py-2">
        <button type="button" onClick={onClose} className="h-9 px-1 text-[15px] text-ink-soft">
          取消
        </button>
        <h2 className="text-base font-bold">{event ? "編輯行程" : "新增行程"}</h2>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="h-9 rounded-full bg-accent px-4 text-[15px] font-bold text-white disabled:opacity-50"
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
          className="h-12 rounded-xl bg-card px-3.5 text-[17px] font-medium ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="rounded-xl bg-card ring-1 ring-line">
          <label className="flex h-12 items-center justify-between px-3.5">
            <span>全天</span>
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => set("allDay", e.target.checked)}
              className="size-5 accent-[var(--color-accent)]"
            />
          </label>
          <Row label="開始">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setStart(e.target.value, form.startTime)}
              className="field"
            />
            {!form.allDay && (
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setStart(form.startDate, e.target.value)}
                className="field"
              />
            )}
          </Row>
          <Row label="結束">
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className="field" />
            {!form.allDay && (
              <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} className="field" />
            )}
          </Row>
        </div>

        <input
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="地點"
          maxLength={200}
          className="h-12 rounded-xl bg-card px-3.5 ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
        />
        <textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="備註"
          rows={3}
          maxLength={2000}
          className="resize-none rounded-xl bg-card px-3.5 py-3 ring-1 ring-line outline-none focus:ring-2 focus:ring-accent"
        />

        <p className="min-h-5 text-sm text-danger" role="alert">
          {error}
        </p>

        {event && (
          <>
            <p className="text-center text-xs text-ink-soft">
              {owner ? `${ROLE_EMOJI[owner.role]} ${owner.name}建立的` : ""}
              ・最後修改 {new Date(event.updated_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
            </p>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className={`h-12 rounded-xl text-[15px] font-medium ring-1 ${
                confirmDelete ? "bg-danger text-white ring-danger" : "bg-card text-danger ring-line"
              }`}
            >
              {confirmDelete ? "確定要刪除嗎？再按一次" : "刪除行程"}
            </button>
          </>
        )}
      </form>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-12 items-center gap-2 border-t border-line px-3.5">
      <span className="w-10 shrink-0">{label}</span>
      <div className="flex min-w-0 flex-1 justify-end gap-2">{children}</div>
    </div>
  );
}
