import { create } from "zustand";
import {
  type AuthTokens,
  getGroupsFromToken,
  parseJwtPayload,
} from "@/lib/cognito";
import { resolvePrimaryRole } from "@/lib/roles";

export type AppRole = "patient" | "doctor" | "admin";

export interface AuthSession {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  email: string;
  userId: string;
  roles: AppRole[];
  expiresAt: number;
}

/**
 * How the current session came to exist.
 *
 * `unknown` is the state before the app has tried to restore a session from the
 * `HttpOnly` refresh cookie. It matters because `SessionGuard` must not redirect
 * during that window — doing so is exactly what made a reload look like a sign-out
 * even once restoration existed.
 */
export type SessionOrigin = "unknown" | "restoring" | "signed-in" | "restored" | "none";

interface AuthStore {
  session: AuthSession | null;
  /** See {@link SessionOrigin}. Starts `unknown` on every fresh page load. */
  origin: SessionOrigin;
  setSession: (tokens: AuthTokens, email: string) => void;
  /**
   * Adopt tokens re-minted server-side from the refresh cookie.
   *
   * Distinct from {@link setSession} because there is no refresh token to store —
   * it never leaves the server — and because the resulting origin is `restored`,
   * which is what tells the guard a reload was recovered rather than freshly
   * authenticated.
   */
  restoreSession: (input: RestoredTokens, email: string) => void;
  /** Record that restoration was attempted and found no session. */
  markNoSession: () => void;
  markRestoring: () => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
  primaryRole: () => AppRole | null;
}

/** Short-lived tokens returned by `POST /api/auth/refresh`. */
export interface RestoredTokens {
  idToken: string;
  accessToken: string;
  expiresIn: number;
}

/**
 * Cookie name used by both the auth store (client) and middleware (server).
 * Contains a minimal JSON payload: { roles, expiresAt } — no tokens.
 */
const AUTH_COOKIE = "bayan-auth";

/** Write the session marker cookie so Next.js middleware can read it. */
function writeAuthCookie(roles: AppRole[], expiresAt: number) {
  if (typeof document === "undefined") return;
  const payload = encodeURIComponent(
    JSON.stringify({ state: { session: { roles, expiresAt } } }),
  );
  const maxAge = Math.floor((expiresAt - Date.now()) / 1000);
  // SameSite=Lax is safe for same-origin navigation; Secure when on HTTPS
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE}=${payload}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/** Clear the session marker cookie on sign-out. */
function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Claims -> session fields, shared by fresh sign-in and restoration. */
function sessionFromIdToken(idToken: string): {
  userId: string;
  roles: AppRole[];
} {
  const claims = parseJwtPayload(idToken);
  const groups = getGroupsFromToken(idToken);
  return {
    userId: (claims.sub as string) ?? "",
    roles: groups.filter((g): g is AppRole =>
      (["patient", "doctor", "admin"] as string[]).includes(g),
    ),
  };
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  session: null,
  origin: "unknown",

  setSession: (tokens, email) => {
    const { userId, roles } = sessionFromIdToken(tokens.idToken);
    const expiresAt = Date.now() + tokens.expiresIn * 1000;

    set({
      session: {
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        email,
        userId,
        roles,
        expiresAt,
      },
      origin: "signed-in",
    });
    writeAuthCookie(roles, expiresAt);
  },

  restoreSession: (input, email) => {
    const { userId, roles } = sessionFromIdToken(input.idToken);
    const expiresAt = Date.now() + input.expiresIn * 1000;
    set({
      session: {
        idToken: input.idToken,
        accessToken: input.accessToken,
        // Deliberately empty: the refresh token stays in the `HttpOnly` cookie and
        // is never handed back to the browser. Nothing client-side may refresh.
        refreshToken: "",
        email,
        userId,
        roles,
        expiresAt,
      },
      origin: "restored",
    });
    writeAuthCookie(roles, expiresAt);
  },

  markRestoring: () => set({ origin: "restoring" }),

  markNoSession: () => set({ origin: "none" }),

  /**
   * Drop the session and its marker cookie.
   *
   * **Idempotent, and it has to be.** `set` notifies every store subscriber on
   * each call — the object is new, so there is no equality bail-out — and
   * `SessionGuard` both subscribes to the store *and* calls this from inside its
   * subscriber. Clearing an already-cleared session therefore re-entered the
   * subscriber, which cleared again, until the stack blew:
   *
   *     evaluate -> clearSession -> set -> subscriber -> evaluate -> ...
   *     RangeError: Maximum call stack size exceeded
   *
   * Reachable in production whenever the guard runs on a protected path without
   * a valid session — most easily when the `bayan-auth` cookie outlives the
   * in-memory store (a partial site-data clear, a reload mid-expiry), which is
   * exactly the case that also needs the cookie cleared.
   *
   * So the cookie write stays unconditional — it is idempotent and touches no
   * subscriber — while `set` runs only when there is a state change to publish.
   */
  clearSession: () => {
    clearAuthCookie();
    const { session, origin } = get();
    if (session === null && origin === "none") return;
    set({ session: null, origin: "none" });
  },

  isAuthenticated: () => {
    const { session } = get();
    return !!session && Date.now() < session.expiresAt;
  },

  primaryRole: () => {
    const { session } = get();
    if (!session) return null;
    return resolvePrimaryRole(session.roles);
  },
}));

