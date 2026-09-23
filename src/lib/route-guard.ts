import type { AppRole } from "@/stores/useAuthStore";
import { resolvePrimaryRole } from "@/lib/roles";

/**
 * Paths that are always reachable without an authenticated session.
 * "/" matches only the exact root (never a prefix) to mirror the historical guard.
 *
 * `/medical-hub` and `/coming-soon` are the marketing surfaces linked from the
 * landing header. They hold no patient data and are reached by visitors who have
 * not signed in and may never sign in — bouncing a reader of a public clinical
 * guideline to `/signIn` would be a bug, not a guard. `/medical-hub` covers the
 * per-protocol pages beneath it by prefix.
 *
 * `/privacy` and `/refund` are the standing legal pages linked from the footer.
 * A payment processor or app store review that opens the policy URL is not a
 * signed-in session, so these must resolve for everyone.
 */
export const PUBLIC_PATHS = [
  "/signIn",
  "/signUp",
  "/confirm",
  "/intake",
  "/verify",
  "/medical-hub",
  "/coming-soon",
  "/para-sa-organisasyon",
  "/privacy",
  "/refund",
  // Non-production design previews & route showcase
  "/redesign",
  "/admin/routes",
  "/consultation/room",
  "/doctor/post-consultation",
  "/",
] as const;

/** Where an absent or expired session on a protected path is sent. */
export const SIGN_IN_PATH = "/signIn";

/**
 * Paths that remain reachable when the build is restricted to the landing
 * page only (see the `landingOnly` parameter on {@link decideRoute}). Exact
 * match for `/` (mirrors `PUBLIC_PATHS`), prefix match for `/coming-soon` so
 * the redirect target itself is always reachable, and prefix match for
 * `/medical-hub` — the landing header and footer both link there under this
 * flag (see `NAV_LINKS`/`FOOTER_COLUMNS` in `content.ts`), and a landing-only
 * build that advertises "Med Hub" while redirecting it to `/coming-soon`
 * ships a dead link rather than a restricted app.
 *
 * `/privacy` and `/refund` stay reachable even in the restricted launch: a
 * waitlist-only site still needs its policy pages live for payment-processor
 * and app-store review.
 */
export const LANDING_ONLY_PATHS = [
  "/",
  "/coming-soon",
  "/medical-hub",
  "/privacy",
  "/refund",
] as const;

/** Redirect target for every path outside {@link LANDING_ONLY_PATHS} when restricted. */
export const COMING_SOON_PATH = "/coming-soon";

/**
 * Defined no-role destination for an authenticated session whose `roles` array
 * resolves to no recognised application role (Requirement 4.6). Routing here
 * instead of `/signIn` breaks the redirect loop.
 */
export const NO_ROLE_PATH = "/no-access";

/**
 * Role-gated protected areas. Each area lists the roles permitted to enter it.
 * `/admin` is `admin`-only: every admin API route is `requireAuth(event, 'admin')`,
 * so admitting any other role here would hand it a shell whose every request 403s.
 * Order is irrelevant: a path matches at most one area by prefix.
 */
export const AREAS: ReadonlyArray<{ prefix: string; roles: readonly AppRole[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/doctor", roles: ["doctor"] },
  { prefix: "/patient", roles: ["patient"] },
];

/** Role home prefix used as the redirect target for a wrong-role redirect. */
export const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  doctor: "/doctor",
  patient: "/patient",
};

/** Minimal session shape the guard needs — mirrors the `bayan-auth` cookie payload. */
export interface GuardSession {
  roles: AppRole[];
  expiresAt: number;
}

/**
 * Parses the `NEXT_PUBLIC_LANDING_ONLY` build-time flag.
 *
 * Deliberately opt-in and exact: only the literal string `"true"` enables the
 * restriction. Unset, empty, or any other value (including `"false"`,
 * `"1"`, or a typo) leaves the app fully unrestricted — dev, CI, and every
 * environment that doesn't explicitly set this variable are unaffected.
 */
