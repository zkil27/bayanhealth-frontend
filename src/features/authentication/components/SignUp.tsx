"use client";
import { SignupProgress } from "./SignUpProgress";
import { AuthBox } from "./AuthBox";
import {
  useSignUpRole,
  useSignUpStep,
} from "../stores/useSignUpStore";

export function SignUp() {
  const step = useSignUpStep();
  const role = useSignUpRole();

  return (
    <div className="mx-auto flex w-full max-w-105 flex-1 flex-col gap-y-4 p-4 lg:justify-center">
      <SignupProgress step={step} role={role} />
      <AuthBox type="sign up" />
    </div>
  );
}
