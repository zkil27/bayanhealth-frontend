"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileSignature,
  MoreHorizontal,
  PenLine,
  RefreshCw,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type {
  CdsProtectedArtifact,
  CdsProtectedArtifactPayload,
  CdsSignaturePoint,
} from "@/types/cds-contract";
import type { DoctorSignatureSpecimen } from "@/features/doctor/lib/api/kyc";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";

import { ArtifactPayloadView } from "./ArtifactPayloadView";
import { ArtifactPayloadEditor, isEditablePayload } from "./ArtifactPayloadEditor";
import { SignaturePreview } from "./SignaturePreview";
import { SignaturePadDialog } from "./SignatureField";
import { OUTPUT_LABELS } from "./workspacePhase";
import { DocumentSheetModal } from "../documents/DocumentSheetModal";
import { isPatientReadableOutput, staleReasonLabel } from "../../lib/cdsCopy";

/**
 * One drafted clinical document, with everything a physician does to it.
 *
 * Rendered inside the document checklist's pane, which owns the title, the
 * status, who wrote it and who can see it. This card is the document and its
 * actions, nothing else, so a document's name and state are said once.
 *
 * The actions follow one order in every state: the primary step on the right
 * (Sign, Hold to release, Draft it again), Edit beside it, and the rarely used
 * ones (Redraft, Discard) folded into "More" so they never sit at the same
 * weight as Sign. Preview & print is always on the left.
 *
 * Signing is one confirmation, not a form: with a specimen saved on the
 * doctor's profile it is read, tick the attestation, press the button showing
 * their own name. Drawing is still offered for a doctor without one.
 */

export type ArtifactSignatureInput = {
  signerName: string;
  strokes: CdsSignaturePoint[][];
};

export type ArtifactProvenance = "ai" | "edited" | "neutral";

/**
 * Whether a draft is untouched model output (`ai`), the physician's own or
 * amended text (`edited`), or already attested (`neutral`). Batch signing uses
 * it to decide which drafts start ticked.
 */
export function computeArtifactProvenance(artifact: CdsProtectedArtifact): ArtifactProvenance {
  if (artifact.lifecycleStatus !== "generated") return "neutral";
  // The physician's own document (ADR-20261005-01) is their text from the
  // start, so it reads as reviewed rather than as an AI draft to check.
  if (artifact.source === "physician") return "edited";
  return artifact.physicianEdited ? "edited" : "ai";
}

/** A keyboard shortcut forwarded from the checklist; `nonce` makes repeats distinct. */
export interface ArtifactCommand {
  action: "edit" | "sign";
  nonce: number;
}

export interface ArtifactCardProps {
  artifact: CdsProtectedArtifact;
  /** A consultation-level action is in flight; card actions stand down. */
  busy: boolean;
  /** This output type is being re-drafted right now. */
  regenerating?: boolean;
  /** The doctor's stored signature specimen, when they have set one up. */
  specimen?: DoctorSignatureSpecimen | undefined;
  /** Their profile name, used to seed the signer field when there is no specimen. */
  defaultSignerName?: string;
  onAmend: (payload: CdsProtectedArtifactPayload) => Promise<void>;
  onFinalize: (signature: ArtifactSignatureInput) => Promise<void>;
  onRelease: () => void;
  onRegenerate?: () => void;
  /** Whether re-drafting is currently permitted (gate open, type eligible). */
  canRegenerate?: boolean;
  /** Remove this unsigned draft from the review (client-side only; the server copy is untouched). */
  onDiscard?: () => void;
  /** Whether this draft can be discarded: unsigned drafts only. */
  canDiscard?: boolean;
  intake?: BookingIntakeForm | null;
  /** Move to the next document that still needs something. */
  onNext?: () => void;
  hasNext?: boolean;
  /** Keyboard shortcut from the checklist. */
  command?: ArtifactCommand | null;
}

