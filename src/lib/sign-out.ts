import type { AppRole } from "@/stores/useAuthStore";

/**
 * Destination the user is routed to once sign-out completes (Requirement 6.5).
 */
export const SIGN_OUT_DESTINATION = "/signIn";

/**
 * User-facing message surfaced when the sign-out action fails (Requirement 6.6).
 */
export const SIGN_OUT_ERROR_MESSAGE = "Sign-out failed. Please try again.";

/**
 * Areas (route prefixes) from which a sign-out control is meaningful.
 * Used by the {@link SignOutButton} only as a presentational hint; the action
 * itself is role-agnostic.
 */
export type SignOutRole = AppRole;

/**
 * Side-effecting dependencies the sign-out action needs, injected so the core
 * logic is pure and unit-testable without React or a router.
 *
 * - `clearSession` clears the persisted auth store **and** deletes the
 *   `bayan-auth` cookie (see `useAuthStore.clearSession`) — Requirement 6.4.
 * - `navigate` performs the client-side route change — Requirement 6.5.
 */
export interface SignOutDeps {
  clearSession: () => void | Promise<void>;
  navigate: (path: string) => void | Promise<void>;
}

/**
 * Outcome of a sign-out attempt.
 *
 * - `{ ok: true }` — the session was cleared and navigation to
 *   {@link SIGN_OUT_DESTINATION} was issued.
 * - `{ ok: false, error }` — the action failed; the caller should surface
 *   `error` and the authenticated session is retained (Requirement 6.6).
 */
export type SignOutResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Pure sign-out action.
 *
 * Behaviour (Requirements 6.4–6.6):
 * 1. Clears the stored session and deletes the `bayan-auth` cookie via
 *    `clearSession`.
 * 2. On success, routes to {@link SIGN_OUT_DESTINATION}.
 * 3. If clearing the session fails, the session is left intact — navigation is
 *    **not** issued — and a failure result is returned so the caller can show
 *    an error while keeping the user signed in.
 * 4. If navigation fails after a successful clear, a failure result is returned
 *    so the caller can surface an error.
 */
export async function performSignOut(deps: SignOutDeps): Promise<SignOutResult> {
  try {
    await deps.clearSession();
  } catch {
    // The session was not cleared: retain it and skip navigation (Req 6.6).
    return { ok: false, error: SIGN_OUT_ERROR_MESSAGE };
  }

  try {
    await deps.navigate(SIGN_OUT_DESTINATION);
  } catch {
    return { ok: false, error: SIGN_OUT_ERROR_MESSAGE };
  }

  return { ok: true };
}
