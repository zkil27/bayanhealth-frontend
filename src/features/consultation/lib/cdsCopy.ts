/**
 * Physician-facing copy for the assessment-first CDS workspace.
 *
 * PRD v3.2 §4 is normative that the doctor UI "should feel like a normal
 * clinical documentation workflow, not an autonomous AI diagnosis tool", and
 * §4.1 defines five named doctor-facing states each with a defined "Doctor
 * sees" and "System permits".
 *
 * Before this module the workspace violated both (ADR-20260810-04):
 *
 *   - Gate lock reasons were rendered by `assessment.lockReasons.join(", ")`,
 *     so a physician read the raw contract enum — literally
 *     `clinical_input_changed`. No lookup table existed anywhere in the
 *     frontend.
 *   - Unmapped server error codes fell through to
 *     `The server rejected this action (RED_FLAG_EVALUATION_FAILED).`
 *   - Every control rendered at all times, greyed, with no indication of which
 *     of §4.1's states the consultation was in or what to do next.
 *
 * Every entry here answers two questions the raw enum could not: what happened,
 * and what the physician does next. The `nextAction` strings are the load-bearing
 * part — a lock the physician cannot clear must say so, and one they can clear
 * must name the control that clears it.
 */
import type { components } from "@/types/openapi.generated";

type GateLockReason = components["schemas"]["CdsGateLockReason"];
type ArtifactStaleReason = components["schemas"]["CdsArtifactStaleReason"];

export interface LockReasonCopy {
  /** Short human label, used as the heading of the lock row. */
  readonly label: string;
  /** What the server state actually means, in clinical-workflow terms. */
  readonly meaning: string;
  /** The concrete next step, naming the control that clears this lock. */
  readonly nextAction: string;
  /**
   * Whether the assigned physician can clear this themselves from the
   * workspace. `false` means waiting or an operator is required, and the UI
   * must not imply a button will fix it.
   */
  readonly selfClearable: boolean;
}

/**
 * Lock reason → physician copy.
 *
 * Clear preconditions come from `assessment-first-cds-gating` design.md's lock
 * ownership table and requirements 19–22: every lock has exactly one owner and
 * one clear precondition, and no unrelated action clears it. In particular a
 * fresh ROUTINE evaluation at token issuance clears only `evaluation_failed`
 * and `clinical_input_changed` — which is why those two, and only those two,
 * are described as resolved by requesting a token.
 */
const LOCK_REASON_COPY: Record<GateLockReason, LockReasonCopy> = {
  clinical_input_changed: {
    label: "The patient's clinical information changed",
    meaning:
      "New or updated intake was recorded after this Assessment, so the safety checks have to run again against the current information.",
    nextAction: 'Select "Re-run safety check" below to unlock drafting.',
    selfClearable: true,
  },
  evaluation_failed: {
    label: "The last safety check did not complete",
    meaning:
      "A safety evaluation failed to finish, so the system is holding protected actions closed rather than assuming the result.",
    nextAction: 'Select "Re-run safety check" below to try again.',
    selfClearable: true,
  },
  assessment_change: {
    label: "Assessment is mid-change",
    meaning:
      "An Assessment update, re-attestation, or clear is in progress, so anything that depends on the Assessment stays closed until it settles.",
    nextAction:
      'Select "Refresh" to load the settled Assessment, then confirm it again if needed.',
    selfClearable: true,
  },
  red_flag: {
    label: "A safety flag is active",
    meaning:
      "The deterministic safety check found a finding that takes this consultation off the routine remote pathway.",
    nextAction:
      "Review the safety finding shown with the candidates. Acknowledge the current episode once the latest check reads routine.",
    selfClearable: true,
  },
  acknowledgment_pending: {
    label: "A safety finding needs your acknowledgement",
    meaning:
      "A safety episode has been raised and is waiting for the assigned physician to acknowledge it before protected actions reopen.",
    nextAction: 'Review the finding, then select "Acknowledge current episode".',
    selfClearable: true,
  },
  reassignment: {
    label: "This consultation was reassigned",
    meaning:
      "The assigned physician changed, so the previous physician's Assessment no longer authorises protected actions.",
    nextAction:
      "The newly assigned physician must confirm or re-attest the Assessment. If that is you, confirm it below.",
    selfClearable: true,
  },
  operator_hold: {
    label: "An administrator has placed a hold",
    meaning:
      "Protected generation is held for this consultation by an operator action, not by anything in the clinical record.",
    nextAction:
      "You cannot clear this from here. Contact the platform administrator to release the hold.",
    selfClearable: false,
  },
  recovery_required: {
    label: "This consultation needs administrator recovery",
    meaning:
      "The gate found inconsistent state it will not repair on its own, and is staying closed until an operator reconciles it.",
    nextAction:
      "You cannot clear this from here. Escalate to the platform administrator with this consultation reference.",
    selfClearable: false,
  },
};

