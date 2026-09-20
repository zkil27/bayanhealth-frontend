"use client";

import { MessageSquare } from "lucide-react";
import { useFormContext, Controller } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "../../DateTimePicker";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
} from "@/components/ui/field";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { DynamicIntakeFormValues } from "@/features/booking/schemas/intakeSchema";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * Intake "Additional Information" step.
 *
 * **The medical-records upload was removed, not disabled (ADR-20260806-02).**
 *
 * This section used to render a drag-and-drop file picker under the heading
 * "Medical Records — Upload lab results, medical history, or previous
 * prescriptions". The handler pushed the `File` into react-hook-form state, waited
 * `setTimeout(1000)`, and then set the file's status to `"success"`, which drew a
 * green check beside the filename under a heading that read "Uploaded files".
 *
 * Nothing was ever transmitted. There is no intake-scoped attachment endpoint:
 * the only media operations in `contracts/openapi.yaml` are
 * `/v1/consultations/{consultationId}/media/*` (`consultation_attachment`), and a
 * `consultationId` does not exist at intake time — intake is filled in before a
 * consultation record exists. `mapIntakeFormToSections` never read `attachments`
 * either, so the files could not even reach `PUT /v1/bookings/{bookingId}/intake`
 * as text.
 *
 * A patient shown a green check on "lab results" can reasonably conclude their
 * results reached their doctor and stop carrying them. That is a clinical
 * failure mode, not a cosmetic one, so no code path here may report success for a
 * transfer that did not happen.
 *
 * The control was removed rather than disabled because it had no working
 * destination: a greyed-out dropzone still costs the patient attention and still
 * suggests the feature is one click away. What remains is a plain statement of
 * where documents can actually go — the consultation itself, which does have a
 * media endpoint — so the patient knows to bring them.
 */

export interface AdditionalInfoData {
  additionalConcerns?: string;
  consent?: boolean;
  dateOfConsultation?: string;
}

// ---------------------------------------------------------------------------
// `additionalInfo.dateOfConsultation` encoding
//
// One schema string (`z.string().min(1)`) holds both halves as
// `yyyy-MM-dd` or `yyyy-MM-ddTHH:mm`. Splitting it into two schema fields would
// be cleaner, but this value is read by `ReadOnlyAdditionalInfoSection` and
// validated as a single required field, so the narrower change is to keep one
// string and parse it at the edges.
//
// Note for whoever wires this up: `intakeMapper.ts` maps only
// `additionalInfo.additionalConcerns` and `additionalInfo.consent` to the
// backend. This preference is collected, required, and shown back to the patient,
// but it is never transmitted. The time added here does not change that — it is a
// UI-level preference until a contract field exists to carry it.
// ---------------------------------------------------------------------------

/** The `yyyy-MM-dd` half, or `""` when unset or unparseable. */
export function dateSegmentOf(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match ? match[1] : "";
}

/** The `HH:mm` half, or `""` when no time was given. */
export function timeSegmentOf(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/.exec(value.trim());
  return match ? match[1] : "";
}

/** Replace the date half, keeping any time already chosen. */
export function withDateSegment(value: unknown, date: string): string {
  if (!date) return "";
  const time = timeSegmentOf(value);
  return time ? `${date}T${time}` : date;
}

/** Replace the time half. Clearing the time leaves a date-only value. */
export function withTimeSegment(value: unknown, time: string): string {
  const date = dateSegmentOf(value);
  if (!date) return "";
  return time ? `${date}T${time}` : date;
}

/**
 * No props. The removed `name` prefix existed only to address
 * `${name}.attachments`; every remaining control is bound to its explicit
 * `additionalInfo.*` path.
 */
