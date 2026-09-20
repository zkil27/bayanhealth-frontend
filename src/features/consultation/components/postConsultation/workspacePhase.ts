/**
 * Phase and protected-tool derivation for the post-consult workspace.
 *
 * The five post-consult designs (D3, W1–W4) are not five screens. They are five
 * states of one workspace, and the Figma URLs say so: `/post-consultation`,
 * `· assessment`, `· assessment` (red flag), `· deliverables`, `· deliverables`
 * (stale). W1's own stepper names the three phases — Review → Assess → Deliver.
 *
 * Before this module the workspace rendered every one of those states as the
 * same flat scroll of six always-present sections, so a physician could not tell
 * from the page which state they were in, and the tabs strip above it
 * (`PostConsultationTabs`) was a second, unrelated navigation with no connection
 * to the gate. This derives the phase from the authoritative server state that
 * already drives the gate, so the layout and the permissions cannot disagree.
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

/**
 * The gate's disposition toward protected drafting, as the right rail presents
 * it. Mirrors the four rail headers in the designs: "6 locked" (W1), "Blocked"
 * (W2), "6 unlocked" (W3), "Relocked" (W4).
 */
export type ToolRailState = "locked" | "blocked" | "unlocked" | "relocked";

/** Per-tool lifecycle, derived from the artifacts the server currently holds. */
export type ToolStatus =
  | "locked"
  | "ineligible"
  | "coming_soon"
  | "available"
  | "drafted"
  | "signed"
  | "released"
  | "stale";

export interface ToolRow {
  readonly outputType: CdsProtectedOutputType;
  readonly label: string;
  readonly status: ToolStatus;
  /** One line under the label, e.g. "2 drafted · ready to sign". */
  readonly detail: string;
}

export const OUTPUT_LABELS: Record<CdsProtectedOutputType, string> = {
  plan: "Plan",
  prescription: "Prescription",
  final_icd: "Final ICD code",
  medical_certificate: "Medical certificate",
  lab_request: "Lab request",
  imaging_request: "Imaging request",
  patient_education: "Patient education",
};

export const OUTPUT_TYPES = Object.keys(OUTPUT_LABELS) as CdsProtectedOutputType[];

/** Outputs visible in the roadmap but intentionally unavailable in this release. */
export const COMING_SOON_OUTPUT_TYPES = new Set<CdsProtectedOutputType>([
  "lab_request",
  "imaging_request",
]);

/**
 * Output types the Protected tools rail renders as its own rows, i.e. every
 * type except `plan` and `final_icd`.
 *
 * SOAP-wise, Plan follows the Assessment directly, while Final ICD coding is
 * reviewed with the Assessment it classifies. Both are rendered in the centre
 * column (see `AssessmentFirstWorkspace`) instead of being repeated as generic
 * deliverables in the right rail.
 */
export const RAIL_OUTPUT_TYPES: readonly CdsProtectedOutputType[] = OUTPUT_TYPES.filter(
  (type) => type !== "plan" && type !== "final_icd",
);

/**
 * Locks that mean "a safety finding is holding this consultation", as opposed to
 * the recoverable staleness locks. W2 is exactly this set being non-empty: the
 * rail goes to `blocked` and shows no tool rows at all, because for a red flag
 * the answer is not "unlock later", it is "this is not a routine remote case".
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
 * The rail's overall state.
 *
 * `relocked` (W4) is the case that distinguishes this from a plain
 * locked/unlocked toggle: the assessment *was* confirmed and documents *were*
 * generated, then something changed underneath them. Presenting that as plain
 * "locked" would lose the fact that there are stale documents to deal with.
 */
export function deriveRailState(input: {
  readonly assessment: CdsAssessment;
  /**
   * Whether drafting is currently authorised.
   *
   * Was `hasGateToken`, and the rename is the point: the physician used to have
   * to press "Re-check safety and unlock" to mint a gate token before any tool
   * would light up, so "is a token held in this tab" and "may this doctor draft"
   * were the same question. Drafting now mints its own token on demand, so a
   * held token is an implementation detail with a short expiry, and a rail keyed
   * on it read "locked" for a confirmed, unheld consultation the server would
   * happily have authorised — the physician's own reload of the page.
   *
   * The server's authority is untouched: it still verifies a signed token on
   * every protected generation, so a `true` here is a claim about what the rail
   * should show, never a grant of anything.
   */
  readonly draftingAuthorized: boolean;
  readonly artifacts: readonly CdsProtectedArtifact[];
}): ToolRailState {
  if (hasSafetyLock(input.assessment)) return "blocked";
  if (!input.assessment.confirmed) return "locked";
  if (input.assessment.lockReasons.length > 0) {
    // Confirmed, but held. If drafts already exist they are now suspect, which
    // is W4; with no drafts yet it is just a lock to clear.
    return input.artifacts.length > 0 ? "relocked" : "locked";
  }
  if (input.artifacts.some((artifact) => artifact.effectiveStale)) return "relocked";
  return input.draftingAuthorized ? "unlocked" : "locked";
}

