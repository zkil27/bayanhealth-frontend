"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
  const router = useRouter();

  // The page renders outside every app shell, so on a phone this is the only
  // way out. A visitor who arrived cold (QR scan, shared link) has no history
  // to go back to, so they land on the home page instead.
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-y-4 p-6">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        className="-ml-1 flex size-12 items-center justify-center rounded-(--radius-md) border border-(--border-default) bg-(--surface-card) text-(--text-heading) transition-colors hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <ArrowLeft className="size-5" strokeWidth={1.75} />
      </button>

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