export function AdditionalInfoSection() {
  const { control } = useFormContext();

  return (
    <div className="flex flex-col gap-4">
      <section data-slot="intake-medical-records-notice">
        <h2 className="mb-1 text-lg font-semibold">Medical Records</h2>
        <p className="text-sm text-muted-foreground">
          Documents cannot be attached to this form. Bring your lab results,
          medical history, or previous prescriptions to the consultation, where
          your doctor can receive them. You can also describe them under
          Additional Concerns below.
        </p>
      </section>
      <FieldSeparator />
      <Controller
        name={`additionalInfo.dateOfConsultation`}
        control={control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLegend className="text-lg font-semibold">
              Consultation Date and Time
            </FieldLegend>
            <FieldDescription>
              Tell us the date and time you would prefer. This is a preference,
              not a confirmed appointment — your consultation time is set by the
              slot you book with a doctor.
            </FieldDescription>
            {/*
             * Two controls rather than the picker's built-in time step.
             *
             * The picker's time step renders `availableTimes`, and this form has
             * no doctor — so it had nothing to offer, `Confirm` stayed disabled
             * (`disabled={!hasSelectedTime}`), and every date dead-ended on "no
             * published times". Supplying a generic list of times to fill it
             * would be the fabricated-availability pattern ADR-20260806-02
             * removed, wearing a different hat: a list of clickable times reads
             * as "these are bookable", which nothing here can promise.
             *
             * A free time input makes no such claim. The patient states a
             * preference, and the copy above says exactly what that is worth.
             * The authoritative appointment time comes from the slot chosen on
             * the doctor detail page, which is checked against the doctor's real
             * published availability.
             */}
            <DateTimePicker
              label=""
              enableTime={false}
              date={dateSegmentOf(field.value)}
              onDateChange={(date) =>
                field.onChange(
                  withDateSegment(field.value, date ? format(date, "yyyy-MM-dd") : ""),
                )
              }
              placeholder="Select preferred date"
            />
            <div className="flex flex-col gap-1">
              <label
                htmlFor="preferred-consultation-time"
                className="text-sm text-muted-foreground"
              >
                Preferred time (optional)
              </label>
              <input
                id="preferred-consultation-time"
                type="time"
                data-slot="intake-preferred-time"
                value={timeSegmentOf(field.value)}
                // Disabled until a date exists: a bare time is not a preference
                // anyone can act on, and it would round-trip as an unparseable
                // value.
                disabled={!dateSegmentOf(field.value)}
                onChange={(event) =>
                  field.onChange(withTimeSegment(field.value, event.target.value))
                }
                className="w-full rounded-lg border p-2 focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {fieldState.invalid && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />
      <FieldSeparator />

      <Controller
        name={`additionalInfo.additionalConcerns`}
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLegend className="mb-1 flex items-center gap-1 text-sm font-medium">
              <MessageSquare className="size-4 text-muted-foreground" />
              Additional Concerns or Notes
            </FieldLegend>
            <FieldDescription>
              Anything else you would like the Doctor to know?
            </FieldDescription>
            <Textarea
              placeholder={`Examples:\n- Recent travel history\n- Family medical history\n- Lifestyle factors (smoking, alcohol, exercise)\n- Specific questions for the doctor`}
              className="h-32 w-full rounded-lg p-2 text-xs"
              {...field}
              value={field.value || ""}
            />
          </Field>
        )}
      />

      <Controller
        name={`additionalInfo.consent`}
        control={control}
        rules={{ required: "You must consent to continue" }}
        render={({ field, fieldState }) => (
          <Field className="rounded-lg">
            <FieldLegend>User Consent</FieldLegend>
            <FieldLabel
              htmlFor="user-consent"
              className="flex cursor-pointer items-start gap-3"
            >
              <span className="text-xs text-muted-foreground">
                I confirm that the information provided is accurate and complete
                to the best of my knowledge. I understand that this information
                will be used to provide appropriate medical care.
              </span>
              <Checkbox
                id="user-consent"
                checked={field.value || false}
                onCheckedChange={field.onChange}
                className="size-6 border-secondary"
              />
            </FieldLabel>
            {fieldState.error && (
              <AnimatedFieldError error={fieldState.error} />
            )}
          </Field>
        )}
      />
    </div>
  );
}
interface ReadOnlyAdditionalInfoSectionProps {
  data: DynamicIntakeFormValues["additionalInfo"];
}

export function ReadOnlyAdditionalInfoSection({
  data,
}: ReadOnlyAdditionalInfoSectionProps) {
  // Read the two halves rather than handing the raw string to `Date`: a
  // date-only value is parsed as UTC midnight and can render as the previous day
  // for a viewer west of UTC, and the time half must be shown when it was given.
  // Built field-by-field in local terms so the review shows back exactly what the
  // patient typed.
  const datePart = dateSegmentOf(data?.dateOfConsultation);
  const timePart = timeSegmentOf(data?.dateOfConsultation);
  const formattedDate = datePart
    ? (() => {
        const [year, month, day] = datePart.split("-").map(Number);
        const local = new Date(year, month - 1, day);
        const rendered = local.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        if (!timePart) return rendered;
        const [hours, minutes] = timePart.split(":").map(Number);
        const withTime = new Date(year, month - 1, day, hours, minutes);
        return `${rendered} at ${withTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}`;
      })()
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            Additional Information
          </h3>
          <p className="text-xs text-muted-foreground">
            Consent and supplementary registration details
          </p>
        </div>
        <Badge
          className={cn(
            "inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold capitalize sm:self-center",
            data?.consent
              ? "border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-none"
              : "border border-rose-100 bg-rose-50 text-rose-700 shadow-none",
          )}
        >
          {data?.consent ? "Consent Given" : "❌ Consent Not Given"}
        </Badge>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-muted-foreground">Consultation Date</span>
            <span className="font-medium text-foreground">{formattedDate}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5 text-sm">
            <span className="text-muted-foreground">Terms Consent Statement</span>
            <span
              className={cn(
                "font-medium",
                data?.consent ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {data?.consent ? "Accepted" : "Declined"}
            </span>
          </div>
        </div>

        {/*
         * No "Uploaded Attachments" block. It listed the in-memory `File`
         * objects as "File 1", "File 2", … which read on the review screen as
         * confirmation that documents had been stored against the intake. The
         * files never left the browser and the field no longer exists.
         */}
        <div className="space-y-4 rounded-lg bg-muted">
          <div>
            <span className="mb-1.5 block text-xs tracking-wide text-muted-foreground uppercase">
              Additional Concerns & Notes
            </span>
            {data?.additionalConcerns ? (
              <p className="text-sm whitespace-pre-wrap text-foreground">
                {data.additionalConcerns}
              </p>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                No extra problems or context reported
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
