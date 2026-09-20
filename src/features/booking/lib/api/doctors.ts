import { api, ApiError } from "@/lib/api";
import { fetchSlotsInRange } from "@/lib/schedules";
import { SearchDoctor } from "../../types/searchDoctors.types";
import { selectableSlots } from "../slotTime";

/**
 * Doctor search data access (Slice 4, Requirement 9).
 *
 * Doctor search is backed entirely by the contract-frozen backend — it never
 * reads bundled or hard-coded sample data (Requirement 9.1). The doctor list
 * comes from the admin user directory filtered to the `doctor` group, and each
 * doctor's availability comes from `GET /v1/doctors/{doctorId}/schedules`.
 */

/**
 * Doctor identity the search list works from.
 *
 * Sourced from `GET /v1/doctors` (`DoctorPublicSummary`), not the admin user
 * directory: `GET /v1/admin/users` requires the `admin` role, so every patient
 * search request against it returned 403.
 */
export interface BackendDoctorUser {
  doctorId: string;
  fullName: string;
  specialty?: string;
}

/** Subset of the backend `Slot` schema returned by the schedules endpoint. */
export interface BackendSlot {
  slotId: string;
  doctorId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24-hour) */
  startTime: string;
  durationMinutes: number;
  status: "available" | "booked" | "blocked";
  bookingId?: string;
  notes?: string;
}

export interface DoctorSearchOptions {
  /** How many days ahead to request availability for. Defaults to 30. */
  scheduleWindowDays?: number;
  /** Cap the number of doctors fetched (used by the "Doctors For You" rail). */
  maxDoctors?: number;
}

/** Format a Date as a `YYYY-MM-DD` string for the schedule date-range query. */
export function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Derive a stable, non-negative numeric id from a doctor's user id so the
 * existing card list (keyed by a numeric `id`) keeps working with real users.
 */
export function doctorIdToNumericId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (Math.imul(31, hash) + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Derive a human-readable display name from a doctor's email local part.
 * `sarah.rodriguez@x.com` -> `Sarah Rodriguez`; falls back to the raw email.
 */
export function deriveDoctorName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const words = localPart
    .split(/[._-]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.length > 0 ? words.join(" ") : email;
}

/**
 * Map a backend doctor user plus its availability slots to the `SearchDoctor`
 * shape the doctor cards render. Only `available` slots contribute to the
 * displayed schedule; they are ordered chronologically.
 */
export function mapDoctorToSearchDoctor(
  user: BackendDoctorUser,
  slots: BackendSlot[],
): SearchDoctor {
  // Past slots are excluded as well as claimed ones: a 09:00 slot is still
  // `available` at 15:00 the same day, and advertising it on a search card sets
  // the patient up for a `409 SLOT_UNAVAILABLE` at the end of the booking flow.
  const available = selectableSlots(slots)
    .sort((a, b) =>
      `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`),
    );

  return {
    id: doctorIdToNumericId(user.doctorId),
    doctorId: user.doctorId,
    name: user.fullName,
    // Real specialty from `DoctorPublicSummary`. It was previously dropped here,
    // which is why the card's `doctor.specialty || "Cardiologist"` fallback fired
    // on every render even though the platform did hold the value.
    ...(user.specialty ? { specialty: user.specialty } : {}),
    scheduleSpace: available
      .slice(0, 6)
      .map((slot) => `${slot.date} · ${slot.startTime}`),
    nextAvailable: available[0]?.date,
  };
}

/**
 * Load doctors and their availability from the backend.
 *
 * Throws an {@link ApiError} when the doctor-list request fails or when no auth
 * token is available, so callers (the `AsyncView` wrapper) surface the defined
 * error state with a retry control (Requirement 9.5). A single doctor's
 * schedule request failing degrades that doctor to "no availability" rather
 * than failing the whole search.
 */
