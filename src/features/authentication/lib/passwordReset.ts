/**
 * Pure rules for the Forgot Password flow, kept apart from the screen so the
 * wording is unit-tested.
 */

import { CognitoError } from "@/lib/cognito";

export type ResetStep = "request" | "confirm";

/** The same rules sign-up enforces (`credentialsSchema`), as a checklist. */
export const PASSWORD_RULES: readonly { id: string; label: string; test: (value: string) => boolean }[] = [
  { id: "length", label: "At least 10 characters", test: (value) => value.length >= 10 },
  { id: "upper", label: "An uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { id: "lower", label: "A lowercase letter", test: (value) => /[a-z]/.test(value) },
  { id: "number", label: "A number", test: (value) => /[0-9]/.test(value) },
  { id: "special", label: "A symbol, like ! or #", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export function passwordMeetsRules(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

/**
 * What to tell the person for a failed step. The request step never reveals
 * whether an email has an account: an unknown address reads exactly like a
 * sent code (`null` means "treat as sent").
 */
export function resetErrorMessage(step: ResetStep, error: unknown): string | null {
  const code = error instanceof CognitoError ? error.code : undefined;
  if (step === "request") {
    if (code === "UserNotFoundException") return null;
    if (code === "LimitExceededException" || code === "TooManyRequestsException") {
      return "Too many attempts. Wait a few minutes, then try again.";
    }
    if (code === "InvalidParameterException") {
      return "We can't reset this account by email. Contact BayanHealth support for help.";
    }
    return "We couldn't send a code just now. Check your connection and try again.";
  }
  switch (code) {
    case "CodeMismatchException":
      return "That code is not right. Check the email and enter the 6-digit code again.";
    case "ExpiredCodeException":
      return "That code has expired. Send a new code and use the newest one.";
    case "InvalidPasswordException":
      return "That password doesn't meet the rules below. Choose a different one.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Wait a few minutes, then try again.";
    case "UserNotFoundException":
      return "That code is not right. Check the email and enter the 6-digit code again.";
    default:
      return "We couldn't change your password just now. Try again in a moment.";
  }
}
