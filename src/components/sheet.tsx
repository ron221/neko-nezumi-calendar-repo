"use client";

import { useEffect, type ReactNode } from "react";

/** 從底部出現的面板。背景點一下或按 Esc 關掉 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // 面板打開時後面的頁面不要跟著捲
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade bg-black/35" onClick={onClose} />
      <div
        className="relative mx-auto flex max-h-[92dvh] w-full max-w-xl animate-sheet flex-col rounded-t-3xl bg-paper shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
        <div className="overflow-y-auto overscroll-contain px-5 pt-2 pb-5">{children}</div>
      </div>
    </div>
  );
}
