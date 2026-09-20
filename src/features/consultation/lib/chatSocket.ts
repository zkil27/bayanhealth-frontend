/**
 * Realtime chat transport helpers (Slice 6, task 12.4, Requirements 11.3–11.6).
 *
 * Keeps the WebSocket wiring (URL construction, the minimal socket surface the
 * chat hook depends on, and inbound-frame parsing) separate from the React hook
 * and from the HTTP fallback, so the transport-fallback decision stays cleanly
 * testable.
 */

/**
 * Minimal subset of the browser `WebSocket` the chat hook depends on. Declaring
 * it explicitly lets the hook accept a fake socket in tests without pulling in
 * the full DOM `WebSocket` type surface.
 */
export interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((this: unknown, ev: unknown) => unknown) | null;
  onmessage: ((this: unknown, ev: { data: unknown }) => unknown) | null;
  onerror: ((this: unknown, ev: unknown) => unknown) | null;
  onclose: ((this: unknown, ev: unknown) => unknown) | null;
}

/** Factory that opens a socket for a fully-formed URL. */
export type ChatSocketFactory = (url: string) => WebSocketLike;

/**
 * Default socket factory backed by the global `WebSocket`. Throws if the
 * runtime has no `WebSocket` (e.g. SSR), which the hook treats as a connect
 * failure and falls back to HTTP (Requirement 11.6).
 */
export const defaultChatSocketFactory: ChatSocketFactory = (url) => {
  const Ctor = (globalThis as { WebSocket?: new (url: string) => WebSocketLike })
    .WebSocket;
  if (!Ctor) {
    throw new Error("WebSocket is not available in this environment");
  }
  return new Ctor(url);
};

/**
 * Resolve the configured WebSocket base URL (e.g.
 * `wss://<api-id>.execute-api.ap-southeast-1.amazonaws.com/<stage>`).
 *
 * Returns `null` when unset so the hook can skip the realtime attempt and go
 * straight to the HTTP fallback rather than constructing an invalid socket
 * (Requirement 11.6).
 */
export function getWebSocketBaseUrl(): string | null {
  const raw = (process.env.NEXT_PUBLIC_WS_URL ?? "").trim();
  return raw.length > 0 ? raw.replace(/\/$/, "") : null;
}

/**
 * Build the authenticated chat WebSocket URL.
 *
 * The short-lived opaque `wsToken` (obtained from `POST /v1/ws-token`) and the
 * `bookingId` are supplied as query parameters, matching the contract-frozen
 * `$connect` route (`?wsToken=<token>&bookingId=<bookingId>`). A full Cognito
 * JWT is intentionally never placed on the URL (security M9).
 */
export function buildChatSocketUrl(
  baseUrl: string,
  params: { wsToken: string; bookingId: string },
): string {
  const base = baseUrl.replace(/\/$/, "");
  const query = new URLSearchParams({
    wsToken: params.wsToken,
    bookingId: params.bookingId,
  });
  return `${base}?${query.toString()}`;
}

/** Inbound realtime frame envelope (`{ type, data }`) broadcast by the backend. */
export interface InboundChatEvent {
  type: string;
  data: unknown;
}

/**
 * Parse a raw inbound socket frame into a typed `{ type, data }` envelope.
 *
 * Returns `null` for any non-string, non-JSON, or structurally invalid frame so
 * the hook can ignore noise without throwing.
 */
export function parseInboundEvent(raw: unknown): InboundChatEvent | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as { type?: unknown }).type === "string"
  ) {
    return {
      type: (parsed as { type: string }).type,
      data: (parsed as { data?: unknown }).data,
    };
  }
  return null;
}

/**
 * Serialize the outbound "send a chat message" frame for the `sendMessage`
 * WebSocket route. The route selection key is `action`; the backend reads
 * `content` and `messageType` from the body.
 */
export function buildSendMessageFrame(content: string): string {
  return JSON.stringify({ action: "sendMessage", content, messageType: "text" });
}
