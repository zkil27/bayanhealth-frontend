"use client";

import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { useId } from "react";

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
  /** Blocks Continue — e.g. a mandatory safety answer is still missing. */
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
 * Both controls are at least 44px tall with visible focus rings. Step names
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
  const blocked = Boolean(blockedReason);

  return (
    <footer
      data-slot="intake-nav-footer"
      className={cn(
        placement === "pinned"
          ? "sticky bottom-0 z-30 shrink-0 border-t border-(--border-subtle) bg-(--surface-card) px-3.5 py-2.5 shadow-sm sm:px-8 sm:py-3"
          : cn(
              "fixed inset-x-0 bottom-0 z-30 border-t border-(--border-subtle) bg-(--surface-card) px-4 py-3 shadow-(--shadow-md)",
              "lg:sticky lg:bottom-0 lg:z-30 lg:mt-0 lg:px-6 lg:py-3",
            ),
        className,
      )}
    >
      {children}
      {blockedReason ? (
        <p id={reasonId} className="mb-2 text-right text-xs text-(--text-muted)">
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
              "inline-flex min-h-12 min-w-12 items-center gap-2 rounded-xl border border-(--border-default) bg-(--surface-card) px-4 sm:px-5 text-sm sm:text-base font-semibold text-(--text-body)",
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
          onClick={onContinue}
          disabled={pending || blocked}
          aria-busy={pending || undefined}
          aria-describedby={blockedReason ? reasonId : undefined}
          className="min-h-12 sm:min-h-12.5 w-auto px-6 text-sm sm:text-base font-bold shadow-sm active:scale-[0.98]"
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
