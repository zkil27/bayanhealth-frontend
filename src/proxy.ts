import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AppRole } from "@/stores/useAuthStore";
import { type GuardSession, decideRoute, isLandingOnlyBuild } from "@/lib/route-guard";

const KNOWN_ROLES: readonly string[] = ["patient", "doctor", "admin"];

function configuredOrigin(value: string | undefined, protocols: readonly string[]): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(nonce: string): string {
  const region = (process.env.NEXT_PUBLIC_AWS_REGION ?? "ap-southeast-1").trim();
  const apiOrigin = configuredOrigin(process.env.NEXT_PUBLIC_API_BASE_URL, ["https:"]);
  const wsOrigin = configuredOrigin(process.env.NEXT_PUBLIC_WS_URL, ["wss:"]);
  // The consultation-media-layer's <ConsultationVideo /> runs Daily's Call
  // Object mode (Daily.createCallObject) rather than the hosted Prebuilt
  // iframe — a deliberate change after four consecutive bugs traced to
  // fighting Prebuilt's own UI defaults inside an iframe this app also
  // layered custom controls on top of. Call Object mode opens its WebRTC
  // signalling and REST connections directly from this document rather than
  // from inside a vendor iframe, so those origins belong in connect-src
  // rather than frame-src. Each Daily account gets its own `*.daily.co`
  // subdomain, and Daily's media/signalling edge additionally uses
  // `*.dailywebrtc.com` and `*.dailywebrtc.net` (confirmed by inspecting the
  // installed @daily-co/daily-js bundle) — both https and wss forms, since
  // the SDK issues plain REST calls as well as WebSocket signalling.
  const dailyConnectSources = [
    "https://*.daily.co",
    "wss://*.daily.co",
    "https://*.dailywebrtc.com",
    "wss://*.dailywebrtc.com",
    "https://*.dailywebrtc.net",
    "wss://*.dailywebrtc.net",
  ];
  const connectSources = [
    "'self'",
    apiOrigin,
    wsOrigin,
    `https://cognito-idp.${region}.amazonaws.com`,
    `https://s3.${region}.amazonaws.com`,
    `https://*.s3.${region}.amazonaws.com`,
    ...dailyConnectSources,
  ].filter((source): source is string => source !== null);
  const mediaSources = [
    "'self'",
    "blob:",
    `https://s3.${region}.amazonaws.com`,
    `https://*.s3.${region}.amazonaws.com`,
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${mediaSources.join(" ")} data:`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    `media-src ${mediaSources.join(" ")}`,
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}
function applySecurityHeaders(response: NextResponse, policy: string): NextResponse {
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  // `(self)` is sufficient again now that <ConsultationVideo /> runs Daily's
  // Call Object mode: getUserMedia is called from this same-origin document
  // directly, not from inside a cross-origin Daily iframe. An earlier attempt
  // using Daily's hosted Prebuilt iframe needed a wider grant here — see the
  // git history on this line — but that approach was replaced (see the
  // connect-src comment above) rather than kept alongside a custom UI.
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=()",
  );
  return response;
}

function getStoredSession(req: NextRequest): GuardSession | null {
  const raw = req.cookies.get("bayan-auth")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    const session = parsed?.state?.session;
    if (!session || typeof session.expiresAt !== "number") return null;
    const roles: AppRole[] = Array.isArray(session.roles)
      ? session.roles.filter((r: unknown): r is AppRole =>
          typeof r === "string" && KNOWN_ROLES.includes(r),
        )
      : [];
    return { roles, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const policy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js discovers the nonce by parsing the Content-Security-Policy header on
  // the *request*, then stamps it onto the inline bootstrap/hydration scripts it
  // injects. Setting the policy only on the response left those scripts
  // unnonced, and because `script-src` uses `strict-dynamic` — which makes
  // browsers ignore `'self'` for scripts — every page load failed with
  // "Executing inline script violates the following Content Security Policy
  // directive", blocking login on the deployed environment.
  requestHeaders.set("Content-Security-Policy", policy);

  const decision = decideRoute(
    req.nextUrl.pathname,
    getStoredSession(req),
    Date.now(),
    isLandingOnlyBuild(),
  );
  if (decision.type === "redirect") {
    const url = req.nextUrl.clone();
    url.pathname = decision.to;
    return applySecurityHeaders(NextResponse.redirect(url), policy);
  }

  return applySecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    policy,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|api|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?|ttf|otf|eot|css|js|map)).*)",
  ],
};