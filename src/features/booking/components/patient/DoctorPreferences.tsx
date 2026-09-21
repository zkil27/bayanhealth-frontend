"use client";

import { Controller, useFormContext } from "react-hook-form";
import { GenderPreference } from "../GenderPreference";
import { LanguageSelect } from "../LanguageSelect";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { cn } from "@/lib/utils";
import { DoctorPreferencesType } from "../../types/booking.types";

interface DoctorPreferencesProps {
  readOnly?: boolean;
  data?: DoctorPreferencesType;
  /**
   * Use tighter vertical spacing (gap-1.5) for the on-demand intake screen,
   * keeping labels and pills uniformly stacked and aligned across rows.
   */
  compact?: boolean;
}

const fieldLabel = "text-[14px] font-medium text-(--text-body)";

export function DoctorPreferences({
  readOnly,
  data,
  compact,
}: DoctorPreferencesProps) {
  const { control } = useFormContext();

  if (readOnly && data) {
    return <ReadOnlyDoctorPreferencesSection data={data} />;
  }

  const rowClass = compact
    ? "flex flex-col gap-1.5"
    : "flex flex-col gap-2";
  const labelClass = fieldLabel;

  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4")}>
      <Controller
        name="genderPreference"
        control={control}
        render={({ field, fieldState }) => (
          <div className={rowClass}>
            <span className={labelClass}>Doctor gender</span>
            <GenderPreference
              value={field.value || ""}
              onSelect={field.onChange}
            />
            {fieldState.error && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </div>
        )}
      />

      <Controller
        name="languagePreferences"
        control={control}
        render={({ field, fieldState }) => (
          <div className={rowClass}>
            <span className={labelClass}>Language</span>
            <LanguageSelect
              selectedLanguages={field.value || []}
              onChange={field.onChange}
            />
            {fieldState.error && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </div>
        )}
      />

      {/*
        The "these are soft preferences — the first available doctor who
        accepts will take your consultation" note used to sit here. The intake
        screen now states that at the top, where the patient reads it before
        filling anything in, so repeating it under the pills was the same
        sentence twice on one screen.
      */}
    </div>
  );
}

interface ReadOnlyDoctorPreferencesSectionProps {
  data: DoctorPreferencesType;
}

export function ReadOnlyDoctorPreferencesSection({
  data,
}: ReadOnlyDoctorPreferencesSectionProps) {
  const items = [
    {
      label: "Doctor Gender",
      value: data?.genderPreferences?.length
        ? data.genderPreferences.join(" • ")
        : null,
    },
    {
      label: "Language",
      value: data?.languagePreferences?.length
        ? data.languagePreferences.join(" • ")
        : null,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-card) p-3"
        >
          <p className="text-[10px] tracking-wider text-(--text-subtle) uppercase">
            {item.label}
          </p>
          <p
            className={
              item.value
                ? "text-xs font-medium text-(--text-body) capitalize"
                : "text-xs text-(--text-subtle) italic"
            }
          >
            {item.value ?? `No ${item.label.toLowerCase()} set`}
          </p>
        </div>
      ))}
    </div>
  );
}
