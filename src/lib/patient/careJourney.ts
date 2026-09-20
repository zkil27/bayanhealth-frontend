import type { PatientMedicationLine } from "@/features/patient/lib/api/patientMedications";

import {
  deriveCareRoadmap,
  type CareRoadmapInput,
  type RoadmapStep,
  type RoadmapStepId,
} from "./careRoadmap";

/**
 * The Care Recovery Roadmap's single view model.
 *
 * `deriveCareRoadmap` decides what the reads say; this module decides how that
 * is drawn. Every visual on the card — the ECG line's colour boundary, each
 * node's style, the popovers, the CTA bar, and the mobile stepper — reads
 * {@link JourneyViewModel} and nothing else. No component keeps its own copy of
 * "which step is current" or "what happened at step X", which is how the
 * previous stepper let a clicked tab rewrite statuses and drift from the data.
 *
 * The no-ETA rule from `careRoadmap.ts` (ADR-20260806-02) carries over: no
 * summary, explainer, or CTA here states how long anything takes.
 */

export type JourneyStepStatus = "complete" | "active" | "locked";

export type JourneyPhase = "not-started" | "in-progress" | "complete";

/** Serializable, so the view model stays a plain value tests can compare. */
export interface JourneyAction {
  type: "navigate";
  href: string;
}

export interface JourneyCta {
  label: string;
  action: JourneyAction;
}

export type JourneyDetails =
  | {
      kind: "intake";
      submittedAt?: string;
      acknowledgedAt?: string;
      chiefComplaint?: string;
    }
  | {
      kind: "consultation";
      doctorName?: string;
      department?: string;
      scheduledAt?: string;
    }
  | {
      kind: "documents";
      medications: Array<{ name: string; dose: string; frequency: string }>;
      instructions?: string;
      releasedAt?: string;
    }
  | { kind: "follow-up"; targetDate?: string; reason?: string }
  /** Generic, never personalized: what a step is, not what happened at it. */
  | { kind: "explainer"; text: string };

export interface JourneyStep {
  id: RoadmapStepId;
  index: number;
  label: string;
  status: JourneyStepStatus;
  /**
   * Placement on the desktop ECG chart, in percent of its width (from the
   * left) and height (from the top; smaller is higher). The node, its guide
   * line, its label, its popover anchor, the path checkpoint and the progress
   * boundary all read these two numbers. Tune them in `STEP_COORDINATES`.
   */
  xPosition: number;
  yPosition: number;
  content: {
    summary: string;
    details: JourneyDetails;
    cta?: JourneyCta;
  };
}

/** What the CTA bar shows when there is no current step to read from. */
export interface JourneyBanner {
  label: string;
  summary: string;
  cta?: JourneyCta;
}

export interface JourneyViewModel {
  phase: JourneyPhase;
  steps: JourneyStep[];
  /** The one current step, or -1 when the journey has not started or is done. */
  activeStepIndex: number;
  /** Set only when `activeStepIndex` is -1. */
  banner?: JourneyBanner;
}

export interface CareJourneyInput extends CareRoadmapInput {
  doctor?: { fullName?: string; specialty?: string } | null;
  /** Every released line for this consultation (`medication` is the first). */
  medications?: PatientMedicationLine[];
}

export const START_BANNER: JourneyBanner = {
  label: "Ready to start?",
  summary: "Begin your first consultation",
  cta: {
    label: "Consult Now",
    action: { type: "navigate", href: "/patient/booking/createBooking?mode=on-demand" },
  },
};

export const COMPLETE_BANNER: JourneyBanner = {
  label: "Journey complete",
  summary: "Every step of this visit is done",
};

const LABELS: Record<RoadmapStepId, string> = {
  intake: "Intake",
  consultation: "Consultation",
  documents: "Prescription",
  "follow-up": "Follow-up",
  "lab-ordered": "Test ordered",
  "lab-upload": "Upload result",
  "lab-review": "Doctor review",
};

const EXPLAINERS: Record<RoadmapStepId, string> = {
  intake: "You share your symptoms and history so your doctor can prepare for your visit.",
  consultation: "You meet a PRC-verified doctor at your appointment time.",
  documents:
    "After your consultation, your doctor releases your prescription and recovery guidance here.",
  "follow-up": "If your doctor recommends a check-in, its date appears here.",
  "lab-ordered": "Your doctor orders any tests your care needs.",
  "lab-upload": "You add the result from your lab here.",
  "lab-review": "Your doctor reviews the result you uploaded.",
};

/**
 * Chart coordinates per step, in percent (y from the top; smaller is higher).
 *
 * Milestones are grouped within 18–84% of the width, leaving room for the
 * ECG's lead-in before Intake and its tail after Follow-up. Consultation is the
 * highest milestone; Prescription sits lower after the descent; Follow-up lands
 * at a moderate height. Changing a value here moves the node, guide, label,
 * popover anchor, path checkpoint and progress boundary together.
 */
export const STEP_COORDINATES: Record<RoadmapStepId, { x: number; y: number }> = {
  intake: { x: 18, y: 68 },
  consultation: { x: 42, y: 22 },
  documents: { x: 65, y: 56 },
  "follow-up": { x: 84, y: 42 },
  "lab-ordered": { x: 18, y: 68 },
  "lab-upload": { x: 42, y: 22 },
  "lab-review": { x: 65, y: 56 },
};

