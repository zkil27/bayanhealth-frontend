import { api, ApiError, newCorrelationId, type ApiDetailedResponse } from "@/lib/api";
import type {
  CdsArtifactAmendmentRequest,
  CdsArtifactFinalizationRequest,
  CdsArtifactReleaseRequest,
  CdsAssessment,
  CdsAssessmentClearRequest,
  CdsAssessmentConfirmationRequest,
  CdsAsyncJob,
  CdsAsyncJobAccepted,
  CdsAsyncJobCancellationRequest,
  CdsAsyncJobView,
  CdsCandidateEvaluation,
  CdsCandidateEvaluationCreateRequest,
  CdsCandidateSelectionRequest,
  CdsConfirmedAssessmentUpdateRequest,
  CdsCurrentOutputs,
  CdsDiagnosisCandidatePreview,
  CdsEditableAssessmentUpdateRequest,
  CdsGateTokenIssueRequest,
  CdsGateTokenIssueResult,
  CdsOutputHistory,
  CdsProtectedArtifact,
  CdsProtectedGenerationRequest,
  CdsProtectedOutputType,
  CdsRedFlagAcknowledgmentRequest,
  CdsRedFlagAcknowledgmentResult,
} from "@/types/cds-contract";

export interface CursorPage<T> {
  data: T;
  cursor?: string;
  hasMore: boolean;
}

export type CdsGenerationResult =
  | { kind: "completed"; artifact: CdsProtectedArtifact }
  | { kind: "accepted"; job: CdsAsyncJobAccepted };

const generationPaths: Record<CdsProtectedOutputType, string> = {
  plan: "plan-generations",
  prescription: "prescription-generations",
  final_icd: "final-icd-generations",
  medical_certificate: "medical-certificate-generations",
  lab_request: "lab-request-generations",
  imaging_request: "imaging-request-generations",
  patient_education: "patient-education-generations",
};

function consultationPath(consultationId: string): string {
  return `/v1/cds/consultations/${encodeURIComponent(consultationId)}`;
}

function requireToken(token: string): void {
  if (!token) throw new ApiError("AUTH_REQUIRED", "Sign in to continue.", 401);
}

async function command<T>(
  path: string,
  token: string,
  method: "POST" | "PUT" | "DELETE",
  body: unknown,
): Promise<ApiDetailedResponse<T>> {
  requireToken(token);
  return api.request<T>(path, token, {
    method,
    body: JSON.stringify(body),
    correlationId: newCorrelationId(),
    cache: "no-store",
  });
}

export async function getAssessment(consultationId: string, token: string): Promise<CdsAssessment> {
  if (consultationId === "demo" || consultationId === "demo-consult") {
    return {
      consultationId: "demo",
      confirmationState: "confirmed",
      editableDiagnosis: "Acute Bronchitis (J20.9)",
      editableAssessmentRevision: 1,
      editableAssessmentDigest: "demo-digest",
      assessmentVersion: 1,
      assignmentRevision: 1,
      clinicalInputRevision: 1,
      clinicalInputSourceFence: 1,
      gateRevision: 1,
      policyActivationRevision: 1,
      lockReasons: [],
      allowedOutputTypes: [
        "plan",
        "prescription",
        "lab_request",
        "imaging_request",
        "medical_certificate",
        "patient_education",
      ],
      confirmed: {
        diagnosis: "Acute Bronchitis (J20.9)",
        confirmedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        physicianActorId: "demo-doctor",
        source: "manual_entry",
        catalogVersion: "v1",
        generationEligibility: {
          capability: "full_solver",
          eligibleOutputTypes: [
            "plan",
            "prescription",
            "lab_request",
            "imaging_request",
            "medical_certificate",
            "patient_education",
          ],
          digest: "demo-digest",
        },
        confirmedAssessmentDigest: "demo-digest",
        confirmedEditableAssessmentDigest: "demo-digest",
        confirmedEditableAssessmentRevision: 1,
        assessmentVersion: 1,
      },
      editable: {
        draftDiagnosis: "Acute Bronchitis (J20.9)",
        updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      },
    } as unknown as CdsAssessment;
  }
  requireToken(token);
  return (await api.request<CdsAssessment>(`${consultationPath(consultationId)}/assessment`, token, {
    method: "GET",
    correlationId: newCorrelationId(),
    cache: "no-store",
  })).data;
}

