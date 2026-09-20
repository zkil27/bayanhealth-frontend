/**
 * Idempotency-key helpers for write operations.
 *
 * Every write (`POST`/`PUT`/`DELETE`) through `src/lib/api.ts` must carry an
 * `Idempotency-Key` header that is a syntactically valid UUID v4. A logical
 * request that is retried (e.g. after a transient failure) must reuse the
 * **same** key so the backend treats the retry as the same operation rather
 * than creating a duplicate (Requirements 8.1, 8.5, 12.1).
 *
 * This module is intentionally pure/side-effect-light so the behaviour can be
 * exercised directly by the Property 7 test.
 */

/**
 * Matches a canonical UUID v4: 8-4-4-4-12 hex with the version nibble fixed to
 * `4` and the variant nibble in `[89ab]`.
 */
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True iff `value` is a syntactically valid UUID v4 string. */
export function isUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

/** Generate a fresh UUID v4 to use as an `Idempotency-Key`. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Holds the idempotency key for a single logical write so retries reuse it.
 *
 * Usage: call {@link IdempotencyKeyManager.current} for every attempt of the
 * same logical request — the first call mints a key and every subsequent call
 * (i.e. each retry) returns that identical key. Call
 * {@link IdempotencyKeyManager.reset} once the request has fully completed
 * (success, or an abandoned attempt) so the next logical request mints a new key.
 */
export interface IdempotencyKeyManager {
  /** The key for the current logical request, created lazily and reused on retry. */
  current(): string;
  /** Discard the current key so the next logical request mints a fresh one. */
  reset(): void;
}

/** Create an {@link IdempotencyKeyManager}. */
export function createIdempotencyKeyManager(): IdempotencyKeyManager {
  let key: string | null = null;
  return {
    current() {
      if (key === null) {
        key = newIdempotencyKey();
      }
      return key;
    },
    reset() {
      key = null;
    },
  };
}
