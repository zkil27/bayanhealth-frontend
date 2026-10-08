"use client";

import {
  AlertCircle,
  Check,
  UserSearch,
  Cog,
  Languages,
  LinkIcon,
  ShieldCheck,
  Stethoscope,
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
import { WaitingJeepney } from "../WaitingJeepney";
import { DeviceCheckButton } from "@/features/patient/components/homepage/DeviceCheckButton";
import { Booking } from "../../types/booking.types";
import type { FindingState } from "../../hooks/useFinding";
import { useCancelBooking } from "../../hooks/useCancelBooking";
import { assignedDoctorLabel } from "../../lib/doctorLabels";
import { isUsableWaitStart } from "../../lib/waitElapsed";
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
import { cn } from "@/lib/utils";
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
  const hasPreferences =
    preferencesApply &&
    Boolean(booking.genderPreference?.length || booking.languagePreference?.length);

  /*
   * The waiting room, for patients who may be anxious, older, or new to
   * telehealth. It used to stack a "Live" pill, an icon tile, an illustration,
   * a spinner, a percentage, a heartbeat bar and two explainer cards. Now:
   * scenery to watch (waits with something to look at feel shorter), one
   * plain heading, and three named stages instead of a percentage — a bar
   * parked at "66%" reads as stuck, while "Waiting for a doctor to accept"
   * says what is actually happening. Stages come from the same
   * `FindingUpdate.progress` the bar used (33 payment, 66 matching).
   */
  const stages = [
    {
      label: progress >= 66 ? "Payment on hold" : "Confirming your payment",
      state: progress >= 66 ? "done" : "current",
    },
    {
      label: isAwaitingAcceptance
        ? "Waiting for a doctor to accept"
        : "Matching you with a doctor",
      state: progress >= 66 ? "current" : "pending",
    },
    { label: "Your consultation room opens", state: "pending" },
  ] as const;

  return (
    <div className="animate-in duration-300 fade-in motion-reduce:animate-none">
      <WaitingJeepney />

      <div className="mt-5">
        <h3 className="text-2xl leading-tight font-bold tracking-[-0.01em] text-(--text-heading)">
          Finding a doctor for you
        </h3>
        <p className="mt-1.5 max-w-prose text-base leading-relaxed text-(--text-body)">
          You can keep this screen open. It changes by itself as soon as{" "}
          {isAwaitingAcceptance ? "a doctor accepts" : "a doctor is matched"}.
        </p>
        {isAwaitingAcceptance ? <WaitedFor booking={booking} /> : null}
      </div>

      {hasPreferences ? (
        <div className="mt-4">
          <MatchPreferences booking={booking} />
        </div>
      ) : null}

      <ol
        data-slot="finding-step-progress"
        aria-label="Booking progress"
        className="mt-6 space-y-0"
      >
        {stages.map((stage, index) => (
          <li key={stage.label} className="relative flex gap-3.5 pb-5 last:pb-0">
            {index < stages.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 bottom-1 left-[15px] w-0.5 rounded-full",
                  stage.state === "done" ? "bg-(--action-primary)" : "bg-(--border-default)",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                stage.state === "done" && "border-(--action-primary) bg-(--action-primary) text-(--text-inverse)",
                stage.state === "current" && "border-(--action-primary) bg-(--surface-card)",
                stage.state === "pending" && "border-(--border-default) bg-(--surface-card)",
              )}
            >
              {stage.state === "done" ? <Check className="size-4.5 stroke-[3]" /> : null}
              {stage.state === "current" ? <span className="size-3 rounded-full bg-(--action-primary)" /> : null}
            </span>
            <span
              className={cn(
                "pt-1 text-base leading-snug",
                stage.state === "current" ? "font-semibold text-(--text-heading)" : stage.state === "done" ? "text-(--text-body)" : "text-(--text-muted)",
              )}
            >
              {stage.label}
              <span className="sr-only">
                {stage.state === "done" ? " (done)" : stage.state === "current" ? " (now)" : " (next)"}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="sr-only">{message}</p>

      <WhileYouWait />

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

const WAIT_PREP = [
  "Find a quiet, well-lit place",
  "Have photos of past lab results or your maintenance medicines ready",
  "Note when your symptoms started",
] as const;

/**
 * Turns the wait into preparation. These tips used to sit on the booking path
 * chooser and the Consult Now form — before the patient had any time to act
 * on them. Here they can, and the camera/microphone check (the reused, fully
 * local `DeviceCheckButton`) targets the most common telehealth failure:
 * connection and device problems found only once the call starts.
 */
function WhileYouWait() {
  return (
    <section aria-labelledby="while-you-wait-heading" className="mt-6 border-t border-(--border-subtle) pt-5">
      <h4 id="while-you-wait-heading" className="text-[17px] font-semibold text-(--text-heading)">
        While you wait
      </h4>
      <ul className="mt-2.5 space-y-2">
        {WAIT_PREP.map((tip) => (
          <li key={tip} className="flex items-start gap-2.5 text-base leading-snug text-(--text-body)">
            <Check aria-hidden className="mt-0.5 size-4.5 shrink-0 text-(--teal-700)" />
            {tip}
          </li>
        ))}
      </ul>
      <DeviceCheckButton className="mt-4" />
    </section>
  );
}

/** How often the elapsed-wait reading is recomputed — it is shown in whole minutes. */
const WAIT_TICK_MS = 15_000;

/**
 * "Waiting 4 min", from the booking's own `updatedAt` — for an unclaimed pooled
 * request that is the payment hold that put it in the pool, the only write
 * while it waits. Whole minutes rather than a ticking stopwatch: seconds
 * counting up in front of an anxious patient makes the wait feel longer, and
 * no remaining-time estimate is shown because none could be honest.
 */
function WaitedFor({ booking }: { booking: Booking }) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), WAIT_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const requestedAtMs = booking.updatedAt.getTime();
  if (!isUsableWaitStart(requestedAtMs)) return null;
  const minutes = Math.floor(Math.max(0, nowMs - requestedAtMs) / 60_000);
  const text =
    minutes < 1
      ? "You have been waiting less than a minute."
      : minutes < 60
        ? `You have been waiting ${minutes} min.`
        : `You have been waiting ${Math.floor(minutes / 60)} hr ${minutes % 60} min.`;

  return (
    <p data-slot="on-demand-wait-elapsed" className="mt-2 text-[15px] text-(--text-muted) tabular-nums">
      {text}
    </p>
  );
}

/**
 * The on-demand way out (ADR-20260808-03).
 *
 * An on-demand request is broadcast to every consult-approved doctor and the
 * first to accept takes it, so the patient is waiting on a human decision with
 * no deadline. Cancelling before acceptance releases the payment hold in full —
 * that is the real behaviour: `PUT /v1/bookings/{id}` with `status: cancelled`
 * refunds a `held` payment when the prior status was `confirmed`.
 *
 * Cancellation is offered *here* rather than as a general control on the booking
 * page on purpose. Pre-acceptance is the one point where a full release is the
 * settled policy. Once a doctor has accepted, cancellation carries a grace window
 * and a partial capture that the backend does not implement yet, so a general
 * cancel button would quietly grant full refunds in cases that are not meant to
 * get them.
 */
function OnDemandWaitPanel({ booking }: { booking: Booking }) {
  const { cancel, isCancelling, isCancelled, errorMessage } = useCancelBooking(
    booking.id,
  );

  if (isCancelled) {
    return (
      <div className="mt-6" data-slot="on-demand-wait-cancelled">
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>Request cancelled</AlertTitle>
          <AlertDescription className="text-[15px]">
            Your request has been withdrawn and the payment hold released in
            full. Nothing was charged.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div
      className="mt-6 flex flex-col gap-3 border-t border-(--border-subtle) pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      data-slot="on-demand-wait"
    >
      <p className="max-w-prose text-[15px] leading-relaxed text-(--text-muted)">
        Your payment is on hold, not charged. If you cancel before a doctor
        accepts, the hold is released in full.
      </p>

      {errorMessage ? (
        <Alert variant="destructive" data-slot="on-demand-wait-error">
          <AlertCircle className="size-4" />
          <AlertTitle>We couldn&apos;t cancel your request</AlertTitle>
          <AlertDescription className="text-[15px]">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      <AlertDialog>
        <AlertDialogTrigger
          data-slot="on-demand-wait-cancel"
          disabled={isCancelling}
          render={
            <Button
              type="button"
              variant="outline"
              className="h-12 min-h-12 w-full shrink-0 rounded-full border-(--border-strong) px-6 text-base font-semibold text-(--text-body) hover:bg-(--surface-canvas) sm:w-auto"
            />
          }
        >
          {isCancelling ? (
            <>
              <Spinner className="mr-2 size-4" />
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
  );
}

/** Preferences the patient supplied, shown only where matching honours them. */
function MatchPreferences({ booking }: { booking: Booking }) {
  const chip =
    "flex items-center gap-1.5 rounded-full bg-(--surface-warm) px-3 py-1.5 text-[15px] font-medium text-(--text-body) border border-(--border-subtle)";
  return (
    <div className="flex flex-wrap gap-2">
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
      <div className="relative aspect-video w-full overflow-hidden bg-(--surface-warm-soft)">
        <Image
          src="/illustrations/patient/doctor-matched.webp"
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="z-20 object-contain p-2"
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
