"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDoctorShiftMetrics } from "@/features/doctor/hooks/useDoctorShiftMetrics";

/** Same window `ScheduleCollisionBanner` warns inside — one definition of "soon". */
const COLLISION_WINDOW_MS = 20 * 60 * 1000;

export interface AcceptConsultTarget {
  bookingId: string;
  /** The real display name, or a `Ref XXXXXX` fallback — never invented. */
  name: string;
  serviceLabel: string | null;
  amountLabel: string | null;
  requestedLabel: string | null;
}

interface AcceptConsultModalProps {
  target: AcceptConsultTarget | null;
  isOpen: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * The safety gate between a queue row and actually committing to a patient.
 *
 * One deliberate correction from the "accept = enter the call" framing this
 * feature was first specced with: accepting a pool or incoming request only
 * assigns the doctor to the booking (`acceptRequest` / `acceptPatient`) — it
 * does not start the consultation. The booking then surfaces on
 * `ReadyToStartCard`'s "ready" queue for an explicit, separate Start action.
 * Promising an immediate room entry here would be wrong for both of the two
 * queue types this modal actually gates.
 *
 * The collision warning reuses `useDoctorShiftMetrics` — the same
 * `nextAppointment` `ScheduleCollisionBanner` already reads from a shared
 * cache entry — rather than adding a second read or inventing one.
 */
export function AcceptConsultModal({
  target,
  isOpen,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: AcceptConsultModalProps) {
  const { metrics, isLoading: metricsLoading } = useDoctorShiftMetrics();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !target) return null;

  let collision: { dueLabel: string; minutesUntil: number } | null = null;
  if (!metricsLoading && metrics.nextAppointment) {
    const dueMs = Date.parse(metrics.nextAppointment.scheduledAt);
    if (!Number.isNaN(dueMs)) {
      const remainingMs = dueMs - nowMs;
      if (remainingMs >= 0 && remainingMs <= COLLISION_WINDOW_MS) {
        collision = {
          dueLabel: new Date(dueMs).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          }),
          minutesUntil: Math.max(0, Math.round(remainingMs / 60_000)),
        };
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-slot="accept-consult-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card) shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-(--border-subtle) bg-(--surface-warm) px-6 py-5">
          <div>
            <span className="rounded-md border border-(--status-available-fg)/25 bg-(--status-available-bg) px-2 py-0.5 text-[10px] font-bold tracking-wider text-(--status-available-fg) uppercase">
              Clinical Duty Confirmation
            </span>
            <h3 className="mt-1 text-base font-bold text-(--text-heading)">Accept this patient?</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="rounded-xl p-2 text-(--text-subtle) transition-colors hover:bg-(--action-secondary-hover-surface) hover:text-(--text-body) disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-6 text-xs">
          <div className="space-y-2 rounded-2xl border border-(--border-subtle) bg-(--surface-warm)/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-(--text-heading)">{target.name}</span>
              {target.amountLabel ? (
                <span className="rounded-md bg-(--status-available-bg) px-2 py-0.5 font-mono text-[11px] font-bold text-(--status-available-fg)">
                  {target.amountLabel}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-(--text-muted)">
              {target.serviceLabel ? <span className="capitalize">{target.serviceLabel}</span> : null}
              {target.requestedLabel ? <span>Requested {target.requestedLabel}</span> : null}
            </div>
          </div>

          {collision ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-(--status-soon-fg)/25 bg-(--status-soon-bg) p-3.5 text-(--status-soon-fg)">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <span className="block text-[11px] font-bold">Upcoming appointment conflict</span>
                <p className="mt-0.5 text-[11px] leading-tight">
                  You have a scheduled consultation at{" "}
                  <span className="font-semibold">{collision.dueLabel}</span> (in{" "}
                  {collision.minutesUntil}m). Accepting this now may delay it.
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-warm)/60 p-3 text-(--text-muted)">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            <p className="leading-relaxed">
              Accepting assigns you as the doctor of record for this booking. You will start the
              consultation separately from the queue once you&apos;re ready.
            </p>
          </div>

          {errorMessage ? (
            <p role="alert" className="text-[11.5px] font-semibold text-(--danger-fg)">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-(--border-subtle) bg-(--surface-warm) px-6 py-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="flex-1" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner className="mr-1.5 size-3.5" />
                Assigning…
              </>
            ) : (
              "Confirm & accept"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
