import { ProfileContent } from "@/components/blocks/profile/ProfileContent";
import { ProfileSubPage } from "@/features/patient/components/profile/ProfileSubPage";

/**
 * `/patient/profile/details` — the personal-details editor, formerly the "Profile" tab
 * of `/patient/profile`.
 *
 * `PUT /v1/patients/me/profile` stores every field on this form — name (which is
 * also what the assigned doctor sees on their queue), preferred name, pronoun,
 * date of birth, sex at birth, height, weight, blood type, allergies, and diet —
 * and they survive a reload. `relationships` is the lone exception: the "booking
 * for someone else" flow it belongs to is not shipped, so it stays session-scoped.
 * {@link ProfileContent} and `useProfile` say the same.
 */
export default function ProfileDetailsPage() {
  return (
    <ProfileSubPage title="Personal details">
      <ProfileContent />
    </ProfileSubPage>
  );
}
