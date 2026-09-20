import { DoctorHome } from "@/features/doctor/components/homepage/DoctorHome";

/**
 * Doctor dashboard (`/doctor`).
 *
 * {@link DoctorHome} mirrors the patient home: a rail of identity + the
 * Clinical Command Center hero + today's agenda beside one elevated sheet
 * holding the practice shortcuts and the patient queues, sized to fit one
 * desktop viewport. Recent history lives at `/doctor/history`.
 */
export default function Page() {
  return (
    <section className="flex w-full min-h-0 flex-1 flex-col py-1">
      <DoctorHome />
    </section>
  );
}
