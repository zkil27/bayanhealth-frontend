/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signUp, CognitoError } from "@/lib/cognito";
import {
  createConfirmationPath,
  isSignUpRole,
  type SignUpRole,
} from "@/features/authentication/signup-handoff";

const STEPS = [
  "Creating your account…",
  "Almost there…",
  "Account registered — check your email for a verification code.",
];

interface Props {
  role: SignUpRole;
  email: string;
  password: string;
  onError?: (msg: string) => void;
}

export function SignUpSubmissionLoader({ role, email, password, onError }: Props) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) return;
    setSubmitted(true);

    if (!isSignUpRole(role)) {
      onError?.("Select either Patient or Doctor before creating an account.");
      return;
    }

    const run = async () => {
      const interval = setInterval(() => {
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      }, 1200);

      try {
        await signUp(email, password, role);
        clearInterval(interval);
        setStepIndex(STEPS.length - 1);
        setTimeout(() => {
          router.replace(createConfirmationPath({ email, role }));
        }, 1500);
      } catch (err) {
        clearInterval(interval);
        let msg = "Registration failed. Please try again.";
        if (err instanceof CognitoError) {
          if (err.code === "UsernameExistsException") {
            msg = "An account with this email already exists. Please sign in.";
          } else {
            msg = err.message;
          }
        }
        onError?.(msg);
      }
    };

    run();
  }, [submitted, email, password, role, router, onError]);

  if (role === "doctor") {
    return (
      <div className="p-8 text-center">
        <div className="mb-4 text-4xl">📧</div>
        <p className="text-sm text-muted-foreground">
          Your account is ready for email confirmation. After confirmation and
          sign-in, submit verification materials through the Doctor
          Verification/KYC flow.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 text-center">
      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{STEPS[stepIndex]}</p>
    </div>
  );
}
