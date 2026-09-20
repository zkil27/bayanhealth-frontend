/**
 * Refresh-token custody, server side.
 *
 * Reloading the page used to sign the user out. Auth tokens lived only in the
 * Zustand store (ADR-20260726-01), the `bayan-auth` cookie carried just
 * `{ roles, expiresAt }` for the route guard, and `SessionGuard` deliberately
 * redirected to sign-in when it noticed the cookie had outlived the tokens.
 *
 * This restores the session across reloads **without** putting a long-lived
 * credential anywhere JavaScript can read it, which is what the memory-only
 * decision was protecting against. The refresh token is handed to this route once
 * and stored in an `HttpOnly` cookie; from then on only the server can read it,
 * and `/api/auth/refresh` exchanges it for short-lived id/access tokens that stay
 * in memory exactly as before. An XSS can still call the refresh endpoint from the
 * victim's browser, but it cannot exfiltrate the refresh token itself — so the
 * attacker's access ends with the session rather than continuing for the refresh
 * token's whole lifetime. That is a materially smaller blast radius than
 * `localStorage`, and the reason this shape was chosen over simply persisting the
 * store.
 *
 * Residual exposure, stated plainly: the token crosses the wire once, in the body
 * of this request, because Cognito authentication happens in the browser
 * (`lib/cognito.ts` talks to `cognito-idp` directly). Removing that last hop means
 * moving sign-in itself server-side, which is a larger change and is recorded as
 * follow-up rather than done quietly here.
 */
import { NextResponse } from "next/server";

import { isLandingOnlyBuild } from "@/lib/route-guard";
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  refreshCookieOptions,
} from "../cookie";

/** Cognito refresh tokens are long opaque strings; bound the accepted shape. */
const REFRESH_TOKEN_RE = /^[A-Za-z0-9._-]{20,4096}$/;

/**
 * Fixed response for both handlers under a landing-only build. Checked first
 * and unconditionally in each — the middleware matcher excludes `/api/**`, so
 * `proxy.ts`'s landing-only redirect never reaches this route; it must gate
 * itself. A restricted build has no refresh-cookie custody to perform at all.
 */
function landingOnlyDisabled(): NextResponse {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "Route not found" } },
    { status: 404 },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  if (isLandingOnlyBuild()) return landingOnlyDisabled();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_PAYLOAD", message: "Body must be valid JSON" } },
      { status: 400 },
    );
  }

  const refreshToken = (body as { refreshToken?: unknown } | null)?.refreshToken;
  if (typeof refreshToken !== "string" || !REFRESH_TOKEN_RE.test(refreshToken)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PAYLOAD",
          message: "refreshToken is required",
        },
      },
      { status: 400 },
    );
  }

  // 204: there is nothing to return, and returning the token back would defeat
  // the point of taking custody of it.
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(REFRESH_COOKIE, refreshToken, refreshCookieOptions(request));
  return response;
}

/**
 * Sign-out. Clearing the cookie is the authoritative end of the session as far as
 * this app is concerned; the in-memory tokens are dropped by the caller.
 *
 * Deliberately does not call Cognito's `GlobalSignOut`: that would revoke the
 * user's other sessions too, which is not what a sign-out button on one device
 * should mean. Revoking this refresh token specifically is a follow-up.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  if (isLandingOnlyBuild()) return landingOnlyDisabled();

  const response = new NextResponse(null, { status: 204 });
  clearRefreshCookie(response, request);
  return response;
}
