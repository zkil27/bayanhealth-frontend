/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Doctor header dark-mode toggle (Figma D1 dashboard: the moon icon button
 * beside search). Distinct from the shared `ModeToggle` dropdown
 * (light/dark/system) used elsewhere in the app — the D1 header shows a
 * single icon button that flips the resolved theme directly, with no menu.
 *
 * Renders nothing until mounted, matching `ModeToggle`'s guard: the resolved
 * theme is only known client-side, so rendering a icon before hydration risks
 * showing the wrong one for a `system`-resolved theme.
 */
export function DoctorThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-full cursor-pointer items-center justify-center"
    >
      {isDark ? <Sun /> : <Moon />}
    </button>
  );
}
