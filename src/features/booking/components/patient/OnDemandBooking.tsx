"use client";

import {
  ArrowRight,
  ClipboardCheck,
  LogIn,
  Stethoscope,
  UserCog,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, FormProvider } from "react-hook-form";
import { BookingServiceSelect } from "../BookingServiceSelect";
import { PatientPageHeader } from "@/features/patient/components/PatientPageHeader";
import { BookingSummary } from "../BookingSummary";
import { BrandCtaButton, EmergencyNote } from "../BrandUI";
import { ON_DEMAND_WAIT_ESTIMATE } from "../../constants/bookingConstants";
import { DoctorPreferences } from "./DoctorPreferences";
import {
  usePatientBookingForm,
  type BookingFormValues,
} from "../../hooks/usePatientBookingForm";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { useCreateBooking } from "../../hooks/useCreateBooking";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIdToken } from "@/stores/useAuthStore";
import ToastForTesting from "@/components/primitives/ToastForTesting";
import { setActiveConsultation } from "@/lib/patient/activeConsultationStorage";

interface OnDemandBookingProps {
  defaultServiceType?: string | null;
}

const groupLabel =
  "flex items-center gap-2 text-[15px] font-semibold text-(--text-heading)";

const cardClass =
  "rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-5 shadow-(--shadow-card)";

/**
 * `/patient/booking/createBooking` — the on-demand intake form.
 *
 * Laid out as two columns from `lg` up: the patient's clinical preferences on
 * the left, an always-visible fee summary and the submit action on the right.
 * The single narrow centred card this replaced ran the service select, both
 * preference rows, the fee panel and the CTA down one column, which overflowed
 * a 1080p viewport and pushed the button below the fold. The two-column split
 * keeps every field and the price on screen together at 100% zoom.
 */
export function OnDemandBooking({ defaultServiceType }: OnDemandBookingProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { submit, status, error } = useCreateBooking();
  const idToken = useIdToken();
  const form = usePatientBookingForm(defaultServiceType);

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = form;

  const isLoading =
    isSubmitting || form.formState.isSubmitSuccessful || status === "submitting";

  useEffect(() => {
    if (status === "error" && error && error.code !== "AUTH_REQUIRED") {
      ToastForTesting({
        description: "Please check your information and try again.",
        duration: 5000,
      });
    }
  }, [status, error]);

  const onSubmit = async (data: BookingFormValues) => {
    if (isLoading) return;

    if (!idToken) {
      router.push(`/signIn?next=${encodeURIComponent("/patient/booking/createBooking")}`);
      return;
    }

    try {
      // This is the on-demand route (`/patient/booking/createBooking`, no doctor chosen):
      // the request is broadcast to the consult-approved pool once paid and the
      // first doctor to accept is assigned. Stated explicitly because the backend
      // defaults an absent mode to `scheduled` — which is what silently happened
      // here before, leaving the pool empty and the waiting screen unreachable.
      const createdBooking = await submit({
        serviceValue: data.serviceType,
        bookingMode: "on_demand",
      });
      setActiveConsultation({
        bookingId: createdBooking.bookingId,
        stage: "waiting_queue",
        serviceType: data.serviceType,
        status: createdBooking.status ?? "pending_payment",
      });
      void queryClient.invalidateQueries({ queryKey: ["patient-home-bookings"] });
      router.push(`/patient/booking/getBooking/${createdBooking.bookingId}`);
    } catch {
      // useCreateBooking sets status="error" and surfaces code/message.
      // Handled here so unhandled promise rejections do not trigger the Next.js runtime error overlay.
    }
  };

  return (
    <FormProvider {...form}>
      <div className="flex min-h-full w-full flex-col justify-start">
        <PatientPageHeader
          title="Konsulta Ngayon (Consult Now)"
          backHref="/patient/booking"
        />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-6 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:pb-12 md:px-8 lg:grid-cols-12 lg:mx-0 lg:pl-[18rem] lg:pr-8 lg:max-w-none lg:pb-8"
        >

        {/* Left: clinical preferences. */}
        <div className={`${cardClass} space-y-4 lg:col-span-7`}>
          <Controller
            name="serviceType"
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <span className={groupLabel}>
                  <Stethoscope className="size-5 text-(--status-available-fg)" />
                  Ano ang kailangan mo? (Consultation service)
                </span>
                <BookingServiceSelect
                  value={field.value}
                  onChange={field.onChange}
                  triggerWidth="w-full"
                />
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </div>
            )}
          />

          <div className="flex flex-col gap-3 border-t border-(--border-subtle) pt-4">
            <span className={groupLabel}>
              <UserCog className="size-5 text-(--status-available-fg)" />
              May gusto ka bang doktor? (Doctor preferences)
            </span>
            <DoctorPreferences compact />
            <p className="text-[12px] text-(--text-muted)">
              Soft preference lamang ito — kung walang tumugmang doktor agad, ang unang available na lisensyadong manggagamot ang titingin sa&apos;yo.
            </p>
          </div>

          {/* What "on-demand" actually means, stated where the patient reads it
              before committing — the doctor sees the intake first. */}
          <div className="flex items-start gap-2.5 rounded-(--radius-md) border border-(--status-available-fg)/20 bg-(--surface-accent-soft) p-3 text-[12.5px] leading-[1.5] text-(--status-available-fg)">
            <Zap className="size-4 shrink-0 mt-0.5 text-(--status-available-fg)" />
            <span>
              <span className="font-semibold">{ON_DEMAND_WAIT_ESTIMATE}.</span>{" "}
              Susuriin muna ng doktor ang iyong profile at mga iniulat na sintomas bago ka papasukin sa consultation room.
            </span>
          </div>
        </div>

        {/* Right: fee summary + action, kept in view as the left column scrolls. */}
        <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-6">
          <div className="space-y-3">
            <BookingSummary />
            {!idToken && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 flex items-start gap-2.5">
                <LogIn className="size-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Sign in required</p>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    You must be signed in to confirm and join the consult queue. Submitting will take you to sign in.
                  </p>
                </div>
              </div>
            )}
            <BrandCtaButton
              type="submit"
              disabled={!isValid || isSubmitting || isLoading}
            >
              {isSubmitting ? "Pumapasok sa queue…" : "Kumpirmahin at pumasok sa queue"}
              <ArrowRight className="size-4.5" />
            </BrandCtaButton>
            {error && (
              <p
                role="alert"
                className="mt-1 text-center text-xs font-semibold text-destructive"
              >
                {error.message}
              </p>
            )}
          </div>

          <div className="rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-sunken) p-3 text-[12.5px] leading-[1.5] text-(--text-muted)">
            <p className="flex items-center gap-1.5 font-semibold text-(--text-body)">
              <ClipboardCheck className="size-3.5 shrink-0" aria-hidden />
              Ihanda bago ang tawag (Prepare for call)
            </p>
            <p className="mt-1">
              Mga larawan ng nakaraang laboratory results o lumang reseta · tala kung ilang araw na ang sintomas · tahimik at maliwanag na lugar.
            </p>
          </div>

          <EmergencyNote />
        </div>
      </form>
      </div>
    </FormProvider>
  );
}
