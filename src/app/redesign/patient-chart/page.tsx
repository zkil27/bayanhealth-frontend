import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QueryClientProviders } from "@/components/blocks/Providers";
import { PatientChartPreview } from "@/features/consultation/components/patientHistory/PatientChartPreview";

export const metadata: Metadata = {
  title: "Patient chart preview — BayanHealth",
};

/**
 * Design preview of the versioned patient chart as the doctor queue shows it
 * (row chip + "Past medical history" drawer tab), on the demo charts. The live
 * queue only lists backend bookings, so this is where reviewers can see a
 * returning patient (Ramon, v1 → v2) beside a first consult (Manuel). Not
 * linked from navigation; reach it at `/redesign/patient-chart`.
 */
export default function PatientChartPreviewPage() {
  // Design scaffolding only — never exposed in the production build.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen w-full bg-(--surface-sunken) px-4 py-10 text-(--text-body) sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-bold text-(--text-heading)">Patient chart in the queue</h1>
          <p className="mt-2 text-(--text-muted)">
            Accepted bookings show whether the patient already has a chart. The drawer&apos;s second tab opens the
            latest version with its changes from the one before. Demo data only.
          </p>
        </header>
        <QueryClientProviders>
          <PatientChartPreview />
        </QueryClientProviders>
      </div>
    </main>
  );
}
