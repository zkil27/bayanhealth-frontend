"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomBottomModal } from "@/components/ui/custom-bottom-modal";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { PostConsultationSkeleton } from "./PostConsultationSkeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StatusText } from "@/components/ui/status-text";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";
import { cn } from "@/lib/utils";
import { type ArtifactSignatureInput } from "./ArtifactCard";
import { CandidatePicker } from "./CandidatePicker";
import { RedFlagOverrideControl } from "./RedFlagOverrideControl";
import { SendToErControl } from "../emergency/SendToErControl";
import { useFollowUpRecommendation } from "./CareContinuityPanel";
import {
  CHECKLIST_TYPES,
  checklistProgress,
  DeliverablesDeck,
  deriveDeckEntries,
  type ChecklistKey,
} from "./DeliverablesDeck";
import { PatientDetails } from "./PatientDetails";
import { PatientRail } from "./PatientRail";
import {
  ObjectiveIntake,
  ObjectiveSummary,
  SubjectiveIntake,
  SubjectiveSummary,
  subjectiveIntakeSummary,
} from "./SoapSummaryCards";
import { ClinicalNoteField, NotesSaveState, useClinicalNotes } from "./ClinicalNotesCard";
import { WorkspaceHeader } from "./WorkspaceChrome";
import { IntakeBlock, WorkspaceSection } from "./WorkspaceSection";
import { DOCUMENT_STATUS } from "./documentStatus";
import { DocumentSheetModal } from "../documents/DocumentSheetModal";
import {
  deriveFinishReadiness,
  derivePhase,
  hasSafetyLock,
  OUTPUT_LABELS,
  type WorkspacePhase,
} from "./workspacePhase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMyDoctorProfile } from "@/features/doctor/hooks/useMyDoctorProfile";
import {
  ageFromDateOfBirth,
  fetchBookingIntake,
  SEX_LABELS,
  usableAllergyLabel,
  type BookingIntakeForm,
} from "@/features/doctor/lib/api/bookingIntake";
import type {
  CdsAssessment,
  CdsAsyncJob,
  CdsAsyncJobAccepted,
  CdsAsyncJobView,
  CdsCandidateEvaluation,
  CdsDiagnosisCandidatePreview,
  CdsProtectedArtifact,
  CdsProtectedArtifactPayload,
  CdsProtectedOutputType,
} from "@/types/cds-contract";
import {
  acknowledgeRedFlag,
  amendArtifact,
  authorPhysicianOutput,
  cancelAsyncJob,
  clearAssessment,
  confirmAssessment,
  createCandidateEvaluation,
  finalizeArtifact,
  generateProtectedOutput,
  getAssessment,
  getAsyncJob,
  getCandidatePreview,
  getCurrentOutputs,
  getOutputHistory,
  issueGateToken,
  physicianErrorMessage,
  releaseArtifact,
  requiresAuthoritativeRefresh,
  requiresRedFlagAcknowledgment,
  searchCandidates,
  selectCandidate,
  updateConfirmedAssessment,
  updateEditableAssessment,
} from "../../lib/api/assessmentFirst";
import { lockReasonCopy, stepGuidance } from "../../lib/cdsCopy";

const outputLabels = OUTPUT_LABELS;
const terminalJobs = new Set([
  "completed",
  "cancelled",
  "rejected_stale",
  "failed_terminal",
  "recovery_required",
  "failed",
]);

function gateAuthorityKey(state: CdsAssessment): string {
  return [
    state.assessmentVersion,
    state.assignmentRevision,
    state.clinicalInputRevision,
    state.clinicalInputSourceFence,
    state.gateRevision,
    state.policyActivationRevision,
  ].join(":");
}

