"use client";

import { useQuery } from "@tanstack/react-query";

import { useIdToken } from "@/stores/useAuthStore";
import { fetchDoctorKyc, type DoctorProfile } from "../lib/api/kyc";

/**
 * The signed-in doctor's own profile.
 *
 * Read from `GET /v1/doctors/me/kyc`, which returns `{ profile, documents }` —
 * there is no `GET /v1/doctors/me/profile`, only a `PUT`.
 *
 * This exists because two doctor surfaces were inventing what the profile already
 * holds: the sidebar reverse-engineered a display name from the email local part
 * (`sarah.rodriguez@x.com` -> "Sarah Rodriguez", falling back to "Doctor"), and
 * the teleconsult switch asserted availability from `useState(true)` — a claim the
 * platform had never recorded. `fullName` and `onDemandAvailable` are real fields
 * on this record.
 *
 * Returns `null` rather than throwing when the doctor has no profile yet (404),
 * so callers render an unresolved state instead of an error.
 */
export function useMyDoctorProfile() {
  const idToken = useIdToken();

  const query = useQuery({
    queryKey: ["doctor-me-profile", idToken],
    queryFn: async (): Promise<DoctorProfile | null> => {
      try {
        const bundle = await fetchDoctorKyc(idToken ?? "");
        return bundle.profile ?? null;
      } catch {
        // A doctor who has not created a profile gets 404; that is a state, not
        // a failure. Anything else also degrades to "unresolved" here rather
        // than blocking the dashboard shell this feeds.
        return null;
      }
    },
    enabled: !!idToken,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
  };
}
