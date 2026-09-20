import { api, ApiError } from "@/lib/api";

/**
 * CDS draft data access (Slice 7, task 13.3, Requirements 12.7, 12.8).
 *
 * Reviewable CDS output is read from the contract-frozen endpoint
 * `GET /v1/cds/consultations/{consultationId}/drafts`
 * (contracts/openapi.yaml#listCdsDrafts), which returns the consultation's
 * SOAP and patient-card drafts in the `{ data, meta }` envelope. The backend is
 * frozen (Requirement 15) — no route, request field, or envelope is changed
 * here.
 *
 * Generation is asynchronous: when the synchronous inference budget is exceeded
 * the backend queues a `CdsAsyncJob` (contracts/openapi.yaml#CdsAsyncJob) whose
 * `status` moves `queued → running → completed | failed`. The drafts list does
 * not itself carry a generation flag, so the "still being generated" signal
 * (Requirement 12.8) is the job status supplied by the generating flow and
 * threaded into the panel via {@link isCdsGenerationInProgress}.
 */

/** CDS pipeline layer a draft belongs to (contracts/openapi.yaml#CdsDraft). */
export type CdsDraftLayer = "soap" | "patient-card";

/** Review lifecycle of a finished draft (contracts/openapi.yaml#CdsDraft). */
export type CdsDraftStatus = "pending_review" | "approved" | "rejected";

/** Whether a draft's content came from the LLM or a deterministic template. */
export type CdsDraftSource = "llm" | "template";

/**
 * Status of an asynchronous CDS generation job
 * (contracts/openapi.yaml#CdsAsyncJob). `queued` and `running` mean output is
 * still being produced; `completed`/`failed` are terminal.
 */
export type CdsGenerationStatus = "queued" | "running" | "completed" | "failed";

/**
 * Subset of the backend `CdsDraft` schema (contracts/openapi.yaml#CdsDraft)
 * the panel renders. `content` is an opaque object whose keys depend on the
 * layer (e.g. SOAP sections), so it is kept permissive.
 */
export interface CdsDraft {
  draftId: string;
  consultationId: string;
  patientId?: string;
  layer: CdsDraftLayer | string;
  status: CdsDraftStatus | string;
  content: Record<string, unknown> | null;
  source?: CdsDraftSource | string;
  modelUsed?: string;
  profileUsed?: string;
  warnings?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

/** `data` shape of a `GET /v1/cds/.../drafts` response. */
export interface CdsDraftList {
  consultationId: string;
  drafts: CdsDraft[];
}

/**
 * Pure predicate: is CDS generation still in progress for the given job status?
 *
 * Returns `true` only for the non-terminal `queued`/`running` states, which is
 * exactly the condition under which an in-progress indicator must be shown
 * (Requirement 12.8). `undefined` (no known job), `completed`, and `failed` all
 * return `false`.
 *
 * @param status - The latest known {@link CdsGenerationStatus}, if any.
 */
export function isCdsGenerationInProgress(
  status?: CdsGenerationStatus | null,
): boolean {
  return status === "queued" || status === "running";
}

/**
 * Fetch the CDS drafts for a consultation.
 *
 * Calls `GET /v1/cds/consultations/{consultationId}/drafts`, optionally scoped
 * to a single `layer`, and returns the drafts the backend exposes for the
 * caller (Requirement 12.7). Throws an {@link ApiError} when no auth token is
 * available or the request fails, so the calling `AsyncView` surfaces the
 * defined error state with a retry control.
 *
 * @param consultationId - The consultation whose drafts to list.
 * @param token          - Cognito IdToken used to authenticate the request.
 * @param layer          - Optional layer filter (`soap` | `patient-card`).
 * @returns The consultation id and its visible drafts.
 */
export async function fetchCdsDrafts(
  consultationId: string,
  token: string,
  layer?: CdsDraftLayer,
): Promise<CdsDraftList> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view clinical decision support drafts.",
      401,
    );
  }

  const query = layer ? `?layer=${encodeURIComponent(layer)}` : "";
  const res = await api.get<CdsDraftList>(
    `/v1/cds/consultations/${encodeURIComponent(consultationId)}/drafts${query}`,
    token,
  );

  return {
    consultationId: res.data?.consultationId ?? consultationId,
    drafts: res.data?.drafts ?? [],
  };
}

export { ApiError };
