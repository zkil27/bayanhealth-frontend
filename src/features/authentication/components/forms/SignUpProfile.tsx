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
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  communicationIcons,
  socialShareLogos,
} from "@/components/primitives/icons/SocialShareLogos";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { DatePicker } from "@/features/booking/components/DateTimePicker";
import { format } from "date-fns";
import { Cake, Stethoscope, UserCog } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/features/booking/components/FormSection";

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
    <FieldGroup className="flex flex-col gap-3">
      <p className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
        Profile details entered here are kept only while you complete signup.
        Account creation submits only your email, password, and selected role.
      </p>
      <Controller
        name="fullName"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
            <Input
              {...field}
              id={field.name}
              value={field.value || ""}
              disabled={isSubmitting}
              placeholder="Juan Dela Cruz"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />

      {isPatient && (
        <>
          <Controller
            name={`dateOfBirth`}
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Date of Birth</FieldLabel>
                <DatePicker
                  date={field.value}
                  onDateChange={(date) =>
                    field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                  }
                  minDate={new Date("1900-01-01")}
                  maxDate={new Date()}
                  icon={Cake}
                />
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          <Controller
            name="address"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Address</FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  value={field.value || ""}
                  rows={2}
                  disabled={isSubmitting}
                  placeholder="123 Street, City, Province"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />
        </>
      )}

      {isDoctor && (
        <>
          <FormSection
            title="Doctor"
            icon={<Stethoscope className="size-4" />}
          />
          <Controller
            name="specialization"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Specialization</FieldLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select Specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {specializations.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Field>
                <FieldLabel>Sub-Specialization (optional)</FieldLabel>
                <Input
                  {...field}
                  value={field.value || ""}
                  disabled={isSubmitting}
                  placeholder="e.g., Pediatric Cardiology"
                />
              </Field>
            )}
          />

          <Controller
            name="clinicName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Clinic Name (optional)</FieldLabel>
                <Input
                  {...field}
                  value={field.value || ""}
                  disabled={isSubmitting}
                  placeholder="HealthFirst Clinic"
                  aria-invalid={fieldState.invalid}
                />
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
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Clinic Address (optional)</FieldLabel>
                <Textarea
                  {...field}
                  rows={2}
                  disabled={isSubmitting}
                  placeholder="456 Medical Plaza, City"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            Doctor verification documents are not collected or uploaded during
            account creation. After email confirmation and sign-in, submit them
            through the Doctor Verification/KYC flow.
          </div>
        </>
      )}

      {isPatient && (
        <>
          <FormSection
            title="Preferences"
            icon={<UserCog className="size-4" />}
          />

          <Controller
            name="preferredCommunicationApp"
            control={control}
            render={({ fieldState }) => (
              <Field data-invalid={!!fieldState.invalid}>
                <FieldLabel>Preferred Communication Method</FieldLabel>
                <FieldDescription>
                  Let your Doctor know where to contact you
                </FieldDescription>
                <ScrollArea className="w-full">
                  <div className="flex h-fit items-center justify-start gap-3 pb-2">
                    {Object.entries(communicationPreferences).map(
                      ([key, value]) => {
                        const isChecked = communicationApps.includes(key);
                        return (
                          <Label
                            key={key}
                            className={cn(
                              "flex min-w-18 cursor-pointer flex-col items-center rounded-md border p-2 transition-all duration-300",
                              isChecked &&
                                "translate-y-1 bg-primary text-primary-foreground",
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
                                "rounded-full bg-muted p-1",
                                isChecked && "text-primary",
                              )}
                            >
                              {value.icon}
                            </span>
                            <span className="text-xs leading-none font-medium">
                              {value.name}
                            </span>
                          </Label>
                        );
                      },
                    )}
                  </div>
                </ScrollArea>
                {fieldState.invalid && (
                  <FieldError>{fieldState.error?.message}</FieldError>
                )}
              </Field>
            )}
          />

          <Controller
            name="preferredNameCall"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Preferred Name Call</FieldLabel>
                <Input
                  {...field}
                  value={field.value || ""}
                  disabled={isSubmitting}
                  placeholder="How should we call you?"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />
          <Controller
            name="preferredPronoun"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Preffered Pronoun</FieldLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select pronoun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="he/him">He/Him</SelectItem>
                    <SelectItem value="she/her">She/Her</SelectItem>
                    <SelectItem value="they/them">They/Them</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </>
      )}
    </FieldGroup>
  );
}
