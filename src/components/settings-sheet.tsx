"use client";

import { useState } from "react";
import { COLOR_CHOICES, ROLE_EMOJI, type Profile } from "@/lib/types";
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
          className="grid size-20 place-items-center rounded-full text-5xl ring-4"
          style={{ backgroundColor: `${me.color}33`, ["--tw-ring-color" as string]: me.color }}
        >
          {ROLE_EMOJI[me.role]}
        </span>
        <p className="text-lg font-bold">{me.name}</p>
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

      {!demo && (
        <button
          type="button"
          onClick={() => (confirmOut ? onSignOut() : setConfirmOut(true))}
          className={`mt-4 h-12 w-full rounded-xl text-[15px] font-medium ring-1 ${
            confirmOut ? "bg-danger text-white ring-danger" : "bg-card text-danger ring-line"
          }`}
        >
          {confirmOut ? "確定要登出嗎？再按一次" : "登出"}
        </button>
      )}
    </Sheet>
  );
}
