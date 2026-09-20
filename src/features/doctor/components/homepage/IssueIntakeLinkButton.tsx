"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Link2, Loader2, TriangleAlert } from "lucide-react";
import AppButton from "@/components/primitives/AppButton";
import { CopySpan } from "@/components/primitives/CopySpan";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api";
import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  issueIntakeLink,
  type IntakeLinkIssueResponse,
} from "@/features/doctor/lib/api/intakeLink";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "issued"; link: IntakeLinkIssueResponse; url: string }
  | { kind: "error"; message: string };

interface IssueIntakeLinkButtonProps {
  bookingId: string;
}

/** Build the patient-facing intake URL from the issued token. */
function intakeUrlForToken(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/intake/${encodeURIComponent(token)}`;
}

/**
 * Doctor action that issues a one-time intake link for a booking and surfaces
 * the resulting patient URL (copyable + openable). Wired to the real
 * `POST /v1/bookings/{bookingId}/intake-link` endpoint — no mock.
 *
 * The idempotency key is held per logical issue so a retry after a transient
 * failure reuses the same key (the backend then returns the same link rather
 * than minting a second one).
 */
export function IssueIntakeLinkButton({ bookingId }: IssueIntakeLinkButtonProps) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // One key manager per mounted button => stable across retries of this issue.
  const keys = useMemo(() => createIdempotencyKeyManager(), []);

  const handleIssue = async () => {
    if (!idToken) {
      setStatus({
        kind: "error",
        message: "Your session has expired. Please sign in again.",
      });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const res = await issueIntakeLink(bookingId, idToken, keys.current());
      // Success: this logical issue is done; the next click mints a fresh key.
      keys.reset();
      setStatus({
        kind: "issued",
        link: res.data,
        url: intakeUrlForToken(res.data.token),
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not issue the intake link. Please try again.";
      setStatus({ kind: "error", message });
    }
  };

  if (status.kind === "issued") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Link2 className="size-4" />
          Intake link ready
        </div>
        <p className="text-xs text-muted-foreground">
          Share this one-time link with the patient to complete their intake form.
        </p>
        <div className="rounded-md bg-muted p-2 text-xs break-all">
          <CopySpan text={status.url} />
        </div>
        <div className="flex items-center justify-end">
          <Link href={`/intake/${encodeURIComponent(status.link.token)}`}>
            <AppButton type="button" variant="business" className="text-xs">
              <ExternalLink className="size-3.5" />
              Open intake form
            </AppButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {status.kind === "error" && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>Couldn&apos;t issue intake link</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}
      <AppButton
        type="button"
        variant="business"
        onClick={handleIssue}
        disabled={status.kind === "loading"}
        className="w-full"
      >
        {status.kind === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Issuing link...
          </>
        ) : (
          <>
            <Link2 className="size-4" />
            {status.kind === "error" ? "Retry intake link" : "Issue intake link"}
          </>
        )}
      </AppButton>
    </div>
  );
}
