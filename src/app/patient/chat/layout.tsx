/**
 * The React Query client for the patient area lives in `PatientShell`
 * (`/patient/layout.tsx`), which wraps this segment. A second provider here
 * would give chat its own cache for the booking and doctor-summary reads the
 * rest of the patient area already caches — including the very booking the
 * conversation list just read.
 */
export default function PatientChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
