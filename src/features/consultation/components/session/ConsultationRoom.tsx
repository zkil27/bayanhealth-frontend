"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CheckCircle2,
  Clock,
  Hourglass,
  MessagesSquare,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useIdToken, useUserId } from "@/stores/useAuthStore";

import { fetchBookingDetail } from "@/features/booking/lib/api/bookingDetail";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { fetchBookingIntake } from "@/features/doctor/lib/api/bookingIntake";
import { useStartConsultation } from "@/features/doctor/hooks/useStartConsultation";
import { ConsultationVideo } from "@/features/media/components/ConsultationVideo";
import { PatientCompanionSuite } from "@/components/consultation/PatientCompanionSuite";
import { DoctorClinicalCompanionSuite } from "@/components/consultation/DoctorClinicalCompanionSuite";
import { formatDoctorName } from "@/lib/utils";

import {
  completeConsultation,
  fetchBookingConsultationState,
  type ConsultationSessionSummary,
} from "../../lib/api/consultSession";

/** Poll cadence while waiting for the other participant to start the session. */
const POLL_INTERVAL_MS = 4000;

/**
 * Booking-keyed consultation room (ADR-20260806-01).
 *
 * The one-time link is single-use by design: whoever opens it consumes it and
 * the session is created once. That left the second participant with no way in —
 * the only chat surface was keyed by the token, so the other party got a `409`
 * and there was nowhere to go. This room is keyed by `bookingId` instead and
 * reads the already-active session from `GET /v1/bookings/{bookingId}/state`, so
 * both the patient and the assigned doctor occupy the same conversation.
 *
 * It also carries the only "End consultation" control in the product. Nothing
 * else calls `POST /v1/bookings/{bookingId}/complete`, and that call is what
 * captures the payment, ends the canonical CDS session, and initializes the
 * Assessment the post-consult workspace needs — so without it a consultation
 * stays `in_progress` forever and the assessment-first pipeline is unreachable.
 */
