/**
 * One timeline out of two reads.
 *
 * The doctor's day is assembled from sources that each know only half of it:
 *
 * - **Slots** (`GET /v1/doctors/{id}/schedules`) carry published availability,
 *   blocked time, and the fact that a slot is `booked` — but for a booked slot
 *   they carry nothing about the consultation beyond its `bookingId`.
 * - **Bookings** (`GET /v1/bookings`) carry the consultation itself — patient,
 *   status, mode, service — but only for bookings *assigned* to the doctor,
 *   which under ADR-20260726-01 means on-demand requests they accepted and
 *   admin assignments. A patient booking a published slot does not assign
 *   anyone, so those never appear here.
 *
 * Neither source alone is the doctor's day. Reading only slots hides every
 * accepted on-demand consultation — a doctor with three of them today saw an
 * empty calendar. Reading only bookings hides published availability *and*
 * every slot-booked appointment.
 *
 * This module merges them into {@link CalendarEntry} values and, critically,
 * **never double-counts**: a booked slot and an assigned booking that share a
 * `bookingId` are one appointment, not two blocks stacked on the same hour.
 *
 * Grouping differs by kind on purpose. Contiguous *open* and *blocked* slots are
 * merged into runs, because that is how availability is managed — a morning is
 * one thing to publish or take down. Appointments are never merged, because an
 * appointment is a distinct commitment with its own patient; folding two of them
 * into a "9–10" block is exactly what made the old grid unreadable as an agenda.
 */

import type { Slot } from "../../lib/api/schedule";
import type { BookingMode, BookingStatus, DoctorBooking } from "../../lib/api/agenda";
import { parseTimeToMinutes } from "./slotPlan";

/**
 * Fixed offset, in minutes east of UTC, that the platform's wall-clock times
 * mean (Asia/Manila, ADR-20260807-01 — no DST since 1978).
 *
 * A booking stores an *instant*; a slot stores wall-clock `date` + `startTime`.
 * Placing both on one grid needs a single stated interpretation, and this is the
 * same constant the backend and the patient booking flow already use.
 */
export const PLATFORM_UTC_OFFSET_MINUTES = 8 * 60;

/** How long an appointment with no slot behind it is drawn for. */
export const DEFAULT_APPOINTMENT_MINUTES = 30;

/**
 * What a block on the calendar *is*. Drives colour, icon and wording together,
 * so no surface can style one thing and label another.
 */
export type EntryCategory =
  /** Published and bookable. */
  | "open"
  /** Time the doctor removed from offer. */
  | "blocked"
  /** A confirmed consultation at a scheduled time. */
  | "scheduled"
  /** A confirmed consultation the doctor accepted from the on-demand pool. */
  | "onDemand"
  /** A booking that exists but is not yet paid for or confirmed. */
  | "reservation"
  /** A consultation that has already happened. */
  | "completed";

export interface CalendarEntry {
  /** Stable across re-reads, so React keys and popover identity survive a refresh. */
  id: string;
  category: EntryCategory;
  /** YYYY-MM-DD, platform-local. */
  date: string;
  startMinutes: number;
  endMinutes: number;
  /** The slots this entry occupies, empty for an appointment with no slot. */
  slots: Slot[];
  /** The booking behind an appointment, when the doctor is allowed to see it. */
  booking?: DoctorBooking;
  /**
   * Set on an appointment the doctor can see *exists* but cannot read.
   *
   * A slot-booked consultation is the common case: the slot says `booked` and
   * carries a `bookingId`, and `GET /v1/bookings/{id}` answers 404 because the
   * doctor was never assigned. The calendar shows the time as taken and says so
   * plainly rather than inventing a patient.
   */
  bookingId?: string;
  /** Notes shared by every slot in the run, when they all carry the same one. */
  notes: string | null;
}

/** Bookings that never belong on a calendar. */
function isRenderable(booking: DoctorBooking): boolean {
  return booking.status !== "cancelled";
}

/** The category a booking's status and mode imply. */
export function categoriseBooking(
  status: BookingStatus,
  mode: BookingMode,
): EntryCategory {
  if (status === "completed") return "completed";
  if (status === "pending_payment" || status === "payment_submitted") {
    return "reservation";
  }
  return mode === "on_demand" ? "onDemand" : "scheduled";
}

