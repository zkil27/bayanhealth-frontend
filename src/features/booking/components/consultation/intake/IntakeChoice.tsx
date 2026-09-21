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
 * Mobile-first structured condition tile designed for balanced 2-column or 3-column
 * intake grids. Replaces ragged variable-width chips with equal-dimension,
 * high-affordance selectable cards.
 */
export function ConditionTile({
  selected,
  disabled,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all sm:min-h-11 sm:text-[13px]",
        FOCUS,
        "disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-(--surface-nav-accent) bg-(--safe-bg) font-bold text-(--safe-fg) shadow-xs ring-1 ring-(--surface-nav-accent)"
          : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-md border text-[10px] transition-colors",
          selected
            ? "border-transparent bg-(--surface-nav-accent) text-white"
            : "border-(--border-strong) bg-(--surface-canvas) group-hover:border-(--surface-nav-accent)",
        )}
      >
        {selected ? <Check className="size-3 stroke-[3]" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

/**
 * Mobile-first dual/multi ChoiceCard. Provides high visual affordance with clear
 * 1px solid borders, visible radio indicator circle, and explicit touch states
 * so options are unmistakably interactive.
 */
export function ChoiceCard({
  selected,
  disabled,
  onClick,
  title,
  description,
  className,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[52px] w-full items-center gap-3 rounded-xl border p-3 text-left transition-all sm:min-h-[56px]",
        FOCUS,
        "disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-(--surface-nav-accent) bg-(--safe-bg)/60 text-(--text-heading) shadow-xs ring-1 ring-(--surface-nav-accent)"
          : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-(--surface-nav-accent) bg-(--surface-nav-accent) text-white"
            : "border-(--border-strong) bg-(--surface-canvas) group-hover:border-(--surface-nav-accent)",
        )}
      >
        {selected ? <span className="size-2 rounded-full bg-white" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-xs sm:text-[13px]",
            selected ? "font-bold text-(--text-heading)" : "font-medium text-(--text-body)",
          )}
        >
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[11px] text-(--text-muted) sm:text-xs">
            {description}
          </span>
        ) : null}
      </div>
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
  className,
}: {
  label: string;
  value: T | undefined;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid w-full rounded-xl border border-(--border-subtle) bg-(--surface-canvas) p-1 text-xs sm:inline-grid sm:w-auto",
        options.length === 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-4",
        className,
      )}
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
              "flex min-h-11 items-center justify-center rounded-lg px-3.5 text-center text-xs font-semibold transition-all sm:min-h-9",
              FOCUS,
              selected
                ? "bg-(--safe-bg) font-bold text-(--safe-fg) shadow-xs ring-1 ring-(--surface-nav-accent)"
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
