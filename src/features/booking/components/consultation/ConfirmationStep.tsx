"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Booking } from "../../types/booking.types";
import { assignedDoctorLabel } from "../../lib/doctorLabels";
import { useCancelBooking } from "../../hooks/useCancelBooking";
import { graceSecondsRemaining } from "../../lib/waitElapsed";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  LinkIcon,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ConfirmationStepProps {
  booking: Booking;
  isReview: boolean;
}

/** Format minor units as a currency amount, or return null when unpriced. */
function formatAmount(amountCents?: number, currency?: string): string | null {
  if (typeof amountCents !== "number" || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * Confirmation step: the booking is confirmed and a doctor is assigned.
 *
 * This step previously read "Awaiting confirmation — {doctor} is reviewing your
 * payment... Waiting for doctor to confirm", which described the legacy
 * proof-upload review path. On the wired payment path the funds are already held
 * and `POST /v1/bookings/{id}/payment/hold` has already moved the booking to
 * `confirmed`, so there is nothing left to await. Presenting a settled booking
 * as pending is the kind of thing a physician reviewer will read as the platform
 * not knowing its own state, so the copy now reports what actually happened.
 */
export function ConfirmationStep({ booking, isReview }: ConfirmationStepProps) {
  // A booking that carries a `doctorId` is assigned, whether or not the doctor
  // directory disclosed a name for it. Falling back to "Doctor assignment
  // pending" on an empty name printed that line directly under the "Booking
  // confirmed" heading — the screen contradicting itself about its own state.
  const doctorLabel = assignedDoctorLabel(booking.doctorName, booking.doctorId);
  const specialty = booking.doctorSpecialty?.trim();
  const amount = formatAmount(booking.amountCents, booking.currency);
  const scheduled = booking.scheduledDate
    ? new Date(booking.scheduledDate)
    : null;
  const scheduledLabel =
    scheduled && !Number.isNaN(scheduled.getTime())
      ? scheduled.toLocaleString()
      : null;

  return (
    <div className="animate-in duration-300 fade-in">
      <div className="mb-3 flex items-center gap-2 text-[17px] font-bold text-(--text-heading)">
        <CheckCircle2 className="size-5 text-(--teal-800)" />
        Booking confirmed
      </div>

      <div className="rounded-[14px] border border-(--border-subtle) p-3.5">
        <p className="text-[16px] font-bold text-(--text-heading)">
          {doctorLabel}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-(--text-muted)">
          <Stethoscope className="size-3.5 shrink-0" />
          {specialty || "Specialty not listed"}
        </p>
        {booking.doctorId ? (
          <Link
            href={`/patient/booking/doctor/${booking.doctorId}`}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--text-link) hover:text-(--text-link-hover)"
          >
            <LinkIcon className="size-3.5" strokeWidth={1.5} />
            View doctor
          </Link>
        ) : null}
      </div>

      <dl className="mt-3 flex flex-col gap-2.5 rounded-[12px] bg-(--surface-warm) px-3.5 py-3 text-[14px] text-(--text-body)">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="size-4 shrink-0 text-(--teal-800)" />
          <dt className="sr-only">Assigned doctor</dt>
          <dd>{doctorLabel}</dd>
        </div>

        {scheduledLabel ? (
          <div className="flex items-center gap-2.5">
            <CalendarClock className="size-4 shrink-0 text-(--teal-800)" />
            <dt className="sr-only">Scheduled for</dt>
            <dd>{scheduledLabel}</dd>
          </div>
        ) : null}

        {amount ? (
          <div className="flex items-center gap-2.5">
            <CreditCard className="size-4 shrink-0 text-(--teal-800)" />
            <dt className="sr-only">Payment</dt>
            <dd>{amount} held — captured after your consultation</dd>
          </div>
        ) : null}
      </dl>

      {!isReview ? (
        <p className="mt-3 text-[14px] text-(--text-muted)">
          Your doctor has your intake details. You&apos;ll be able to join the
          consultation from here when it starts.
        </p>
      ) : null}

      {/*
        Post-acceptance cancel affordance (ADR-20260808-03 follow-up (b),
        ADR-20260909-01) — on-demand only, and only while the booking is still
        `confirmed`. `in_progress` also renders this step (see `stepByStatus`
        in `PatientBookingDetail.tsx`), but `PATIENT_CANCELLABLE_STATUSES`
        excludes it: cancelling a started consultation is not a supported
        operation, so offering the button there would be a dead end.
      */}
      {!isReview &&
      booking.bookingType === "on-demand" &&
      booking.status === "confirmed" ? (
        <PostAcceptanceCancelPanel booking={booking} />
      ) : null}
    </div>
  );
}

/** How often the grace-window countdown is recomputed. */
const GRACE_TICK_MS = 1000;

/**
 * Post-acceptance cancel affordance for an on-demand booking (ADR-20260808-03
 * follow-up (b), ADR-20260909-01).
 *
 * `FindingStep`'s `OnDemandWaitPanel` only renders pre-acceptance — the
 * moment a doctor accepts, `toWizardBooking` moves the step to `confirmation`
 * and this component takes over, which had no cancel control at all. That gap
 * was deliberate at the time: the grace-window/partial-capture policy this
 * panel describes did not exist yet, so a general cancel button here would
 * have quietly granted full refunds in cases not meant to receive them. That
 * backend policy now exists (`settlePartialCapture`,
 * `handleUpdateBooking`'s late-cancellation branch), so withholding a cancel
 * control no longer protects anything — it just leaves the patient with no
 * way out of a booking they already paid for.
 *
 * Three states, matching exactly what the backend will actually do:
 * - **No `acceptedAt` at all** — the auto-matcher assigned this booking
 *   directly rather than a doctor accepting it from the pool (the pool
 *   disabled, for instance). The backend's settlement branch requires
 *   `attribute_exists(acceptedAt)`, so it never applies here: cancelling is
 *   always a full refund, with no grace window to speak of.
 * - **Within the two-minute grace window** — full refund, with a live
 *   countdown so the patient knows how long that stays true.
 * - **Past the grace window** — cancelling now settles as a 50% partial
 *   capture (`ADR-20260909-01`). The ticking `nowMs` means a patient who
 *   stays on this screen sees the copy switch the moment the window closes,
 *   rather than finding out only after clicking cancel.
 */
function PostAcceptanceCancelPanel({ booking }: { booking: Booking }) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const { cancel, isCancelling, isCancelled, errorMessage } = useCancelBooking(
    booking.id,
  );

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), GRACE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  if (isCancelled) {
    return (
      <div className="mt-3.5" data-slot="post-acceptance-cancel-cancelled">
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>Booking cancelled</AlertTitle>
          <AlertDescription className="text-xs">
            Your booking has been cancelled.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasAcceptedAt =
    typeof booking.acceptedAt === "string" && booking.acceptedAt.length > 0;
  const acceptedAtMs = hasAcceptedAt
    ? new Date(booking.acceptedAt as string).getTime()
    : NaN;
  const secondsLeft = hasAcceptedAt
    ? graceSecondsRemaining(acceptedAtMs, nowMs)
    : null;
  // Distinct from "no acceptedAt": that case is never past grace, because the
  // backend's settlement branch never applies to it in the first place.
  const pastGrace = hasAcceptedAt && secondsLeft === null;
  const partialAmount = formatAmount(
    typeof booking.amountCents === "number"
      ? Math.floor(booking.amountCents / 2)
      : undefined,
    booking.currency,
  );

  return (
    <div className="mt-3.5 flex flex-col gap-2.5" data-slot="post-acceptance-cancel">
      {pastGrace ? (
        <div
          data-slot="post-acceptance-cancel-warning"
          className="flex items-start gap-2.5 rounded-[12px] border border-(--danger-border) bg-(--danger-bg) px-3 py-2.5 text-[13px] text-(--danger-fg)"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Cancelling now applies a partial charge —{" "}
            <span className="font-bold">
              {partialAmount ?? "50% of your payment"}
            </span>{" "}
            is kept under our late-cancellation policy, and the rest is
            released.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-(--teal-200) bg-(--teal-100) px-3 py-2.5 text-[13px] text-(--text-muted)">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-(--teal-800)" />
          <p>
            Your payment is on hold, not charged. Cancelling now releases it
            in full.
            {secondsLeft !== null ? (
              <>
                {" "}
                Free to cancel for the next{" "}
                <span
                  data-slot="post-acceptance-cancel-grace-seconds"
                  className="font-bold text-(--teal-800) tabular-nums"
                >
                  {secondsLeft}s
                </span>
                .
              </>
            ) : null}
          </p>
        </div>
      )}

      {errorMessage ? (
        <Alert variant="destructive" data-slot="post-acceptance-cancel-error">
          <AlertCircle className="size-4" />
          <AlertTitle>We couldn&apos;t cancel your booking</AlertTitle>
          <AlertDescription className="text-xs">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end pt-1">
        <AlertDialog>
          <AlertDialogTrigger
            data-slot="post-acceptance-cancel-trigger"
            disabled={isCancelling}
            render={
              <Button
                type="button"
                variant="outline"
                className="h-[42px] rounded-full border-(--action-primary) px-4 font-bold text-(--teal-800) hover:bg-(--teal-100)"
              />
            }
          >
            {isCancelling ? (
              <>
                <Spinner className="mr-2 size-3" />
                Cancelling…
              </>
            ) : (
              "Cancel booking"
            )}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
              <AlertDialogDescription>
                {pastGrace
                  ? `A partial charge applies: ${partialAmount ?? "50% of your payment"} is kept under our late-cancellation policy, and the rest is released.`
                  : "We'll release your payment hold in full — nothing is deducted."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep booking</AlertDialogCancel>
              {/*
                Deliberately not also labelled "Cancel booking": see
                `FindingStep`'s identical note on why the trigger and the
                confirming action must not read identically in a confirm
                dialog.
              */}
              <AlertDialogAction
                data-slot="post-acceptance-cancel-confirm"
                onClick={cancel}
              >
                {pastGrace
                  ? "Yes, cancel with partial charge"
                  : "Yes, cancel & refund my hold"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
