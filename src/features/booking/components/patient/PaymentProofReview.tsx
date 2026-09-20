"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, ShieldCheck, XCircle } from "lucide-react";

import AppButton from "@/components/primitives/AppButton";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";
import { reviewPaymentProof, type PaymentProofDecision } from "../../lib/api/paymentProof";
import type { BookingDetail } from "../../lib/api/bookingDetail";

export interface PaymentProofReviewProps {
  bookingId: string;
  /** Called with the updated booking after a successful review. */
  onReviewed?: (booking: BookingDetail) => void;
}

/**
 * Staff payment-proof review (booking in `payment_submitted`).
 *
 * Confirm advances the booking to `confirmed`; reject returns it to
 * `pending_payment`. Requires `doctor` (assigned) or `admin` role — the caller
 * is responsible for only rendering this when the viewer holds such a role.
 */
export function PaymentProofReview({ bookingId, onReviewed }: PaymentProofReviewProps) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [pending, setPending] = useState<PaymentProofDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: PaymentProofDecision) {
    if (!idToken) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    setPending(decision);
    setError(null);
    try {
      const updated = await reviewPaymentProof(
        bookingId,
        idToken,
        decision,
        newIdempotencyKey(),
      );
      onReviewed?.(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not submit the review. Please try again.",
      );
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <span className="text-base font-bold">Review payment proof</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Confirm to mark the booking as paid, or reject to return it to pending
        payment.
      </p>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <AppButton type="button" onClick={() => review("confirmed")} disabled={busy}>
          {pending === "confirmed" ? <Spinner /> : <CheckCircle2 className="size-4" />}
          Confirm payment
        </AppButton>
        <AppButton
          type="button"
          variant="outline"
          onClick={() => review("rejected")}
          disabled={busy}
        >
          {pending === "rejected" ? <Spinner /> : <XCircle className="size-4" />}
          Reject
        </AppButton>
      </div>
    </div>
  );
}

export default PaymentProofReview;
