"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  FileText,
  Lock,
  PenLine,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { AsyncView } from "@/components/async-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createIdempotencyKeyManager } from "@/lib/idempotency";
import { useAuthStore } from "@/stores/useAuthStore";
import { SignaturePadDialog } from "@/features/consultation/components/postConsultation/SignatureField";
import { SignaturePreview } from "@/features/consultation/components/postConsultation/SignaturePreview";

import {
  cardClass,
  pillButtonClass,
  statusPill,
  DoctorCredentialsSection,
} from "../kyc/DoctorKycView";
import {
  fetchDoctorKyc,
  updateDoctorProfile,
  type DoctorKycBundle,
  type DoctorProfile,
  type DoctorProfileUpdate,
  type DoctorSignaturePoint,
} from "../../lib/api/kyc";

const BIO_MAX = 1000;

function getDoctorInitials(name?: string): string {
  if (!name) return "MD";
  const clean = name.replace(/^Dr\.\s*/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Doctor Identity & Status Cockpit (Left Column).
 *
 * Provides persistent situational awareness of the clinician's verification
 * health, PRC license, consultation signature status, and quick navigation.
 */
function DoctorIdentitySummaryCard({
  profile,
  activeTab,
  onSelectTab,
}: {
  profile: DoctorProfile;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}) {
  const pill = statusPill(profile.verificationStatus);
  const isApproved = profile.verificationStatus === "approved";
  const initials = getDoctorInitials(profile.fullName);

  return (
    <div className={cn(cardClass, "gap-4")}>
      {/* Clinician Profile Avatar & Name */}
      <div className="flex items-start gap-3.5">
        <div className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-(--surface-nav) font-display text-base font-bold text-white shadow-xs">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate font-display text-base font-bold text-(--text-heading)">
              {profile.fullName || "Doctor"}
            </h2>
            {isApproved ? (
              <BadgeCheck className="size-4 shrink-0 text-(--status-available-fg)" />
            ) : null}
          </div>
          <span className="truncate text-xs font-medium text-(--text-muted)">
            {profile.specialty || "General Practice"}
          </span>
          <div className="mt-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                pill.className,
              )}
            >
              {pill.icon}
              {pill.label}
            </span>
          </div>
        </div>
      </div>

      {/* Clinical Credentials Snapshot */}
      <div className="flex flex-col gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-warm-soft) p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-(--text-muted)">PRC License</span>
          <span className="font-mono font-semibold text-(--text-heading)">
            {profile.licenseNumber || "—"}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-(--border-subtle) pt-2">
          <span className="text-(--text-muted)">Consult Signature</span>
          {profile.signature ? (
            <span className="inline-flex items-center gap-1 font-medium text-(--status-available-fg)">
              <CheckCircle2 className="size-3.5" /> On File
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSelectTab("signature")}
              className="inline-flex items-center gap-1 font-semibold text-(--status-soon-fg) hover:underline"
            >
              <AlertCircle className="size-3.5" /> Setup needed
            </button>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-(--border-subtle) pt-2">
          <span className="text-(--text-muted)">On-Demand Consults</span>
          <span
            className={cn(
              "font-medium",
              profile.onDemandAvailable
                ? "text-(--status-available-fg)"
                : "text-(--text-muted)",
            )}
          >
            {profile.onDemandAvailable ? "Available" : "Offline"}
          </span>
        </div>
      </div>

      {/* Fast Navigation Shortcut List */}
      <nav aria-label="Profile navigation" className="flex flex-col gap-1 border-t border-(--border-subtle) pt-3">
        <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-(--text-subtle)">
          Workspace Sections
        </span>
        <button
          type="button"
          onClick={() => onSelectTab("details")}
          className={cn(
            "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-left",
            activeTab === "details"
              ? "bg-(--surface-nav) text-white font-semibold"
              : "text-(--text-body) hover:bg-(--surface-warm-soft)",
          )}
        >
          <span className="flex items-center gap-2">
            <UserRound className="size-3.5" /> Practice Details
          </span>
          <span className="text-[11px] opacity-75">Edit</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("signature")}
          className={cn(
            "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-left",
            activeTab === "signature"
              ? "bg-(--surface-nav) text-white font-semibold"
              : "text-(--text-body) hover:bg-(--surface-warm-soft)",
          )}
        >
          <span className="flex items-center gap-2">
            <PenLine className="size-3.5" /> Clinical Signature
          </span>
          <span className="text-[11px] opacity-75">
            {profile.signature ? "Active" : "Pending"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("credentials")}
          className={cn(
            "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-left",
            activeTab === "credentials"
              ? "bg-(--surface-nav) text-white font-semibold"
              : "text-(--text-body) hover:bg-(--surface-warm-soft)",
          )}
        >
          <span className="flex items-center gap-2">
            <FileText className="size-3.5" /> Credentials &amp; KYC
          </span>
          <span className="text-[11px] opacity-75">{pill.label}</span>
        </button>
      </nav>

      {/* Clinical Guidance Footnote */}
      <div className="rounded-xl border border-(--border-subtle) bg-(--surface-warm-soft)/60 p-3 text-[11px] leading-relaxed text-(--text-subtle)">
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-(--action-primary)" />
          <span>
            Verified credentials are kept on file in compliance with PRC &amp; DOH Philippine Telehealth practice guidelines.
          </span>
        </p>
      </div>
    </div>
  );
}