export async function fetchDoctorSearch(
  token: string,
  options: DoctorSearchOptions = {},
): Promise<SearchDoctor[]> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to search for doctors.",
      401,
    );
  }

  const { scheduleWindowDays = 30, maxDoctors } = options;

  const usersRes = await api.get<BackendDoctorUser[]>("/v1/doctors", token);
  let doctors = usersRes.data ?? [];
  if (maxDoctors != null) {
    doctors = doctors.slice(0, maxDoctors);
  }
  if (doctors.length === 0) {
    return [];
  }

  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + scheduleWindowDays);
  const startDate = formatDateParam(today);
  const endDate = formatDateParam(windowEnd);

  return Promise.all(
    doctors.map(async (user) => {
      let slots: BackendSlot[] = [];
      try {
        slots = await fetchSlotsInRange<BackendSlot>(
          token,
          user.doctorId,
          startDate,
          endDate,
        );
      } catch {
        // One doctor's schedule failing must not blow up the whole search;
        // that doctor is shown with no availability instead.
        slots = [];
      }
      return mapDoctorToSearchDoctor(user, slots);
    }),
  );
}

/**
 * Patient-safe doctor projection returned by `GET /v1/doctors` and
 * `GET /v1/doctors/{doctorId}` (contracts/openapi.yaml#DoctorPublicSummary).
 *
 * These are the only doctor fields the backend discloses to a non-admin caller.
 * There is deliberately no email, licence number, phone number, hospital,
 * distance, or rating — the platform does not hold those, so the UI must not
 * invent them.
 */
export interface DoctorPublicSummary {
  doctorId: string;
  fullName: string;
  specialty?: string;
  onDemandAvailable?: boolean;
}

export interface DoctorDetailData {
  profile: DoctorPublicSummary;
  slots: BackendSlot[];
}

/**
 * Read one approved doctor's public summary.
 *
 * Returns null on 404, which the backend uses both for "no such doctor" and
 * "not consultation-approved" so neither is disclosed. Callers render an
 * unresolved state rather than treating null as an error.
 */
export async function fetchDoctorPublicProfile(
  doctorId: string,
  token: string,
): Promise<DoctorPublicSummary | null> {
  if (!token || !doctorId) return null;
  try {
    const res = await api.get<DoctorPublicSummary>(
      `/v1/doctors/${encodeURIComponent(doctorId)}`,
      token,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface DoctorDetailOptions {
  /** How many days ahead to request availability for. Defaults to 30. */
  scheduleWindowDays?: number;
}

/**
 * Load one doctor's public summary plus their upcoming availability.
 *
 * `GET /v1/doctors/{doctorId}/schedules` declares both `startDate` and
 * `endDate` as `required: true` query params (contracts/openapi.yaml, operation
 * `listSlots`), and `backend/src/handlers/schedules.ts#handleListSlots` rejects
 * a request missing either with `400 INVALID_PAYLOAD`. Requesting the endpoint
 * bare is what made "Visit Page" fail. The window is computed with the same
 * `formatDateParam` helper `fetchDoctorSearch` uses and defaults to the same 30
 * days; the handler imposes no maximum range, only `endDate >= startDate`.
 *
 * The read goes through {@link fetchSlotsInRange} rather than a bare `api.get`
 * because the endpoint paginates at 50 by default: a doctor running 15-minute
 * appointments passes that inside two working days, and a first-page read would
 * withhold the rest of the month from the patient — availability the doctor
 * published and nobody could book.
 */
export async function fetchDoctorDetail(
  doctorId: string,
  token: string,
  options: DoctorDetailOptions = {},
): Promise<DoctorDetailData> {
  if (!token) {
    throw new ApiError(
      "AUTH_REQUIRED",
      "You must be signed in to view doctor details.",
      401,
    );
  }

  const { scheduleWindowDays = 30 } = options;
  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + scheduleWindowDays);
  const startDate = formatDateParam(today);
  const endDate = formatDateParam(windowEnd);

  const [profileRes, slots] = await Promise.all([
    api.get<DoctorPublicSummary>(`/v1/doctors/${encodeURIComponent(doctorId)}`, token),
    fetchSlotsInRange<BackendSlot>(token, doctorId, startDate, endDate),
  ]);
  return { profile: profileRes.data, slots };
}