export function ConsultationRoom({ bookingId }: { bookingId: string }) {
  const idToken = useIdToken();
  const userId = useUserId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [completionError, setCompletionError] = useState<string | null>(null);

  const stateQuery = useQuery({
    queryKey: ["consultation-state", bookingId, idToken],
    queryFn: () => fetchBookingConsultationState(idToken ?? "", bookingId),
    enabled: !!idToken,
    // Keep polling until a session exists. A successful read is no longer terminal:
    // the pre-consult phase resolves with no session, and the room must notice when
    // the doctor starts the consultation so it can upgrade itself to realtime.
    refetchInterval: (query) => (query.state.data?.session ? false : POLL_INTERVAL_MS),
    retry: false,
  });

  // `<ConsultationVideo />` needs the booking's own status to gate its credential
  // requests (Requirement 20.6), so the room reads the booking too, not just
  // `/state`. Both participants reach the room through this component.
  //
  // Polls at the same cadence as `stateQuery` until the booking reaches a
  // terminal status. Doctor and patient are different browser sessions with
  // independent query caches — the doctor's own `invalidateQueries` after
  // completing has no effect on the patient's client. Without this poll, the
  // patient's `bookingQuery.data.status` never learns the doctor ended the
  // consultation, so the completed-booking redirect below never fires for
  // them and they are left on a stale "in progress" view (ADR-20260810-02
  // follow-up).
  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId, idToken],
    queryFn: () => fetchBookingDetail(idToken ?? "", bookingId),
    enabled: !!idToken,
    staleTime: 1000 * 60 * 5,
    retry: false,
    throwOnError: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "cancelled" ? false : POLL_INTERVAL_MS;
    },
  });

  // Captured before the doctor's own completion redirect, and used to gate
  // the completed-booking redirect below. `complete.mutate()`'s own
  // `invalidateQueries` refetches `bookingQuery` in the same browser tab,
  // and that refetch can resolve before `router.push` below finishes its
  // navigation. Without this guard the doctor's own completion briefly
  // renders `RedirectToBookingPanel` (the *patient's* completed view) and
  // its `router.replace` wins the race against `router.push`, sending the
  // doctor to their own booking page instead of the post-consult workspace
  // (ADR-20260810-02 follow-up).
  const [dismissedCompletionRedirect, setDismissedCompletionRedirect] = useState(false);

  const complete = useMutation({
    mutationFn: () => completeConsultation(idToken ?? "", bookingId),
    onSuccess: () => {
      setCompletionError(null);
      setDismissedCompletionRedirect(true);
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["doctor-intake-queue"] });
      // Read from the booking record, not `stateQuery`'s session summary --
      // `bookingQuery`'s own consultationId is written by the same `/start`
      // call that creates the session, so it is available at the same time
      // and does not depend on which query happened to resolve first.
      const consultationId = bookingQuery.data?.consultationId ?? stateQuery.data?.session?.consultationId;
      // Hand the doctor straight to the post-consult workspace, which is keyed by
      // consultationId. Without this the workspace is only reachable by typing
      // the query parameter by hand. `bookingId` rides along because the
      // patient's intake is addressed by booking id, not consultation id.
      router.push(
        consultationId
          ? `/doctor/post-consultation/id?consultationId=${encodeURIComponent(consultationId)}&bookingId=${encodeURIComponent(bookingId)}`
          : "/doctor",
      );
    },
    onError: (err) => {
      setCompletionError(
        err instanceof Error ? err.message : "Could not complete the consultation.",
      );
    },
  });

  if (stateQuery.isLoading) {
    return (
      <CenteredRoomPanel>
        <div
          data-slot="consultation-room-loading"
          className="flex min-h-40 items-center justify-center gap-2 rounded-3xl border border-slate-200/70 bg-(--surface-card) p-6 text-sm text-slate-500 shadow-xs"
        >
          <Spinner className="size-4" />
          Opening consultation…
        </div>
      </CenteredRoomPanel>
    );
  }

  if (stateQuery.error) {
    return (
      <CenteredRoomPanel>
        <div
          data-slot="consultation-room-error"
          className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200/70 bg-(--surface-card) p-6 shadow-xs"
        >
          <Alert variant="destructive" className="max-w-md rounded-2xl border-rose-200 bg-rose-50">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Couldn&apos;t open the consultation</AlertTitle>
            <AlertDescription>
              {stateQuery.error instanceof Error
                ? stateQuery.error.message
                : "Something went wrong"}
            </AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => void stateQuery.refetch()}>
            Try again
          </Button>
        </div>
      </CenteredRoomPanel>
    );
  }

  // `GET /state` answers 409 both before the consultation starts and after it
  // ends — `CHAT_ENABLED_STATUSES` on the backend is `['confirmed', 'in_progress']`
  // and excludes `completed` — so `stateQuery.data` is `null` in both cases and
  // this branch cannot tell them apart on its own. Before the consultation has
  // started that ambiguity is fine: it is a neutral waiting state that resolves
  // itself once the doctor starts. After it has ended it is not fine: the
  // booking-detail query below still answers (it has no such gate), so a patient
  // who stayed on this page after the doctor pressed "End consultation" was left
  // on a permanent "hasn't started yet" screen for a consultation that was
  // actually over — nothing on this route ever told them to leave it.
  //
  // Redirect off this route as soon as the booking's own status says the
  // consultation is finished, rather than exposing a control here for something
  // there is nothing left to do. `CompletedStep` on the patient's own booking
  // page already renders the right next-step messaging (education/prescription
  // cards, "your doctor is writing up their findings") — this route has no
  // equivalent and should not grow one.
  if (bookingQuery.data?.status === "completed" && !dismissedCompletionRedirect) {
    return (
      <CenteredRoomPanel>
        <RedirectToBookingPanel bookingId={bookingId} />
      </CenteredRoomPanel>
    );
  }

  if (!stateQuery.data) {
    return (
      <CenteredRoomPanel>
        <NotStartedPanel isFetching={stateQuery.isFetching} />
      </CenteredRoomPanel>
    );
  }

  const { booking, session } = stateQuery.data;
  const isAssignedDoctor = !!userId && booking.doctorId === userId;

  return (
    <div
      data-slot="consultation-room"
      className="bg-satin flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 text-slate-900 antialiased md:gap-3.5 md:p-5"
    >
      <header className="min-h-14 shrink-0 border-b border-slate-200/70 bg-(--surface-card) px-3 py-2 shadow-xs md:min-h-16 md:rounded-3xl md:border md:px-6 md:py-3">
        {session ? (
          <InProgressHeader
            bookingId={bookingId}
            booking={booking}
            session={session}
            isAssignedDoctor={isAssignedDoctor}
            onComplete={() => complete.mutate()}
            completing={complete.isPending}
          />
        ) : (
          <PreConsultHeader bookingId={bookingId} booking={booking} isAssignedDoctor={isAssignedDoctor} />
        )}
      </header>

      {completionError ? (
        <Alert
          variant="destructive"
          data-slot="consultation-room-complete-error"
          className="shrink-0 rounded-2xl border-rose-200 bg-rose-50 text-rose-800"
        >
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{completionError}</AlertDescription>
        </Alert>
      ) : null}

      {/*
        Dual-pane stage: video on the left, the right pane is role-aware. The
        assigned doctor gets `DoctorClinicalCompanionSuite` (intake reference +
        chat); the patient gets `PatientCompanionSuite`
        (their own intake summary + a next-steps roadmap + the same chat) —
        never the other's tooling. Both panes scroll internally so the room
        itself never grows past the viewport (`header`'s `shrink-0` above and
        this section's own `min-h-0` are what makes that possible).
      */}
      <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(15rem,42dvh)_minmax(0,1fr)] items-stretch gap-0 overflow-hidden md:gap-3.5 lg:grid-cols-12 lg:grid-rows-1 lg:gap-4">
        <div className="flex min-h-0 flex-col overflow-hidden border-b border-teal-950/20 bg-(--surface-nav) p-2 shadow-sm md:rounded-[28px] md:border md:p-4 lg:col-span-7 lg:h-full">
          {/*
            `<ConsultationVideo />` gates its own credential requests on
            `bookingStatus` (Requirement 20.6) and renders nothing while
            ineligible, so an unconfigured or pre-consult environment shows
            the room without a dead button rather than a control that goes
            nowhere. It fills this pane's full height itself (`h-full`
            internally) once a call is live, rather than sizing to its
            content and leaving the rest of this teal panel empty.
          */}
          <ConsultationVideo bookingId={bookingId} bookingStatus={bookingQuery.data?.status} />
        </div>

        {/*
          `sessionId`/`consultationId` are optional and absent pre-consult;
          every panel keys the conversation on `bookingId`, which every
          message carries in both phases, so one continuous thread spans the
          start of the consultation.
        */}
        <aside className="min-h-0 overflow-hidden bg-(--surface-card) shadow-sm md:rounded-[28px] md:border md:border-slate-200/70 lg:col-span-5 lg:h-full">
          {isAssignedDoctor ? (
            <DoctorClinicalCompanionSuite
              bookingId={bookingId}
              sessionId={session?.sessionId}
            />
          ) : (
            <PatientCompanionSuite
              bookingId={bookingId}
              sessionId={session?.sessionId}
              doctorId={booking.doctorId}
            />
          )}
        </aside>
      </main>
    </div>
  );
}

