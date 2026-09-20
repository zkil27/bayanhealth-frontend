import { api, ApiError, type ApiResponse } from "@/lib/api";
import type { components } from "@/types/openapi.generated";

/**
 * Conversation list data access (Task 9, backing `GET /v1/conversations`).
 *
 * Shared by both roles rather than living under `features/patient/` or
 * `features/doctor/`, the way `useConsultationChat`/`chatMessages.ts` already
 * do for the same reason: the backend resolves the caller's role from the
 * JWT and answers with the same `ConversationEntry` shape either way — a
 * patient caller's entries carry `doctor`, a doctor caller's carry
 * `patientName`, never both. There is no separate patient/doctor route to
 * split this module along.
 *
 * Replaces deriving a conversation list client-side from `GET /v1/bookings`
 * (`PatientChatList.tsx`'s pre-Task-9 approach): that path had no last-message
 * preview and resolved each row's doctor with its own extra request. This
 * endpoint returns both already resolved, so the caller does not re-derive or
 * re-fetch either.
 */

export type ConversationEntry = components["schemas"]["ConversationEntry"];

/** A single page of the caller's conversations plus its pagination envelope. */
export interface ConversationListPage {
  conversations: ConversationEntry[];
  meta: ApiResponse<ConversationEntry[]>["meta"];
}

/** Default page size requested from `GET /v1/conversations` (matches the backend's own default). */
export const CONVERSATION_LIST_PAGE_SIZE = 20;

/**
 * Fetch a single page of the authenticated caller's conversations.
 *
 * Passes the opaque pagination cursor as the `cursor` query parameter the
 * backend expects (contracts/openapi.yaml#ListBookingsCursor, reused here as
 * `listConversations` does not define its own). Throws an {@link ApiError}
 * when no auth token is available or the request fails.
 *
 * @param token  - Cognito IdToken used to authenticate the request.
 * @param cursor - Opaque cursor from a previous page's `meta.pagination.cursor`.
 * @returns The page's conversations together with the response `meta`.
 */
export async function fetchConversationPage(
  token: string,
  cursor?: string,
  limit: number = CONVERSATION_LIST_PAGE_SIZE,
): Promise<ConversationListPage> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view your conversations.",
      401,
    );
  }

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) {
    params.set("cursor", cursor);
  }

  const res = await api.get<ConversationEntry[]>(
    `/v1/conversations?${params.toString()}`,
    token,
  );

  return { conversations: res.data ?? [], meta: res.meta };
}
