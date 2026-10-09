"use client";

import { useSyncExternalStore } from "react";

type BreakpointMode = "min" | "max";

/**
 * Hook to detect whether the current viewport matches a given breakpoint rule.
 * Uses `useSyncExternalStore` to subscribe directly to `window.matchMedia`,
 * preventing hydration re-render flashes and redundant state allocations.
 * Example:
 *   useIsBreakpoint("max", 768)   // true when width < 768
 *   useIsBreakpoint("min", 1024)  // true when width >= 1024
 */
export function useIsBreakpoint(
  mode: BreakpointMode = "max",
  breakpoint = 768
): boolean {
  const query =
    mode === "min"
      ? `(min-width: ${breakpoint}px)`
      : `(max-width: ${breakpoint - 1}px)`;

  return useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return false;
      }
      return window.matchMedia(query).matches;
    },
    () => false
  );
}
