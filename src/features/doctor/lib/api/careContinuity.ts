import { api, ApiError } from "@/lib/api";

/**
 * Doctor-side care-continuity actions for a consultation: the follow-up
 * recommendation and lab orders the assigned physician records from the
 * post-consult workspace.
 *
 * - `GET  /v1/consultations/{id}/follow-up-recommendation`
 * - `PUT  /v1/consultations/{id}/follow-up-recommendation`
 * - `GET  /v1/consultations/{id}/lab-orders`
 * - `POST /v1/consultations/{id}/lab-orders`
 * - `PUT  /v1/consultations/{id}/lab-orders/{labOrderId}`  (→ completed)
 */

export interface FollowUpRecommendation {
  consultationId: string;
  patientId: string;
  recommendedByActorId: string;
  targetDate: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export type LabOrderStatus = "pending_upload" | "under_review" | "completed";

export interface LabOrder {
  labOrderId: string;
  consultationId: string;
  patientId: string;
  orderedByActorId: string;
  testName: string;
  notes?: string;
  status: LabOrderStatus;
  hasResult: boolean;
  orderedAt: string;
  updatedAt: string;
  resultUploadedAt?: string;
}

export const FOLLOW_UP_REASON_MAX = 280;
export const LAB_TEST_NAME_MAX = 160;

/** The recorded recommendation, or `null` when the physician has made none. */
export async function fetchFollowUpRecommendation(
  consultationId: string,
  idToken: string,
): Promise<FollowUpRecommendation | null> {
  if (!idToken || !consultationId) return null;
  try {
    const res = await api.get<FollowUpRecommendation>(
      `/v1/consultations/${encodeURIComponent(consultationId)}/follow-up-recommendation`,
      idToken,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function saveFollowUpRecommendation(
  consultationId: string,
  idToken: string,
  input: { targetDate: string; reason: string },
): Promise<FollowUpRecommendation> {
  const res = await api.put<FollowUpRecommendation>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/follow-up-recommendation`,
    idToken,
    input,
  );
  return res.data;
}

export async function fetchConsultationLabOrders(
  consultationId: string,
  idToken: string,
): Promise<LabOrder[]> {
  if (!idToken || !consultationId) return [];
  const res = await api.get<{ consultationId: string; labOrders?: unknown }>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/lab-orders`,
    idToken,
  );
  return Array.isArray(res.data?.labOrders)
    ? (res.data.labOrders as LabOrder[])
    : [];
}

export async function createLabOrder(
  consultationId: string,
  idToken: string,
  input: { testName: string; notes?: string },
): Promise<LabOrder> {
  const res = await api.post<LabOrder>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/lab-orders`,
    idToken,
    input,
  );
  return res.data;
}

export async function completeLabOrder(
  consultationId: string,
  idToken: string,
  labOrderId: string,
): Promise<LabOrder> {
  const res = await api.put<LabOrder>(
    `/v1/consultations/${encodeURIComponent(consultationId)}/lab-orders/${encodeURIComponent(labOrderId)}`,
    idToken,
    { status: "completed" },
  );
  return res.data;
}