export async function updateEditableAssessment(
  consultationId: string,
  token: string,
  request: CdsEditableAssessmentUpdateRequest,
): Promise<CdsAssessment> {
  return (await command<CdsAssessment>(`${consultationPath(consultationId)}/assessment/editable`, token, "PUT", request)).data;
}

export async function confirmAssessment(
  consultationId: string,
  token: string,
  request: CdsAssessmentConfirmationRequest,
): Promise<CdsAssessment> {
  return (await command<CdsAssessment>(`${consultationPath(consultationId)}/assessment/confirmations`, token, "POST", request)).data;
}

export async function updateConfirmedAssessment(
  consultationId: string,
  token: string,
  request: CdsConfirmedAssessmentUpdateRequest,
): Promise<CdsAssessment> {
  return (await command<CdsAssessment>(`${consultationPath(consultationId)}/assessment/confirmation`, token, "PUT", request)).data;
}

export async function clearAssessment(
  consultationId: string,
  token: string,
  request: CdsAssessmentClearRequest,
): Promise<CdsAssessment> {
  return (await command<CdsAssessment>(`${consultationPath(consultationId)}/assessment/confirmation`, token, "DELETE", request)).data;
}

export async function createCandidateEvaluation(
  consultationId: string,
  token: string,
  request: CdsCandidateEvaluationCreateRequest,
): Promise<CdsCandidateEvaluation> {
  return (await command<CdsCandidateEvaluation>(`${consultationPath(consultationId)}/diagnosis-candidate-evaluations`, token, "POST", request)).data;
}
export async function searchCandidates(
  consultationId: string,
  evaluationId: string,
  token: string,
  options: { query?: string; cursor?: string; limit?: number } = {},
): Promise<CursorPage<CdsCandidateEvaluation>> {
  requireToken(token);
  const query = new URLSearchParams();
  if (options.query) query.set("query", options.query);
  if (options.cursor) query.set("cursor", options.cursor);
  query.set("limit", String(Math.min(25, Math.max(1, options.limit ?? 10))));
  const response = await api.request<CdsCandidateEvaluation>(
    `${consultationPath(consultationId)}/diagnosis-candidate-evaluations/${encodeURIComponent(evaluationId)}?${query}`,
    token,
    { method: "GET", correlationId: newCorrelationId(), cache: "no-store" },
  );
  const pagination = response.meta.pagination as
    | { cursor?: string; hasMore?: boolean }
    | undefined;
  return { data: response.data, cursor: pagination?.cursor, hasMore: pagination?.hasMore === true };
}

export async function getCandidatePreview(
  consultationId: string,
  evaluationId: string,
  diagnosisName: string,
  token: string,
): Promise<CdsDiagnosisCandidatePreview> {
  requireToken(token);
  const query = new URLSearchParams({ diagnosisName });
  return (await api.request<CdsDiagnosisCandidatePreview>(
    `${consultationPath(consultationId)}/diagnosis-candidate-evaluations/${encodeURIComponent(evaluationId)}/preview?${query}`,
    token,
    { method: "GET", correlationId: newCorrelationId(), cache: "no-store" },
  )).data;
}

export async function selectCandidate(
  consultationId: string,
  evaluationId: string,
  token: string,
  request: CdsCandidateSelectionRequest,
): Promise<CdsAssessment> {
  return (await command<CdsAssessment>(
    `${consultationPath(consultationId)}/diagnosis-candidate-evaluations/${encodeURIComponent(evaluationId)}/selections`,
    token,
    "POST",
    request,
  )).data;
}

