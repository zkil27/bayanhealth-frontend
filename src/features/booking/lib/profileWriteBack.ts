/**
 * Which intake answers to copy back to the patient's saved profile on submit
 * (pilot feedback: "save allergies for future consultations").
 *
 * Logic change: the intake now writes allergies back through the existing
 * `PUT /v1/patients/me/profile` (`useProfile().updateProfile`). No new
 * endpoint or field. Only for an intake about the patient themselves, only
 * when they kept "Save to my profile" ticked, and only when the answer differs
 * from what the profile already holds. The endpoint requires a name, so a
 * profile without one is left alone rather than failing the submit.
 */

export interface AllergyAnswer {
  forWhom?: string;
  allergens?: string[];
  otherAllergens?: string;
}

export interface ProfileAllergies {
  name?: string;
  allergens?: string[];
  otherAllergens?: string;
}

const sameSet = (a: readonly string[], b: readonly string[]) => {
  if (a.length !== b.length) return false;
  const left = [...a].map((item) => item.toLowerCase()).sort();
  const right = [...b].map((item) => item.toLowerCase()).sort();
  return left.every((item, index) => item === right[index]);
};

export function allergyWriteBack(
  answer: AllergyAnswer,
  profile: ProfileAllergies | null | undefined,
  optedIn: boolean,
): { allergens: string[]; otherAllergens: string } | null {
  if (!optedIn || !profile) return null;
  if ((answer.forWhom ?? "self") !== "self") return null;
  if (!profile.name?.trim()) return null;
  const allergens = answer.allergens ?? [];
  // Blank means "not answered"; it must never clear a saved allergy list.
  if (allergens.length === 0) return null;
  const otherAllergens = answer.otherAllergens ?? "";
  const unchanged = sameSet(allergens, profile.allergens ?? []) && otherAllergens.trim() === (profile.otherAllergens ?? "").trim();
  return unchanged ? null : { allergens, otherAllergens };
}
