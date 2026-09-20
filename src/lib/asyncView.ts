/**
 * AsyncView state machine — the pure core shared by every data-backed region.
 *
 * A data dependency moves through `loading → (data | empty | error)`:
 * - `loading` while the dependency is pending and the 10s timeout has not elapsed;
 * - `data`    when it resolves with one or more records;
 * - `empty`   when it resolves with zero records;
 * - `error`   when it errors, or when the 10s timeout elapses before it resolves.
 *
 * The {@link reduceAsyncState} function is intentionally pure and exported so it
 * can be exercised directly by tests (see the Property 6 test for this module).
 */

/** The four defined states a data-backed region can be in (Requirement 7.3–7.5). */
export type AsyncState<T> =
  | { status: "loading" }
  | { status: "data"; value: T }
  | { status: "empty" }
  | { status: "error"; code?: string; message: string };

/**
 * The outcome of the underlying data dependency at the moment the reducer runs.
 * `pending` means the request has not settled yet; the reducer combines it with
 * the elapsed time to decide between `loading` and a timeout `error`.
 */
export type AsyncOutcome<T> =
  | { kind: "pending" }
  | { kind: "resolved"; value: T }
  | { kind: "error"; code?: string; message: string };

/** Default timeout: a dependency that has not resolved within 10s becomes an error. */
export const ASYNC_TIMEOUT_MS = 10_000;

/** Error code used when the timeout elapses before the dependency resolves. */
export const ASYNC_TIMEOUT_CODE = "TIMEOUT";

/** Human-readable message surfaced in the error state when the timeout elapses. */
export const ASYNC_TIMEOUT_MESSAGE = "This took too long to load. Please try again.";

/** Fallback message surfaced when an error outcome carries no message of its own. */
export const ASYNC_ERROR_MESSAGE = "Something went wrong while loading this content.";

export interface ReduceAsyncOptions<T> {
  /** Timeout in milliseconds; defaults to {@link ASYNC_TIMEOUT_MS}. */
  timeoutMs?: number;
  /**
   * Predicate that decides whether a resolved value counts as "zero records".
   * Defaults to {@link isEmptyValue}: empty for `null`/`undefined`, empty arrays,
   * and empty `Map`/`Set`; non-empty otherwise.
   */
  isEmpty?: (value: T) => boolean;
}

/**
 * Default emptiness check for a resolved value.
 *
 * Treats `null`/`undefined`, arrays of length 0, and empty `Map`/`Set`
 * collections as empty. Any other value (including non-empty collections,
 * objects, numbers, and non-empty strings) is considered non-empty.
 */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Map || value instanceof Set) return value.size === 0;
  return false;
}

/**
 * Map a data-dependency outcome plus elapsed time to exactly one {@link AsyncState}.
 *
 * This is the single source of truth for the async-view contract and is pure:
 * the same inputs always yield the same state, with no side effects.
 *
 * Resolution order:
 * 1. An `error` outcome always yields `error` (an explicit failure wins).
 * 2. A `pending` outcome yields `error` once `elapsedMs >= timeoutMs`, else `loading`.
 * 3. A `resolved` outcome yields `empty` when the value has zero records, else `data`.
 *
 * @param outcome   - The current outcome of the data dependency.
 * @param elapsedMs - Milliseconds elapsed since the request started.
 * @param options   - Optional timeout override and emptiness predicate.
 */
export function reduceAsyncState<T>(
  outcome: AsyncOutcome<T>,
  elapsedMs: number,
  options: ReduceAsyncOptions<T> = {},
): AsyncState<T> {
  const timeoutMs = options.timeoutMs ?? ASYNC_TIMEOUT_MS;
  const isEmpty = options.isEmpty ?? (isEmptyValue as (value: T) => boolean);

  // 1. An explicit error outcome always resolves to the error state.
  if (outcome.kind === "error") {
    return {
      status: "error",
      code: outcome.code,
      message: outcome.message || ASYNC_ERROR_MESSAGE,
    };
  }

  // 2. A still-pending dependency: timeout → error, otherwise keep loading.
  if (outcome.kind === "pending") {
    if (elapsedMs >= timeoutMs) {
      return {
        status: "error",
        code: ASYNC_TIMEOUT_CODE,
        message: ASYNC_TIMEOUT_MESSAGE,
      };
    }
    return { status: "loading" };
  }

  // 3. A resolved dependency: zero records → empty, otherwise data.
  return isEmpty(outcome.value)
    ? { status: "empty" }
    : { status: "data", value: outcome.value };
}
