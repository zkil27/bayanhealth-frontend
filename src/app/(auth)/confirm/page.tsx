"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import AppButton from "@/components/primitives/AppButton";
import { parseSignUpRole } from "@/features/authentication/signup-handoff";
import { CognitoError, confirmSignUp, resendCode } from "@/lib/cognito";

function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email")?.trim() ?? "";
  const role = parseSignUpRole(params.get("role"));
  const invalidHandoff = !email || !role;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalidHandoff) {
      setError("This confirmation link is incomplete. Please restart signup.");
      return;
    }
    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await confirmSignUp(email, code.trim(), role);
      router.replace("/signIn?verified=1");
    } catch (err) {
      setError(err instanceof CognitoError ? err.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (invalidHandoff) return;
    setError(null);
    setInfo(null);
    try {
      await resendCode(email);
      setInfo("A new code has been sent to your email.");
    } catch (err) {
      setError(err instanceof CognitoError ? err.message : "Could not resend code.");
    }
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 w-fit rounded-full bg-primary/10 p-4 text-3xl">📧</div>
          <h2 className="text-xl font-semibold">Verify your email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium">{email || "your email"}</span>.
          </p>
        </div>

        {invalidHandoff ? (
          <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
            <p>This confirmation link is missing a valid email or account role. To protect your account setup, confirmation cannot continue.</p>
            <Link href="/signUp" className="font-medium underline">Restart signup</Link>
          </div>
        ) : (
          <>
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {info && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{info}</p>}
            <form onSubmit={handleConfirm} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={6}
                className="w-full rounded-lg border p-2 text-center text-lg tracking-widest focus:ring-2 focus:ring-primary/50 focus:outline-none"
              />
              <AppButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying…" : "Verify Email"}
              </AppButton>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive a code? <button type="button" onClick={handleResend} className="text-primary hover:underline">Resend</button>
            </p>
            {role === "doctor" && <p className="text-center text-sm text-muted-foreground">After confirmation and sign-in, submit doctor verification materials through the Doctor Verification/KYC flow.</p>}
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return <Suspense><ConfirmForm /></Suspense>;
}
