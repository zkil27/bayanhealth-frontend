import type { BookingListItem } from "@/features/booking/lib/api/bookingList";

/**
 * The one thing patient Home is about right now.
 *
 * Home used to render the same four blocks to everyone — a booking hero, a
 * services grid, a promo slot and a consultation list — leaving the patient to
 * work out from status badges whether they were meant to pay, wait, join a call,
 * or read a prescription. This derives that answer once, deterministically, so
 * the page can commit to a single primary message and suppress the rest.
 *
 * Deliberately four states and no more. The states are ordered by urgency, and
 * the first match wins: a live consultation outranks an upcoming one, which
 * outranks a recently finished one.
 */
export type PatientHomeState =
  | "LIVE_ROOM"
  | "SCHEDULED"
  | "POST_CONSULT"
  | "IDLE";

/**
 * What is still outstanding on an upcoming booking.
 *
 * The spec for this screen described an "intake readiness checklist". Payment is
 * on it because the real status enum has no `SCHEDULED`: a booking sits in
 * `pending_payment` until the hold succeeds, and a patient looking at an
 * appointment that will silently never happen is the single most actionable
 * thing Home can say. `payment_submitted` is the legacy proof-upload path — the
 * money is with us but not yet confirmed — so it reads as "being checked", not
 * as "please pay".
 */
export interface ScheduledReadiness {
  /** The hold has not been placed; the booking is not yet confirmed. */
  needsPayment: boolean;
  /** Proof was uploaded and is awaiting review (legacy path only). */
  paymentUnderReview: boolean;
  /** A doctor has accepted, so there is a counterparty to prepare for. */
  doctorAssigned: boolean;
}

export interface PatientHomeDerivation {
  state: PatientHomeState;
  /**
   * The booking the hero is about. Absent only for `IDLE`.
   *
   * Named `activeBooking` rather than `activeConsultation` because that is what
   * it is: `GET /v1/bookings` returns bookings, and a consultation exists only
   * once a session has started (hence `consultationId` being optional on it).
   */
  activeBooking?: BookingListItem;
  /** Present for `SCHEDULED` only. */
  readiness?: ScheduledReadiness;
}

/** Statuses that mean an appointment is ahead of the patient, not behind. */
const UPCOMING_STATUSES: ReadonlySet<string> = new Set([
  "pending_payment",
  "payment_submitted",
  "confirmed",
]);

/** How recently a finished consultation still leads the page. */
export const POST_CONSULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Epoch ms, or `null` when the value is absent or unparseable. */
function toMs(value?: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Derive what Home should lead with.
 *
 * `cancelled` bookings are never a candidate for any state. A cancelled booking
 * is not something the patient can act on, and letting one reach the hero — or
 * the dashboard list — is what filled the page with "Cancelled" rows.
 *
 * @param bookings - The patient's bookings, in any order.
 * @param now      - Injectable clock, so the seven-day window is testable.
 */
export function derivePatientHomeState(
  bookings: BookingListItem[],
  now: number = Date.now(),
): PatientHomeDerivation {
  const live = bookings.find((booking) => booking.status === "in_progress");
  if (live) return { state: "LIVE_ROOM", activeBooking: live };

  // Soonest first, so "your next appointment" means the next one. A booking with
  // no `scheduledAt` (on-demand, which has no appointed time) sorts last rather
  // than being treated as the imminent one.
  const upcoming = bookings
    .filter((booking) => UPCOMING_STATUSES.has(booking.status ?? ""))
    .sort(
      (a, b) =>
        (toMs(a.scheduledAt) ?? Number.POSITIVE_INFINITY) -
        (toMs(b.scheduledAt) ?? Number.POSITIVE_INFINITY),
    )[0];

  if (upcoming) {
    return {
      state: "SCHEDULED",
      activeBooking: upcoming,
      readiness: {
        needsPayment: upcoming.status === "pending_payment",
        paymentUnderReview: upcoming.status === "payment_submitted",
        doctorAssigned: !!upcoming.doctorId,
      },
    };
  }

  // Most recently finished first. `updatedAt` stands in for a completion
  // timestamp, which the booking list does not carry: the transition to
  // `completed` is the last write a finished booking receives.
  const recentlyCompleted = bookings
    .filter((booking) => booking.status === "completed")
    .map((booking) => ({
      booking,
      at: toMs(booking.updatedAt) ?? toMs(booking.scheduledAt),
    }))
    .filter(
      (row): row is { booking: BookingListItem; at: number } =>
        row.at !== null && now - row.at <= POST_CONSULT_WINDOW_MS,
    )
    .sort((a, b) => b.at - a.at)[0];

  if (recentlyCompleted) {
    return { state: "POST_CONSULT", activeBooking: recentlyCompleted.booking };
  }

  return { state: "IDLE" };
}

/** What is outstanding on one upcoming booking. */
export function readinessFor(booking: BookingListItem): ScheduledReadiness {
  return {
    needsPayment: booking.status === "pending_payment",
    paymentUnderReview: booking.status === "payment_submitted",
    doctorAssigned: !!booking.doctorId,
  };
}

/**
 * Consultations already had, most recent first.
 *
 * `cancelled` is excluded here for the same reason it is excluded everywhere
 * else on the dashboard: it is not something the patient can act on or read a
 * record from. A cancelled booking is still visible in the full history on
 * `/patient/health`, which is where it belongs.
 */
export function completedForDashboard(
  bookings: BookingListItem[],
): BookingListItem[] {
  return bookings
    .filter((booking) => booking.status === "completed")
    .sort(
      (a, b) =>
        (toMs(b.updatedAt) ?? toMs(b.scheduledAt) ?? -Infinity) -
        (toMs(a.updatedAt) ?? toMs(a.scheduledAt) ?? -Infinity),
    );
}

/**
 * Bookings the dashboard list may show: upcoming ones, soonest first.
 *
 * Exported alongside the derivation because they share one rule — a `cancelled`
 * booking is not dashboard content — and having the rule in two places is how
 * three cancelled rows ended up as the entire "Your consultations" rail. The
 * full history, cancellations included, belongs on `/patient/health`.
 *
 * The booking already leading the page is excluded, so the hero and the list do
 * not say the same thing twice.
 */
export function upcomingForDashboard(
  bookings: BookingListItem[],
  exclude?: BookingListItem,
): BookingListItem[] {
  return bookings
    .filter(
      (booking) =>
        booking.bookingId !== exclude?.bookingId &&
        (UPCOMING_STATUSES.has(booking.status ?? "") ||
          booking.status === "in_progress"),
    )
    .sort(
      (a, b) =>
        (toMs(a.scheduledAt) ?? Number.POSITIVE_INFINITY) -
        (toMs(b.scheduledAt) ?? Number.POSITIVE_INFINITY),
    );
}
