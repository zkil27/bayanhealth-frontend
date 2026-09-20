"use client";

import { StepsIndicator } from "./StepsIndicator";
import { FindingStep } from "./FindingStep";
import { IntakeStep } from "./IntakeStep";
import { Video, X } from "lucide-react";
import { useFinding } from "../../hooks/useFinding";
import type { Booking } from "../../types/booking.types";
import { useState } from "react";
import { PaymentStep } from "./PaymentStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { CompletedStep } from "./CompletedStep";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "intake", label: "Form", system: false },
  { id: "payment", label: "Payment", system: false },
  { id: "finding", label: "Doctor", system: true },
  { id: "confirmation", label: "Confirmed", system: true },
  { id: "booked", label: "Consult", system: false },
];

const getBookingServiceLabel = (serviceRequested?: string): string => {
  switch (serviceRequested) {
    case "fit-for-work":
      return "Fit for Work";
    case "fit-for-climb":
      return "Fit for Climb";
    case "fit-for-travel":
      return "Fit for Travel";
    case "fit-for-school":
      return "Fit for School";
    case "teleconsult":
      return "Teleconsult";
    case "sick-leave":
      return "Sick Leave";
    default:
      return "Consultation";
  }
};

interface BookingWizardProps {
  booking: Booking;
}

export function BookingWizard({ booking }: BookingWizardProps) {
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const finding = useFinding(booking.id, booking.step === "finding");

  const stepId = booking.step === "appointment" ? "booked" : booking.step;
  const currentStepIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.id === stepId),
  );
  const activeIdx = reviewStep !== null ? reviewStep : currentStepIndex;
  const isReview = reviewStep !== null;
  const completedSteps = STEPS.map((_, i) => i < currentStepIndex);
  const handleStepClick = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) {
      setReviewStep(stepIndex);
    }
  };
  const handleCloseReview = () => {
    setReviewStep(null);
  };

  const serviceLabel = getBookingServiceLabel(booking.serviceRequested);
  return (
    <div className="flex w-full flex-col gap-4 select-none">
      <h2 className="sr-only">Booking tracker</h2>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:rounded-[18px] lg:border lg:border-(--border-subtle) lg:bg-(--surface-card) lg:p-5 lg:shadow-(--shadow-card)">
          <div className="mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:mx-0 lg:flex-col lg:items-start lg:gap-y-2">
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-(--surface-brand) px-3.5 py-1.5 text-[13px] font-bold text-white">
              <Video className="size-3.5" />
              <span className="capitalize">{serviceLabel}</span>
            </span>
          </div>

          <StepsIndicator
            steps={STEPS}
            currentStep={currentStepIndex}
            completedSteps={completedSteps}
            reviewStep={reviewStep}
            onStepClick={handleStepClick}
          />
        </aside>

        <section
          className={cn(
            "w-full border border-(--border-subtle) bg-(--surface-card) shadow-(--shadow-card)",
            // The editable intake is its own fixed-height sheet with pinned
            // header and footer, so it supplies its own padding.
            activeIdx === 0 && !isReview
              ? "overflow-hidden rounded-(--radius-xl)"
              : "rounded-[18px] p-4 lg:p-6",
          )}
        >
          {isReview && (
            <div className="mb-3 flex animate-in items-center justify-between gap-1 rounded-(--radius-md) border border-(--border-default) bg-(--surface-warm) px-3 py-1.5 text-[11px] text-(--text-muted) italic duration-300 fade-in">
              <span>Reviewing a completed step</span>
              <button
                type="button"
                aria-label="Close review"
                onClick={handleCloseReview}
                className="text-(--text-muted) not-italic hover:text-(--text-heading)"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="relative w-full">
            <div
              className={cn(
                "transition-all duration-500 ease-in-out",
                "animate-in fade-in slide-in-from-right-4",
              )}
              key={activeIdx}
            >
              {activeIdx === 0 && (
                <IntakeStep booking={booking} isReview={isReview} />
              )}

              {activeIdx === 1 && (
                <PaymentStep booking={booking} isReview={isReview} />
              )}

              {activeIdx === 2 && (
                <FindingStep
                  booking={booking}
                  finding={finding}
                  isReview={isReview}
                />
              )}

              {activeIdx === 3 && (
                <ConfirmationStep booking={booking} isReview={isReview} />
              )}

              {/*
              STEPS has five entries and this branch was missing, so a completed
              or cancelled booking rendered the tracker with "Booked" lit above an
              empty card — silence at the one moment the patient most needs to be
              told what happens next.
            */}
              {activeIdx === 4 && <CompletedStep booking={booking} />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
