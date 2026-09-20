"use client";

import { useCallback, useRef, useState } from "react";
import { CircleAlert, Lock, PenLine, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";

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

/**
 * The doctor's own Profile — formerly "Verification".
 *
 * Verification was one page that did one thing: upload a licence and wait. It
 * was the only doctor-owned account surface in the product, so a doctor had
 * nowhere to correct their phone number, write a word about their practice, or
 * set up the signature the consultation workspace asks for on every document
 * they sign. Credentials are now one section of a profile rather than the whole
 * of it.
 *
 * What is editable depends on verification status, and says so on the field
 * rather than in a paragraph: full name and licence number are the evidence a
 * moderator reviewed, so from `pending` onward they are shown locked. The server
 * enforces the same rule — this is the explanation, not the enforcement.
 */
export function DoctorProfileView() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
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
        <div data-slot="doctor-profile" className="flex w-full flex-col gap-5">
          <header className="flex max-w-2xl flex-col gap-1">
            <h1 className="font-display text-2xl font-bold text-(--text-heading)">Profile</h1>
            <p className="text-[15px] text-(--text-muted)">
              Your details, your biography, the signature you sign consultations with, and
              your credentialing documents.
            </p>
          </header>

          <ProfileDetailsSection
            idToken={idToken ?? ""}
            profile={bundle.profile}
            onSaved={reload}
          />

          <SignatureSection idToken={idToken ?? ""} profile={bundle.profile} onSaved={reload} />

          <section className={cardClass}>
            <DoctorCredentialsSection
              idToken={idToken ?? ""}
              bundle={bundle}
              onChanged={reload}
            />
          </section>
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
  const pill = statusPill(profile.verificationStatus);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserRound className="size-5 text-(--text-heading)" />
          <h2 className="text-lg font-bold text-(--text-heading)">Your details</h2>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
            pill.className,
          )}
        >
          {pill.icon}
          {pill.label}
        </span>
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
      <div className="flex items-center gap-2">
        <PenLine className="size-5 text-(--text-heading)" />
        <h2 className="text-lg font-bold text-(--text-heading)">Signature</h2>
      </div>
      <p className="text-[15px] text-(--text-muted)">
        Draw your signature once. Signing a prescription, certificate or plan then becomes a
        single confirmation instead of drawing it again on every document.
      </p>

      {profile.signature ? (
        <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-(--border-subtle) bg-(--surface-warm-soft) px-4 py-3">
          <SignaturePreview strokes={profile.signature.strokes} className="h-14" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-bold text-(--text-heading)">
              {profile.signature.signerName}
            </span>
            <span className="text-sm text-(--text-muted)">
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