export function ArtifactCard(props: ArtifactCardProps) {
  const { artifact } = props;
  const label = OUTPUT_LABELS[artifact.outputType];
  const patientReadable = isPatientReadableOutput(artifact.outputType);
  const isDraft = artifact.lifecycleStatus === "generated" && !artifact.effectiveStale;
  const amendable = isDraft && isEditablePayload(artifact.outputType, artifact.payload);

  const [fullModalOpen, setFullModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CdsProtectedArtifactPayload>(artifact.payload);
  const [seed, setSeed] = useState(`${artifact.artifactId}:${artifact.artifactRevision}`);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [attested, setAttested] = useState(false);
  const [drawn, setDrawn] = useState<CdsSignaturePoint[][]>([]);
  const [typedName, setTypedName] = useState(props.defaultSignerName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [handledNonce, setHandledNonce] = useState(props.command?.nonce ?? 0);

  /*
    A regeneration — or the physician's own amendment — replaces the payload
    underneath an open editor. Re-seeding when the artifact revision moves means
    they are never left editing a draft the server has already superseded, which
    would fail the amendment's `expectedArtifactRevision` check after they had
    typed a paragraph. Adjusted during render: this is derived state.
  */
  const currentSeed = `${artifact.artifactId}:${artifact.artifactRevision}`;
  if (seed !== currentSeed) {
    setSeed(currentSeed);
    setDraft(artifact.payload);
    setEditing(false);
  }

  // A shortcut from the checklist, applied once per press.
  if (props.command && props.command.nonce !== handledNonce) {
    setHandledNonce(props.command.nonce);
    if (!props.busy && !props.regenerating) {
      if (props.command.action === "edit" && amendable) setEditing(true);
      if (props.command.action === "sign" && isDraft && !editing) setSigning(true);
    }
  }

  const specimenStrokes = props.specimen?.strokes ?? [];
  const hasSpecimen = specimenStrokes.length > 0;
  // With a specimen on file the signer name is the one it was saved under.
  // Without one, they need somewhere to put their name, or nothing could ever
  // satisfy the contract's required `signerName`.
  const signerName = hasSpecimen ? props.specimen!.signerName : typedName;
  const signatureStrokes = hasSpecimen ? specimenStrokes : drawn;
  const canSign = attested && signatureStrokes.length > 0 && signerName.trim().length > 0;
  const actionsDisabled = props.busy || props.regenerating;

  const saveEdit = async () => {
    setSaving(true);
    try {
      await props.onAmend(draft);
      setEditing(false);
    } catch {
      // The workspace already showed the error. Keep the editor open so the
      // physician's changes are not lost, and let them try again.
    } finally {
      setSaving(false);
    }
  };

  const sign = async () => {
    setSubmitting(true);
    try {
      await props.onFinalize({ signerName: signerName.trim(), strokes: signatureStrokes });
      setSigning(false);
      setAttested(false);
      setDrawn([]);
    } catch {
      // The workspace already showed the error. Keep the sheet open, with the
      // attestation and any drawn signature intact, so signing can be retried.
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Every way of leaving the sign dialog resets the attestation the same way.
   * The drawn signature and typed name are kept, so a doctor who dismissed by
   * accident does not redraw.
   */
  const closeSignDialog = () => {
    setSigning(false);
    setAttested(false);
  };

  const draftDirty = editing && JSON.stringify(draft) !== JSON.stringify(artifact.payload);
  // A phone can drop the tab at any time; an edit in progress should not
  // vanish without a warning. Only armed while there is something to lose.
  useEffect(() => {
    if (!draftDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftDirty]);

  const nextButton =
    props.hasNext && props.onNext ? (
      <Button
        type="button"
        variant="outline"
        shape="pill"
        className="h-11 border-(--border-default) lg:h-9 max-sm:flex-1"
        onClick={props.onNext}
      >
        Next document <ArrowRight className="size-4" />
      </Button>
    ) : null;

  const previewButton = (
    <Button
      type="button"
      variant="outline"
      shape="pill"
      className="h-11 border-(--border-default) lg:h-9 max-sm:flex-1"
      onClick={() => setFullModalOpen(true)}
    >
      <Eye className="size-4" /> Preview &amp; print
    </Button>
  );

  return (
    <article
      data-slot="artifact-card"
      data-output-type={artifact.outputType}
      data-physician-edited={artifact.physicianEdited ? "true" : "false"}
      data-provenance={computeArtifactProvenance(artifact)}
      className="flex min-w-0 flex-col"
    >
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        {artifact.effectiveStale ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-(--attention-border)/40 bg-(--attention-bg) p-3 text-sm text-(--attention-fg)"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {staleReasonLabel(artifact.staleReason) ?? "This draft is out of date"}, so it can no
              longer be edited, signed or released. Draft it again from the current Assessment.
            </span>
          </p>
        ) : null}

        {props.regenerating ? (
          <p className="flex items-center gap-2 rounded-xl bg-(--ai-bg) px-3 py-2 text-sm text-(--ai-fg)">
            <Spinner className="size-4" />
            Drafting a new version…
          </p>
        ) : null}

        {/* The document itself, read or edited in place, never in a modal, so
            the physician keeps the draft they are correcting in view. */}
        {editing ? (
          <div className="rounded-xl border border-(--border-default) bg-(--surface-card) p-4 max-sm:-mx-1 max-sm:p-3">
            <p className="mb-4 flex items-center gap-1.5 border-b border-(--border-subtle) pb-3 text-sm font-semibold text-(--text-heading)">
              <PenLine className="size-4 text-(--action-primary)" aria-hidden />
              Editing. Your changes apply when you press Save changes.
            </p>
            <ArtifactPayloadEditor
              outputType={artifact.outputType}
              payload={draft}
              disabled={saving || props.busy}
              onChange={setDraft}
            />
          </div>
        ) : (
          <div className="min-w-0 rounded-xl bg-(--surface-warm-soft) p-3.5">
            <ArtifactPayloadView outputType={artifact.outputType} payload={artifact.payload} />
          </div>
        )}
      </div>

      {/*
        Secondary actions on the left, the step that moves the document
        forward on the right. On a phone the footer is pinned to the bottom of
        the screen, under the thumb, and steps aside while the keyboard is up.
      */}
      <footer className="flex flex-wrap items-center justify-between gap-2 max-sm:[&>*]:w-full border-t border-(--border-subtle) bg-(--surface-card) px-4 py-3 sm:px-5 max-lg:sticky max-lg:bottom-0 max-lg:z-20 max-lg:rounded-b-2xl max-lg:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-lg:shadow-[0_-6px_16px_-8px_rgb(7_73_114/0.18)] max-lg:group-has-[textarea:focus]/ws:hidden max-lg:group-has-[input:focus]/ws:hidden">
        {editing ? (
          <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="ghost"
              shape="pill"
              className="h-11 lg:h-9 max-sm:flex-1"
              disabled={saving}
              onClick={() => {
                setDraft(artifact.payload);
                setEditing(false);
              }}
            >
              <Undo2 className="size-4" /> Discard changes
            </Button>
            <Button
              type="button"
              variant="primary"
              shape="pill"
              className="h-11 px-5 lg:h-9 max-sm:flex-[2]"
              disabled={saving || props.busy}
              onClick={saveEdit}
            >
              {saving ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" />}
              Save changes
            </Button>
          </div>
        ) : isDraft ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {previewButton}
              {props.onRegenerate || (props.canDiscard && props.onDiscard) ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`More actions for ${label}`}
                    disabled={actionsDisabled}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-(--text-body) transition-colors hover:bg-(--surface-warm-soft) disabled:opacity-50 lg:h-9 max-sm:flex-1"
                  >
                    <MoreHorizontal className="size-4" aria-hidden /> More
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" sideOffset={8} className="min-w-52 rounded-xl p-1">
                    {props.onRegenerate ? (
                      <DropdownMenuItem
                        disabled={!props.canRegenerate}
                        onClick={props.onRegenerate}
                        className="min-h-11 gap-2 rounded-lg py-2 lg:min-h-0"
                      >
                        <RefreshCw className="size-4" /> Redraft with AI
                      </DropdownMenuItem>
                    ) : null}
                    {props.canDiscard && props.onDiscard ? (
                      <DropdownMenuItem
                        onClick={() => setDiscardDialogOpen(true)}
                        className="min-h-11 gap-2 rounded-lg py-2 text-(--danger-fg) lg:min-h-0"
                      >
                        <Trash2 className="size-4" /> Discard draft
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
            {amendable ? (
              <Button
                type="button"
                variant="outline"
                shape="pill"
                title="Edit (E)"
                className="h-11 border-(--border-default) px-4 lg:h-9 max-sm:flex-1"
                disabled={actionsDisabled}
                onClick={() => setEditing(true)}
              >
                <PenLine className="size-4" /> Edit
              </Button>
            ) : null}
            <Button
              type="button"
              variant="primary"
              shape="pill"
              title="Sign (S)"
              className="h-11 px-6 lg:h-9 max-sm:flex-[2]"
              disabled={actionsDisabled}
              onClick={() => setSigning(true)}
            >
              <FileSignature className="size-4" /> Sign
            </Button>
            </div>
          </>
        ) : artifact.lifecycleStatus === "finalized" && !artifact.effectiveStale ? (
          <>
            <div className="flex flex-wrap items-center gap-2">{previewButton}</div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {nextButton}
              {/* Plan and Final ICD are never released (ADR-20260924-02); signing is their last step. */}
              {patientReadable ? (
                <HoldToReleaseButton disabled={props.busy} onConfirm={props.onRelease} />
              ) : (
                <p className="text-sm text-(--text-muted)">Signed and kept in your records. Nothing to release.</p>
              )}
            </div>
          </>
        ) : artifact.lifecycleStatus === "released" ? (
          <>
            <p className="mr-auto flex items-start gap-2 text-sm text-(--text-body) max-sm:w-full">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-(--status-available-fg)" aria-hidden />
              <span>
                {patientReadable ? "Released to the patient" : "Released to your records"}
                {artifact.releasedAt
                  ? ` at ${new Date(artifact.releasedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : ""}
                .{" "}
                <span className="text-(--text-muted)">
                  {patientReadable ? "It is on their booking page." : "The patient has no screen for this document."}
                </span>
              </span>
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {previewButton}
              {nextButton}
            </div>
          </>
        ) : props.onRegenerate ? (
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="primary"
              shape="pill"
              className="h-11 px-5 lg:h-9 max-sm:w-full"
              disabled={actionsDisabled || !props.canRegenerate}
              onClick={props.onRegenerate}
            >
              <RefreshCw className="size-4" /> Draft it again
            </Button>
          </div>
        ) : null}
      </footer>

      <ResponsiveSheet
        open={signing}
        onOpenChange={(open) => {
          if (!open && !submitting) closeSignDialog();
        }}
        icon={FileSignature}
        title={`Sign ${label.toLowerCase()}`}
        description={`Signing locks this ${label.toLowerCase()}; it can no longer be edited.${
          patientReadable ? " The patient sees it only after you release it, as a separate step." : ""
        }`}
        footer={
          <>
            <Button
              type="button"
              variant="primary"
              shape="pill"
              className="px-5"
              disabled={!canSign || submitting}
              onClick={sign}
            >
              {submitting ? <Spinner className="size-4" /> : <FileSignature className="size-4" />}
              {hasSpecimen ? `Sign as ${props.specimen!.signerName}` : "Sign"}
            </Button>
            <Button type="button" variant="ghost" shape="pill" disabled={submitting} onClick={closeSignDialog}>
              Cancel
            </Button>
          </>
        }
      >
        <SignOffFields
          label={label}
          specimen={props.specimen}
          drawn={drawn}
          onDrawn={setDrawn}
          signerName={typedName}
          onSignerName={setTypedName}
          attested={attested}
          onAttested={setAttested}
        />
        {props.hasNext ? (
          <p className="mt-3 text-sm text-(--text-muted)">After signing, the next document that needs you opens.</p>
        ) : null}
      </ResponsiveSheet>

      <DocumentSheetModal
        open={fullModalOpen}
        onOpenChange={setFullModalOpen}
        artifact={artifact}
        intake={props.intake}
        doctorName={props.defaultSignerName}
      />

      {props.canDiscard && props.onDiscard ? (
        <ResponsiveSheet
          open={discardDialogOpen}
          onOpenChange={setDiscardDialogOpen}
          icon={Trash2}
          title={`Discard this ${label.toLowerCase()} draft?`}
          description="It has not been signed or released, and the patient never sees it. It is marked Not needed, and you can add it back from its row."
          footer={
            <>
              <Button
                type="button"
                shape="pill"
                className="bg-(--danger-fg) px-5 font-semibold text-white hover:bg-(--danger-fg)/90"
                onClick={() => {
                  setDiscardDialogOpen(false);
                  props.onDiscard?.();
                }}
              >
                <Trash2 className="size-4" /> Discard draft
              </Button>
              <Button type="button" variant="ghost" shape="pill" onClick={() => setDiscardDialogOpen(false)}>
                Keep draft
              </Button>
            </>
          }
        />
      ) : null}
    </article>
  );
}

const RELEASE_HOLD_MS = 2000;

/**
 * Releasing is the one action here a physician cannot walk back: once a
 * document reaches the patient's booking page there is no "un-release". A
 * two-second press is deliberate in a way a dismissed dialog is not.
 *
 * The label says "Hold" up front. It used to read "Release to patient", so a
 * first-time doctor clicked, saw nothing happen, and assumed it was broken; a
 * short press now also answers with "Press and hold for 2 seconds".
 *
 * The fill is a CSS width transition, and its `transitionend` is what calls
 * `onConfirm`, so the visual progress and the 2-second requirement are the
 * same two seconds by construction. Letting go early cancels the transition
 * outright, so an interrupted hold can never complete the action.
 */
function HoldToReleaseButton({
  disabled,
  onConfirm,
}: {
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const [filled, setFilled] = useState(false);
  const [hint, setHint] = useState(false);
  const rafRef = useRef<number | null>(null);
  const hintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  const start = () => {
    if (disabled || holding) return;
    setHint(false);
    setHolding(true);
    // Two nested frames so the browser paints the 0% width before the fill
    // starts; one frame risks both style changes coalescing into a snap.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setFilled(true));
    });
  };

  const cancel = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (holding) {
      setHint(true);
      if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = window.setTimeout(() => setHint(false), 2500);
    }
    setHolding(false);
    setFilled(false);
  };

  const handleFillTransitionEnd = (event: React.TransitionEvent<HTMLSpanElement>) => {
    if (event.propertyName !== "width" || !filled) return;
    setHolding(false);
    setHint(false);
    onConfirm();
  };

  return (
    <button
      type="button"
      data-slot="release-hold"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") cancel();
      }}
      onBlur={cancel}
      onContextMenu={(event) => event.preventDefault()}
      aria-label="Release to patient. Press and hold for two seconds."
      className={cn(
        "relative isolate h-11 touch-none overflow-hidden rounded-full px-5 text-sm font-semibold text-(--action-primary-text) shadow-[inset_0_-3px_0_0_rgb(0_0_0/0.18)] transition-colors select-none lg:h-9 max-sm:flex-[2]",
        disabled
          ? "cursor-not-allowed bg-(--action-primary)/50"
          : "bg-(--action-primary) hover:bg-(--action-primary-hover)",
      )}
    >
      <span
        aria-hidden
        data-slot="release-hold-fill"
        onTransitionEnd={handleFillTransitionEnd}
        className="absolute inset-y-0 left-0 bg-(--white)/30"
        style={{
          width: filled ? "100%" : "0%",
          transitionProperty: "width",
          transitionDuration: filled ? `${RELEASE_HOLD_MS}ms` : "150ms",
          transitionTimingFunction: filled ? "linear" : "ease-out",
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2" aria-live="polite">
        <Send className="size-4" aria-hidden />
        {holding ? "Keep holding…" : hint ? "Press and hold for 2 seconds" : "Hold to release to patient"}
      </span>
    </button>
  );
}

/**
 * The attestation and the signature source: confirm the signature on file,
 * or draw one when there isn't one yet.
 */
function SignOffFields({
  label,
  specimen,
  drawn,
  onDrawn,
  signerName,
  onSignerName,
  attested,
  onAttested,
}: {
  label: string;
  specimen?: DoctorSignatureSpecimen | undefined;
  drawn: CdsSignaturePoint[][];
  onDrawn: (strokes: CdsSignaturePoint[][]) => void;
  /** Only used when there is no specimen; otherwise the specimen's name wins. */
  signerName: string;
  onSignerName: (value: string) => void;
  attested: boolean;
  onAttested: (value: boolean) => void;
}) {
  const hasSpecimen = (specimen?.strokes.length ?? 0) > 0;

  return (
    <div data-slot="artifact-sign-off" className="flex flex-col gap-3">
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors select-none",
          attested
            ? "border-(--action-primary) bg-(--surface-accent-soft)"
            : "border-(--border-default) bg-(--surface-card) hover:border-(--border-strong)",
        )}
      >
        <input
          type="checkbox"
          checked={attested}
          onChange={(event) => onAttested(event.target.checked)}
          className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded accent-(--action-primary)"
        />
        <span className="flex flex-col gap-0.5 text-sm leading-relaxed">
          <span className="font-semibold text-(--text-heading)">I reviewed this {label.toLowerCase()}</span>
          <span className="text-(--text-muted)">
            It is clinically accurate against my confirmed Assessment and the patient&apos;s record.
          </span>
        </span>
      </label>

      {hasSpecimen ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-28 shrink-0 items-center justify-center rounded-lg border border-(--border-subtle) bg-(--white) p-1">
              <SignaturePreview strokes={specimen!.strokes} />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-(--text-heading)">{specimen!.signerName}</span>
              <span className="flex items-center gap-1 text-xs font-medium text-(--status-available-fg)">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Signature on file
              </span>
            </div>
          </div>
          <Link href="/doctor/profile" className="shrink-0 text-sm font-semibold text-(--text-link) hover:underline">
            Change
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="signer-name-field" className="text-sm font-semibold text-(--text-heading)">
              Your full name as it should appear
            </label>
            <Link href="/doctor/profile" className="text-xs font-semibold text-(--text-link) hover:underline">
              Save a signature in your profile
            </Link>
          </div>
          <Input
            id="signer-name-field"
            placeholder="e.g. Dr. Maria Santos, MD"
            value={signerName}
            maxLength={120}
            className="h-10 rounded-xl text-base sm:text-sm"
            onChange={(event) => onSignerName(event.target.value)}
          />
          <SignaturePadDialog onSave={onDrawn} />
          {drawn.length > 0 ? (
            <p className="text-xs font-medium text-(--status-available-fg)">Signature drawn.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
