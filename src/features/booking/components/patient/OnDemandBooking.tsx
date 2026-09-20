"use client";

import {
  ArrowRight,
  ClipboardCheck,
  Stethoscope,
  UserCog,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, FormProvider } from "react-hook-form";
import { BookingNavBar } from "../BookingNavBar";
import { BookingServiceSelect } from "../BookingServiceSelect";
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
import ToastForTesting from "@/components/primitives/ToastForTesting";

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
  const { submit, status, error } = useCreateBooking();
  const form = usePatientBookingForm(defaultServiceType);

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = form;

  const isLoading =
    isSubmitting || form.formState.isSubmitSuccessful || status === "submitting";

  useEffect(() => {
    if (status === "error" && error) {
      ToastForTesting({
        description: "Please check your information and try again.",
        duration: 5000,
      });
    }
  }, [status, error]);

  const onSubmit = async (data: BookingFormValues) => {
    if (isLoading) return;

    // This is the on-demand route (`/patient/booking/createBooking`, no doctor chosen):
    // the request is broadcast to the consult-approved pool once paid and the
    // first doctor to accept is assigned. Stated explicitly because the backend
    // defaults an absent mode to `scheduled` — which is what silently happened
    // here before, leaving the pool empty and the waiting screen unreachable.
    const createdBooking = await submit({
      serviceValue: data.serviceType,
      bookingMode: "on_demand",
    });
    router.push(`/patient/booking/getBooking/${createdBooking.bookingId}`);
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-6 px-4 py-3 lg:grid-cols-12"
      >
        <div className="lg:col-span-12">
          <BookingNavBar
            header="Konsulta Ngayon (Consult Now)"
            subtitle="Walang appointment na kailangan. Unang available na lisensyadong doktor ang titingin sa'yo."
            backHref="/patient/booking"
            badge={
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-(--radius-pill) bg-(--surface-accent-soft) px-2.5 py-1 text-[12px] font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
                <Zap className="size-3.5" aria-hidden />
                On-Demand Intake · Pinakamabilis
              </span>
            }
          />
        </div>

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
          <p className="rounded-(--radius-md) border border-(--status-available-fg)/20 bg-(--surface-accent-soft) p-3 text-[12.5px] leading-[1.5] text-(--status-available-fg)">
            <span className="font-semibold">⚡ {ON_DEMAND_WAIT_ESTIMATE}.</span>{" "}
            Susuriin muna ng doktor ang iyong profile at mga iniulat na sintomas bago ka papasukin sa consultation room.
          </p>
        </div>

        {/* Right: fee summary + action, kept in view as the left column scrolls. */}
        <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-6">
          <div className="space-y-3">
            <BookingSummary />
            <BrandCtaButton
              type="submit"
              disabled={!isValid || isSubmitting || isLoading}
            >
              {isSubmitting ? "Pumapasok sa queue…" : "Kumpirmahin at pumasok sa queue"}
              <ArrowRight className="size-4.5" />
            </BrandCtaButton>
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
    </FormProvider>
  );
}
