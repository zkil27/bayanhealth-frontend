"use client";

import { useFormContext, Controller } from "react-hook-form";
import {
  Mountain,
  Heart,
  Phone,
  AlertTriangle,
  Flag,
  Scale,
  Activity,
  Brain,
  MapPin,
  InfoIcon,
  Contact,
  Tally1,
} from "lucide-react";
import { BaseServiceForm } from "./BaseServiceForm";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldDescription,
} from "@/components/ui/field";
import { FormSection } from "../../../FormSection";
import { Badge } from "@/components/ui/badge";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";

export function FitForClimb({ readOnly = false }: { readOnly?: boolean }) {
  const { control, watch } = useFormContext();
  const isFirstTimeClimber = watch("requestDetails.isFirstTimeClimber");

  const healthConditions = [
    { id: "hadSurgery", label: "Had surgery in the past." },
    { id: "hadDrugs", label: "Had smoke or consume drugs" },
    { id: "pregnant", label: "Pregnant" },
    {
      id: "uncontrolledHypertension",
      label: "Uncontrolled hypertension or suffers from heart condition",
    },
    { id: "asthma", label: "Asthma attacks or frequent shortness of breath" },
    { id: "epileptic", label: "Epileptic or seizures" },
    {
      id: "dizziness",
      label: "Fainted, dizzy, or balance problem in the last 6 months",
    },
    {
      id: "injury",
      label:
        "Limb, joint, or back injury in the last 6 months affecting fitness, strength, or climbing ability",
    },
  ];
  const firstTimeQuestions = [
    {
      name: "hasAltitudeSickness",
      label: "History of altitude sickness or HAPE",
    },
    {
      name: "hasUpsetStomach",
      label: "Experience upset stomach during physical exertion",
    },
    {
      name: "hasBackPains",
      label: "Suffer from back pains",
    },
    {
      name: "hasClimbTraining",
      label: "Undergone climb training in preparation",
    },
  ];
  return (
    <BaseServiceForm
      icon={Mountain}
      title="Fit to Climb Assessment"
      description="Medical clearance for mountain climbing activities"
      styles={{
        border: "border-purple-200",
        bg: "bg-purple-50",
        text: "text-purple-600",
      }}
    >
      <FieldSet>
        <FieldGroup>
          <Controller
            name="requestDetails.mountainName"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Mountain className="size-4 text-muted-foreground" />
                  <span>Mountain / Trail Name</span>
                  <span className="text-xs text-red-500">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="Enter mountain or trail name"
                    className="h-11 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FieldContent>
                {fieldState.error && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          <Controller
            name="requestDetails.location"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span>Location</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="City, province, or region"
                    className="h-11 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FieldContent>
                {fieldState.error && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          <Controller
            name="requestDetails.organizer"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Flag className="size-4 text-muted-foreground" />
                  <span>Organizer / Group Name</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="e.g., Mountaineering Club, Hiking Group"
                    className="h-11 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FieldContent>
                {fieldState.error && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          <Controller
            name="requestDetails.difficulty"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Scale className="size-4 text-muted-foreground" />
                  <span>Difficulty Level</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="e.g., Easy, Moderate, Hard, Expert"
                    className="h-11 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FieldContent>
                {fieldState.error && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          <Controller
            name="requestDetails.peakElevation"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Scale className="size-4 text-muted-foreground" />
                  <span>Peak Elevation (meters)</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    type="number"
                    placeholder="Enter elevation in meters"
                    className="h-11 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FieldContent>
                {fieldState.error && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>
      <FormSection
        icon={<Heart className="size-4" />}
        title="Health Assessment"
      />
      <FieldSet>
        <FieldGroup>
          <Controller
            name="requestDetails.currentCondition"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Activity className="size-4 text-muted-foreground" />
                  <span>Your Current Health Condition</span>
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    placeholder="Describe your current health status..."
                    className="min-h-20 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FieldContent>
              </Field>
            )}
          />

          <Controller
            name="requestDetails.pastIllnesses"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Brain className="size-4 text-muted-foreground" />
                  <span>Past Illnesses / Medical History</span>
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    placeholder="List any past illnesses or surgeries..."
                    className="min-h-20 bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FieldContent>
              </Field>
            )}
          />

          <Field>
            <FieldLegend className="flex items-center-safe gap-1 text-sm font-medium">
              <InfoIcon className="size-4" /> Medical Conditions
            </FieldLegend>
            <FieldDescription>(Check all that apply)</FieldDescription>
            <FieldGroup className="mt-2 gap-4">
              {healthConditions.map((condition) => (
                <Controller
                  key={condition.id}
                  name={`requestDetails.healthConditions.${condition.id}`}
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldContent className="flex flex-row items-center justify-between gap-3 border-b border-gray-900/20 pb-2">
                        <FieldLabel htmlFor={condition.label} className="text-sm">
                          {condition.label}
                        </FieldLabel>
                        <Checkbox
                          id={condition.label}
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          disabled={readOnly}
                          className="border-secondary"
                        />
                      </FieldContent>
                    </Field>
                  )}
                />
              ))}
            </FieldGroup>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="mb-4 flex w-full items-center gap-2 rounded-lg bg-secondary px-4 py-2 font-semibold text-white">
          <AlertTriangle className="size-4" />
          First Timer Assessment
        </FieldLegend>

        <FieldGroup className="gap-6">
          <Controller
            name="requestDetails.isFirstTimeClimber"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldContent className="flex flex-row items-center justify-between">
                  <FieldLabel className="font-mono text-xs font-semibold underline underline-offset-2">
                    <Tally1 className="size-4" />
                    Check if this is your first climb
                  </FieldLabel>
                  <Checkbox
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                    disabled={readOnly}
                    className="border-secondary"
                  />
                </FieldContent>
              </Field>
            )}
          />

          {isFirstTimeClimber ? (
            <FieldGroup className="flex animate-in flex-col gap-4 duration-300 fade-in slide-in-from-top-4">
              <FormSection title="First Time Climb" />

              <p className="text-sm text-muted-foreground">
                {`Since you're a first-time climber, please answer the following:`}
              </p>
              {firstTimeQuestions.map((question) => (
                <Controller
                  key={question.name}
                  name={`requestDetails.${question.name}`}
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldContent className="flex flex-row items-center justify-between">
                        <FieldLabel htmlFor={question.label}>
                          {question.label}
                        </FieldLabel>
                        <Checkbox
                          id={question.label}
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          disabled={readOnly}
                          className="border-secondary"
                        />
                      </FieldContent>
                    </Field>
                  )}
                />
              ))}
            </FieldGroup>
          ) : isFirstTimeClimber === false ? (
            <div className="animate-in text-sm duration-300 fade-in">
              <Badge>✓ Experienced climber - standard assessment only</Badge>
            </div>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <FormSection
        icon={<Phone className="size-4" strokeWidth={2} />}
        title="Contact Person"
      />

      <FieldSet>
        <FieldGroup>
          <Controller
            name="requestDetails.emergencyContactName"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Contact className="size-4 text-muted-foreground" />
                  <span>Contact Name</span>
                  <span className="text-xs text-red-500">*</span>
                </FieldLabel>
                <Input
                  placeholder="Full name"
                  className="h-11 bg-background"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={readOnly}
                />
                {fieldState.error && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          <Controller
            name="requestDetails.emergencyContactPhone"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Phone Number</FieldLabel>
                <Input
                  placeholder="Contact number"
                  className="h-11 bg-background"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={readOnly}
                />
                {fieldState.error && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>
    </BaseServiceForm>
  );
}
