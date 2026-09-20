import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import type { IntakeForm } from "@/features/booking/lib/api/intake";
import type { ReleasedPatientEducation } from "@/features/consultation/lib/api/patientEducation";
import type { LabOrder } from "@/features/patient/lib/api/patientLabOrders";
import type { PatientMedicationLine } from "@/features/patient/lib/api/patientMedications";
import type { FollowUpRecommendation } from "@/features/patient/lib/api/patientFollowUps";

/**
 * What the Care Recovery Roadmap should draw, derived once from real reads.
 *
 * Split out of `CareRecoveryRoadmap.tsx` for the same reason
 * `patientHomeState.ts` is split out of `PatientHome.tsx`: the interesting part
 * is the derivation, and a pure function is the only way to test the states a
 * patient actually passes through without standing up five queries.
 *
 * Every state below cites the read that produces it (ADR-20260806-02). The
 * platform holds no queue position, no expected wait, and no aggregate step
 * duration, so this module derives no ETA, no percentage, and no
 * "typically takes N minutes" line — a step is reached when a timestamp says it
 * was reached, and is otherwise upcoming.
 *
 * The card previously had one binary gate — a released education article
 * exists, or it does not — which meant the roadmap could only ever describe a
 * finished visit. Everything a waiting patient would want to watch (their
 * intake being read, the consult starting, a prescription arriving) happened
 * while the card showed a static explainer.
 */

/**
 * How a node renders.
 *
 * `active` is reserved for a step something is genuinely happening on — it
 * drives the pulse treatment, and a pulse on a step nobody is working is the
 * "reported as having happened" failure the fabricated-data ADR names.
 */
export type RoadmapStepState = "done" | "active" | "upcoming" | "muted";

/** Which journey the patient is on. */
export type RoadmapBranch = "consult" | "lab";

export type RoadmapStepId =
  | "intake"
  | "consultation"
  | "documents"
  | "follow-up"
  | "lab-ordered"
  | "lab-upload"
  | "lab-review";

export interface RoadmapStep {
  id: RoadmapStepId;
  title: string;
  /** One plain line under the title. Never a claim the reads do not support. */
  detail: string;
  state: RoadmapStepState;
  /** ISO timestamp this step was reached, when one exists. */
  at?: string;
  /**
   * One short supplementary line — a follow-up reason, a lab order's note —
   * rendered once, under `detail` in the step's always-visible summary.
   *
   * This is the single home for that fact. The expanded body must read it
   * from here rather than re-deriving it from the raw record it came from;
   * two paths to the same fact is how they drift out of sync silently.
   */
  meta?: string;
}

export interface CareRoadmap {
  branch: RoadmapBranch;
  steps: RoadmapStep[];
  /**
   * Index of the furthest step reached, or -1 when none is.
   *
   * The completion animation keys off an increase in this number between
   * renders. It counts `done` steps only: an `active` step is in flight, not
   * reached, and animating it would celebrate something still happening.
   */
  progressIndex: number;
  /** Index of the step to open by default, or -1 for none. */
  focusIndex: number;
}

export interface CareRoadmapInput {
  booking?: BookingListItem;
  intake?: IntakeForm | null;
  education?: ReleasedPatientEducation | null;
  medication?: PatientMedicationLine | null;
  followUp?: FollowUpRecommendation | null;
  labOrder?: LabOrder | null;
}

/** Statuses in which the visit itself is behind the patient. */
const CONSULT_DONE = "completed";
const CONSULT_LIVE = "in_progress";

/**
 * Derive the roadmap, or `null` when there is no journey to draw.
 *
 * `null` is the signal to render the generic explainer instead. It is returned
 * only when there is no booking at all — once a booking exists, even an unpaid
 * one, the patient has a real first step to stand on.
 */
export function deriveCareRoadmap(input: CareRoadmapInput): CareRoadmap | null {
  const { booking } = input;
  if (!booking) return null;
  return input.labOrder
    ? finish("lab", labSteps(input.labOrder))
    : finish("consult", consultSteps(input));
}

/** The lab-result journey: the one branch whose middle step the patient owns. */
function labSteps(order: LabOrder): RoadmapStep[] {
  const uploaded = order.status === "under_review" || order.status === "completed";
  const reviewed = order.status === "completed";

  return [
    {
      id: "lab-ordered",
      title: "Test ordered",
      detail: order.testName || "Your doctor ordered a test",
      state: "done",
      ...(order.orderedAt ? { at: order.orderedAt } : {}),
      ...(order.notes ? { meta: order.notes } : {}),
    },
    {
      id: "lab-upload",
      title: "Upload your result",
      detail: uploaded
        ? "Result received"
        : "Add the result from your lab to continue",
      // The only step on either branch the patient can act on directly.
      state: uploaded ? "done" : "active",
      ...(order.resultUploadedAt ? { at: order.resultUploadedAt } : {}),
    },
    {
      id: "lab-review",
      title: "Doctor review",
      detail: reviewed
        ? "Your doctor has reviewed the result"
        : uploaded
          ? "With your doctor now"
          : "Starts once your result is uploaded",
      state: reviewed ? "done" : uploaded ? "active" : "muted",
      ...(reviewed && order.updatedAt ? { at: order.updatedAt } : {}),
    },
  ];
}

