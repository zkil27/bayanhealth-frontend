"use client";
import { AuthBox } from "./AuthBox";

export function SignUp() {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center min-h-0">
      <AuthBox type="sign up" />
    </div>
  );
}
