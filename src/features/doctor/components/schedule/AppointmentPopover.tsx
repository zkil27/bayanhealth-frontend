"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Lock,
  MessageSquareQuote,
  ShieldCheck,
  Video,
  X,
  Zap,
} from "lucide-react";

import { useIdToken } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

import {
  CATEGORY_LABEL,
  styleFor,
  type CalendarPalette,
} from "./calendarColors";
import { formatShiftSummary } from "./calendarView";
import { formatMinutesToTime } from "./slotPlan";
import { SchedulePopover, type AnchorRect } from "./SchedulePopover";
import {
  appointmentTiming,
  entryInstantMs,
  formatDurationMinutes,
  formatMoney,
  summariseIntake,
  type IntakeBriefing,
  type TimingTone,
} from "./appointmentBriefing";
import {
  fetchBookingIntake,
  type BookingIntakeForm,
} from "../../lib/api/bookingIntake";
import type { CalendarEntry } from "./calendarEntries";

/** Human wording for the contract's status values. */
const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  payment_submitted: "Payment under review",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Status chips reuse the platform's status tokens rather than inventing hues. */
const STATUS_TOKEN: Record<string, string> = {
  pending_payment: "status-pending",
  payment_submitted: "status-pending",
  confirmed: "status-confirmed",
  in_progress: "status-active",
  completed: "status-completed",
  cancelled: "status-cancelled",
};

/** Emphasis for the "starts in…" line, strongest for what needs the doctor now. */
const TIMING_CLASS: Record<TimingTone, string> = {
  now: "text-(--status-active-foreground)",
  soon: "text-(--status-pending-foreground)",
  upcoming: "text-(--text-muted)",
  past: "text-(--text-subtle)",
};

/**
 * What a consultation on the calendar shows when the doctor opens it.
 *
 * The popover is read *while scanning a week*, so it answers the questions that
 * decide whether to act — when, how long, how urgent, what the patient is here
 * for, and whether anything is red-flagged — rather than making the doctor
 * navigate into the consultation to find out. It previously listed status,
 * service, channel and a booking id and stopped there, which is exactly the
 * information a doctor already has from the block itself.
 *
 * The patient's intake is fetched on open, because it is the only source of
 * clinical context the doctor is permitted to read before the consultation, and
 * because it is cheap: one keyed read, only for a booking they are assigned to,
 * only while the popover is on screen.
 *
 * Two very different cases share this surface, and the difference is the point:
 *
 * - **A consultation assigned to the doctor** — an on-demand request they
 *   accepted, or an admin assignment. Everything is available: mode, status,
 *   service, channel, intake, and a way into the consultation.
 * - **A consultation booked into one of their published slots, before payment.**
 *   Reserving a slot does not assign anyone; the doctor is attached when payment
 *   is confirmed, by the canonical matcher. Until then `GET /v1/bookings/{id}`
 *   answers 404 to them and the only facts that exist are *when* and *that it is
 *   taken*. That is deliberate — an unpaid reservation should not hand over a
 *   patient's details — so this popover says exactly that rather than rendering
 *   empty fields or inventing a patient, and names the reason, because "why
 *   can't I see my own patient?" is otherwise unanswerable from inside the
 *   product.
 */
export function AppointmentPopover(props: {
  open: boolean;
  anchor: AnchorRect | null;
  entry: CalendarEntry | null;
  palette: CalendarPalette;
  onClose: () => void;
  onOpenDay: (date: string) => void;
}) {
  if (!props.entry) return null;
  // Split so the intake read below lives in a component that only exists while
  // there is an appointment to read for — no conditional hooks, no request
  // fired for a popover that renders nothing.
  return <AppointmentCard {...props} entry={props.entry} />;
}

