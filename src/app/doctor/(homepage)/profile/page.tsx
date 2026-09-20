import { DoctorProfileView } from "@/features/doctor/components/profile/DoctorProfileView";

export default function Page() {
  return (
    <section className="flex h-full w-full flex-col items-center p-2 md:p-4">
      <div className="w-full max-w-4xl">
        <DoctorProfileView />
      </div>
    </section>
  );
}
