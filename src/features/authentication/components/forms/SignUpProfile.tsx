"use client";

import { Controller, useFormContext } from "react-hook-form";
import type { SignUpRole } from "@/features/authentication/signup-handoff";
import {
  DoctorProfileForm as DoctorProfileSchema,
  PatientProfileForm as PatientProfileSchema,
} from "../../schemas/signup.schema";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  communicationIcons,
  socialShareLogos,
} from "@/components/primitives/icons/SocialShareLogos";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import {
  Building2,
  MapPin,
  ShieldCheck,
  Smile,
  User,
} from "lucide-react";
import {
  DateOfBirthBottomPicker,
  PronounBottomPicker,
  SpecializationBottomPicker,
} from "./SignUpBottomPickers";

interface SignUpProfileProps {
  role: SignUpRole;
  isSubmitting: boolean;
}

const communicationPreferences = {
  ...communicationIcons,
  ...socialShareLogos,
};

export const specializations = [
  "Allergy and Immunology",
  "Anesthesiology",
  "Cardiology",
  "Cardiothoracic Surgery",
  "Critical Care Medicine",
  "Dermatology",
  "Emergency Medicine",
  "Endocrinology",
  "Family Medicine",
  "Gastroenterology",
  "General Surgery",
  "Geriatrics",
  "Hematology",
  "Infectious Disease",
  "Internal Medicine",
  "Nephrology",
  "Neurology",
  "Neurosurgery",
  "Obstetrics and Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedic Surgery",
  "Otolaryngology (ENT)",
  "Pain Medicine",
  "Pathology",
  "Pediatrics",
  "Plastic Surgery",
  "Podiatry",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Rheumatology",
  "Sports Medicine",
  "Surgery - General",
  "Urology",
  "Vascular Surgery",
] as const;

export type ProfileFormDataSchema = PatientProfileSchema | DoctorProfileSchema;

