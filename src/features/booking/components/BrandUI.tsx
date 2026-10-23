"use client";

import { TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EMERGENCY_DISCLAIMER } from "../constants/bookingConstants";

/**
 * Shared visual primitives for the patient booking flow, styled to the
 * BayanHealth brand tokens (see styles/bayanhealth-tokens.css). These replace
 * the ad-hoc gray/white styling the booking screens used before the Figma
 * "Userflows" redesign (O1–O8). Behaviour lives in the calling components;
 * these are presentation only.
 */

/**
 * Pill toggle used for the doctor gender / language preference rows. Renders a
 * `<button type="button">`; the caller owns selection state.
 */
export function TogglePill({
  selected,
  icon,
  children,
  className,
  ...props
}: ComponentProps<"button"> & { selected?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-selected={selected ? "" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-(--radius-pill) border px-4 py-1.5 text-[14px] transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        selected
          ? "border-(--action-primary) bg-(--surface-accent-soft) font-bold text-(--status-available-fg)"
          : "border-(--border-default) bg-(--surface-card) font-semibold text-(--text-body) hover:bg-(--action-secondary-hover-surface)",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

/** Primary teal pill CTA with the brand inset press edge. */
export function BrandCtaButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "relative inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-(--radius-pill) px-4 py-2 text-center",
        "bg-(--action-primary) text-[16px] font-bold text-(--action-primary-text) shadow-(--shadow-btn-inset)",
        "transition-colors hover:bg-(--action-primary-hover)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        "disabled:cursor-not-allowed disabled:bg-(--gray-bg) disabled:text-(--text-subtle) disabled:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * The standardised teleconsult emergency disclaimer.
 *
 * Identical in treatment to the landing page's hero notice (same danger
 * tokens, same bordered box, same icon), so the warning a visitor reads before
 * signing up is the warning they keep seeing inside the product.
 *
 * It is a notice, not a banner. The loud full-width red card it replaces on
 * `/patient/booking` read as an offer of emergency care ("Urgent Care · 24/7 Available
 * · Need Immediate Assistance?") rather than a warning that the platform is not
 * for it. One component, so the copy and the tone cannot drift per screen.
 */
export function EmergencyNote({ className }: { className?: string }) {
  return (
    <p
      data-slot="emergency-note"
      className={cn(
        "flex max-w-(--measure) items-start gap-2 rounded-(--radius-md) border border-(--danger-border) bg-(--danger-bg) p-3 text-sm text-(--danger-fg)",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {EMERGENCY_DISCLAIMER}
    </p>
  );
}
