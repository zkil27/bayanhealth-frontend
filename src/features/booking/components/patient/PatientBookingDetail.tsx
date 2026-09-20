"use client";

import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowLeft,
  FileQuestion,
  MessageSquare,
  Video,
} from "lucide-react";

import { ConsultationVideo } from "@/features/media/components/ConsultationVideo";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PatientEducationCard } from "@/features/consultation/components/patientEducation/PatientEducationCard";
import { PrescriptionCard } from "@/features/consultation/components/prescription/PrescriptionCard";
import { shouldPollReleasedArtifacts } from "@/features/consultation/lib/releasedArtifacts";
import { ApiError } from "@/lib/api";
import { displayBookingStatus } from "@/lib/bookings";
import { useIdToken } from "@/stores/useAuthStore";

import {
  fetchBookingDetail,
  type BookingDetail,
} from "../../lib/api/bookingDetail";
import { fetchPatientIntake } from "../../lib/api/patientIntake";
import {
  fetchDoctorPublicProfile,
  type DoctorPublicSummary,
} from "../../lib/api/doctors";
import {
  DOCTOR_MATCHING_LABEL,
  DOCTOR_RESOLVING_LABEL,
  DOCTOR_UNDISCLOSED_LABEL,
} from "../../lib/doctorLabels";
import { BookingWizard } from "../consultation/BookingWizard";
import type { Booking, BookingStep, Service } from "../../types/booking.types";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatConsultationDateTime } from "@/lib/consultation-time";
import { cn } from "@/lib/utils";

/**
 * Result of resolving a booking detail.
 *
 * A 404 from `GET /v1/bookings/{bookingId}` is mapped to a distinct
 * `{ kind: "not-found" }` result rather than thrown, so it renders a dedicated,
 * non-revealing not-found state in the data branch — kept separate from the
 * generic AsyncView error state (Requirement 10.5). Any non-404 failure (or the
 * 10s timeout) is thrown through to the AsyncView error + retry state
 * (Requirement 10.6).
 */
type DetailResult =
  | { kind: "found"; booking: BookingDetail }
  | { kind: "not-found" };

/**
 * Whether the patient's intake still needs completing.
 *
 * - `loading`   — the intake read is in flight; the wizard is withheld so it
 *                 does not flash the wrong step and then jump.
 * - `pending`   — no intake form yet, or one that is not `submitted`.
 * - `submitted` — intake is done; the booking status decides the step.
 * - `unknown`   — the intake read failed for a reason other than "not started",
 *                 so we fall back to the status mapping instead of trapping the
 *                 patient on a step we cannot verify.
 */
type IntakeGate = "loading" | "pending" | "submitted" | "unknown";

/**
 * Outcome of resolving the assigned doctor's public summary.
 *
 * `fetchDoctorPublicProfile` returns `null` on 404, and the backend uses 404 for
 * both "no such doctor" and "not consultation-approved" so neither is disclosed.
 * A `null` is therefore a *resolved* answer, not a pending one — reading it as
 * pending is what left the patient on "Resolving doctor…" forever on a confirmed,
 * assigned booking. The four cases are modelled explicitly so no caller has to
 * re-derive them from a data/flag combination and get it wrong again.
 */
type DoctorResolution =
  /** The booking carries no `doctorId`; matching has not produced one yet. */
  | { kind: "unassigned" }
  /** The summary read is genuinely in flight. */
  | { kind: "pending" }
  /** The directory disclosed the doctor. */
  | { kind: "resolved"; doctor: DoctorPublicSummary }
  /** A doctor is assigned, but the directory did not disclose them (404/error). */
  | { kind: "undisclosed" };

/**
 * Booking statuses during which the backend still accepts intake writes
 * (`PUT /v1/bookings/{bookingId}/intake`). Outside this set an unsubmitted
 * intake cannot be completed, so the wizard follows the status mapping.
 */
const INTAKE_EDITABLE_STATUSES: ReadonlySet<string> = new Set([
  "pending_payment",
  "payment_submitted",
  "confirmed",
]);

/**
 * Backend-wired patient booking detail (Slice 5, task 10.5).
 *
 * Renders `GET /v1/bookings/{bookingId}` through {@link AsyncView}:
 * - loading: a defined loading indicator while the request is in flight;
 * - data:    either the booking detail (Requirement 10.4) with a defined status
 *            label via {@link displayBookingStatus} (Requirements 10.7, 10.8),
 *            or a dedicated not-found state on 404 (Requirement 10.5);
 * - error:   a defined error state with a retry control on a non-404 failure or
 *            the 10s timeout (Requirement 10.6).
 *
 * The 404 not-found state does not reveal whether the booking exists or is owned
 * by the patient — the backend deliberately uses 404 for both cases, and this UI
 * mirrors that by presenting a single neutral message.
 */
