import { CompletedConsultations } from "@/features/doctor/components/consultations/CompletedConsultations";

export default function Page() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full min-w-0 max-w-5xl flex-col gap-5 px-4 pt-2 pb-6 sm:px-6 md:px-8">
      {/* --------------------------------- clinical page header -- */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-(--text-heading)">
            Consultation history
          </h1>
          <p className="text-sm text-(--text-muted)">
            Archive of completed clinical encounters, patient documentation, and post-consultation charts.
          </p>
        </div>
      </div>

      {/* --------------------------------- main consultations view -- */}
      <div className="min-h-0 w-full flex-1">
        <CompletedConsultations />
      </div>
    </div>
  );
}
