"use client";

import { useState } from "react";
import { COLOR_CHOICES, ROLE_EMOJI, type Profile } from "@/lib/types";
import { tint } from "@/lib/color";
import { Sheet } from "./sheet";

export function SettingsSheet({ me, demo, onColor, onSignOut, onClose }: {
  me: Profile;
  demo: boolean;
  onColor: (color: string) => Promise<string | null>;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <Sheet title="設定" onClose={onClose}>
      <div className="flex flex-col items-center gap-2 pt-3">
        <span
          className="grid size-20 place-items-center rounded-full text-5xl shadow-soft ring-4 ring-card"
          style={{ backgroundColor: tint(me.color, 0.3) }}
        >
          {ROLE_EMOJI[me.role]}
        </span>
        <p className="font-round text-[20px]">{me.name}</p>
      </div>

      <h3 className="mt-6 mb-2 text-sm font-medium text-ink-soft">我的顏色（我建立的行程用這個顏色）</h3>
      <div className="grid grid-cols-8 gap-2">
        {COLOR_CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={c.toLowerCase() === me.color.toLowerCase()}
            onClick={async () => setError((await onColor(c)) ?? "")}
            className="aspect-square rounded-full ring-offset-2 ring-offset-paper aria-pressed:ring-2 aria-pressed:ring-ink"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <p className="mt-2 min-h-5 text-sm text-danger">{error}</p>

      <ShiftSync demo={demo} />

      {!demo && (
        <button
          type="button"
          onClick={() => (confirmOut ? onSignOut() : setConfirmOut(true))}
          className={`mt-4 h-12 w-full rounded-2xl text-[15px] font-medium ${
            confirmOut ? "bg-danger text-white" : "bg-card text-danger shadow-soft"
          }`}
        >
          {confirmOut ? "確定要登出嗎？再按一次" : "登出"}
        </button>
      )}
    </Sheet>
  );
}

type SyncResponse = { ok: boolean; error?: string; added?: number; updated?: number; removed?: number; unchanged?: number };

/** 鼠的班表：每天早上 6 點自動同步，也可以按「現在同步」 */
function ShiftSync({ demo }: { demo: boolean }) {
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [message, setMessage] = useState("");

  const run = async () => {
    if (demo) return setMessage("示範模式不能同步");
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/shifts/sync", { method: "POST" });
      const r = (await res.json()) as SyncResponse;
      setMessage(
        r.ok
          ? r.added || r.updated || r.removed
            ? `同步好了：新增 ${r.added}、更新 ${r.updated}、刪除 ${r.removed}`
            : "同步好了，班表沒有變動"
          : (r.error ?? "同步失敗"),
      );
    } catch {
      setMessage("沒有網路，等一下再試");
    }
    setState("idle");
  };

  return (
    <section className="mt-4 rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-round text-[15px]">🐭 鼠的班表</h3>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">每天早上 6 點自動匯入這個月和下個月</p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={state === "busy"}
          className="h-9 shrink-0 rounded-full bg-ink px-4 text-[14px] text-paper disabled:opacity-50"
        >
          {state === "busy" ? "同步中…" : "現在同步"}
        </button>
      </div>
      {message && <p className="mt-2 text-[13px] text-ink-soft">{message}</p>}
    </section>
  );
}
