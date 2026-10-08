"use client";

import { ArrowLeft, ArrowRight, CircleAlert, Send } from "lucide-react";
import { useId, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { BrandCtaButton } from "../../BrandUI";

interface IntakeNavFooterProps {
  /** Title of the previous step; omit on the first step to hide Back. */
  backTo?: string;
  onBack?: () => void;
  /** Title of the next step; omit on the final step. */
  continueTo?: string;
  onContinue: () => void;
  isFinal?: boolean;
  finalLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  /**
   * Why Continue cannot proceed yet — e.g. a mandatory safety answer is still
   * missing. The button stays enabled: tapping it surfaces this reason as a
   * visible alert instead of greying out, which low-confidence patients read as
   * "broken". `onContinue` still fires, so the caller keeps its own guard.
   */
  blockedReason?: string | null;
  /**
   * `viewport`: fixed to the screen bottom on phones, inline from `lg` up.
   * `pinned`: a `shrink-0` bar at the bottom of a fixed-height sheet.
   */
  placement?: "viewport" | "pinned";
  children?: React.ReactNode;
  className?: string;
}

/**
 * Bookended intake action bar: Back anchored left, Continue anchored right.
 *
 * Both controls are at least 48px tall with visible focus rings. Step names
 * appear in the labels from `sm` up; on phones the labels collapse to
 * "Back" / "Continue" so both still fit on one row.
 */
export function IntakeNavFooter({
  backTo,
  onBack,
  continueTo,
  onContinue,
  isFinal = false,
  finalLabel = "Submit intake",
  pending = false,
  pendingLabel = "Saving…",
  blockedReason = null,
  placement = "viewport",
  children,
  className,
}: IntakeNavFooterProps) {
  const reasonId = useId();
  const [attempted, setAttempted] = useState(false);

  // A resolved block starts quiet again (state adjusted during render, not in an effect).
  if (!blockedReason && attempted) setAttempted(false);

  const showReason = Boolean(blockedReason) && attempted;

  const handleContinue = () => {
    if (blockedReason) setAttempted(true);
    onContinue();
  };

  return (
    <footer
      data-slot="intake-nav-footer"
      className={cn(
        placement === "pinned"
          ? "sticky bottom-0 z-30 shrink-0 border-t border-(--border-subtle) bg-(--surface-card) px-3.5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-sm sm:px-8 sm:py-3"
          : cn(
              "fixed inset-x-0 bottom-0 z-30 border-t border-(--border-subtle) bg-(--surface-card) px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-(--shadow-md)",
              "lg:sticky lg:bottom-0 lg:z-30 lg:mt-0 lg:px-6 lg:py-3",
            ),
        className,
      )}
    >
      {children}
      {showReason ? (
        <p
          id={reasonId}
          role="alert"
          className="mb-2.5 flex items-start gap-2 text-[15px] leading-snug font-semibold text-(--danger-fg)"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0" />
          {blockedReason}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        {backTo && onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            className={cn(
              "inline-flex min-h-12 min-w-12 items-center gap-2 rounded-xl border border-(--border-default) bg-(--surface-card) px-4 sm:px-5 text-base font-semibold text-(--text-body)",
              "transition-colors hover:border-(--border-strong) hover:bg-(--action-secondary-hover-surface)",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <ArrowLeft aria-hidden className="size-4.5 shrink-0" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to {backTo}</span>
          </button>
        ) : (
          <span aria-hidden />
        )}

        <BrandCtaButton
          type="button"
          onClick={handleContinue}
          disabled={pending}
          aria-busy={pending || undefined}
          aria-describedby={showReason ? reasonId : undefined}
          className="min-h-12 w-auto px-6 text-base font-bold"
        >
          {pending ? (
            <>
              <Spinner aria-label={pendingLabel} className="size-4.5" />
              {pendingLabel}
            </>
          ) : isFinal ? (
            <>
              {finalLabel}
              <Send aria-hidden className="size-4.5" />
            </>
          ) : (
            <>
              <span className="sm:hidden">Continue</span>
              <span className="hidden sm:inline">
                {continueTo ? `Continue to ${continueTo}` : "Continue"}
              </span>
              <ArrowRight aria-hidden className="size-4.5" />
            </>
          )}
        </BrandCtaButton>
      </div>
    </footer>
  );
}
