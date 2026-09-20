"use client";

import { FormProvider } from "react-hook-form";
import { usePatientBookingForm } from "@/features/booking/hooks/usePatientBookingForm";
import { ReactNode } from "react";

export function BookingWrapper({ children }: { children: ReactNode }) {
  const methods = usePatientBookingForm();
  
  return (
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
}