"use client";

import { PrescriptionVerifyView } from "@/features/prescriptions/components/PrescriptionVerifyView";

/**
 * Public prescription verification route (`/verify`).
 *
 * This page is intentionally PUBLIC — the underlying endpoint is declared
 * `security: []` (PHI-safe) and the public path is wired in the route guard
 * separately. It must render for unauthenticated visitors, so it does NOT read
 * the auth store or require a session.
 */
export default function VerifyPage() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-y-4 p-6">
      <header className="flex flex-col gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Verify a prescription
        </h1>
        <p className="text-muted-foreground">
          Enter the verification code from a prescription to confirm it was
          issued by a licensed provider on Bayan Health. No sign-in required —
          only the verification result is shown.
        </p>
      </header>

      <PrescriptionVerifyView />
    </section>
  );
}
