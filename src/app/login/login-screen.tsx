"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_COLOR, ROLE_EMOJI, ROLE_NAME, type Role } from "@/lib/types";
import { tint } from "@/lib/color";
import { signIn } from "./actions";

const PIN_LENGTH = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "del"] as const;

export function LoginScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [pending, startTransition] = useTransition();

  const submit = useCallback(
    (who: Role, code: string) => {
      startTransition(async () => {
        const res = await signIn(who, code);
        if (res.error) {
          setError(res.error);
          setPin("");
          setShake((n) => n + 1);
          return;
        }
        router.replace("/");
        router.refresh();
      });
    },
    [router],
  );

  const press = useCallback(
    (key: string) => {
      if (!role || pending) return;
      if (key === "back") {
        setRole(null);
        setPin("");
        setError("");
        return;
      }
      if (key === "del") {
        setPin((p) => p.slice(0, -1));
        return;
      }
      if (pin.length >= PIN_LENGTH) return;
      const next = pin + key;
      setError("");
      setPin(next);
      if (next.length === PIN_LENGTH) submit(role, next);
    },
    [role, pin, pending, submit],
  );

  // 電腦上也能直接打數字
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Escape") press("back");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <main className="safe-area mx-auto flex min-h-dvh w-full max-w-md flex-col items-center px-6">
      <div className="flex flex-1 flex-col items-center justify-center pt-8 pb-4">
        <p className="text-[10.5px] font-medium tracking-[0.3em] text-ink-soft uppercase">Neko · Nezumi</p>
        <h1 className="mt-2 font-round text-[32px] leading-none">貓鼠日曆</h1>
        <p className="mt-3 font-round text-[15px] text-ink-soft">{role ? `${ROLE_NAME[role]}，輸入密碼` : "誰要登入？"}</p>

        {role ? (
          <>
            <Avatar role={role} size={92} className="mt-7" />
            <div key={shake} className={`mt-7 flex gap-3.5 ${shake ? "animate-shake" : ""}`} aria-label={`已輸入 ${pin.length} 位`}>
              {Array.from({ length: PIN_LENGTH }, (_, i) => (
                <span
                  key={i}
                  className="size-3 rounded-full"
                  style={{ backgroundColor: i < pin.length ? DEFAULT_COLOR[role] : "var(--color-line)" }}
                />
              ))}
            </div>
            <p className="mt-4 h-5 text-sm text-danger" role="alert">
              {pending ? <span className="text-ink-soft">登入中…</span> : error}
            </p>
          </>
        ) : (
          <div className="mt-10 flex gap-7">
            {(["neko", "nezumi"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className="flex flex-col items-center gap-3 active:opacity-70"
              >
                <Avatar role={r} size={116} />
                <span className="font-round text-[18px]">{ROLE_NAME[r]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 數字鍵盤：固定佔位，選頭像前後版面高度不變 */}
      <div className={`grid grid-cols-3 gap-x-6 gap-y-3.5 pb-8 ${role ? "" : "invisible"}`}>
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={!role || pending}
            onClick={() => press(k)}
            className={
              k === "back" || k === "del"
                ? "grid size-[70px] place-items-center rounded-full font-round text-[15px] text-ink-soft active:bg-line/60"
                : "num grid size-[70px] place-items-center rounded-full bg-card text-[28px] shadow-soft active:bg-line"
            }
          >
            {k === "back" ? "換人" : k === "del" ? "⌫" : k}
          </button>
        ))}
      </div>
    </main>
  );
}

/** 頭像：淡淡的自己顏色當底，外面一圈白 */
function Avatar({ role, size, className = "" }: { role: Role; size: number; className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-full shadow-soft ring-4 ring-card ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.58, backgroundColor: tint(DEFAULT_COLOR[role], 0.3) }}
    >
      {ROLE_EMOJI[role]}
    </span>
  );
}
