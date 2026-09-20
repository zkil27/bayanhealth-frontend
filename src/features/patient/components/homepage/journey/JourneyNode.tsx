import { Check, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { JourneyStepStatus } from "@/lib/patient/careJourney";

/**
 * Layer 3: a node's look for its status.
 *
 * The active pulse lives on a pseudo-element (`.journey-node-pulse::before`),
 * so the node's own box never changes size and nothing around it shifts. Its
 * timing is independent of the line's heartbeat.
 */
export function nodeClass(status: JourneyStepStatus): string {
  return cn(
    "flex size-7 items-center justify-center rounded-full border-2",
    status === "complete" &&
      "border-(--surface-nav-accent) bg-(--surface-nav-accent) text-(--text-on-accent)",
    status === "active" &&
      "journey-node-pulse border-(--surface-nav-accent) bg-(--highlight-soft)",
    status === "locked" && "border-dashed border-(--ink-500) bg-(--surface-card) text-(--text-muted)",
  );
}

export function NodeIcon({ status }: { status: JourneyStepStatus }) {
  if (status === "complete") return <Check aria-hidden className="size-3.5" />;
  if (status === "active") {
    return <span aria-hidden className="size-2 rounded-full bg-(--surface-nav-accent)" />;
  }
  return <Lock aria-hidden className="size-3" />;
}

export const STATUS_TEXT: Record<JourneyStepStatus, string> = {
  complete: "Done",
  active: "Current step",
  locked: "Upcoming",
};