/** Wraps the pre-room states (loading/error/waiting/completed) in the same
 * centered card layout the room used before it grew a dual-pane, full-viewport
 * stage — none of those states have a video/chat surface to give room to. */
function CenteredRoomPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-satin flex min-h-screen w-full flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-20 lg:pb-4">{children}</div>
    </div>
  );
}

/**
 * Identity strip shared by both header phases: a monogram for the *other*
 * participant, their real name where the caller's role is allowed to see it,
 * a status pill, and the booking reference. Never a placeholder name — a
 * doctor viewer without a submitted intake, or a patient viewer before the
 * doctor profile resolves, falls back to the existing queue convention
 * (`Ref XXXXXX`) rather than inventing one.
 */
function RoomHeaderIdentity({
  bookingId,
  booking,
  isAssignedDoctor,
  live,
}: {
  bookingId: string;
  booking: { doctorId?: string };
  isAssignedDoctor: boolean;
  live: boolean;
}) {
  const idToken = useIdToken();

  // Doctor viewer: the patient's name comes back on the same intake read the
  // Patient Intake tab uses (`patientName`, doctor/admin callers only).
  const intakeQuery = useQuery({
    queryKey: ["booking-intake", bookingId, idToken],
    queryFn: () => fetchBookingIntake(idToken ?? "", bookingId),
    enabled: !!idToken && isAssignedDoctor,
    staleTime: 1000 * 30,
    retry: false,
    throwOnError: false,
  });

  // Patient viewer: the doctor's public profile, same query key
  // `PatientCompanionSuite` already reads so this is one shared request.
  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", booking.doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(booking.doctorId ?? "", idToken ?? ""),
    enabled: !!idToken && !isAssignedDoctor && !!booking.doctorId,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  const refLabel = `Ref ${bookingId.slice(-6).toUpperCase()}`;
  const displayName = isAssignedDoctor
    ? intakeQuery.data?.patientName
    : doctorQuery.data?.fullName
      ? formatDoctorName(doctorQuery.data.fullName)
      : undefined;
  const monogram = isAssignedDoctor ? "PT" : "DR";

  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--surface-nav) text-xs font-black text-white shadow-xs sm:size-10 sm:rounded-2xl">
        {monogram}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5 sm:flex-wrap sm:gap-2">
          <h1 className="max-w-32 truncate text-sm font-bold text-slate-900 sm:max-w-none">{displayName ?? refLabel}</h1>
          {live ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-200/60 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 sm:px-2.5">
              <span className="size-1.5 animate-pulse rounded-full bg-(--surface-nav-accent)" />
              <span className="sm:hidden">Live</span>
              <span className="hidden sm:inline">Live Consultation</span>
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 sm:px-2.5">
              <span className="sm:hidden">Waiting</span>
              <span className="hidden sm:inline">Before the consultation</span>
            </span>
          )}
        </div>
        <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">{refLabel}</span>
      </div>
    </div>
  );
}

