// features/booking/components/consultation/PaymentStep.tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  Info,
  Lock,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

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

function ReassuranceRow({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-(--teal-800) [&_svg]:size-4">
        {icon}
      </span>
      <p className="text-[14px] leading-[1.5] text-(--text-body)">{children}</p>
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
      <div className="animate-in duration-300 fade-in">
        <div className="mb-2 flex items-center gap-2 text-[15px] font-bold text-(--text-heading)">
          <CreditCard className="size-4.5" />
          Payment review
        </div>
        <div className="rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-warm) p-3 text-sm">
          <div className="mb-2 flex justify-between">
            <span className="text-(--text-muted)">Consultation fee</span>
            <span className="font-semibold text-(--text-body)">
              {amountLabel ?? "Amount pending"}
            </span>
          </div>
          <div className="text-xs font-medium text-(--teal-800)">
            Payment held successfully
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in duration-300 fade-in">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex items-center gap-2 text-[17px] font-bold text-(--text-heading)">
          <CreditCard className="size-5" />
          Payment
        </span>
        <span className="flex items-center gap-1 rounded-full bg-(--teal-100) px-2 py-0.5 text-[11px] font-semibold text-(--teal-800)">
          <Lock className="size-3" /> Secure payment
        </span>
      </div>

      <div className="rounded-[14px] bg-(--surface-brand) px-4 py-3.5 text-white">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-[32px] leading-tight font-semibold">
            {amountLabel ?? "Amount pending"}
          </span>
          <span className="text-[14px] text-white/90 capitalize">
            {booking.serviceRequested?.replace(/-/g, " ") ?? "Consultation"}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-[1.5] text-white/85">
          Server-set price for this booking.
        </p>
      </div>

      <div className="mt-3.5 flex flex-col gap-2.5">
        <ReassuranceRow icon={<ShieldCheck aria-hidden />}>
          This is a hold, not a charge — you are only charged after the
          consultation.
        </ReassuranceRow>
        <ReassuranceRow icon={<CheckCircle2 aria-hidden />}>
          Once the hold is placed, your booking is confirmed.
        </ReassuranceRow>
        <ReassuranceRow icon={<Radio aria-hidden />}>
          After that, every available doctor sees your request — the first to
          accept becomes your doctor.
        </ReassuranceRow>
      </div>

      {/* No card fields: the simulated ledger provider captures no card data, so
          asking for a number/expiry/CVV would misrepresent what happens. */}
      <Alert className="mt-3.5">
        <Info className="size-4" />
        <AlertDescription className="text-xs">
          This environment uses the simulated ledger payment provider. No card
          details are collected or charged — confirming places a hold and
          confirms your booking.
        </AlertDescription>
      </Alert>

      {errorMessage ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription className="text-xs">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      <BrandCtaButton
        onClick={() => paymentMutation.mutate()}
        disabled={paymentMutation.isPending || !idToken}
        className="mt-4 min-h-12 text-[15px]"
      >
        <Lock className="size-4" />
        {paymentMutation.isPending
          ? "Processing..."
          : amountLabel
            ? `Hold ${amountLabel}`
            : "Hold consultation fee"}
      </BrandCtaButton>

      <p className="mt-2.5 text-center text-[12.5px] text-(--text-subtle)">
        Free to cancel before a doctor accepts — full refund.
      </p>
    </div>
  );
}
