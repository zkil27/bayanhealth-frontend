import { CompletedConsultations } from "@/features/doctor/components/consultations/CompletedConsultations";

export default function Page() {
  return (
    <section className="flex h-full w-full flex-col items-center p-2 md:p-4">
      <div className="flex w-full max-w-3xl flex-col gap-5">
        <h1 className="font-display text-2xl font-bold text-(--text-heading)">
          Consultation history
        </h1>
        <CompletedConsultations />
      </div>
    </section>
  );
}
