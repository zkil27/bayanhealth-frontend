import { api, ApiError } from "@/lib/api";

/**
 * Follow-up recommendations for the signed-in patient
 * (`GET /v1/patients/me/follow-ups`).
 *
 * Each is a physician's dated "come back by <targetDate>" for one consultation,
 * written through `PUT /v1/consultations/{consultationId}/follow-up-recommendation`.
 * The list is soonest-first and already excludes long-overdue prompts.
 */
export interface FollowUpRecommendation {
  consultationId: string;
  patientId: string;
  recommendedByActorId: string;
  /** `YYYY-MM-DD`. */
  targetDate: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchMyFollowUps(
  idToken: string,
): Promise<FollowUpRecommendation[]> {
  if (!idToken) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view your follow-ups.",
      401,
    );
  }

  const res = await api.get<{ patientId: string; followUps?: unknown }>(
    "/v1/patients/me/follow-ups",
    idToken,
  );

  const raw = res.data?.followUps;
  if (!Array.isArray(raw)) return [];

  const out: FollowUpRecommendation[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    const targetDate = typeof row.targetDate === "string" ? row.targetDate : "";
    const consultationId =
      typeof row.consultationId === "string" ? row.consultationId : "";
    if (!targetDate || !consultationId) continue;
    out.push({
      consultationId,
      patientId: str(row.patientId),
      recommendedByActorId: str(row.recommendedByActorId),
      targetDate,
      reason: str(row.reason),
      createdAt: str(row.createdAt),
      updatedAt: str(row.updatedAt),
    });
  }
  return out;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
