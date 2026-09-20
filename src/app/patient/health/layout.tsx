/**
 * The React Query client for the patient area lives in `PatientShell`
 * (`/patient/layout.tsx`), which wraps this segment. A second provider here
 * would give Health its own cache for the doctor-summary and chart reads the
 * rest of the patient area already caches.
 */
export default function PatientHealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
