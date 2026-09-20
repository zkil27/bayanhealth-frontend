import { api, ApiError } from "@/lib/api";

/**
 * Patient payment data access (contracts/openapi.yaml, tag `Payments`).
 *
 * `POST /v1/bookings/{bookingId}/payment/hold` places a hold through the
 * configured gateway adapter and, in the same request, advances the booking
 * `pending_payment -> confirmed`. In every non-production environment the
 * adapter is the simulated internal `ledger` provider (ADR-20260618-01), which
 * captures no card data at all — so there is nothing card-shaped for the client
 * to collect or send. The request body is empty and the server owns the amount.
 *
 * This is the gateway path. The manual "upload proof of payment" path lives in
 * `paymentProof.ts` and is independent of it.
 */

/** contract: PaymentStatus */
export type PaymentStatus =
  | "pending"
  | "held"
  | "captured"
  | "refunded"
  | "voided";

/** contract: Payment */
export interface Payment {
  paymentId: string;
  bookingId: string;
  patientId: string;
  doctorId?: string;
  amountCents: number;
  currency: string;
  doctorPayoutCents: number;
  platformFeeCents: number;
  status: PaymentStatus;
  /** Gateway that handled the hold — `"ledger"` for the simulated provider. */
  provider: string;
  providerReference: string;
  heldAt?: string;
  capturedAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Place a payment hold for a booking and confirm it.
 *
 * The amount is resolved server-side from the booking, so no amount is sent —
 * a client-supplied amount would be an authorization hole. On success the
 * booking has already moved to `confirmed`, so callers should invalidate any
 * cached booking query rather than patch state locally.
 *
 * @param token          - Cognito IdToken of the booking-owning patient.
 * @param bookingId      - Booking identifier (contract pattern `^bk_[a-z0-9]+$`).
 * @param idempotencyKey - Optional key reused across retries of one logical
 *                         payment; auto-generated when omitted.
 * @returns The created {@link Payment} (`status: "held"`).
 * @throws {ApiError} 401/403 on auth, 404 when not the owner, 409 when the
 *   booking is not payable, 422 when the gateway declines.
 */
export async function holdBookingPayment(
  token: string,
  bookingId: string,
  idempotencyKey?: string,
): Promise<Payment> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to pay for this booking.",
      401,
    );
  }

  const res = await api.post<Payment>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/payment/hold`,
    token,
    {},
    idempotencyKey,
  );

  return res.data;
}

export { ApiError };