export function AssessmentFirstWorkspace({
  consultationId,
  bookingId,
}: {
  consultationId: string;
  /**
   * Booking this consultation belongs to. Carried through so the patient rail
   * can read the real intake, which is addressed by booking id rather than
   * consultation id.
   */
  bookingId?: string;
}) {
  const session = useAuthStore((state) => state.session);
  const isDemo = consultationId === "demo" || consultationId === "demo-consult";
  const token = session?.idToken ?? (isDemo ? "demo-token" : "");
  const physicianActorId = session?.userId ?? (isDemo ? "demo-doctor" : "");
  /**
   * On a phone each phase is its own screen and an open document is a screen
   * of its own (doctor-mobile PLAN.md §5.4). Both live in the URL (`?view=`,
   * `?doc=`), written with the native History API so there is no server round
   * trip, which makes the phone's back gesture step back through them instead
   * of leaving the workspace, and lets a reload land where the doctor was.
   */
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const docParam = searchParams.get("doc");
  const isPhone = useIsBreakpoint("max", 1024);
  /**
   * The doctor's stored signature specimen. Read here rather than inside each
   * artifact card so seven cards share one request, and so a doctor who has not
   * set one up is told once, in the card they are actually trying to sign.
   */
  const { profile: doctorProfile } = useMyDoctorProfile();

  const [assessment, setAssessment] = useState<CdsAssessment | null>(null);
  const [draftDiagnosis, setDraftDiagnosis] = useState("");
  /**
   * The physician's ICD-10 code for the diagnosis (ADR-20261006-02). Prefilled
   * from the server's reviewed map when the diagnosis is a catalog entry, and
   * never overwritten once the physician has typed in it.
   */
  const [draftIcd, setDraftIcd] = useState<IcdDraft>(EMPTY_ICD_DRAFT);
  const icdTouchedRef = useRef(false);
  const [evaluation, setEvaluation] = useState<CdsCandidateEvaluation | null>(null);
  const [preview, setPreview] = useState<CdsDiagnosisCandidatePreview | null>(null);
  const [focusedCandidate, setFocusedCandidate] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  /**
   * Whether a live, as-you-type refinement of the candidate list is in flight.
   *
   * The picker used to carry its own "Search diagnosis names" field, a second
   * text box next to the one the physician actually writes their diagnosis
   * into — confusing on its own, and it meant typing in the real field did
   * nothing until the physician noticed the other box and used it. There is
   * now exactly one field. What the physician types into it both is the
   * diagnosis and drives the suggestion list, debounced below.
   */
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [gateToken, setGateToken] = useState<{
    value: string;
    expiresAt: string;
    authorityKey: string;
  } | null>(null);
  const [jobs, setJobs] = useState<Record<string, CdsAsyncJobView | CdsAsyncJobAccepted>>({});
  const [current, setCurrent] = useState<CdsProtectedArtifact[]>([]);
  const [history, setHistory] = useState<CdsProtectedArtifact[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | undefined>();
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Which output types are being drafted right now.
   *
   * Deliberately a set rather than the single global `busy` flag drafting used
   * to share with everything else. That flag disabled the whole page for the
   * duration of a generation, so pressing a second tool while the first was
   * still running did nothing at all — no queue, no feedback, no error. Drafting
   * is per-type and concurrent; only the assessment-level commands, which
   * genuinely conflict with each other, still take `busy`.
   */
  const [generating, setGenerating] = useState<ReadonlySet<CdsProtectedOutputType>>(new Set());
  const [activeDeliverable, setActiveDeliverable] = useState<ChecklistKey | null>(null);
  /**
   * Output types the physician explicitly discarded or removed during this session.
   * Excluded from active tabs, deliverables deck, and finish-documentation warnings.
   */
  const [discardedTypes, setDiscardedTypes] = useState<Set<CdsProtectedOutputType>>(new Set());
  const [inspectingHistoricalArtifact, setInspectingHistoricalArtifact] =
    useState<CdsProtectedArtifact | null>(null);
  const liveCurrent = useMemo(
    () => current.filter((item) => !discardedTypes.has(item.outputType)),
    [current, discardedTypes],
  );
  /**
   * "Not needed" is the physician's call about this consultation, so it should
   * survive the reload or dropped tab that a phone between rounds will cause.
   * Kept in this browser only (the server has no field for it), per
   * consultation, and read defensively: storage may be unavailable.
   */
  const notNeededKey = `bh:post-consult:not-needed:${consultationId}`;
  const [notNeededLoaded, setNotNeededLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(notNeededKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading an external store once on mount.
      if (Array.isArray(parsed)) setDiscardedTypes(new Set(parsed as CdsProtectedOutputType[]));
    } catch {
      // Storage unavailable: fall back to this session only.
    }
    setNotNeededLoaded(true);
  }, [notNeededKey]);
  useEffect(() => {
    if (!notNeededLoaded) return;
    try {
      window.localStorage.setItem(notNeededKey, JSON.stringify([...discardedTypes]));
    } catch {
      // Storage unavailable: the marking still holds for this session.
    }
  }, [discardedTypes, notNeededKey, notNeededLoaded]);
  /**
   * Which SOAP sections the physician has folded or unfolded by hand, for the
   * phase they did it in. Each phase has its own defaults (Deliver folds S, O
   * and A so the documents come first); a manual toggle overrides them until
   * the phase changes.
   */
  const [sectionOverrides, setSectionOverrides] = useState<Partial<Record<"S" | "O" | "A", boolean>>>({});
  const [overridesPhase, setOverridesPhase] = useState<WorkspacePhase | null>(null);
  const [patientRailCollapsed, setPatientRailCollapsed] = useState(false);
  /**
   * Below `lg` the patient rail is not a column: stacked under the main
   * column it ended up past Care Continuity and the history list, a long
   * scroll away from the prescription being written. It opens as a sheet from
   * the header instead (see `mobileIntakeOpen` usage below).
   */
  const [mobileIntakeOpen, setMobileIntakeOpen] = useState(false);
  const previewRequestRef = useRef(0);
  const candidateSearchRequestRef = useRef(0);
  /**
   * A gate-token issuance already in flight.
   *
   * Two drafts started in the same tick both read `gateToken` as `null` from
   * the same render's closure and would each mint one. Issuing twice is safe —
   * the server does not revoke the earlier token, it only condition-checks the
   * family epoch — but it is two round trips and two audit records for one
   * physician action, so the second await joins the first.
   */
  const gateIssueRef = useRef<{
    authorityKey: string;
    promise: Promise<string>;
  } | null>(null);
  const gateAuthorityKeyRef = useRef<string | null>(null);
  const candidateIssueRef = useRef(false);
  const acknowledgmentIssueRef = useRef(false);
  const [acknowledgmentReady, setAcknowledgmentReady] = useState(false);
  /**
   * The patient's own intake, read once here and handed to the rail.
   *
   * `undefined` means still loading; `null` means there is no intake.
   */
  const [intake, setIntake] = useState<BookingIntakeForm | null | undefined>(undefined);
  const notes = useClinicalNotes({ consultationId, token, intake });
  const followUp = useFollowUpRecommendation(consultationId, token);

  const markGenerating = useCallback((outputType: CdsProtectedOutputType, active: boolean) => {
    setGenerating((known) => {
      const next = new Set(known);
      if (active) next.add(outputType);
      else next.delete(outputType);
      return next;
    });
  }, []);

  const resetDerived = useCallback(() => {
    previewRequestRef.current += 1;
    candidateSearchRequestRef.current += 1;
    gateAuthorityKeyRef.current = null;
    setEvaluation(null);
    setPreview(null);
    setFocusedCandidate(null);
    setSearching(false);
    setCursor(undefined);
    setGateToken(null);
    setAcknowledgmentReady(false);
  }, []);

  /**
   * PRD v3.2 §4.2: the Assessment control MUST initialize empty, and §4.1's
   * "Assessment open" state specifies a blank Assessment field beside the
   * diagnosis-name suggestions. So the field is seeded ONLY from a
   * server-confirmed diagnosis; while unconfirmed it stays empty rather than
   * pre-filling `editableDiagnosis`.
   */
  const seedDraft = useCallback((next: CdsAssessment) => {
    setDraftDiagnosis(next.confirmed?.diagnosis ?? "");
    icdTouchedRef.current = false;
    setDraftIcd(next.confirmed?.icd10 ? icdDraftFrom(next.confirmed.icd10) : EMPTY_ICD_DRAFT);
  }, []);

  /** Offer the map's code for the saved diagnosis, unless the physician already chose one. */
  const prefillIcd = useCallback((next: CdsAssessment) => {
    if (icdTouchedRef.current) return;
    setDraftIcd(next.editableIcd10Suggestion ? icdDraftFrom(next.editableIcd10Suggestion) : EMPTY_ICD_DRAFT);
  }, []);

  const editDraftIcd = useCallback((next: IcdDraft) => {
    icdTouchedRef.current = true;
    setDraftIcd(next);
  }, []);

  const refreshAssessment = useCallback(async () => {
    if (!token) return;
    const next = await getAssessment(consultationId, token);
    setAssessment(next);
    seedDraft(next);
  }, [consultationId, token, seedDraft]);

  const refreshOutputs = useCallback(async () => {
    if (!token) return;
    const [currentResponse, historyResponse] = await Promise.all([
      getCurrentOutputs(consultationId, token),
      getOutputHistory(consultationId, token),
    ]);
    setCurrent(currentResponse.outputs);
    setHistory(historyResponse.data.outputs);
    setHistoryCursor(historyResponse.cursor);
  }, [consultationId, token]);

  useEffect(() => {
    let cancelled = false;
    // Wait for the session to hydrate before reading. Without this guard the
    // first render fires the read with an empty token, the server answers 401,
    // and a false "session expired" banner sits above a perfectly loaded
    // consultation for the rest of the visit.
    if (!token) return;
    getAssessment(consultationId, token)
      .then((next) => {
        if (cancelled) return;
        setAssessment(next);
        seedDraft(next);
        setInitialLoadError(null);
      })
      .catch((cause) => !cancelled && setInitialLoadError(physicianErrorMessage(cause)));
    void refreshOutputs().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [consultationId, token, refreshOutputs, seedDraft]);

  useEffect(() => {
    if (!token || !bookingId) {
      setIntake(null);
      return;
    }
    let cancelled = false;
    fetchBookingIntake(token, bookingId)
      .then((form) => !cancelled && setIntake(form))
      // The intake is context, not a gate input. A failed read must not take the
      // workspace down with it, so the rail shows its own unavailable state.
      .catch(() => !cancelled && setIntake(null));
    return () => {
      cancelled = true;
    };
  }, [token, bookingId]);

  useEffect(() => {
    if (!gateToken) return;
    const delay = Math.min(2_147_000_000, Math.max(0, Date.parse(gateToken.expiresAt) - Date.now()));
    // Expiry is silent now. Drafting re-authorises itself on demand (see
    // `ensureGate`), so announcing the expiry would be telling the physician
    // about a mechanism they no longer have to act on.
    const timer = window.setTimeout(() => setGateToken(null), delay);
    return () => window.clearTimeout(timer);
  }, [gateToken]);

  useEffect(() => {
    const active = Object.values(jobs).filter(
      (job) => !("authoritative" in job) || (job.authoritative && !terminalJobs.has(job.status)),
    );
    if (active.length === 0 || !token) return;
    const timer = window.setInterval(() => {
      void Promise.all(active.map((job) => getAsyncJob(consultationId, job.jobId, token)))
        .then((updated) => {
          setJobs((known) =>
            Object.fromEntries([
              ...Object.entries(known),
              ...updated.map((job) => [job.jobId, job] as const),
            ]),
          );
          // A background draft that has reached any terminal state is no longer
          // generating, whether it succeeded or not. Without this the tab's
          // spinner and the rail's row would spin forever on a failed job.
          for (const job of updated) {
            if (terminalJobs.has(job.status) && "outputType" in job && job.outputType) {
              markGenerating(job.outputType as CdsProtectedOutputType, false);
            }
          }
          if (updated.some((job) => job.authoritative && job.status === "completed")) {
            void refreshOutputs();
          }
        })
        .catch(() =>
          toast.error("Draft status is temporarily unavailable. It will keep retrying on its own.", {
            id: "draft-status-poll-error",
          }),
        );
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [consultationId, jobs, refreshOutputs, token, markGenerating]);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      try {
        await action();
      } catch (cause) {
        if (requiresAuthoritativeRefresh(cause)) {
          resetDerived();
          await refreshAssessment().catch(() => undefined);
          toast.error(
            `${physicianErrorMessage(cause)} Authoritative state was refreshed; review it before retrying.`,
          );
        } else {
          toast.error(physicianErrorMessage(cause));
        }
      } finally {
        setBusy(false);
      }
    },
    [refreshAssessment, resetDerived],
  );

  const candidateSuppressed =
    evaluation?.routing.outcome === "REFER_F2F" || evaluation?.routing.outcome === "EMERGENCY";
  const allowedTypes = useMemo(
    () =>
      assessment?.confirmed?.generationEligibility?.eligibleOutputTypes
      ?? (assessment as unknown as { allowedOutputTypes?: CdsProtectedOutputType[] })?.allowedOutputTypes
      ?? [],
    [assessment],
  );

  /**
   * Obtain a currently-valid drafting authorisation, issuing one if needed.
   *
   * The gate has not changed: the server still re-checks safety, assignment,
   * clinical input and policy on every issue, and still refuses to draft without
   * a live token. What changed is who presses the button. "Re-check safety and
   * unlock" was a manual step sitting in a different column from the Assessment
   * that had just been confirmed and the tools it unlocked, so the physician's
   * next action after confirming was to hunt for an unrelated-looking control.
   * Confirmation now issues the token, and drafting re-issues it on demand when
   * it has lapsed — the check runs exactly as often, with the physician no longer
   * being asked to trigger it by hand.
   */
  const ensureGate = useCallback(
    async (state: CdsAssessment, force = false): Promise<string> => {
      const authorityKey = gateAuthorityKey(state);
      gateAuthorityKeyRef.current = authorityKey;
      if (
        !force
        && gateToken?.authorityKey === authorityKey
        && Date.parse(gateToken.expiresAt) > Date.now() + 5_000
      ) {
        return gateToken.value;
      }
      if (gateIssueRef.current?.authorityKey === authorityKey) {
        return gateIssueRef.current.promise;
      }
      const pending = issueGateToken(consultationId, token, {
        consultationId,
        physicianActorId,
        assessmentVersion: state.assessmentVersion,
        expectedAssignmentRevision: state.assignmentRevision,
        expectedClinicalInputRevision: state.clinicalInputRevision,
        expectedClinicalInputSourceFence: state.clinicalInputSourceFence,
        expectedGateRevision: state.gateRevision,
        expectedPolicyActivationRevision: state.policyActivationRevision,
      }).then((issued) => {
        if (gateAuthorityKeyRef.current === authorityKey) {
          setGateToken({ value: issued.gateToken, expiresAt: issued.expiresAt, authorityKey });
        }
        return issued.gateToken;
      });
      const issuance = { authorityKey, promise: pending };
      gateIssueRef.current = issuance;
      try {
        return await pending;
      } finally {
        if (gateIssueRef.current === issuance) gateIssueRef.current = null;
      }
    },
    [consultationId, gateToken, physicianActorId, token],
  );

  /**
   * Which of PRD v3.2 §4.1's doctor-facing states this consultation is in, and
   * the single next step for it.
   */
  const guidance = useMemo(
    () =>
      assessment
        ? stepGuidance({
            confirmed: Boolean(assessment.confirmed),
            lockReasons: assessment.lockReasons,
            draftingAuthorized: assessment.lockReasons.length === 0,
            eligibleOutputCount: allowedTypes.length,
            hasCandidates: Boolean(evaluation && !candidateSuppressed),
          })
        : null,
    [assessment, allowedTypes.length, evaluation, candidateSuppressed],
  );

  const saveManual = () =>
    assessment &&
    run(async () => {
      const next = await updateEditableAssessment(consultationId, token, {
        consultationId,
        physicianActorId,
        diagnosis: draftDiagnosis.trim(),
        expectedAssessmentVersion: assessment.assessmentVersion,
        expectedEditableAssessmentRevision: assessment.editableAssessmentRevision,
        expectedEditableAssessmentDigest: assessment.editableAssessmentDigest,
        expectedAssignmentRevision: assessment.assignmentRevision,
        expectedGateRevision: assessment.gateRevision,
      });
      setAssessment(next);
      prefillIcd(next);
      resetDerived();
      toast.success("Draft saved. Nothing can be drafted from it until you confirm it.");
    });

  const confirm = () =>
    assessment &&
    draftDiagnosis.trim() &&
    run(async () => {
      const diagnosis = draftDiagnosis.trim();
      let confirmationSource = assessment;

      // A typed diagnosis and a selected suggestion now follow the same path.
      // Saving a draft remains optional, but Confirm first persists the current
      // field when needed so the physician is not forced through two buttons.
      if (diagnosis !== assessment.editableDiagnosis.trim()) {
        confirmationSource = await updateEditableAssessment(consultationId, token, {
          consultationId,
          physicianActorId,
          diagnosis,
          expectedAssessmentVersion: assessment.assessmentVersion,
          expectedEditableAssessmentRevision: assessment.editableAssessmentRevision,
          expectedEditableAssessmentDigest: assessment.editableAssessmentDigest,
          expectedAssignmentRevision: assessment.assignmentRevision,
          expectedGateRevision: assessment.gateRevision,
        });
        setAssessment(confirmationSource);
      }

      // The code is the physician's. When the map has one for this diagnosis
      // and the physician has not chosen their own, show it and stop: they
      // confirm what they have seen, never a code filled in on the way past.
      // An untouched draft holds only an earlier prefill, which may belong to
      // a different diagnosis.
      const suggestion = confirmationSource.editableIcd10Suggestion;
      if (!icdTouchedRef.current && suggestion && draftIcd.code.trim().toUpperCase() !== suggestion.code) {
        setDraftIcd(icdDraftFrom(suggestion));
        toast.info(`ICD-10 ${suggestion.code} is prefilled for ${diagnosis}. Check it, then confirm.`);
        return;
      }
      if (!icdTouchedRef.current && !suggestion && draftIcd.code.trim()) {
        setDraftIcd(EMPTY_ICD_DRAFT);
        toast.error("This diagnosis has no prefilled ICD-10 code. Enter the code before confirming.");
        return;
      }
      const icd10 = icdFromDraft(draftIcd);
      if (!icd10) {
        toast.error("Enter the ICD-10 code and its description for this diagnosis before confirming.");
        return;
      }

      const next = await confirmAssessment(consultationId, token, {
        consultationId,
        physicianActorId,
        icd10,
        expectedAssessmentVersion: confirmationSource.assessmentVersion,
        expectedEditableAssessmentRevision: confirmationSource.editableAssessmentRevision,
        expectedEditableAssessmentDigest: confirmationSource.editableAssessmentDigest,
        expectedAssignmentRevision: confirmationSource.assignmentRevision,
        expectedClinicalInputRevision: confirmationSource.clinicalInputRevision,
        expectedClinicalInputSourceFence: confirmationSource.clinicalInputSourceFence,
        expectedGateRevision: confirmationSource.gateRevision,
      });
      setAssessment(next);
      seedDraft(next);
      resetDerived();
      // Confirming is the physician saying "this is my diagnosis". Unlocking is
      // the server saying "and the record still supports it". Making the second
      // a separate button the physician had to find meant every confirmation was
      // followed by a dead-looking rail. Issued straight away, against the
      // freshly returned state so the fences are the ones the server just wrote.
      try {
        await ensureGate(next);
        toast.success(
          "Assessment confirmed. Plan & documents are open: start any document from its row.",
        );
      } catch (cause) {
        resetDerived();
        await refreshAssessment().catch(() => undefined);
        if (requiresRedFlagAcknowledgment(cause)) {
          setAcknowledgmentReady(true);
          toast.warning(
            "Assessment confirmed and safety re-check complete. Acknowledge the current finding to continue.",
          );
        } else {
          toast.error(
            `${physicianErrorMessage(cause)} Drafting could not be unlocked automatically — review the current state before retrying.`,
          );
        }
      }
    });

  const updateOrReattest = (changeType: "update" | "reattest") =>
    assessment?.confirmed &&
    run(async () => {
      const icd10 = changeType === "reattest" ? assessment.confirmed!.icd10 : icdFromDraft(draftIcd);
      if (!icd10) {
        toast.error(
          changeType === "reattest"
            ? "This version has no ICD-10 code. Add one and save a new version instead."
            : "Enter the ICD-10 code and its description before saving a new version.",
        );
        return;
      }
      const next = await updateConfirmedAssessment(consultationId, token, {
        consultationId,
        physicianActorId,
        changeType,
        diagnosis: changeType === "reattest" ? assessment.confirmed!.diagnosis : draftDiagnosis.trim(),
        icd10,
        expectedAssessmentVersion: assessment.assessmentVersion,
        expectedConfirmedAssessmentDigest: assessment.confirmed!.confirmedAssessmentDigest,
        expectedAssignmentRevision: assessment.assignmentRevision,
        expectedClinicalInputRevision: assessment.clinicalInputRevision,
        expectedClinicalInputSourceFence: assessment.clinicalInputSourceFence,
        expectedGateRevision: assessment.gateRevision,
      });
      setAssessment(next);
      seedDraft(next);
      resetDerived();
      await refreshOutputs();
      try {
        await ensureGate(next);
      } catch (cause) {
        resetDerived();
        await refreshAssessment().catch(() => undefined);
        if (requiresRedFlagAcknowledgment(cause)) setAcknowledgmentReady(true);
      }
      toast.success(
        changeType === "reattest"
          ? "Assessment re-attested under your name."
          : "Assessment updated. Earlier drafts are now out of date and moved to history.",
      );
    });

  const clear = () =>
    assessment?.confirmed &&
    run(async () => {
      const next = await clearAssessment(consultationId, token, {
        consultationId,
        physicianActorId,
        expectedAssessmentVersion: assessment.assessmentVersion,
        expectedConfirmedAssessmentDigest: assessment.confirmed!.confirmedAssessmentDigest,
        expectedEditableAssessmentRevision: assessment.editableAssessmentRevision,
        expectedAssignmentRevision: assessment.assignmentRevision,
        expectedClinicalInputRevision: assessment.clinicalInputRevision,
        expectedClinicalInputSourceFence: assessment.clinicalInputSourceFence,
        expectedGateRevision: assessment.gateRevision,
      });
      setAssessment(next);
      seedDraft(next);
      resetDerived();
      await refreshOutputs();
      toast.info("Assessment cleared. Drafting stays closed until you confirm a new Assessment.");
    });

  const startEvaluation = () => {
    if (!assessment || candidateIssueRef.current) return;
    candidateIssueRef.current = true;
    void run(async () => {
      setEvaluation(null);
      setPreview(null);
      setFocusedCandidate(null);
      const next = await createCandidateEvaluation(consultationId, token, {
        consultationId,
        physicianActorId,
        expectedAssessmentVersion: assessment.assessmentVersion,
        expectedEditableAssessmentRevision: assessment.editableAssessmentRevision,
        expectedEditableAssessmentDigest: assessment.editableAssessmentDigest,
        expectedAssignmentRevision: assessment.assignmentRevision,
        expectedClinicalInputRevision: assessment.clinicalInputRevision,
        expectedClinicalInputSourceFence: assessment.clinicalInputSourceFence,
        expectedGateRevision: assessment.gateRevision,
        expectedPolicyActivationRevision: assessment.policyActivationRevision,
      });
      setEvaluation(next);
      setCursor(undefined);

      // Candidate-stage safety evaluation can advance gate state. Keep the
      // physician's local diagnosis text, but refresh the authority fences
      // before any later selection, confirmation, or safety action.
      const authoritative = await getAssessment(consultationId, token);
      setAssessment(authoritative);
    }).finally(() => {
      candidateIssueRef.current = false;
    });
  };

  /**
   * Kept out of `evaluation` (a plain dependency would recreate `runCandidateSearch`
   * on every response, and its own debounce effect below closes over it) so the
   * debounced live search and the "Load more names" pager can both call a
   * function with a stable identity while still always targeting the current
   * evaluation.
   */
  const evaluationIdRef = useRef<string | null>(null);
  useEffect(() => {
    evaluationIdRef.current = evaluation?.evaluationId ?? null;
  }, [evaluation?.evaluationId]);

  /**
   * Refine the current candidate evaluation by name, appending on `cursor` or
   * replacing the list otherwise.
   *
   * This is what used to be two separate things: a debounced call for the one
   * diagnosis field's live filtering, and an explicit "Search" button press in
   * the picker's own second text box. One function now serves both — the
   * physician's typed diagnosis is the query either way — and it is
   * deliberately not routed through `run`: filtering a suggestion list as
   * someone types is a read, and putting it behind the page-wide `busy` flag
   * would have frozen every other control on the page on each keystroke.
   */
  const runCandidateSearch = useCallback(
    (query: string, cursor?: string) => {
      const evaluationId = evaluationIdRef.current;
      const normalizedQuery = query.normalize("NFKC").trim().replace(/\s+/gu, " ");
      if (!evaluationId || (normalizedQuery.length > 0 && normalizedQuery.length < 2)) return;
      const requestId = ++candidateSearchRequestRef.current;
      setSearching(true);
      searchCandidates(consultationId, evaluationId, token, {
        query: normalizedQuery || undefined,
        cursor,
        limit: 10,
      })
        .then((page) => {
          if (
            evaluationIdRef.current !== evaluationId
            || candidateSearchRequestRef.current !== requestId
          ) return;
          setEvaluation((known) =>
            known && cursor
              ? { ...page.data, candidates: [...known.candidates, ...page.data.candidates] }
              : page.data,
          );
          setCursor(page.cursor);
        })
        .catch(async (cause) => {
          if (
            evaluationIdRef.current !== evaluationId
            || candidateSearchRequestRef.current !== requestId
          ) return;
          if (requiresAuthoritativeRefresh(cause)) {
            resetDerived();
            const recoveryRequestId = candidateSearchRequestRef.current;
            const authoritative = await getAssessment(consultationId, token).catch(() => null);
            if (candidateSearchRequestRef.current !== recoveryRequestId) return;
            if (authoritative) {
              setAssessment(authoritative);
              seedDraft(authoritative);
            }
            toast.error(
              authoritative
                ? `${physicianErrorMessage(cause)} Authoritative state was refreshed; review it before retrying.`
                : `${physicianErrorMessage(cause)} Refresh to load current state before retrying.`,
            );
          } else {
            toast.error(physicianErrorMessage(cause));
          }
        })
        .finally(() => {
          if (candidateSearchRequestRef.current === requestId) setSearching(false);
        });
    },
    [consultationId, resetDerived, seedDraft, token],
  );

  const updateDraftDiagnosis = useCallback((diagnosis: string) => {
    const normalized = diagnosis.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (normalized.length < 2) {
      candidateSearchRequestRef.current += 1;
      setSearching(false);
    }
    setDraftDiagnosis(diagnosis);
  }, []);

  /**
   * Debounced live filtering of the candidate list as the physician types
   * their diagnosis. The evaluation itself is created on first focus (see the
   * Assessment field's `onFocus` below); this only refines it, and only once
   * one exists — an empty query is left alone rather than re-fetched, since
   * the freshly created evaluation already holds the unfiltered, intake-based
   * list `startEvaluation` loaded.
   */
  useEffect(() => {
    const normalizedDiagnosis = draftDiagnosis.normalize("NFKC").trim().replace(/\s+/gu, " ");
    if (!assessment || assessment.confirmed || !evaluation || normalizedDiagnosis.length < 2) return;
    const timer = window.setTimeout(() => runCandidateSearch(normalizedDiagnosis), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `evaluation` is read only to gate on existence; keying on the object would re-run this on every search response.
  }, [draftDiagnosis, Boolean(evaluation), assessment?.confirmed, runCandidateSearch]);

  /**
   * Load one candidate's guideline preview.
   *
   * Not routed through `run`: previewing is a read the physician performs while
   * deciding, and putting it behind the page-wide `busy` flag meant reading
   * about one diagnosis disabled the ability to read about the next.
   */
  const loadPreview = useCallback(
    (diagnosisName: string) => {
      if (!evaluation || candidateSuppressed) return;
      const requestId = ++previewRequestRef.current;
      setFocusedCandidate(diagnosisName);
      setPreview(null);
      setPreviewLoading(true);
      getCandidatePreview(consultationId, evaluation.evaluationId, diagnosisName, token)
        .then((next) => {
          if (requestId !== previewRequestRef.current) return;
          if (next.diagnosisName === diagnosisName) setPreview(next);
        })
        .catch((cause) => {
          if (requestId === previewRequestRef.current) toast.error(physicianErrorMessage(cause));
        })
        .finally(() => {
          if (requestId === previewRequestRef.current) setPreviewLoading(false);
        });
    },
    [candidateSuppressed, consultationId, evaluation, token],
  );

  const chooseCandidate = (diagnosisName: string) =>
    assessment &&
    evaluation &&
    run(async () => {
      const next = await selectCandidate(consultationId, evaluation.evaluationId, token, {
        consultationId,
        physicianActorId,
        evaluationId: evaluation.evaluationId,
        diagnosisName,
        expectedAssessmentVersion: assessment.assessmentVersion,
        expectedEditableAssessmentRevision: assessment.editableAssessmentRevision,
        expectedEditableAssessmentDigest: assessment.editableAssessmentDigest,
        expectedAssignmentRevision: evaluation.assignmentRevision,
        expectedClinicalInputRevision: evaluation.clinicalInputRevision,
        expectedClinicalInputSourceFence: evaluation.clinicalInputSourceFence,
        expectedNormalizedInputDigest: evaluation.normalizedInputDigest,
        expectedRulesetVersion: evaluation.rulesetVersion,
        expectedCatalogVersion: evaluation.catalogVersion,
        expectedPolicyActivationRevision: evaluation.policyActivationRevision,
      });
      setAssessment(next);
      setDraftDiagnosis(next.editableDiagnosis);
      prefillIcd(next);
      setEvaluation(null);
      setPreview(null);
      setFocusedCandidate(null);
      toast.info(
        `${diagnosisName} is your working diagnosis. Check the ICD-10 code, then confirm.`,
      );
    });

  /**
   * Re-run the safety check by hand.
   *
   * Kept only for the states where drafting is actually held — a lock the
   * physician has just resolved, or a re-locked rail. In the ordinary path
   * `confirm` and `generate` do this themselves.
   */
  const requestToken = () =>
    assessment?.confirmed &&
    run(async () => {
      setGateToken(null);
      setAcknowledgmentReady(false);
      try {
        await ensureGate(assessment, true);
        toast.success("Safety re-checked. Drafting is open again.");
      } catch (cause) {
        if (!requiresRedFlagAcknowledgment(cause)) throw cause;

        // Issuance persists a fresh generation-stage safety evaluation before
        // it reports that the existing episode still needs acknowledgment.
        // Refresh the advanced gate revision, then expose exactly that next
        // physician action instead of repeatedly submitting stale fences.
        resetDerived();
        await refreshAssessment();
        setAcknowledgmentReady(true);
        toast.warning("Safety re-check complete. Acknowledge the current finding to continue.");
      }
    });

  const acknowledge = () => {
    if (!assessment?.clinicalSafetyEpisodeId || !acknowledgmentReady || acknowledgmentIssueRef.current) {
      return;
    }
    acknowledgmentIssueRef.current = true;
    void run(async () => {
      await acknowledgeRedFlag(consultationId, token, {
        consultationId,
        physicianActorId,
        clinicalSafetyEpisodeId: assessment.clinicalSafetyEpisodeId!,
        expectedAssessmentVersion: assessment.assessmentVersion,
        expectedAssignmentRevision: assessment.assignmentRevision,
        expectedClinicalInputRevision: assessment.clinicalInputRevision,
        expectedClinicalInputSourceFence: assessment.clinicalInputSourceFence,
        expectedGateRevision: assessment.gateRevision,
        expectedPolicyActivationRevision: assessment.policyActivationRevision,
        acknowledged: true,
        mode: "routine_reevaluation",
      });
      resetDerived();
      await refreshAssessment();
      toast.info("Safety finding acknowledged. Re-run the safety check to reopen drafting.");
    }).finally(() => {
      acknowledgmentIssueRef.current = false;
    });
  };

  /**
   * The physician proceeds past the current red flag on their own clinical
   * judgment (ADR-20261005-01). No routine re-check is needed; the server pins
   * the override to this exact episode.
   */
  const proceedOnJudgment = (overrideReason: string) => {
    if (!assessment?.clinicalSafetyEpisodeId || acknowledgmentIssueRef.current) return;
    acknowledgmentIssueRef.current = true;
    void run(async () => {
      await acknowledgeRedFlag(consultationId, token, {
        consultationId,
        physicianActorId,
        clinicalSafetyEpisodeId: assessment.clinicalSafetyEpisodeId!,
        expectedAssessmentVersion: assessment.assessmentVersion,
        expectedAssignmentRevision: assessment.assignmentRevision,
        expectedClinicalInputRevision: assessment.clinicalInputRevision,
        expectedClinicalInputSourceFence: assessment.clinicalInputSourceFence,
        expectedGateRevision: assessment.gateRevision,
        expectedPolicyActivationRevision: assessment.policyActivationRevision,
        acknowledged: true,
        mode: "physician_override",
        overrideReason,
      });
      resetDerived();
      await refreshAssessment();
      toast.success("Proceeding on your clinical judgment. A new red flag will pause drafting again.");
    }).finally(() => {
      acknowledgmentIssueRef.current = false;
    });
  };

  /**
   * Draft one protected output.
   *
   * Runs outside `busy` so several documents can be in flight at once and the
   * rest of the page stays usable while they are. Each type carries its own
   * in-flight marker, which is what the deck tab and the rail row read.
   */
  const generate = useCallback(
    async (outputType: CdsProtectedOutputType) => {
      if (!assessment?.confirmed || generating.has(outputType)) return;
      // Re-enable this output type if it was previously discarded
      setDiscardedTypes((prev) => {
        if (!prev.has(outputType)) return prev;
        const next = new Set(prev);
        next.delete(outputType);
        return next;
      });
      markGenerating(outputType, true);
      setActiveDeliverable(outputType);
      try {
        const gate = await ensureGate(assessment);
        const result = await generateProtectedOutput(consultationId, token, outputType, {
          consultationId,
          physicianActorId,
          assessmentVersion: assessment.assessmentVersion,
          gateToken: gate,
        });
        if (result.kind === "accepted") {
          // The job keeps the type marked as generating; the poller clears it
          // when the job reaches a terminal state.
          setJobs((known) => ({ ...known, [result.job.jobId]: result.job }));
          toast.info(
            `${outputLabels[outputType]} is taking longer than usual, so the server is finishing it in the background.`,
          );
        } else {
          markGenerating(outputType, false);
          await refreshOutputs();
          toast.success(`${outputLabels[outputType]} drafted. Read it, edit if needed, then sign.`);
        }
      } catch (cause) {
        markGenerating(outputType, false);
        if (requiresAuthoritativeRefresh(cause)) {
          resetDerived();
          await refreshAssessment().catch(() => undefined);
          toast.error(
            `${physicianErrorMessage(cause)} Authoritative state was refreshed; review it before retrying.`,
          );
        } else {
          toast.error(physicianErrorMessage(cause));
        }
      }
    },
    [
      assessment,
      consultationId,
      ensureGate,
      generating,
      markGenerating,
      physicianActorId,
      refreshAssessment,
      refreshOutputs,
      resetDerived,
      token,
    ],
  );

  const cancelJob = (job: CdsAsyncJob | CdsAsyncJobAccepted) =>
    run(async () => {
      const cancelled = await cancelAsyncJob(consultationId, job.jobId, token, {
        consultationId,
        physicianActorId,
        expectedJobVersion: job.jobVersion,
        reason: "Physician cancelled from post-consult review",
      });
      setJobs((known) => ({ ...known, [cancelled.jobId]: cancelled }));
      if ("outputType" in job && job.outputType) {
        markGenerating(job.outputType as CdsProtectedOutputType, false);
      }
    });

  /** Commit a physician edit of a generated draft. */
  const amend = useCallback(
    async (artifact: CdsProtectedArtifact, payload: CdsProtectedArtifactPayload) => {
      if (!assessment) return;
      try {
        const next = await amendArtifact(consultationId, artifact.artifactId, token, {
          consultationId,
          physicianActorId,
          assessmentVersion: assessment.assessmentVersion,
          expectedArtifactRevision: artifact.artifactRevision,
          expectedGateRevision: assessment.gateRevision,
          editAcknowledged: true,
          payload,
        });
        setCurrent((known) =>
          known.map((item) => (item.artifactId === next.artifactId ? next : item)),
        );
        toast.success(`${outputLabels[artifact.outputType]} updated with your changes.`);
      } catch (cause) {
        toast.error(physicianErrorMessage(cause));
        throw cause;
      }
    },
    [assessment, consultationId, physicianActorId, token],
  );

  /** Save a document the physician wrote themselves, with no AI (ADR-20261005-01). */
  const authorDocument = useCallback(
    async (outputType: CdsProtectedOutputType, payload: CdsProtectedArtifactPayload) => {
      if (!assessment) return;
      try {
        const created = await authorPhysicianOutput(consultationId, token, {
          consultationId,
          physicianActorId,
          assessmentVersion: assessment.assessmentVersion,
          outputType,
          payload,
        });
        setCurrent((known) => [...known.filter((item) => item.outputType !== created.outputType), created]);
        setActiveDeliverable(created.outputType);
        toast.success(`${outputLabels[outputType]} saved. Review it, then sign it.`);
      } catch (cause) {
        toast.error(physicianErrorMessage(cause));
        throw cause;
      }
    },
    [assessment, consultationId, physicianActorId, token],
  );

  const finalize = useCallback(
    async (artifact: CdsProtectedArtifact, signature: ArtifactSignatureInput) => {
      if (!assessment) return;
      try {
        const next = await finalizeArtifact(consultationId, artifact.artifactId, token, {
          consultationId,
          physicianActorId,
          assessmentVersion: assessment.assessmentVersion,
          expectedArtifactRevision: artifact.artifactRevision,
          expectedGateRevision: assessment.gateRevision,
          reviewAcknowledged: true,
          signature: {
            signerName: signature.signerName,
            acknowledged: true,
            strokes: signature.strokes,
          },
        });
        setCurrent((known) =>
          known.map((item) => (item.artifactId === next.artifactId ? next : item)),
        );
        toast.success("Signed. The patient cannot see it until you release it separately.", {
          id: "finalize-signature",
        });
      } catch (cause) {
        toast.error(physicianErrorMessage(cause));
        throw cause;
      }
    },
    [assessment, consultationId, physicianActorId, token],
  );

  const release = (artifact: CdsProtectedArtifact) =>
    assessment &&
    run(async () => {
      const next = await releaseArtifact(consultationId, artifact.artifactId, token, {
        consultationId,
        physicianActorId,
        assessmentVersion: assessment.assessmentVersion,
        expectedArtifactRevision: artifact.artifactRevision,
        expectedGateRevision: assessment.gateRevision,
        expectedReleaseRevision: artifact.releaseRevision,
        releaseAcknowledged: true,
      });
      setCurrent((known) => known.map((item) => (item.artifactId === next.artifactId ? next : item)));
      toast.success(`${outputLabels[artifact.outputType]} released to the patient.`);
    });

  /** Bring back a document marked not needed (a removed draft returns as it was). */
  const restoreType = useCallback((outputType: CdsProtectedOutputType) => {
    setDiscardedTypes((prev) => {
      const next = new Set(prev);
      next.delete(outputType);
      return next;
    });
  }, []);

  /** Remove a draft, or mark an unstarted document not needed. Both can be undone. */
  const handleDiscard = useCallback(
    (outputType: CdsProtectedOutputType) => {
      const target = current.find((a) => a.outputType === outputType);
      setDiscardedTypes((prev) => new Set(prev).add(outputType));
      markGenerating(outputType, false);
      toast.success(
        target
          ? `${outputLabels[outputType]} draft removed. Marked not needed.`
          : `${outputLabels[outputType]} marked not needed.`,
        {
          action: {
            label: "Undo",
            onClick: () => {
              restoreType(outputType);
              setActiveDeliverable(outputType);
            },
          },
        },
      );
    },
    [current, markGenerating, restoreType],
  );

  const loadMoreHistory = () =>
    historyCursor &&
    run(async () => {
      const page = await getOutputHistory(consultationId, token, historyCursor);
      setHistory((known) => [...known, ...page.data.outputs]);
      setHistoryCursor(page.cursor);
    });

  if (!assessment) {
    if (initialLoadError) {
      return (
        <section
          role="alert"
          aria-live="assertive"
          className="m-4 flex flex-col gap-2 rounded-2xl border border-(--danger-border) bg-(--danger-bg) p-6 text-(--danger-fg) sm:m-6"
        >
          <div className="flex items-center gap-2 text-base font-bold">
            <ShieldAlert className="size-5 shrink-0" />
            Unable to load consultation
          </div>
          <p className="text-sm font-medium">{initialLoadError}</p>
        </section>
      );
    }
    return <PostConsultationSkeleton />;
  }

  // Which designed post-consult state this consultation is in, derived from
  // the same authoritative server state that drives the gate, so the layout
  // and the permissions cannot disagree (see workspacePhase).
  const phase = derivePhase(assessment);
  const safetyLock = hasSafetyLock(assessment);
  const confirmed = Boolean(assessment.confirmed);
  // Drafting is permitted whenever the gate is not actively holding this
  // consultation. A lapsed token is not a hold — `generate` re-issues one.
  const draftingOpen = confirmed && assessment.lockReasons.length === 0;
  // A confirmation from before ADR-20261006-02 has no code; its generated
  // Final ICD artifact, if any, is still shown as a legacy record.
  const legacyIcdArtifact = liveCurrent.find(
    (artifact) => !artifact.effectiveStale && artifact.outputType === "final_icd",
  );
  const confirmedIcd = assessment.confirmed?.icd10 ?? readFinalIcdPayload(legacyIcdArtifact);
  // Final ICD is confirmed inside the Assessment, so it is not a checklist row.
  const deckEntries = deriveDeckEntries({
    artifacts: liveCurrent,
    generating,
    exclude: new Set<CdsProtectedOutputType>(["final_icd"]),
  });
  const aiEligibleTypes = new Set<CdsProtectedOutputType>(allowedTypes);
  const removedDraftTypes = new Set(
    current.filter((artifact) => discardedTypes.has(artifact.outputType)).map((artifact) => artifact.outputType),
  );

  // Background jobs the physician can still cancel, by document type.
  const activeJobs = Object.values(jobs).filter(
    (job) =>
      (!("authoritative" in job) && !terminalJobs.has(job.status))
      || ("authoritative" in job && job.authoritative && !terminalJobs.has(job.status)),
  );
  const jobByType = new Map<CdsProtectedOutputType, CdsAsyncJob | CdsAsyncJobAccepted>();
  for (const job of activeJobs) {
    if ("outputType" in job && job.outputType) {
      jobByType.set(job.outputType as CdsProtectedOutputType, job as CdsAsyncJob | CdsAsyncJobAccepted);
    }
  }
  const untypedJobs = activeJobs.filter((job) => !("outputType" in job) || !job.outputType);

  // ── Phone screens ────────────────────────────────────────────────────────
  // The view in the URL wins; otherwise the screen is the phase the
  // consultation is actually in. Deliver cannot be shown before confirmation.
  const PHONE_VIEWS: readonly WorkspacePhase[] = ["review", "assess", "deliver"];
  const requestedView = PHONE_VIEWS.find((view) => view === viewParam) ?? null;
  const phoneView: WorkspacePhase = requestedView === "deliver" && !confirmed ? "assess" : requestedView ?? phase;
  const CHECKLIST_KEYS: readonly ChecklistKey[] = [...CHECKLIST_TYPES, "follow_up", "history"];
  const phoneDoc: ChecklistKey | null =
    phoneView === "deliver" && confirmed ? CHECKLIST_KEYS.find((key) => key === docParam) ?? null : null;
  const docOpen = Boolean(phoneDoc);
  /** "max-lg:hidden" unless this block belongs on the phone screen showing now. */
  const onPhone = (...views: WorkspacePhase[]) => (!docOpen && views.includes(phoneView) ? "" : "max-lg:hidden");

  const progress = checklistProgress(deckEntries, phoneDoc ?? activeDeliverable);

  const writeUrl = (patch: Record<string, string | null>, mode: "push" | "replace") => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const url = `${window.location.pathname}?${params.toString()}`;
    // Only our own flag: Next.js adds its router state itself, and skips
    // syncing `useSearchParams` for an entry that already carries it.
    const state = { postConsultView: true };
    if (mode === "push") window.history.pushState(state, "", url);
    else window.history.replaceState(state, "", url);
    window.scrollTo({ top: 0 });
  };
  const showView = (view: WorkspacePhase) => {
    if (view === "deliver" && !confirmed) {
      toast.info("Documents open after you confirm the assessment.", { id: "deliver-locked" });
      if (phoneView === "assess") return;
      view = "assess";
    }
    if (view === phoneView && !docOpen) return;
    writeUrl({ view, doc: null }, "push");
  };
  const openDocument = (key: ChecklistKey) => {
    setActiveDeliverable(key);
    if (!isPhone || phoneDoc === key) return;
    // Moving between documents replaces the entry, so Back returns to the list
    // rather than walking back through every document opened.
    writeUrl({ view: "deliver", doc: key }, phoneDoc ? "replace" : "push");
  };
  const closeDocument = () => {
    if (window.history.state?.postConsultView) window.history.back();
    else writeUrl({ doc: null }, "replace");
  };

  // Section folding (desktop): each phase has defaults, a manual toggle wins
  // until the phase changes. Deliver folds S, O and A so the documents lead;
  // A stays open when the confirmed diagnosis cannot be AI-drafted, because
  // the explanation for that lives inside it. On a phone a section is its own
  // screen and always open.
  if (overridesPhase !== phase) {
    setOverridesPhase(phase);
    setSectionOverrides({});
  }
  const defaultOpen = {
    S: phase !== "deliver",
    O: phase !== "deliver",
    A: phase !== "deliver" || allowedTypes.length === 0,
  };
  const sectionOpen = (letter: "S" | "O" | "A") => isPhone || (sectionOverrides[letter] ?? defaultOpen[letter]);
  const setSection = (letter: "S" | "O" | "A", open: boolean) =>
    setSectionOverrides((known) => ({ ...known, [letter]: open }));
  const toggleFor = (letter: "S" | "O" | "A") => (isPhone ? undefined : (open: boolean) => setSection(letter, open));

  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const scrollToId = (id: string, focusId?: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
    });
  };
  const goToAssessment = () => {
    if (isPhone) {
      showView("assess");
      return;
    }
    setSection("A", true);
    scrollToId("soap-a", "assessment-diagnosis");
  };
  const goToDocument = (key: ChecklistKey) => {
    if (isPhone) {
      openDocument(key);
      return;
    }
    setActiveDeliverable(key);
    scrollToId("soap-p");
  };
  const refreshAll = () =>
    run(async () => {
      resetDerived();
      await refreshAssessment();
      await refreshOutputs();
    });

  // Identity for the header, from the structured intake demographics.
  const demographics = intake?.sections.details?.demographics;
  const patientAge = ageFromDateOfBirth(demographics?.dateOfBirth);
  const patientSex = demographics?.sex ? SEX_LABELS[demographics.sex] : undefined;
  const patientAllergies = usableAllergyLabel(intake?.sections.details?.allergies);

  const lockNotice = (
    <LockNotice
      assessment={assessment}
      safetyLock={safetyLock}
      busy={busy}
      acknowledgmentReady={acknowledgmentReady}
      onAcknowledge={acknowledge}
      onProceed={proceedOnJudgment}
      onRecheck={requestToken}
      onRefresh={refreshAll}
    />
  );
  const hasLocks = assessment.lockReasons.length > 0;

  const firstLine = (value: string) => value.split("\n").find((line) => line.trim())?.trim();
  const subjectiveSummary = firstLine(notes.draft.subjective) ?? subjectiveIntakeSummary(intake);
  const assessmentSummary = assessment.confirmed
    ? `${assessment.confirmed.diagnosis}${confirmedIcd ? ` · ICD-10 ${confirmedIcd.code}` : ""}`
    : assessment.editableDiagnosis.trim() || "No diagnosis yet";

  return (
    <div
      data-slot="post-consultation-workspace"
      data-phase={phase}
      data-view={phoneView}
      className="group/ws flex min-h-full w-full max-w-full min-w-0 flex-col"
      aria-label="Post-consultation documentation"
    >
      <WorkspaceHeader
        consultationId={consultationId}
        chiefComplaint={intake?.sections.purpose?.chiefComplaint}
        patientName={intake?.patientName}
        age={patientAge}
        sex={patientSex}
        allergies={patientAllergies}
        phase={phase}
        blocked={safetyLock}
        view={phoneView}
        deliverLocked={!confirmed}
        onSelectView={showView}
        phoneActions={
          <>
            <Button
              type="button"
              variant="outline"
              shape="pill"
              aria-label="Patient intake"
              className="h-11 gap-1.5 border-(--border-default) px-3"
              onClick={() => setMobileIntakeOpen(true)}
            >
              <ClipboardList className="size-4 shrink-0" aria-hidden />
              <span className="max-[359px]:sr-only">Intake</span>
            </Button>
            {bookingId ? <SendToErControl bookingId={bookingId} urgent={safetyLock} /> : null}
          </>
        }
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              shape="pill"
              aria-label="Refresh"
              title="Refresh"
              className="size-9 p-0 text-(--text-muted) hover:text-(--text-heading)"
              disabled={busy}
              onClick={refreshAll}
            >
              <RefreshCw className="size-4 shrink-0" />
            </Button>
            {bookingId ? <SendToErControl bookingId={bookingId} urgent={safetyLock} /> : null}
          </div>
        }
      />

      <div
        className={cn(
          "grid flex-1 grid-cols-1 items-start gap-4 p-3 min-w-0 max-w-full sm:p-4",
          patientRailCollapsed
            ? "lg:grid-cols-[minmax(0,1fr)_3.5rem]"
            : "lg:grid-cols-[minmax(0,1fr)_minmax(17rem,21rem)]",
        )}
      >
        <main className="order-1 flex min-w-0 flex-col gap-3">
          {/* A safety finding leads the page (every phone screen but an open document). */}
          {safetyLock ? <div className={docOpen ? "max-lg:hidden" : ""}>{lockNotice}</div> : null}

          <WorkspaceSection
            id="soap-s"
            letter="S"
            title="Subjective"
            className={onPhone("review")}
            summary={<SubjectiveSummary intake={intake} text={subjectiveSummary} />}
            open={sectionOpen("S")}
            onOpenChange={toggleFor("S")}
            meta={<NotesSaveState state={notes.saveState} prefilled={notes.prefilled} />}
          >
            <div className="flex flex-col gap-4">
              <IntakeBlock label="Patient reported">
                <SubjectiveIntake intake={intake} />
              </IntakeBlock>
              <ClinicalNoteField
                notes={notes}
                field="subjective"
                label="Your subjective notes"
                hint="Private to you"
                placeholder="What the patient told you, in your words."
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            id="soap-o"
            letter="O"
            title="Objective"
            className={onPhone("review")}
            summary={<ObjectiveSummary intake={intake} fallback={firstLine(notes.draft.objective)} />}
            open={sectionOpen("O")}
            onOpenChange={toggleFor("O")}
          >
            <div className="flex flex-col gap-4">
              <IntakeBlock label="Patient-recorded vitals">
                <ObjectiveIntake intake={intake} />
              </IntakeBlock>
              <ClinicalNoteField
                notes={notes}
                field="objective"
                label="Your objective findings"
                hint="Private to you"
                placeholder="What you observed or measured during the consult."
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            id="soap-a"
            letter="A"
            title="Assessment"
            className={onPhone("assess")}
            summary={
              assessment.confirmed ? (
                <>
                  <span className="min-w-0 truncate font-semibold text-(--text-heading)">
                    {assessment.confirmed.diagnosis}
                  </span>
                  {confirmedIcd ? (
                    <span className="shrink-0 rounded-md bg-(--surface-warm-soft) px-1.5 py-0.5 font-mono text-xs font-semibold text-(--text-heading)">
                      ICD-10 {confirmedIcd.code}
                    </span>
                  ) : null}
                </>
              ) : (
                assessmentSummary
              )
            }
            open={sectionOpen("A")}
            onOpenChange={toggleFor("A")}
            meta={
              safetyLock ? (
                <StatusText tone="danger" icon={ShieldAlert}>
                  Red flag
                </StatusText>
              ) : confirmed ? (
                <StatusText tone="success" icon={CheckCircle2}>
                  Confirmed
                </StatusText>
              ) : (
                <StatusText tone="attention">Not confirmed</StatusText>
              )
            }
          >
            <AssessmentEditor
              assessment={assessment}
              allowedTypes={allowedTypes}
              draftDiagnosis={draftDiagnosis}
              onDraftDiagnosis={updateDraftDiagnosis}
              busy={busy}
              onSave={saveManual}
              onConfirm={confirm}
              onUpdate={() => updateOrReattest("update")}
              onReattest={() => updateOrReattest("reattest")}
              onClear={clear}
              icd={confirmedIcd}
              draftIcd={draftIcd}
              onDraftIcd={editDraftIcd}
              reasoning={
                <ClinicalNoteField
                  notes={notes}
                  field="assessmentNotes"
                  label="Clinical reasoning"
                  hint="Optional · private to you, never sent to the AI"
                  placeholder="Why this diagnosis: differentials considered, what ruled them out."
                />
              }
              picker={
                <CandidatePicker
                  assessment={assessment}
                  evaluation={evaluation}
                  preview={preview}
                  focused={focusedCandidate}
                  previewLoading={previewLoading}
                  searching={searching}
                  cursor={cursor}
                  busy={busy}
                  suppressed={Boolean(candidateSuppressed)}
                  onStart={startEvaluation}
                  onMore={() => runCandidateSearch(draftDiagnosis, cursor)}
                  onFocus={loadPreview}
                  onSelect={chooseCandidate}
                />
              }
            />
          </WorkspaceSection>

          {/* Phone, Deliver: the confirmed diagnosis in one tappable line. */}
          {confirmed ? (
            <button
              type="button"
              data-slot="phone-assessment-summary"
              onClick={() => showView("assess")}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-4 py-2.5 text-left lg:hidden",
                onPhone("deliver"),
              )}
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--surface-brand-soft) text-sm font-bold text-(--navy-700) dark:text-(--navy-300)"
              >
                A
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-(--text-heading)">{assessmentSummary}</span>
                <span className="text-xs text-(--text-muted)">Confirmed assessment · tap to revise</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-(--text-muted)" aria-hidden />
            </button>
          ) : null}

          {/* A non-safety hold concerns drafting, so it sits right above the Plan it holds. */}
          {hasLocks && !safetyLock ? <div className={onPhone("assess", "deliver")}>{lockNotice}</div> : null}

          <WorkspaceSection
            id="soap-p"
            letter="P"
            title="Plan & documents"
            className={phoneView === "deliver" ? undefined : "max-lg:hidden"}
            headerClassName={docOpen ? "max-lg:hidden" : undefined}
            locked={!confirmed}
            summary={!confirmed ? "Opens after you confirm the Assessment" : undefined}
            bodyClassName="p-0 sm:p-0 max-lg:border-t-0"
            meta={
              confirmed && progress.started > 0 ? (
                <span className="text-xs font-semibold text-(--text-muted) tabular-nums">
                  {progress.done} of {progress.started} done
                </span>
              ) : null
            }
          >
            <DeliverablesDeck
              entries={deckEntries}
              active={phoneDoc ?? activeDeliverable}
              onActiveChange={openDocument}
              busy={busy}
              generating={generating}
              specimen={doctorProfile?.signature}
              defaultSignerName={doctorProfile?.fullName || doctorProfile?.signature?.signerName || undefined}
              draftingOpen={draftingOpen}
              aiEligibleTypes={aiEligibleTypes}
              aiUnavailableReason={
                hasLocks
                  ? "AI drafting is on hold until the notice above is cleared. You can still write it yourself."
                  : undefined
              }
              onAmend={amend}
              onFinalize={finalize}
              onRelease={release}
              onDraft={(outputType) => void generate(outputType)}
              onAuthor={authorDocument}
              onDiscard={handleDiscard}
              cancellableTypes={new Set(jobByType.keys())}
              onCancelDraft={(outputType) => {
                const job = jobByType.get(outputType);
                if (job) cancelJob(job);
              }}
              intake={intake}
              followUp={followUp}
              history={history}
              historyCursor={historyCursor}
              onLoadMoreHistory={loadMoreHistory}
              onInspectHistory={(artifact) => setInspectingHistoricalArtifact(artifact)}
              mobileDetail={docOpen}
              onCloseMobileDetail={closeDocument}
              notNeeded={discardedTypes}
              removedDraftTypes={removedDraftTypes}
              onNotNeeded={handleDiscard}
              onRestore={restoreType}
              onRefresh={refreshAll}
            />
            {untypedJobs.length > 0 ? (
              <ul className="flex flex-col gap-2 border-t border-(--border-subtle) p-4 sm:px-5">
                {untypedJobs.map((job) => (
                  <li key={job.jobId} className="flex flex-wrap items-center justify-between gap-2 text-sm text-(--text-body)">
                    <span>Earlier draft · {job.status.replaceAll("_", " ")}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      shape="pill"
                      className="h-11 lg:h-9"
                      disabled={busy}
                      onClick={() => cancelJob(job as CdsAsyncJob | CdsAsyncJobAccepted)}
                    >
                      Cancel
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </WorkspaceSection>

          <NextStepBar
            className={docOpen ? "max-lg:hidden" : undefined}
            assessment={assessment}
            artifacts={liveCurrent}
            notNeededTypes={discardedTypes}
            safetyLock={safetyLock}
            guidance={guidance}
            progress={progress}
            isPhone={isPhone}
            phoneView={phoneView}
            busy={busy}
            canConfirm={Boolean(draftDiagnosis.trim())}
            onConfirm={confirm}
            onShowView={showView}
            onGoToAssessment={goToAssessment}
            onGoToNotice={() => (isPhone ? window.scrollTo({ top: 0 }) : scrollToId("workspace-locks"))}
            onGoToDocument={goToDocument}
          />
        </main>

        <div className="order-2 hidden min-w-0 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto">
          <PatientRail
            bookingId={bookingId}
            intake={intake}
            collapsed={patientRailCollapsed}
            onToggleCollapse={() => setPatientRailCollapsed((c) => !c)}
          />
        </div>
      </div>

      <CustomBottomModal
        open={mobileIntakeOpen}
        onOpenChange={setMobileIntakeOpen}
        title="Patient intake"
        description={intake?.patientName ?? undefined}
      >
        <PatientDetails bookingId={bookingId} form={intake} />
      </CustomBottomModal>

      <DocumentSheetModal
        open={Boolean(inspectingHistoricalArtifact)}
        onOpenChange={(open) => {
          if (!open) setInspectingHistoricalArtifact(null);
        }}
        artifact={inspectingHistoricalArtifact ?? undefined}
        intake={intake}
        doctorName={doctorProfile?.fullName || doctorProfile?.signature?.signerName || undefined}
        isHistoricalArchive={true}
      />
    </div>
  );
}

/**
 * Why drafting is held, in clinical language, each reason with what clears
 * it, and then the controls that clear the common ones. Ordered so the
 * physician reads what happened before being handed a button. Refresh lives
 * here too, because several reasons say to refresh.
 */
function LockNotice({
  assessment,
  safetyLock,
  busy,
  acknowledgmentReady,
  onAcknowledge,
  onProceed,
  onRecheck,
  onRefresh,
}: {
  assessment: CdsAssessment;
  safetyLock: boolean;
  busy: boolean;
  acknowledgmentReady: boolean;
  onAcknowledge: () => void;
  onProceed: (reason: string) => void;
  onRecheck: () => void;
  onRefresh: () => void;
}) {
  return (
    <section
      id="workspace-locks"
      role="alert"
      data-slot="workspace-locks"
      className={cn(
        "scroll-mt-28 rounded-2xl border p-4 sm:p-5",
        safetyLock
          ? "border-(--danger-border)/60 bg-(--danger-bg)"
          : "border-(--attention-border)/40 bg-(--attention-bg)",
      )}
    >
      <h2 className="flex items-center gap-2 text-base font-bold text-(--text-heading)">
        <ShieldAlert
          className={cn("size-5 shrink-0", safetyLock ? "text-(--danger-fg)" : "text-(--attention-fg)")}
          aria-hidden
        />
        {safetyLock
          ? "A safety finding needs your review"
          : assessment.lockReasons.length === 1
            ? "Drafting is on hold"
            : `Drafting is on hold for ${assessment.lockReasons.length} reasons`}
      </h2>

      <ul className="mt-3 flex flex-col gap-2">
        {assessment.lockReasons.map((reason) => {
          const copy = lockReasonCopy(reason);
          return (
            <li key={reason} data-lock-reason={reason} className="rounded-xl bg-(--surface-card) p-3 text-sm">
              <p className="font-semibold text-(--text-heading)">{copy.label}</p>
              <p className="mt-0.5 text-(--text-muted)">{copy.meaning}</p>
              <p className="mt-1.5 flex items-start gap-1.5 font-medium text-(--text-body)">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-(--text-muted)" aria-hidden />
                {copy.nextAction}
              </p>
              {reason === "acknowledgment_pending" && assessment.clinicalSafetyEpisodeId && acknowledgmentReady ? (
                <Button
                  type="button"
                  variant="outline"
                  shape="pill"
                  className="mt-2 h-11 border-(--border-default) lg:h-9"
                  disabled={busy}
                  onClick={onAcknowledge}
                >
                  Acknowledge this finding
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {safetyLock && assessment.clinicalSafetyEpisodeId ? (
        <RedFlagOverrideControl
          assessmentConfirmed={Boolean(assessment.confirmed)}
          busy={busy}
          onProceed={onProceed}
        />
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">
        <Button
          type="button"
          data-slot="banner-recheck-safety"
          variant="primary"
          shape="pill"
          className="h-11 lg:h-9"
          disabled={busy || !assessment.confirmed}
          title={
            !assessment.confirmed
              ? "Confirm the Assessment first, then re-run the safety check to unlock drafting."
              : undefined
          }
          onClick={onRecheck}
        >
          <ShieldAlert className="size-4" />
          Re-run safety check
        </Button>
        <Button
          type="button"
          variant="outline"
          shape="pill"
          className="h-11 border-(--border-default) bg-(--surface-card) lg:h-9"
          disabled={busy}
          onClick={onRefresh}
        >
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>
    </section>
  );
}

/**
 * The bar that always says what to do next, at the bottom of the column on
 * every screen size, and the only place Finish lives.
 *
 * On a phone its primary action is the screen's own next step: "Write
 * assessment" on Review, the real **Confirm assessment** on Assess (in the
 * thumb zone, rather than at the end of a long form), and the next document on
 * Deliver. The primary grows to fill the width; Finish stays compact beside
 * it, because it is a way out, not the next step. The whole bar steps aside
 * while the keyboard is up.
 */
function NextStepBar({
  className,
  assessment,
  artifacts,
  notNeededTypes,
  safetyLock,
  guidance,
  progress,
  isPhone,
  phoneView,
  busy,
  canConfirm,
  onConfirm,
  onShowView,
  onGoToAssessment,
  onGoToNotice,
  onGoToDocument,
}: {
  className?: string;
  assessment: CdsAssessment;
  artifacts: readonly CdsProtectedArtifact[];
  notNeededTypes: ReadonlySet<CdsProtectedOutputType>;
  safetyLock: boolean;
  guidance: ReturnType<typeof stepGuidance> | null;
  progress: ReturnType<typeof checklistProgress>;
  isPhone: boolean;
  phoneView: WorkspacePhase;
  busy: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
  onShowView: (view: WorkspacePhase) => void;
  onGoToAssessment: () => void;
  onGoToNotice: () => void;
  onGoToDocument: (key: ChecklistKey) => void;
}) {
  const confirmed = Boolean(assessment.confirmed);
  const held = assessment.lockReasons.length > 0;
  const allDone = confirmed && !held && progress.started > 0 && !progress.next;
  const grow = "h-11 lg:h-9 max-sm:flex-1";

  let status: React.ReactNode;
  let action: React.ReactNode = null;

  if (safetyLock) {
    status = (
      <BarStatus tone="danger" label="Red flag">
        {guidance?.instruction ?? "Review the safety finding before drafting."}
      </BarStatus>
    );
    action = (
      <Button type="button" variant="outline" shape="pill" className={cn(grow, "border-(--border-default)")} onClick={onGoToNotice}>
        Review finding
      </Button>
    );
  } else if (!confirmed && isPhone && phoneView === "review") {
    status = <BarStatus label="Step 1 of 3">Read the intake and add your notes. They save as you go.</BarStatus>;
    action = (
      <Button type="button" variant="primary" shape="pill" className={grow} onClick={() => onShowView("assess")}>
        Write assessment <ArrowRight className="size-4" />
      </Button>
    );
  } else if (!confirmed && isPhone) {
    status = <BarStatus label="Step 2 of 3">Nothing is drafted until you confirm.</BarStatus>;
    action = (
      <Button
        type="button"
        variant="primary"
        shape="pill"
        className={grow}
        disabled={busy || !canConfirm}
        onClick={onConfirm}
      >
        {busy ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" />}
        Confirm assessment
      </Button>
    );
  } else if (!confirmed) {
    status = <BarStatus label="Next">Confirm your diagnosis and its ICD-10 code in Assessment.</BarStatus>;
    action = (
      <Button type="button" variant="primary" shape="pill" className={grow} onClick={onGoToAssessment}>
        Go to Assessment <ArrowRight className="size-4" />
      </Button>
    );
  } else if (held) {
    status = (
      <BarStatus tone="attention" label="On hold">
        {guidance?.heading ?? "Drafting is on hold."} You can still write documents yourself.
      </BarStatus>
    );
    action = (
      <Button type="button" variant="outline" shape="pill" className={cn(grow, "border-(--border-default)")} onClick={onGoToNotice}>
        See why
      </Button>
    );
  } else if (isPhone && phoneView !== "deliver") {
    status = <BarStatus tone="success" label="Confirmed">Your assessment is saved. Documents are next.</BarStatus>;
    action = (
      <Button type="button" variant="primary" shape="pill" className={grow} onClick={() => onShowView("deliver")}>
        Go to documents <ArrowRight className="size-4" />
      </Button>
    );
  } else if (progress.next) {
    const label = OUTPUT_LABELS[progress.next.outputType];
    status = (
      <BarStatus label={`${progress.done} of ${progress.started} done`}>
        Next: {progress.next.verb.toLowerCase()} the {label.toLowerCase()}.
      </BarStatus>
    );
    action = (
      <Button
        type="button"
        variant="primary"
        shape="pill"
        className={grow}
        onClick={() => onGoToDocument(progress.next!.outputType)}
      >
        {progress.next.verb} {label.toLowerCase()} <ArrowRight className="size-4" />
      </Button>
    );
  } else if (progress.started === 0) {
    status = <BarStatus label="Next">Start the documents this patient needs.</BarStatus>;
    action = (
      <Button type="button" variant="primary" shape="pill" className={grow} onClick={() => onGoToDocument("plan")}>
        Start with the plan <ArrowRight className="size-4" />
      </Button>
    );
  } else {
    status = (
      <BarStatus tone="success" label={`${progress.done} of ${progress.started} done`}>
        Every document you started is finished.
      </BarStatus>
    );
  }

  return (
    <StickyActionBar
      aria-label="Next step"
      className={cn(
        "max-lg:-mx-3 sm:max-lg:-mx-4 lg:rounded-2xl lg:border lg:pb-3 max-lg:group-has-[textarea:focus]/ws:hidden max-lg:group-has-[input:focus]/ws:hidden",
        className,
      )}
      status={status}
    >
      {action}
      {/* Before confirmation a phone has nothing to finish; the slot goes to the next step. */}
      {confirmed || !isPhone ? (
        <FinishDocumentationControl
          assessment={assessment}
          artifacts={artifacts}
          notNeededTypes={notNeededTypes}
          emphasize={allDone}
        />
      ) : null}
    </StickyActionBar>
  );
}

function BarStatus({
  label,
  tone = "neutral",
  children,
}: {
  label: string;
  tone?: "neutral" | "attention" | "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-(--text-body)">
      <StatusText tone={tone} size="sm">
        {label}
      </StatusText>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

interface IcdDraft {
  code: string;
  description: string;
  /** Set while the draft still equals the map's suggestion. */
  mapVersion?: string;
}

const EMPTY_ICD_DRAFT: IcdDraft = { code: "", description: "" };
const ICD10_CODE = /^[A-Z][0-9A-Z]{2}(\.[0-9A-Z]{1,4})?$/u;

function icdDraftFrom(value: { code: string; description: string; mapVersion?: string }): IcdDraft {
  return { code: value.code, description: value.description, ...(value.mapVersion ? { mapVersion: value.mapVersion } : {}) };
}

function icdFromDraft(draft: IcdDraft): { system: "ICD-10"; code: string; description: string } | null {
  const code = draft.code.normalize("NFKC").trim().toUpperCase();
  const description = draft.description.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!ICD10_CODE.test(code) || description.length < 1 || description.length > 500) return null;
  return { system: "ICD-10", code, description };
}

function readFinalIcdPayload(
  artifact: CdsProtectedArtifact | undefined,
): { code: string; description: string } | null {
  if (!artifact || artifact.outputType !== "final_icd") return null;
  const payload = artifact.payload as Record<string, unknown>;
  return typeof payload.code === "string" && typeof payload.description === "string"
    ? { code: payload.code, description: payload.description }
    : null;
}

/**
 * The Assessment: the one thing on this page that unlocks documents.
 *
 * Renders inside the A section, which owns the title, status and folding.
 * Order follows the work: the diagnosis and its ICD-10 code, optional
 * suggestions, the physician's private reasoning, then the commit. Actions
 * are ordered by consequence, with the destructive one apart on the left and
 * confirmed before it runs.
 */
function AssessmentEditor({
  assessment,
  allowedTypes,
  draftDiagnosis,
  onDraftDiagnosis,
  busy,
  onSave,
  onConfirm,
  onUpdate,
  onReattest,
  onClear,
  icd,
  draftIcd,
  onDraftIcd,
  picker,
  reasoning,
}: {
  assessment: CdsAssessment;
  allowedTypes: readonly CdsProtectedOutputType[];
  draftDiagnosis: string;
  onDraftDiagnosis: (value: string) => void;
  busy: boolean;
  onSave: () => void;
  onConfirm: () => void;
  onUpdate: () => void;
  onReattest: () => void;
  onClear: () => void;
  icd: { code: string; description: string } | null;
  draftIcd: IcdDraft;
  onDraftIcd: (value: IcdDraft) => void;
  picker: React.ReactNode;
  reasoning: React.ReactNode;
}) {
  const [clearOpen, setClearOpen] = useState(false);
  const confirmed = assessment.confirmed;
  const aiDraftable = allowedTypes.filter((type) => type !== "final_icd");
  const draftIcdValue = icdFromDraft(draftIcd);
  const icdChanged = Boolean(confirmed) && (
    !confirmed?.icd10
    || draftIcdValue?.code !== confirmed.icd10.code
    || draftIcdValue?.description !== confirmed.icd10.description
  );
  const diagnosisChanged = Boolean(draftDiagnosis.trim()) && draftDiagnosis.trim() !== confirmed?.diagnosis;

  return (
    <div data-slot="assessment-card" className="flex min-w-0 flex-col gap-4">
      {confirmed ? (
        <div data-slot="assessment-confirmed-summary" className="rounded-xl bg-(--surface-warm-soft) p-3.5 text-sm">
          <p className="font-semibold text-(--text-heading)">
            {confirmed.diagnosis}
            {icd ? (
              <span data-slot="assessment-icd-code" className="font-normal text-(--text-muted)">
                {" "}· ICD-10 <span className="font-mono font-semibold text-(--text-heading)">{icd.code}</span>{" "}
                {icd.description}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-(--text-muted)">
            Confirmed by you{" "}
            {new Date(confirmed.confirmedAt).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            · version {assessment.assessmentVersion}
          </p>
          {!icd ? (
            <p className="mt-1 text-(--attention-fg)">No ICD-10 code on this version. Add one below and save a new version.</p>
          ) : null}
          {aiDraftable.length === 0 ? (
            /*
              The most confusing state in live testing: a diagnosis outside the
              approved catalogue has an empty eligible-output set, so no AI
              drafting at all. Said here, where the diagnosis is.
            */
            <p className="mt-2 text-(--text-body)">
              AI drafting isn&apos;t available for this diagnosis because it is not in the approved catalogue.
              You can still write any document yourself in Plan &amp; documents.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="assessment-diagnosis" className="text-sm font-semibold text-(--text-heading)">
          {confirmed ? "Diagnosis (changing it saves a new version)" : "Diagnosis"}
        </label>
        <Textarea
          id="assessment-diagnosis"
          value={draftDiagnosis}
          // PRD v3.2 §4.2 fixes this string verbatim as acceptance evidence.
          placeholder="Type or select diagnosis..."
          className="min-h-16 rounded-xl text-base sm:text-sm"
          onChange={(event) => onDraftDiagnosis(event.target.value)}
          disabled={busy}
        />
        {!confirmed && assessment.editableDiagnosis.trim() ? (
          <p className="text-sm" data-slot="assessment-saved-unconfirmed">
            <span className="text-(--text-muted)">Saved draft, not confirmed:</span>{" "}
            <span className="font-medium text-(--text-heading)">{assessment.editableDiagnosis}</span>
          </p>
        ) : null}
      </div>

      <IcdCodeField draft={draftIcd} onChange={onDraftIcd} suggestion={assessment.editableIcd10Suggestion} busy={busy} />

      {/*
        The suggestions exist to fill the field above them, so they live here.
        Unmounted once confirmed, where choosing a suggestion is not possible.
      */}
      {!confirmed ? <div className="rounded-xl border border-(--border-subtle) p-3.5">{picker}</div> : null}

      {reasoning}

      {!confirmed ? (
        <div
          data-slot="assessment-confirm-strip"
          className="flex flex-col gap-3 border-t border-(--border-subtle) pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 text-sm text-(--text-muted)">
            Nothing is drafted until you confirm. The clinical judgment is yours.
            <span className="lg:hidden"> Confirm is in the bar at the bottom.</span>
          </p>
          <div className="flex shrink-0 flex-wrap gap-2 max-sm:[&>*]:flex-1">
            <Button
              type="button"
              variant="outline"
              shape="pill"
              className="border-(--border-default) max-lg:h-11"
              disabled={busy || !draftDiagnosis.trim()}
              onClick={onSave}
            >
              Save draft
            </Button>
            {/* On a phone Confirm lives in the next-step bar, under the thumb. */}
            <Button
              type="button"
              variant="primary"
              shape="pill"
              className="px-4 max-lg:hidden"
              disabled={busy || !draftDiagnosis.trim()}
              onClick={onConfirm}
            >
              {busy ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" />}
              Confirm assessment
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-t border-(--border-subtle) pt-4 max-sm:[&>*]:flex-1">
          <Button
            type="button"
            variant="ghost"
            shape="pill"
            className="text-(--danger-fg) hover:bg-(--danger-bg) hover:text-(--danger-fg) max-lg:h-11 sm:mr-auto"
            disabled={busy}
            onClick={() => setClearOpen(true)}
          >
            <Trash2 className="size-4" /> Clear assessment
          </Button>
          <Button
            type="button"
            variant="outline"
            shape="pill"
            className="border-(--border-default) max-lg:h-11"
            title="Confirm the same diagnosis again under your name, for example after the consultation was reassigned."
            disabled={busy || !confirmed.icd10}
            onClick={onReattest}
          >
            Re-attest unchanged
          </Button>
          <Button
            type="button"
            variant="primary"
            shape="pill"
            className="max-lg:h-11"
            disabled={busy || !draftDiagnosis.trim() || !draftIcdValue || (!diagnosisChanged && !icdChanged)}
            onClick={onUpdate}
          >
            Save as new version
          </Button>
        </div>
      )}

      <ResponsiveSheet
        open={clearOpen}
        onOpenChange={setClearOpen}
        icon={Trash2}
        title="Clear the confirmed assessment?"
        description="Drafting closes until you confirm a new one, and documents drafted from this assessment become out of date. Signed and released documents stay in the record."
        footer={
          <>
            <Button
              type="button"
              shape="pill"
              className="bg-(--danger-fg) px-5 font-semibold text-white hover:bg-(--danger-fg)/90"
              onClick={() => {
                setClearOpen(false);
                onClear();
              }}
            >
              Clear assessment
            </Button>
            <Button type="button" variant="ghost" shape="pill" onClick={() => setClearOpen(false)}>
              Keep it
            </Button>
          </>
        }
      />
    </div>
  );
}

/**
 * The ICD-10 code the physician confirms with the diagnosis (ADR-20261006-02).
 *
 * A catalog diagnosis arrives prefilled from the reviewed map; the note under
 * the field says so while the value is still the map's, so the physician
 * knows what they are confirming. A manual diagnosis has no prefill and the
 * code is required. No model ever proposes one.
 */
function IcdCodeField({
  draft,
  onChange,
  suggestion,
  busy,
}: {
  draft: IcdDraft;
  onChange: (value: IcdDraft) => void;
  suggestion: CdsAssessment["editableIcd10Suggestion"];
  busy: boolean;
}) {
  const fromMap = Boolean(suggestion)
    && draft.code.trim().toUpperCase() === suggestion?.code
    && draft.description.trim() === suggestion?.description;
  const codeInvalid = draft.code.trim() !== "" && !ICD10_CODE.test(draft.code.trim().toUpperCase());
  return (
    <div className="grid gap-x-3 gap-y-1.5 sm:grid-cols-[9rem_1fr]" data-slot="assessment-icd-field">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="assessment-icd-code" className="text-sm font-semibold text-(--text-heading)">
          ICD-10 code
        </label>
        <Input
          id="assessment-icd-code"
          value={draft.code}
          placeholder="e.g. J06.9"
          autoComplete="off"
          spellCheck={false}
          maxLength={16}
          aria-invalid={codeInvalid || undefined}
          aria-describedby="assessment-icd-note"
          className="h-10 rounded-xl font-mono text-base uppercase placeholder:font-sans placeholder:normal-case sm:text-sm max-lg:h-11"
          onChange={(event) => onChange({ code: event.target.value, description: draft.description })}
          disabled={busy}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="assessment-icd-description" className="text-sm font-semibold text-(--text-heading)">
          Code description
        </label>
        <Input
          id="assessment-icd-description"
          value={draft.description}
          placeholder="e.g. Acute upper respiratory infection, unspecified"
          autoComplete="off"
          maxLength={500}
          aria-describedby="assessment-icd-note"
          className="h-10 rounded-xl text-base sm:text-sm max-lg:h-11"
          onChange={(event) => onChange({ code: draft.code, description: event.target.value })}
          disabled={busy}
        />
      </div>
      <p
        id="assessment-icd-note"
        className={cn("text-xs sm:col-span-2", codeInvalid ? "text-(--danger-fg)" : "text-(--text-muted)")}
      >
        {codeInvalid
          ? "Use the WHO ICD-10 format: a letter, two characters, then an optional dot and up to four more (for example G43.9)."
          : fromMap
            ? "Prefilled from the BayanHealth ICD-10 map for this diagnosis (pending clinical review). Check it before you confirm."
            : "Required. You choose the code; it is versioned with your diagnosis."}
      </p>
    </div>
  );
}

/**
 * Finish stays unavailable until the Assessment is confirmed. After that the
 * doctor may leave at any point, having seen what will remain unstarted,
 * unsigned or unreleased, in the same words the checklist uses.
 */
function FinishDocumentationControl({
  assessment,
  artifacts,
  notNeededTypes,
  emphasize,
}: {
  assessment: CdsAssessment;
  artifacts: readonly CdsProtectedArtifact[];
  /** Documents the physician marked not needed: not "missing". */
  notNeededTypes: ReadonlySet<CdsProtectedOutputType>;
  /** Everything is done: Finish becomes the primary action. */
  emphasize: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const readiness = deriveFinishReadiness({ assessment, artifacts });
  const notNeededLabels = new Set([...notNeededTypes].map((type) => OUTPUT_LABELS[type]));
  const missing = readiness.missing.filter((label) => !notNeededLabels.has(label));
  const size = "h-11 shrink-0 px-4 lg:h-9";

  if (!readiness.canFinish) {
    return (
      <Button
        type="button"
        variant="outline"
        shape="pill"
        disabled
        data-slot="finish-documentation"
        title="Confirm the Assessment first"
        className={cn(size, "border-(--border-default)")}
      >
        Finish
      </Button>
    );
  }

  const hasOutstanding = missing.length > 0 || readiness.unreviewed.length > 0 || readiness.unreleased.length > 0;

  return (
    <>
      <Button
        type="button"
        variant={emphasize ? "primary" : "outline"}
        shape="pill"
        data-slot="finish-documentation"
        className={cn(size, !emphasize && "border-(--border-default)", emphasize && "max-sm:flex-1")}
        onClick={() => setOpen(true)}
      >
        <CheckCircle2 className="size-4 shrink-0" />
        Finish
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={hasOutstanding ? "Finish with documents still open?" : "Finish this consultation?"}
        description="Your confirmed Assessment is saved. Leaving does not draft, sign, release or delete anything, and you can come back to finish later from your history."
        className="sm:max-w-lg"
        footer={
          <>
            <Button
              type="button"
              variant="primary"
              shape="pill"
              className="px-5"
              data-slot="finish-documentation-confirm"
              onClick={() => router.push("/doctor/history")}
            >
              Finish and go to history
            </Button>
            <Button type="button" variant="ghost" shape="pill" onClick={() => setOpen(false)}>
              Keep working
            </Button>
          </>
        }
      >
        {hasOutstanding ? (
          <ul className="flex flex-col gap-2.5">
            {readiness.unreviewed.length > 0 ? (
              <FinishGroup
                status="needs_review"
                items={readiness.unreviewed}
                detail="Drafts you have not signed. They stay drafts."
              />
            ) : null}
            {readiness.unreleased.length > 0 ? (
              <FinishGroup
                status="signed"
                label="Signed, not released"
                items={readiness.unreleased}
                detail="The patient cannot see these until you release them."
              />
            ) : null}
            {missing.length > 0 ? (
              <FinishGroup
                status="not_started"
                items={missing}
                detail="Available for this diagnosis but never started. Mark them Not needed if this patient doesn't need them."
              />
            ) : null}
          </ul>
        ) : (
          <p className="rounded-xl bg-(--status-available-bg) p-3.5 text-sm font-medium text-(--status-available-fg)">
            Every document you started is signed, and patient documents are released.
          </p>
        )}
      </ResponsiveSheet>
    </>
  );
}

function FinishGroup({
  status,
  label,
  items,
  detail,
}: {
  status: keyof typeof DOCUMENT_STATUS;
  label?: string;
  items: readonly string[];
  detail: string;
}) {
  const config = DOCUMENT_STATUS[status];
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-(--border-subtle) p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusText tone={config.tone} icon={config.icon}>
          {label ?? config.label}
        </StatusText>
        <span className="text-sm font-semibold text-(--text-heading)">{items.join(", ")}</span>
      </div>
      <p className="text-sm text-(--text-muted)">{detail}</p>
    </li>
  );
}
