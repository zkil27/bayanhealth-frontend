"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  CircleAlert,
  Clock,
  FileText,
  Send,
  ShieldX,
  UploadCloud,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";

import {
  ALLOWED_KYC_CONTENT_TYPES,
  fetchDoctorKyc,
  isAllowedKycContentType,
  submitDoctorKyc,
  submitKycDocument,
  type DoctorKycBundle,
  type DoctorKycDocument,
  type KycDocumentType,
  type KycVerificationStatus,
} from "../../lib/api/kyc";

const ACCEPT_ATTR = ALLOWED_KYC_CONTENT_TYPES.join(",");

/** A status that allows the doctor to (re)submit for review. */
export function canSubmit(
  status: KycVerificationStatus,
  documents: DoctorKycDocument[],
): boolean {
  const editable = status === "draft" || status === "rejected";
  const hasLicense = documents.some((d) => d.documentType === "professional_license");
  return editable && hasLicense;
}

/** Map a verification status to the pill's label, icon, and token colors. */
export function statusPill(status: KycVerificationStatus): {
  label: string;
  icon: ReactNode;
  className: string;
} {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        icon: <BadgeCheck className="size-3.5" />,
        className: "bg-(--status-available-bg) text-(--status-available-fg)",
      };
    case "pending":
      return {
        label: "Pending review",
        icon: <Clock className="size-3.5" />,
        className: "bg-(--status-soon-bg) text-(--status-soon-fg)",
      };
    case "rejected":
      return {
        label: "Rejected",
        icon: <ShieldX className="size-3.5" />,
        className: "bg-(--danger-bg) text-(--danger-fg)",
      };
    case "draft":
    default:
      return {
        label: "Draft",
        icon: <FileText className="size-3.5" />,
        className: "bg-(--gray-bg) text-(--gray-fg)",
      };
  }
}

/** Present a byte count as a readable file size, e.g. "1.4 MB". */
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export const cardClass =
  "flex flex-col gap-3 rounded-[18px] border border-(--border-subtle) bg-(--surface-card) p-5 shadow-xs";

export const pillButtonClass =
  "rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover)";

/**
 * Backend-wired doctor KYC submission view (D1/D2-consistent "Verification"
 * layout — Figma DK).
 *
 * Reads `GET /v1/doctors/me/kyc` through {@link AsyncView} (loading / data /
 * error+retry). From the data branch the doctor can:
 * - upload a professional license (and optionally a supporting document) via
 *   the presign -> S3 -> confirm chain ({@link submitKycDocument});
 * - submit the profile for review ({@link submitDoctorKyc}) when the status is
 *   `draft` or `rejected` and at least one professional license is uploaded.
 *
 * All writes carry a reused idempotency key on retry. Write failures surface a
 * defined error and keep the prior state; a successful write refreshes the
 * bundle so the new status/documents are reflected.
 */
export function DoctorKycView() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  // Bumping this nonce re-runs the AsyncView fetcher after a successful write
  // so the profile status + documents reflect the change.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const reload = useCallback(() => setRefreshNonce((n) => n + 1), []);

  const fetcher = useCallback(
    () => fetchDoctorKyc(idToken ?? ""),
    // refreshNonce is intentionally part of identity so a bump refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idToken, refreshNonce],
  );

  return (
    <AsyncView<DoctorKycBundle> fetcher={fetcher} deps={[idToken, refreshNonce]}>
      {(bundle) => (
        <DoctorCredentialsSection idToken={idToken ?? ""} bundle={bundle} onChanged={reload} />
      )}
    </AsyncView>
  );
}

/**
 * The credentials half of the doctor's profile: licence upload, supporting
 * documents, and submission for admin review.
 *
 * Exported because it is now a section of the Profile page rather than a page of
 * its own. It renders no page header — the profile page owns that — so the
 * verification status is stated once, where the doctor is already looking.
 */
