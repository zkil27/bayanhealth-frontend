/**
 * Patient profile data access.
 *
 * `GET`/`PUT /v1/patients/me/profile` is the platform's storage for a patient's
 * own identity and the standing health details they reuse at booking time — name,
 * preferred name, pronoun, date of birth, sex at birth, height, weight, blood
 * type, allergens, and diet. Before it, `useProfile` kept every field in a
 * memory-only `Map` with
 * `isPersisted: false as const`, because there was nothing to save to.
 *
 * The request replaces the stored profile wholesale: a field with a value stores
 * it, an empty string or empty array clears it, and `fullName` is always required.
 */
import { api, ApiError } from "@/lib/api";

export type GenderAtBirth = "male" | "female" | "prefer not to say";

/** The eight standard ABO/Rh blood groups. */
export type BloodType =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export interface PatientProfileResponse {
  patientId: string;
  /** Absent when the patient has never saved a name. Never blank. */
  fullName?: string;
  /** Each absent — never blank — until the patient fills it in. */
  preferredName?: string;
  preferredPronoun?: string;
  /** `YYYY-MM-DD`. */
  dateOfBirth?: string;
  genderAtBirth?: GenderAtBirth;
  /** Centimetres, as the patient typed them. */
  height?: string;
  /** Kilograms, as the patient typed them. */
  weight?: string;
  /** One of the eight standard ABO/Rh groups. Absent until the patient picks one. */
  bloodType?: BloodType;
  /** Non-empty when present. `["None"]` is an asserted "no known allergies". */
  allergens?: string[];
  otherAllergens?: string;
  diet?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The savable fields. `fullName` is required; every other key is optional, and
 * sending `""` / `[]` clears the stored value.
 */
export interface PatientProfileUpdate {
  fullName: string;
  preferredName?: string;
  preferredPronoun?: string;
  dateOfBirth?: string;
  genderAtBirth?: GenderAtBirth | "";
  height?: string;
  weight?: string;
  bloodType?: BloodType | "";
  allergens?: string[];
  otherAllergens?: string;
  diet?: string[];
}

/**
 * Read the signed-in patient's profile.
 *
 * Returns null when there is no token. A `403` also resolves to null rather than
 * throwing: a doctor or admin opening a profile screen is not an error worth
 * surfacing, they simply have no patient profile.
 */
export async function fetchOwnPatientProfile(
  idToken: string,
): Promise<PatientProfileResponse | null> {
  if (!idToken) return null;
  try {
    const res = await api.get<PatientProfileResponse>(
      "/v1/patients/me/profile",
      idToken,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

/**
 * Save the signed-in patient's profile.
 *
 * `idempotencyKey` is reused across retries of one logical save so a resubmit after
 * a timeout does not race itself.
 */
export async function saveOwnPatientProfile(
  idToken: string,
  update: PatientProfileUpdate,
  idempotencyKey?: string,
): Promise<PatientProfileResponse> {
  const res = await api.request<PatientProfileResponse>(
    "/v1/patients/me/profile",
    idToken,
    {
      method: "PUT",
      body: JSON.stringify(update),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    },
  );
  return res.data;
}
