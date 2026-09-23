"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSignature,
  PenLine,
  RefreshCw,
  Send,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type {
  CdsProtectedArtifact,
  CdsProtectedArtifactPayload,
  CdsSignaturePoint,
} from "@/types/cds-contract";
import type { DoctorSignatureSpecimen } from "@/features/doctor/lib/api/kyc";

import { ArtifactPayloadView } from "./ArtifactPayloadView";
import { ArtifactPayloadEditor, isEditablePayload } from "./ArtifactPayloadEditor";
import { SignaturePreview } from "./SignaturePreview";
import { SignaturePadDialog } from "./SignatureField";
import { OUTPUT_LABELS } from "./workspacePhase";
import {
  isPatientReadableOutput,
  patientVisibilityCopy,
  staleReasonLabel,
} from "../../lib/cdsCopy";

/**
 * One drafted clinical document, with everything a physician does to it.
 *
 * Three things changed here against the version this replaces, all of them from
 * watching the surface get used:
 *
 * **The content is marked as machine-authored.** Every payload on this page was
 * written by a model. It used to render in the same neutral card chrome as the
 * physician's own Assessment, so nothing on screen distinguished "you wrote
 * this" from "a model wrote this and you are about to put your name on it".
 * Standalone (the Plan card) this card now carries the violet AI treatment
 * itself — border, header tint, and a label — reserved across the app for
 * exactly that. Embedded in the deliverables deck's tab-connected card
 * (`embedded={true}`), that treatment lives on the document's own tab
 * instead — see `AiProvenanceChip` / `ReviewStatusChip` / `computeArtifactProvenance`
 * below, shared between both call sites so they can never disagree about which
 * treatment a given artifact wears — and this card renders no header of its
 * own at all, so a tabbed document's name is stated once, not twice.
 *
 * **It is editable.** Model output is a draft. A wrong frequency or a clumsy
 * sentence previously left the physician with one option, regenerate, which
 * rerolls the whole document. Edit opens the same closed schema as typed fields
 * and commits through the amendment endpoint, which revalidates the payload and
 * stamps physician-edit provenance.
 *
 * **Signing is one action, not a form.** Signing used to open a signer-name
 * field, an attestation checkbox and an empty 500x200 canvas — roughly the
 * height of the document being reviewed — and required drawing a signature by
 * hand for every document, on every consultation. With a specimen saved on the
 * doctor's profile, signing is now: read the draft, tick the attestation, press
 * the button showing your own signature. Drawing is still available inline for a
 * doctor who has not set one up, so the flow never dead-ends.
 */

export type ArtifactSignatureInput = {
  signerName: string;
  strokes: CdsSignaturePoint[][];
};

export type ArtifactProvenance = "ai" | "edited" | "neutral";

/**
 * Which of the three provenance treatments an artifact wears.
 *
 * `ai` (violet) marks a generated payload exactly as the model produced it:
 * "this is not your writing yet, read it before you sign it". `edited` (the
 * brand gradient, navy through teal) marks a generated payload the physician
 * has amended — the content is now theirs, distinct from both untouched AI
 * output and a plain neutral record. `neutral` is everything signed or
 * released: judgement has been attested, so the provenance treatment steps
 * back to ordinary card chrome.
 *
 * Exported so the deliverables deck's tab strip — which now carries these same
 * chips inline next to the active tab's label instead of this card repeating
 * them in its own header — computes the identical answer this card does,
 * rather than a second copy of the same three-way rule that could drift from
 * it.
 */
export function computeArtifactProvenance(artifact: CdsProtectedArtifact): ArtifactProvenance {
  if (artifact.lifecycleStatus !== "generated") return "neutral";
  return artifact.physicianEdited ? "edited" : "ai";
}

/**
 * "AI draft" — a flat statement of authorship, not of review state. It used
 * to also say "· you own it" / "· you edited it", which was the same fact
 * `ReviewStatusChip` already states right beside it ("Needs your review" /
 * "Reviewed"), just phrased a second way. One badge per fact: this one says
 * who wrote it, the other says where it stands. Never rendered for `neutral`
 * — once signed or released there is nothing left to mark as a draft.
 */