/** Platform-local `YYYY-MM-DD` and minutes-since-midnight for an ISO instant. */
export function placeInstant(
  instantIso: string,
): { date: string; startMinutes: number } | null {
  const ms = Date.parse(instantIso);
  if (Number.isNaN(ms)) return null;
  const local = new Date(ms + PLATFORM_UTC_OFFSET_MINUTES * 60_000);
  return {
    date: local.toISOString().slice(0, 10),
    startMinutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

interface Bounded {
  slot: Slot;
  start: number;
  end: number;
}

function bounded(slot: Slot): Bounded | null {
  const start = parseTimeToMinutes(slot.startTime);
  if (start === null) return null;
  return { slot, start, end: start + slot.durationMinutes };
}

/** Notes shared by an entire run, or null when they disagree. */
function sharedNotes(slots: readonly Slot[]): string | null {
  const first = slots[0]?.notes?.trim() || null;
  if (!first) return null;
  return slots.every((s) => (s.notes?.trim() || null) === first) ? first : null;
}

/** Merge same-category adjacent slots into runs; used for open and blocked only. */
function runsOf(entries: Bounded[], category: EntryCategory, date: string): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  let current: { start: number; end: number; slots: Slot[] } | null = null;

  for (const { slot, start, end } of entries) {
    if (current && start === current.end) {
      current.end = end;
      current.slots.push(slot);
      continue;
    }
    if (current) out.push(finishRun(current, category, date));
    current = { start, end, slots: [slot] };
  }
  if (current) out.push(finishRun(current, category, date));
  return out;
}

function finishRun(
  run: { start: number; end: number; slots: Slot[] },
  category: EntryCategory,
  date: string,
): CalendarEntry {
  return {
    id: `${category}:${date}:${run.slots[0].slotId}`,
    category,
    date,
    startMinutes: run.start,
    endMinutes: run.end,
    slots: run.slots,
    notes: sharedNotes(run.slots),
  };
}

/**
 * Build one day's entries from that day's slots and the bookings assigned to the
 * doctor.
 *
 * `bookings` may contain entries for other days; only those landing on `date`
 * are used, so callers can pass the whole visible range without pre-bucketing.
 */
export function buildDayEntries(
  date: string,
  daySlots: readonly Slot[],
  bookings: readonly DoctorBooking[],
): CalendarEntry[] {
  const withBounds = daySlots
    .map(bounded)
    .filter((x): x is Bounded => x !== null)
    .sort((a, b) => a.start - b.start);

  const entries: CalendarEntry[] = [];
  const claimedBookingIds = new Set<string>();

  // Booked slots become individual appointments, never runs.
  for (const { slot, start, end } of withBounds) {
    if (slot.status !== "booked") continue;
    if (slot.bookingId) claimedBookingIds.add(slot.bookingId);

    const booking = slot.bookingId
      ? bookings.find((b) => b.bookingId === slot.bookingId)
      : undefined;

    // A cancelled booking that still holds a slot is a data inconsistency the
    // doctor should see as taken time rather than have silently hidden.
    const category = booking
      ? categoriseBooking(booking.status, booking.bookingMode)
      : "scheduled";

    entries.push({
      id: `appointment:${date}:${slot.slotId}`,
      category,
      date,
      startMinutes: start,
      endMinutes: end,
      slots: [slot],
      ...(booking ? { booking } : {}),
      ...(slot.bookingId ? { bookingId: slot.bookingId } : {}),
      notes: slot.notes?.trim() || null,
    });
  }

  entries.push(
    ...runsOf(withBounds.filter((x) => x.slot.status === "available"), "open", date),
    ...runsOf(withBounds.filter((x) => x.slot.status === "blocked"), "blocked", date),
  );

  // Assigned bookings with no slot of their own — on-demand, and admin
  // assignments. Anything already represented by a booked slot is skipped, so
  // one consultation is one block.
  for (const booking of bookings) {
    if (!isRenderable(booking)) continue;
    if (claimedBookingIds.has(booking.bookingId)) continue;
    const placed = placeInstant(booking.scheduledAt);
    if (!placed || placed.date !== date) continue;

    entries.push({
      id: `appointment:${booking.bookingId}`,
      category: categoriseBooking(booking.status, booking.bookingMode),
      date,
      startMinutes: placed.startMinutes,
      endMinutes: placed.startMinutes + DEFAULT_APPOINTMENT_MINUTES,
      slots: [],
      booking,
      bookingId: booking.bookingId,
      notes: null,
    });
  }

  return entries.sort(
    (a, b) => a.startMinutes - b.startMinutes || a.id.localeCompare(b.id),
  );
}

/** Every visible day's entries, keyed by `YYYY-MM-DD`. */
export function buildEntriesByDate(
  dates: readonly string[],
  slotsByDate: ReadonlyMap<string, Slot[]>,
  bookings: readonly DoctorBooking[],
): Map<string, CalendarEntry[]> {
  const out = new Map<string, CalendarEntry[]>();
  for (const date of dates) {
    out.set(date, buildDayEntries(date, slotsByDate.get(date) ?? [], bookings));
  }
  return out;
}

/** True when this entry is a consultation rather than availability. */
export function isAppointment(entry: CalendarEntry): boolean {
  return (
    entry.category === "scheduled" ||
    entry.category === "onDemand" ||
    entry.category === "reservation" ||
    entry.category === "completed"
  );
}