export function SignUpProfile({ role, isSubmitting }: SignUpProfileProps) {
  const { control, watch, setValue } =
    useFormContext<ProfileFormDataSchema>();

  const communicationApps = watch("preferredCommunicationApp") || [];
  const isPatient = role === "patient";
  const isDoctor = role === "doctor";

  return (
    <FieldGroup className="flex flex-col gap-3.5 sm:gap-4 py-1">
      {isPatient && (
        <>
          {/* Full Name */}
          <Controller
            name="fullName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-2">
                <FieldLabel htmlFor={field.name} className="text-sm font-semibold text-foreground">
                  Full Name
                </FieldLabel>
                <div className="relative flex items-center">
                  <User className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
                  <Input
                    {...field}
                    id={field.name}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Juan Dela Cruz"
                    aria-invalid={fieldState.invalid}
                    className="h-11 sm:h-12 pl-10 text-[16px] sm:text-sm rounded-xl"
                  />
                </div>
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          {/* Date of Birth: Custom Mobile Bottom Sheet Modal */}
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-2">
                <FieldLabel className="text-sm font-semibold text-foreground">
                  Date of Birth
                </FieldLabel>
                <DateOfBirthBottomPicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  hasError={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          {/* Address */}
          <Controller
            name="address"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-2">
                <FieldLabel htmlFor={field.name} className="text-sm font-semibold text-foreground">
                  Address
                </FieldLabel>
                <div className="relative flex items-center">
                  <MapPin className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
                  <Input
                    {...field}
                    id={field.name}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="123 Street, City, Province"
                    aria-invalid={fieldState.invalid}
                    className="h-11 sm:h-12 pl-10 text-[16px] sm:text-sm rounded-xl"
                  />
                </div>
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          {/* Preferred Communication Method */}
          <Controller
            name="preferredCommunicationApp"
            control={control}
            render={({ fieldState }) => (
              <Field data-invalid={!!fieldState.invalid} className="gap-2">
                <div className="flex items-center justify-between">
                  <FieldLabel className="text-sm font-semibold text-foreground">
                    Preferred Contact
                  </FieldLabel>
                  <span className="text-[11px] text-muted-foreground">
                    Where doctor contacts you
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full">
                  {Object.entries(communicationPreferences).map(
                    ([key, value]) => {
                      const isChecked = communicationApps.includes(key);
                      return (
                        <Label
                          key={key}
                          className={cn(
                            "flex h-11 sm:h-12 flex-col items-center justify-center gap-1 cursor-pointer rounded-xl border px-1 py-1 text-center transition-all select-none active:scale-[0.98]",
                            isChecked
                              ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs ring-1 ring-primary"
                              : "border-input bg-card text-foreground hover:bg-muted active:bg-muted/80",
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const newApps = checked
                                ? [...communicationApps, key]
                                : communicationApps.filter((a) => a !== key);
                              setValue("preferredCommunicationApp", newApps, {
                                shouldValidate: true,
                              });
                            }}
                            disabled={isSubmitting}
                            aria-invalid={!!fieldState.invalid}
                            className="hidden"
                          />
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center",
                              isChecked && "brightness-0 invert",
                            )}
                          >
                            {value.icon}
                          </span>
                          <span className="text-[10px] sm:text-[11px] leading-none font-medium truncate w-full px-0.5">
                            {value.name}
                          </span>
                        </Label>
                      );
                    },
                  )}
                </div>
                {fieldState.invalid && (
                  <FieldError>{fieldState.error?.message}</FieldError>
                )}
              </Field>
            )}
          />

          {/* Nickname & Pronoun 2-Column Row (Saves full-width row to prevent vertical scrolling) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
            {/* Preferred Name Call */}
            <Controller
              name="preferredNameCall"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-2">
                  <FieldLabel htmlFor={field.name} className="text-sm font-semibold text-foreground truncate">
                    Call Me <span className="font-normal text-muted-foreground text-xs">(Nickname)</span>
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <Smile className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                    <Input
                      {...field}
                      id={field.name}
                      value={field.value || ""}
                      disabled={isSubmitting}
                      placeholder="Nickname"
                      aria-invalid={fieldState.invalid}
                      className="h-11 sm:h-12 pl-9 text-[15px] sm:text-sm rounded-xl"
                    />
                  </div>
                  {fieldState.invalid && (
                    <AnimatedFieldError error={fieldState.error} />
                  )}
                </Field>
              )}
            />

            {/* Pronouns */}
            <Controller
              name="preferredPronoun"
              control={control}
              render={({ field }) => (
                <Field className="gap-2">
                  <FieldLabel className="text-sm font-semibold text-foreground truncate">
                    Pronouns <span className="font-normal text-muted-foreground text-xs">(optional)</span>
                  </FieldLabel>
                  <PronounBottomPicker
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </Field>
              )}
            />
          </div>
        </>
      )}

      {isDoctor && (
        <>
          {/* Full Name */}
          <Controller
            name="fullName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-2">
                <FieldLabel htmlFor={field.name} className="text-sm font-semibold text-foreground">
                  Full Name
                </FieldLabel>
                <div className="relative flex items-center">
                  <User className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
                  <Input
                    {...field}
                    id={field.name}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Dr. Juan Dela Cruz"
                    aria-invalid={fieldState.invalid}
                    className="h-11 sm:h-12 pl-10 text-[16px] sm:text-sm rounded-xl"
                  />
                </div>
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          {/* Specialization & Sub-Specialization 2-Column Row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
            <Controller
              name="specialization"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-2">
                  <FieldLabel className="text-sm font-semibold text-foreground truncate">
                    Specialization
                  </FieldLabel>
                  <SpecializationBottomPicker
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    hasError={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <AnimatedFieldError error={fieldState.error} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="subSpecialization"
              control={control}
              render={({ field }) => (
                <Field className="gap-2">
                  <FieldLabel className="text-sm font-semibold text-foreground truncate">
                    Sub-Specialty <span className="font-normal text-muted-foreground text-xs">(opt)</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="e.g. Pediatric"
                    className="h-11 sm:h-12 text-[15px] sm:text-sm rounded-xl"
                  />
                </Field>
              )}
            />
          </div>

          {/* Clinic Name & Clinic Address 2-Column Row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
            <Controller
              name="clinicName"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-2">
                  <FieldLabel className="text-sm font-semibold text-foreground truncate">
                    Clinic Name <span className="font-normal text-muted-foreground text-xs">(opt)</span>
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <Building2 className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={isSubmitting}
                      placeholder="HealthFirst Clinic"
                      aria-invalid={fieldState.invalid}
                      className="h-11 sm:h-12 pl-9 text-[15px] sm:text-sm rounded-xl"
                    />
                  </div>
                  {fieldState.invalid && (
                    <AnimatedFieldError error={fieldState.error} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="clinicAddress"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-2">
                  <FieldLabel className="text-sm font-semibold text-foreground truncate">
                    Clinic Address <span className="font-normal text-muted-foreground text-xs">(opt)</span>
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <MapPin className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
                    <Input
                      {...field}
                      value={field.value || ""}
                      disabled={isSubmitting}
                      placeholder="456 Medical Plaza"
                      aria-invalid={fieldState.invalid}
                      className="h-11 sm:h-12 pl-9 text-[15px] sm:text-sm rounded-xl"
                    />
                  </div>
                  {fieldState.invalid && (
                    <AnimatedFieldError error={fieldState.error} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* KYC Note */}
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" />
            <span>Doctor verification documents are submitted via KYC after sign-in.</span>
          </div>
        </>
      )}
    </FieldGroup>
  );
}