export const selectSession = (state: AuthStore) => state.session;
export const selectOrigin = (state: AuthStore) => state.origin;
/**
 * True once the app knows whether a session exists.
 *
 * Guards must wait for this before redirecting: on a fresh page load the store is
 * empty and the refresh exchange has not finished, so "no session" is not yet a
 * fact. Redirecting during that window is what made a reload look like a logout.
 */
export const selectSessionResolved = (state: AuthStore) =>
  state.origin !== "unknown" && state.origin !== "restoring";
export const selectIdToken = (state: AuthStore) =>
  state.session?.idToken ?? null;
export const selectAccessToken = (state: AuthStore) =>
  state.session?.accessToken ?? null;
export const selectRefreshToken = (state: AuthStore) =>
  state.session?.refreshToken ?? null;
export const selectEmail = (state: AuthStore) => state.session?.email ?? null;
export const selectUserId = (state: AuthStore) => state.session?.userId ?? null;
export const selectRoles = (state: AuthStore) => state.session?.roles ?? [];
export const selectExpiresAt = (state: AuthStore) =>
  state.session?.expiresAt ?? 0;

export const selectIsAuthenticated = (state: AuthStore) => {
  return !!state.session && Date.now() < state.session.expiresAt;
};

export const selectPrimaryRole = (state: AuthStore) => {
  if (!state.session) return null;
  return resolvePrimaryRole(state.session.roles);
};

// Check if user is a staff
export const selectIsStaff = (state: AuthStore) => {
  const roles = state.session?.roles ?? [];
  return roles.includes("admin") || roles.includes("doctor");
};

// Check if user is a doctor
export const selectIsDoctor = (state: AuthStore) => {
  const roles = state.session?.roles ?? [];
  return roles.includes("doctor");
};

// Check if user is a patient
export const selectIsPatient = (state: AuthStore) => {
  const roles = state.session?.roles ?? [];
  return roles.includes("patient");
};

// Check if token is expired
export const selectIsTokenExpired = (state: AuthStore) => {
  const session = state.session;
  if (!session) return true;
  // Consider expired if less than 5 minutes remaining
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() >= session.expiresAt - fiveMinutes;
};

// Session hooks
export const useSession = () => useAuthStore(selectSession);
export const useIdToken = () => useAuthStore(selectIdToken);
export const useAccessToken = () => useAuthStore(selectAccessToken);
export const useRefreshToken = () => useAuthStore(selectRefreshToken);
export const useEmail = () => useAuthStore(selectEmail);
export const useUserId = () => useAuthStore(selectUserId);
export const useRoles = () => useAuthStore(selectRoles);
export const useExpiresAt = () => useAuthStore(selectExpiresAt);
export const useIsAuthenticated = () => useAuthStore(selectIsAuthenticated);
export const usePrimaryRole = () => useAuthStore(selectPrimaryRole);

// Role based and user hooks
export const useIsStaff = () => useAuthStore(selectIsStaff);
export const useIsPatient = () => useAuthStore(selectIsPatient);
export const useIsTokenExpired = () => useAuthStore(selectIsTokenExpired);
