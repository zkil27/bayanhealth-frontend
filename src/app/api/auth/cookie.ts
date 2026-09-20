/**
 * Cookie shared by the two auth route handlers.
 *
 * Kept separate from both so the flags are defined once. A refresh token behind a
 * cookie that is missing `HttpOnly` would be no better than `localStorage`, so
 * the attributes are the security property here, not an implementation detail.
 */
import type { NextResponse } from "next/server";

/** Name of the HttpOnly cookie holding the Cognito refresh token. */
export const REFRESH_COOKIE = "bayan-refresh";

/**
 * Cognito refresh tokens are valid for 30 days by default; the cookie is capped
 * well below that so an abandoned browser stops being able to resume a clinical
 * session for a month. Re-issued on every successful sign-in.
 */
const MAX_AGE_SECONDS = 12 * 60 * 60;

/**
 * `Secure` is set on HTTPS only, so local development over `http://localhost`
 * still works. Read from the request rather than `NODE_ENV`: the deployed app is
 * the only place this matters, and it is always HTTPS there.
 */
function isSecureRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (url.protocol === "https:") return true;
  // Amplify terminates TLS upstream, so the origin request can arrive as http.
  return request.headers.get("x-forwarded-proto") === "https";
}

export function refreshCookieOptions(request: Request) {
  return {
    httpOnly: true,
    secure: isSecureRequest(request),
    // `Lax` rather than `Strict`: the cookie must survive a top-level navigation
    // back into the app (an emailed consultation link, for instance). It is never
    // read on a cross-site subrequest, and the route is POST-only, so `Lax` does
    // not expose it to CSRF-style reads.
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

/** Expire the cookie. Must mirror the set attributes or browsers keep the old one. */
export function clearRefreshCookie(response: NextResponse, request: Request): void {
  response.cookies.set(REFRESH_COOKIE, "", {
    ...refreshCookieOptions(request),
    maxAge: 0,
  });
}
