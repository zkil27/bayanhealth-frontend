"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  ShieldCheckIcon,
  XCircle,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchKycApplications,
  reviewKycApplication,
  KYC_REJECTION_REASON_MAX,
  type KycApplication,
  type KycDecision,
} from "@/features/admin/lib/api/adminData";

/**
 * Admin KYC supervision page (Slice 8, task 14.1).
 *
 * Wires the page to the contract-frozen `GET /v1/admin/kyc-applications`
 * endpoint through {@link AsyncView}: a defined loading state while pending,
 * every returned queue entry within 3s (Requirement 13.3), a defined empty state
 * on zero applications (Requirement 13.6), and a defined error state with retry
 * on failure or the 10s timeout with no partial/cached data (Requirement 13.5).
 *
 * Applications in `pending` carry inline Approve / Reject controls wired to
 * `POST /v1/admin/kyc-applications/{doctorId}/review`. A successful review bumps
 * a refresh nonce so the queue refetches and reflects the new status.
 */

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Draft", variant: "outline" },
  pending: { label: "Pending review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status || "Unknown", variant: "outline" as const };
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function AdminKycPage() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  // Bumping this nonce re-runs the fetcher so the queue reflects a review
  // outcome without a full navigation.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const reload = useCallback(() => setRefreshNonce((n) => n + 1), []);

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">KYC Supervision</h1>
        <p className="text-sm text-muted-foreground">
          Oversee doctor credentialing reviews and verification outcomes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            Doctor credentialing applications and their verification status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AsyncView<KycApplication[]>
            fetcher={() => fetchKycApplications(idToken ?? "")}
            deps={[idToken, refreshNonce]}
            isEmpty={(apps) => apps.length === 0}
            empty={<AdminKycEmpty />}
          >
            {(applications) => (
              <Table data-slot="admin-kyc-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>License #</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => {
                    const status = statusMeta(app.verificationStatus);
                    return (
                      <TableRow key={app.doctorId} data-slot="admin-kyc-row">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {app.fullName || app.email}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {app.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{app.specialty || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {app.licenseNumber || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(app.submittedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {app.reviewedBy || "Unassigned"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          {app.verificationStatus === "pending" ? (
                            <KycReviewControls
                              doctorId={app.doctorId}
                              idToken={idToken}
                              onReviewed={reload}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No action needed
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </AsyncView>
        </CardContent>
      </Card>
    </section>
  );
}

interface KycReviewControlsProps {
  doctorId: string;
  idToken: string | null;
  /** Called after a successful review so the parent can refresh the queue. */
  onReviewed: () => void;
}

/**
 * Per-application Approve / Reject controls for a `pending` KYC application.
 *
 * Reject reveals an inline, labelled rejection-reason textarea (no
 * `window.prompt`) so the reason stays accessible and optional. The idempotency
 * key for each logical decision is held per control instance, so retrying the
 * same decision after a transient failure reuses the key; switching decision
 * mints a fresh one. Errors render inline without unmounting the row.
 */
function KycReviewControls({ doctorId, idToken, onReviewed }: KycReviewControlsProps) {
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<KycDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  // One key manager per control => stable across retries of the same decision.
  const approveKeys = useMemo(() => createIdempotencyKeyManager(), []);
  const rejectKeys = useMemo(() => createIdempotencyKeyManager(), []);

  const reasonInputId = `kyc-reject-reason-${doctorId}`;
  const busy = pending !== null;

  async function submit(decision: KycDecision) {
    if (!idToken) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    const keys = decision === "approved" ? approveKeys : rejectKeys;
    setPending(decision);
    setError(null);
    try {
      await reviewKycApplication(
        idToken,
        doctorId,
        decision,
        decision === "rejected" ? reason : undefined,
        keys.current(),
      );
      // Success: this logical decision is done; mint a fresh key next time.
      keys.reset();
      onReviewed();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not submit the review. Please try again.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2" data-slot="admin-kyc-review">
      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <CircleAlert className="size-3.5" />
          {error}
        </p>
      )}

      {mode === "rejecting" && (
        <div className="flex w-full max-w-xs flex-col items-stretch gap-1 text-left">
          <Label htmlFor={reasonInputId} className="text-xs font-medium">
            Rejection reason (optional)
          </Label>
          <Textarea
            id={reasonInputId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={KYC_REJECTION_REASON_MAX}
            rows={2}
            disabled={busy}
            placeholder="Why is this application being rejected?"
            className="text-sm"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {mode === "idle" ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => submit("approved")}
              disabled={busy}
            >
              {pending === "approved" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setError(null);
                setMode("rejecting");
              }}
              disabled={busy}
            >
              <XCircle className="size-4" />
              Reject
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => submit("rejected")}
              disabled={busy}
            >
              {pending === "rejected" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              Confirm reject
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setMode("idle");
                setReason("");
                setError(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function AdminKycEmpty() {
  return (
    <Empty data-slot="admin-kyc-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldCheckIcon />
        </EmptyMedia>
        <EmptyTitle>No applications in the queue</EmptyTitle>
        <EmptyDescription>
          There are no doctor KYC applications to review right now.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
