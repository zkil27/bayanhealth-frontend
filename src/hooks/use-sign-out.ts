"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/useAuthStore";
import { performSignOut, SIGN_OUT_ERROR_MESSAGE } from "@/lib/sign-out";
import { discardRefreshToken } from "@/lib/session-restore";

/**
 * Return shape of {@link useSignOut}.
 */
export interface UseSignOut {
  /** Triggers sign-out; resolves to `true` on success, `false` on failure. */
  signOut: () => Promise<boolean>;
  /** `true` while a sign-out attempt is in flight. */
  pending: boolean;
  /** The last failure message, or `null` when there is none. */
  error: string | null;
}

/**
 * Reusable sign-out control.
 *
 * Wires the pure {@link performSignOut} action to the auth store and the
 * Next.js router:
 * - Calls `useAuthStore.clearSession()` which clears the persisted store and
 *   deletes the `bayan-auth` cookie (Requirement 6.4).
 * - Routes to `/signIn` on success (Requirement 6.5).
 * - On failure, surfaces a toast and exposes `error`, while the authenticated
 *   session is retained (Requirement 6.6).
 */
export function useSignOut(): UseSignOut {
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    setPending(true);
    setError(null);

    const result = await performSignOut({
      clearSession: async () => {
        // Drop the server-side refresh cookie first. Clearing only the in-memory
        // session would leave a credential behind that the next page load would
        // happily use to sign the user straight back in.
        await discardRefreshToken();
        clearSession();
      },
      navigate: (path) => router.push(path),
    });

    if (!result.ok) {
      setError(result.error);
      toast.error(result.error ?? SIGN_OUT_ERROR_MESSAGE);
    }

    setPending(false);
    return result.ok;
  }, [clearSession, router]);

  return { signOut, pending, error };
}