function AppointmentCard({
  open,
  anchor,
  entry,
  palette,
  onClose,
  onOpenDay,
}: {
  open: boolean;
  anchor: AnchorRect | null;
  entry: CalendarEntry;
  palette: CalendarPalette;
  onClose: () => void;
  onOpenDay: (date: string) => void;
}) {
  const booking = entry.booking;
  const startTime = formatMinutesToTime(entry.startMinutes);
  const endTime = formatMinutesToTime(entry.endMinutes);
  const isOnDemand = entry.category === "onDemand";

  const duration = formatDurationMinutes(entry.endMinutes - entry.startMinutes);
  const startMs = entryInstantMs(entry.date, entry.startMinutes);
  const endMs = entryInstantMs(entry.date, entry.endMinutes);
  const nowMs = useNow();
  const timing =
    startMs !== null && endMs !== null
      ? appointmentTiming(startMs, endMs, nowMs)
      : null;

  const fee = formatMoney(booking?.amountCents, booking?.currency);
  const intake = useIntake(open ? (booking?.bookingId ?? null) : null);
  // Only once the intake read resolves, and only for a booking the doctor is
  // assigned to — a withheld reservation never reaches this state at all,
  // because `useIntake` is not asked to read one.
  const patientName = intake.kind === "ready" ? intake.briefing?.patientName : null;

  return (
    <SchedulePopover
      open={open}
      anchor={anchor}
      label={
        patientName
          ? `${patientName}, consultation on ${entry.date} at ${startTime}`
          : `Consultation on ${entry.date} at ${startTime}`
      }
      onClose={onClose}
      testId="appointment-popover"
      // Wider and scrollable: this card now carries a clinical briefing, and a
      // long chief complaint must extend the scroll rather than the viewport.
      className="w-[min(23rem,calc(100vw-1.5rem))] max-h-[min(34rem,calc(100vh-2.5rem))] overflow-y-auto"
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-1 size-3 shrink-0 rounded-[4px]"
          style={styleFor(palette[entry.category])}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {/*
            Who, before when. The doctor scanning a week already knows the time
            from the block itself — the identity behind it is the one thing
            this popover exists to add, so it leads.
          */}
          {patientName ? (
            <h2
              data-slot="appointment-patient-name"
              className="truncate text-sm font-bold text-(--text-heading)"
            >
              {patientName}
            </h2>
          ) : null}
          <span
            data-slot="appointment-summary"
            className={cn(
              patientName
                ? "text-xs font-medium text-(--text-muted)"
                : "text-sm font-bold text-(--text-heading)",
            )}
          >
            {formatShiftSummary(entry.date, startTime, endTime)}
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs font-bold text-(--text-muted)">
            {isOnDemand ? (
              <Zap className="size-3.5" aria-hidden="true" />
            ) : (
              <CalendarClock className="size-3.5" aria-hidden="true" />
            )}
            {CATEGORY_LABEL[entry.category]}
            {duration ? <span aria-hidden>·</span> : null}
            {duration}
          </span>
          {timing ? (
            <span
              data-slot="appointment-timing"
              className={cn("text-xs font-medium", TIMING_CLASS[timing.tone])}
            >
              {timing.label}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-(--text-muted) transition-colors hover:bg-(--surface-warm-soft) hover:text-(--text-heading)"
        >
          <X className="size-4" />
        </button>
      </div>

      {booking ? (
        <>
          {/*
            Status, service, channel and fee are attributes, not prose. As chips
            they cost one line instead of four, which is what buys the room for
            the intake below — the part the doctor cannot get anywhere else on
            this screen.
          */}
          <div
            data-slot="appointment-details"
            className="flex flex-wrap items-center gap-1.5 text-xs"
          >
            <span
              data-slot="appointment-status"
              className="rounded-full px-2 py-0.5 font-bold"
              style={{
                backgroundColor: `var(--${STATUS_TOKEN[booking.status] ?? "status-active"})`,
                color: `var(--${STATUS_TOKEN[booking.status] ?? "status-active"}-foreground)`,
              }}
            >
              {STATUS_LABEL[booking.status] ?? booking.status}
            </span>
            <Chip className="capitalize">{booking.serviceType.replaceAll("_", " ")}</Chip>
            <Chip>
              {booking.channel === "video" ? (
                <Video className="size-3.5" aria-hidden="true" />
              ) : null}
              <span className="capitalize">{booking.channel}</span>
            </Chip>
            {fee ? <Chip>{fee}</Chip> : null}
          </div>

          <IntakeSection state={intake} />

          {booking.notes ? (
            <div data-slot="appointment-notes" className="flex flex-col gap-0.5 text-xs">
              <span className="font-bold text-(--text-subtle)">Booking note</span>
              <p className="break-words text-(--text-heading)">{booking.notes}</p>
            </div>
          ) : null}

          <span
            data-slot="appointment-booking-ref"
            className="font-mono text-[0.6875rem] text-(--text-subtle)"
          >
            {booking.bookingId}
          </span>
        </>
      ) : (
        <div
          data-slot="appointment-restricted"
          className="flex items-start gap-2 rounded-lg bg-(--surface-warm-soft) px-2.5 py-2 text-xs text-(--text-muted)"
        >
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            A patient has reserved this time. The details appear once their
            payment is confirmed and the consultation is assigned to you.
            {entry.bookingId ? (
              <>
                {" "}
                Reference{" "}
                <span className="font-mono text-[0.6875rem]">{entry.bookingId}</span>.
              </>
            ) : null}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/*
          Links, not buttons: these navigate, so they have to be openable in a
          new tab and reachable by the browser's own affordances. Neither writes
          anything — a consultation is still started from the room itself, so
          nothing here can begin one by a mis-click on a calendar.
        */}
        {booking?.consultationId ? (
          <a
            data-slot="appointment-open-consultation"
            href={`/doctor/post-consultation/id?consultationId=${encodeURIComponent(
              booking.consultationId,
            )}`}
            className="inline-flex items-center rounded-full bg-(--action-primary) px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-(--action-primary-hover)"
          >
            Open consultation
          </a>
        ) : booking && (booking.status === "confirmed" || booking.status === "in_progress") ? (
          // Before `/start` there is no consultationId at all, which used to
          // leave the popover with no way into the appointment. The room
          // handles both phases: it shows the pre-consult view for a confirmed
          // booking and joins a live session for one in progress.
          <a
            data-slot="appointment-open-room"
            href={`/consultation/room/${encodeURIComponent(booking.bookingId)}`}
            className="inline-flex items-center rounded-full bg-(--action-primary) px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-(--action-primary-hover)"
          >
            {booking.status === "in_progress" ? "Join consultation" : "Open consultation room"}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenDay(entry.date)}
          className="ml-auto text-xs font-medium text-(--text-muted) underline-offset-2 hover:text-(--text-heading) hover:underline"
        >
          Manage this day
        </button>
      </div>
    </SchedulePopover>
  );
}

/** How often the "starts in…" line re-reads the clock while the popover is open. */
const CLOCK_TICK_MS = 30_000;

function subscribeToClock(onTick: () => void): () => void {
  const id = setInterval(onTick, CLOCK_TICK_MS);
  return () => clearInterval(id);
}

/**
 * The clock, quantised to the tick.
 *
 * Quantised because `useSyncExternalStore` compares snapshots: a raw
 * `Date.now()` would differ on every read and re-render forever.
 */
function clockSnapshot(): number {
  return Math.floor(Date.now() / CLOCK_TICK_MS);
}

/**
 * The current time, as a value a component may render.
 *
 * The clock is an external store rather than a `Date.now()` call in the render
 * body — that read is impure, and a popover left open across the start of its
 * own appointment would keep claiming the appointment is still upcoming.
 * Subscribing makes the countdown tick down instead of freezing at whatever it
 * said when the doctor clicked.
 */
function useNow(): number {
  return (
    useSyncExternalStore(subscribeToClock, clockSnapshot, clockSnapshot) * CLOCK_TICK_MS
  );
}

/** Lifecycle of the intake read, as the popover renders it. */
type IntakeState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; briefing: IntakeBriefing | null }
  | { kind: "error" };

/**
 * Read the patient's intake for a booking, while the popover is open.
 *
 * A 404 — no intake submitted, or a booking the doctor is not assigned to —
 * resolves as `ready` with no briefing, because both are states to *state*, not
 * failures. A real failure is kept distinct so the popover can say the intake
 * could not be loaded instead of implying the patient submitted nothing.
 */
function useIntake(bookingId: string | null): IntakeState {
  const idToken = useIdToken();
  // Starts as `loading` rather than being reset to it inside the effect: the
  // card is keyed by entry id upstream, so one mount reads exactly one booking
  // and there is no earlier result to clear.
  const [state, setState] = useState<IntakeState>({ kind: "loading" });

  useEffect(() => {
    if (!bookingId) return;
    if (!idToken && !bookingId.startsWith("demo")) return;

    let live = true;
    fetchBookingIntake(idToken ?? "", bookingId)
      .then((form) => {
        if (!live) return;
        setState({ kind: "ready", briefing: summariseIntake(asForm(form)) });
      })
      .catch(() => {
        if (live) setState({ kind: "error" });
      });

    return () => {
      live = false;
    };
  }, [bookingId, idToken]);

  // No booking to read (a withheld reservation) or no session: the section is
  // absent entirely rather than sitting on a spinner that will never resolve.
  return bookingId && (idToken || bookingId.startsWith("demo")) ? state : { kind: "none" };
}

/** Guard the wire shape: anything that is not an intake object reads as absent. */
function asForm(value: unknown): BookingIntakeForm | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as BookingIntakeForm;
}

function IntakeSection({ state }: { state: IntakeState }) {
  if (state.kind === "none") return null;

  return (
    <div
      data-slot="appointment-intake"
      className="flex flex-col gap-1.5 border-t border-(--border-subtle) pt-2.5 text-xs"
    >
      <span className="flex items-center gap-1.5 font-bold text-(--text-subtle)">
        Patient intake
        {/*
          A draft is not a submission. The doctor is reading it early either
          way, but a form the patient is still filling in can change before the
          consultation, and that is worth one word rather than a surprise.
        */}
        {state.kind === "ready" && state.briefing && !state.briefing.isEmpty && state.briefing.status ? (
          <span
            data-slot="appointment-intake-status"
            className="rounded-full bg-(--surface-warm-soft) px-1.5 py-0.5 text-[0.6875rem] font-medium text-(--text-muted) capitalize"
          >
            {state.briefing.status}
          </span>
        ) : null}
      </span>

      {state.kind === "loading" ? (
        <span className="text-(--text-muted)">Loading intake…</span>
      ) : state.kind === "error" ? (
        <span className="text-(--text-muted)">
          The intake could not be loaded. Open the consultation to read it.
        </span>
      ) : !state.briefing || state.briefing.isEmpty ? (
        <span className="text-(--text-muted)">
          No intake submitted yet — nothing to review before this consultation.
        </span>
      ) : (
        <Briefing briefing={state.briefing} />
      )}
    </div>
  );
}

function Briefing({ briefing }: { briefing: IntakeBriefing }) {
  return (
    <>
      <p className="font-bold break-words text-(--text-heading)">
        {briefing.chiefComplaint ?? (
          <span className="font-medium text-(--text-muted)">No chief complaint given</span>
        )}
      </p>

      {briefing.patientVerbatim ? (
        <p className="flex gap-1.5 text-(--text-muted) italic">
          <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {/* Clamped: the popover previews the patient's words, the workspace
              shows all of them. */}
          <span className="line-clamp-3 break-words">{briefing.patientVerbatim}</span>
        </p>
      ) : null}

      <RedFlags briefing={briefing} />

      {briefing.allergies ? (
        <BriefRow label="Allergies" value={briefing.allergies} emphasise />
      ) : null}
      {briefing.medications ? (
        <BriefRow label="Meds" value={briefing.medications} />
      ) : null}
    </>
  );
}

/**
 * Red-flag screening, in three states rather than two.
 *
 * "Not screened" is shown as its own state and never as "no red flags": an
 * unanswered screen is a gap in the information, and a popover that presented
 * it as a negative result would be telling the doctor something no one asked
 * the patient.
 */
function RedFlags({ briefing }: { briefing: IntakeBriefing }) {
  if (briefing.redFlags.length > 0) {
    return (
      <div
        data-slot="appointment-red-flags"
        className="flex flex-wrap items-center gap-1.5 rounded-lg bg-severity-critical px-2 py-1.5 font-bold text-severity-critical-foreground"
      >
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
        {briefing.redFlags.join(" · ")}
      </div>
    );
  }

  if (!briefing.screened) {
    return (
      <span data-slot="appointment-red-flags" className="text-(--text-muted)">
        Red flags not screened — treat as unscreened, not as negative.
      </span>
    );
  }

  return (
    <span
      data-slot="appointment-red-flags"
      className="flex items-center gap-1.5 text-(--text-muted)"
    >
      <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
      Screened, no red flags
    </span>
  );
}

function BriefRow({
  label,
  value,
  emphasise,
}: {
  label: string;
  value: string;
  emphasise?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-14 shrink-0 text-(--text-subtle)">{label}</span>
      <span
        className={cn(
          "min-w-0 flex-1 break-words text-(--text-heading)",
          emphasise && "font-bold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full bg-(--surface-warm-soft) px-2 py-0.5 text-(--text-muted)",
        className,
      )}
    >
      {children}
    </span>
  );
}
