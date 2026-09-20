"use client";

import {
  AlertCircle,
  UserSearch,
  Cog,
  Languages,
  LinkIcon,
  Radio,
  ShieldCheck,
  Stethoscope,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeartbeatProgress } from "../HeartBeat";
import { Booking } from "../../types/booking.types";
import type { FindingState } from "../../hooks/useFinding";
import { useCancelBooking } from "../../hooks/useCancelBooking";
import { assignedDoctorLabel } from "../../lib/doctorLabels";
import { formatWaitElapsed, isUsableWaitStart } from "../../lib/waitElapsed";
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
import Image from "next/image";

interface FindingStepProps {
  booking: Booking;
  finding: FindingState;
  isReview: boolean;
}

/**
 * Doctor-matching step of the booking wizard.
 *
 * Everything shown here is derived from real backend state:
 * - matching progress comes from the `FindingUpdate` inside {@link FindingState},
 *   which `useFinding` derives by polling `GET /v1/bookings/{bookingId}`;
 * - the doctor card renders the `DoctorPublicSummary` resolved by
 *   `PatientBookingDetail` from `GET /v1/doctors/{doctorId}`.
 *
 * An earlier version simulated this step with a 3s `setInterval` that walked a
 * scripted "Doctor has been notified / is reading / accepted" script regardless
 * of backend state, and rendered a doctor card of hard-coded defaults. Both are
 * gone: an unresolved value now renders as unresolved.
 *
 * A failed poll is its own state. The step used to take `FindingUpdate | null`
 * and coerce it — `progress ?? 0`, `message ?? "Checking your booking…"` — so a
 * failing `GET /v1/bookings/{bookingId}` left the patient watching a 0% bar
 * under an animated "Live" badge and a spinner indefinitely. `useFinding` now
 * returns a discriminated {@link FindingState}, and `failed` renders an error
 * with a retry instead; the "Live" badge and the spinner are inside the polling
 * branch only, so neither can appear once the poll has failed.
 */
export function FindingStep({ booking, finding, isReview }: FindingStepProps) {
  const hasAssignedDoctor = Boolean(booking.doctorId);
  const preferencesApply =
    booking.bookingType === "on-demand" ||
    booking.bookingType === "intake-link";

  // Reviewing a completed step, or matching already resolved.
  if (isReview || hasAssignedDoctor) {
    return (
      <div className="animate-in duration-300 fade-in">
        <StepHeading>Your assigned doctor</StepHeading>
        {preferencesApply ? <MatchPreferences booking={booking} /> : null}
        <div className="mt-2">
          <DoctorReviewCard booking={booking} />
        </div>
      </div>
    );
  }

  // The poll failed: no "Live" badge, no spinner, no 0% progress bar. Nothing
  // about matching progress is known, so nothing about it is shown.
  if (finding.status === "failed") {
    return (
      <div className="animate-in duration-300 fade-in">
        <StepHeading>Finding your doctor</StepHeading>

        {preferencesApply ? <MatchPreferences booking={booking} /> : null}

        <div className="mt-4" data-slot="finding-step-error">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>We lost track of your booking</AlertTitle>
            <AlertDescription className="text-xs">
              {finding.message} Your booking is safe — this only affects the
              progress shown here.
            </AlertDescription>
          </Alert>
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={finding.retry}
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = finding.update?.progress ?? 0;
  const message = finding.update?.message ?? "Checking your booking…";
  const isAwaitingAcceptance = booking.bookingType === "on-demand";

  return (
    <div className="animate-in duration-300 fade-in">
      <div className="flex items-center gap-2.5">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-(--teal-100) text-(--teal-800)">
          <UserSearch className="size-5" />
        </span>
        <span className="flex-1 text-[17px] font-bold text-(--text-heading)">
          {isAwaitingAcceptance
            ? "Waiting for a doctor"
            : "Finding your doctor"}
        </span>
        <span
          data-slot="finding-step-live"
          className="flex items-center gap-1.5 rounded-full bg-(--gold-100) px-2.5 py-1 text-[11px] font-bold text-(--gold-700)"
        >
          <span className="size-1.5 animate-pulse rounded-[3px] bg-(--gold-600)" />
          Live
        </span>
      </div>

      {preferencesApply ? (
        <div className="mt-3.5">
          <MatchPreferences booking={booking} />
        </div>
      ) : null}

      <div className="mt-3.5 rounded-[16px] border border-(--teal-200) bg-gradient-to-b from-(--teal-100) to-(--surface-warm) p-4">
        <div className="flex items-center gap-2.5">
          <p className="flex flex-1 items-center gap-1.5 text-[14px] font-semibold text-(--text-heading)">
            <Spinner data-slot="finding-step-spinner" className="size-3.5" />
            {message}
          </p>
          <span className="font-display text-[22px] leading-none font-semibold text-(--teal-800)">
            {Math.round(progress)}%
          </span>
        </div>

        <div
          data-slot="finding-step-progress"
          className="mt-3 w-full overflow-hidden rounded-full"
        >
          <HeartbeatProgress value={progress} className="w-full" />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11.5px] text-(--text-subtle)">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3" /> Payment held
          </span>
          <span>Doctor assigned</span>
        </div>
      </div>

      {isAwaitingAcceptance ? <OnDemandWaitPanel booking={booking} /> : null}
    </div>
  );
}

/** Shared heading for the review / failed variants. */
function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2.5">
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-(--teal-100) text-(--teal-800)">
        <UserSearch className="size-5" />
      </span>
      <span className="text-[17px] font-bold text-(--text-heading)">
        {children}
      </span>
    </div>
  );
}

