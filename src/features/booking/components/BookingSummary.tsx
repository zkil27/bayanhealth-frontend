"use client";

import { Check, CheckCircle, CreditCard, Shield } from "lucide-react";

import {
  CONSULTATION_FEE_CENTS,
  CONSULTATION_FEE_CURRENCY,
} from "../constants/bookingConstants";

/**
 * Fee + reassurance panel for the booking flow.
 *
 * Pricing is server-owned (ADR-20260726-01) and there is still no
 * patient-readable price endpoint, so this panel quotes the backend's own flat
 * per-booking figure through {@link CONSULTATION_FEE_CENTS} — the mirror of
 * `DEFAULT_AMOUNT_CENTS`, which `handlers/bookings.ts` stamps onto every
 * booking it creates — rather than a number chosen here. That distinction is
 * what makes this safe where an earlier version was not: that one invented a
 * figure, and it disagreed with what `PaymentStep` went on to charge.
 *
 * `PaymentStep` remains authoritative: it renders the real
 * `amountCents`/`currency` returned by `POST /v1/bookings`. This is the
 * up-front quote, which is what "Shown before you pay" used to withhold — a
 * patient should not have to create a booking to find out what it costs.
 *
 * It deliberately does not mirror the service and preference chips the form
 * already shows: that repeated the selections without adding information.
 */
function formatFee(): string {
  const amount = CONSULTATION_FEE_CENTS / 100;
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: CONSULTATION_FEE_CURRENCY,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${CONSULTATION_FEE_CURRENCY}`;
  }
}

export function BookingSummary() {
  const fee = formatFee();

  return (
    <div
      data-slot="booking-summary"
      className="overflow-hidden rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) shadow-(--shadow-card)"
    >
      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-(--text-muted)">Consultation fee</span>
          <span
            data-slot="booking-summary-fee"
            className="text-[17px] font-bold text-(--text-heading)"
          >
            {fee}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-(--text-muted)">Platform fee</span>
          <span className="flex items-center gap-1 font-bold text-(--status-available-fg)">
            <Check className="size-3.5" />
            Free
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t border-(--border-subtle) pt-3 text-sm">
          <span className="font-semibold text-(--text-heading)">
            Total today
          </span>
          <span className="font-bold text-(--text-heading)">{fee}</span>
        </div>
        <p className="text-xs text-(--text-subtle)">
          One flat fee for every consultation service. The exact amount is
          confirmed on the payment step, and nothing is charged until you
          confirm.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-(--border-subtle) bg-(--surface-accent-soft)/50 p-3 text-center text-[11px]">
        <div className="flex flex-col items-center gap-1">
          <Shield className="size-3.5 text-(--status-available-fg)" />
          <span className="font-medium text-(--text-body)">Secure payment</span>
        </div>
        <div className="flex flex-col items-center gap-1 border-x border-(--border-subtle)">
          <CreditCard className="size-3.5 text-(--text-subtle)" />
          <span className="font-medium text-(--text-body)">Pay after intake</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CheckCircle className="size-3.5 text-(--status-available-fg)" />
          <span className="font-medium text-(--text-body)">Free cancellation</span>
        </div>
      </div>
    </div>
  );
}