export function DoctorCredentialsSection({
  idToken,
  bundle,
  onChanged,
}: {
  idToken: string;
  bundle: DoctorKycBundle;
  onChanged: () => void;
}) {
  const { profile, documents } = bundle;
  const pill = statusPill(profile.verificationStatus);
  const locked = profile.verificationStatus === "pending" || profile.verificationStatus === "approved";

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // One idempotency key per logical submit, reused on retry until it succeeds.
  const submitKeyRef = useRef(createIdempotencyKeyManager());

  const submitEnabled = canSubmit(profile.verificationStatus, documents) && !submitting;

  async function onSubmitForReview() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await submitDoctorKyc(idToken, submitKeyRef.current.current());
      submitKeyRef.current.reset();
      onChanged();
    } catch {
      setSubmitError("Could not submit for review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div data-slot="doctor-kyc" className="flex w-full flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 className="text-lg font-bold text-(--text-heading)">Credentials</h2>
          <p className="text-[15px] text-(--text-muted)">
            Upload your professional license and submit your profile for review.
            You can practice on-demand consultations once an admin approves your
            credentials.
          </p>
        </div>
        <Badge
          data-slot="kyc-status"
          className={cn(
            "gap-1.5 rounded-full border-0 px-3.5 py-1.5 text-sm font-bold",
            pill.className,
          )}
        >
          {pill.icon}
          {pill.label}
        </Badge>
      </header>

      {profile.verificationStatus === "rejected" && profile.rejectionReason ? (
        <p
          role="alert"
          data-slot="kyc-rejection-reason"
          className="flex items-start gap-2 rounded-[14px] border border-(--danger-border)/30 bg-(--danger-bg) p-3 text-sm text-(--danger-fg)"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">Rejected: </span>
            {profile.rejectionReason}
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KycDocumentUpload
          idToken={idToken}
          documentType="professional_license"
          title="Professional license"
          description="A clear photo or PDF of your professional license."
          disabled={locked}
          onUploaded={onChanged}
        />

        <KycDocumentUpload
          idToken={idToken}
          documentType="supporting_document"
          title="Supporting document"
          optional
          description="E.g. a board certificate or another government ID."
          disabled={locked}
          onUploaded={onChanged}
        />
      </div>

      <section className={cardClass}>
        <UploadedDocumentsList documents={documents} />

        <div className="flex flex-col gap-3 border-t border-(--border-subtle) pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-bold text-(--text-heading)">
              Submit for review
            </h2>
            <p className="text-[15px] text-(--text-muted)">
              {profile.verificationStatus === "pending"
                ? "Your profile is awaiting admin review."
                : profile.verificationStatus === "approved"
                  ? "Your credentials are approved."
                  : canSubmit(profile.verificationStatus, documents)
                    ? "License uploaded — ready to submit. An admin will review it."
                    : "Upload a professional license to enable submission."}
            </p>
          </div>
          <Button
            type="button"
            onClick={onSubmitForReview}
            disabled={!submitEnabled}
            className={cn(pillButtonClass, "shrink-0 self-start md:self-center")}
          >
            {submitting ? (
              <>
                <Spinner /> Submitting…
              </>
            ) : (
              <>
                <Send className="size-4" /> Submit for review
              </>
            )}
          </Button>
        </div>
        {submitError ? (
          <p role="alert" className="flex items-center gap-2 text-sm text-(--danger-fg)">
            <CircleAlert className="size-4" />
            {submitError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function KycDocumentUpload({
  idToken,
  documentType,
  title,
  optional,
  description,
  disabled,
  onUploaded,
}: {
  idToken: string;
  documentType: KycDocumentType;
  title: string;
  optional?: boolean;
  description: string;
  disabled: boolean;
  onUploaded: () => void;
}) {
  const [selected, setSelected] = useState<File | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // One key per logical upload step, reused on retry until the upload succeeds.
  const presignKeyRef = useRef(createIdempotencyKeyManager());
  const confirmKeyRef = useRef(createIdempotencyKeyManager());

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setTypeError(null);
    setUploadError(null);
    if (file && !isAllowedKycContentType(file.type)) {
      setSelected(null);
      setTypeError("Unsupported file type. Allowed: JPEG, PNG, WebP, or PDF.");
      return;
    }
    setSelected(file);
  }

  async function onUpload() {
    if (!selected || !isAllowedKycContentType(selected.type)) return;
    setUploadError(null);
    setUploading(true);
    try {
      await submitKycDocument({
        idToken,
        file: selected,
        contentType: selected.type,
        documentType,
        presignIdempotencyKey: presignKeyRef.current.current(),
        confirmIdempotencyKey: confirmKeyRef.current.current(),
      });
      // New logical upload next time.
      presignKeyRef.current.reset();
      confirmKeyRef.current.reset();
      setSelected(null);
      onUploaded();
    } catch {
      setUploadError("The upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section
      data-slot="kyc-document-upload"
      data-document-type={documentType}
      className={cardClass}
    >
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-(--text-heading)" />
        <span className="text-[15px] font-bold text-(--text-heading)">{title}</span>
        {optional ? (
          <span className="text-sm font-medium text-(--text-subtle)">(optional)</span>
        ) : null}
      </div>
      <p className="text-[15px] text-(--text-muted)">{description}</p>

      <label
        className={cn(
          "flex flex-col items-center gap-2 rounded-[14px] border border-dashed p-4.5 text-center transition-colors",
          selected
            ? "border-(--teal-300) bg-(--surface-accent-soft)"
            : "border-(--border-strong) bg-(--surface-warm-soft) hover:bg-(--surface-warm)",
          disabled || uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
      >
        {selected ? (
          <div className="flex w-full items-center gap-3 text-left">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--surface-card)">
              <FileText className="size-5.5 text-(--status-available-fg)" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-bold text-(--text-heading)">
                {selected.name}
              </span>
              <span className="text-sm text-(--text-muted)">
                {formatFileSize(selected.size)} · ready to upload
              </span>
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="size-6 text-(--text-muted)" />
            <span className="text-[15px] text-(--text-muted)">
              JPEG, PNG, WebP, or PDF · click to choose
            </span>
          </>
        )}
        <input
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={onPick}
          aria-label={`Choose ${title}`}
          disabled={disabled || uploading}
        />
      </label>

      {typeError ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-(--danger-fg)">
          <CircleAlert className="size-4" />
          {typeError}
        </p>
      ) : null}

      {selected ? (
        <Button
          type="button"
          onClick={onUpload}
          disabled={disabled || uploading}
          className={cn(pillButtonClass, "self-start")}
        >
          {uploading ? (
            <>
              <Spinner /> Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="size-4" /> Upload
            </>
          )}
        </Button>
      ) : null}

      {uploadError ? (
        <div role="alert" className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm text-(--danger-fg)">
            <CircleAlert className="size-4" />
            {uploadError}
          </p>
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={onUpload}
            disabled={!selected || uploading}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function UploadedDocumentsList({ documents }: { documents: DoctorKycDocument[] }) {
  return (
    <div data-slot="kyc-documents" className="flex flex-col gap-2">
      <h2 className="text-[15px] font-bold text-(--text-heading)">Uploaded documents</h2>
      {documents.length === 0 ? (
        <p data-slot="kyc-documents-empty" className="text-sm text-(--text-muted)">
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.documentId}
              data-slot="kyc-document"
              className="flex items-center justify-between gap-4 rounded-[14px] border border-(--border-subtle) px-3.5 py-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-(--text-muted)" />
                <span className="truncate font-semibold text-(--text-heading)">
                  {formatDocumentType(doc.documentType)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-(--text-subtle)">
                {formatUploadedAt(doc.uploadedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Present the contract `documentType` enum as a readable label. */
function formatDocumentType(documentType: KycDocumentType): string {
  return documentType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Present an ISO timestamp as a readable date-time, falling back gracefully. */
function formatUploadedAt(uploadedAt: string): string {
  const date = new Date(uploadedAt);
  if (Number.isNaN(date.getTime())) return uploadedAt;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default DoctorKycView;
