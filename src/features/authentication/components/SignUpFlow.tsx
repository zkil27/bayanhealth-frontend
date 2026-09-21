"use client";

import { useEffect, useRef, useState } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { createConfirmationPath } from "@/features/authentication/signup-handoff";
import { brandButtonClass } from "@/features/patient/components/redesign/primitives";
import { cn } from "@/lib/utils";
import { useSignUpStore } from "../stores/useSignUpStore";
import { useSignUpWizard } from "../hooks/useSignUpWizard";
import { AnimatedSwitcher } from "./AnimatedSwitcher";
import { SignupProgress } from "./SignUpProgress";
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
    if (step === 1 && role === "doctor") {
      router.push("/signIn");
      return;
    }
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
    "Choose whether you are a patient or doctor.",
    "Enter your email and password.",
    "Profile details are saved locally on your device.",
    "Account creation submits only your email, password, and selected role.",
  ][step - 1] ?? "";

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-1 flex-col justify-between min-h-0 h-full w-full"
      >
        {/* Step Progress & Header */}
        <div className="shrink-0 flex flex-col gap-1.5 pt-0.5 pb-1">
          <SignupProgress step={step} role={role} />

          <div className="text-center pt-1 pb-0.5">
            <h2 className="text-xl sm:text-2xl font-bold text-(--text-heading) leading-tight tracking-tight">
              {stepTitle}
            </h2>
            {stepDescription && (
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-normal">
                {stepDescription}
              </p>
            )}
          </div>

          {submissionError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              {submissionError}
            </p>
          )}
        </div>

        {/* Content Area: Centered, flexible, strictly non-scrollable */}
        <div className="flex-1 flex flex-col justify-center min-h-0 overflow-hidden px-0.5 py-1">
          <AnimatedSwitcher direction={direction} key={step}>
            <div className="w-full my-auto">{renderStep()}</div>
          </AnimatedSwitcher>
        </div>

        {/* Ergonomic Thumb Zone Action Bar & Sign-In Link */}
        <div className="shrink-0 pt-3 sm:pt-3.5 border-t border-(--border-subtle) mt-auto">
          <div
            className={cn(
              "flex items-center gap-3 w-full",
              isFirstStep ? "justify-center" : "justify-between",
            )}
          >
            {!isFirstStep && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className={brandButtonClass({
                  variant: "ghost",
                  size: "sm",
                  className:
                    "h-12 px-5 text-sm font-semibold select-none active:scale-[0.98] border border-(--border-subtle)",
                })}
              >
                <ArrowLeft className="mr-1.5 size-4" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={isSubmitting || (step === 1 ? !role : !isValid)}
              className={brandButtonClass({
                size: "sm",
                className: cn(
                  "h-12 text-sm font-bold select-none active:scale-[0.98] shadow-sm",
                  isFirstStep ? "w-full" : "flex-1 sm:flex-initial px-8",
                ),
              })}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting…
                </>
              ) : isLastStep ? (
                <>
                  <Check className="mr-2 size-4" />
                  Complete
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </button>
          </div>

          <div className="mt-2 pt-0.5 text-center">
            <p className="text-xs text-(--text-muted)">
              Already have an account?{" "}
              <Link
                href="signIn"
                className="font-semibold text-(--text-heading) hover:text-(--text-link-hover) hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