/**
 * Human count for the rail's header badge, e.g. "6 locked".
 *
 * Counts the rows that are actually in that disposition rather than the number
 * of eligible output types. Passing the eligible count produced badges that
 * contradicted the rows directly beneath them: a consultation with a drafted
 * Plan and a released Patient education still read "5 locked", because five
 * types were eligible even though two of them were plainly done.
 *
 * `rows` is optional so the caller can omit it for the two states whose badge is
 * a word rather than a count.
 */
export function railBadgeLabel(
  state: ToolRailState,
  rows: readonly ToolRow[] = [],
): string {
  switch (state) {
    case "blocked":
      return "Blocked";
    case "relocked":
      return "Relocked";
    case "unlocked":
      return `${rows.filter((row) => row.status === "available").length} unlocked`;
    case "locked":
    default:
      return `${rows.filter((row) => row.status === "locked").length} locked`;
  }
}

/**
 * One row per protected output type, with the status the rail should show.
 *
 * Counts come from the artifacts the server returned, never from a guess: a type
 * with no artifact reads as "available" (or "locked"), not as "0 drafted", for
 * the same reason the dashboard suppresses a zero attachment count — a zero in a
 * count position reads as a value that failed to load.
 */
export function deriveToolRows(input: {
  readonly assessment: CdsAssessment;
  readonly railState: ToolRailState;
  readonly artifacts: readonly CdsProtectedArtifact[];
}): ToolRow[] {
  const eligible = new Set(
    input.assessment.confirmed?.generationEligibility.eligibleOutputTypes ?? [],
  );

  return OUTPUT_TYPES.map((outputType) => {
    const label = OUTPUT_LABELS[outputType];

    if (COMING_SOON_OUTPUT_TYPES.has(outputType)) {
      return {
        outputType,
        label,
        status: "coming_soon" as const,
        detail: "Coming soon",
      };
    }

    const forType = input.artifacts.filter((a) => a.outputType === outputType);
    const stale = forType.filter((a) => a.effectiveStale);
    const live = forType.filter((a) => !a.effectiveStale);

    if (stale.length > 0 && live.length === 0) {
      return {
        outputType,
        label,
        status: "stale" as const,
        detail: "Out of date — draft it again",
      };
    }

    const released = live.filter((a) => a.lifecycleStatus === "released").length;
    const finalized = live.filter((a) => a.lifecycleStatus === "finalized").length;
    const generated = live.filter((a) => a.lifecycleStatus === "generated").length;

    if (released > 0) {
      return { outputType, label, status: "released" as const, detail: pluralDocs(released, "released") };
    }
    if (finalized > 0) {
      return { outputType, label, status: "signed" as const, detail: pluralDocs(finalized, "signed · ready to release") };
    }
    if (generated > 0) {
      return { outputType, label, status: "drafted" as const, detail: pluralDocs(generated, "drafted · ready to sign") };
    }

    // Nothing drafted for this type yet, so the row states availability.
    if (!input.assessment.confirmed) {
      return {
        outputType,
        label,
        status: "locked" as const,
        detail: "Confirm assessment to unlock",
      };
    }
    if (!eligible.has(outputType)) {
      return {
        outputType,
        label,
        status: "ineligible" as const,
        detail: "Not available for this diagnosis",
      };
    }
    if (input.railState !== "unlocked") {
      return {
        outputType,
        label,
        status: "locked" as const,
        detail:
          input.railState === "blocked"
            ? "Held by a safety finding"
            : "Re-check safety to unlock",
      };
    }
    return { outputType, label, status: "available" as const, detail: "Ready to draft" };
  });
}

function pluralDocs(count: number, suffix: string): string {
  return `${count} ${suffix}`;
}

/** Stale artifacts, which W4 lists as "Generated documents" needing attention. */
export function staleArtifacts(
  artifacts: readonly CdsProtectedArtifact[],
): CdsProtectedArtifact[] {
  return artifacts.filter((artifact) => artifact.effectiveStale);
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