export function PatientBookingDetail({ bookingId }: { bookingId: string }) {
  const idToken = useIdToken();

  const {
    data: result,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["booking", bookingId, idToken],
    queryFn: async (): Promise<DetailResult> => {
      try {
        const booking = await fetchBookingDetail(idToken ?? "", bookingId);
        return { kind: "found", booking };
      } catch (err) {
        // 404 is expected - return not-found
        if (err instanceof ApiError && err.status === 404) {
          return { kind: "not-found" };
        }
        // Rethrow other errors
        throw err;
      }
    },
    enabled: !!idToken, // Only run if we have a token
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
    refetchInterval: 1000 * 30, // Refetch every 30s for status updates
    refetchIntervalInBackground: true, // Keep fresh even when tab not focused
    retry: false,
    throwOnError: false,
  });

  // The intake step is only reachable if we know whether intake was submitted;
  // booking status alone never encodes it. A 404 (no form yet) arrives as null.
  const intakeQuery = useQuery({
    queryKey: ["booking-intake", bookingId, idToken],
    queryFn: () => fetchPatientIntake(idToken ?? "", bookingId),
    enabled: !!idToken && result?.kind === "found",
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  // The booking record carries only `doctorId`. The wizard shows the assigned
  // doctor by name, so resolve the patient-safe summary from the doctor
  // directory. A failure or 404 leaves the name empty and the card says the
  // doctor is assigned but undisclosed rather than inventing one.
  const assignedDoctorId =
    result?.kind === "found" ? (result.booking.doctorId ?? "") : "";
  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", assignedDoctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(assignedDoctorId, idToken ?? ""),
    enabled: !!idToken && assignedDoctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  if (isLoading || (!error && !result)) {
    return (
      <PageFrame bookingId={bookingId}>
        <BookingLoadingSkeleton />
      </PageFrame>
    );
  }

  if (error) {
    return (
      <PageFrame bookingId={bookingId}>
        <BookingError error={error} onRetry={() => void refetch()} isFetching={isFetching} />
      </PageFrame>
    );
  }

  if (!result || result.kind === "not-found") {
    return (
      <PageFrame bookingId={bookingId}>
        <BookingNotFound />
      </PageFrame>
    );
  }

  const booking = result.booking;
  const intakeGate: IntakeGate = intakeQuery.isError
    ? "unknown"
    : intakeQuery.isSuccess
      ? intakeQuery.data?.status === "submitted"
        ? "submitted"
        : "pending"
      : "loading";
  // `isPending` rather than `isFetching`: `isFetching` is also true during a
  // background refetch of an already-answered query, which would flip a settled
  // "assigned, undisclosed" card back to "Resolving doctor…" on every revalidation.
  // The `assignedDoctorId` guard comes first because a disabled query reports
  // `isPending` forever, which would otherwise read as in-flight.
  const doctorResolution: DoctorResolution = !assignedDoctorId
    ? { kind: "unassigned" }
    : doctorQuery.isPending
      ? { kind: "pending" }
      : doctorQuery.data
        ? { kind: "resolved", doctor: doctorQuery.data }
        : { kind: "undisclosed" };
  const wizardBooking = toWizardBooking(booking, intakeGate, doctorResolution);
  return (
    <div className="flex flex-col gap-4" data-slot="patient-booking-detail">
      <BookingContextBar
        bookingId={booking.bookingId}
        context={
          wizardBooking?.step === "intake"
            ? { kind: "intake", service: booking.serviceType }
            : wizardBooking || !intakeStillLoading(booking, intakeGate)
              ? { kind: "booking", booking, doctor: doctorResolution }
              : { kind: "unknown" }
        }
      />
      {/*
        Chat opens once a doctor is assigned, not only once the consultation has
        started (ADR-20260809-05) — so the patient needs an entry from `confirmed`
        onward. Gating this on `in_progress` was why the patient had no way into the
        chat room at all: the backend allowed the conversation and the UI offered no
        door to it.
      */}
      {(booking.status === "confirmed" || booking.status === "in_progress") &&
      booking.doctorId ? (
        <JoinConsultationCard
          bookingId={booking.bookingId}
          hasStarted={booking.status === "in_progress"}
        />
      ) : (booking.status === "completed" || booking.status === "cancelled") &&
        booking.doctorId ? (
        // Read-only history (ADR-20260909-01). `CompletedStep` (rendered by
        // `BookingWizard` below) tells the patient their chat history stays
        // available either way — that claim used to be true only via the
        // separate `/patient/chat` nav tab, with no door to it from this page,
        // the one making the promise.
        <ChatHistoryCard bookingId={booking.bookingId} />
      ) : null}
      {/*
        `<ConsultationVideo />` gates its own credential requests on
        `booking.status` (Requirement 20.6) and renders nothing while
        ineligible, so a pre-consult or unconfigured booking shows the page
        without a dead control.
      */}
      <ConsultationVideo bookingId={booking.bookingId} bookingStatus={booking.status} />
      {/*
        Released education sits above the wizard because it is post-consult
        content the patient is meant to act on, while the wizard has already
        collapsed to its terminal step by then. It renders nothing until a
        physician releases an article, so this costs the pre-consult view nothing.
      */}
      {/*
        `poll` is what makes the "appears here" promise in `CompletedStep` true.
        Release is silent server-side — no notification is enqueued — so without
        an interval a patient watching this page saw nothing until they reloaded.
        Scoped to the two statuses in which a release can actually happen so an
        old booking left open in a tab does not poll indefinitely.
      */}
      <PatientEducationCard
        consultationId={booking.consultationId}
        poll={shouldPollReleasedArtifacts(booking.status)}
      />
      {/*
        The prescription sits below education deliberately: education explains the
        condition, the prescription acts on it, and a patient should meet them in
        that order. Like the education card it renders nothing until a physician
        releases one, so this costs the pre-consult view nothing.
      */}
      <PrescriptionCard
        consultationId={booking.consultationId}
        poll={shouldPollReleasedArtifacts(booking.status)}
      />
      {wizardBooking ? <BookingWizard booking={wizardBooking} /> : null}
    </div>
  );
}

/**
 * The patient's entry into the consultation room.
 *
 * This is the only patient-side route into the booking-keyed room, and it used to
 * render solely while the booking was `in_progress`. Once chat opened at doctor
 * assignment (ADR-20260809-05) that made the feature unreachable from the patient's
 * side: the server allowed the conversation and no screen offered a way in.
 *
 * Two states, because the promise differs. Before the doctor starts, the room
 * offers chat plus the pre-join device test and join-with-confirmation flow that
 * `<ConsultationVideo />` itself renders (the consultation has not begun, so this
 * card does not claim it has). Once started, it is the live consultation.
 */
function JoinConsultationCard({
  bookingId,
  hasStarted,
}: {
  bookingId: string;
  hasStarted: boolean;
}) {
  return (
    <section
      data-slot="join-consultation"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4"
    >
      <div className="flex items-center gap-2">
        {hasStarted ? (
          <Video className="size-5 shrink-0 text-primary" />
        ) : (
          <MessageSquare className="size-5 shrink-0 text-primary" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {hasStarted
              ? "Your consultation has started"
              : "Enter the consultation room"}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasStarted
              ? "Join the conversation with your doctor."
              : "Chat with your doctor, test your camera and mic, and join when you're ready."}
          </p>
        </div>
      </div>
      <Link href={`/consultation/room/${encodeURIComponent(bookingId)}`}>
        <Button size="sm">
          {hasStarted ? "Join consultation" : "Enter room"}
        </Button>
      </Link>
    </section>
  );
}

/**
 * The patient's entry into their past conversation with the doctor
 * (ADR-20260909-01).
 *
 * Distinct from {@link JoinConsultationCard}: it never claims a consultation is
 * live or joinable, and it routes to the read-only patient chat view rather
 * than `/consultation/room/{bookingId}` — that room redirects a completed
 * booking straight back out (ADR-20260810-02) and has no route into a
 * `cancelled` one at all.
 */
function ChatHistoryCard({ bookingId }: { bookingId: string }) {
  return (
    <section
      data-slot="chat-history-entry"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-card-foreground"
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Your conversation with your doctor
          </p>
          <p className="text-xs text-muted-foreground">
            You can read it any time. New messages aren&apos;t possible here
            anymore.
          </p>
        </div>
      </div>
      <Link href={`/patient/chat/${encodeURIComponent(bookingId)}`}>
        <Button size="sm" variant="outline">
          View conversation
        </Button>
      </Link>
    </section>
  );
}

/**
 * What the summary card puts in the doctor slot for each resolution state.
 *
 * Kept as an exhaustive switch so adding a state to {@link DoctorResolution}
 * fails the typecheck here instead of silently falling through to the wrong copy.
 */
function doctorSlotLabel(resolution: DoctorResolution): string {
  switch (resolution.kind) {
    case "resolved":
      return resolution.doctor.fullName;
    case "pending":
      return DOCTOR_RESOLVING_LABEL;
    case "undisclosed":
      return DOCTOR_UNDISCLOSED_LABEL;
    case "unassigned":
      return DOCTOR_MATCHING_LABEL;
  }
}

type BarContext =
  /** Still resolving; show nothing that might be contradicted a moment later. */
  | { kind: "unknown" }
  /** Intake is the current step: the booking is a draft, nothing is paid or matched. */
  | { kind: "intake"; service?: string }
  | { kind: "booking"; booking: BookingDetail; doctor: DoctorResolution };

function intakeStillLoading(booking: BookingDetail, gate: IntakeGate): boolean {
  return INTAKE_EDITABLE_STATUSES.has(booking.status ?? "") && gate === "loading";
}

function serviceTitle(serviceType?: string): string {
  const service = (serviceType ?? "")
    .replaceAll("_", " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
  if (!service) return "Teleconsult";
  return /consult/i.test(service) ? service : `${service} Teleconsult`;
}

/** Status tone → token classes for the one badge in the bar. */
const TONE_BADGE: Record<string, string> = {
  warning: "bg-(--status-soon-bg) text-(--status-soon-fg)",
  success: "bg-(--safe-bg) text-(--safe-fg)",
  danger: "bg-(--danger-bg) text-(--danger-fg)",
};

/** Page frame for the non-data states, so the bar (and a way out) is always there. */
function PageFrame({ bookingId, children }: { bookingId: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <BookingContextBar bookingId={bookingId} context={{ kind: "unknown" }} />
      {children}
    </div>
  );
}

/**
 * The page's single header: back, encounter title, one status badge, and the
 * booking reference, which appears nowhere else on the page.
 *
 * It replaces the breadcrumb, the "Booking Progress" title bar and the detached
 * summary card. During intake the booking is only a draft, so payment and
 * doctor-matching states are withheld until they are actually true.
 */
export function BookingContextBar({ bookingId, context }: { bookingId: string; context: BarContext }) {
  const intake = context.kind === "intake";
  const status =
    context.kind === "booking"
      ? displayBookingStatus(context.booking.status, !!context.booking.declinedBy)
      : null;

  const title =
    context.kind === "intake"
      ? `${serviceTitle(context.service)} Intake`
      : context.kind === "booking"
        ? serviceTitle(context.booking.serviceType)
        : "Booking";

  const subtitle =
    context.kind === "intake"
      ? "Complete intake to match with a PRC-licensed physician."
      : context.kind === "booking"
        ? [doctorSlotLabel(context.doctor), context.booking.scheduledAt ? formatConsultationDateTime(context.booking.scheduledAt) : null]
            .filter(Boolean)
            .join(" · ")
        : null;

  return (
    <header
      data-slot="booking-context-bar"
      className="flex w-full items-center justify-between gap-3 border-b border-(--border-subtle) pt-1 pb-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/patient/health"
          aria-label={intake ? "Exit intake" : "Back to Health"}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-card) text-(--text-muted) shadow-sm transition-colors hover:bg-(--surface-canvas) hover:text-(--text-heading) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <ArrowLeft aria-hidden className="size-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-bold text-(--text-heading)">{title}</h1>
            {intake ? (
              <span className="shrink-0 rounded-md bg-(--surface-accent-soft) px-2 py-0.5 text-[10px] font-bold tracking-wider text-(--status-available-fg) uppercase">
                Draft
              </span>
            ) : status ? (
              <span
                data-tone={status.tone}
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                  TONE_BADGE[status.tone] ?? "bg-(--status-pilot-bg) text-(--status-pilot-fg)",
                )}
              >
                {status.label}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="truncate text-[11px] font-medium text-(--text-subtle)">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <span className="block text-[10px] font-bold tracking-wider text-(--text-subtle) uppercase">
          Booking reference
        </span>
        <span className="font-mono text-xs font-semibold text-(--text-body)">{bookingId}</span>
      </div>
    </header>
  );
}

/**
 * Map real booking state (plus the intake gate) onto a wizard step.
 *
 * Intake precedes payment, so while the backend still accepts intake writes and
 * the form is not submitted the wizard sits on `intake`. Once submitted, the
 * booking status drives the step — `pending_payment` -> `payment` as before.
 * Returns null when there is no step to show yet.
 */
function toWizardBooking(
  detail: BookingDetail,
  intakeGate: IntakeGate,
  doctorResolution: DoctorResolution,
): Booking | null {
  // `payment_submitted` only occurs on the legacy proof-upload path. The wired
  // payment path (`POST /v1/bookings/{id}/payment/hold`) transitions straight
  // from `pending_payment` to `confirmed` (backend/src/lib/payments.ts), so
  // matching state has to be read off `confirmed` + `doctorId` instead — without
  // that, the Finding step was unreachable and the wizard jumped payment ->
  // confirmation.
  const stepByStatus: Record<string, BookingStep> = {
    pending_payment: "payment",
    payment_submitted: "finding",
    confirmed: detail.doctorId ? "confirmation" : "finding",
    in_progress: "confirmation",
    completed: "appointment",
    cancelled: "appointment",
  };

  const intakeStillOpen = INTAKE_EDITABLE_STATUSES.has(detail.status ?? "");
  if (intakeStillOpen && intakeGate === "loading") return null;

  // `Booking` has no way to say "name still loading" — it carries a plain
  // `doctorName` string — so an in-flight summary read would render as the
  // terminal "assigned, undisclosed" copy and then be replaced by a name. The
  // wizard is withheld for that one round trip instead, the same way it is
  // withheld while the intake gate is unresolved, so it never states something it
  // is about to contradict.
  if (doctorResolution.kind === "pending") return null;
  const doctor =
    doctorResolution.kind === "resolved" ? doctorResolution.doctor : null;

  const step =
    intakeStillOpen && intakeGate === "pending"
      ? "intake"
      : stepByStatus[detail.status ?? ""];
  if (!step) return null;

  const serviceRequested: Service["value"] = "teleconsult";
  return {
    id: detail.bookingId,
    step,
    status: detail.status,
    declinedBy: detail.declinedBy,
    declineReason: detail.declineReason,
    acceptedAt: detail.acceptedAt,
    settlementReason: detail.settlementReason,
    patientId: detail.patientId ?? "",
    doctorId: detail.doctorId ?? "",
    scheduledDate: detail.scheduledAt ?? "",
    amountCents: detail.amountCents,
    currency: detail.currency,
    createdAt: new Date(detail.createdAt ?? 0),
    updatedAt: new Date(detail.updatedAt ?? detail.createdAt ?? 0),
    serviceRequested,
    genderPreference: [],
    languagePreference: [],
    // Read from the record, not inferred from the absence of a `doctorId`. This
    // used to be `detail.doctorId ? "regular" : "on-demand"`, which called every
    // unassigned booking on-demand — so a scheduled booking still awaiting the
    // matcher was shown on-demand copy, and an accepted on-demand booking was
    // shown as if it had never been one.
    bookingType: detail.bookingMode === "on_demand" ? "on-demand" : "scheduled",
    // Empty means "not disclosed to this patient", never "not assigned" — the
    // wizard steps read `doctorId` to tell those apart (see doctorLabels.ts).
    doctorName: doctor?.fullName ?? "",
    doctorAvatar: "",
    doctorSpecialty: doctor?.specialty ?? "",
  };
}

function BookingLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-slot="async-view-loading">
      <div className="rounded-xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-gray-400" />
            <div className="h-4 w-24 animate-pulse rounded bg-gray-400" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded bg-gray-400" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-400" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-400" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-400" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-400" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-400" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dedicated not-found state for a 404 (Requirement 10.5).
 *
 * Distinct from the generic AsyncView error state and deliberately neutral: it
 * never states whether the booking exists or belongs to another patient.
 */
function BookingNotFound() {
  return (
    <Empty data-slot="patient-booking-detail-not-found">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion />
        </EmptyMedia>
        <EmptyTitle>Booking not available</EmptyTitle>
        <EmptyDescription>
          We couldn&apos;t find this booking. It may not exist or may not be
          available to your account.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function BookingError({
  error,
  onRetry,
  isFetching,
}: {
  error: unknown;
  onRetry: () => void;
  isFetching: boolean;
}) {
  const errorMessage =
    error instanceof Error ? error.message : "Something went wrong";

  return (
    <div
      data-slot="async-view-error"
      className="flex min-h-32 w-full flex-col items-center justify-center gap-3 p-6"
    >
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Couldnt load booking</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isFetching}
      >
        {isFetching ? (
          <>
            <Spinner className="mr-2 size-3" />
            Retrying...
          </>
        ) : (
          "Try again"
        )}
      </Button>
    </div>
  );
}
