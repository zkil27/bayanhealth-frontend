/**
 * The React Query client for the patient area lives in `PatientShell`
 * (`/patient/layout.tsx`), which wraps this segment. A second provider here
 * would give the records subtree its own cache for reads the rest of the
 * patient area already caches.
 */
export default function PatientRecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
