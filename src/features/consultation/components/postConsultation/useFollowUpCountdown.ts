"use client";

import { useEffect, useState } from "react";

/** Below this the countdown takes the attention tone and says so. */
export const FOLLOW_UP_ENDING_MS = 30_000;

export type FollowUpPhase = "idle" | "active" | "ending" | "closed";

/**
 * Seconds left in a follow-up window, read off the wall clock every second
 * (not by counting ticks, so a throttled background tab stays accurate).
 */
export function useFollowUpCountdown(writableUntil: string | null): {
  remainingMs: number;
  phase: FollowUpPhase;
} {
  const deadline = writableUntil ? Date.parse(writableUntil) : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) window.clearInterval(timer);
    };
    // First tick right away (a stale `now` would read past 3:00 for a second).
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [deadline]);

  if (deadline === null) return { remainingMs: 0, phase: "idle" };
  const remainingMs = Math.max(0, deadline - now);
  if (remainingMs === 0) return { remainingMs, phase: "closed" };
  return { remainingMs, phase: remainingMs <= FOLLOW_UP_ENDING_MS ? "ending" : "active" };
}