export function AiProvenanceChip() {
  return (
    <span
      data-slot="ai-provenance"
      className="flex items-center gap-1 rounded-full bg-(--ai-bg-strong) px-2 py-0.5 text-xs font-bold text-(--ai-fg)"
    >
      <PenLine className="size-3" />
      AI draft
    </span>
  );
}

/**
 * "Needs your review" (amber) / "Reviewed" (green, checked) — tracks whether
 * the physician has amended the draft, not merely opened it. Never rendered
 * for a stale artifact: staleness means "redraft this", not "review this".
 */
export function ReviewStatusChip({ provenance }: { provenance: Exclude<ArtifactProvenance, "neutral"> }) {
  return (
    <span
      data-slot="review-status"
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
        provenance === "edited"
          ? "bg-(--status-available-bg) text-(--status-available-fg)"
          : "bg-(--status-soon-bg) text-(--status-soon-fg)",
      )}
    >
      {provenance === "edited" ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
      {provenance === "edited" ? "Reviewed" : "Needs your review"}
    </span>
  );
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
  /**
   * Rendered inside another component's own card chrome (the deliverables
   * deck's tab-connected container) rather than drawing its own border,
   * rounded corners, background wash, and title/status header.
   *
   * The deck's tab strip is that header now — title, the two provenance
   * chips, and the patient-visibility badge all moved there so the document's
   * name stops appearing twice (once on its tab, once again on this card) and
   * the card's own body can stay the plain white the deck's unified card
   * calls for. Standalone usage (the Plan card, directly in the workspace)
   * omits this and keeps drawing all of that itself.
   */
  embedded?: boolean;
}

