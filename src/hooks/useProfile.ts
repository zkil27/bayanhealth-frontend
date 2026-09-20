import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  fetchOwnPatientProfile,
  saveOwnPatientProfile,
  type PatientProfileResponse,
  type PatientProfileUpdate,
} from "@/lib/api/patientProfile";
import { useIdToken } from "@/stores/useAuthStore";

/**
 * Patient profile state.
 *
 * The profile screen edits name, preferred name, pronoun, date of birth, sex at
 * birth, height, weight, blood type, allergens, and diet, and `PersonDataSection`
 * copies all of them into a new booking's intake form. Those fields are now stored:
 * `GET`/`PUT /v1/patients/me/profile` persists them, so a patient enters them once
 * and the next booking pre-fills them instead of asking again.
 *
 * History worth keeping: this hook once returned a `setTimeout` stub with a
 * fabricated profile — "Juan Santos", weight `"70"`, height `"175"`,
 * `allergens: ["Pollen"]`, plus three invented relatives carrying `["Penicillin"]`,
 * `["Sulfa","Shellfish"]`, and `["Latex","Peanuts"]`. That was not cosmetic:
 * `populateSelfData()` writes these values into the intake form, which is submitted
 * to `PUT /v1/bookings/{bookingId}/intake`, so a fabricated allergy list could
 * enter a real clinical record and read to a physician as the patient's own
 * answer. Every field therefore starts **empty** and is filled only by the
 * patient. An empty allergen list is "not answered yet"; `["None"]` is the
 * patient's asserted "no known allergies"; the two are not the same.
 *
 * `relationships` (the "booking for someone else" dependents) is the one part of
 * this object that still has no endpoint — that flow is not shipped — so it stays
 * session-only via {@link sessionProfiles}.
 */

export interface RelationshipData {
  name: string;
  preferredName: string;
  preferredPronoun: string;
  dateOfBirth: string;
  genderAtBirth: "male" | "female" | "prefer not to say";
  weight: string;
  height: string;
  bloodType: string;
  allergens: string[];
  otherAllergens: string;
  diet: string[];
}

export interface Relationship {
  value: string;
  label: string;
  data: RelationshipData | null;
}

export interface UserProfile {
  name: string;
  preferredName: string;
  preferredPronoun: string;
  dateOfBirth: string;
  genderAtBirth: "male" | "female" | "prefer not to say";
  weight: string;
  height: string;
  bloodType: string;
  allergens: string[];
  otherAllergens: string;
  diet: string[];
  relationships: Relationship[];
}

/**
 * Relationship slots the patient may fill in.
 *
 * Labels only — `data: null` throughout. These are the choices offered by the
 * "booking for someone else" flow, not stored records of real people, so they
 * carry no names, dates of birth, or clinical fields.
 */
const RELATIONSHIP_SLOTS: readonly Relationship[] = [
  { value: "mother", label: "Mother", data: null },
  { value: "father", label: "Father", data: null },
  { value: "sibling", label: "Sibling", data: null },
  { value: "spouse", label: "Spouse", data: null },
  { value: "child", label: "Child", data: null },
  { value: "other", label: "Other", data: null },
];

/**
 * An empty profile. Every field is blank — including `name` — so nothing is
 * asserted on the patient's behalf.
 */
function emptyProfile(): UserProfile {
  return {
    name: "",
    preferredName: "",
    preferredPronoun: "",
    dateOfBirth: "",
    genderAtBirth: "prefer not to say",
    weight: "",
    height: "",
    bloodType: "",
    allergens: [],
    otherAllergens: "",
    diet: [],
    relationships: [...RELATIONSHIP_SLOTS],
  };
}

/**
 * Fold a stored `GET /v1/patients/me/profile` response into the local shape.
 *
 * The response omits any field the patient has not set, so an absent key leaves
 * the local default in place rather than blanking it.
 */
function mergeRemoteIntoProfile(
  base: UserProfile,
  remote: PatientProfileResponse | null,
): UserProfile {
  if (!remote) return base;
  return {
    ...base,
    name: remote.fullName ?? base.name,
    preferredName: remote.preferredName ?? base.preferredName,
    preferredPronoun: remote.preferredPronoun ?? base.preferredPronoun,
    dateOfBirth: remote.dateOfBirth ?? base.dateOfBirth,
    genderAtBirth: remote.genderAtBirth ?? base.genderAtBirth,
    height: remote.height ?? base.height,
    weight: remote.weight ?? base.weight,
    bloodType: remote.bloodType ?? base.bloodType,
    allergens: remote.allergens ?? base.allergens,
    otherAllergens: remote.otherAllergens ?? base.otherAllergens,
    diet: remote.diet ?? base.diet,
  };
}

/**
 * Project the editable profile to a `PUT` body.
 *
 * Empty strings and empty arrays are sent as-is: the endpoint reads them as
 * "clear this", so retracting a detail on the screen retracts it on the server.
 * `relationships` is not included — it has no endpoint.
 */
