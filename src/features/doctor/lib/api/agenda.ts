/**
 * The doctor's own bookings, as the calendar needs to read them.
 *
 * `GET /v1/bookings` answers with the caller's assigned bookings — for a doctor,
 * a query on `gsi2pk = DOCTOR#<id>`. The `from`/`to` window added alongside this
 * module turns it into a range read on `gsi2sk` (`BOOKING#<scheduledAt>#<id>`),
 * so drawing one week costs one bounded query rather than paging the doctor's
 * entire booking history.
 *
 * **What this does and does not see**, because the calendar has to be honest
 * about it:
 *
 * - An **on-demand** consultation the doctor accepted from the request pool is
 *   here. It holds no slot at all (`lib/on-demand-pool.ts` writes `doctorId` and
 *   the GSI2 keys and never touches the schedule), so this read is the *only*
 *   way it can appear on a calendar.
 * - A consultation a patient booked into one of the doctor's **published slots**
 *   is *not* here. Reserving a slot never assigns the doctor — assignment is
 *   admin-only under ADR-20260726-01 — so the booking carries no `doctorId` and
 *   no GSI2 keys. The doctor learns of it through the slot's own `bookingId` and
 *   nothing more.
 *
 * That split is why the calendar merges two reads instead of one; see
 * `calendarEntries.ts`.
 */

import { api } from "@/lib/api";

/** contract: Booking.status */
export type BookingStatus =
  | "pending_payment"
  | "payment_submitted"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

/** contract: Booking.bookingMode */
export type BookingMode = "scheduled" | "on_demand";

/** contract: Booking.intakeQueueStatus */
export type IntakeQueueStatus = "pending" | "ready" | "in_progress" | "need_review";

/** The subset of `Booking` the calendar renders. */
export interface DoctorBooking {
  bookingId: string;
  patientId: string;
  doctorId?: string;
  consultationId?: string;
  status: BookingStatus;
  bookingMode: BookingMode;
  serviceType: string;
  /** ISO-8601 instant. */
  scheduledAt: string;
  channel: string;
  notes?: string;
  amountCents?: number;
  currency?: string;
  /**
   * Where this booking sits in the doctor's intake queue, when it has one.
   * Not read by the calendar itself — added for the notification feed, which
   * uses a transition into `ready` as its "patient submitted intake" signal.
   */
  intakeQueueStatus?: IntakeQueueStatus;
  /**
   * Last-update timestamp (contract: `Booking.updatedAt`). Not read by the
   * calendar, which places entries by `scheduledAt` — added for the recent-
   * consultations card, which prefers "when the booking last changed" (e.g.
   * when a consultation actually completed) over its originally scheduled time.
   */
  updatedAt?: string;
}

/** Largest page the contract allows. */
export const AGENDA_PAGE_LIMIT = 100;

/**
 * Upper bound on the cursor walk.
 *
 * A doctor seeing four patients an hour, twelve hours a day, produces under 350
 * bookings a week; ten pages of 100 covers any real range the calendar asks for,
 * and bounding the loop means a server that kept advertising a cursor could
 * never spin the browser.
 */
export const MAX_AGENDA_PAGES = 10;

/**
 * Read every booking assigned to the caller between two instants, inclusive.
 *
 * Ordered by scheduled time ascending, as the index returns them. De-duplicates
 * by `bookingId`, because consecutive cursor pages can overlap.
 */
export async function listAgendaInRange(
  idToken: string,
  fromIso: string,
  toIso: string,
): Promise<DoctorBooking[]> {
  const seen = new Set<string>();
  const all: DoctorBooking[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_AGENDA_PAGES; page += 1) {
    const params = new URLSearchParams({
      from: fromIso,
      to: toIso,
      limit: String(AGENDA_PAGE_LIMIT),
    });
    if (cursor) params.set("cursor", cursor);

    const res = await api.get<DoctorBooking[]>(
      `/v1/bookings?${params.toString()}`,
      idToken,
    );
    for (const booking of res.data ?? []) {
      if (seen.has(booking.bookingId)) continue;
      seen.add(booking.bookingId);
      all.push(booking);
    }
    cursor = res.meta?.pagination?.cursor;
    if (!cursor) break;
  }

  return all;
}
