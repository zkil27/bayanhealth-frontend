import { api, ApiError } from "@/lib/api";

import type { BookingDetail } from "./bookingDetail";

/**
 * Patient booking cancellation (contracts/openapi.yaml#updateBooking).
 *
 * `PUT /v1/bookings/{bookingId}` with `{ status: "cancelled" }` is the patient's
 * own cancellation path. The backend does three things in response, all of which
 * matter to the copy shown around this call:
 *
 * 1. it flips the booking to `cancelled` under a condition expression, so a
 *    booking that has already moved on cannot be cancelled from here;
 * 2. it releases the reserved availability slot back to `available`, so the
 *    doctor does not lose the published time;
 * 3. it refunds a `held` payment when the booking was `confirmed`
 *    (`REFUNDABLE_BOOKING_STATUSES` in `backend/src/lib/payments.ts`), so the
 *    hold is released in full rather than captured.
 *
 * The amount is never sent and never chosen here — cancellation carries no
 * client-supplied money. Whether a refund happens is decided server-side from
 * the prior status and the payment record.
 */

/**
 * Cancel a booking on the authenticated patient's behalf.
 *
 * @param token          - Cognito IdToken of the booking-owning patient.
 * @param bookingId      - Booking identifier (contract pattern `^bk_[a-z0-9]+$`).
 * @param idempotencyKey - Key reused across retries of one logical cancellation.
 *                         Pass a stable value: with a fresh key per attempt, a
 *                         retry after an ambiguous network failure re-runs the
 *                         write, loses the status condition, and surfaces a 409
 *                         for a cancellation that already succeeded.
 * @returns The updated booking, now `cancelled`.
 * @throws {ApiError} 401 unauthenticated, 404 when not the owner, 409 when the
 *   booking is no longer in a patient-cancellable status.
 */
export async function cancelBooking(
  token: string,
  bookingId: string,
  idempotencyKey?: string,
): Promise<BookingDetail> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to cancel this booking.",
      401,
    );
  }

  const res = await api.put<BookingDetail>(
    `/v1/bookings/${encodeURIComponent(bookingId)}`,
    token,
    { status: "cancelled" },
    idempotencyKey,
  );

  return res.data;
}