/** Physician copy for one gate lock reason. */
export function lockReasonCopy(reason: GateLockReason): LockReasonCopy {
  return (
    LOCK_REASON_COPY[reason] ?? {
      // An unrecognised reason means the contract grew a value this build does
      // not know. Say so plainly rather than printing the bare enum.
      label: "Protected actions are locked",
      meaning: "The server is holding protected actions closed for this consultation.",
      nextAction: 'Select "Refresh" to load current state. If it persists, contact the administrator.',
      selfClearable: false,
    }
  );
}

/**
 * Whether every active lock can be cleared by the physician from this
 * workspace. Used to decide between offering a next step and telling the
 * physician plainly that they are blocked.
 */
export function allLocksSelfClearable(reasons: readonly GateLockReason[]): boolean {
  return reasons.length > 0 && reasons.every((reason) => lockReasonCopy(reason).selfClearable);
}

const STALE_REASON_COPY: Record<ArtifactStaleReason, string> = {
  assessment_changed: "The Assessment changed after this was drafted",
  assessment_cleared: "The Assessment was cleared after this was drafted",
  assignment_changed: "The consultation was reassigned after this was drafted",
  clinical_input_changed: "The patient's clinical information changed after this was drafted",
  gate_revoked: "The authorisation for this draft was withdrawn",
  policy_changed: "The clinical policy version changed after this was drafted",
  generation_eligibility_changed: "This output type is no longer available for the confirmed Assessment",
  postflight_failed: "This draft did not pass its safety checks after generation",
  legacy_incomplete_provenance: "This draft predates the current record-keeping rules",
};

/**
 * Physician copy for an artifact staleness reason.
 *
 * Previously rendered as `artifact.staleReason?.replaceAll("_", " ")`, which
 * turned `postflight_failed` into "postflight failed" — still not language a
 * clinician should have to interpret.
 */
export function staleReasonLabel(reason: ArtifactStaleReason | undefined): string | undefined {
  if (!reason) return undefined;
  return STALE_REASON_COPY[reason] ?? "This draft is out of date and cannot be used";
}

/**
 * Safety routing outcome → physician copy.
 *
 * Previously `outcome.replaceAll("_", " ")`, which showed "REFER F2F".
 */
export function routingOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "ROUTINE":
      return "No safety flags";
    case "WARNING":
      return "Proceed with caution";
    case "REFER_F2F":
      return "Face-to-face review recommended";
    case "EMERGENCY":
      return "Emergency pathway";
    default:
      return "Safety review required";
  }
}

/**
 * The five doctor-facing states of PRD v3.2 §4.1.
 *
 * `blocked` is not one of the PRD's five: it is the case where a lock is active
 * that the physician cannot clear, which §4.1 does not enumerate but which the
 * workspace must still explain rather than showing a row of dead controls.
 */
export type WorkspaceStep =
  | "safety_review"
  | "assessment_open"
  | "assessment_confirmed"
  | "generation_ready"
  | "assessment_changed"
  | "blocked";

export interface StepGuidance {
  readonly step: WorkspaceStep;
  /** One-line statement of where the consultation is. */
  readonly heading: string;
  /** What the physician should do next, in one sentence. */
  readonly instruction: string;
}

/**
 * Derive the current §4.1 state and its next step.
 *
 * Deliberately ordered so the most restrictive condition wins: an
 * unclearable lock outranks everything, then clearable locks, then the
 * Assessment lifecycle. That ordering is what stops the workspace from telling
 * a physician to "select an output" while a safety flag is holding the gate.
 */
