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
        "inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 py-2.5 text-base font-medium transition-colors",
        FOCUS,
        "disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-(--surface-nav-accent) bg-(--safe-bg) font-semibold text-(--safe-fg) ring-1 ring-(--surface-nav-accent)"
          : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
        className,
      )}
      {...props}
    >
      {selected ? <Check aria-hidden className="size-4 shrink-0" /> : null}
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
  description,
  className,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Optional second line under the label. */
  description?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative flex min-h-13 w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-base font-medium transition-colors sm:px-4 sm:py-3",
        FOCUS,
        "disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-(--surface-nav-accent) bg-(--safe-bg) font-semibold text-(--safe-fg) ring-1 ring-(--surface-nav-accent)"
          : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md border text-xs transition-colors",
          selected
            ? "border-transparent bg-(--surface-nav-accent) text-white"
            : "border-(--border-strong) bg-(--surface-canvas) group-hover:border-(--surface-nav-accent)",
        )}
      >
        {selected ? <Check className="size-4 stroke-[3]" /> : null}
      </span>
      <span className="min-w-0 flex-1 leading-snug">
        {children}
        {description ? (
          <span className="mt-0.5 block text-[15px] font-normal text-(--text-muted)">{description}</span>
        ) : null}
      </span>
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
        "group relative flex min-h-14 w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-colors",
        FOCUS,
        "disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-(--surface-nav-accent) bg-(--safe-bg) text-(--text-heading) ring-1 ring-(--surface-nav-accent)"
          : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:border-(--border-strong) hover:bg-(--surface-canvas)",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-5.5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-(--surface-nav-accent) bg-(--surface-nav-accent) text-white"
            : "border-(--border-strong) bg-(--surface-canvas) group-hover:border-(--surface-nav-accent)",
        )}
      >
        {selected ? <span className="size-2.5 rounded-full bg-white" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-base leading-snug",
            selected ? "font-semibold text-(--text-heading)" : "font-medium text-(--text-body)",
          )}
        >
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[15px] leading-snug text-(--text-muted)">
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
        "grid w-full gap-1 rounded-xl border border-(--border-default) bg-(--surface-canvas) p-1 sm:inline-grid sm:w-auto",
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
              "flex min-h-12 items-center justify-center rounded-lg px-5 text-center text-base transition-colors",
              FOCUS,
              selected
                ? "bg-(--safe-bg) font-semibold text-(--safe-fg) ring-1 ring-(--surface-nav-accent)"
                : "font-medium text-(--text-body) hover:bg-(--surface-card)",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The question that heads each block inside a step, in plain sentence case.
 *
 * Required is the default and carries no visible mark: older patients read
 * past the red asterisk convention, so only the few optional questions are
 * labelled — `optional` appends "(optional)" in a quieter weight.
 */
export function BlockLabel({
  children,
  required = false,
  optional = false,
  htmlFor,
  id,
}: {
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  htmlFor?: string;
  id?: string;
}) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <Tag
      id={id}
      htmlFor={htmlFor}
      className="block text-[17px] leading-snug font-semibold text-(--text-heading) sm:text-lg"
    >
      {children}
      {optional ? (
        <span className="font-normal text-(--text-muted)"> (optional)</span>
      ) : null}
      {required ? <span className="sr-only"> (required)</span> : null}
    </Tag>
  );
}

/** Supporting line under a question: one short sentence, never jargon. */
export function FieldHint({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <p id={id} className={cn("mt-1 text-[15px] leading-snug text-(--text-muted)", className)}>
      {children}
    </p>
  );
}

/** Inline field error: visible text, an icon, and announced when it appears. */
export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[15px] leading-snug font-medium text-(--danger-fg)">
      {children}
    </p>
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

/** Every intake input: 48px tall and 16px text on every breakpoint, not just phones. */
export const COMPACT_INPUT =
  "w-full min-h-12 rounded-xl border border-(--border-default) bg-(--surface-raised) px-3.5 py-2.5 text-base text-(--text-body) outline-none placeholder:text-(--text-subtle) focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-(--surface-nav-accent) aria-invalid:border-(--danger-border)";