/** How often the elapsed-wait reading is recomputed. */
const WAIT_TICK_MS = 1000;

/**
 * The on-demand waiting screen (ADR-20260808-03).
 *
 * An on-demand request is broadcast to every consult-approved doctor and the
 * first to accept takes it, so the patient is waiting on a human decision with
 * no deadline. Before this existed they saw only a progress bar stuck at 66%,
 * with nothing explaining what was being waited for, no sense of how long they
 * had been waiting, and — most importantly — no way out of a paid booking that
 * nobody had picked up.
 *
 * Three things are shown, and each corresponds to something the platform
 * actually knows:
 *
 * - **How long they have waited**, from the booking's own `updatedAt`. No
 *   estimated remaining time is shown: there is no queue depth and no
 *   acceptance-rate history to derive one from, so any figure would be invented.
 * - **What is happening**, in the terms the backend actually implements — a
 *   broadcast to verified doctors, claimed atomically by the first to accept
 *   (`claimOnDemandRequest`).
 * - **That the money is held, not taken**, and that cancelling now releases it
 *   in full. That is the real behaviour: `PUT /v1/bookings/{id}` with
 *   `status: cancelled` refunds a `held` payment when the prior status was
 *   `confirmed`.
 *
 * Cancellation is offered *here* rather than as a general control on the booking
 * page on purpose. Pre-acceptance is the one point where a full release is the
 * settled policy. Once a doctor has accepted, cancellation carries a grace window
 * and a partial capture that the backend does not implement yet, so a general
 * cancel button would quietly grant full refunds in cases that are not meant to
 * get them.
 */
