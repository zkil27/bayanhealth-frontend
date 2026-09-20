"use client";

import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

/**
 * Selectable pill chip. The active state uses the same green (`--safe-fg` on
 * `--safe-bg`) as the "No known allergies" / "No pre-existing conditions"
 * assertions in About You and Medical History, so a chosen option reads the
 * same way everywhere in the intake form.
 */
export function ChipButton({
  selected,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors sm:min-h-9",
        FOCUS,
        "disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-(--surface-nav-accent) bg-(--safe-bg) font-bold text-(--safe-fg)"
          : "border-(--border-default) bg-(--surface-canvas) text-(--text-body) hover:bg-(--gray-bg)",
        className,
      )}
      {...props}
    >
      {selected ? <Check aria-hidden className="size-3.5" /> : null}
      {children}
    </button>
  );
}

/**
 * Two-option segmented control (e.g. "No" / "Yes"). The selected button uses
 * the same green as selected chips and "no allergies/conditions" assertions,
 * so all selection patterns read the same across the form.
 */
export function SegmentedToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap rounded-xl bg-(--gray-bg) p-1 text-xs"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-lg px-3.5 transition-all sm:min-h-9",
              FOCUS,
              selected
                ? "bg-(--safe-bg) font-bold text-(--safe-fg) shadow-sm"
                : "font-medium text-(--text-muted) hover:text-(--text-body)",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Uppercase eyebrow label used to head each block inside a step. */
export function BlockLabel({
  children,
  required = false,
  htmlFor,
  id,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
  id?: string;
}) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <Tag
      id={id}
      htmlFor={htmlFor}
      className="block text-xs font-bold tracking-wider text-(--text-muted) uppercase"
    >
      {children}
      {required ? (
        <>
          {" "}
          <span aria-hidden className="text-(--danger-fg)">*</span>
          <span className="sr-only">(required)</span>
        </>
      ) : null}
    </Tag>
  );
}

/**
 * Smooth height + opacity disclosure. Children stay mounted so the row
 * animates from 0fr to 1fr instead of popping in; while closed the content is
 * `inert`, so it can't be focused or read by screen readers.
 */
export function Reveal({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="reveal"
      data-state={open ? "open" : "closed"}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      {/* Padding + negative margin keep focus rings from being clipped. */}
      <div inert={!open} className="-m-1 min-h-0 overflow-hidden p-1">
        {children}
      </div>
    </div>
  );
}

export const COMPACT_INPUT =
  "w-full rounded-xl border border-(--border-default) bg-(--surface-raised) px-3 py-2 text-sm text-(--text-body) outline-none placeholder:text-(--text-subtle) focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-(--surface-nav-accent) aria-invalid:border-(--danger-border)";
