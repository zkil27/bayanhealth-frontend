/**
 * Exchange the HttpOnly refresh cookie for fresh short-lived tokens.
 *
 * Called once on app start. This is what makes a reload keep the user signed in:
 * the id and access tokens still live only in memory and still die with the page,
 * but the credential that can re-mint them survives in a cookie the browser will
 * not hand to JavaScript.
 *
 * The response body carries the new id/access tokens because the client store
 * needs them, and there is no way around that — they are what every API call
 * sends. They are short-lived by design, which is the whole reason it is safe to
 * return them and not the refresh token.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { isLandingOnlyBuild } from "@/lib/route-guard";
import { REFRESH_COOKIE, clearRefreshCookie, refreshCookieOptions } from "../cookie";

const REGION = process.env.NEXT_PUBLIC_AWS_REGION ?? "ap-southeast-1";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";

interface CognitoAuthResult {
  AuthenticationResult?: {
    IdToken?: string;
    AccessToken?: string;
    ExpiresIn?: number;
    RefreshToken?: string;
  };
  __type?: string;
  message?: string;
}

/** Claims this route reads back out of the fresh id token. */
interface IdTokenClaims {
  email?: string;
}

function parseJwtPayload(token: string): IdTokenClaims {
  try {
    const payload = token.split(".")[1] ?? "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as IdTokenClaims;
  } catch {
    return {};
  }
}

/**
 * A failed refresh clears the cookie.
 *
 * A refresh token that Cognito rejects is dead — revoked, expired, or issued by a
 * different pool. Keeping it would make every subsequent page load retry a call
 * that cannot succeed, and `SessionGuard` would bounce the user to sign-in each
 * time with no explanation. `401` tells the client to treat this as "no session"
 * rather than as an outage.
 */
function noSession(request: Request, code: string, message: string): NextResponse {
  const response = NextResponse.json({ error: { code, message } }, { status: 401 });
  clearRefreshCookie(response, request);
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  // The middleware matcher excludes `/api/**`, so the landing-only redirect in
  // `proxy.ts` never sees this route — it must gate itself. Checked first and
  // unconditionally: a restricted build has no Cognito applied at all, so this
  // must not depend on (and must come before) the CLIENT_ID check below, which
  // exists for a different case (a misconfigured but otherwise-full build).
  if (isLandingOnlyBuild()) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Route not found" } },
      { status: 404 },
    );
  }

  if (!CLIENT_ID) {
    // A build without the Cognito client id cannot refresh anything. Reported as
    // itself rather than as an expired session, so the cause is not misread.
    return NextResponse.json(
      {
        error: {
          code: "AUTH_NOT_CONFIGURED",
          message: "NEXT_PUBLIC_COGNITO_CLIENT_ID is not set in this build",
        },
      },
      { status: 500 },
    );
  }

  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    // No cookie is the ordinary "never signed in" case, not an error worth
    // clearing anything for.
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "No session" } },
      { status: 401 },
    );
  }

  let data: CognitoAuthResult;
  try {
    const cognito = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      },
      body: JSON.stringify({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      }),
    });
    data = (await cognito.json()) as CognitoAuthResult;
    if (!cognito.ok) {
      return noSession(
        request,
        data.__type ?? "AUTH_REQUIRED",
        "Session could not be restored",
      );
    }
  } catch {
    // A network failure reaching Cognito is not a dead token, so the cookie is
    // kept and the client can retry on the next load.
    return NextResponse.json(
      {
        error: {
          code: "AUTH_REFRESH_UNAVAILABLE",
          message: "Could not reach the identity provider",
        },
      },
      { status: 503 },
    );
  }

  const result = data.AuthenticationResult;
  if (!result?.IdToken || !result.AccessToken) {
    return noSession(request, "AUTH_REQUIRED", "Session could not be restored");
  }

  const response = NextResponse.json({
    data: {
      idToken: result.IdToken,
      accessToken: result.AccessToken,
      expiresIn: result.ExpiresIn ?? 3600,
      email: parseJwtPayload(result.IdToken).email ?? "",
    },
  });
  // Refresh-token rotation, when the pool has it enabled. Cognito omits
  // `RefreshToken` when rotation is off, in which case the existing cookie stays
  // valid and is left alone.
  if (result.RefreshToken) {
    response.cookies.set(
      REFRESH_COOKIE,
      result.RefreshToken,
      refreshCookieOptions(request),
    );
  }
  // Never cached: the body contains bearer tokens.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
