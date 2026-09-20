/**
 * The doctor's notification feed, derived rather than fetched.
 *
 * There is no `GET /v1/doctors/me/notifications` — the only server-side
 * notification surface is `GET /v1/admin/notification-events`, an admin audit
 * of the delivery outbox, not a doctor-facing feed. Inventing content for the
 * bell would mean showing a doctor something nobody said, on a screen where
 * that has real clinical stakes, so this module instead computes real events
 * from data the doctor already reads on every visit to their own calendar:
 * `GET /v1/bookings` (`listAgendaInRange`), the same read `DoctorScheduleView`
 * uses to draw the grid.
 *
 * An "event" here is a genuine change between two reads of that same booking:
 * one the doctor was not assigned to before, one that just got cancelled, one
 * that just completed, one whose patient just submitted intake. Nothing is
 * synthesised beyond "this differs from what we last saw" — the message text
 * is built entirely from the booking's own fields.
 */

import { format, parseISO } from "date-fns";

import type { BookingStatus, DoctorBooking, IntakeQueueStatus } from "./api/agenda";
import { formatMinutesToTime } from "../components/schedule/slotPlan";
import { formatTimeOfDay } from "../components/schedule/calendarView";
import { placeInstant } from "../components/schedule/calendarEntries";

export type ActivityEventKind = "assigned" | "cancelled" | "completed" | "intake_ready";

export interface ActivityEvent {
  /** Stable across polls: `${bookingId}:${kind}`, so the same real change never duplicates. */
  id: string;
  kind: ActivityEventKind;
  bookingId: string;
  /** Platform-local `YYYY-MM-DD` the booking falls on — what the deep link opens to. */
  date: string;
  message: string;
  /**
   * When this poll first observed the change, client time. Not a server
   * event timestamp — none exists here — and worded honestly as "detected",
   * not "happened at".
   */
  detectedAtMs: number;
}

/** What this module remembers about a booking between polls, to detect a real change. */
export interface TrackedBooking {
  status: BookingStatus;
  intakeQueueStatus?: IntakeQueueStatus;
}

export type BookingSnapshot = Readonly<Record<string, TrackedBooking>>;

export interface ActivityDiff {
  events: ActivityEvent[];
  snapshot: BookingSnapshot;
}

const SERVICE_LABEL: Record<string, string> = {
  general: "General",
  specialist: "Specialist",
  follow_up: "Follow-up",
  emergency: "Emergency",
};

function humanizeService(serviceType: string): string {
  return SERVICE_LABEL[serviceType] ?? serviceType.replaceAll("_", " ");
}

/** "Aug 20, 10:00 AM", read on the platform's own clock, not the viewer's. */
function formatWhen(scheduledAt: string): string {
  const placed = placeInstant(scheduledAt);
  if (!placed) return scheduledAt;
  const parsed = parseISO(placed.date);
  const day = Number.isNaN(parsed.getTime()) ? placed.date : format(parsed, "MMM d");
  return `${day}, ${formatTimeOfDay(formatMinutesToTime(placed.startMinutes))}`;
}

function messageFor(booking: DoctorBooking, kind: ActivityEventKind): string {
  const service = humanizeService(booking.serviceType);
  const when = formatWhen(booking.scheduledAt);
  switch (kind) {
    case "assigned":
      return booking.bookingMode === "on_demand"
        ? `New on-demand ${service.toLowerCase()} consultation, ${when}`
        : `New ${service.toLowerCase()} booking confirmed, ${when}`;
    case "cancelled":
      return `${service} consultation cancelled — was ${when}`;
    case "completed":
      return `${service} consultation completed, ${when}`;
    case "intake_ready":
      return `Patient submitted intake for the ${when} ${service.toLowerCase()} consultation`;
  }
}

function eventFor(
  booking: DoctorBooking,
  kind: ActivityEventKind,
  nowMs: number,
): ActivityEvent {
  const placed = placeInstant(booking.scheduledAt);
  return {
    id: `${booking.bookingId}:${kind}`,
    kind,
    bookingId: booking.bookingId,
    date: placed?.date ?? booking.scheduledAt.slice(0, 10),
    message: messageFor(booking, kind),
    detectedAtMs: nowMs,
  };
}

/**
 * Compare a fresh read of the doctor's bookings against what was last seen,
 * and produce the events that make it a diff rather than a re-announcement.
 *
 * `previous === null` means "no snapshot exists yet" — the very first read
 * this browser has ever taken for this doctor — and is treated as a silent
 * seed rather than a flood of "new" events for every booking already on the
 * books. A doctor opening the app for the first time has not missed anything;
 * there is nothing to have missed relative to a history that does not exist.
 */
export function diffBookingActivity(
  bookings: readonly DoctorBooking[],
  previous: BookingSnapshot | null,
  nowMs: number,
): ActivityDiff {
  const snapshot: Record<string, TrackedBooking> = {};
  const events: ActivityEvent[] = [];
  const coldStart = previous === null;

  for (const booking of bookings) {
    const prior = previous?.[booking.bookingId];
    snapshot[booking.bookingId] = {
      status: booking.status,
      ...(booking.intakeQueueStatus ? { intakeQueueStatus: booking.intakeQueueStatus } : {}),
    };

    if (coldStart) continue;

    if (!prior) {
      events.push(eventFor(booking, "assigned", nowMs));
      continue;
    }

    if (prior.status !== booking.status) {
      // Only the two transitions a doctor would call "news" rather than
      // "the thing I expected to happen" — a doctor starting their own
      // consultation already knows it started.
      if (booking.status === "cancelled") events.push(eventFor(booking, "cancelled", nowMs));
      else if (booking.status === "completed") events.push(eventFor(booking, "completed", nowMs));
    }

    if (prior.intakeQueueStatus !== "ready" && booking.intakeQueueStatus === "ready") {
      events.push(eventFor(booking, "intake_ready", nowMs));
    }
  }

  return { events, snapshot };
}
