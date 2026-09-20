/**
 * Builds the URL a declined booking's "Find another doctor" link points to
 * (Task 13, guided rebooking wizard).
 *
 * The contract (`respondToScheduledRequest`, decline branch) states the
 * intended behaviour outright: "The patient is redirected client-side into a
 * rebooking flow that excludes this doctor; the backend records only the
 * decline itself." There is no backend support for this and none is needed —
 * `GET /v1/doctors` has no filter query parameters, so exclusion is a
 * client-side search filter (`useDoctorFilter`'s `excludeDoctorId`, honoured
 * by `DoctorSearchPanel`/`DoctorSearchView`), and this function only has to
 * point at the existing search route with that filter pre-seeded — there is
 * no separate "rebooking" route to build or maintain.
 */
export interface RebookingLinkInput {
  /** The doctor who declined the booking — the one this flow must exclude. */
  excludeDoctorId: string | undefined;
}

/**
 * Build the rebooking URL for a declined booking: the ordinary doctor-search
 * page, with the declining doctor pre-excluded.
 *
 * Falls back to the plain, unfiltered `/patient/booking/search` when no doctor id is
 * known to exclude — a defensive branch, not an expected one: the backend
 * only ever declines a booking that is already assigned to the declining
 * doctor (`declineScheduledRequest`'s precondition requires
 * `item.doctorId === input.doctorId`), so `excludeDoctorId` should always be
 * present in practice. Sending the patient to unfiltered search rather than
 * failing the link is the honest degradation.
 */
export function buildRebookingUrl(input: RebookingLinkInput): string {
  if (!input.excludeDoctorId) return "/patient/booking/search";
  const params = new URLSearchParams({ excludeDoctorId: input.excludeDoctorId });
  return `/patient/booking/search?${params.toString()}`;
}
