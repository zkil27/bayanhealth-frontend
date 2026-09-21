"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  User,
  Users,
  Ruler,
  Weight,
  Droplet,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
} from "lucide-react";
import { CustomBottomModal } from "@/components/ui/custom-bottom-modal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "../../../features/booking/components/DateTimePicker";
import { format } from "date-fns";
import { AllergenField } from "../../../features/booking/components/consultation/intake/AllergenField";
import { DietaryField } from "../../../features/booking/components/consultation/intake/DietaryField";
import { PersonDataRelationshipSection } from "../../../features/booking/components/consultation/intake/OtherRelationshipField";
import {
  type DynamicIntakeFormValues,
} from "@/features/booking/schemas/intakeSchema";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { FormSection } from "../../../features/booking/components/FormSection";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/tiptap-utils";

const GENDER_OPTIONS = ["male", "female", "prefer not to say"] as const;

const BLOOD_TYPE_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

interface BloodTypePickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function BloodTypePicker({ value, onChange, disabled }: BloodTypePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-12 sm:h-12.5 w-full cursor-pointer items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3.5 text-left text-sm sm:text-base font-medium transition-colors active:scale-[0.99] shadow-xs",
          "hover:bg-(--surface-canvas) focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 outline-none",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Droplet className="size-4.5 shrink-0 text-(--action-primary)" />
          <span
            className={cn(
              "text-sm sm:text-base font-medium truncate",
              !value && "text-muted-foreground",
            )}
          >
            {value ? `${value} Type` : "Select blood"}
          </span>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground ml-1" />
      </button>

      <CustomBottomModal
        open={open}
        onOpenChange={setOpen}
        title="Select Blood Type"
        description="Choose your ABO and Rh blood group"
      >
        <div className="space-y-3.5 pb-2">
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3 py-1">
            {BLOOD_TYPE_OPTIONS.map((type) => {
              const isSelected = value === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onChange(type);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-14 sm:h-15 flex-col items-center justify-center rounded-xl border text-base font-bold transition-all active:scale-[0.96] cursor-pointer",
                    isSelected
                      ? "border-(--action-primary) bg-(--teal-100) text-(--teal-800) shadow-xs ring-1 ring-(--action-primary)"
                      : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:bg-(--surface-canvas)",
                  )}
                >
                  <span>{type}</span>
                  {isSelected && <Check className="size-3.5 text-(--action-primary) mt-0.5" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-card) text-sm sm:text-base font-medium text-(--text-body) hover:bg-(--surface-canvas)"
          >
            Cancel
          </button>
        </div>
      </CustomBottomModal>
    </>
  );
}