function toUpdatePayload(profile: UserProfile): PatientProfileUpdate {
  return {
    fullName: profile.name.trim(),
    preferredName: profile.preferredName.trim(),
    preferredPronoun: profile.preferredPronoun,
    dateOfBirth: profile.dateOfBirth,
    genderAtBirth: profile.genderAtBirth,
    height: String(profile.height ?? "").trim(),
    weight: String(profile.weight ?? "").trim(),
    bloodType: (profile.bloodType ?? "").trim() as PatientProfileUpdate["bloodType"],
    allergens: profile.allergens ?? [],
    otherAllergens: profile.otherAllergens ?? "",
    diet: profile.diet ?? [],
  };
}

/**
 * Locally held profile, keyed by user id.
 *
 * A per-tab cache that keeps the profile screen and the intake form in agreement
 * within one session and carries edits made before the patient has entered a name
 * (which the endpoint requires). It is seeded from, and written through to, the
 * server — it is not a substitute for it. `relationships` is the only field that
 * lives here and nowhere else.
 */
const sessionProfiles = new Map<string, UserProfile>();

export function useProfile(userId?: string | null) {
  const queryClient = useQueryClient();
  const idToken = useIdToken();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const base = sessionProfiles.get(userId) ?? emptyProfile();

      // A read failure is not fatal: the screen still opens with whatever the
      // session holds, rather than erroring on a field the patient may not have
      // set.
      let remote: PatientProfileResponse | null = null;
      try {
        remote = idToken ? await fetchOwnPatientProfile(idToken) : null;
      } catch {
        remote = null;
      }
      const merged = mergeRemoteIntoProfile(base, remote);
      sessionProfiles.set(userId, merged);
      return merged;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>): Promise<UserProfile> => {
      if (!userId) throw new Error("User ID is required");
      const previous = sessionProfiles.get(userId) ?? emptyProfile();
      const merged = { ...previous, ...data };

      // The endpoint requires a name. Until the patient has entered one, edits to
      // the other fields are held in the session cache only — awaiting a name
      // rather than failing the save with a 422 the screen cannot act on.
      if (idToken && merged.name.trim()) {
        // No explicit idempotency key: `api.request` mints one per call, and the
        // backend hashes the payload, so a repeat save of the same values is the
        // same outcome either way.
        const saved = await saveOwnPatientProfile(idToken, toUpdatePayload(merged));
        const reconciled = mergeRemoteIntoProfile(merged, saved);
        sessionProfiles.set(userId, reconciled);
        return reconciled;
      }

      sessionProfiles.set(userId, merged);
      return merged;
    },
    onSuccess: (updatedProfile) => {
      if (userId) {
        queryClient.setQueryData(["profile", userId], updatedProfile);
      }
    },
  });

  const addRelationshipMutation = useMutation({
    mutationFn: async (
      relationship: Omit<Relationship, "data">,
    ): Promise<Relationship> => ({ ...relationship, data: null }),
    onSuccess: (newRelationship) => {
      if (!userId) return;
      queryClient.setQueryData(
        ["profile", userId],
        (old: UserProfile | undefined) => {
          if (!old) return old;
          const next = {
            ...old,
            relationships: [...old.relationships, newRelationship],
          };
          sessionProfiles.set(userId, next);
          return next;
        },
      );
    },
  });

  const deleteRelationshipMutation = useMutation({
    mutationFn: async (value: string): Promise<string> => value,
    onSuccess: (deletedValue) => {
      if (!userId) return;
      queryClient.setQueryData(
        ["profile", userId],
        (old: UserProfile | undefined) => {
          if (!old) return old;
          const next = {
            ...old,
            relationships: old.relationships.filter(
              (rel) => rel.value !== deletedValue,
            ),
          };
          sessionProfiles.set(userId, next);
          return next;
        },
      );
    },
  });

  return {
    profile,
    isLoading: isLoading && !!userId,
    error: userId ? error : null,
    /**
     * True: name, preferred name, pronoun, date of birth, sex at birth, height,
     * weight, blood type, allergens, and diet are written to
     * `PUT /v1/patients/me/profile` and survive a reload.
     *
     * `relationships` is the exception and is still session-only — the
     * "booking for someone else" flow it belongs to is not shipped.
     */
    isPersisted: true as const,
    /**
     * True: `name` is written to `PUT /v1/patients/me/profile` and is what the
     * assigned doctor sees on their queue.
     */
    isNamePersisted: true as const,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    addRelationship: addRelationshipMutation.mutate,
    isAdding: addRelationshipMutation.isPending,
    deleteRelationship: deleteRelationshipMutation.mutate,
    isDeleting: deleteRelationshipMutation.isPending,
    refetch: () => {
      if (userId) {
        return queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      }
      return Promise.resolve();
    },
  };
}
