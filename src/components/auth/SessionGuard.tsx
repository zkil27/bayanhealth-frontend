"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { onUnauthorized } from "@/lib/api";
import { isPublicPath, SIGN_IN_PATH } from "@/lib/route-guard";
import { restoreSessionFromCookie } from "@/lib/session-restore";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Restores the session on load, then guards routes.
 *
 * Auth tokens are still held in memory only, and the `bayan-auth` cookie still
 * carries just `{ roles, expiresAt }` for the route guard. What changed is that a
 * page load no longer *ends* the session: the Cognito refresh token lives in an
 * `HttpOnly` cookie the browser will not give to JavaScript, and
 * `POST /api/auth/refresh` exchanges it server-side for fresh short-lived tokens
 * that go back into the memory store.
 *
 * The ordering is the fix, and it is easy to get wrong. On a fresh load the store
 * is empty, so "not authenticated" is not yet a fact — it is an unfinished
 * question. This component therefore:
 *
 *   1. marks the session `restoring` and attempts the exchange;
 *   2. only once the outcome is known decides whether to redirect.
 *
 * Redirecting during step 1 is precisely the behaviour that made a reload look
 * like a sign-out, and it would still do so with restoration in place.
 *
 * A failed exchange is distinguished from a dead one. `401` means there is no
 * session and the guard redirects. A network failure or a 503 means the answer is
 * unknown; the guard leaves the user where they are rather than throwing away a
 * session that may still be valid, and the API's own `401` handling remains the
 * backstop.
 *
 * Public paths are skipped for the redirect, but restoration still runs on them so
 * a signed-in patient landing on the home page is recognised.
 */
export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  // Restore once per page load, before any redirect decision. Deliberately has no
  // `pathname` dependency: a client-side navigation must not re-run the exchange.
  useEffect(() => {
    let cancelled = false;

    const store = useAuthStore.getState();
    // Already authenticated in this page's lifetime (a fresh sign-in, or a second
    // mount): nothing to restore.
    if (store.origin !== "unknown") return;

    store.markRestoring();
    void restoreSessionFromCookie().then((outcome) => {
      if (cancelled) return;
      const current = useAuthStore.getState();
      // A sign-in that completed while the exchange was in flight wins: it has the
      // newer tokens and a refresh token this path cannot produce.
      if (current.origin === "signed-in") return;

      if (outcome.kind === "restored") {
        current.restoreSession(
          {
            idToken: outcome.session.idToken,
            accessToken: outcome.session.accessToken,
            expiresIn: outcome.session.expiresIn,
          },
          outcome.session.email,
        );
        return;
      }
      // `unavailable` is also recorded as resolved so the guard stops waiting, but
      // it must not clear a session: the outcome is unknown, not negative.
      current.markNoSession();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const redirectToSignIn = () => {
      const target =
        pathname && !isPublicPath(pathname)
          ? `${SIGN_IN_PATH}?next=${encodeURIComponent(pathname)}`
          : SIGN_IN_PATH;
      router.replace(target);
    };

    // A 401 from the API invalidates the session regardless of path. This stays
    // outside the resolution gate: it is a server verdict, not a guess.
    const unsubscribe = onUnauthorized(() => {
      useAuthStore.getState().clearSession();
      redirectToSignIn();
    });

    if (!pathname || isPublicPath(pathname)) return unsubscribe;

    // Subscribe rather than read once: on a reload the answer arrives after this
    // effect runs, and the redirect must wait for it.
    //
    // This is re-entrant by construction — it is a store subscriber that calls a
    // store setter — and it relies on `clearSession` being idempotent to stop.
    // When it was not, clearing notified this subscriber, which cleared again,
    // until the stack overflowed. Keep `clearSession`'s "already cleared" bail-out
    // if you touch it, or guard the call here instead.
    const evaluate = () => {
      const state = useAuthStore.getState();
      if (state.origin === "unknown" || state.origin === "restoring") return;
      if (!state.isAuthenticated()) {
        state.clearSession();
        redirectToSignIn();
      }
    };

    evaluate();
    const unsubscribeStore = useAuthStore.subscribe(evaluate);

    return () => {
      unsubscribe();
      unsubscribeStore();
    };
  }, [pathname, router]);

  return null;
}
