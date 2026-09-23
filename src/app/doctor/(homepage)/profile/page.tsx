import { DoctorProfileView } from "@/features/doctor/components/profile/DoctorProfileView";

export default function Page() {
  return (
    <section className="flex h-full w-full flex-col items-center p-2 md:p-4 lg:p-6">
      <div className="w-full max-w-6xl">
        <DoctorProfileView />
      </div>
    </section>
  );
}
