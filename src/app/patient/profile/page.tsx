import { PatientProfileSettings } from "@/features/patient/components/profile/PatientProfileSettings";

/**
 * `/patient/profile` — patient profile & settings (Figma S3).
 *
 * The two editors this page used to hold as tabs now live at
 * `/patient/profile/details` and `/patient/profile/doctor-preferences`, reached from the rows
 * {@link PatientProfileSettings} renders. No new backend route is introduced.
 */
export default function ProfilePage() {
  return <PatientProfileSettings />;
}
