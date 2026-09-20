"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, ShieldX, TriangleAlert } from "lucide-react";

import { ApiError } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  verifyPrescription,
  type PrescriptionVerificationResult,
} from "@/features/prescriptions/lib/api/verify";

/**
 * Public prescription verification UI.
 *
 * Calls the PHI-safe public endpoint via {@link verifyPrescription} (no auth)
 * and renders a defined result state. All local state — no session, no PHI
 * beyond what the endpoint returns.
 */
type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "result"; result: PrescriptionVerificationResult }
  | { status: "error"; message: string };

/** Format an ISO timestamp for display, falling back to the raw value. */
function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ResultPanel({
  result,
}: {
  result: PrescriptionVerificationResult;
}) {
  if (!result.verified) {
    return (
      <Alert variant="destructive">
        <ShieldX />
        <AlertTitle>Not verified</AlertTitle>
        <AlertDescription>
          We could not verify a prescription for this code. Double-check the
          code and try again, or contact the issuing clinic.
        </AlertDescription>
      </Alert>
    );
  }

  const issuedAt = formatDate(result.issuedAt);
  const validUntil = formatDate(result.validUntil);

  return (
    <Alert>
      <CheckCircle2 />
      <AlertTitle>Valid prescription</AlertTitle>
      <AlertDescription>
        <span>This prescription is verified as authentic.</span>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {result.issuerName ? (
            <>
              <dt className="text-muted-foreground">Issued by</dt>
              <dd className="font-medium">{result.issuerName}</dd>
            </>
          ) : null}
          {issuedAt ? (
            <>
              <dt className="text-muted-foreground">Issued at</dt>
              <dd className="font-medium">{issuedAt}</dd>
            </>
          ) : null}
          {validUntil ? (
            <>
              <dt className="text-muted-foreground">Valid until</dt>
              <dd className="font-medium">{validUntil}</dd>
            </>
          ) : null}
        </dl>
      </AlertDescription>
    </Alert>
  );
}

export function PrescriptionVerifyView() {
  const [code, setCode] = useState("");
  const [view, setView] = useState<ViewState>({ status: "idle" });

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = code.trim();
      if (trimmed.length === 0 || view.status === "loading") {
        return;
      }

      setView({ status: "loading" });
      try {
        const result = await verifyPrescription(trimmed);
        setView({ status: "result", result });
      } catch (err) {
        // Keep the entered code so the visitor can correct and retry.
        const message =
          err instanceof ApiError
            ? err.message
            : "Something went wrong while verifying. Please try again.";
        setView({ status: "error", message });
      }
    },
    [code, view.status],
  );

  const isLoading = view.status === "loading";

  return (
    <div className="flex flex-col gap-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-y-1.5">
          <Label htmlFor="verification-code">Verification code</Label>
          <Textarea
            id="verification-code"
            name="verificationCode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste the prescription verification code"
            rows={3}
            disabled={isLoading}
            aria-describedby="verification-code-help"
          />
          <p
            id="verification-code-help"
            className="text-xs text-muted-foreground"
          >
            The code is printed on the prescription or its QR link.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isLoading || code.trim().length === 0}
          className="self-start"
        >
          {isLoading ? (
            <>
              <Spinner />
              Verifying
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </form>

      {view.status === "result" ? <ResultPanel result={view.result} /> : null}

      {view.status === "error" ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Could not verify</AlertTitle>
          <AlertDescription>{view.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
