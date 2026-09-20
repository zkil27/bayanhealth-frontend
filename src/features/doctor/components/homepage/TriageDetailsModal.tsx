"use client";

import { useEffect } from "react";
import { AlertTriangle, Info, MessageSquare, Thermometer, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bookingServices } from "@/types/booking.types";
import type { IntakeSafetyScreen } from "@/features/booking/lib/api/intake";

import type { OnDemandRequest } from "../../lib/api/requestPool";

function serviceLabel(serviceType: OnDemandRequest["serviceType"]): string {
  return bookingServices.find((s) => s.value === serviceType)?.label
    ?? serviceType.replaceAll("_", " ");
}

function formatAmount(amountCents?: number, currency?: string): string | null {
  if (typeof amountCents !== "number" || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      amountCents / 100,
    );
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

interface TriageDetailsModalProps {
  item: OnDemandRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToAccept: () => void;
}

/**
 * Pre-acceptance review for an on-demand pool request.
 *
 * The one queue row type that used to jump straight from row to "Accept" with
 * nothing in between — a doctor could claim a request without reading anything
 * beyond the one-line excerpt already on the row.
 *
 * Renders exactly the fields the pool endpoint discloses pre-acceptance
 * (`GET /v1/doctors/me/request-pool`): service, time, price, patient name, the
 * chief-complaint excerpt, and — once intake is submitted, under ADR-20260914-02
 * — vitals, allergies, and red-flag screening answers, so a doctor can weigh the
 * clinical shape of a case before claiming it.
 *
 * What this still does **not** show: `patientId`, date of birth, contact
 * details, or the rest of the intake body (OLDCART detail, medical history,
 * medications, reproductive health). `GET /v1/bookings/{bookingId}/intake`
 * (what `ReadyIntakeContent` and `BookingRequestContent` read for the other two
 * queue types) requires `booking.doctorId === auth.userId`
 * (`backend/src/handlers/intake.ts`'s `canReadIntake`) — and a pool request has
 * no assigned doctor yet, by definition, until someone accepts it. Rendering
 * that here would mean inventing a clinical record this doctor is not yet
 * authorized to hold.
 */
export function TriageDetailsModal({
  item,
  isOpen,
  onClose,
  onProceedToAccept,
}: TriageDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const amount = formatAmount(item.amountCents, item.currency);
  const requested = new Date(item.requestedAt);
  const requestedLabel = Number.isNaN(requested.getTime()) ? null : requested.toLocaleString();

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-slot="triage-details-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card) shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-(--border-subtle) bg-(--surface-warm) px-6 py-5">
          <div>
            <span className="rounded-md border border-(--status-soon-fg)/25 bg-(--status-soon-bg) px-2 py-0.5 text-[10px] font-bold tracking-wider text-(--status-soon-fg) uppercase">
              Pre-Acceptance Review
            </span>
            <p className="mt-1 font-mono text-xs text-(--text-subtle)">
              Ref {item.bookingId.slice(-6).toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 text-(--text-subtle) transition-colors hover:bg-(--action-secondary-hover-surface) hover:text-(--text-body)"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
          <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-warm)/60 p-4">
            <h3 className="text-sm font-bold text-(--text-heading)">
              {item.patientName ?? `Ref ${item.bookingId.slice(-6).toUpperCase()}`}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-(--text-muted)">
              <span className="capitalize">{serviceLabel(item.serviceType)}</span>
              <span className="capitalize">{item.channel}</span>
              {requestedLabel ? <span>Requested {requestedLabel}</span> : null}
              {amount ? <span className="font-mono font-semibold text-(--text-heading)">{amount}</span> : null}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
              Chief complaint (as submitted)
            </span>
            <p className="flex items-start gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 leading-relaxed text-(--text-body)">
              <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-(--text-subtle)" />
              {item.reasonExcerpt ?? (
                <span className="text-(--text-muted)">
                  {item.intakeSubmitted
                    ? "No reason recorded."
                    : "Patient has not submitted intake yet."}
                </span>
              )}
            </p>
          </div>

          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
              <Thermometer className="size-3 shrink-0" />
              Vitals (as submitted)
            </span>
            {item.intakeSubmitted ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <VitalStat label="Temp" value={formatVital(item.vitals?.temperatureC, "°C")} />
                <VitalStat label="Systolic" value={formatVital(item.vitals?.systolicBp, "mmHg")} />
                <VitalStat label="Diastolic" value={formatVital(item.vitals?.diastolicBp, "mmHg")} />
                <VitalStat label="Heart rate" value={formatVital(item.vitals?.heartRateBpm, "bpm")} />
                <VitalStat label="SpO2" value={formatVital(item.vitals?.spo2Percent, "%")} />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-(--border-subtle) p-3 text-(--text-muted)">
                Patient has not submitted intake yet.
              </p>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
              Allergies (as submitted)
            </span>
            <p className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3 leading-relaxed text-(--text-body)">
              {item.intakeSubmitted ? (
                item.allergies?.trim() || (
                  <span className="text-(--text-muted) italic">None recorded</span>
                )
              ) : (
                <span className="text-(--text-muted)">Patient has not submitted intake yet.</span>
              )}
            </p>
          </div>

          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
              <AlertTriangle className="size-3 shrink-0 text-amber-600" />
              Red-flag screening
            </span>
            {item.intakeSubmitted ? (
              hasScreenAnswer(item.safetyScreen) ? (
                <div className="flex flex-wrap gap-1.5">
                  <ScreenBadge label="Chest pain" value={item.safetyScreen?.chestPain} />
                  <ScreenBadge label="Breathing difficulty" value={item.safetyScreen?.dyspnea} />
                  <FeverBadge feverDays={item.safetyScreen?.feverDays} />
                </div>
              ) : (
                <p className="text-(--text-muted)">
                  Not answered — treat as unscreened, not as negative.
                </p>
              )
            ) : (
              <p className="text-(--text-muted)">Patient has not submitted intake yet.</p>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-warm)/60 p-3 text-(--text-muted)">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <p className="leading-relaxed">
              This is everything the pool discloses before a request is claimed. The rest
              of the patient&apos;s intake — history, medications, and full OLDCART detail —
              unlocks once you accept and are assigned as the doctor of record.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-(--border-subtle) bg-(--surface-warm) px-6 py-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Back to queue
          </Button>
          <Button type="button" size="sm" className="flex-1" onClick={onProceedToAccept}>
            Proceed to accept →
          </Button>
        </div>
      </div>
    </div>
  );
}

function VitalStat({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-card) p-2.5">
      <span className="block text-[10px] text-(--text-subtle)">{label}</span>
      <span className="text-sm font-semibold text-(--text-heading)">
        {value ?? <span className="text-xs font-normal text-(--text-muted) italic">Not recorded</span>}
      </span>
    </div>
  );
}

function formatVital(value: number | undefined, unit: string): string | undefined {
  if (typeof value !== "number") return undefined;
  return unit === "%" ? `${value}%` : `${value} ${unit}`;
}

function hasScreenAnswer(screen: IntakeSafetyScreen | undefined): boolean {
  return (
    !!screen &&
    (typeof screen.chestPain === "boolean" ||
      typeof screen.dyspnea === "boolean" ||
      typeof screen.feverDays === "number")
  );
}

function ScreenBadge({ label, value }: { label: string; value?: boolean }) {
  if (value === undefined) {
    return (
      <Badge variant="outline" className="text-(--text-muted)">
        {label}: not asked
      </Badge>
    );
  }
  return (
    <Badge variant={value ? "destructive" : "outline"}>
      {label}: {value ? "Yes" : "No"}
    </Badge>
  );
}

function FeverBadge({ feverDays }: { feverDays?: number }) {
  if (typeof feverDays !== "number") {
    return (
      <Badge variant="outline" className="text-(--text-muted)">
        Fever: not asked
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      {feverDays === 0 ? "No fever" : `Fever ${feverDays} day${feverDays === 1 ? "" : "s"}`}
    </Badge>
  );
}