/** The standard consult journey. */
function consultSteps(input: CareRoadmapInput): RoadmapStep[] {
  const { booking, intake, education, medication, followUp } = input;
  const status = booking?.status ?? "";

  return [
    intakeStep(intake, status),
    consultationStep(status, booking?.intakeQueueStatus),
    documentsStep(education, medication, status),
    followUpStep(followUp),
  ];
}

/**
 * Intake: submitted, then acknowledged.
 *
 * `acknowledgedAt` is the strongest trust signal on the whole card — it is the
 * platform stating, from a stored timestamp, that a physician opened what the
 * patient wrote. It is surfaced as its own detail line rather than folded into
 * "submitted".
 */
function intakeStep(
  intake: IntakeForm | null | undefined,
  bookingStatus: string,
): RoadmapStep {
  if (intake?.status === "acknowledged") {
    return {
      id: "intake",
      title: "Intake reviewed",
      detail: "Your doctor has read what you shared",
      state: "done",
      ...(intake.acknowledgedAt ? { at: intake.acknowledgedAt } : {}),
    };
  }
  if (intake?.status === "submitted") {
    return {
      id: "intake",
      title: "Intake submitted",
      detail: "Waiting for your doctor to review it",
      state: "done",
      ...(intake.submittedAt ? { at: intake.submittedAt } : {}),
    };
  }
  // A draft (or nothing yet) is only actionable while the visit is still ahead.
  const ahead = bookingStatus !== CONSULT_DONE && bookingStatus !== "cancelled";
  return {
    id: "intake",
    title: "Share your symptoms",
    detail: ahead
      ? "Tell your doctor what's going on"
      : "No intake was recorded for this visit",
    state: ahead ? "active" : "muted",
  };
}

/**
 * The consultation itself.
 *
 * `intakeQueueStatus === "in_progress"` is the one patient-readable signal that
 * a physician is working on this booking right now (it is written by the
 * doctor-side intake-queue processing route). The entire CDS drafting and
 * generation pipeline is doctor-scoped, so there is no "writing your
 * prescription" state to show and none is invented here.
 */
function consultationStep(
  status: string,
  queue: string | undefined,
): RoadmapStep {
  if (status === CONSULT_DONE) {
    return {
      id: "consultation",
      title: "Consultation complete",
      detail: "You have seen your doctor",
      state: "done",
    };
  }
  if (status === CONSULT_LIVE) {
    return {
      id: "consultation",
      title: "Consultation in progress",
      detail: "You are with your doctor now",
      state: "active",
    };
  }
  if (queue === "in_progress" || queue === "need_review") {
    return {
      id: "consultation",
      title: "Consultation",
      detail: "Your doctor is reviewing your booking",
      state: "active",
    };
  }
  return {
    id: "consultation",
    title: "Consultation",
    detail:
      queue === "ready"
        ? "Your doctor is ready for you"
        : "Starts at your appointment time",
    state: "upcoming",
  };
}

/**
 * Released prescription and guidance.
 *
 * Both `medication` (the latest released `PatientMedicationLine`) and
 * `education` carry `releasedAt`, and either arriving means the step is
 * reached. A patient can be shown neither a medical certificate (no patient
 * read route exists) nor a PDF (document export offers `json` only), so this
 * step promises neither.
 */
function documentsStep(
  education: ReleasedPatientEducation | null | undefined,
  medication: PatientMedicationLine | null | undefined,
  status: string,
): RoadmapStep {
  const at = medication?.releasedAt ?? education?.releasedAt;
  if (at) {
    const parts: string[] = [];
    if (medication) parts.push("Prescription");
    if (education) parts.push("Recovery guidance");
    return {
      id: "documents",
      title: "Care plan released",
      detail: parts.join(" · "),
      state: "done",
      at,
    };
  }
  // Release is possible from the moment the physician confirms an assessment,
  // which is why `in_progress` counts as well as `completed`.
  const releasable = status === CONSULT_LIVE || status === CONSULT_DONE;
  return {
    id: "documents",
    title: "Prescription & guidance",
    detail: releasable ? "Appears here once released" : "Issued after your consultation",
    state: releasable ? "active" : "upcoming",
  };
}

/**
 * The follow-up recommendation.
 *
 * Never `done`: `FollowUpRecommendation` has no completion, status, or
 * acknowledgement field, and there is no check-in submission endpoint anywhere
 * in the contract. Marking it complete would be asserting an outcome nothing
 * recorded.
 */
function followUpStep(
  followUp: FollowUpRecommendation | null | undefined,
): RoadmapStep {
  if (!followUp) {
    return {
      id: "follow-up",
      title: "Follow-up check-in",
      detail: "No follow-up date set",
      state: "muted",
    };
  }
  return {
    id: "follow-up",
    title: "Follow-up check-in",
    detail: `On or before ${followUp.targetDate}`,
    state: "upcoming",
    ...(followUp.reason ? { meta: followUp.reason } : {}),
  };
}

/** Attach the two derived indices. */
function finish(branch: RoadmapBranch, steps: RoadmapStep[]): CareRoadmap {
  let progressIndex = -1;
  for (let i = 0; i < steps.length; i += 1) {
    if (steps[i].state === "done") progressIndex = i;
  }
  const active = steps.findIndex((step) => step.state === "active");
  return {
    branch,
    steps,
    progressIndex,
    // Open what is happening now; fall back to the last thing that completed.
    focusIndex: active !== -1 ? active : progressIndex,
  };
}
