/**
 * Shared timing for the patient's view of released clinical documents.
 *
 * Lives here rather than in either card so the two patient-facing cards
 * (`PatientEducationCard`, `PrescriptionCard`) share one value without
 * importing from each other.
 */

/**
 * How often a waiting patient's booking page re-checks for released documents.
 *
 * A poll is currently the ONLY way a patient learns that guidance or a
 * prescription arrived (ADR-20260810-05):
 *
 *   - `ProtectedArtifactLifecycle.commitRelease` enqueues no notification. Its
 *     transaction is four items — artifact update, current-output pointer,
 *     reservation, audit — and none of them notify anybody. There is no
 *     `prescription_released` notification template, and the one
 *     `patient_education` template that exists is retired and throws.
 *   - The global query client sets `refetchOnWindowFocus: false`, so even
 *     returning to the tab did not re-read.
 *
 * Before this, both released-artifact queries used `staleTime: 5 minutes` with
 * no interval, so a patient sitting on their booking page when the physician
 * released something saw nothing until a manual reload — while `CompletedStep`
 * told them "Anything your doctor shares appears here."
 *
 * 15s is deliberately unaggressive: it is the same order of magnitude as the
 * booking page's existing 30s status poll, costs two lightweight GETs per
 * interval, and runs only while the consultation is `in_progress` or
 * `completed`. It is a stopgap for the missing release notification, not a
 * substitute for it.
 */
export const RELEASED_ARTIFACT_POLL_MS = 15_000;

/**
 * Booking statuses in which a physician can still release something, and so the
 * only statuses worth polling in.
 *
 * `in_progress` is included as well as `completed` because the assessment-first
 * gate permits release once the physician has confirmed an Assessment, and a
 * booking can be completed by the physician while the patient still has the
 * page open from during the consult.
 */
export function shouldPollReleasedArtifacts(status: string | undefined): boolean {
  return status === "in_progress" || status === "completed";
}
