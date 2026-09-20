/**
 * Lightweight authenticated API client for the Bayan Health backend.
 * All requests attach the Cognito IdToken as a Bearer token.
 */

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    /**
     * Whole seconds from a `Retry-After` response header, when the backend sent
     * one (e.g. `429 VIDEO_CREDENTIAL_MINT_LIMIT`). `undefined` when the header
     * was absent or not a valid non-negative integer — callers must not invent a
     * retry interval where the server named none.
     */
    public readonly retryAfterSeconds?: number,
    /**
     * The backend's `error.details` object, verbatim, when it sent one.
     *
     * Some refusals are structured rather than a single sentence — a shift
     * delete that removed nothing lists the booked slots that blocked it, one
     * reason each. Dropping that on the floor and showing only `message` would
     * leave the user unable to act, so the payload is carried here for callers
     * that know its shape. Always treat it as untrusted and narrow it before
     * use: it is whatever the server sent.
     */
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Matches the backend success envelope: { data, meta: { requestId, timestamp, pagination? } } */
export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp?: string;
    pagination?: { cursor?: string };
  };
}

/** Generate a UUID v4 for the Idempotency-Key header required on all write operations. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/** Generate a PHI-free correlation identifier for assessment-first CDS calls. */
export function newCorrelationId(): string {
  return `cds-${crypto.randomUUID()}`;
}

/**
 * Listeners notified when the backend rejects a request with `401`.
 *
 * Auth state is held in memory only (ADR-20260726-01), so there is no token
 * refresh to fall back on: a 401 means the session is gone and the only correct
 * outcome is to return the user to sign-in. Notifying through a registry keeps
 * `api.ts` free of any store or router import, so it stays usable from tests and
 * from non-React callers.
 */
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Register a 401 listener. Returns an unsubscribe function. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized(): void {
  for (const listener of unauthorizedListeners) {
    try {
      listener();
    } catch {
      // A misbehaving listener must not mask the ApiError being thrown.
    }
  }
}

/**
 * The page origin, or `null` when running outside a browser (SSR, tests).
 *
 * Read defensively rather than assumed: this module is imported by server
 * components and by unit tests, where `location` does not exist.
 */
function pageOrigin(): string | null {
  return typeof location === "undefined" ? null : location.origin;
}

/**
 * Turn an opaque `fetch` rejection into an error that names the likely cause.
 *
 * The browser does not tell JavaScript why a cross-origin request failed — that
 * is the point of the same-origin policy — so a CORS denial, a DNS failure, and
 * an offline device all arrive as the same `TypeError`. Guessing between them is
 * not possible, but naming the two origins involved is, and that is what makes
 * the difference between a five-minute fix and an afternoon of bisecting.
 *
 * The API allows an explicit list of origins with no wildcard — see
 * `frontend_allowed_origins` in each environment's Terraform variables, per
 * ADR-20260726-01 — so serving the app from an origin outside that list fails
 * every request while sign-in keeps working, because Cognito is a different
 * service with its own CORS policy. That asymmetry is what makes it look like a
 * data problem rather than a configuration one.
 *
 * No token, header, or response content is included; there is no response to
 * include, and the message is rendered in the UI.
 */
function networkUnreachableError(cause: unknown): ApiError {
  const from = pageOrigin();
  const to = API_BASE || "(NEXT_PUBLIC_API_BASE_URL is not set)";
  const detail =
    from && API_BASE
      ? `Could not reach the API at ${to} from ${from}. ` +
        "The request never completed, so the browser withheld the reason. The " +
        "usual cause is that this origin is not in the API's allowed-origins " +
        "list; a dropped connection looks identical."
      : !API_BASE
        ? "The app was built without NEXT_PUBLIC_API_BASE_URL, so API requests " +
          "have no destination."
        : `Could not reach the API at ${to}.`;

  const error = new ApiError("NETWORK_UNREACHABLE", detail, 0);
  // Preserve the original for the console without putting it in the message.
  (error as { cause?: unknown }).cause = cause;
  return error;
}

/**
 * Parse a `Retry-After` header value as whole seconds.
 *
 * The contract documents this header as whole seconds (not an HTTP date), so
 * only a non-negative integer string is accepted. Returns `undefined` for a
 * missing header or anything else, so a malformed value never becomes a
 * fabricated retry interval.
 */
function parseRetryAfterSeconds(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue);
  return Number.isInteger(seconds) && seconds >= 0 ? seconds : undefined;
}

export interface ApiRequestOptions extends RequestInit {
  idempotencyKey?: string;
  correlationId?: string;
}

export interface ApiDetailedResponse<T> extends ApiResponse<T> {
  httpStatus: number;
  cacheControl: string | null;
}

async function request<T>(
  path: string,
  token: string,
  options: ApiRequestOptions = {},
  idempotencyKey?: string,
): Promise<ApiDetailedResponse<T>> {
  const { correlationId, ...fetchOptions } = options;
  delete fetchOptions.idempotencyKey;
  const extraHeaders: Record<string, string> = {};
  if (idempotencyKey) {
    extraHeaders["Idempotency-Key"] = idempotencyKey;
  }
  if (correlationId) {
    extraHeaders["X-Correlation-ID"] = correlationId;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...extraHeaders,
        ...(fetchOptions.headers ?? {}),
      },
    });
  } catch (cause) {
    // `fetch` rejects — rather than resolving with a status — when the request
    // never completed at the HTTP level. A CORS denial is indistinguishable from
    // a dropped connection here by design: the browser deliberately withholds
    // the response, so all that reaches JavaScript is `TypeError: Failed to
    // fetch`.
    //
    // That bare message used to propagate straight into the UI's error slot,
    // which is why a misconfigured origin presented as "no doctors" and "no
    // available slots" with nothing anywhere naming a cause. The diagnosis is
    // attached here instead, because this is the only place that knows both
    // origins involved.
    throw networkUnreachableError(cause);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) notifyUnauthorized();
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

  return {
    ...(body as ApiResponse<T>),
    httpStatus: res.status,
    cacheControl: res.headers.get("Cache-Control"),
  };
}

export const api = {
  get: <T>(path: string, token: string, correlationId?: string) =>
    request<T>(path, token, { method: "GET", correlationId }),

  /** Callers may pass an explicit idempotency key; one is auto-generated otherwise. */
  post: <T>(path: string, token: string, body: unknown, idempotencyKey?: string) =>
    request<T>(
      path,
      token,
      { method: "POST", body: JSON.stringify(body) },
      idempotencyKey ?? newIdempotencyKey(),
    ),

  put: <T>(path: string, token: string, body: unknown, idempotencyKey?: string) =>
    request<T>(
      path,
      token,
      { method: "PUT", body: JSON.stringify(body) },
      idempotencyKey ?? newIdempotencyKey(),
    ),

  delete: <T>(path: string, token: string, idempotencyKey?: string) =>
    request<T>(
      path,
      token,
      { method: "DELETE" },
      idempotencyKey ?? newIdempotencyKey(),
    ),

  /** Contract-oriented request used where status, DELETE bodies, and correlation are significant. */
  request: <T>(path: string, token: string, options: ApiRequestOptions) => {
    const method = (options.method ?? "GET").toUpperCase();
    const key = method === "GET" ? undefined : (options.idempotencyKey ?? newIdempotencyKey());
    return request<T>(path, token, options, key);
  },
};
