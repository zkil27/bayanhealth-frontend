/**
 * Real backend client for the PUBLIC waitlist signup endpoint.
 *
 * This endpoint is declared `security: []` in contracts/openapi.yaml (tag
 * Waitlist) — it is a marketing-site lead capture form with no signed-in
 * actor, so we deliberately call it WITHOUT an Authorization header. This
 * mirrors the public intake client in `src/features/booking/lib/api/intake.ts`
 * and the public prescription client in
 * `src/features/prescriptions/lib/api/verify.ts` (their `publicRequest`
 * helper, envelope parsing, and `ApiError` reuse from `@/lib/api`).
 *
 * Previously this form posted to a same-origin Next.js route
 * (`/api/waitlist`) that wrote straight to DynamoDB from the Next.js server
 * runtime, with no rate limiting. That route is retired; submissions now go
 * to the backend Lambda behind API Gateway (`POST /v1/waitlist`), which adds
 * a per-source-IP rate limit ahead of the same idempotent-by-email write.
 *
 * NOTE: There is no mock here. All requests hit the deployed backend at
 * `NEXT_PUBLIC_API_BASE_URL`.
 */

import { ApiError } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

/** contract: WaitlistRole */
export const WAITLIST_ROLES = ["PATIENT", "DOCTOR", "ORGANIZATION"] as const;

export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

/** contract: WaitlistSubmissionRequest */
export interface WaitlistSubmissionRequest {
  email: string;
  fullName: string;
  role: WaitlistRole;
  organizationName?: string;
}

/** contract: WaitlistSignupResult */
export interface WaitlistSignupResult {
  message: string;
}

/** Field-keyed messages the form can render inline, e.g. `{ email: [...] }`. */
export type WaitlistFieldErrors = Partial<
  Record<"email" | "fullName" | "role", string[]>
>;

/** Backend success envelope: { data, meta }. */
interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp?: string;
  };
}

/**
 * Unauthenticated fetch against the public waitlist endpoint.
 * Parses the `{ data, meta }` success envelope and throws an {@link ApiError}
 * mirroring the `{ error: { code, message, details? } }` failure envelope.
 */
async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body?.error?.code ?? "API_ERROR",
      body?.error?.message ?? `HTTP ${res.status}`,
      res.status,
      parseRetryAfterSeconds(res.headers.get("Retry-After")),
      body?.error?.details && typeof body.error.details === "object"
        ? (body.error.details as Record<string, unknown>)
        : undefined,
    );
  }

  return (body as ApiResponse<T>).data;
}

/**
 * Parse a `Retry-After` header value as whole seconds.
 * Mirrors `@/lib/api`'s own parser: only a non-negative integer string is
 * accepted, so a malformed value never becomes a fabricated retry interval.
 */
function parseRetryAfterSeconds(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  return Number.isInteger(seconds) && seconds >= 0 ? seconds : undefined;
}

/**
 * Extract `{ field: [messages] }` from a `400 INVALID_PAYLOAD` error's
 * `details.fields` array (`[{ field, reason }]`), for inline form display.
 */
export function waitlistFieldErrorsFrom(error: ApiError): WaitlistFieldErrors {
  const fields = error.details?.fields;
  if (!Array.isArray(fields)) return {};

  const result: WaitlistFieldErrors = {};
  for (const entry of fields) {
    if (
      entry &&
      typeof entry === "object" &&
      "field" in entry &&
      "reason" in entry &&
      typeof (entry as { field: unknown }).field === "string" &&
      typeof (entry as { reason: unknown }).reason === "string"
    ) {
      const field = (entry as { field: string }).field as keyof WaitlistFieldErrors;
      if (field === "email" || field === "fullName" || field === "role") {
        (result[field] ??= []).push((entry as { reason: string }).reason);
      }
    }
  }
  return result;
}

/** POST /v1/waitlist — join the early-access waitlist (public, idempotent on email). */
export function submitWaitlistSignup(
  submission: WaitlistSubmissionRequest,
): Promise<WaitlistSignupResult> {
  return publicRequest<WaitlistSignupResult>("/v1/waitlist", {
    method: "POST",
    body: JSON.stringify(submission),
  });
}
