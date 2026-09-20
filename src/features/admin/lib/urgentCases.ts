import type { AdminBooking } from "./api/adminData";

/**
 * Operational triage rules for the admin Overview "Urgent cases" panel.
 *
 * The panel answers one question — *what needs a human right now* — so the
 * categories are derived from real booking fields rather than from a separate
 * "urgency" concept the backend does not model. Each rule names a state a
 * booking can be stuck in where waiting does not resolve it:
 *
 * - `escalated`   — intake flagged `need_review`, i.e. a clinician-facing
 *                   red flag that has not been picked up;
 * - `payment`     — the patient's money is in and the booking has not moved
 *                   past verification;
 * - `unassigned`  — a confirmed consult with no doctor attached to run it.
 *
 * Kept free of React so the classification is unit-testable on its own.
 */

/** The kind of intervention an urgent case needs. */
export type UrgentCategory = "escalated" | "payment" | "unassigned";

/** A booking surfaced on the triage panel, with the reason it appears there. */
export interface UrgentCase {
  booking: AdminBooking;
  category: UrgentCategory;
  /** Badge text — always paired with an icon, never colour alone. */
  label: string;
  /** One line stating what is wrong, not merely what the record contains. */
  title: string;
}

/**
 * Ordering used both to rank the panel and to break ties when a booking
 * satisfies more than one rule — a `need_review` booking that is also
 * unassigned is an escalation first.
 */
const CATEGORY_ORDER: readonly UrgentCategory[] = [
  "escalated",
  "payment",
  "unassigned",
];

/** The single most pressing category a booking falls into, if any. */
function classify(booking: AdminBooking): UrgentCategory | null {
  if (booking.intakeQueueStatus === "need_review") return "escalated";
  if (booking.status === "payment_submitted") return "payment";
  if (booking.status === "confirmed" && !booking.doctorId) return "unassigned";
  return null;
}

const LABELS: Record<UrgentCategory, { label: string; title: string }> = {
  escalated: {
    label: "Escalated",
    title: "Intake flagged for review",
  },
  payment: {
    label: "Payment",
    title: "Payment received, awaiting verification",
  },
  unassigned: {
    label: "Unassigned",
    title: "Booking with no doctor assigned",
  },
};

/** Milliseconds since the epoch for `value`, or `null` when unparseable. */
export function timeOf(value?: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Select and rank the bookings that need a human, most pressing first.
 *
 * Within a category the soonest-scheduled booking ranks first: a consult
 * starting in ten minutes with no doctor is more urgent than one tomorrow.
 * Bookings with an unparseable `scheduledAt` sort last rather than being
 * dropped, so a malformed record stays visible instead of silently vanishing
 * from the queue.
 *
 * @param bookings - Booking pages from the admin queue, in any order. Duplicates
 *   across pages are collapsed by `bookingId`.
 * @returns The urgent cases, ranked.
 */
export function selectUrgentCases(bookings: AdminBooking[]): UrgentCase[] {
  const seen = new Set<string>();
  const cases: UrgentCase[] = [];

  for (const booking of bookings) {
    if (seen.has(booking.bookingId)) continue;
    const category = classify(booking);
    if (!category) continue;
    seen.add(booking.bookingId);
    cases.push({ booking, category, ...LABELS[category] });
  }

  return cases.sort((a, b) => {
    const byCategory =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (byCategory !== 0) return byCategory;
    const at = timeOf(a.booking.scheduledAt);
    const bt = timeOf(b.booking.scheduledAt);
    if (at === null) return bt === null ? 0 : 1;
    if (bt === null) return -1;
    return at - bt;
  });
}

/**
 * Count the bookings scheduled on the same local day as `now`, split by whether
 * they have already finished.
 *
 * Local day, not UTC: an admin in Manila reading "consults today" means their
 * own day. Bookings whose `scheduledAt` cannot be parsed are excluded from both
 * counts rather than being bucketed arbitrarily.
 */
export function countConsultsToday(
  bookings: AdminBooking[],
  now: Date = new Date(),
): { total: number; completed: number; booked: number } {
  const seen = new Set<string>();
  let completed = 0;
  let booked = 0;

  for (const booking of bookings) {
    if (seen.has(booking.bookingId)) continue;
    const t = timeOf(booking.scheduledAt);
    if (t === null) continue;
    const date = new Date(t);
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (!sameDay) continue;
    seen.add(booking.bookingId);
    if (booking.status === "completed") completed += 1;
    else booked += 1;
  }

  return { total: completed + booked, completed, booked };
}

/**
 * Render `value` as a short relative time against `now` — "in 18 min", "24 min
 * ago", "in 2 hrs". Returns an em dash for a missing or unparseable timestamp so
 * a bad record renders as a gap rather than as "Invalid Date".
 */
export function relativeTime(value?: string, now: Date = new Date()): string {
  const t = timeOf(value);
  if (t === null) return "—";

  const diffMs = t - now.getTime();
  const future = diffMs >= 0;
  const minutes = Math.round(Math.abs(diffMs) / 60_000);

  if (minutes < 1) return "now";
  if (minutes < 60) return future ? `in ${minutes} min` : `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    const unit = hours === 1 ? "hr" : "hrs";
    return future ? `in ${hours} ${unit}` : `${hours} ${unit} ago`;
  }

  const days = Math.round(hours / 24);
  const unit = days === 1 ? "day" : "days";
  return future ? `in ${days} ${unit}` : `${days} ${unit} ago`;
}
