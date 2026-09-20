import z from "zod";

export const onDemandBookingSchema = z.object({
  serviceType: z.string().min(1, "Please select a service"),
  // Single-select in the redesigned O1 screen: the patient picks one of
  // Any / Female / Male. Defaults to "any" (no preference), so this only
  // rejects an empty string, never a deliberate "no preference".
  genderPreference: z.string().min(1, "Please choose a doctor gender preference"),
  // Optional: an empty array means "any language". Bilingual patients otherwise
  // had to name a language they did not actually care about, which narrowed the
  // doctor pool for no reason.
  languagePreferences: z.array(z.string()),
});

export const DoctorBookingSchema = z.discriminatedUnion("bookingType", [
  z.object({
    bookingType: z.literal("regular"),
    serviceType: z.string().min(1, "Please select a service"),
    scheduledDate: z.undefined().optional(),
    genderPreference: z.array(z.string()).optional(),
    languagePreference: z.array(z.string()).optional(),
  }),
  z.object({
    bookingType: z.literal("scheduled"),
    serviceType: z.string().min(1, "Please select a service"),
    scheduledDate: z.date("Please select a date and time"),
    genderPreference: z.array(z.string()).optional(),
    languagePreference: z.array(z.string()).optional(),
  }),
]);

export type DoctorBookingFormValues = z.infer<typeof DoctorBookingSchema>;
