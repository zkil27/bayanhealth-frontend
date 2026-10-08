import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A status, said in words with an icon beside them. Never color alone.
 *
 * One shape for every status chip in the doctor app, so "Needs review" in a
 * checklist row and "Needs review" in a finish dialog are visibly the same
 * thing. Statuses are not buttons: this renders a plain `span` and has no
 * hover state, following the GOV.UK / NHS task-list rule that a tag which
 * looks clickable gets clicked.
 *
 * Tones are semantic, not colors:
 * - `neutral`: nothing has happened yet (Not started, Optional).
 * - `ai`: a model is writing or wrote this (Drafting).
 * - `attention`: the physician needs to act (Needs review, Out of date).
 * - `info`: attested by the physician, not yet shared (Signed).
 * - `success`: finished (Released, Saved).
 * - `danger`: emergency or blocked only (Red flag).
 */
export type StatusTone = "neutral" | "ai" | "attention" | "info" | "success" | "danger";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "border-(--border-default) bg-(--surface-card) text-(--text-muted)",
  ai: "border-(--ai-border)/50 bg-(--ai-bg) text-(--ai-fg)",
  attention: "border-(--attention-border)/40 bg-(--attention-bg) text-(--attention-fg)",
  info: "border-(--navy-300)/70 bg-(--status-pilot-bg) text-(--status-pilot-fg)",
  success: "border-(--status-available-fg)/25 bg-(--status-available-bg) text-(--status-available-fg)",
  danger: "border-(--danger-border)/50 bg-(--danger-bg) text-(--danger-fg)",
};

export function StatusText({
  tone,
  icon: Icon,
  children,
  size = "default",
  className,
}: {
  tone: StatusTone;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: ReactNode;
  /** `sm` for dense rows; both keep a 12px minimum. */
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <span
      data-slot="status-text"
      data-tone={tone}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-px text-xs" : "px-2.5 py-0.5 text-xs",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  );
}
