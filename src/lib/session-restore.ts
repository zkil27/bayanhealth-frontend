/**
 * Client half of session restoration.
 *
 * Kept out of the React component so the sequencing is testable without a DOM:
 * the ordering here is the whole fix. A reload must not be treated as "signed out"
 * until the refresh exchange has been attempted and has failed.
 */

/** Short-lived tokens as returned by `POST /api/auth/refresh`. */
export interface RestoredSession {
  idToken: string;
  accessToken: string;
  expiresIn: number;
  email: string;
}

export type RestoreOutcome =
  | { kind: "restored"; session: RestoredSession }
  /** No session to restore — no cookie, or the refresh token is dead. */
  | { kind: "none" }
  /**
   * The exchange could not be completed. Distinct from `none`: the user may still
   * have a valid session, so the caller must not clear anything on this.
   */
  | { kind: "unavailable" };

/** Hand the refresh token to the server so it can be stored `HttpOnly`. */
export async function storeRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Drop the server-side refresh cookie. Part of sign-out.
 *
 * Failure is propagated so the caller retains the in-memory identity. Reporting
 * success while a renewable credential remains would restore that account on
 * the next load and make an account switch appear to use the wrong user.
 */
export async function discardRefreshToken(): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/auth/session", { method: "DELETE" });
  } catch (cause) {
    throw new Error("Could not clear the refresh session", { cause });
  }
  if (!res.ok) {
    throw new Error(`Could not clear the refresh session (HTTP ${res.status})`);
  }
}

/**
 * Attempt to restore a session from the `HttpOnly` refresh cookie.
 *
 * `401` is a definitive "no session" — the route clears the dead cookie itself.
 * Anything else (503, a network failure, a malformed body) is `unavailable`, which
 * the caller must treat as unknown rather than as signed out.
 */
export async function restoreSessionFromCookie(): Promise<RestoreOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/auth/refresh", { method: "POST" });
  } catch {
    return { kind: "unavailable" };
  }

  if (res.status === 401) return { kind: "none" };
  if (!res.ok) return { kind: "unavailable" };

  try {
    const body = (await res.json()) as { data?: Partial<RestoredSession> };
    const data = body.data;
    if (
      !data ||
      typeof data.idToken !== "string" ||
      typeof data.accessToken !== "string" ||
      typeof data.expiresIn !== "number"
    ) {
      return { kind: "unavailable" };
    }
    return {
      kind: "restored",
      session: {
        idToken: data.idToken,
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
        email: typeof data.email === "string" ? data.email : "",
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}