export function ArtifactCard(props: ArtifactCardProps) {
  const { artifact, embedded = false } = props;
  const label = OUTPUT_LABELS[artifact.outputType];
  const visibility = patientVisibilityCopy(artifact.outputType);
  const patientReadable = isPatientReadableOutput(artifact.outputType);
  const amendable =
    artifact.lifecycleStatus === "generated" &&
    !artifact.effectiveStale &&
    isEditablePayload(artifact.outputType, artifact.payload);
  const provenance = computeArtifactProvenance(artifact);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CdsProtectedArtifactPayload>(artifact.payload);
  const [seed, setSeed] = useState(`${artifact.artifactId}:${artifact.artifactRevision}`);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [attested, setAttested] = useState(false);
  const [drawn, setDrawn] = useState<CdsSignaturePoint[][]>([]);
  const [typedName, setTypedName] = useState(props.defaultSignerName ?? "");
  const [submitting, setSubmitting] = useState(false);

  /*
    A regeneration — or the physician's own amendment — replaces the payload
    underneath an open editor. Re-seeding when the artifact revision moves means
    they are never left editing a draft the server has already superseded, which
    would fail the amendment's `expectedArtifactRevision` check after they had
    typed a paragraph.

    Adjusted during render rather than in an effect: this is derived state, and
    React re-runs the component immediately with the corrected values instead of
    painting one frame of the previous draft first.
  */
  const currentSeed = `${artifact.artifactId}:${artifact.artifactRevision}`;
  if (seed !== currentSeed) {
    setSeed(currentSeed);
    setDraft(artifact.payload);
    setEditing(false);
  }

  const specimenStrokes = props.specimen?.strokes ?? [];
  const hasSpecimen = specimenStrokes.length > 0;
  // With a specimen on file the signer name is the one it was saved under —
  // the point of the specimen is that the doctor confirms rather than retypes.
  // Without one, they need somewhere to put their name, or nothing on this card
  // could ever satisfy the contract's required `signerName`.
  const signerName = hasSpecimen ? props.specimen!.signerName : typedName;
  const signatureStrokes = hasSpecimen ? specimenStrokes : drawn;
  const canSign = attested && signatureStrokes.length > 0 && signerName.trim().length > 0;

  const saveEdit = async () => {
    setSaving(true);
    try {
      await props.onAmend(draft);
      setEditing(false);
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
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Dismiss the sign dialog without signing.
   *
   * Wired both to the dialog's own `onOpenChange` (so the backdrop, Escape,
   * and its X button all go through it) and to the explicit Cancel button, so
   * every way of leaving resets the attestation the same way. `drawn` and the
   * typed signer name are deliberately left alone — a doctor who dismisses by
   * accident should not have to redraw their signature to try again.
   */
  const closeSignDialog = () => {
    setSigning(false);
    setAttested(false);
  };

  return (
    <article
      data-slot="artifact-card"
      data-output-type={artifact.outputType}
      data-physician-edited={artifact.physicianEdited ? "true" : "false"}
      data-provenance={provenance}
      style={
        embedded
          ? undefined
          : provenance === "ai"
            ? { background: "var(--ai-bg)" }
            : provenance === "edited"
              ? { background: "var(--edited-bg)" }
              : undefined
      }
      className={cn(
        "flex min-w-0 flex-col",
        // Violet marks machine-authored content untouched by the physician;
        // the brand gradient marks content they have amended. Once signed,
        // the document is the physician's attested output rather than a
        // draft awaiting their judgement, so the treatment steps down to the
        // neutral card chrome the rest of the record uses. Embedded usage
        // (the deliverables deck) skips all of this — its own unified card
        // already draws the border and background this card would have.
        !embedded && "overflow-hidden rounded-[16px] border",
        !embedded && provenance === "ai" && "border-(--ai-border)",
        !embedded && provenance === "edited" && "border-(--edited-border)",
        !embedded && provenance === "neutral" && "border-(--border-subtle) bg-(--surface-card)",
      )}
    >
      {!embedded ? (
        <header
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b px-4 py-3",
            provenance === "ai" && "border-(--ai-border)/50",
            provenance === "edited" && "border-(--edited-border)/50",
            provenance === "neutral" && "border-(--border-subtle) bg-(--surface-warm-soft)",
          )}
        >
          <h3 className="text-[15px] font-bold text-(--text-heading)">{label}</h3>

          {provenance !== "neutral" ? (
            <>
              <AiProvenanceChip />
              {!artifact.effectiveStale ? <ReviewStatusChip provenance={provenance} /> : null}
            </>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-(--status-available-bg) px-2 py-0.5 text-xs font-bold text-(--status-available-fg)">
              <CheckCircle2 className="size-3" />
              {artifact.lifecycleStatus === "released" ? "Released" : "Signed by you"}
            </span>
          )}

          <span
            data-slot="artifact-patient-visibility"
            data-patient-readable={patientReadable}
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-xs",
              patientReadable
                ? "bg-(--surface-accent-soft) font-bold text-(--status-available-fg)"
                : "bg-(--gray-bg) text-(--gray-fg)",
            )}
          >
            {visibility.badge}
          </span>
        </header>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3 p-4">
        <p className="text-xs font-medium text-(--text-muted)">
          Assessment v{artifact.assessmentVersion} · revision {artifact.artifactRevision}
          {artifact.physicianEditedAt ? (
            <> · edited {new Date(artifact.physicianEditedAt).toLocaleTimeString()}</>
          ) : null}
        </p>

        {artifact.effectiveStale ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[10px] border border-(--status-soon-fg)/40 bg-(--status-soon-bg)/50 p-3 text-sm text-(--status-soon-fg)"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {staleReasonLabel(artifact.staleReason) ?? "This draft is out of date"}, so it can no
              longer be edited, signed or released. Draft it again from the current Assessment.
            </span>
          </p>
        ) : null}

        {props.regenerating ? (
          <p className="flex items-center gap-2 rounded-[10px] bg-(--ai-bg-strong) px-3 py-2 text-sm text-(--ai-fg)">
            <Spinner className="size-4" />
            Drafting a new version…
          </p>
        ) : null}

        {/* The document itself, read or edited in place — never in a modal, so
            the physician keeps the draft they are correcting in view. The
            wrapper's own tint follows the same provenance the card's border
            and header already carry, so the reading surface and the chrome
            around it never disagree about whose words these are. */}
        {editing ? (
          <div
            className={cn(
              "rounded-[16px] border p-4 shadow-xs",
              embedded
                ? "border-(--teal-600)/30 bg-(--surface-warm-soft)/70"
                : provenance === "edited"
                  ? "border-(--edited-border) bg-(--edited-bg-strong)"
                  : "border-(--ai-border) bg-(--ai-bg-strong)",
            )}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-(--border-subtle) pb-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-(--text-heading)">
                <PenLine className="size-3.5 text-(--action-primary)" />
                Editing draft — modify fields directly below
              </span>
              <span className="text-[11px] font-medium text-(--text-muted)">
                Click any field to type · Press &ldquo;Save changes&rdquo; below when done
              </span>
            </div>
            <ArtifactPayloadEditor
              outputType={artifact.outputType}
              payload={draft}
              disabled={saving || props.busy}
              onChange={setDraft}
            />
          </div>
        ) : (
          <div
            className={cn(
              "min-w-0 rounded-[10px] p-3",
              // Plain in embedded use — the deck's tab chips carry the AI /
              // edited signal now, so the reading surface itself stays the
              // white the unified card calls for, matching how the Plan
              // card's own non-embedded body reads when it is neutral.
              embedded
                ? "bg-(--surface-warm-soft)"
                : provenance === "edited"
                  ? "bg-(--edited-bg-strong)"
                  : provenance === "ai"
                    ? "bg-(--ai-bg-strong)"
                    : "bg-(--surface-warm-soft)",
            )}
          >
            <ArtifactPayloadView outputType={artifact.outputType} payload={artifact.payload} />
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-(--border-subtle) px-4 py-3">
        {editing ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover)"
              disabled={saving || props.busy}
              onClick={saveEdit}
            >
              {saving ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" />}
              Save changes
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={saving}
              onClick={() => {
                setDraft(artifact.payload);
                setEditing(false);
              }}
            >
              <Undo2 className="size-4" /> Discard changes
            </Button>
          </div>
        ) : artifact.lifecycleStatus === "generated" && !artifact.effectiveStale ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover)"
                disabled={props.busy || props.regenerating}
                onClick={() => setSigning(true)}
              >
                <PenLine className="size-4" /> Sign &amp; lock
              </Button>
              {amendable ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    provenance === "edited"
                      ? "border-(--edited-border) text-(--edited-fg) hover:bg-(--edited-bg)"
                      : "border-(--ai-border) text-(--ai-fg) hover:bg-(--ai-bg)",
                  )}
                  disabled={props.busy || props.regenerating}
                  onClick={() => setEditing(true)}
                >
                  <PenLine className="size-4" />{" "}
                  {provenance === "edited" ? "Edit again" : "Edit draft"}
                </Button>
              ) : null}
              {props.onRegenerate ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                  disabled={props.busy || props.regenerating || !props.canRegenerate}
                  onClick={props.onRegenerate}
                >
                  <RefreshCw className="size-4" /> Redraft
                </Button>
              ) : null}
            </div>

            {/*
              A popup rather than an inline block that used to take over this
              whole footer, roughly doubling the card's height for every
              document being signed. Explicit here, not just implied by the
              lock icon disappearing afterward: signing is the point past
              which "Edit again" stops being an option, so the dialog says
              that in as many words before the doctor commits to it.
            */}
            <Dialog
              open={signing}
              onOpenChange={(open) => {
                if (!open) closeSignDialog();
              }}
            >
              <DialogContent className="sm:max-w-md rounded-[20px] border border-(--border-subtle) bg-(--surface-card) p-5 shadow-xl">
                <DialogHeader className="gap-1.5 pb-1">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--surface-brand-soft) text-(--navy-800) dark:text-(--navy-200)">
                      <FileSignature className="size-4.5" />
                    </span>
                    <DialogTitle className="text-base font-bold text-(--text-heading)">
                      Sign {label}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-xs text-(--text-muted) leading-relaxed">
                    Confirm your clinical review to finalize and lock this {label.toLowerCase()}. Releasing to the patient or records remains a separate step.
                  </DialogDescription>
                </DialogHeader>

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

                <DialogFooter className="-mx-5 -mb-5 mt-2 flex-row items-center justify-end gap-2 rounded-b-[20px] border-t border-(--border-subtle) bg-(--surface-warm-soft)/60 px-5 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={submitting}
                    onClick={closeSignDialog}
                  >
                    <X className="size-4" /> Cancel
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover) px-5"
                    disabled={!canSign || submitting}
                    onClick={sign}
                  >
                    {submitting ? <Spinner className="size-4" /> : <PenLine className="size-4" />}
                    {hasSpecimen ? `Sign as ${props.specimen!.signerName}` : "Sign & lock"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : artifact.lifecycleStatus === "finalized" && !artifact.effectiveStale ? (
          <>
            {/*
              Signing and releasing are two separate acts, and the gap between
              them is the one thing a physician must not misread: a signed
              prescription reaches nobody until it is released. Stated on the
              card rather than left to the button label.
            */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-(--teal-800)">
                <CheckCircle2 className="size-3.5 text-(--status-available-fg)" />
                Signed · Ready to release
              </span>
              <HoldToReleaseButton
                label={patientReadable ? "Release to patient" : "Release for records"}
                disabled={props.busy}
                onConfirm={props.onRelease}
              />
            </div>
          </>
        ) : artifact.lifecycleStatus === "released" ? (
          <p className="flex items-start gap-2 text-sm text-(--text-body)">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-(--status-available-fg)" />
            <span>
              {patientReadable ? "Shared with the patient" : "Released to your records"} at{" "}
              {artifact.releasedAt
                ? new Date(artifact.releasedAt).toLocaleString()
                : "server-recorded time"}
              .{" "}
              <span className="text-(--text-muted)">
                {patientReadable
                  ? "It is on their booking page now."
                  : "The patient has no screen for this document type."}
              </span>
            </span>
          </p>
        ) : props.onRegenerate ? (
          <Button
            type="button"
            className="rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover) sm:self-start"
            disabled={props.busy || props.regenerating || !props.canRegenerate}
            onClick={props.onRegenerate}
          >
            <RefreshCw className="size-4" /> Draft it again
          </Button>
        ) : null}
      </footer>
    </article>
  );
}

