"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Activity } from "lucide-react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Optional home vitals for the intake `details` step.
 *
 * Everything here is optional on purpose. A blank box is carried through as
 * `undefined` ("not recorded"); the reviewing physician's Objective card then
 * shows "Not recorded" rather than a defaulted or invented number — the same
 * contract the red-flag screen keeps for unanswered questions.
 *
 * Bounds mirror `vitalsSchema` / the `IntakeVitals` contract schema. An
 * out-of-range entry fails validation here and is dropped by the backend; it is
 * never clamped into range.
 */
export function VitalsFields({
  readOnly = false,
  namePrefix = "requestDetails.vitals",
}: {
  readOnly?: boolean;
  /**
   * Form path the five fields hang off. Teleconsult carries symptoms on
   * `requestDetails` directly; sick-leave nests them under `symptomDetails`.
   */
  namePrefix?: string;
}) {
  const { control } = useFormContext();

  return (
    <FieldGroup>
      <Field>
        <FieldLegend className="flex items-center gap-2">
          <Activity className="size-4 shrink-0 text-muted-foreground" />
          Home vitals (optional)
        </FieldLegend>
        <FieldDescription>
          If you measured any of these before the consult, add them. Leave a box
          blank if you didn&apos;t — your doctor will see it as not recorded.
        </FieldDescription>
      </Field>

      <NumberField
        name={`${namePrefix}.temperatureC`}
        label="Temperature (°C)"
        placeholder="e.g., 37.2"
        step="0.1"
        min={30}
        max={45}
        control={control}
        readOnly={readOnly}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          name={`${namePrefix}.systolicBp`}
          label="Blood pressure — systolic (mmHg)"
          placeholder="e.g., 118"
          min={40}
          max={300}
          control={control}
          readOnly={readOnly}
        />
        <NumberField
          name={`${namePrefix}.diastolicBp`}
          label="Blood pressure — diastolic (mmHg)"
          placeholder="e.g., 76"
          min={20}
          max={200}
          control={control}
          readOnly={readOnly}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          name={`${namePrefix}.heartRateBpm`}
          label="Heart rate (bpm)"
          placeholder="e.g., 88"
          min={20}
          max={300}
          control={control}
          readOnly={readOnly}
        />
        <NumberField
          name={`${namePrefix}.spo2Percent`}
          label="Oxygen saturation — SpO₂ (%)"
          placeholder="e.g., 98"
          min={50}
          max={100}
          control={control}
          readOnly={readOnly}
        />
      </div>
    </FieldGroup>
  );
}

interface NumberFieldProps {
  name: string;
  label: string;
  placeholder: string;
  min: number;
  max: number;
  step?: string;
  control: ReturnType<typeof useFormContext>["control"];
  readOnly: boolean;
}

/**
 * A single optional numeric vital. An empty box clears back to `undefined` so
 * "not recorded" stays distinct from any real reading.
 */
function NumberField({
  name,
  label,
  placeholder,
  min,
  max,
  step,
  control,
  readOnly,
}: NumberFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel>{label}</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              inputMode="decimal"
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
              className="h-11 bg-background"
              value={
                field.value === undefined || field.value === null
                  ? ""
                  : String(field.value)
              }
              onChange={(event) => {
                const raw = event.target.value;
                field.onChange(raw === "" ? undefined : Number(raw));
              }}
              disabled={readOnly}
            />
          </FieldContent>
        </Field>
      )}
    />
  );
}
