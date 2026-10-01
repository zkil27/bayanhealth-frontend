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
  | "ON_DEMAND_WAITING"
  | "UNFINISHED_INTAKE"
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
  /** Present for `SCHEDULED`, `ON_DEMAND_WAITING`, and `UNFINISHED_INTAKE`. */
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
/** Window for an on-demand consult without a scheduled time to remain active (18 hours). */
export const ON_DEMAND_ACTIVE_WINDOW_MS = 18 * 60 * 60 * 1000;

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
 * Order of Priority:
 * 1. LIVE_ROOM: Any booking with status "in_progress" (consultation room is open right now).
 * 2. ON_DEMAND_WAITING: An on-demand consultation (no future scheduledAt) that is "confirmed"
 *    or "payment_submitted", waiting for doctor matching or pre-consult room entry.
 * 3. UNFINISHED_INTAKE: A recent on-demand booking in "pending_payment" needing intake or hold.
 * 4. SCHEDULED: A future appointment with an appointed calendar time.
 * 5. POST_CONSULT: A recently completed consultation with care summary/prescriptions.
 * 6. IDLE: No active bookings -> prompts user to consult now.
 *
 * @param bookings - The patient's bookings, in any order.
 * @param now      - Injectable clock, so windows are testable.
 */
export function derivePatientHomeState(
  bookings: BookingListItem[],
  now: number = Date.now(),
): PatientHomeDerivation {
  // 1. Live consultation in progress right now
  const live = bookings.find((booking) => booking.status === "in_progress");
  if (live) return { state: "LIVE_ROOM", activeBooking: live };

  // 2. Active on-demand booking (no appointed future scheduledAt, created/updated recently)
  const activeOnDemand = bookings
    .filter((booking) => {
      if (!UPCOMING_STATUSES.has(booking.status ?? "")) return false;
      const scheduledMs = toMs(booking.scheduledAt);
      // If there is an appointed time more than 30 mins in the future, it's a scheduled appointment
      if (scheduledMs && scheduledMs - now > 30 * 60 * 1000) return false;
      // Check freshness of on-demand booking
      const createdMs = toMs(booking.createdAt) ?? toMs(booking.updatedAt);
      if (createdMs && now - createdMs > ON_DEMAND_ACTIVE_WINDOW_MS) return false;
      return true;
    })
    .sort((a, b) => {
      const bTime = toMs(b.updatedAt) ?? toMs(b.createdAt) ?? 0;
      const aTime = toMs(a.updatedAt) ?? toMs(a.createdAt) ?? 0;
      return bTime - aTime;
    })[0];

  if (activeOnDemand) {
    const readiness: ScheduledReadiness = {
      needsPayment: activeOnDemand.status === "pending_payment",
      paymentUnderReview: activeOnDemand.status === "payment_submitted",
      doctorAssigned: !!activeOnDemand.doctorId,
    };

    if (activeOnDemand.status === "confirmed" || activeOnDemand.status === "payment_submitted") {
      return {
        state: "ON_DEMAND_WAITING",
        activeBooking: activeOnDemand,
        readiness,
      };
    }

    if (activeOnDemand.status === "pending_payment") {
      return {
        state: "UNFINISHED_INTAKE",
        activeBooking: activeOnDemand,
        readiness,
      };
    }
  }

  // 3. Upcoming scheduled appointments (with explicit future scheduledAt)
  const upcoming = bookings
    .filter(
      (booking) =>
        UPCOMING_STATUSES.has(booking.status ?? "") &&
        toMs(booking.scheduledAt) !== null &&
        (toMs(booking.scheduledAt) ?? 0) >= now - 60 * 60 * 1000,
    )
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

  // 4. Most recently finished consultation
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

  // 5. Default idle state
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
