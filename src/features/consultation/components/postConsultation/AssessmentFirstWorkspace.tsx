"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  History,
  PenLine,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArtifactCard, type ArtifactSignatureInput } from "./ArtifactCard";
import { CandidatePicker } from "./CandidatePicker";
import { CareContinuityPanel } from "./CareContinuityPanel";
import { DeliverablesDeck, deriveDeckEntries } from "./DeliverablesDeck";
import { PatientRail } from "./PatientRail";
import { SoapSummaryCards } from "./SoapSummaryCards";
import { ProtectedToolsRail } from "./ProtectedToolsRail";
import { WorkspaceHeader } from "./WorkspaceChrome";
import {
  deriveFinishReadiness,
  deriveRailState,
  deriveToolRows,
  derivePhase,
  hasSafetyLock,
  railBadgeLabel,
  OUTPUT_LABELS,
  RAIL_OUTPUT_TYPES,
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
import { lockReasonCopy, staleReasonLabel, stepGuidance } from "../../lib/cdsCopy";

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
   * The doctor's stored signature specimen. Read here rather than inside each
   * artifact card so seven cards share one request, and so a doctor who has not
   * set one up is told once, in the card they are actually trying to sign.
   */
  const { profile: doctorProfile } = useMyDoctorProfile();

  const [assessment, setAssessment] = useState<CdsAssessment | null>(null);
  const [draftDiagnosis, setDraftDiagnosis] = useState("");
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  const [activeDeliverable, setActiveDeliverable] = useState<CdsProtectedOutputType | null>(null);
  /**
   * Whether the confirmed Assessment is expanded for editing. Confirmed state
   * collapses to a one-line summary bar; this re-opens the full editor. Always
   * false while unconfirmed, where the editor is the whole point of the phase.
   */
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [patientRailCollapsed, setPatientRailCollapsed] = useState(false);
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
        setError(null);
      })
      .catch((cause) => !cancelled && setError(physicianErrorMessage(cause)));
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
          setMessage("Draft status is temporarily unavailable. It will keep retrying on its own."),
        );
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [consultationId, jobs, refreshOutputs, token, markGenerating]);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        await action();
      } catch (cause) {
        if (requiresAuthoritativeRefresh(cause)) {
          resetDerived();
          await refreshAssessment().catch(() => undefined);
          setError(
            `${physicianErrorMessage(cause)} Authoritative state was refreshed; review it before retrying.`,
          );
        } else {
          setError(physicianErrorMessage(cause));
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
      resetDerived();
      setMessage("Draft saved. Nothing can be drafted from it until you confirm it.");
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

      const next = await confirmAssessment(consultationId, token, {
        consultationId,
        physicianActorId,
        expectedAssessmentVersion: confirmationSource.assessmentVersion,
        expectedEditableAssessmentRevision: confirmationSource.editableAssessmentRevision,
        expectedEditableAssessmentDigest: confirmationSource.editableAssessmentDigest,
        expectedAssignmentRevision: confirmationSource.assignmentRevision,
        expectedClinicalInputRevision: confirmationSource.clinicalInputRevision,
        expectedClinicalInputSourceFence: confirmationSource.clinicalInputSourceFence,
        expectedGateRevision: confirmationSource.gateRevision,
      });
      setAssessment(next);
      resetDerived();
      // Confirming is the physician saying "this is my diagnosis". Unlocking is
      // the server saying "and the record still supports it". Making the second
      // a separate button the physician had to find meant every confirmation was
      // followed by a dead-looking rail. Issued straight away, against the
      // freshly returned state so the fences are the ones the server just wrote.
      try {
        await ensureGate(next);
        setMessage(
          `Assessment confirmed and drafting unlocked. Choose a document from Protected tools.`,
        );
      } catch (cause) {
        resetDerived();
        await refreshAssessment().catch(() => undefined);
        if (requiresRedFlagAcknowledgment(cause)) {
          setAcknowledgmentReady(true);
          setMessage(
            "Assessment confirmed and safety re-check complete. Acknowledge the current finding to continue.",
          );
        } else {
          setError(physicianErrorMessage(cause));
          setMessage(
            "Assessment confirmed. Drafting could not be unlocked automatically — review the current state before retrying.",
          );
        }
      }
    });

  const updateOrReattest = (changeType: "update" | "reattest") =>
    assessment?.confirmed &&
    run(async () => {
      const next = await updateConfirmedAssessment(consultationId, token, {
        consultationId,
        physicianActorId,
        changeType,
        diagnosis: changeType === "reattest" ? assessment.confirmed!.diagnosis : draftDiagnosis.trim(),
        expectedAssessmentVersion: assessment.assessmentVersion,
        expectedConfirmedAssessmentDigest: assessment.confirmed!.confirmedAssessmentDigest,
        expectedAssignmentRevision: assessment.assignmentRevision,
        expectedClinicalInputRevision: assessment.clinicalInputRevision,
        expectedClinicalInputSourceFence: assessment.clinicalInputSourceFence,
        expectedGateRevision: assessment.gateRevision,
      });
      setAssessment(next);
      setDraftDiagnosis(next.confirmed?.diagnosis ?? "");
      resetDerived();
      await refreshOutputs();
      try {
        await ensureGate(next);
      } catch (cause) {
        resetDerived();
        await refreshAssessment().catch(() => undefined);
        if (requiresRedFlagAcknowledgment(cause)) setAcknowledgmentReady(true);
      }
      setMessage(
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
      setDraftDiagnosis("");
      resetDerived();
      await refreshOutputs();
      setMessage("Assessment cleared. Drafting stays closed until you confirm a new Assessment.");
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
            setError(
              authoritative
                ? `${physicianErrorMessage(cause)} Authoritative state was refreshed; review it before retrying.`
                : `${physicianErrorMessage(cause)} Refresh to load current state before retrying.`,
            );
          } else {
            setError(physicianErrorMessage(cause));
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
          if (requestId === previewRequestRef.current) setError(physicianErrorMessage(cause));
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
      setEvaluation(null);
      setPreview(null);
      setFocusedCandidate(null);
      setMessage(
        `${diagnosisName} is now your working diagnosis. It is not confirmed yet — confirm it below when you are ready.`,
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
        setMessage("Safety re-checked. Drafting is open again.");
      } catch (cause) {
        if (!requiresRedFlagAcknowledgment(cause)) throw cause;

        // Issuance persists a fresh generation-stage safety evaluation before
        // it reports that the existing episode still needs acknowledgment.
        // Refresh the advanced gate revision, then expose exactly that next
        // physician action instead of repeatedly submitting stale fences.
        resetDerived();
        await refreshAssessment();
        setAcknowledgmentReady(true);
        setMessage("Safety re-check complete. Acknowledge the current finding to continue.");
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
      });
      resetDerived();
      await refreshAssessment();
      setMessage("Safety finding acknowledged. Re-check safety to unlock drafting.");
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
      setError(null);
      setMessage(null);
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
          setMessage(
            `${outputLabels[outputType]} is taking longer than usual, so the server is finishing it in the background.`,
          );
        } else {
          markGenerating(outputType, false);
          await refreshOutputs();
          setMessage(`${outputLabels[outputType]} drafted. Read it, edit if needed, then sign.`);
        }
      } catch (cause) {
        markGenerating(outputType, false);
        if (requiresAuthoritativeRefresh(cause)) {
          resetDerived();
          await refreshAssessment().catch(() => undefined);
          setError(
            `${physicianErrorMessage(cause)} Authoritative state was refreshed; review it before retrying.`,
          );
        } else {
          setError(physicianErrorMessage(cause));
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
      setError(null);
      setMessage(null);
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
        setMessage(`${outputLabels[artifact.outputType]} updated with your changes.`);
      } catch (cause) {
        setError(physicianErrorMessage(cause));
        throw cause;
      }
    },
    [assessment, consultationId, physicianActorId, token],
  );

  const finalize = useCallback(
    async (artifact: CdsProtectedArtifact, signature: ArtifactSignatureInput) => {
      if (!assessment) return;
      setError(null);
      setMessage(null);
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
        setMessage("Signed. The patient cannot see it until you release it separately.");
      } catch (cause) {
        setError(physicianErrorMessage(cause));
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
      setMessage("Released. Nothing else was changed.");
    });

  const loadMoreHistory = () =>
    historyCursor &&
    run(async () => {
      const page = await getOutputHistory(consultationId, token, historyCursor);
      setHistory((known) => [...known, ...page.data.outputs]);
      setHistoryCursor(page.cursor);
    });

  if (!assessment) {
    return (
      <section aria-busy="true" className="m-4 flex items-center gap-2 rounded-xl border p-6">
        <Spinner className="size-4" /> Loading this consultation…
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  // Which of the five designed post-consult states this consultation is in. All
  // of it is derived from the same authoritative server state that drives the
  // gate, so the layout and the permissions cannot disagree (see workspacePhase).
  const phase = derivePhase(assessment);
  const safetyLock = hasSafetyLock(assessment);
  // Drafting is permitted whenever the gate is not actively holding this
  // consultation. A lapsed token is not a hold — `generate` re-issues one.
  const draftingOpen = Boolean(assessment.confirmed) && assessment.lockReasons.length === 0;
  const railState = deriveRailState({ assessment, draftingAuthorized: draftingOpen, artifacts: current });
  const toolRows = deriveToolRows({ assessment, railState, artifacts: current });
  const railOutputTypeSet = new Set(RAIL_OUTPUT_TYPES);
  const railRows = toolRows.filter((row) => railOutputTypeSet.has(row.outputType));
  const icdArtifact = current.find(
    (artifact) => !artifact.effectiveStale && artifact.outputType === "final_icd",
  );
  const icdPayload = readFinalIcdPayload(icdArtifact);
  // Plan is now unified as the premier tab of the deliverables deck.
  // Final ICD remains shown inside the Assessment card.
  const deckEntries = deriveDeckEntries({
    artifacts: current,
    generating,
    exclude: new Set<CdsProtectedOutputType>(["final_icd"]),
  });

  // Identity for the header, from the structured intake demographics.
  const demographics = intake?.sections.details?.demographics;
  const patientAge = ageFromDateOfBirth(demographics?.dateOfBirth);
  const patientSex = demographics?.sex ? SEX_LABELS[demographics.sex] : undefined;
  const patientAllergies = usableAllergyLabel(intake?.sections.details?.allergies);

  return (
    <div
      data-slot="post-consultation-workspace"
      data-phase={phase}
      className="flex min-h-full w-full flex-col"
      aria-label="Assessment-first clinical decision support"
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
        statusLabel={
          safetyLock
            ? "Red flag detected"
            : assessment.confirmed
              ? "Assessment confirmed"
              : "Not yet confirmed"
        }
        statusTone={safetyLock ? "danger" : assessment.confirmed ? "active" : "done"}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={busy}
            onClick={() =>
              run(async () => {
                resetDerived();
                await refreshAssessment();
                await refreshOutputs();
              })
            }
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />

      {/*
        Three columns only where three columns fit. The old layout jumped
        straight from one column to three at `xl`, so every laptop between those
        widths got the entire patient rail and the entire tools rail stacked
        above and below the work — the tools a physician reaches for most,
        pushed furthest from the thing they act on. It now steps 1 → 2 → 3, and
        both rails stick on the wide layouts so neither scrolls away from the
        document they describe.
      */}
      <div
        className={cn(
          "grid flex-1 grid-cols-1 items-start gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_20rem]",
          patientRailCollapsed
            ? "xl:grid-cols-[3.5rem_minmax(0,1fr)_21rem]"
            : "xl:grid-cols-[18rem_minmax(0,1fr)_21rem]",
        )}
      >
        <div className="order-2 min-w-0 lg:order-3 xl:order-1 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2.5rem)] xl:overflow-y-auto">
          <PatientRail
            bookingId={bookingId}
            intake={intake}
            collapsed={patientRailCollapsed}
            onToggleCollapse={() => setPatientRailCollapsed((c) => !c)}
          />
        </div>

        <main className="order-1 flex min-w-0 flex-col gap-4 lg:order-1 xl:order-2">
          {/*
            Read-only Subjective / Objective context. It sits above the
            Assessment card because it is what the physician reads while writing
            the Assessment.
          */}
          <SoapSummaryCards intake={intake} />

          <AssessmentCard
            assessment={assessment}
            allowedTypes={allowedTypes}
            draftDiagnosis={draftDiagnosis}
            onDraftDiagnosis={updateDraftDiagnosis}
            open={assessmentOpen}
            onOpenChange={setAssessmentOpen}
            busy={busy}
            onSave={saveManual}
            onConfirm={confirm}
            onUpdate={() => updateOrReattest("update")}
            onReattest={() => updateOrReattest("reattest")}
            onClear={clear}
            icd={icdPayload}
            icdSyncing={generating.has("final_icd")}
            onSyncIcd={() => {
              if (assessment.confirmed) {
                void generate("final_icd");
              }
            }}
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
            onFieldFocus={() => {
              if (!assessment.confirmed && !evaluation && !busy) void startEvaluation();
            }}
          />

          {/*
            One "what to do next" line for the current §4.1 state.
            `assessment_open` is excluded: its guidance heading duplicates the
            Assessment card header directly beneath it.
          */}
          {guidance && guidance.step !== "assessment_open" && guidance.step !== "generation_ready" ? (
            <div
              data-slot="workspace-guidance"
              data-step={guidance.step}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-card) px-3.5 py-2 text-xs shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full bg-(--teal-600)" aria-hidden />
                <span className="font-bold text-(--text-heading)">{guidance.heading}:</span>
                <span className="font-medium text-(--text-body)">{guidance.instruction}</span>
              </div>
            </div>
          ) : null}

          {/*
            Lock reasons in clinical language, each with the control that clears
            it. These used to render as `lockReasons.join(", ")`, so a physician
            read the raw contract enum -- `clinical_input_changed`.
          */}
          {assessment.lockReasons.length > 0 ? (
            <div
              role="alert"
              data-slot="workspace-locks"
              className={cn(
                "rounded-[14px] border p-3.5",
                safetyLock
                  ? "border-(--danger-border) bg-(--danger-bg)"
                  : "border-(--status-soon-fg)/40 bg-(--status-soon-bg)",
              )}
            >
              {/*
                Ordered so the physician reads *what happened* before being
                handed a button: heading, then one card per reason (a bold
                one-line label, its plain-language meaning underneath, and its
                own concrete next step called out separately rather than run
                together into one dense sentence), and only then the shared
                action that actually clears the two most common locks. The
                button used to sit between the heading and the explanation —
                asking the physician to act before they had read why.
              */}
              <p className="flex items-center gap-2 text-[15px] font-bold text-(--text-heading)">
                <ShieldAlert
                  className={cn(
                    "size-5 shrink-0",
                    safetyLock ? "text-(--danger-fg)" : "text-(--status-soon-fg)",
                  )}
                />
                {assessment.lockReasons.length === 1
                  ? "Drafting is on hold"
                  : `Drafting is on hold for ${assessment.lockReasons.length} reasons`}
              </p>

              <ul className="mt-2.5 space-y-2.5">
                {assessment.lockReasons.map((reason) => {
                  const copy = lockReasonCopy(reason);
                  return (
                    <li
                      key={reason}
                      className="rounded-[10px] bg-(--surface-card)/60 p-2.5 text-sm"
                      data-lock-reason={reason}
                    >
                      <p className="font-semibold text-(--text-heading)">{copy.label}.</p>
                      <p className="mt-0.5 text-(--text-muted)">{copy.meaning}</p>
                      <p className="mt-1 flex items-start gap-1.5 font-medium text-(--text-body)">
                        <span aria-hidden className="shrink-0">
                          →
                        </span>
                        {copy.nextAction}
                      </p>
                      {reason === "acknowledgment_pending"
                      && assessment.clinicalSafetyEpisodeId
                      && acknowledgmentReady ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1.5 flex rounded-full"
                          disabled={busy}
                          onClick={acknowledge}
                        >
                          Acknowledge current episode
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <Button
                type="button"
                data-slot="banner-recheck-safety"
                className="mt-3 rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover)"
                disabled={busy || !assessment.confirmed}
                title={
                  !assessment.confirmed
                    ? "Confirm the Assessment first, then re-run the safety check to unlock drafting."
                    : undefined
                }
                onClick={requestToken}
              >
                <ShieldAlert className="size-4" />
                Re-run safety check
              </Button>
            </div>
          ) : null}

          {message ? (
            <p
              role="status"
              className="rounded-[14px] border border-(--border-subtle) bg-(--surface-accent-soft) p-3.5 text-sm text-(--text-body)"
            >
              {message}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-[14px] border border-(--danger-border) bg-(--danger-bg) p-3.5 text-sm text-(--danger-fg)"
            >
              {error}
            </p>
          ) : null}

          {/* Assessment includes its synchronized ICD coding above. */}
          {/* Plan is unified as the primary tab of DeliverablesDeck below. */}

          <DeliverablesDeck
            entries={deckEntries}
            active={activeDeliverable}
            onActiveChange={setActiveDeliverable}
            busy={busy}
            generating={generating}
            specimen={doctorProfile?.signature}
            defaultSignerName={doctorProfile?.fullName || doctorProfile?.signature?.signerName || undefined}
            canRegenerate={draftingOpen}
            onAmend={amend}
            onFinalize={finalize}
            onRelease={release}
            onRegenerate={(outputType) => void generate(outputType)}
          />

          <CareContinuityPanel consultationId={consultationId} token={token} />

          {Object.values(jobs).length ? (
            <section
              className="rounded-[18px] border border-(--border-subtle) bg-(--surface-card) p-4 shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]"
              aria-labelledby="jobs-heading"
            >
              <h2 id="jobs-heading" className="text-[15px] font-bold text-(--text-heading)">
                Background drafts
              </h2>
              <p className="text-xs text-(--text-muted)">
                Status is polled from the server. There is no client continuation action.
              </p>
              <ul className="mt-3 space-y-2">
                {Object.values(jobs).map((job) => (
                  <li
                    key={job.jobId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-(--surface-warm-soft) p-3 text-sm text-(--text-body)"
                  >
                    <span>
                      {"outputType" in job
                        ? outputLabels[job.outputType as CdsProtectedOutputType]
                        : "Earlier draft"}{" "}
                      · {job.status}
                      {"boundedReason" in job && job.boundedReason ? ` · ${job.boundedReason}` : ""}
                      {!("authoritative" in job) ? " · checking status" : ""}
                    </span>
                    {(!("authoritative" in job) && !terminalJobs.has(job.status)) ||
                    ("authoritative" in job && job.authoritative && !terminalJobs.has(job.status)) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => cancelJob(job as CdsAsyncJob | CdsAsyncJobAccepted)}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Kept out of the pre-confirmation scroll: with no confirmed
              Assessment there is nothing that could have been authorized. */}
          {assessment.confirmed || history.length > 0 ? (
            <details
              data-slot="artifact-history"
              className="overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]"
            >
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3.5 text-[15px] font-bold text-(--text-heading)">
                <History className="size-4.5 shrink-0 text-(--text-muted)" />
                Authorized artifact history
                {history.length ? (
                  <span className="ml-auto rounded-full bg-(--gray-bg) px-2.5 py-0.5 text-xs font-bold text-(--gray-fg)">
                    {history.length}
                  </span>
                ) : null}
              </summary>
              <div className="border-t border-(--border-subtle) p-4">
                <p className="text-sm text-(--text-muted)">
                  Earlier and out-of-date drafts are kept for the record. They cannot be edited,
                  signed or released.
                </p>
                <ul className="mt-3 space-y-2">
                  {history.map((artifact) => (
                    <li
                      key={`${artifact.artifactId}-${artifact.artifactRevision}`}
                      className="rounded-[14px] border border-(--border-subtle) p-3 text-sm text-(--text-body)"
                    >
                      <span className="font-semibold text-(--text-heading)">
                        {outputLabels[artifact.outputType]}
                      </span>{" "}
                      · Assessment v{artifact.assessmentVersion} ·{" "}
                      {artifact.effectiveStale
                        ? (staleReasonLabel(artifact.staleReason) ?? "Out of date")
                        : "Current"}{" "}
                      · {artifact.lifecycleStatus}
                      {artifact.physicianEdited ? " · edited by you" : ""}
                    </li>
                  ))}
                </ul>
                {historyCursor ? (
                  <Button
                    className="mt-3 rounded-full"
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={loadMoreHistory}
                  >
                    Load more history
                  </Button>
                ) : null}
              </div>
            </details>
          ) : null}
        </main>

        <div className="order-3 min-w-0 lg:order-2 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto xl:order-3">
          <ProtectedToolsRail
            railState={railState}
            badgeLabel={railBadgeLabel(railState, railRows)}
            rows={railRows}
            busy={busy}
            generating={generating}
            onDraft={(outputType) => void generate(outputType)}
            onFocusArtifact={setActiveDeliverable}
            gateHint={
              assessment.confirmed && railState === "unlocked"
                ? "Every draft is re-checked against the current record on the server."
                : undefined
            }
            blockedMessage="For a red-flag assessment, routine deliverables stay locked until the safety finding is resolved. Acknowledge the current episode once the latest check reads routine."
            relockedMessage="The assessment or the clinical record changed. Re-run the safety check to unlock the tools and draft the affected documents again."
            footer={
              railState === "unlocked" || railState === "locked" ? (
                <FinishDocumentationControl assessment={assessment} artifacts={current} />
              ) : railState === "relocked" ? (
                <Button
                  type="button"
                  className="w-full rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover)"
                  disabled={busy}
                  onClick={() => updateOrReattest("reattest")}
                >
                  Re-confirm assessment
                </Button>
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
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
 * The Assessment: the one thing on this page the physician writes themselves.
 *
 * Extracted from the workspace body because its two states — open editor with a
 * suggestion picker, and settled one-line summary — were 200 lines of nested
 * ternaries in the middle of the page's layout, which is how the confirm strip's
 * wording drifted out of step with the buttons above it.
 *
 * The action labels are the substantive change. "Save" and "Confirm Assessment"
 * sat side by side with nothing saying which one committed anything; the
 * post-confirmation row read "Change Assessment / Re-attest unchanged / Clear
 * Assessment / Done editing", four verbs of similar weight, one of which
 * destroys the confirmation. They now say what they do and are ordered by
 * consequence.
 */
function AssessmentCard({
  assessment,
  allowedTypes,
  draftDiagnosis,
  onDraftDiagnosis,
  open,
  onOpenChange,
  busy,
  onSave,
  onConfirm,
  onUpdate,
  onReattest,
  onClear,
  icd,
  icdSyncing,
  onSyncIcd,
  picker,
  onFieldFocus,
}: {
  assessment: CdsAssessment;
  allowedTypes: readonly CdsProtectedOutputType[];
  draftDiagnosis: string;
  onDraftDiagnosis: (value: string) => void;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  busy: boolean;
  onSave: () => void;
  onConfirm: () => void;
  onUpdate: () => void;
  onReattest: () => void;
  onClear: () => void;
  icd: { code: string; description: string } | null;
  icdSyncing: boolean;
  onSyncIcd: () => void;
  picker: React.ReactNode;
  onFieldFocus: () => void;
}) {
  const confirmed = assessment.confirmed;
  const manuallyDraftableTypes = allowedTypes.filter(
    (type) => type !== "final_icd" && type !== "lab_request" && type !== "imaging_request",
  );

  /*
    Once confirmed, the Assessment collapses to a one-line bar. It is settled
    state at that point, and leaving the full editor plus the candidate picker
    expanded put the largest, most interactive card on the page in the phase
    where the physician's work has moved to the documents below.

    It collapses only when the confirmed Assessment can actually draft
    something. A diagnosis outside the approved catalogue resolves to an empty
    eligible-output set, and the explanation for that lives in the expanded
    card — collapsing there would leave a tidy summary bar above seven dead
    tools with no stated reason.
  */
  if (confirmed && !open && allowedTypes.length > 0) {
    return (
      <section
        data-slot="assessment-summary-bar"
        className="flex flex-wrap items-center gap-3 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) px-4 py-3 shadow-xs"
        aria-labelledby="assessment-heading"
      >
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--surface-accent-soft) text-(--status-available-fg)"
        >
          <CheckCircle2 className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="assessment-heading" className="text-xs font-bold uppercase tracking-wider text-(--navy-700) dark:text-(--navy-300)">
            Confirmed Assessment
          </h2>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <span className="truncate font-semibold text-(--text-heading)">{confirmed.diagnosis}</span>
            {icd ? (
              <span
                data-slot="assessment-icd-code"
                className="shrink-0 rounded-md bg-(--surface-accent-soft) px-2 py-0.5 text-xs font-bold text-(--teal-800) dark:text-(--teal-300)"
              >
                ICD-10 {icd.code}
              </span>
            ) : icdSyncing ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-(--ai-fg)">
                <Spinner className="size-3" /> Syncing ICD-10…
              </span>
            ) : null}
            <span className="text-xs font-medium text-(--text-muted)">v{assessment.assessmentVersion}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={busy}
          onClick={() => onOpenChange(true)}
        >
          <PenLine className="size-4" /> Revise
        </Button>
      </section>
    );
  }

  return (
    <section
      data-slot="assessment-card"
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]"
      aria-labelledby="assessment-heading"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) px-4 py-3.5">
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-md bg-(--surface-accent-soft) text-xs font-bold text-(--status-available-fg)"
        >
          A
        </span>
        <h2 id="assessment-heading" className="text-[15px] font-bold text-(--text-heading)">
          Your Assessment
        </h2>
        {assessment.confirmationState === "confirmed" ? (
          <span className="rounded-full bg-(--status-available-bg) px-2.5 py-0.5 text-xs font-bold text-(--status-available-fg)">
            Confirmed
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-(--status-soon-bg) px-2.5 py-0.5 text-xs font-bold text-(--status-soon-fg)">
            <PenLine className="size-3" />
            Not confirmed yet
          </span>
        )}
        <span className="ml-auto text-xs text-(--text-subtle)">
          Version {assessment.assessmentVersion}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-3 p-4">
        <label htmlFor="assessment-diagnosis" className="text-sm font-medium text-(--text-body)">
          {confirmed
            ? "Confirmed diagnosis — changing it creates a new version"
            : "Write your diagnosis, or pick a suggestion below"}
        </label>
        <Textarea
          id="assessment-diagnosis"
          value={draftDiagnosis}
          // PRD v3.2 §4.2 fixes this string verbatim as acceptance evidence.
          placeholder="Type or select diagnosis..."
          className="min-h-16 rounded-[12px]"
          onChange={(event) => onDraftDiagnosis(event.target.value)}
          onFocus={onFieldFocus}
          disabled={busy}
        />
        {!confirmed && assessment.editableDiagnosis.trim() ? (
          <p className="text-sm" data-slot="assessment-saved-unconfirmed">
            <span className="text-(--text-muted)">Saved draft, not confirmed:</span>{" "}
            <span className="font-medium text-(--text-heading)">{assessment.editableDiagnosis}</span>
          </p>
        ) : null}

        {confirmed ? (
          <div
            className="rounded-[14px] bg-(--surface-warm-soft) p-3.5 text-sm"
            data-slot="assessment-confirmed-summary"
          >
            <p className="font-bold text-(--text-heading)">Confirmed: {confirmed.diagnosis}</p>
            <p className="text-(--text-muted)">
              Confirmed by you at {new Date(confirmed.confirmedAt).toLocaleString()}
            </p>
            <div className="mt-2 rounded-[10px] border border-(--border-subtle) bg-(--surface-card) p-2.5">
              <p className="text-xs font-medium text-(--text-subtle)">
                Assessment code
              </p>
              {icd ? (
                <p className="mt-0.5 font-bold text-(--text-heading)" data-slot="assessment-icd-code">
                  ICD-10 {icd.code} <span className="font-normal text-(--text-muted)">· {icd.description}</span>
                </p>
              ) : icdSyncing ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-(--ai-fg)">
                  <Spinner className="size-3.5" /> Syncing ICD-10 with this Assessment…
                </p>
              ) : allowedTypes.includes("final_icd") ? (
                <Button type="button" size="sm" variant="outline" className="mt-1 rounded-full" onClick={onSyncIcd}>
                  <RefreshCw className="size-3.5" /> Sync ICD-10 code
                </Button>
              ) : (
                <p className="mt-0.5 text-(--text-muted)">No catalogued ICD code is available.</p>
              )}
            </div>
            {manuallyDraftableTypes.length ? (
              <p className="mt-1 text-(--text-body)">
                Available to draft: {manuallyDraftableTypes.map((type) => outputLabels[type]).join(", ")}
              </p>
            ) : (
              /*
                The single most confusing state in live testing. A diagnosis
                outside the approved catalogue resolves to `unmapped_manual`
                with an empty eligible-output set, which disables all seven
                controls permanently.
              */
              <p className="mt-1 text-(--danger-fg)">
                Nothing can be drafted from this diagnosis — it is not in the approved
                catalogue yet. Your Assessment is still recorded. To draft, confirm a
                catalogued diagnosis instead: clear this Assessment, then focus the diagnosis
                field to see what is available.
              </p>
            )}
          </div>
        ) : null}

        {confirmed ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover)"
              disabled={busy || !draftDiagnosis.trim() || draftDiagnosis.trim() === confirmed.diagnosis}
              onClick={onUpdate}
            >
              Save as new version
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={busy}
              onClick={onReattest}
            >
              Re-attest, unchanged
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto rounded-full text-(--danger-fg) hover:bg-(--danger-bg)"
              disabled={busy}
              onClick={onClear}
            >
              Clear Assessment
            </Button>
          </div>
        ) : null}
      </div>

      {/*
        The diagnosis picker lives inside the Assessment card rather than beside
        it: the suggestions exist to fill the field directly above them. It
        unmounts entirely once confirmed, where its only control is disabled by
        design.
      */}
      {!confirmed ? <div className="border-t border-(--border-subtle) p-4">{picker}</div> : null}

      {!confirmed ? (
        <div
          data-slot="assessment-confirm-strip"
          className="flex flex-col gap-2 border-t border-(--border-subtle) bg-(--surface-warm-soft) px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end"
        >
          <p className="min-w-0 flex-1 text-xs text-(--text-muted) sm:pr-3">
            Confirming records this as your clinical judgment and opens the protected tools.
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy || !draftDiagnosis.trim()}
            onClick={onSave}
          >
            Save draft
          </Button>
          <Button
            type="button"
            className="rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover)"
            disabled={busy || !draftDiagnosis.trim()}
            onClick={onConfirm}
          >
            {busy ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" />}
            Confirm Assessment &amp; continue
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Finish documentation remains unavailable until Assessment confirmation. Once
 * confirmed, the doctor may leave at any point after explicitly reviewing what
 * will remain missing, unsigned, or unreleased.
 */
function FinishDocumentationControl({
  assessment,
  artifacts,
}: {
  assessment: CdsAssessment;
  artifacts: readonly CdsProtectedArtifact[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const readiness = deriveFinishReadiness({ assessment, artifacts });

  if (!readiness.canFinish) {
    return (
      <button
        type="button"
        disabled
        data-slot="finish-documentation"
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-(--action-primary) px-4 py-2.5 text-[15px] font-bold text-white opacity-50 shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)]"
      >
        <CheckCircle2 className="size-4" />
        Finish documentation
      </button>
    );
  }

  const hasOutstanding =
    readiness.missing.length > 0
    || readiness.unreviewed.length > 0
    || readiness.unreleased.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        data-slot="finish-documentation"
        className="w-full rounded-full bg-(--action-primary) text-white shadow-[inset_0_-3.2px_0_0_rgba(0,0,0,0.2)] hover:bg-(--action-primary-hover)"
        onClick={() => setOpen(true)}
      >
        <CheckCircle2 className="size-4" />
        Finish documentation
      </Button>
      <AlertDialogContent
        size="lg"
        className="p-6 sm:p-7 gap-5 rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-lg"
      >
        <AlertDialogHeader className="space-y-1.5 text-left">
          <AlertDialogTitle className="text-lg font-bold text-(--text-heading)">
            {hasOutstanding ? "Finish with incomplete documentation?" : "Finish documentation?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-(--text-muted)">
            Your confirmed Assessment is already saved. Leaving this workspace will not generate,
            sign, release, or delete any document.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm text-(--text-body)">
          {readiness.missing.length > 0 ? (
            <DocumentationWarning
              title="Not generated"
              items={readiness.missing}
              detail="These documents will not exist unless you return and draft them."
            />
          ) : null}
          {readiness.unreviewed.length > 0 ? (
            <DocumentationWarning
              title="Drafted but not signed"
              items={readiness.unreviewed}
              detail="These remain physician-unreviewed drafts."
            />
          ) : null}
          {readiness.unreleased.length > 0 ? (
            <DocumentationWarning
              title="Signed but not released"
              items={readiness.unreleased}
              detail="Patient-facing documents in this group will remain unavailable to the patient."
            />
          ) : null}
          {!hasOutstanding ? (
            <p className="rounded-xl border border-(--teal-500)/30 bg-(--status-available-bg) p-3.5 text-sm font-medium text-(--status-available-fg)">
              All selected documentation has been completed. You can safely return to consultation history.
            </p>
          ) : (
            <p className="rounded-xl border border-(--border-subtle) bg-(--surface-warm-soft)/40 p-3 text-xs font-medium text-(--text-muted)">
              You can return later to complete the remaining documents. Confirm only if this is intentional.
            </p>
          )}
        </div>

        <AlertDialogFooter className="mt-1 pt-4 border-t border-(--border-subtle) flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
          <AlertDialogCancel className="w-full sm:w-auto h-10 rounded-full border border-(--border-default) px-5 text-xs font-semibold text-(--text-body) hover:bg-(--surface-warm-soft)">
            Continue documenting
          </AlertDialogCancel>
          <AlertDialogAction
            data-slot="finish-documentation-confirm"
            className="w-full sm:w-auto h-10 rounded-full bg-(--action-primary) px-5 text-xs font-semibold text-white shadow-xs hover:bg-(--action-primary-hover)"
            onClick={() => router.push("/doctor/history")}
          >
            Finish and go to history
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DocumentationWarning({
  title,
  items,
  detail,
}: {
  title: string;
  items: readonly string[];
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-(--status-soon-fg)/30 bg-(--status-soon-bg)/40 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-(--status-soon-fg)">{title}</p>
        <span className="rounded-md border border-(--status-soon-fg)/20 bg-white/90 dark:bg-(--surface-card) px-2.5 py-0.5 text-xs font-bold text-(--text-heading) shadow-2xs">
          {items.join(", ")}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-(--text-muted)">{detail}</p>
    </div>
  );
}