/** The steps drawn before any booking exists. */
const ZERO_STATE_IDS: RoadmapStepId[] = ["intake", "consultation", "documents", "follow-up"];

export function buildJourney(input: CareJourneyInput): JourneyViewModel {
  const roadmap = deriveCareRoadmap(input);

  if (!roadmap) {
    return {
      phase: "not-started",
      activeStepIndex: -1,
      banner: START_BANNER,
      steps: ZERO_STATE_IDS.map((id, index) => ({
        id,
        index,
        label: LABELS[id],
        status: "locked",
        xPosition: STEP_COORDINATES[id].x,
        yPosition: STEP_COORDINATES[id].y,
        content: {
          summary: EXPLAINERS[id],
          details: { kind: "explainer", text: EXPLAINERS[id] },
        },
      })),
    };
  }

  const current = currentIndex(roadmap.steps);
  const phase: JourneyPhase = current === -1 ? "complete" : "in-progress";

  const steps = roadmap.steps.map((step, index): JourneyStep => {
    const status: JourneyStepStatus =
      current === -1 || index < current ? "complete" : index === current ? "active" : "locked";
    return {
      id: step.id,
      index,
      label: LABELS[step.id],
      status,
      xPosition: STEP_COORDINATES[step.id].x,
      yPosition: STEP_COORDINATES[step.id].y,
      content: {
        summary: step.detail,
        details:
          status === "locked" ? { kind: "explainer", text: EXPLAINERS[step.id] } : details(step, input),
        ...(status === "active" ? ctaFor(step, input) : {}),
      },
    };
  });

  return {
    phase,
    steps,
    activeStepIndex: current,
    ...(phase === "complete" ? { banner: COMPLETE_BANNER } : {}),
  };
}

/**
 * The one rule that picks the current step: the first step something is
 * genuinely happening on, otherwise the step after the furthest one reached
 * (-1 when that was the last step).
 *
 * A step before it that the derivation marks `muted` (an intake never recorded
 * on a visit that already happened) is behind the patient, so it draws as
 * passed; its summary still says nothing was recorded.
 */
function currentIndex(steps: RoadmapStep[]): number {
  const active = steps.findIndex((step) => step.state === "active");
  if (active !== -1) return active;
  let furthest = -1;
  steps.forEach((step, i) => {
    if (step.state === "done") furthest = i;
  });
  return furthest + 1 < steps.length ? furthest + 1 : -1;
}

function details(step: RoadmapStep, input: CareJourneyInput): JourneyDetails {
  const { booking, intake, doctor, followUp } = input;
  switch (step.id) {
    case "intake":
      return {
        kind: "intake",
        ...(intake?.submittedAt ? { submittedAt: intake.submittedAt } : {}),
        ...(intake?.acknowledgedAt ? { acknowledgedAt: intake.acknowledgedAt } : {}),
        ...(intake?.sections?.purpose?.chiefComplaint
          ? { chiefComplaint: intake.sections.purpose.chiefComplaint }
          : {}),
      };
    case "consultation":
      return {
        kind: "consultation",
        ...(doctor?.fullName ? { doctorName: doctor.fullName } : {}),
        ...(doctor?.specialty ? { department: doctor.specialty } : {}),
        ...(booking?.scheduledAt ? { scheduledAt: booking.scheduledAt } : {}),
      };
    case "documents": {
      const lines = input.medications ?? (input.medication ? [input.medication] : []);
      const instructions = lines
        .map((line) => line.instructions)
        .filter(Boolean)
        .join(" · ");
      return {
        kind: "documents",
        medications: lines.map((line) => ({
          name: line.genericName,
          dose: line.dose,
          frequency: line.frequency,
        })),
        ...(instructions ? { instructions } : {}),
        ...(step.state === "done" && step.at ? { releasedAt: step.at } : {}),
      };
    }
    case "follow-up":
      return {
        kind: "follow-up",
        ...(followUp?.targetDate ? { targetDate: followUp.targetDate } : {}),
        ...(step.meta ? { reason: step.meta } : {}),
      };
    default:
      return { kind: "explainer", text: step.meta ?? EXPLAINERS[step.id] };
  }
}

/** Only the current step carries an action, so there is one next thing to do. */
function ctaFor(step: RoadmapStep, input: CareJourneyInput): { cta?: JourneyCta } {
  const bookingId = input.booking?.bookingId;
  const bookingHref = bookingId ? `/patient/booking/getBooking/${encodeURIComponent(bookingId)}` : null;
  switch (step.id) {
    case "intake":
      return bookingHref
        ? { cta: { label: "Open booking", action: { type: "navigate", href: bookingHref } } }
        : {};
    case "consultation":
      if (input.booking?.status === "in_progress" && bookingId) {
        return {
          cta: {
            label: "Join consultation",
            action: {
              type: "navigate",
              href: `/consultation/room/${encodeURIComponent(bookingId)}`,
            },
          },
        };
      }
      return bookingHref
        ? { cta: { label: "View booking", action: { type: "navigate", href: bookingHref } } }
        : {};
    case "follow-up":
      return input.followUp
        ? {}
        : { cta: { label: "Book follow-up", action: { type: "navigate", href: "/patient/booking" } } };
    default:
      return {};
  }
}
