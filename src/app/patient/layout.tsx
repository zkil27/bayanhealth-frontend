import { PatientShell } from "@/features/patient/components/PatientShell";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PatientShell>{children}</PatientShell>;
}