export async function issueGateToken(
  consultationId: string,
  token: string,
  request: CdsGateTokenIssueRequest,
): Promise<CdsGateTokenIssueResult> {
  if (consultationId === "demo" || consultationId === "demo-consult") {
    return {
      gateToken: "demo-gate-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    } as unknown as CdsGateTokenIssueResult;
  }
  return (await command<CdsGateTokenIssueResult>(`${consultationPath(consultationId)}/gate-tokens`, token, "POST", request)).data;
}

export async function acknowledgeRedFlag(
  consultationId: string,
  token: string,
  request: CdsRedFlagAcknowledgmentRequest,
): Promise<CdsRedFlagAcknowledgmentResult> {
  return (await command<CdsRedFlagAcknowledgmentResult>(
    `${consultationPath(consultationId)}/red-flag-acknowledgments`, token, "POST", request,
  )).data;
}

export async function generateProtectedOutput(
  consultationId: string,
  token: string,
  outputType: CdsProtectedOutputType,
  request: CdsProtectedGenerationRequest,
): Promise<CdsGenerationResult> {
  const response = await command<CdsProtectedArtifact | CdsAsyncJobAccepted>(
    `${consultationPath(consultationId)}/${generationPaths[outputType]}`,
    token,
    "POST",
    request,
  );
  if (response.httpStatus === 202) return { kind: "accepted", job: response.data as CdsAsyncJobAccepted };
  return { kind: "completed", artifact: response.data as CdsProtectedArtifact };
}

export async function getCurrentOutputs(consultationId: string, token: string): Promise<CdsCurrentOutputs> {
  if (consultationId === "demo" || consultationId === "demo-consult") {
    return {
      outputs: [
        {
          artifactId: "demo-art-plan",
          outputType: "plan",
          artifactRevision: 1,
          assessmentVersion: 1,
          lifecycleStatus: "generated",
          effectiveStale: false,
          physicianEdited: false,
          payload: {
            summary: "Supportive care, hydration, and short-term bronchodilator therapy for acute bronchitis.",
            goals: ["Symptom relief of productive cough", "Prevention of secondary bacterial infection"],
            interventions: ["Increased fluid intake (2-3L/day)", "Steam inhalation prn", "Adequate rest"],
            followUp: "Follow-up in 3-5 days if fever persists or cough worsens.",
          },
        },
        {
          artifactId: "demo-art-rx",
          outputType: "prescription",
          artifactRevision: 1,
          assessmentVersion: 1,
          lifecycleStatus: "generated",
          effectiveStale: false,
          physicianEdited: false,
          payload: {
            medications: [
              {
                genericName: "Salbutamol",
                dose: "2mg",
                route: "Oral",
                frequency: "Every 8 hours as needed",
                duration: "5 days",
                instructions: "Take with or after meals",
              },
              {
                genericName: "Paracetamol",
                dose: "500mg",
                route: "Oral",
                frequency: "Every 4 to 6 hours as needed",
                duration: "3 days",
                instructions: "Do not exceed 4g in 24 hours",
              },
            ],
          },
        },
        {
          artifactId: "demo-art-lab",
          outputType: "lab_request",
          artifactRevision: 1,
          assessmentVersion: 1,
          lifecycleStatus: "generated",
          effectiveStale: false,
          physicianEdited: false,
          payload: {
            tests: [
              {
                testName: "Complete Blood Count (CBC) with Platelet Count",
                rationale: "Evaluate leukocytosis / acute infectious process",
                priority: "routine",
              },
            ],
          },
        },
        {
          artifactId: "demo-art-imaging",
          outputType: "imaging_request",
          artifactRevision: 1,
          assessmentVersion: 1,
          lifecycleStatus: "generated",
          effectiveStale: false,
          physicianEdited: false,
          payload: {
            studies: [
              {
                studyName: "Chest X-Ray PA/Lateral",
                bodyRegion: "Chest",
                rationale: "Rule out pneumonia / lower respiratory consolidation",
                priority: "routine",
              },
            ],
          },
        },
        {
          artifactId: "demo-art-medcert",
          outputType: "medical_certificate",
          artifactRevision: 1,
          assessmentVersion: 1,
          lifecycleStatus: "generated",
          effectiveStale: false,
          physicianEdited: false,
          payload: {
            statement: "Excused from physical work duties for 3 days from date of examination.",
            validFrom: "2026-09-23",
            validThrough: "2026-09-26",
          },
        },
      ],
    } as unknown as CdsCurrentOutputs;
  }
  requireToken(token);
  return (await api.request<CdsCurrentOutputs>(`${consultationPath(consultationId)}/outputs/current`, token, {
    method: "GET", correlationId: newCorrelationId(), cache: "no-store",
  })).data;
}

export async function getOutputHistory(
  consultationId: string,
  token: string,
  cursor?: string,
): Promise<CursorPage<CdsOutputHistory>> {
  if (consultationId === "demo" || consultationId === "demo-consult") {
    return { data: { outputs: [] } as unknown as CdsOutputHistory, hasMore: false };
  }
  requireToken(token);
  const query = new URLSearchParams({ limit: "20" });
  if (cursor) query.set("cursor", cursor);
  const response = await api.request<CdsOutputHistory>(
    `${consultationPath(consultationId)}/outputs/history?${query}`,
    token,
    { method: "GET", correlationId: newCorrelationId(), cache: "no-store" },
  );
  const pagination = response.meta.pagination as
    | { cursor?: string; hasMore?: boolean }
    | undefined;
  return { data: response.data, cursor: pagination?.cursor, hasMore: pagination?.hasMore === true };
}
/**
 * Replace a generated artifact's payload with the physician's own revision.
 *
 * `POST .../outputs/{artifactId}/amendments`. The artifact stays `generated` —
 * amending is authoring, not signing — with a bumped `artifactRevision` and
 * `physicianEdited: true`, so the returned artifact must replace the local copy
 * before any subsequent finalize call, whose `expectedArtifactRevision` would
 * otherwise be one behind.
 */
export async function amendArtifact(
  consultationId: string,
  artifactId: string,
  token: string,
  request: CdsArtifactAmendmentRequest,
): Promise<CdsProtectedArtifact> {
  return (await command<CdsProtectedArtifact>(
    `${consultationPath(consultationId)}/outputs/${encodeURIComponent(artifactId)}/amendments`,
    token,
    "POST",
    request,
  )).data;
}

export async function finalizeArtifact(
  consultationId: string,
  artifactId: string,
  token: string,
  request: CdsArtifactFinalizationRequest,
): Promise<CdsProtectedArtifact> {
  return (await command<CdsProtectedArtifact>(
    `${consultationPath(consultationId)}/outputs/${encodeURIComponent(artifactId)}/finalizations`,
    token,
    "POST",
    request,
  )).data;
}

export async function releaseArtifact(
  consultationId: string,
  artifactId: string,
  token: string,
  request: CdsArtifactReleaseRequest,
): Promise<CdsProtectedArtifact> {
  return (await command<CdsProtectedArtifact>(
    `${consultationPath(consultationId)}/outputs/${encodeURIComponent(artifactId)}/releases`,
    token,
    "POST",
    request,
  )).data;
}

export async function getAsyncJob(
  consultationId: string,
  jobId: string,
  token: string,
): Promise<CdsAsyncJobView> {
  requireToken(token);
  return (await api.request<CdsAsyncJobView>(
    `${consultationPath(consultationId)}/jobs/${encodeURIComponent(jobId)}`,
    token,
    { method: "GET", correlationId: newCorrelationId(), cache: "no-store" },
  )).data;
}

export async function cancelAsyncJob(
  consultationId: string,
  jobId: string,
  token: string,
  request: CdsAsyncJobCancellationRequest,
): Promise<CdsAsyncJob> {
  return (await command<CdsAsyncJob>(
    `${consultationPath(consultationId)}/jobs/${encodeURIComponent(jobId)}/cancellations`,
    token,
    "POST",
    request,
  )).data;
}

const refreshCodes = new Set([
  "STATE_CONFLICT",
  "STALE_ASSESSMENT_VERSION",
  "STALE_EDITABLE_ASSESSMENT",
  "STALE_CLINICAL_INPUT",
  "STALE_GATE_REVISION",
  "STALE_ASSIGNMENT_REVISION",
  "GATE_TOKEN_MISMATCH",
  "STALE_POLICY_REVISION",
  "STALE_CANDIDATE_EVALUATION",
  "STALE_ARTIFACT",
  "GENERATION_LOCKED",
  "RED_FLAG_ACKNOWLEDGMENT_REQUIRED",
]);

export function requiresAuthoritativeRefresh(error: unknown): boolean {
  return error instanceof ApiError && refreshCodes.has(error.code);
}

export function requiresRedFlagAcknowledgment(error: unknown): boolean {
  return error instanceof ApiError
    && (error.code === "GENERATION_LOCKED" || error.code === "RED_FLAG_ACKNOWLEDGMENT_REQUIRED");
}

/**
 * Server error code → physician-facing sentence.
 *
 * PRD v3.2 §4 requires this workspace to read as clinical documentation, not as
 * a systems readout. Two gaps made it read as the latter (ADR-20260810-04):
 * `RED_FLAG_EVALUATION_FAILED` and `STATE_CONFLICT` had no case and fell to the
 * `default`, so live testing surfaced literal text like "The server rejected
 * this action (RED_FLAG_EVALUATION_FAILED)". Every code the CDS surface can
 * actually return is now named, and the `default` no longer prints the raw code
 * to the physician.
 *
 * Each message states what happened AND the next step, because a physician who
 * is told only that something was rejected has no way to proceed.
 */
export function physicianErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Could not reach the server. Check your connection and try again.";
  switch (error.code) {
    case "CPG_PREVIEW_UNAVAILABLE":
      // "No prior preview is shown" is a clinical safety statement, not filler:
      // it tells the physician that a stale summary is NOT being displayed in
      // place of the one that failed to load. Keep it in any rewording.
      return "The reference summary is unavailable. No prior preview is shown, so continue with your own clinical judgement or try again.";
    case "ASSESSMENT_GENERATION_NOT_ELIGIBLE":
      return "This diagnosis is not yet in the approved catalogue, so the system will not draft from it. You can still record it as your Assessment.";
    case "OUTPUT_TYPE_NOT_ELIGIBLE":
      return "This document type is not available for the diagnosis you confirmed.";
    case "GATE_TOKEN_EXPIRED":
    case "EXPIRED_GATE_TOKEN":
      return "Your drafting authorisation expired. Re-check safety to unlock drafting again.";
    case "RED_FLAG_BLOCKED":
      return "A safety finding takes this consultation off the routine remote pathway, so drafting is closed. Review the finding shown with the candidates.";
    case "RED_FLAG_ACKNOWLEDGMENT_REQUIRED":
    case "ACKNOWLEDGMENT_REQUIRED":
    case "GENERATION_LOCKED":
      return "A safety finding is waiting for your acknowledgement before drafting can reopen.";
    case "RED_FLAG_EVALUATION_FAILED":
      // Previously fell through to the raw-code default. This is the safety
      // check failing to complete, not a clinical finding.
      return "The safety check could not be completed, so nothing was unlocked. Try again; if it keeps failing, contact the administrator.";
    case "STALE_CANDIDATE_EVALUATION":
      return "The patient's information changed, so the earlier suggestions no longer apply. Load suggestions again.";
    case "STATE_CONFLICT":
      // Also previously a raw-code default. `requiresAuthoritativeRefresh`
      // already refreshes state for this code and appends its own sentence.
      return "This consultation moved on before your change was saved, so nothing was applied.";
    case "STALE_ASSESSMENT_VERSION":
    case "STALE_EDITABLE_ASSESSMENT":
      return "The Assessment changed since this screen loaded, so your edit was not applied.";
    case "STALE_CLINICAL_INPUT":
      return "The patient's clinical information changed, so this action was not applied.";
    case "STALE_GATE_REVISION":
      return "Your drafting authorisation is no longer current. Re-check safety to unlock drafting again.";
    case "STALE_ASSIGNMENT_REVISION":
    case "GATE_TOKEN_MISMATCH":
      return "This consultation was reassigned, so this action was not applied.";
    case "STALE_POLICY_REVISION":
      return "The clinical policy changed, so this action was not applied. Review the current state before retrying.";
    case "STALE_ARTIFACT":
      return "This draft is out of date and can no longer be finalised. Draft it again from the current Assessment.";
    case "RATE_LIMITED":
      return "Too many requests. Wait a few seconds, then try once more.";
    case "KYC_VERIFICATION_REQUIRED":
      return "Your credential verification must be approved before you can complete clinical documentation.";
    case "AUTH_REQUIRED":
    case "AUTH_TOKEN_INVALID":
      return "Your session expired. Sign in again to continue.";
    case "AUTH_FORBIDDEN":
      return "Only the physician assigned to this consultation can take this action.";
    case "RESOURCE_NOT_FOUND":
      return "This consultation could not be found, or it is not assigned to you.";
    default:
      // Deliberately does NOT interpolate `error.code`. A physician cannot act
      // on a contract enum, and printing one is what made this surface read as
      // a systems readout.
      //
      // It also does not log the code. `assessmentFirst.security.test.ts`
      // forbids logging calls anywhere in this module, because everything
      // flowing through here is adjacent to gate tokens and clinical content.
      // An unmapped code is a gap in the switch above, to be closed there
      // rather than papered over with telemetry from a clinical client.
      return "The server would not accept this action. Refresh to load current state, then try again.";
  }
}

export { ApiError };