const RELEASE_HOLD_MS = 2000;

/**
 * Releasing is the one action on this page a physician cannot walk back —
 * once a document reaches the patient's booking page there is no
 * "un-release". That used to be gated by `window.confirm`, a native dialog a
 * physician learns to reflexively dismiss after seeing it a hundred times on
 * routine documents, which makes it the weakest possible guard on the one
 * action that most needs a real one. A two-second press is deliberate in a
 * way a dismissed dialog is not: it cannot be triggered by a stray click, and
 * releasing early costs nothing, so there is no reason to rush past it.
 *
 * The fill is a plain CSS width transition, not a JS-driven timer loop —
 * `onTransitionEnd` firing for the *filling* transition (guarded by
 * `filled`) is what calls `onConfirm`, so the visual progress and the actual
 * 2-second requirement are the same two seconds by construction, not two
 * timers that could drift apart. Letting go early changes the width target
 * before the fill finishes, which cancels that transition outright (the spec
 * calls this `transitioncancel`, not `transitionend`) — so an interrupted
 * hold can never accidentally complete the action.
 */
function HoldToReleaseButton({
  label,
  disabled,
  onConfirm,
}: {
  label: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const [filled, setFilled] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const start = () => {
    if (disabled || holding) return;
    setHolding(true);
    // Two nested frames: the first lets React commit `filled: false` (width 0)
    // to the DOM and the browser paint it; only the second flips it to `true`,
    // so the browser has an actual 0% frame to transition away from. Doing
    // this in one frame (or none) risks the browser coalescing both style
    // changes into a single paint, in which case there is nothing to animate
    // and the bar simply snaps to full — sometimes, unpredictably, depending
    // on frame timing, which is worse than always doing it wrong the same way.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setFilled(true));
    });
  };

  const cancel = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHolding(false);
    setFilled(false);
  };

  const handleFillTransitionEnd = (event: React.TransitionEvent<HTMLSpanElement>) => {
    if (event.propertyName !== "width" || !filled) return;
    setHolding(false);
    onConfirm();
  };

  return (
    <button
      type="button"
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
      aria-label={`${label} — press and hold for two seconds`}
      className={cn(
        "relative isolate w-full touch-none overflow-hidden rounded-full px-4 py-2.5 text-[15px] font-bold text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] transition-colors select-none sm:w-auto sm:self-start",
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
      <span className="relative z-10 flex items-center justify-center gap-2">
        <Send className="size-4" />
        {holding ? "Keep holding…" : label}
      </span>
    </button>
  );
}

/**
 * The attestation checkbox and signature source, without a title or its own
 * action buttons — those now live in the enclosing dialog's header and
 * footer, so this is purely the part of the sign-off that varies: confirm the
 * signature on file, or draw one when there isn't one yet.
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
    <div data-slot="artifact-sign-off" className="flex flex-col gap-3.5">
      {/* Interactive Attestation Card */}
      <div
        role="checkbox"
        aria-checked={attested}
        tabIndex={0}
        onClick={() => onAttested(!attested)}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            onAttested(!attested);
          }
        }}
        className={cn(
          "flex items-start gap-3 rounded-[14px] border p-3.5 cursor-pointer transition-all select-none",
          attested
            ? "border-(--teal-600) bg-(--surface-accent-soft)/60 shadow-2xs"
            : "border-(--border-subtle) bg-(--surface-warm-soft)/50 hover:border-(--border-default)",
        )}
      >
        <input
          type="checkbox"
          checked={attested}
          onChange={(event) => onAttested(event.target.checked)}
          onClick={(event) => event.stopPropagation()}
          className="mt-0.5 size-4 rounded accent-(--action-primary) cursor-pointer"
        />
        <div className="flex flex-col text-xs leading-relaxed">
          <span className="font-semibold text-(--text-heading)">
            Clinical Review &amp; Attestation
          </span>
          <span className="text-(--text-muted)">
            I have reviewed this {label.toLowerCase()} and attest to its clinical accuracy against the confirmed assessment and medical record.
          </span>
        </div>
      </div>

      {hasSpecimen ? (
        <div className="flex items-center justify-between gap-3 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) p-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-28 shrink-0 rounded-lg border border-(--border-subtle) bg-white p-1 flex items-center justify-center">
              <SignaturePreview strokes={specimen!.strokes} />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-bold text-(--text-heading)">
                {specimen!.signerName}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-(--teal-800)">
                <CheckCircle2 className="size-3 text-(--status-available-fg)" />
                Signature on file
              </span>
            </div>
          </div>
          <Link
            href="/doctor/profile"
            className="shrink-0 text-xs font-semibold text-(--action-primary) hover:underline"
          >
            Change
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <label htmlFor="signer-name-field" className="text-xs font-semibold text-(--text-heading)">
              Signer Legal Name
            </label>
            <Link
              href="/doctor/profile"
              className="text-[11px] font-medium text-(--action-primary) hover:underline"
            >
              Save permanent signature in profile →
            </Link>
          </div>
          <Input
            id="signer-name-field"
            placeholder="e.g. Dr. Maria Santos, MD"
            value={signerName}
            maxLength={120}
            className="h-9 rounded-[10px] text-xs"
            onChange={(event) => onSignerName(event.target.value)}
          />
          <SignaturePadDialog onSave={onDrawn} />
        </div>
      )}
    </div>
  );
}