/**
 * The doctor's own Profile & Clinical Cockpit.
 */
export function DoctorProfileView() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("details");
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
        <div data-slot="doctor-profile" className="flex w-full flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-(--text-heading) md:text-3xl">
              Profile &amp; Credentials
            </h1>
            <p className="text-[15px] text-(--text-muted)">
              Manage your clinical practitioner details, digital prescription signature, and credentialing documents.
            </p>
          </header>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Left Master Column: Physician Cockpit Sidebar */}
            <aside className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-6">
              <DoctorIdentitySummaryCard
                profile={bundle.profile}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
              />
            </aside>

            {/* Right Detail Column: Focused Workspaces */}
            <main className="flex flex-col gap-4 lg:col-span-8 xl:col-span-8">
              {/* Clinical Segmented Tab Bar */}
              <div
                role="tablist"
                aria-label="Profile Workspaces"
                className="grid w-full grid-cols-3 gap-1.5 rounded-2xl border border-(--border-subtle) bg-(--surface-warm-soft) p-1.5 shadow-2xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "details"}
                  onClick={() => setActiveTab("details")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold transition-all select-none",
                    activeTab === "details"
                      ? "bg-(--surface-card) text-(--text-heading) shadow-sm border border-(--border-subtle)"
                      : "text-(--text-muted) hover:text-(--text-heading) hover:bg-black/[0.02]",
                  )}
                >
                  <UserRound className={cn("size-4 shrink-0", activeTab === "details" ? "text-(--surface-nav)" : "text-(--text-muted)")} />
                  <span>Practice Info</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "signature"}
                  onClick={() => setActiveTab("signature")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold transition-all select-none",
                    activeTab === "signature"
                      ? "bg-(--surface-card) text-(--text-heading) shadow-sm border border-(--border-subtle)"
                      : "text-(--text-muted) hover:text-(--text-heading) hover:bg-black/[0.02]",
                  )}
                >
                  <PenLine className={cn("size-4 shrink-0", activeTab === "signature" ? "text-(--surface-nav)" : "text-(--text-muted)")} />
                  <span>Signature</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "credentials"}
                  onClick={() => setActiveTab("credentials")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 sm:px-3 text-xs sm:text-sm font-semibold transition-all select-none",
                    activeTab === "credentials"
                      ? "bg-(--surface-card) text-(--text-heading) shadow-sm border border-(--border-subtle)"
                      : "text-(--text-muted) hover:text-(--text-heading) hover:bg-black/[0.02]",
                  )}
                >
                  <FileText className={cn("size-4 shrink-0", activeTab === "credentials" ? "text-(--surface-nav)" : "text-(--text-muted)")} />
                  <span>Credentials</span>
                </button>
              </div>

              {/* Workspace Panels (Preserving Draft Form State) */}
              <div className={activeTab === "details" ? "block" : "hidden"}>
                <ProfileDetailsSection
                  idToken={idToken ?? ""}
                  profile={bundle.profile}
                  onSaved={reload}
                />
              </div>

              <div className={activeTab === "signature" ? "block" : "hidden"}>
                <SignatureSection
                  idToken={idToken ?? ""}
                  profile={bundle.profile}
                  onSaved={reload}
                />
              </div>

              <div className={activeTab === "credentials" ? "block" : "hidden"}>
                <section className={cardClass}>
                  <DoctorCredentialsSection
                    idToken={idToken ?? ""}
                    bundle={bundle}
                    onChanged={reload}
                  />
                </section>
              </div>
            </main>
          </div>
        </div>
      )}
    </AsyncView>
  );
}

/**
 * Build the upsert body for a profile save.
 *
 * `PUT /v1/doctors/me/profile` is an upsert, not a patch: `fullName` and
 * `licenseNumber` are required on every call even when the doctor is only
 * editing their bio. Echoing the current values keeps a partial edit from
 * blanking the identity fields, and the server pins them to the reviewed values
 * once verification has passed `draft`/`rejected` anyway.
 */
