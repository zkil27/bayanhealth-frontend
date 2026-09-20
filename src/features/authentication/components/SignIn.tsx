"use client";
import { AuthBox } from "./AuthBox";

export function SignIn() {
  return (
    <div className="flex w-full flex-1 flex-col justify-end sm:justify-center">
      <AuthBox type="sign in" />
    </div>
  );
}
