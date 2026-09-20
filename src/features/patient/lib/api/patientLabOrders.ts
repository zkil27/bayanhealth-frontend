import { api, ApiError, newIdempotencyKey } from "@/lib/api";

/**
 * Lab / diagnostic orders for the signed-in patient.
 *
 * - `GET /v1/patients/me/lab-orders` — the list, newest first.
 * - `POST /v1/patients/me/lab-orders/{id}/result-upload-url` — presigned PUT.
 * - `POST /v1/patients/me/lab-orders/{id}/result` — register the upload.
 *
 * The order itself is written by the ordering physician
 * (`POST /v1/consultations/{consultationId}/lab-orders`).
 */
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

export const LAB_RESULT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type LabResultContentType = (typeof LAB_RESULT_CONTENT_TYPES)[number];

export function isLabResultContentType(v: string): v is LabResultContentType {
  return (LAB_RESULT_CONTENT_TYPES as readonly string[]).includes(v);
}

export async function fetchMyLabOrders(idToken: string): Promise<LabOrder[]> {
  if (!idToken) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view your lab orders.",
      401,
    );
  }
  const res = await api.get<{ patientId: string; labOrders?: unknown }>(
    "/v1/patients/me/lab-orders",
    idToken,
  );
  const raw = res.data?.labOrders;
  if (!Array.isArray(raw)) return [];

  const out: LabOrder[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    const labOrderId = str(row.labOrderId);
    const status = str(row.status);
    if (!labOrderId || !isStatus(status)) continue;
    out.push({
      labOrderId,
      consultationId: str(row.consultationId),
      patientId: str(row.patientId),
      orderedByActorId: str(row.orderedByActorId),
      testName: str(row.testName),
      ...(str(row.notes) ? { notes: str(row.notes) } : {}),
      status,
      hasResult: row.hasResult === true,
      orderedAt: str(row.orderedAt),
      updatedAt: str(row.updatedAt),
      ...(str(row.resultUploadedAt)
        ? { resultUploadedAt: str(row.resultUploadedAt) }
        : {}),
    });
  }
  return out;
}

interface UploadUrlResponse {
  uploadUrl: string;
  resultKey: string;
  expiresIn: number;
}

/**
 * Full upload flow: presign → PUT the bytes straight to storage → register.
 * Returns the updated (`under_review`) order.
 */
export async function uploadLabResult(
  idToken: string,
  labOrderId: string,
  file: Blob,
  contentType: LabResultContentType,
): Promise<LabOrder> {
  const idem = newIdempotencyKey();

  const presign = await api.post<UploadUrlResponse>(
    `/v1/patients/me/lab-orders/${encodeURIComponent(labOrderId)}/result-upload-url`,
    idToken,
    { contentType },
    idem,
  );

  const put = await fetch(presign.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) {
    throw new ApiError(
      "STORAGE_REJECTED",
      `Storage rejected the upload (HTTP ${put.status}).`,
      502,
    );
  }

  const confirm = await api.post<LabOrder>(
    `/v1/patients/me/lab-orders/${encodeURIComponent(labOrderId)}/result`,
    idToken,
    { resultKey: presign.data.resultKey },
    newIdempotencyKey(),
  );
  return confirm.data;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isStatus(v: string): v is LabOrderStatus {
  return v === "pending_upload" || v === "under_review" || v === "completed";
}
