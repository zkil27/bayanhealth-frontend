"use client";

import { useEffect, useRef, useState } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter } from "next/navigation";

import { createConfirmationPath } from "@/features/authentication/signup-handoff";
import { brandButtonClass } from "@/features/patient/components/redesign/primitives";
import { useSignUpStore } from "../stores/useSignUpStore";
import { useSignUpWizard } from "../hooks/useSignUpWizard";
import { AnimatedSwitcher } from "./AnimatedSwitcher";
import { SignUpConfirm } from "./forms/SignUpConfirm";
import { SignUpCredentials } from "./forms/SignUpCredentials";
import { SignUpProfile } from "./forms/SignUpProfile";
import { SignUpRoleSelection } from "./forms/SignUpRoleSelection";

export function SignUpFlow() {
  const router = useRouter();
  const {
    step,
    role,
    isSubmitting,
    methods,
    handleNext,
    handleBack,
    isFirstStep,
    isLastStep,
    isValid,
  } = useSignUpWizard();
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const prevStepRef = useRef(step);

  useEffect(() => {
    return () => useSignUpStore.getState().resetSignUp();
  }, []);

  useEffect(() => {
    setDirection(prevStepRef.current < step ? "right" : "left");
    prevStepRef.current = step;
  }, [step]);

  const handleContinue = async () => {
    setSubmissionError(null);
    try {
      const handoff = await handleNext();
      if (handoff) {
        router.replace(createConfirmationPath(handoff));
      }
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Registration failed. Please try again.",
      );
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <SignUpRoleSelection />;
      case 2:
        return <SignUpCredentials isSubmitting={isSubmitting} />;
      case 3:
        return role ? <SignUpProfile role={role} isSubmitting={isSubmitting} /> : null;
      case 4:
        return role ? <SignUpConfirm role={role} isSubmitting={isSubmitting} /> : null;
      default:
        return null;
    }
  };

  const stepTitle = ["Choose Your Role", "Create Account", "Complete Profile", "Confirm & Submit"][step - 1] ?? "";
  const stepDescription = [
    "Select whether you are a patient or doctor.",
    "Create your login credentials.",
    "Profile details remain local and are not submitted with account creation.",
    "Account creation submits only your email, password, and selected role.",
  ][step - 1] ?? "";

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={(event) => event.preventDefault()}
        className="flex scroll-fade-x flex-col gap-6 p-1"
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold">{stepTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{stepDescription}</p>
        </div>

        {submissionError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submissionError}
          </p>
        )}

        <AnimatedSwitcher direction={direction} key={step}>
          <div className="relative min-h-100 w-full">{renderStep()}</div>
        </AnimatedSwitcher>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirstStep || isSubmitting}
            className={brandButtonClass({ variant: "ghost", size: "sm" })}
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting || !isValid}
            className={brandButtonClass({ size: "sm" })}
          >
            {isSubmitting ? (
              <><span className="animate-spin">⏳</span>Submitting...</>
            ) : isLastStep ? "Complete ✓" : "Next →"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
