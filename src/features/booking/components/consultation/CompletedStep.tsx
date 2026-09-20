"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Hourglass,
  MessageSquareOff,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { buildRebookingUrl } from "../../lib/rebookingUrl";
import { Booking } from "../../types/booking.types";
import { BrandCtaButton } from "../BrandUI";

/** Format minor units as a currency amount, or return null when unpriced. */
function formatAmount(amountCents?: number, currency?: string): string | null {
  if (typeof amountCents !== "number" || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

const infoCard =
  "flex items-start gap-2.5 rounded-[12px] bg-(--surface-warm) px-3 py-2.5 text-[13px] text-(--text-muted)";

/**
 * Terminal step of the booking wizard — the consultation is over, or cancelled.
 *
 * This step existed in the stepper and rendered **nothing**. `STEPS` has five
 * entries and the wizard only had branches for indices 0-3, so a `completed`
 * booking showed the tracker with "Booked" lit and an empty white card beneath
 * it. The one moment the patient most needs to be told what happens next was the
 * one moment the product said nothing at all.
 *
 * What it says is bounded by what the platform can honestly promise. A physician
 * may release patient education, a prescription, or neither, and releasing is a
 * deliberate per-artifact action taken after the consult — so this does not claim
 * a prescription is coming. It says the consultation is complete, that anything
 * the doctor shares will appear on this page, and it does not invent a timeframe.
 *
 * Released content is not rendered here. `PatientBookingDetail` mounts the
 * released-education and released-prescription cards above the wizard, because
 * they are things to act on rather than a step in a tracker, and they must remain
 * visible when the patient revisits the booking later.
 */
export function CompletedStep({ booking }: { booking: Booking }) {
  const isCancelled = booking.status === "cancelled";
  const isDeclined = isCancelled && !!booking.declinedBy;
  const heldAmount = formatAmount(booking.amountCents, booking.currency);

  if (isDeclined) {
    return (
      <div
        className="animate-in duration-300 fade-in"
        data-slot="wizard-declined"
      >
        <div className="mb-2 flex items-center gap-2 text-[17px] font-bold text-(--text-heading)">
          <MessageSquareOff className="size-5 text-(--danger-fg)" />
          <span>Your doctor declined this booking</span>
        </div>
        <p className="text-[14px] text-(--text-muted)">
          Your doctor was unable to take this appointment. This booking has been
          cancelled and you have been fully refunded — nothing was charged.
        </p>
        {booking.declineReason ? (
          // Rendered as plain text, never markup, per contract
          // (Booking.declineReason): the note is the doctor's own words, not
          // trusted HTML. Shown here only — never in an email or SMS, and
          // this page is the one place it is surfaced at all.
          <div
            data-slot="decline-reason"
            className="mt-3 rounded-[12px] bg-(--surface-warm) p-3 text-[14px] text-(--text-body)"
          >
            <p className="mb-1 text-xs font-semibold text-(--text-muted)">
              Note from your doctor
            </p>
            <p className="whitespace-pre-wrap">{booking.declineReason}</p>
          </div>
        ) : null}
        <div className="mt-4">
          {/*
            `booking.doctorId` is still the declining doctor's id here, not an
            empty/unassigned value: `declineScheduledRequest`'s cancel write
            only adds `status`/`declinedBy`/`declinedAt`/`declineReason` — it
            never removes `doctorId` (backend/src/lib/scheduled-requests.ts) —
            so this is the same id the booking has always carried, and exactly
            the one this rebooking flow must exclude.
          */}
          <Link href={buildRebookingUrl({ excludeDoctorId: booking.doctorId })}>
            <Button size="sm" data-slot="rebook-after-decline">
              Find another doctor
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div
        className="animate-in duration-300 fade-in"
        data-slot="wizard-cancelled"
      >
        <div className="mb-2 flex items-center gap-2 text-[17px] font-bold text-(--text-heading)">
          <XCircle className="size-5 text-(--danger-fg)" />
          <span>Booking cancelled</span>
        </div>
        <p className="text-[14px] text-(--text-muted)">
          This booking was cancelled. Any payment hold placed for it has been
          released — nothing was charged. You can book again whenever you need
          to.
        </p>

        <div className="mt-3.5 flex items-start gap-2.5 rounded-[12px] border border-(--teal-200) bg-(--teal-100) px-3 py-2.5 text-[13px] text-(--text-muted)">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-(--teal-800)" />
          <p>
            {heldAmount ? (
              <>
                <span className="font-bold text-(--teal-800)">
                  {heldAmount} hold released.
                </span>{" "}
                The full amount goes back to your payment method — no
                cancellation fee.
              </>
            ) : (
              "Your payment hold has been released in full, back to your payment method — no cancellation fee."
            )}
          </p>
        </div>

        <Link href="/patient/booking/createBooking" className="mt-3.5 block">
          <BrandCtaButton type="button" className="min-h-12 text-[15px]">
            Book again
            <ArrowRight className="size-4" />
          </BrandCtaButton>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="animate-in duration-300 fade-in"
      data-slot="wizard-completed"
    >
      <div className="mb-2 flex items-center gap-2 text-[17px] font-bold text-(--text-heading)">
        <CheckCircle2 className="size-5 text-(--teal-800)" />
        <span>Consultation complete</span>
      </div>

      <p className="text-[14px] text-(--text-muted)">
        Thank you for using BayanHealth. Your consultation has ended and your
        doctor is writing up their findings.
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className={infoCard}>
          <Hourglass className="mt-0.5 size-4 shrink-0 text-(--teal-800)" />
          <p>
            <span className="font-bold text-(--text-heading)">
              Waiting for your doctor.
            </span>{" "}
            They review the consultation before sharing anything, so there may
            be a short wait. You do not need to stay on this page.
          </p>
        </div>

        <div className={infoCard}>
          <FileText className="mt-0.5 size-4 shrink-0 text-(--teal-800)" />
          <p>
            <span className="font-bold text-(--text-heading)">
              Anything your doctor shares appears here.
            </span>{" "}
            Care instructions and any prescription will show up on this booking
            page once your doctor releases them. Your chat history stays
            available either way.
          </p>
        </div>
      </div>
    </div>
  );
}
