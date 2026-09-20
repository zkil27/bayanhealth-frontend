"use client";

import { useCallback, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { User, Users, Ruler, Weight, Apple, Cog, Cake, Droplet } from "lucide-react";
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { FormSection } from "../../../features/booking/components/FormSection";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/tiptap-utils";

const PATIENT_OPTIONS = [
  { value: "self" as const, icon: User, label: "Myself" },
  { value: "other" as const, icon: Users, label: "Coming Soon" },
] as const;

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
    <div className="flex flex-col gap-6">
      <FieldSet>
        {mode == "booking" && (
          <>
            <FieldLegend className="text-lg font-semibold">
              Who is this for?
            </FieldLegend>
            <FieldDescription className="mb-4 text-xs text-muted-foreground">
              Select the patient
            </FieldDescription>
          </>
        )}

        <FieldGroup>
          <Controller
            name={`${prefix}forWhom`}
            control={control}
            render={({ field }) => (
              <Field>
                {" "}
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value ?? "self"}
                  className="grid grid-cols-2 gap-3"
                >
                  {PATIENT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Label
                        key={option.value}
                        htmlFor={`for-whom-${option.value}`}
                        className={cn(
                          "group relative flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-border bg-card p-4 transition-all hover:border-border hover:shadow-sm has-checked:translate-y-1 has-checked:border-primary has-checked:bg-primary has-checked:shadow-lg",
                          option.value == "other" && "opacity-30 cursor-default",
                        )}
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`for-whom-${option.value}`}
                          className="absolute opacity-0"
                          disabled={option.value == "other"}
                        />
                        <Icon className="size-6 text-muted-foreground transition-colors group-has-checked:text-primary-foreground" />
                        <span className="text-sm font-medium text-secondary transition-colors group-has-checked:text-primary-foreground">
                          {option.label}
                        </span>
                      </Label>
                    );
                  })}
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
        <>
          <FieldSet>
            <FieldGroup>
              <FormSection icon={<Cog className="size-4" />} title="Profile" />
              <Controller
                name={`${prefix}dateOfBirth`}
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
                name={`${prefix}genderAtBirth`}
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Sex at birth</FieldLabel>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-3 gap-3"
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <Label
                          key={option}
                          htmlFor={`gender-${option.replace(/\s/g, "-")}`}
                          className="group relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-border bg-card py-3 text-center transition-all hover:border-border hover:shadow-sm has-checked:translate-y-1 has-checked:border-primary has-checked:bg-primary has-checked:shadow-lg"
                        >
                          <RadioGroupItem
                            value={option}
                            id={`gender-${option.replace(/\s/g, "-")}`}
                            className="absolute opacity-0"
                          />
                          <span className="text-xs font-medium text-secondary capitalize transition-colors group-has-checked:text-primary-foreground">
                            {option}
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </Field>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                {WEIGHT_HEIGHT_OPTIONS.map((field) => {
                  const Icon = field.icon;
                  return (
                    <Controller
                      key={field.name}
                      name={`${prefix}${field.name}`}
                      control={control}
                      render={({ field: controllerField, fieldState }) => (
                        <Field>
                          <FieldLabel>
                            {field.label}
                            <span className="text-orange-500">*</span>
                          </FieldLabel>
                          <div className="relative">
                            <Icon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="number"
                              step={field.step}
                              placeholder={field.placeholder}
                              className={`pl-10 ${fieldState.error ? "border-orange-500 focus:ring-orange-500" : ""}`}
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
              <Controller
                name={`${prefix}bloodType`}
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Blood type</FieldLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <span className="flex items-center gap-2">
                          <Droplet className="size-4 text-muted-foreground" />
                          <SelectValue placeholder="Select blood type" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldGroup>
              <FormSection icon={<Apple className="size-4" />} title="Health" />{" "}
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
            </FieldGroup>
          </FieldSet>
        </>
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
