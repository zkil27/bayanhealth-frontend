"use client";

import { memo, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type SoapLetter = "S" | "O" | "A" | "P";

/**
 * One SOAP section of the post-consult workspace.
 *
 * The workspace reads top to bottom as the note every physician already
 * knows how to read: Subjective, Objective, Assessment, Plan. Each section
 * uses this shell, so the four look and behave the same: a letter, a title,
 * and, when folded, a one-line summary of what is inside. That summary is how
 * a doctor in the Deliver phase can still see the diagnosis and vitals while
 * the documents take the room.
 *
 * Folding is a disclosure, not navigation: the header is one button with
 * `aria-expanded`, and nothing interactive sits inside it.
 */
export const WorkspaceSection = memo(function WorkspaceSection({
  id,
  letter,
  title,
  summary,
  meta,
  open = true,
  onOpenChange,
  locked = false,
  children,
  className,
  bodyClassName,
  headerClassName,
}: {
  id: string;
  letter: SoapLetter;
  title: string;
  /** Shown in the header while folded, so the section still reports its content. */
  summary?: ReactNode;
  /** Right side of the header: a status or save state. Never interactive. */
  meta?: ReactNode;
  open?: boolean;
  /** Omit to make the section permanently open. */
  onOpenChange?: (open: boolean) => void;
  /** Not reachable yet (Plan before the Assessment is confirmed). */
  locked?: boolean;
  children?: ReactNode;
  className?: string;
  /** Override the body padding, e.g. `p-0` for a flush split layout. */
  bodyClassName?: string;
  /** e.g. hide the header on a phone while the body is a full-screen view. */
  headerClassName?: string;
}) {
  const collapsible = Boolean(onOpenChange) && !locked;
  const bodyId = `${id}-body`;
  const headingId = `${id}-heading`;

  const headerContent = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          locked
            ? "bg-(--gray-bg) text-(--text-subtle)"
            : "bg-(--surface-brand-soft) text-(--navy-700) dark:text-(--navy-300)",
        )}
      >
        {letter}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <span
          id={headingId}
          className={cn(
            "shrink-0 text-[15px] font-bold",
            locked ? "text-(--text-muted)" : "text-(--text-heading)",
          )}
        >
          {title}
        </span>
        {summary && (!open || locked) ? (
          // One line that never wraps: chips and text sit side by side, and
          // whatever does not fit is clipped at the end, not pushed to a second line.
          <span className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm text-(--text-muted)">
            {typeof summary === "string" ? <span className="min-w-0 truncate">{summary}</span> : summary}
          </span>
        ) : null}
      </span>
      {meta ? <span className="flex shrink-0 items-center gap-2">{meta}</span> : null}
      {collapsible ? (
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-(--text-muted) transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      ) : null}
    </>
  );

  return (
    <section
      id={id}
      data-slot="workspace-section"
      data-letter={letter}
      data-open={open && !locked}
      aria-labelledby={headingId}
      className={cn(
        "min-w-0 scroll-mt-28 rounded-2xl border bg-(--surface-card)",
        locked ? "border-dashed border-(--border-default)" : "border-(--border-subtle)",
        className,
      )}
    >
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => onOpenChange?.(!open)}
          className={cn(
            "flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-(--surface-warm-soft)/60 focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none sm:px-5",
            headerClassName,
          )}
        >
          {headerContent}
        </button>
      ) : (
        <div className={cn("flex min-h-14 items-center gap-3 px-4 py-3 sm:px-5", headerClassName)}>{headerContent}</div>
      )}

      {open && !locked ? (
        <div id={bodyId} className={cn("border-t border-(--border-subtle) px-4 py-4 sm:px-5", bodyClassName)}>
          {children}
        </div>
      ) : null}
    </section>
  );
});

/**
 * A read-only "from the patient's intake" block inside a section, visibly
 * separate from what the physician writes beneath it.
 */
export const IntakeBlock = memo(function IntakeBlock({
  label = "From the patient's intake",
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="intake-block"
      className={cn("rounded-xl bg-(--surface-warm-soft) p-3.5", className)}
    >
      <p className="mb-2 text-xs font-semibold text-(--text-muted)">{label}</p>
      {children}
    </div>
  );
});
