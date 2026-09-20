/**
 * The React Query client the booking detail reads through now lives in
 * `PatientShell` (`/patient/layout.tsx`), which wraps this segment. A second
 * provider here would give this subtree its own cache for the same doctor and
 * intake reads the rest of the patient area already caches.
 */
export default function GetBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
