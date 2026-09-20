import { api, ApiError } from "@/lib/api";

/**
 * Consultation chat data access (Slice 6, task 12.4, Requirements 11.3–11.6).
 *
 * Two transports back the same conversation, against the contract-frozen
 * backend (Requirement 15):
 *
 * 1. **Realtime WebSocket** (preferred). The WebSocket `$connect` route is
 *    authenticated with a short-lived, single-use opaque token obtained from
 *    `POST /v1/ws-token` (contracts/openapi.yaml#issueWsToken) using the
 *    caller's Cognito IdToken, then supplied on the socket URL as
 *    `?wsToken=<token>&bookingId=<bookingId>`. The backend was hardened to
 *    reject a full Cognito JWT in the query string (security M9), so the
 *    IdToken is exchanged for this query token rather than being placed on the
 *    URL directly.
 * 2. **HTTP fallback**. When the socket cannot be established within the connect
 *    window, the conversation is read and written over
 *    `GET/POST /v1/bookings/{bookingId}/messages`
 *    (contracts/openapi.yaml#listBookingMessages / #createBookingMessage),
 *    which carry the IdToken as a Bearer token like every other REST call
 *    (Requirement 11.6).
 *
 * None of these endpoints are modified here — the backend contract is frozen.
 */

/** Sender role of a chat message, as returned by the backend. */
export type ChatSenderRole = "patient" | "doctor";

/**
 * Public chat message shape shared by both transports
 * (contracts/openapi.yaml#BookingMessage). The realtime path delivers the same
 * object inside a `{ type: "message", data }` envelope.
 */
export interface ChatMessage {
  messageId: string;
  sessionId: string;
  consultationId: string;
  bookingId: string;
  senderId: string;
  senderRole: ChatSenderRole;
  messageType: "text";
  content: string;
  createdAt: string;
}

/** `data` shape of a `GET /v1/bookings/{bookingId}/messages` response. */
export interface BookingMessageList {
  bookingId: string;
  sessionId: string;
  messages: ChatMessage[];
}

/**
 * Exchange the caller's Cognito IdToken for a single-use, short-lived WebSocket
 * auth token via `POST /v1/ws-token` (Requirement 11.3).
 *
 * @param idToken        - The caller's Cognito IdToken (Bearer auth).
 * @param idempotencyKey - Optional UUID v4 reused across retries of one issue.
 * @returns The opaque `wsToken` to place on the WebSocket connect URL.
 * @throws {ApiError} on any non-2xx response.
 */
export async function issueWsToken(
  idToken: string,
  idempotencyKey?: string,
): Promise<string> {
  const res = await api.post<{ wsToken: string }>(
    "/v1/ws-token",
    idToken,
    {},
    idempotencyKey,
  );
  return res.data.wsToken;
}

/**
 * Read the current conversation state over the HTTP fallback
 * (`GET /v1/bookings/{bookingId}/messages`) so the UI can show messages even
 * when the realtime socket is unavailable (Requirement 11.6).
 *
 * @param bookingId - The in-progress consultation booking id.
 * @param idToken   - The caller's Cognito IdToken (Bearer auth).
 * @returns The booking's message list (chronological as returned by the API).
 * @throws {ApiError} on any non-2xx response.
 */
export async function listBookingMessages(
  bookingId: string,
  idToken: string,
): Promise<BookingMessageList> {
  const res = await api.get<BookingMessageList>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/messages`,
    idToken,
  );
  return res.data;
}

/**
 * Send a chat message over the HTTP fallback
 * (`POST /v1/bookings/{bookingId}/messages`). The backend persists the message
 * before any realtime fan-out (write-before-emit) and returns the created
 * message with its server-assigned id and timestamp (Requirement 11.6).
 *
 * A UUID v4 `Idempotency-Key` is supplied by the API client (auto-generated
 * when not provided) so a retried send is not duplicated.
 *
 * @param bookingId      - The in-progress consultation booking id.
 * @param idToken        - The caller's Cognito IdToken (Bearer auth).
 * @param content        - Pre-validated message text (1–4096 characters).
 * @param idempotencyKey - Optional UUID v4 reused across retries of one send.
 * @returns The created {@link ChatMessage}.
 * @throws {ApiError} on any non-2xx response.
 */
export async function sendBookingMessage(
  bookingId: string,
  idToken: string,
  content: string,
  idempotencyKey?: string,
): Promise<ChatMessage> {
  const res = await api.post<ChatMessage>(
    `/v1/bookings/${encodeURIComponent(bookingId)}/messages`,
    idToken,
    { content, messageType: "text" },
    idempotencyKey,
  );
  return res.data;
}

/** Re-export so callers can narrow transport errors without importing the client. */
export { ApiError };
