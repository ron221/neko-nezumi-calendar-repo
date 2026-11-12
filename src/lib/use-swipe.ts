"use client";

import { useRef, type TouchEvent } from "react";

const MIN_DISTANCE = 60; // 至少滑這麼遠（px）
const MAX_TIME = 700; // 太慢的不算（ms）
const EDGE = 24; // 從螢幕最左、最右邊開始的不算：iPhone Safari 從邊緣滑是「上一頁／下一頁」

/**
 * 左右滑：往左滑 onSwipe(1)（下一個）、往右滑 onSwipe(-1)（上一個）。
 * 主要是橫的才算，上下捲動不受影響；不呼叫 preventDefault，捲動照常
 */
export function useSwipe(onSwipe: (dir: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  return {
    onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return (start.current = null);
      const t = e.touches[0];
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return (start.current = null);
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    },
    onTouchEnd(e: TouchEvent) {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Date.now() - s.t > MAX_TIME || Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      onSwipe(dx < 0 ? 1 : -1);
    },
    onTouchCancel() {
      start.current = null;
    },
  };
}
