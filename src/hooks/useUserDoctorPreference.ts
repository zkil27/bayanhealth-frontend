import { DoctorPreferencesType } from "@/features/booking/types/booking.types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Doctor-preference state (gender / language preferences for matching).
 *
 * **There is no doctor-preference endpoint.** `contracts/openapi.yaml` has no
 * `/v1/patients/me/profile` or any preference path, and `GET
 * /v1/patients/me/profile` answers 404 in dev. This hook used to be four
 * `setTimeout(resolve, 500)` stubs marked "Replace with real API later": the
 * fetch always returned empty defaults, and every "update" resolved after half a
 * second having stored nothing. `DoctorPreferencesContent` awaited that
 * resolution, closed edit mode, and left the patient looking at a saved-looking
 * screen — the values were gone on the next mount, and not even the in-session
 * store survived.
 *
 * It now follows the pattern `useProfile.ts` already established for the same
 * missing endpoint: a memory-only per-session `Map`, keyed by user id, plus an
 * exported `isPersisted: false as const` so no caller can present a save as
 * stored (ADR-20260806-02, mirroring the memory-only browser state decision in
 * ADR-20260726-01).
 *
 * The artificial delays are gone as well. They existed only to imitate network
 * latency, which made a local write look like a round trip — a "Saving…" spinner
 * for an operation that never left the tab.
 */

/** Nothing preselected: an unstated preference is not a choice the patient made. */
function emptyPreferences(): DoctorPreferencesType {
  return {
    genderPreferences: [],
    languagePreferences: [],
  };
}

/**
 * Locally held preference edits, keyed by user id.
 *
 * Memory-only and per-tab. This is NOT persistence — it exists so the profile
 * screen and the booking form agree within one session. Until a preference
 * endpoint exists, edits are lost on reload, and `isPersisted` lets callers say
 * so rather than implying a save that did not happen.
 */
const sessionPreferences = new Map<string, DoctorPreferencesType>();

export function useUserDoctorPreference(userId?: string | null) {
  const queryClient = useQueryClient();

  const {
    data: doctorPreferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["doctorPreferences", userId],
    queryFn: () => {
      if (!userId) throw new Error("User ID is required");
      const existing = sessionPreferences.get(userId);
      if (existing) return existing;
      const created = emptyPreferences();
      sessionPreferences.set(userId, created);
      return created;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: async (
      data: Partial<DoctorPreferencesType>,
    ): Promise<DoctorPreferencesType> => {
      if (!userId) throw new Error("User ID is required");
      const merged = {
        ...(sessionPreferences.get(userId) ?? emptyPreferences()),
        ...data,
      };
      sessionPreferences.set(userId, merged);
      return merged;
    },
    onSuccess: (updatedPreferences) => {
      if (userId) {
        queryClient.setQueryData(
          ["doctorPreferences", userId],
          updatedPreferences,
        );
      }
    },
  });

  return {
    doctorPreferences,
    isLoading: isLoading && !!userId,
    error: userId ? error : null,
    /**
     * False until a doctor-preference endpoint exists. Callers must not present
     * a successful update as stored data.
     */
    isPersisted: false as const,

    updateDoctorPreferences: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    refetch: () => {
      if (userId) {
        return queryClient.invalidateQueries({
          queryKey: ["doctorPreferences", userId],
        });
      }
      return Promise.resolve();
    },
  };
}