export function stepGuidance(input: {
  readonly confirmed: boolean;
  readonly lockReasons: readonly GateLockReason[];
  /**
   * Whether drafting is currently authorised. See `deriveRailState` for why
   * this is no longer "does the browser hold a gate token" — the token is
   * acquired at draft time and the physician never manages it.
   */
  readonly draftingAuthorized: boolean;
  readonly eligibleOutputCount: number;
  readonly hasCandidates: boolean;
}): StepGuidance {
  if (input.lockReasons.length > 0 && !allLocksSelfClearable(input.lockReasons)) {
    return {
      step: "blocked",
      heading: "Protected actions are locked and need an administrator",
      instruction:
        "You can still record and confirm an Assessment. Drafting stays closed until the hold is released.",
    };
  }

  if (input.lockReasons.includes("red_flag") || input.lockReasons.includes("acknowledgment_pending")) {
    return {
      step: "safety_review",
      heading: "A safety finding needs review",
      instruction:
        "Review the safety finding, then acknowledge the current episode to reopen protected actions.",
    };
  }

  if (input.confirmed && input.lockReasons.includes("assessment_change")) {
    return {
      step: "assessment_changed",
      heading: "The Assessment is mid-change",
      instruction: "Refresh to load the settled Assessment before drafting anything from it.",
    };
  }

  if (input.confirmed && input.lockReasons.length > 0) {
    return {
      step: "assessment_changed",
      heading: "Dependent drafts are out of date",
      instruction:
        "Re-check safety to unlock protected actions against the current clinical information.",
    };
  }

  if (!input.confirmed) {
    return {
      step: "assessment_open",
      heading: "Record your Assessment",
      instruction: input.hasCandidates
        ? "Select a suggested diagnosis or type your own, save it, then confirm it. Nothing is drafted until you confirm."
        : "Type your diagnosis, or load suggestions from the intake. Nothing is drafted until you confirm an Assessment.",
    };
  }

  if (input.eligibleOutputCount === 0) {
    return {
      step: "assessment_confirmed",
      heading: "Assessment recorded, drafting not available for it",
      instruction:
        "This diagnosis is not yet in the approved catalogue, so the system will not draft from it. Record it as-is, or confirm a catalogued diagnosis to enable drafting.",
    };
  }

  if (!input.draftingAuthorized) {
    return {
      step: "assessment_confirmed",
      heading: "Drafting is on hold",
      instruction:
        "Clear the hold listed above, then re-run the safety check to draft from this Assessment.",
    };
  }

  return {
    step: "generation_ready",
    heading: "Ready to draft",
    instruction:
      "Choose an output to draft. Every draft is checked again by the server and needs your review and signature before release.",
  };
}

type ProtectedOutputType = components["schemas"]["CdsProtectedOutputType"];

/**
 * Output types a patient can actually read once released.
 *
 * MUST stay in lockstep with `PATIENT_READABLE_OUTPUT_TYPES` in
 * `backend/src/lib/cds/released-patient-education.ts` and with
 * `patient_cds_route_keys` in `infra/modules/cds_operations/routes.tf`, which
 * exposes exactly two patient-readable routes:
 *
 *   GET /v1/cds/consultations/{consultationId}/patient-education/released
 *   GET /v1/cds/consultations/{consultationId}/prescription/released
 *
 * There is no `/plan/released` route, nor one for `final_icd`,
 * `medical_certificate`, `lab_request`, or `imaging_request`. Those five are
 * excluded deliberately — the backend comment is explicit that each "needs its
 * own decision about presentation and accompanying explanation before it is
 * handed to a patient unmediated".
 *
 * This list exists because the workspace offered a Release control on all seven
 * output types with nothing distinguishing them, so releasing a Plan looked
 * identical to releasing a prescription and silently reached no one
 * (ADR-20260810-05). `cdsCopy.test.ts` pins the membership so adding a patient
 * route without updating this list, or vice versa, fails a test.
 */
export const PATIENT_READABLE_OUTPUT_TYPES: readonly ProtectedOutputType[] = [
  "patient_education",
  "prescription",
];

/** Whether releasing this output type actually shows the patient anything. */
export function isPatientReadableOutput(outputType: ProtectedOutputType): boolean {
  return PATIENT_READABLE_OUTPUT_TYPES.includes(outputType);
}

export interface PatientVisibilityCopy {
  /** Short badge text for the artifact card. */
  readonly badge: string;
  /** One sentence on what releasing this does, and does not, do. */
  readonly detail: string;
  /** Confirmation prompt shown before release. */
  readonly confirm: string;
}

/**
 * What a physician needs to know before releasing one output type.
 *
 * The record-only wording avoids implying the artifact is withheld from the
 * patient as a matter of secrecy — it is not yet presentable to them, which is a
 * different thing and the reason the route does not exist.
 */
export function patientVisibilityCopy(outputType: ProtectedOutputType): PatientVisibilityCopy {
  if (isPatientReadableOutput(outputType)) {
    return {
      badge: "Patient can see this",
      detail: "Releasing this shows it on the patient's booking page.",
      confirm:
        "Release this to the patient? It will appear on their booking page. No other document is released.",
    };
  }
  return {
    badge: "Your records only",
    detail:
      "The patient has no screen for this one, so releasing it changes your record but shows them nothing. Patient education is the patient-facing version of your Plan.",
    confirm:
      "Release this for your records? The patient has no screen for this document type, so they will not see it. Release Patient education to share guidance with them.",
  };
}
