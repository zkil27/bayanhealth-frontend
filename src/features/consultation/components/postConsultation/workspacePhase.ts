/**
 * Phase derivation for the post-consult workspace.
 *
 * The five post-consult designs (D3, W1–W4) are not five screens. They are five
 * states of one workspace, and the Figma URLs say so: `/post-consultation`,
 * `· assessment`, `· assessment` (red flag), `· deliverables`, `· deliverables`
 * (stale). W1's own stepper names the three phases — Review → Assess → Deliver.
 *
 * This derives the phase from the authoritative server state that already
 * drives the gate, so the layout and the permissions cannot disagree.
 *
 * Kept pure and separate from the React tree: the phase rules are the part worth
 * pinning in tests, and none of them need a rendered component to exercise.
 */
import type {
  CdsAssessment,
  CdsProtectedArtifact,
  CdsProtectedOutputType,
} from "@/types/cds-contract";

/** The three steps of W1's stepper. */
export type WorkspacePhase = "review" | "assess" | "deliver";

export const OUTPUT_LABELS: Record<CdsProtectedOutputType, string> = {
  plan: "Plan",
  prescription: "Prescription",
  final_icd: "Final ICD code",
  medical_certificate: "Medical certificate",
  diagnostic_request: "Diagnostic request",
  clinical_referral: "Clinical referral",
  patient_education: "Patient education",
};

/**
 * Outputs visible in the roadmap but intentionally unavailable in this release.
 *
 * Empty now that the merged Diagnostic Request and the new Clinical Referral
 * (ADR-20260924-02) are both live on the backend.
 */
export const COMING_SOON_OUTPUT_TYPES = new Set<CdsProtectedOutputType>([]);

/**
 * Locks that mean "a safety finding is holding this consultation", as opposed to
 * the recoverable staleness locks. For a red flag the answer is not "unlock
 * later", it is "this is not a routine remote case".
 */
const SAFETY_LOCKS = new Set(["red_flag", "acknowledgment_pending"]);

/** Whether any active lock is a safety finding rather than a staleness lock. */
export function hasSafetyLock(assessment: CdsAssessment): boolean {
  return assessment.lockReasons.some((reason) => SAFETY_LOCKS.has(reason));
}

/**
 * Which phase the workspace is in.
 *
 * `review` is the pre-assessment state: the consultation record is loaded and
 * there is nothing recorded yet, not even a saved draft. As soon as the
 * physician has put anything in the editable assessment they are assessing, and
 * once it is confirmed they are delivering. A safety lock holds the workspace in
 * `assess` regardless of confirmation — W2 has no deliverables step to move to.
 */
export function derivePhase(assessment: CdsAssessment): WorkspacePhase {
  if (hasSafetyLock(assessment)) return "assess";
  if (assessment.confirmed) return "deliver";
  if (assessment.editableDiagnosis.trim()) return "assess";
  return "review";
}

/**
 * Whether the physician may leave the workspace and which documentation states
 * require explicit acknowledgment.
 *
 * Assessment confirmation is the only hard requirement. Missing, unsigned, or
 * unreleased artifacts are warnings presented in the finish confirmation—not
 * blockers—because physicians may intentionally complete only the documents
 * needed for a consultation.
 */
export interface FinishReadiness {
  /** Leaving is allowed once the physician has confirmed an Assessment. */
  readonly canFinish: boolean;
  /** Eligible outputs that have no current artifact. */
  readonly missing: readonly string[];
  /** Current drafts that have not been signed as reviewed. */
  readonly unreviewed: readonly string[];
  /** Signed outputs that have not yet been released. */
  readonly unreleased: readonly string[];
}

export function deriveFinishReadiness(input: {
  readonly assessment: CdsAssessment;
  readonly artifacts: readonly CdsProtectedArtifact[];
}): FinishReadiness {
  if (!input.assessment.confirmed) {
    return {
      canFinish: false,
      missing: ["Confirm the Assessment"],
      unreviewed: [],
      unreleased: [],
    };
  }

  const required = input.assessment.confirmed.generationEligibility.eligibleOutputTypes.filter(
    (type) => !COMING_SOON_OUTPUT_TYPES.has(type),
  );
  // Final ICD is reviewed in the Assessment card rather than through the
  // generic finalize/release lifecycle. It is still required to exist before
  // finish, while the remaining outputs must also account for every live
  // revision instead of whichever artifact happened to be last in the array.
  const reviewable = required.filter((type) => type !== "final_icd");
  const liveByType = new Map<CdsProtectedOutputType, CdsProtectedArtifact[]>();
  for (const artifact of input.artifacts) {
    if (artifact.effectiveStale) continue;
    const known = liveByType.get(artifact.outputType) ?? [];
    known.push(artifact);
    liveByType.set(artifact.outputType, known);
  }

  return {
    canFinish: true,
    missing: required
      .filter((type) => !liveByType.has(type))
      .map((type) => OUTPUT_LABELS[type]),
    unreviewed: reviewable
      .filter((type) => liveByType.get(type)?.some((artifact) => artifact.lifecycleStatus === "generated"))
      .map((type) => OUTPUT_LABELS[type]),
    unreleased: reviewable
      .filter((type) => liveByType.get(type)?.some((artifact) => artifact.lifecycleStatus === "finalized"))
      .map((type) => OUTPUT_LABELS[type]),
  };
}