function OnDemandWaitPanel({ booking }: { booking: Booking }) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const { cancel, isCancelling, isCancelled, errorMessage } = useCancelBooking(
    booking.id,
  );

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), WAIT_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // `updatedAt` is the booking's last write, which for an unclaimed pooled
  // request is the payment hold that put it in the pool — nothing else touches it
  // while it waits. Not a dedicated `pooledAt`, and named honestly here rather
  // than dressed up as one.
  const requestedAtMs = booking.updatedAt.getTime();
  const elapsed = isUsableWaitStart(requestedAtMs)
    ? formatWaitElapsed(requestedAtMs, nowMs)
    : null;

  if (isCancelled) {
    return (
      <div className="mt-3" data-slot="on-demand-wait-cancelled">
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>Request cancelled</AlertTitle>
          <AlertDescription className="text-xs">
            Your request has been withdrawn and the payment hold released in
            full. Nothing was charged.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mt-3.5 flex flex-col gap-2.5" data-slot="on-demand-wait">
      {elapsed ? (
        <div className="flex items-center gap-2 rounded-[12px] bg-(--surface-warm) px-3 py-2.5 text-sm text-(--text-muted)">
          <Timer className="size-4 shrink-0 text-(--teal-800)" />
          <span>
            Waiting{" "}
            <span
              data-slot="on-demand-wait-elapsed"
              className="font-display text-[18px] font-semibold text-(--text-heading) tabular-nums"
            >
              {elapsed}
            </span>
          </span>
        </div>
      ) : null}

      <div className="flex items-start gap-2.5 rounded-[12px] bg-(--surface-warm) px-3 py-2.5 text-[13px] text-(--text-muted)">
        <Radio className="mt-0.5 size-4 shrink-0 text-(--teal-800)" />
        <p>
          Your request is visible to every verified doctor on BayanHealth right
          now. The first one to accept it becomes your doctor, and your chat
          room and video link open as soon as that happens.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-[12px] border border-(--teal-200) bg-(--teal-100) px-3 py-2.5 text-[13px] text-(--text-muted)">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-(--teal-800)" />
        <p>
          Your payment is on hold, not charged. If you cancel before a doctor
          accepts, the hold is released in full.
        </p>
      </div>

      {errorMessage ? (
        <Alert variant="destructive" data-slot="on-demand-wait-error">
          <AlertCircle className="size-4" />
          <AlertTitle>We couldn&apos;t cancel your request</AlertTitle>
          <AlertDescription className="text-xs">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end pt-1">
        <AlertDialog>
          <AlertDialogTrigger
            data-slot="on-demand-wait-cancel"
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
              "Cancel request"
            )}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
              <AlertDialogDescription>
                We&apos;ll stop searching for a doctor and release your payment
                hold in full — nothing is deducted. You can book again at any
                time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep waiting</AlertDialogCancel>
              {/*
                Deliberately not also labelled "Cancel request": with the trigger
                carrying that label, two controls one keypress apart would read
                identically, and "Cancel" next to "Cancel" is the classic
                confirm-dialog trap where the destructive and the dismissive
                option are indistinguishable.
              */}
              <AlertDialogAction
                data-slot="on-demand-wait-cancel-confirm"
                onClick={cancel}
              >
                Yes, cancel &amp; refund my hold
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/** Preferences the patient supplied, shown only where matching honours them. */
function MatchPreferences({ booking }: { booking: Booking }) {
  const chip =
    "flex items-center gap-1.5 rounded-full bg-(--surface-warm) px-3 py-1.5 text-[12.5px] font-medium text-(--text-muted)";
  return (
    <div className="flex flex-wrap gap-2.5">
      <span className={chip}>
        <Cog className="size-3.5 shrink-0" />
        <span className="capitalize">
          {booking.genderPreference?.length
            ? booking.genderPreference.join(" • ")
            : "No gender preference"}
        </span>
      </span>
      <span className={chip}>
        <Languages className="size-3.5 shrink-0" />
        <span className="capitalize">
          {booking.languagePreference?.length
            ? booking.languagePreference.join(" • ")
            : "Any language"}
        </span>
      </span>
    </div>
  );
}

/**
 * Assigned-doctor card.
 *
 * Renders only the fields the backend actually discloses to a patient:
 * `fullName` and the optional `specialty`. The banner image is decorative and
 * carries an empty alt text — it is not a photograph of the clinician, so
 * labelling it with their name would misrepresent it to a screen reader.
 *
 * This card is only reached once matching has resolved, so the title must never
 * claim assignment is pending. An unresolved `doctorName` on a booking that has a
 * `doctorId` means the directory did not disclose the doctor to this patient, not
 * that nobody was assigned.
 */
function DoctorReviewCard({ booking }: { booking: Booking }) {
  const doctorLabel = assignedDoctorLabel(booking.doctorName, booking.doctorId);
  const specialty = booking.doctorSpecialty.trim();

  return (
    <Card className="relative mx-auto flex w-full flex-col overflow-hidden pt-0 shadow-lg">
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src="/medicinePlaceholder.jpg"
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="z-20 object-cover brightness-80 dark:brightness-40"
          loading="eager"
        />
      </div>

      <CardHeader className="flex-1">
        <CardTitle>{doctorLabel}</CardTitle>
        <CardDescription>
          {specialty ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5 shrink-0" />
              {specialty}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Specialty not listed
            </span>
          )}
        </CardDescription>
      </CardHeader>

      {booking.doctorId ? (
        <CardContent className="flex justify-end pt-0 pb-4">
          <Link
            href={`/patient/booking/doctor/${booking.doctorId}`}
            className="flex items-center gap-1 bg-transparent text-xs font-medium text-(--text-link) underline transition-colors hover:text-(--text-link-hover)"
          >
            <LinkIcon className="size-3.5" strokeWidth={1.5} />
            View Doctor
          </Link>
        </CardContent>
      ) : null}
    </Card>
  );
}
