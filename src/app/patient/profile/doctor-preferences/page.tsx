import { DoctorPreferencesContent } from "@/components/blocks/profile/DoctorPreferencesContent";
import { ProfileSubPage } from "@/features/patient/components/profile/ProfileSubPage";

/**
 * `/patient/profile/doctor-preferences` — the doctor-preference editor, formerly the
 * second tab of `/patient/profile`.
 *
 * An unstated preference stays empty: the booking matcher reads an empty
 * preference as "no preference", which is the correct reading of silence.
 * {@link DoctorPreferencesContent} owns that rule and its own persistence
 * disclosure.
 */
export default function DoctorPreferencesPage() {
  return (
    <ProfileSubPage title="Doctor preferences">
      <DoctorPreferencesContent />
    </ProfileSubPage>
  );
}