function toUpsertBody(profile: DoctorProfile, changes: Partial<DoctorProfileUpdate>): DoctorProfileUpdate {
  return {
    fullName: profile.fullName,
    licenseNumber: profile.licenseNumber,
    ...(profile.specialty ? { specialty: profile.specialty } : {}),
    ...(profile.phoneNumber ? { phoneNumber: profile.phoneNumber } : {}),
    ...(profile.onDemandAvailable !== undefined
      ? { onDemandAvailable: profile.onDemandAvailable }
      : {}),
    ...(profile.bio ? { bio: profile.bio } : {}),
    ...changes,
  };
}

function ProfileDetailsSection({
  idToken,
  profile,
  onSaved,
}: {
  idToken: string;
  profile: DoctorProfile;
  onSaved: () => void;
}) {
  const identityLocked =
    profile.verificationStatus === "pending" || profile.verificationStatus === "approved";

  const [fullName, setFullName] = useState(profile.fullName);
  const [licenseNumber, setLicenseNumber] = useState(profile.licenseNumber);
  const [specialty, setSpecialty] = useState(profile.specialty ?? "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber ?? "");
  const [onDemandAvailable, setOnDemandAvailable] = useState(profile.onDemandAvailable ?? false);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const keyRef = useRef(createIdempotencyKeyManager());

  const dirty =
    fullName !== profile.fullName ||
    licenseNumber !== profile.licenseNumber ||
    specialty !== (profile.specialty ?? "") ||
    phoneNumber !== (profile.phoneNumber ?? "") ||
    onDemandAvailable !== (profile.onDemandAvailable ?? false) ||
    bio !== (profile.bio ?? "");

  async function save() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateDoctorProfile(
        idToken,
        {
          fullName: identityLocked ? profile.fullName : fullName.trim(),
          licenseNumber: identityLocked ? profile.licenseNumber : licenseNumber.trim(),
          specialty: specialty.trim(),
          phoneNumber: phoneNumber.trim(),
          onDemandAvailable,
          // An empty string is meaningful here: it clears a stored bio, which
          // omitting the field would not.
          bio: bio.trim(),
        },
        keyRef.current.current(),
      );
      keyRef.current.reset();
      setSaved(true);
      onSaved();
    } catch {
      setError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section data-slot="profile-details" className={cardClass}>
      <div className="flex flex-col gap-1 border-b border-(--border-subtle) pb-3">
        <div className="flex items-center gap-2">
          <UserRound className="size-5 text-(--text-heading)" />
          <h2 className="text-base font-bold text-(--text-heading)">Practice &amp; Personal Details</h2>
        </div>
        <p className="text-xs text-(--text-muted)">
          Public information shown on your clinical profile and booking details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          value={fullName}
          onChange={setFullName}
          disabled={identityLocked || saving}
          locked={identityLocked}
          lockHint="Reviewed as part of your credentials."
          maxLength={200}
        />
        <Field
          label="License number"
          value={licenseNumber}
          onChange={setLicenseNumber}
          disabled={identityLocked || saving}
          locked={identityLocked}
          lockHint="Reviewed as part of your credentials."
          maxLength={100}
        />
        <Field
          label="Specialty"
          value={specialty}
          onChange={setSpecialty}
          disabled={saving}
          maxLength={120}
          placeholder="e.g. Family Medicine"
        />
        <Field
          label="Phone number"
          value={phoneNumber}
          onChange={setPhoneNumber}
          disabled={saving}
          maxLength={40}
          placeholder="e.g. +63 917 000 0000"
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-(--text-body)">
          Bio{" "}
          <span className="font-normal text-(--text-subtle)">
            — shown on your profile ({bio.length}/{BIO_MAX})
          </span>
        </span>
        <Textarea
          value={bio}
          rows={4}
          maxLength={BIO_MAX}
          disabled={saving}
          placeholder="A few lines about your practice, training, and the patients you see."
          className="rounded-[12px]"
          onChange={(event) => setBio(event.target.value)}
        />
      </label>

      <label className="flex items-center gap-3 rounded-[14px] border border-(--border-subtle) px-3.5 py-3">
        <Switch
          checked={onDemandAvailable}
          disabled={saving}
          onCheckedChange={(value) => setOnDemandAvailable(Boolean(value))}
        />
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-bold text-(--text-heading)">
            Accept on-demand consultations
          </span>
          <span className="text-sm text-(--text-muted)">
            Patients waiting for the next available doctor can be matched to you.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className={cn(pillButtonClass, "shrink-0")}
        >
          {saving ? <Spinner /> : <Save className="size-4" />} Save changes
        </Button>
        {saved && !dirty ? (
          <span role="status" className="text-sm text-(--status-available-fg)">
            Saved.
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-(--danger-fg)">
          <CircleAlert className="size-4" /> {error}
        </p>
      ) : null}
    </section>
  );
}

