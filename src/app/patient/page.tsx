import { PatientHome } from "@/features/patient/components/homepage/PatientHome";

/**
 * Patient home (`/patient`).
 *
 * {@link PatientHome} renders a rail of identity + primary action beside one
 * elevated canvas sheet (services · Care Recovery Roadmap · clinical protocols +
 * daily tip), with the emergency guardrail docked full-width beneath. One read
 * backs it — `GET /v1/bookings` — plus per-block reads for the released
 * education, medication and follow-up lines the roadmap draws from. No new
 * backend route is introduced; the services ribbon is static navigation into the
 * existing on-demand booking flow.
 */
export default function Page() {
  return (
    <section className="flex w-full min-h-0 flex-1 flex-col">
      <PatientHome />
    </section>
  );
}
