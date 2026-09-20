import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { onDemandBookingSchema } from "../schemas/bookingSchema";

export type BookingFormValues = z.infer<typeof onDemandBookingSchema>;

export function usePatientBookingForm(defaultServiceType?: string | null) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(onDemandBookingSchema),
    defaultValues: {
      serviceType: defaultServiceType || "",
      // "any" (no preference) by default, so the only field the patient must
      // touch is the service — and that is often prefilled from the query param.
      genderPreference: "any",
      languagePreferences: [],
    },
    mode: "onChange",
  });

  const serviceValue = form.watch("serviceType");
  const genderPreference = form.watch("genderPreference");
  const languagePreferences = form.watch("languagePreferences");

  const setServiceValue = (value: string) =>
    form.setValue("serviceType", value);

  return {
    ...form,
    serviceValue,
    setServiceValue,
    genderPreference,
    languagePreferences,
  };
}
