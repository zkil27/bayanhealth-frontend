/**
 * Which way the intake moved, so the next page slides in from the side the
 * patient is heading (Continue: from the right; Back or an earlier step in
 * the side rail: from the left). UI-only; navigation itself is unchanged.
 */
export type StepDirection = "forward" | "back" | "none";

export function stepDirection(previous: number, next: number): StepDirection {
  if (next > previous) return "forward";
  if (next < previous) return "back";
  return "none";
}

/** tw-animate-css classes for a page entering from `direction` (220ms, 12px). */
export function stepEnterClass(direction: StepDirection): string {
  const base = "animate-in fade-in duration-220 ease-(--ease-out)";
  if (direction === "forward") return `${base} slide-in-from-right-3`;
  if (direction === "back") return `${base} slide-in-from-left-3`;
  return "";
}
