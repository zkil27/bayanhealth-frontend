/**
 * Pure composition for the doctor dashboard's "Ready to start" card (Task 3 of
 * the doctor-dashboard rebuild).
 *
 * The card has to draw from two different sources because of a boundary in
 * `listDoctorIntakeQueue` itself: that query's `FilterExpression` requires
 * `#status = :confirmed` (`backend/src/lib/intake-queue.ts`), so the moment a
 * consultation actually starts and the booking flips to `in_progress`, it drops
 * out of the intake queue entirely — including out of the `ready`/`need_review`
 * bucket this card would otherwise read. A doctor who started a consultation and
 * then navigated back to the dashboard would find no trace of it here.
 *
 * So "ready to start" is the union of two disjoint sets:
 * - **Not yet started**: intake-queue entries with `intakeQueueStatus` of
 *   `ready` or `need_review`, still `confirmed` — offered a "Start" action.
 * - **Already started**: today's agenda bookings with `status === 'in_progress'`
 *   — offered a "Rejoin" action instead. These can never appear in the first
 *   set (the queue's own filter excludes them), so the union needs no real
 *   conflict resolution — the de-dupe below exists only to guard against a
 *   read racing a status transition mid-poll, not because both sources are
 *   expected to agree on the same booking.
 */

import type { patientBoardInfo } from "../types/bookingBoard.types";
import type { DoctorBookingLike } from "./metrics";

export interface ReadyToStartItem {
  bookingId: string;
  name: string;
  initials: string;
  serviceType?: string;
  /** Drives the row's action label: "Rejoin" once started, "Start" before. */
  isInProgress: boolean;
  reasonExcerpt?: string;
  intakeFormStatus?: "draft" | "submitted" | "acknowledged";
  /**
   * How the booking was created (`Booking.bookingMode`). Gates the
   * doctor-asserted no-show control to `on_demand` bookings only
   * (ADR-20260808-03, ADR-20260909-01). Only ever populated on a not-yet-started
   * row — an already-started (`isInProgress`) row comes from the day's agenda,
   * which does not carry this field, and is not no-show eligible in any case:
   * `settlePartialCapture` requires `status === 'confirmed'`, which an
   * `in_progress` booking no longer is.
   */
  bookingMode?: string;
  /**
   * When a doctor accepted this booking (`Booking.acceptedAt`). Anchors the
   * ten-minute mandatory wait before a no-show may be asserted. Same
   * not-yet-started-only scope as {@link bookingMode}.
   */
  acceptedAt?: string;
}

/** Booking reference derived the same way the rest of the doctor board does. */
function shortRef(bookingId: string): string {
  return bookingId.slice(-6).toUpperCase();
}

/**
 * Merge the intake-queue's `ready` entries with today's already-started
 * bookings into one ordered list.
 *
 * In-progress entries sort first: a patient who is already in the room is a
 * stronger claim on the doctor's attention than one who has not been started
 * yet. De-duplicates by `bookingId` — see the module doc for why this is a
 * defensive guard rather than an expected case, and why an in-progress entry
 * wins the dedupe when it somehow does happen: it is the more current state of
 * the two.
 */
export function composeReadyToStartItems(
  readyQueueEntries: ReadonlyArray<patientBoardInfo>,
  todayBookings: ReadonlyArray<DoctorBookingLike>,
): ReadyToStartItem[] {
  const inProgress = todayBookings.filter((b) => b.status === "in_progress");
  const inProgressIds = new Set(inProgress.map((b) => b.bookingId));

  const inProgressItems: ReadyToStartItem[] = inProgress.map((b) => ({
    bookingId: b.bookingId,
    name: `Ref ${shortRef(b.bookingId)}`,
    initials: shortRef(b.bookingId).slice(0, 2),
    serviceType: b.serviceType,
    isInProgress: true,
  }));

  const readyItems: ReadyToStartItem[] = readyQueueEntries
    .filter((entry) => !inProgressIds.has(entry.bookingId))
    .map((entry) => ({
      bookingId: entry.bookingId,
      name: entry.name,
      initials: entry.initials,
      serviceType: entry.serviceRequested,
      isInProgress: false,
      reasonExcerpt: entry.reasonExcerpt,
      intakeFormStatus: entry.intakeFormStatus,
      bookingMode: entry.bookingMode,
      acceptedAt: entry.acceptedAt,
    }));

  return [...inProgressItems, ...readyItems];
}