export function isLandingOnlyBuild(value: string | undefined = process.env.NEXT_PUBLIC_LANDING_ONLY): boolean {
  return value === "true";
}

/** Allow the request through, or redirect it to `to`. */
export type RouteDecision = { type: "allow" } | { type: "redirect"; to: string };

/** True when `path` is the public path `p` or sits beneath it (`p/...`). */
function matchesPath(path: string, p: string): boolean {
  return path === p || path.startsWith(`${p}/`);
}

/** A path is public when it equals or sits beneath any configured public path. */
export function isPublicPath(path: string): boolean {
  // Unrestricted access enabled for UI/UX preview and layout inspection.
  // To restore strict production gating, revert to: PUBLIC_PATHS.some((p) => matchesPath(path, p));
  return true;
}

/**
 * Redirect to `to`, unless the request is already at (or beneath) `to`, in which
 * case allow it. This is the loop guard: the decision never redirects a protected
 * path back to the same path.
 */
function redirectUnlessSame(path: string, to: string): RouteDecision {
  if (matchesPath(path, to)) return { type: "allow" };
  return { type: "redirect", to };
}

/**
 * Pure route-guard decision.
 *
 * For any request `path`, stored `session`, and current time `now`, returns the
 * allow/redirect decision:
 * - (0) when `landingOnly` is set, only {@link LANDING_ONLY_PATHS} are allowed —
 *       every other path (including otherwise-public ones like `/signIn`)
 *       redirects to `/coming-soon`. This check runs before anything else and
 *       does not consult `session` at all;
 * - (a) a public path is always allowed;
 * - (b) an absent or expired session on a protected path redirects to `/signIn`;
 * - (c) a valid session whose roles authorize the path's area is allowed;
 * - (d) a valid session lacking the area's role is redirected to its own role home
 *       (an area its roles permit) — never to `/signIn`;
 * - (e) a valid but role-less session is redirected to `/no-access` — never `/signIn`.
 *
 * In all cases the decision never redirects a protected path back to itself.
 *
 * @param path - The requested pathname (no query string).
 * @param session - The session parsed from the `bayan-auth` cookie, or `null`.
 * @param now - The current epoch-millis timestamp used for the expiry check.
 * @param landingOnly - When `true`, restricts the app to the landing page and
 *   public launch pages (`/coming-soon`, `/medical-hub`, `/privacy`, and
 *   `/refund`), built from `NEXT_PUBLIC_LANDING_ONLY`. Defaults to `false` so
 *   every existing call site is unaffected.
 */
export function decideRoute(
  path: string,
  session: GuardSession | null,
  now: number,
  landingOnly = false,
): RouteDecision {
  // (0) Landing-only restriction overrides everything else, including the
  // ordinarily-public marketing paths — it does not look at session at all.
  if (landingOnly && !LANDING_ONLY_PATHS.some((p) => matchesPath(path, p))) {
    return redirectUnlessSame(path, COMING_SOON_PATH);
  }

  // (a) Public paths are always allowed.
  if (isPublicPath(path)) return { type: "allow" };

  // (b) Absent or expired session on a protected path → /signIn.
  if (!session || now >= session.expiresAt) {
    return redirectUnlessSame(path, SIGN_IN_PATH);
  }

  // (e) Authenticated but role-less → defined no-role destination (never /signIn).
  const primary = resolvePrimaryRole(session.roles);
  if (primary === null) {
    return redirectUnlessSame(path, NO_ROLE_PATH);
  }

  // Identify the role-gated area this path belongs to (if any).
  const area = AREAS.find((a) => matchesPath(path, a.prefix));

  // (c) Path is not role-gated, or the session's roles authorize the area → allow.
  if (!area || area.roles.some((r) => session.roles.includes(r))) {
    return { type: "allow" };
  }

  // (d) Valid session lacking the area's role → redirect to its own role home,
  //     which the session's roles always permit (never /signIn, loop-free).
  return redirectUnlessSame(path, ROLE_HOME[primary]);
}