/**
 * The signature specimen the consultation workspace signs with.
 *
 * This is the fix for the worst part of the post-consult flow: a doctor used to
 * draw their signature by hand on a 500x200 canvas for every single document, on
 * every consultation, with the canvas opening over the document they were
 * supposed to be reading. Drawn once here, signing a document becomes a
 * confirmation.
 *
 * It is deliberately labelled as a convenience rather than as an identity
 * credential. The evidentiary signature is still the one committed with each
 * artifact finalization, which the server stamps with its own digest and
 * timestamp at signing time.
 */
function SignatureSection({
  idToken,
  profile,
  onSaved,
}: {
  idToken: string;
  profile: DoctorProfile;
  onSaved: () => void;
}) {
  const [strokes, setStrokes] = useState<DoctorSignaturePoint[][]>([]);
  const [signerName, setSignerName] = useState(profile.signature?.signerName ?? profile.fullName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef(createIdempotencyKeyManager());

  async function commit(signature: DoctorProfileUpdate["signature"]) {
    setError(null);
    setSaving(true);
    try {
      await updateDoctorProfile(idToken, toUpsertBody(profile, { signature }), keyRef.current.current());
      keyRef.current.reset();
      setStrokes([]);
      onSaved();
    } catch {
      setError("Could not save your signature. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section data-slot="profile-signature" className={cardClass}>
      <div className="flex flex-col gap-1 border-b border-(--border-subtle) pb-3">
        <div className="flex items-center gap-2">
          <PenLine className="size-5 text-(--text-heading)" />
          <h2 className="text-base font-bold text-(--text-heading)">Clinical Digital Signature</h2>
        </div>
        <p className="text-xs text-(--text-muted)">
          Draw your signature specimen once. Signing a prescription, medical certificate, or treatment plan
          then becomes a single confirmation instead of redrawing every time.
        </p>
      </div>

      {profile.signature ? (
        <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-(--border-subtle) bg-(--surface-warm-soft) px-4 py-3">
          <div className="flex items-center justify-center rounded-lg border border-(--border-subtle) bg-white p-2">
            <SignaturePreview strokes={profile.signature.strokes} className="h-12 max-w-[220px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-bold text-(--text-heading)">
              {profile.signature.signerName}
            </span>
            <span className="text-xs text-(--text-muted)">
              Saved {new Date(profile.signature.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto rounded-full text-(--danger-fg) hover:bg-(--danger-bg)"
            disabled={saving}
            onClick={() => commit(null)}
          >
            <Trash2 className="size-4" /> Remove
          </Button>
        </div>
      ) : (
        <p className="flex items-start gap-2 rounded-[14px] border border-(--status-soon-fg)/40 bg-(--status-soon-bg) px-3.5 py-3 text-sm text-(--status-soon-fg)">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          You have no signature on file, so every document still asks you to draw one.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex max-w-sm flex-col gap-1">
          <span className="text-sm font-medium text-(--text-body)">
            Name as it should appear
          </span>
          <Input
            value={signerName}
            maxLength={120}
            disabled={saving}
            className="rounded-[10px]"
            onChange={(event) => setSignerName(event.target.value)}
          />
        </label>

        <SignaturePadDialog onSave={setStrokes} />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className={cn(pillButtonClass, "shrink-0")}
            disabled={saving || strokes.length === 0 || signerName.trim().length === 0}
            onClick={() => commit({ signerName: signerName.trim(), strokes })}
          >
            {saving ? <Spinner /> : <Save className="size-4" />}
            {profile.signature ? "Replace signature" : "Save signature"}
          </Button>
          {strokes.length === 0 ? (
            <span className="text-sm text-(--text-subtle)">
              Draw above and press save on the pad first.
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-(--danger-fg)">
          <CircleAlert className="size-4" /> {error}
        </p>
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  locked,
  lockHint,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  locked?: boolean;
  lockHint?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="flex items-center gap-1.5 text-sm font-medium text-(--text-body)">
        {label}
        {locked ? <Lock className="size-3.5 text-(--text-subtle)" /> : null}
      </span>
      <Input
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        className="rounded-[10px]"
        onChange={(event) => onChange(event.target.value)}
      />
      {locked && lockHint ? (
        <span className="text-xs text-(--text-subtle)">{lockHint}</span>
      ) : null}
    </label>
  );
}

export default DoctorProfileView;
