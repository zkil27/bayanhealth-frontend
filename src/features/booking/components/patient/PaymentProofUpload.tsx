"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, ReceiptText, UploadCloud } from "lucide-react";

import AppButton from "@/components/primitives/AppButton";
import { Spinner } from "@/components/ui/spinner";
import { usePaymentProofUpload } from "../../hooks/usePaymentProofUpload";
import {
  ALLOWED_PROOF_CONTENT_TYPES,
  isAllowedProofContentType,
} from "../../lib/api/paymentProof";
import type { BookingDetail } from "../../lib/api/bookingDetail";

const ACCEPT_ATTR = ALLOWED_PROOF_CONTENT_TYPES.join(",");

export interface PaymentProofUploadProps {
  bookingId: string;
  /** Called with the updated booking after a successful submission. */
  onSubmitted?: (booking: BookingDetail) => void;
}

/**
 * Patient payment-proof submission (booking in `pending_payment`).
 *
 * Picks a proof image, then runs the presign -> PUT upload -> confirm chain via
 * {@link usePaymentProofUpload}. On success the booking moves to
 * `payment_submitted` and {@link PaymentProofUploadProps.onSubmitted} fires so
 * the parent can refresh. On any step failure an error is shown and the proof is
 * not presented as submitted, with a retry available.
 */
export function PaymentProofUpload({ bookingId, onSubmitted }: PaymentProofUploadProps) {
  const [selected, setSelected] = useState<File | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const { submit, reset, status, booking, error, isSubmitting } =
    usePaymentProofUpload(bookingId);

  // Notify the parent exactly once per successful submission.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (status === "submitted" && booking && !notifiedRef.current) {
      notifiedRef.current = true;
      onSubmitted?.(booking);
    } else if (status !== "submitted") {
      notifiedRef.current = false;
    }
  }, [status, booking, onSubmitted]);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setTypeError(null);
    reset();
    if (file && !isAllowedProofContentType(file.type)) {
      setSelected(null);
      setTypeError("Unsupported file type. Allowed: JPEG, PNG, or WebP.");
      return;
    }
    setSelected(file);
  }

  async function onSubmit() {
    if (!selected) return;
    await submit(selected);
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2">
        <ReceiptText className="size-5 text-primary" />
        <span className="text-base font-bold">Submit payment proof</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Upload a screenshot or photo of your payment receipt. Once submitted, your
        booking moves to <span className="font-medium">payment submitted</span> for
        review.
      </p>

      <input
        type="file"
        accept={ACCEPT_ATTR}
        className="text-sm"
        onChange={onPick}
        aria-label="Choose payment proof image"
        disabled={isSubmitting || status === "submitted"}
      />

      {typeError && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {typeError}
        </p>
      )}

      {status !== "submitted" && (
        <div className="flex items-center gap-3">
          <AppButton type="button" onClick={onSubmit} disabled={!selected || isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner /> Submitting…
              </>
            ) : (
              <>
                <UploadCloud className="size-4" /> Submit proof
              </>
            )}
          </AppButton>
          {selected && !isSubmitting && (
            <span className="truncate text-sm text-muted-foreground">
              {selected.name}
            </span>
          )}
        </div>
      )}

      {status === "submitted" && (
        <p role="status" className="flex items-center gap-2 text-sm font-medium text-green-600">
          <CheckCircle2 className="size-4" />
          Payment proof submitted. Awaiting review.
        </p>
      )}

      {status === "error" && error && (
        <div role="alert" className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <CircleAlert className="size-4" />
            {error.message}
          </p>
          <AppButton
            type="button"
            variant="outline"
            className="self-start"
            onClick={onSubmit}
            disabled={!selected}
          >
            Retry
          </AppButton>
        </div>
      )}
    </div>
  );
}

export default PaymentProofUpload;
