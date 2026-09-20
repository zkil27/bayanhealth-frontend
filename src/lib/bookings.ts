import type { ApiResponse } from "@/lib/api";

/**
 * Booking lifecycle status values, matching the backend contract.
 *
 * These are the six defined lifecycle values a booking can carry
 * (Requirement 10.7). Any other value — including a missing status — is
 * treated as unknown by {@link displayBookingStatus}.
 */
export type BookingStatus =
  | "pending_payment"
  | "payment_submitted"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

/**
 * Display metadata for a booking status.
 *
 * - `label` — a user-facing, always non-empty status label.
 * - `tone`  — a semantic tone hint for styling (e.g. badge colour mapping).
 */
export interface BookingStatusDisplay {
  label: string;
  tone: string;
}

/**
 * Specific display metadata for each defined lifecycle value.
 * Every entry carries a non-empty label.
 */
const STATUS_DISPLAY: Record<BookingStatus, BookingStatusDisplay> = {
  pending_payment: { label: "Pending payment", tone: "warning" },
  payment_submitted: { label: "Payment submitted", tone: "info" },
  confirmed: { label: "Confirmed", tone: "info" },
  in_progress: { label: "In progress", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/**
 * Fallback display used for any unknown, unrecognised, or missing status.
 * Carries a non-empty label so the UI never renders a blank value
 * (Requirement 10.8).
 */
const FALLBACK_STATUS_DISPLAY: BookingStatusDisplay = {
  label: "Unknown status",
  tone: "neutral",
};

/**
 * Display metadata for a `cancelled` booking that carries `declinedBy`
 * (contracts/openapi.yaml#Booking.declinedBy) — the doctor said no, rather
 * than the patient (or an admin) cancelling. A patient scanning a list of
 * bookings has no reason to open each one just to learn which kind of
 * "Cancelled" they are looking at, so this is a distinct label rather than a
 * generic one the detail page alone disambiguates.
 */
const DECLINED_STATUS_DISPLAY: BookingStatusDisplay = {
  label: "Declined by doctor",
  tone: "warning",
};

/**
 * Pure helper: map a booking status value to its display metadata.
 *
 * Returns a specific, non-empty label for each of the six defined lifecycle
 * values (`pending_payment`, `payment_submitted`, `confirmed`, `in_progress`,
 * `completed`, `cancelled`), and a defined non-empty fallback label for any
 * other value, including `null`, `undefined`, or an empty string.
 *
 * @param status - The booking status value (may be unknown or missing).
 * @param declinedByDoctor - Whether the booking carries `declinedBy`
 *   (Task 12, patient-side decline visibility). Only changes the result when
 *   `status` is exactly `"cancelled"` — passing `true` alongside any other
 *   status is a caller error this function tolerates rather than acts on,
 *   since a booking cannot simultaneously be, say, `confirmed` and declined.
 * @returns Display metadata with an always non-empty {@link BookingStatusDisplay.label}.
 */
export function displayBookingStatus(
  status: string | null | undefined,
  declinedByDoctor?: boolean,
): BookingStatusDisplay {
  if (
    typeof status === "string" &&
    Object.prototype.hasOwnProperty.call(STATUS_DISPLAY, status)
  ) {
    if (status === "cancelled" && declinedByDoctor) {
      return DECLINED_STATUS_DISPLAY;
    }
    return STATUS_DISPLAY[status as BookingStatus];
  }
  return FALLBACK_STATUS_DISPLAY;
}

/**
 * The `meta` envelope shape relevant to pagination, structurally compatible
 * with {@link ApiResponse}'s `meta` field. Kept permissive so callers can pass
 * a raw, partially-formed envelope without a cast.
 */
type PaginationMeta = Partial<ApiResponse<unknown>["meta"]> | null | undefined;

/**
 * Pure helper: determine whether a paginated response has a next page.
 *
 * Returns `true` if and only if `meta.pagination.cursor` is a non-empty string.
 * Returns `false` for absent `meta`, absent `pagination`, absent `cursor`, or a
 * cursor that is empty or whitespace-only (Requirements 10.9, 10.10).
 *
 * @param meta - The response `meta` envelope (may be absent or partial).
 * @returns `true` when a usable next-page cursor is present, `false` otherwise.
 */
export function hasNextPage(meta: PaginationMeta): boolean {
  const cursor = meta?.pagination?.cursor;
  return typeof cursor === "string" && cursor.trim().length > 0;
}
