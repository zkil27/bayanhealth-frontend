import z from "zod";

export const basePersonalDetailsSchema = z.object({
  forWhom: z.enum(["self", "other"]).optional(),
  relationship: z.string().optional(),
  name: z.string().optional(),
  preferredName: z.string().optional(),
  preferredPronoun: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  genderAtBirth: z.enum(["male", "female", "prefer not to say"]),
  weight: z.string().min(1, "Weight is required"),
  height: z.string().min(1, "Height is required"),
  bloodType: z.string().optional(),
  allergens: z.array(z.string()).default([]).optional(),
  otherAllergens: z.string().optional(),
  diet: z.array(z.string()).default([]).optional(),
});

export const userPersonalDetailsSchema = basePersonalDetailsSchema.extend({
  forWhom: z.enum(["self", "other"]).optional(),
  relationship: z.string().optional(),
});

export const userDoctorPreferencesSchema = z.object({
  genderPreferences: z.array(z.string()).optional(),
  languagePreferences: z.array(z.string()).optional(),
});

export const profileSchema = basePersonalDetailsSchema;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type UserDoctorPreferencesValues = z.infer<typeof userDoctorPreferencesSchema>;