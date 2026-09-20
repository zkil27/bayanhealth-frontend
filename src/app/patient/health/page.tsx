import { Suspense } from "react";

import { PatientHealthView } from "@/features/patient/components/health/PatientHealthView";

/**
 * `/patient/health` — the Health tab (Figma S2, "My Health").
 *
 * The one Health screen for the patient area, replacing `/patient/records` and
 * `/patient/chart`, which both now redirect here. {@link PatientHealthView} reads
 * the `?tab=` query string to pick its section, so it needs a Suspense boundary
 * (ADR-20260806-02). No new backend route is introduced: every tab composes
 * already-contracted, patient-scoped reads — `GET /v1/bookings`,
 * `GET /v1/patients/me/chart`, `/medications`, `/follow-ups`, `/lab-orders`
 * and `/patient/profile` among them.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PatientHealthView />
    </Suspense>
  );
}
