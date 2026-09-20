/**
 * Copy for the "who is my doctor" slot, shared by the patient booking summary
 * card and the booking wizard steps.
 *
 * These labels are only correct as a set, which is why they live in one place.
 * The doctor directory (`GET /v1/doctors/{doctorId}`) answers 404 both for "no
 * such doctor" and for "not consultation-approved" so that neither is disclosed,
 * and `fetchDoctorPublicProfile` maps that to `null`. "Assigned, but never
 * named to this caller" is therefore a permanent, legitimate outcome — not a
 * step on the way to a name. A screen that treats an unresolved name as
 * "not assigned yet" prints "Doctor assignment pending" directly under
 * "Booking confirmed", and a screen that treats it as "still loading" leaves the
 * patient on a spinner label forever.
 */

/** The doctor summary read is genuinely still in flight. */
export const DOCTOR_RESOLVING_LABEL = "Resolving doctor…";

/**
 * A doctor IS assigned (the booking carries `doctorId`) but the directory did
 * not disclose them to this patient. States what the booking itself proves and
 * stops there — no name is invented to fill the gap.
 */
export const DOCTOR_UNDISCLOSED_LABEL = "Assigned — doctor details unavailable";

/** No doctor on the booking yet — the wizard's wording. */
export const DOCTOR_UNASSIGNED_LABEL = "Doctor assignment pending";

/**
 * No doctor on the booking yet — the summary card's wording, which names the
 * matching step the patient is actually waiting on.
 */
export const DOCTOR_MATCHING_LABEL = "Doctor matching in progress";

/**
 * Label the assigned-doctor slot of a wizard step from the {@link Booking}
 * fields alone.
 *
 * The wizard is only handed a booking, so `doctorId` is what separates "no
 * doctor yet" from "doctor assigned, name not disclosed". An empty `doctorName`
 * on a booking that has a `doctorId` must never read as unassigned.
 *
 * @param doctorName - Resolved `DoctorPublicSummary.fullName`, empty if unresolved.
 * @param doctorId - The booking's assigned doctor id, empty when unassigned.
 */
export function assignedDoctorLabel(
  doctorName: string | undefined,
  doctorId: string | undefined,
): string {
  const name = (doctorName ?? "").trim();
  if (name) return name;
  return doctorId ? DOCTOR_UNDISCLOSED_LABEL : DOCTOR_UNASSIGNED_LABEL;
}