/** Encounter status, timer, and the end-of-call control once a session exists. */
function InProgressHeader({
  bookingId,
  booking,
  session,
  isAssignedDoctor,
  onComplete,
  completing,
}: {
  bookingId: string;
  booking: { doctorId?: string };
  session: ConsultationSessionSummary;
  isAssignedDoctor: boolean;
  onComplete: () => void;
  completing: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-nowrap items-center justify-between gap-2 sm:flex-wrap sm:gap-3">
      <RoomHeaderIdentity
        bookingId={bookingId}
        booking={booking}
        isAssignedDoctor={isAssignedDoctor}
        live
      />

      <div className="flex items-center gap-3">
        {session.startedAt ? (
          <span className="hidden items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold text-slate-700 sm:flex">
            <Clock className="size-3.5 text-slate-500" />
            <CallDurationTimer startedAt={session.startedAt} />
          </span>
        ) : null}

        {isAssignedDoctor ? (
          <Button
            size="sm"
            onClick={onComplete}
            disabled={completing}
            className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700 active:bg-rose-800"
          >
            {completing ? (
              <>
                <Spinner className="mr-2 size-3" />
                Completing…
              </>
            ) : (
              "End Consultation & Release"
            )}
          </Button>
        ) : (
          <Link href={`/patient/booking/getBooking/${encodeURIComponent(bookingId)}`}>
            <Button size="sm" variant="outline" className="rounded-xl border-slate-200 font-bold text-slate-700">
              <span className="sm:hidden">Leave</span>
              <span className="hidden sm:inline">Leave Call</span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

/** Ticking `mm:ss` elapsed since `startedAt`, for the top bar's call timer. */
function CallDurationTimer({ startedAt }: { startedAt: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMs = Date.parse(startedAt);
  const elapsedSec = Number.isFinite(startMs) ? Math.max(0, Math.floor((nowMs - startMs) / 1000)) : 0;
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return <span>{mm}:{ss}</span>;
}

/**
 * Room header before the consultation has been started.
 *
 * The room used to refuse this phase outright: `GET /state` answered `409` until the
 * booking was `in_progress`, so both participants saw "Consultation hasn't started
 * yet" with no way to speak. They had just been matched to each other and had no
 * channel at all (ADR-20260809-05).
 *
 * The chat below this header is live. What is *not* available yet is realtime
 * delivery, presence, and typing indicators, because those are keyed on a
 * consultation session that does not exist until the doctor starts — so messages
 * arrive on a short poll instead. That is stated rather than hidden, because a
 * participant who does not know they are on a delay reads a slow reply as being
 * ignored.
 *
 * The assigned doctor gets the Start control here as well as on their dashboard, so
 * a doctor who opened the room to answer a question does not have to navigate back
 * out to begin the consultation.
 */
function PreConsultHeader({
  bookingId,
  booking,
  isAssignedDoctor,
}: {
  bookingId: string;
  booking: { doctorId?: string };
  isAssignedDoctor: boolean;
}) {
  const startConsultation = useStartConsultation();

  return (
    <div data-slot="consultation-room-pre-consult" className="flex flex-col gap-1.5">
      <div className="flex min-w-0 flex-nowrap items-center justify-between gap-2 sm:flex-wrap sm:gap-3">
        <RoomHeaderIdentity
          bookingId={bookingId}
          booking={booking}
          isAssignedDoctor={isAssignedDoctor}
          live={false}
        />

        {isAssignedDoctor ? (
          <Button
            size="sm"
            onClick={() => void startConsultation.start(bookingId)}
            disabled={startConsultation.status === "starting"}
            className="rounded-xl bg-(--surface-nav) font-bold text-white hover:bg-(--surface-nav)/90"
          >
            {startConsultation.status === "starting" ? (
              <>
                <Spinner className="mr-2 size-3" />
                Starting…
              </>
            ) : (
              "Start Consultation"
            )}
          </Button>
        ) : null}
      </div>

      <div className="hidden items-center gap-1.5 pl-13 text-xs text-slate-500 sm:flex">
        <MessagesSquare className="size-3.5 shrink-0 text-slate-400" />
        {isAssignedDoctor
          ? "Chat is open — you can message your patient now. New messages appear within a few seconds."
          : "Chat is open — you can message your doctor now. New messages appear within a few seconds."}
      </div>
      {startConsultation.error ? (
        <span className="pl-13 text-xs text-destructive">{startConsultation.error}</span>
      ) : null}
    </div>
  );
}

/**
 * Sends the patient back to their booking page once the consultation is over.
 *
 * An actual navigation, not just a link, and fired once via an effect rather
 * than left for the patient to notice and click — this route has nothing left
 * to offer once the consultation has ended, and the whole point of this fix is
 * that the patient should not have to realize that on their own. The link is
 * still rendered underneath in case the redirect is blocked or the patient has
 * already navigated away from `router.push` (e.g. a back-forward cache
 * restore), so there is always a working control on screen.
 */
function RedirectToBookingPanel({ bookingId }: { bookingId: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/patient/booking/getBooking/${encodeURIComponent(bookingId)}`);
  }, [bookingId, router]);

  return (
    <section
      data-slot="consultation-room-completed"
      className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200/70 bg-(--surface-card) p-8 text-center shadow-xs"
    >
      <CheckCircle2 className="size-6 text-(--surface-nav-accent)" />
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          This consultation has ended
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Taking you back to your booking, where anything your doctor shares will
          appear.
        </p>
      </div>
      <Link href={`/patient/booking/getBooking/${encodeURIComponent(bookingId)}`}>
        <Button size="sm" variant="outline" className="rounded-xl">
          Go to my booking
        </Button>
      </Link>
    </section>
  );
}

function NotStartedPanel({ isFetching }: { isFetching: boolean }) {
  return (
    <section
      data-slot="consultation-room-not-started"
      className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-(--surface-card) p-8 text-center shadow-xs"
    >
      <Hourglass className="size-6 text-slate-400" />
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Consultation hasn&apos;t started yet
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This page will open the conversation automatically once your doctor
          starts the consultation.
        </p>
      </div>
      {isFetching ? (
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Spinner className="size-3" />
          Checking…
        </span>
      ) : null}
    </section>
  );
}
