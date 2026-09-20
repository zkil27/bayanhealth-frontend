/**
 * Doctor dashboard "today strip" metrics — pure composition from existing
 * backend endpoints.
 *
 * This module previously composed a lifetime income sum and a "patients this
 * week" bar chart bucketed by the *current* intake queue. Both were dropped
 * (Task 2 of the doctor-dashboard rebuild):
 *
 * - The weekday chart bucketed `queue` — the doctor's *current* intake queue —
 *   by `booking.scheduledAt`. A booking leaves the queue once it completes, so
 *   every past weekday read 0 almost always and the total equalled the queue
 *   count outright. It was one number drawn as seven bars, not a real trend.
 * - The income figure summed every payout ever recorded, with no pending/paid
 *   breakdown and nothing to link to.
 *
 * The replacement is a compact "today" strip: how many consultations are today
 * (from a day-bounded agenda read, not the intake queue), when the next one
 * starts, and how much payout is still pending. All three numbers are composed
 * from data the platform already exposes — no new backend route
 * (Requirement 15 — the backend is contract-frozen for this task).
 */

/** Minimal shape consumed from a `Payout` record (see `Payout` in openapi.yaml). */
export interface DoctorPayoutLike {
  /** Payout amount in minor currency units (e.g. centavos). */
  amountCents: number;
  /** `pending` payouts have not been paid out yet; `paid` ones have. */
  status: "pending" | "paid";
}

/** Minimal shape consumed from a `Booking` record (see `Booking` in openapi.yaml). */
export interface DoctorBookingLike {
  bookingId: string;
  /** ISO 8601 timestamp — the appointment's start instant. */
  scheduledAt: string;
  status: string;
  serviceType?: string;
}

/** The numeric metrics rendered on the doctor dashboard's today strip. */
export interface DoctorTodayMetrics {
  /** Bookings scheduled for today (platform-local day), any status. */
  todayCount: number;
  /**
   * The soonest upcoming booking today, or `null` when there is none — either
   * because today has no bookings, or every one of today's bookings has
   * already started, completed, or been cancelled.
   */
  nextAppointment: { bookingId: string; scheduledAt: string; serviceType?: string } | null;
  /** Sum of `amountCents` across payouts still `pending`, in whole currency units. */
  pendingPayout: number;
}

/**
 * Fixed offset, in minutes east of UTC, that the platform's wall-clock "today"
 * means (Asia/Manila, ADR-20260807-01 — no DST since 1978). Mirrors
 * `PLATFORM_UTC_OFFSET_MINUTES` in `components/schedule/calendarEntries.ts`;
 * kept as a separate constant here because this module has no dependency on
 * the schedule feature and pulling one in for a single number would be a
 * heavier coupling than the value is worth.
 */
const PLATFORM_UTC_OFFSET_MINUTES = 8 * 60;

/** Platform-local `YYYY-MM-DD` for an ISO instant, or `null` when unparsable. */
function platformLocalDate(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const local = new Date(ms + PLATFORM_UTC_OFFSET_MINUTES * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * The UTC instant range covering the platform-local calendar day containing
 * `now`, as ISO strings suitable for `GET /v1/bookings`'s `from`/`to` params.
 *
 * Exported so the dashboard can request a genuinely day-bounded read — one
 * query, not a walk of the doctor's whole history — while
 * {@link composeDoctorTodayMetrics} still re-derives the exact boundary itself
 * rather than trusting the caller's window verbatim.
 */
export function platformTodayRangeUtc(now: Date = new Date()): { from: string; to: string } {
  const local = new Date(now.getTime() + PLATFORM_UTC_OFFSET_MINUTES * 60_000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  // Platform-local midnight, expressed back in UTC.
  const startUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) - PLATFORM_UTC_OFFSET_MINUTES * 60_000;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000 - 1;
  return { from: new Date(startUtcMs).toISOString(), to: new Date(endUtcMs).toISOString() };
}

/** Statuses that still represent a live appointment, not a settled or dead one. */
const LIVE_BOOKING_STATUSES: ReadonlySet<string> = new Set([
  "confirmed",
  "in_progress",
]);

/**
 * Compose the doctor dashboard's today-strip metrics from today's bookings and
 * the payout list.
 *
 * - `todayCount` counts every booking whose `scheduledAt` falls on the
 *   platform-local calendar day containing `now`, regardless of status — a
 *   doctor asking "what does today look like" wants the whole day, including a
 *   booking a patient has not yet paid for.
 * - `nextAppointment` is the earliest-starting *live* (`confirmed` or
 *   `in_progress`) booking today at or after `now`. A completed or cancelled
 *   booking is never "next", and neither is one still `pending_payment` — there
 *   is nothing yet for the doctor to be ready for.
 * - `pendingPayout` sums `amountCents` only across `status === 'pending'`
 *   payouts. `paid` payouts are deliberately excluded: showing a lifetime sum
 *   again would recreate the exact "one number, no meaning" problem this strip
 *   replaces.
 *
 * The function is total: it accepts any arrays (including empty ones) and
 * always returns finite, non-negative numbers for the two numeric fields.
 *
 * @param todayBookings - Bookings already scoped to (approximately) today by
 *   the caller's `from`/`to` read; this function re-derives the exact
 *   platform-local day boundary rather than trusting the caller's window, so a
 *   read that over-fetches by a few hours at either edge still yields a
 *   correct count.
 * @param payouts       - The doctor's payout records.
 * @param now            - Injectable for deterministic tests.
 */
export function composeDoctorTodayMetrics(
  todayBookings: ReadonlyArray<DoctorBookingLike>,
  payouts: ReadonlyArray<DoctorPayoutLike>,
  now: Date = new Date(),
): DoctorTodayMetrics {
  const today = platformLocalDate(now.toISOString());
  const nowMs = now.getTime();

  const scopedToToday = todayBookings.filter((booking) => {
    const date = platformLocalDate(booking.scheduledAt);
    return date !== null && date === today;
  });

  const upcomingLive = scopedToToday
    .filter((booking) => LIVE_BOOKING_STATUSES.has(booking.status))
    .filter((booking) => {
      const ms = Date.parse(booking.scheduledAt);
      return !Number.isNaN(ms) && ms >= nowMs;
    })
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));

  const next = upcomingLive[0] ?? null;

  const pendingCents = payouts.reduce((sum, payout) => {
    if (payout?.status !== "pending") return sum;
    const cents = payout?.amountCents;
    return sum + (typeof cents === "number" && Number.isFinite(cents) ? cents : 0);
  }, 0);

  return {
    todayCount: scopedToToday.length,
    nextAppointment: next
      ? {
          bookingId: next.bookingId,
          scheduledAt: next.scheduledAt,
          serviceType: next.serviceType,
        }
      : null,
    pendingPayout: Math.round(pendingCents / 100),
  };
}

/**
 * Emptiness predicate for the today strip.
 *
 * Unlike the metrics view this replaces — which hid the *entire row* when both
 * numbers were zero — the today strip always renders. "No consultations today"
 * is itself useful information for a doctor deciding whether to check back
 * later, so this predicate exists only to document that the strip has no empty
 * state, not to drive one.
 */
export function isDoctorTodayMetricsEmpty(_metrics: DoctorTodayMetrics): boolean {
  return false;
}
