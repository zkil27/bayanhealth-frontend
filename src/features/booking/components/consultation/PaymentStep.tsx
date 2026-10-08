// features/booking/components/consultation/PaymentStep.tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Info, Lock, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIdToken } from "@/stores/useAuthStore";

import { holdBookingPayment } from "../../lib/api/payments";
import type { Booking } from "../../types/booking.types";
import { BrandCtaButton } from "../BrandUI";

interface PaymentStepProps {
  booking: Booking;
  isReview: boolean;
}

/**
 * Format a server-owned minor-unit amount for display.
 *
 * Returns null when the booking carries no amount yet, so the UI can say so
 * instead of inventing a price — the amount is always the backend's.
 */
function formatAmount(
  amountCents: number | undefined,
  currency: string | undefined,
): string | null {
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) {
    return null;
  }
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currency ?? "PHP",
  }).format(amountCents / 100);
}

/** "fit-for-work" → "Fit for work"; falls back to "Consultation". */
function serviceName(serviceRequested?: string): string {
  if (!serviceRequested) return "Consultation";
  const words = serviceRequested.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The fee as a receipt: what it is for, the platform fee, and the one total
 * that will be held. The total is always the server's amount; "Platform fee:
 * Free" repeats the line the patient already saw on Consult Now.
 */
function FeeReceipt({
  booking,
  amountLabel,
  held,
}: {
  booking: Booking;
  amountLabel: string | null;
  held?: boolean;
}) {
  return (
    <div
      data-slot="payment-receipt"
      className="rounded-xl border border-(--border-default) bg-(--surface-card) p-4 sm:p-5"
    >
      <dl className="space-y-2.5 text-base">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-(--text-body)">{serviceName(booking.serviceRequested)} consultation</dt>
          <dd className="font-medium text-(--text-heading) tabular-nums">{amountLabel ?? "Amount pending"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-(--text-body)">Platform fee</dt>
          <dd className="font-medium text-(--teal-800)">Free</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t-2 border-dashed border-(--border-default) pt-4">
        <span className="text-base font-semibold text-(--text-heading)">
          {held ? "Held" : "Total to hold"}
        </span>
        <span className="font-display text-[28px] leading-none font-semibold text-(--text-heading) tabular-nums">
          {amountLabel ?? "Amount pending"}
        </span>
      </div>
    </div>
  );
}

export function PaymentStep({ booking, isReview }: PaymentStepProps) {
  const queryClient = useQueryClient();
  const idToken = useIdToken();
  const amountLabel = formatAmount(booking.amountCents, booking.currency);

  const paymentMutation = useMutation({
    mutationFn: () => holdBookingPayment(idToken ?? "", booking.id),
    onSuccess: () => {
      // The hold also advances the booking to `confirmed`, so the wizard must
      // re-read server state rather than assume the next step locally.
      void queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
    },
  });

  const errorMessage =
    paymentMutation.error instanceof Error
      ? paymentMutation.error.message
      : paymentMutation.error
        ? "The payment could not be completed. Please try again."
        : null;

  if (isReview) {
    return (
      <div className="animate-in duration-300 fade-in motion-reduce:animate-none">
        <h3 className="mb-3 text-xl font-bold text-(--text-heading)">Payment</h3>
        <FeeReceipt booking={booking} amountLabel={amountLabel} held />
        <p className="mt-3 flex items-center gap-2 text-[15px] font-medium text-(--teal-800)">
          <CheckCircle2 aria-hidden className="size-4.5 shrink-0" />
          Payment held successfully
        </p>
      </div>
    );
  }

  /*
   * One receipt, one promise, one button. Removed: the navy price slab, the
   * "Secure payment" pill (the lock on the button says it), and the rows that
   * described later steps — the route tracker's "Next:" line covers those.
   */
  return (
    <div className="animate-in duration-300 fade-in motion-reduce:animate-none">
      <h3 className="mb-3 text-xl font-bold text-(--text-heading)">Your consultation fee</h3>

      <FeeReceipt booking={booking} amountLabel={amountLabel} />

      <p className="mt-4 flex items-start gap-2.5 text-base leading-relaxed text-(--text-body)">
        <ShieldCheck aria-hidden className="mt-1 size-5 shrink-0 text-(--teal-800)" />
        <span>
          This is a hold, not a charge. You&apos;re only charged after your
          consultation, and it&apos;s free to cancel before a doctor accepts.
        </span>
      </p>

      {errorMessage ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription className="text-[15px]">{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <BrandCtaButton
        onClick={() => paymentMutation.mutate()}
        disabled={paymentMutation.isPending || !idToken}
        className="mt-5 min-h-13 text-base"
      >
        <Lock aria-hidden className="size-4.5" />
        {paymentMutation.isPending
          ? "Placing hold…"
          : amountLabel
            ? `Hold ${amountLabel}`
            : "Hold consultation fee"}
      </BrandCtaButton>

      {/* No card fields: the simulated ledger provider captures no card data, so
          asking for a number/expiry/CVV would misrepresent what happens. The
          disclosure stays while that provider is live (same meaning, one quiet
          line); upstream should drop it once a real provider is wired. */}
      <p className="mt-3 flex items-start gap-2 text-sm leading-snug text-(--text-muted)">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        Test payment provider: no card details are collected or charged.
        Confirming places a hold and confirms your booking.
      </p>
    </div>
  );
}
