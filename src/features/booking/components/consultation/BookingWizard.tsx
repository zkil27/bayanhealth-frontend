"use client";

import { StepsIndicator } from "./StepsIndicator";
import { FindingStep } from "./FindingStep";
import { IntakeStep } from "./IntakeStep";
import { Undo2 } from "lucide-react";
import { useFinding } from "../../hooks/useFinding";
import type { Booking } from "../../types/booking.types";
import { useEffect, useRef, useState } from "react";
import { PaymentStep } from "./PaymentStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { CompletedStep } from "./CompletedStep";
import { cn } from "@/lib/utils";

/**
 * Four stops on the route. "Doctor" covers both finding a doctor and the
 * accepted/confirmed screen: "Confirmed" used to be its own stop, but it is
 * reached the instant a doctor accepts, so the two were one moment shown as
 * two. The booking steps underneath are unchanged — see `STOP_FOR_STEP`.
 */
const STEPS = [
  { id: "intake", label: "Form", system: false },
  { id: "payment", label: "Payment", system: false },
  { id: "doctor", label: "Doctor", system: true },
  { id: "booked", label: "Consult", system: false },
];

const STOP_FOR_STEP: Record<string, number> = {
  intake: 0,
  payment: 1,
  finding: 2,
  confirmation: 2,
  appointment: 3,
  booked: 3,
};

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

/**
 * While the patient waits they often switch tabs. There are no push
 * notifications in this product, so when the booking leaves "finding" for a
 * matched step during this visit, the browser tab title says so until the
 * patient comes back to the tab. Display-only: no polling or state is added.
 */
function useDoctorFoundTabTitle(step: Booking["step"]) {
  const previousStep = useRef(step);

  useEffect(() => {
    const wasFinding = previousStep.current === "finding";
    previousStep.current = step;
    if (!wasFinding || (step !== "confirmation" && step !== "appointment")) return;
    if (typeof document === "undefined" || !document.hidden) return;

    const original = document.title;
    document.title = "Doctor found – BayanHealth";
    const restore = () => {
      if (!document.hidden) {
        document.title = original;
        document.removeEventListener("visibilitychange", restore);
      }
    };
    document.addEventListener("visibilitychange", restore);
    return () => {
      document.removeEventListener("visibilitychange", restore);
      document.title = original;
    };
  }, [step]);
}

interface BookingWizardProps {
  booking: Booking;
}

export function BookingWizard({ booking }: BookingWizardProps) {
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const finding = useFinding(booking.id, booking.step === "finding");
  useDoctorFoundTabTitle(booking.step);

  const currentStepIndex = STOP_FOR_STEP[booking.step] ?? 0;
  const activeIdx = reviewStep !== null ? reviewStep : currentStepIndex;
  const isReview = reviewStep !== null;
  const completedSteps = STEPS.map((_, i) => i < currentStepIndex);
  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === currentStepIndex) {
      setReviewStep(null);
    } else if (stepIndex < currentStepIndex) {
      setReviewStep(stepIndex);
    }
  };
  const handleCloseReview = () => {
    setReviewStep(null);
  };

  const serviceLabel = getBookingServiceLabel(booking.serviceRequested);
  const isActivelyFillingIntake = activeIdx === 0 && !isReview;

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        isActivelyFillingIntake ? "flex-1 min-h-0 flex flex-col overflow-hidden" : "gap-4",
      )}
    >
      <h2 className="sr-only">Booking tracker</h2>

      <div
        className={cn(
          "flex flex-col lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8",
          isActivelyFillingIntake ? "flex-1 min-h-0 flex flex-col overflow-hidden" : "gap-4 lg:items-start",
        )}
      >
        <aside
          className={cn(
            "flex flex-col gap-4 lg:sticky lg:top-6 lg:rounded-[18px] lg:border lg:border-(--border-subtle) lg:bg-(--surface-card) lg:p-5 lg:shadow-(--shadow-card)",
            isActivelyFillingIntake ? "hidden lg:flex" : "",
          )}
        >
          {/* The service name is already the page title in the context bar above;
              the pill that repeated it here is gone. Desktop keeps it as a small
              rail heading, where the title bar is out of the eye-line. */}
          <p className="hidden text-[15px] font-semibold text-(--text-heading) lg:block">{serviceLabel}</p>

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
            isActivelyFillingIntake
              ? "flex-1 min-h-0 flex flex-col overflow-hidden rounded-(--radius-xl)"
              : "rounded-[18px] p-4 lg:p-6",
          )}
        >
          {/*
            The way back used to be a small italic X, which demo patients did not
            find: having tapped back to review the form, they believed they had
            lost the waiting screen. The return is now the banner's primary action.
          */}
          {isReview && (
            <div
              data-slot="wizard-review-banner"
              className="mb-4 flex animate-in flex-col gap-3 rounded-[14px] border-2 border-(--action-primary) bg-(--surface-brand-soft) p-3.5 duration-300 fade-in sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-[14px] font-bold text-(--text-heading)">
                You&apos;re looking back at a finished step.
              </p>
              <button
                type="button"
                onClick={handleCloseReview}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-(--action-primary) px-4 text-[14px] font-bold text-white hover:bg-(--action-primary-hover)"
              >
                <Undo2 className="size-4" aria-hidden />
                Back to current step: {STEPS[currentStepIndex]?.label}
              </button>
            </div>
          )}

          <div className={cn("relative w-full", isActivelyFillingIntake && "flex-1 min-h-0 flex flex-col overflow-hidden")}>
            <div
              className={cn(
                "transition-all duration-500 ease-in-out",
                "animate-in fade-in slide-in-from-right-4",
                isActivelyFillingIntake && "flex-1 min-h-0 flex flex-col overflow-hidden",
              )}
              key={activeIdx}
            >
              {activeIdx === 0 && (
                <IntakeStep booking={booking} isReview={isReview} />
              )}

              {activeIdx === 1 && (
                <PaymentStep booking={booking} isReview={isReview} />
              )}

              {/*
                The Doctor stop: the waiting screen while matching, the
                accepted-doctor screen once assigned (also when reviewed later).
              */}
              {activeIdx === 2 &&
                (booking.step === "finding" ? (
                  <FindingStep
                    booking={booking}
                    finding={finding}
                    isReview={isReview}
                  />
                ) : (
                  <ConfirmationStep booking={booking} isReview={isReview} />
                ))}

              {/*
              STEPS has five entries and this branch was missing, so a completed
              or cancelled booking rendered the tracker with "Booked" lit above an
              empty card — silence at the one moment the patient most needs to be
              told what happens next.
            */}
              {activeIdx === 3 && <CompletedStep booking={booking} />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