interface GenderPickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function GenderPicker({ value, onChange, disabled }: GenderPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-12 sm:h-12.5 w-full cursor-pointer items-center justify-between rounded-xl border border-(--border-default) bg-(--surface-card) px-3.5 text-left text-sm sm:text-base font-medium transition-colors active:scale-[0.99] shadow-xs",
          "hover:bg-(--surface-canvas) focus-visible:border-(--action-primary) focus-visible:ring-2 focus-visible:ring-(--focus-ring)/30 outline-none",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "text-sm sm:text-base font-medium capitalize truncate",
            !value && "text-muted-foreground",
          )}
        >
          {value || "Select sex"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground ml-1" />
      </button>

      <CustomBottomModal
        open={open}
        onOpenChange={setOpen}
        title="Select Sex at Birth"
        description="Choose your biological sex assigned at birth"
      >
        <div className="space-y-2 pb-2">
          {GENDER_OPTIONS.map((option) => {
            const isSelected = value?.toLowerCase() === option.toLowerCase();
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-14 sm:h-15 w-full items-center justify-between rounded-xl border px-4 text-base font-semibold capitalize transition-all active:scale-[0.98] cursor-pointer",
                  isSelected
                    ? "border-(--action-primary) bg-(--teal-100) text-(--teal-800) shadow-xs ring-1 ring-(--action-primary)"
                    : "border-(--border-default) bg-(--surface-card) text-(--text-body) hover:bg-(--surface-canvas)",
                )}
              >
                <span>{option}</span>
                {isSelected && (
                  <Check className="size-5 text-(--action-primary)" />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-(--border-default) bg-(--surface-card) text-sm sm:text-base font-medium text-(--text-body) hover:bg-(--surface-canvas) mt-2"
          >
            Cancel
          </button>
        </div>
      </CustomBottomModal>
    </>
  );
}

const WEIGHT_HEIGHT_OPTIONS = [
  {
    name: "weight" as const,
    label: "Weight (kg)",
    icon: Weight,
    placeholder: "e.g., 70",
    step: "0.1",
  },
  {
    name: "height" as const,
    label: "Height (cm)",
    icon: Ruler,
    placeholder: "e.g., 175",
  },
];

const OTHERS_ICONS = <Users className="size-4" />;

interface PersonDataSectionProps {
  userProfile: any;
  readOnly?: boolean;
  mode: "profile" | "booking";
}

export function PersonDataSection({
  userProfile,
  readOnly = false,
  mode,
}: PersonDataSectionProps) {
  const {
    control,
    watch,
    setValue,
    getValues,
  } = useFormContext();
  const prefix = mode === "booking" ? "personalDetails." : "";

  const forWhom = watch(`${prefix}forWhom`);
  const relationship = watch(`${prefix}relationship`);
  const hasValidRelationship = !!(relationship && relationship !== "");

  const RELATIONSHIP_OPTIONS = userProfile?.relationships || [];

  const populateSelfData = useCallback(() => {
    if (!userProfile) return;

    const fields = [
      "name",
      "preferredName",
      "preferredPronoun",
      "dateOfBirth",
      "genderAtBirth",
      "weight",
      "height",
      "bloodType",
      "allergens",
      "otherAllergens",
      "diet",
    ];

    fields.forEach((field) => {
      const value = userProfile[field as keyof typeof userProfile];
      setValue(`${prefix}${field}`, value ?? "");
    });

    setValue(`${prefix}relationship`, "");
  }, [setValue, userProfile, prefix]);

  // Initialize on mount
  useEffect(() => {
    if (readOnly || !userProfile) return;

    const currentForWhom = getValues(`${prefix}forWhom`);
    const currentName = getValues(`${prefix}name`);

    if (!currentForWhom || !currentName) {
      setValue(`${prefix}forWhom`, "self");
      populateSelfData();
    }
  }, [getValues, setValue, populateSelfData, readOnly, userProfile, prefix]);

  // Handle forWhom changes
  useEffect(() => {
    if (readOnly || !userProfile) return;

    if (forWhom === "self") {
      const currentName = getValues(`${prefix}name`);
      const profileName = String(userProfile.name ?? "").trim();
      // Re-seed only when there is nothing in the field, or when the profile
      // actually holds a name to re-seed from (switching the form back to
      // "myself" after it held a dependent's details). The profile now starts
      // with an empty name, and without the `profileName` guard every stored
      // profile would look "out of sync" with whatever the patient had just
      // typed — so this effect would clear their own name back out from under
      // them on the next render that changed its dependencies.
      if (!currentName || (profileName && currentName !== profileName)) {
        populateSelfData();
      }
    }
  }, [forWhom, getValues, populateSelfData, readOnly, userProfile, prefix]);

  // Handle relationship changes
  useEffect(() => {
    if (readOnly || !userProfile) return;
    if (!relationship) return;

    if (relationship !== "other") {
      const selectedRelation = RELATIONSHIP_OPTIONS.find(
        (opt: any) => opt.value === relationship,
      );
      if (selectedRelation?.data) {
        const personData = selectedRelation.data;
        const fields = [
          "name",
          "preferredName",
          "preferredPronoun",
          "dateOfBirth",
          "genderAtBirth",
          "weight",
          "height",
          "allergens",
          "otherAllergens",
          "diet",
        ];

        fields.forEach((field) => {
          const value = personData[field as keyof typeof personData];
          setValue(`${prefix}${field}`, value ?? "");
        });
      }
    } else {
      setValue(`${prefix}name`, "");
      setValue(`${prefix}preferredName`, "");
      setValue(`${prefix}preferredPronoun`, "");
      setValue(`${prefix}dateOfBirth`, "");
      setValue(`${prefix}genderAtBirth`, "prefer not to say");
      setValue(`${prefix}weight`, "");
      setValue(`${prefix}height`, "");
      setValue(`${prefix}bloodType`, "");
      setValue(`${prefix}allergens`, []);
      setValue(`${prefix}otherAllergens`, "");
      setValue(`${prefix}diet`, []);
    }
  }, [
    relationship,
    setValue,
    readOnly,
    userProfile,
    RELATIONSHIP_OPTIONS,
    prefix,
  ]);

  if (readOnly) {
    const data = watch();
    const personalData = mode === "booking" ? data.personalDetails : data;
    return <ReadOnlyPersonDataSection data={personalData} />;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <FieldSet className="space-y-2">
        {mode == "booking" && (
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            <FieldLegend className="text-sm sm:text-base font-bold text-(--text-heading) tracking-tight">
              Who is this for?
            </FieldLegend>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Select patient
            </span>
          </div>
        )}

        <FieldGroup>
          <Controller
            name={`${prefix}forWhom`}
            control={control}
            render={({ field }) => (
              <Field>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value ?? "self"}
                  className="grid grid-cols-2 gap-2.5 sm:gap-3"
                >
                  <Label
                    htmlFor="for-whom-self"
                    className={cn(
                      "group relative flex flex-col justify-between rounded-2xl border p-3 sm:p-3.5 transition-all active:scale-[0.99] select-none cursor-pointer min-h-[84px] sm:min-h-[92px]",
                      (field.value ?? "self") === "self"
                        ? "border-(--action-primary) bg-(--teal-100)/25 ring-1 ring-(--action-primary)/40 shadow-xs"
                        : "border-(--border-default) bg-(--surface-card) hover:bg-(--surface-canvas)",
                    )}
                  >
                    <RadioGroupItem
                      value="self"
                      id="for-whom-self"
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cn(
                          "flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                          (field.value ?? "self") === "self"
                            ? "bg-(--teal-100) text-(--teal-800)"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <User className="size-4 sm:size-4.5" />
                      </div>
                      {(field.value ?? "self") === "self" ? (
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-(--action-primary) text-white">
                          <Check className="size-3.5" strokeWidth={3} />
                        </div>
                      ) : null}
                    </div>
                    <div className="w-full mt-2 sm:mt-2.5">
                      <span className="block text-sm sm:text-base font-bold text-(--text-heading) leading-tight">
                        Myself
                      </span>
                      <span className="block text-xs text-muted-foreground leading-tight mt-0.5">
                        Account owner
                      </span>
                    </div>
                  </Label>

                  <div className="relative flex flex-col justify-between rounded-2xl border border-dashed border-(--border-default) bg-(--ink-050)/50 p-3 sm:p-3.5 opacity-60 select-none cursor-not-allowed min-h-[84px] sm:min-h-[92px]">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Users className="size-4 sm:size-4.5" />
                      </div>
                      <span className="shrink-0 rounded-md bg-(--gold-100) px-1.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-(--gold-700)">
                        Soon
                      </span>
                    </div>
                    <div className="w-full mt-2 sm:mt-2.5">
                      <span className="block text-sm sm:text-base font-medium text-muted-foreground leading-tight">
                        Dependent
                      </span>
                      <span className="block text-xs text-muted-foreground leading-tight mt-0.5">
                        Family member
                      </span>
                    </div>
                  </div>
                </RadioGroup>
              </Field>
            )}
          />
          {forWhom === "other" && (
            <div className="flex animate-in flex-col gap-1 duration-300 fade-in slide-in-from-top-2">
              <FormSection icon={OTHERS_ICONS} title="Identity" />
              <Controller
                name={`${prefix}relationship`}
                control={control}
                render={({ field }) => (
                  <PersonDataRelationshipSection
                    value={field.value || ""}
                    onChange={field.onChange}
                    relationshipOptions={RELATIONSHIP_OPTIONS}
                  />
                )}
              />
              {hasValidRelationship && (
                <div className="flex animate-in flex-col gap-1 p-2 duration-300 fade-in slide-in-from-top-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium"></label>
                    <Controller
                      name={`${prefix}relationship`}
                      control={control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>
                            Full Name{" "}
                            {relationship !== "other" && (
                              <span className="text-red-500">*</span>
                            )}
                          </FieldLabel>
                          <Input
                            placeholder="Patient's full name"
                            value={field.value || ""}
                            onChange={field.onChange}
                            disabled={readOnly}
                          />
                        </Field>
                      )}
                    />
                    {/* {errors.personalDetails?.name && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.personalDetails.name.message}
                      </p>
                    )} */}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Preferred Name (optional)
                    </label>
                    <Controller
                      name={`${prefix}preferredName`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          placeholder="Nickname or preferred name"
                          value={field.value || ""}
                          onChange={field.onChange}
                          disabled={readOnly}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Preferred Pronoun (optional)
                    </label>
                    <Controller
                      name={`${prefix}preferredPronoun`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          disabled={readOnly}
                        >
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue placeholder="Select pronoun" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="he/him">He/Him</SelectItem>
                            <SelectItem value="she/her">She/Her</SelectItem>
                            <SelectItem value="they/them">They/Them</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </FieldGroup>
      </FieldSet>

      {mode == "profile" && (
        <>
          <FormSection icon={OTHERS_ICONS} title="Identity" />
          <div className="flex animate-in flex-col gap-1 p-2 duration-300 fade-in slide-in-from-top-2">
            <div>
              <label className="mb-1 block text-sm font-medium"></label>
              <Controller
                name={`${prefix}name`}
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>
                      Full Name{" "}
                      {relationship !== "other" && (
                        <span className="text-red-500">*</span>
                      )}
                    </FieldLabel>
                    <Input
                      placeholder="Patient's full name"
                      value={field.value || ""}
                      onChange={field.onChange}
                      disabled={readOnly}
                    />
                  </Field>
                )}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Preferred Name (optional)
              </label>
              <Controller
                name={`${prefix}preferredName`}
                control={control}
                render={({ field }) => (
                  <Input
                    placeholder="Nickname or preferred name"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                )}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Preferred Pronoun (optional)
              </label>
              <Controller
                name={`${prefix}preferredPronoun`}
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={readOnly}
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
                )}
              />
            </div>
          </div>
        </>
      )}

      {forWhom === "self" || (forWhom === "other" && hasValidRelationship) ? (
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-sm sm:text-base font-bold text-(--text-heading) tracking-tight">
              Personal Details & Vitals
            </span>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Clinical record
            </span>
          </div>

          <div className="rounded-2xl border border-(--border-default) bg-(--surface-card) p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 shadow-sm">
            {/* Row 1: Date of Birth & Sex at birth */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Controller
                name={`${prefix}dateOfBirth`}
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel className="text-xs sm:text-sm font-semibold text-(--text-heading) mb-1.5 flex items-center gap-1">
                      Date of Birth <span className="text-(--danger-fg)">*</span>
                    </FieldLabel>
                    <DatePicker
                      date={field.value}
                      onDateChange={(date) =>
                        field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                      }
                      minDate={new Date("1900-01-01")}
                      maxDate={new Date()}
                      icon={CalendarIcon}
                      triggerClassName="h-12 sm:h-12.5 text-sm sm:text-base font-medium"
                    />
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name={`${prefix}genderAtBirth`}
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs sm:text-sm font-semibold text-(--text-heading) mb-1.5 flex items-center gap-1">
                      Sex at birth <span className="text-(--danger-fg)">*</span>
                    </FieldLabel>
                    <GenderPicker
                      value={field.value || ""}
                      onChange={field.onChange}
                      disabled={readOnly}
                    />
                  </Field>
                )}
              />
            </div>

            {/* Row 2: Weight & Height */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {WEIGHT_HEIGHT_OPTIONS.map((fieldItem) => {
                const Icon = fieldItem.icon;
                return (
                  <Controller
                    key={fieldItem.name}
                    name={`${prefix}${fieldItem.name}`}
                    control={control}
                    render={({ field: controllerField, fieldState }) => (
                      <Field>
                        <FieldLabel className="text-xs sm:text-sm font-semibold text-(--text-heading) mb-1.5 flex items-center gap-1">
                          {fieldItem.label} <span className="text-(--danger-fg)">*</span>
                        </FieldLabel>
                        <div className="relative">
                          <Icon className="absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            step={fieldItem.step}
                            placeholder={fieldItem.placeholder}
                            className={cn(
                              "h-12 sm:h-12.5 rounded-xl pl-10 pr-3.5 text-sm sm:text-base font-medium text-(--text-heading) bg-(--surface-card) shadow-xs placeholder:text-muted-foreground/70",
                              fieldState.error
                                ? "border-(--danger-fg) focus:ring-(--danger-fg)"
                                : "border-(--border-default) focus:border-(--action-primary) focus:ring-1 focus:ring-(--action-primary)",
                            )}
                            value={controllerField.value || ""}
                            onChange={controllerField.onChange}
                            onBlur={controllerField.onBlur}
                            disabled={readOnly}
                          />
                        </div>
                        {fieldState.invalid && (
                          <AnimatedFieldError error={fieldState.error} />
                        )}
                      </Field>
                    )}
                  />
                );
              })}
            </div>

            {/* Row 3: Blood Type */}
            <div>
              <Controller
                name={`${prefix}bloodType`}
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs sm:text-sm font-semibold text-(--text-heading) mb-1.5 block">
                      Blood type
                    </FieldLabel>
                    <BloodTypePicker
                      value={field.value || ""}
                      onChange={field.onChange}
                      disabled={readOnly}
                    />
                  </Field>
                )}
              />
            </div>

            {/* Row 4: Allergies & Intolerances */}
            <div>
              <Controller
                name={`${prefix}allergens`}
                control={control}
                render={({ field }) => (
                  <AllergenField
                    value={field.value || []}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Row 5: Dietary Preferences */}
            <div>
              <Controller
                name={`${prefix}diet`}
                control={control}
                render={({ field }) => (
                  <DietaryField
                    value={field.value || []}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </div>
      ) : (
        <span className="text-center font-mono font-semibold text-primary">
          {" "}
          Select a relationship to continue{" "}
        </span>
      )}
    </div>
  );
}

interface ReadOnlyPersonDataSectionProps {
  data: DynamicIntakeFormValues["personalDetails"];
}

export function ReadOnlyPersonDataSection({
  data,
}: ReadOnlyPersonDataSectionProps) {
  const forWhom = data?.forWhom || "self";
  const relationship = data?.relationship || "";
  const formattedDOB = data?.dateOfBirth
    ? new Date(data.dateOfBirth).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            {data?.name || "Not Specified"}
          </h3>
          {data?.preferredName && (
            <p className="text-xs text-muted-foreground">
              Goes by:{" "}
              <span className="font-medium text-foreground">
                {data.preferredName}
              </span>
              {data?.preferredPronoun && ` (${data.preferredPronoun})`}
            </p>
          )}
        </div>
        <Badge className="inline-flex self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize sm:self-center">
          {forWhom === "self"
            ? "Account Owner (Self)"
            : `Dependent (${relationship || "Other"})`}
        </Badge>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-muted-foreground">Date of Birth</span>
            <span className="font-medium text-foreground">{formattedDOB}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-muted-foreground">Sex Assigned at Birth</span>
            <span className="font-medium text-foreground capitalize">
              {data?.genderAtBirth?.replace("-", " ") || "—"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-muted-foreground">Height</span>
            <span className="font-medium text-foreground">
              {data?.height ? `${data.height} cm` : "—"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-muted-foreground">Weight</span>
            <span className="font-medium text-foreground">
              {data?.weight ? `${data.weight} kg` : "—"}
            </span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-muted-foreground">Blood type</span>
            <span className="font-medium text-foreground">
              {data?.bloodType || "—"}
            </span>
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-muted p-3 sm:p-4">
          <div>
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Allergies & Contraindications
            </span>
            {data?.allergens && data.allergens.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="rounded border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                  >
                    {allergen}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                No historical data recorded
              </span>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Dietary Preferences
            </span>
            {data?.diet && data.diet.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.diet.map((diet) => (
                  <span
                    key={diet}
                    className="rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                  >
                    {diet}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                No structural restrictions specified
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
