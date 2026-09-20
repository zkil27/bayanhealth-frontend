"use client";

import { useFormContext, Controller, useWatch } from "react-hook-form";
import {
  Video,
  Activity,
  MapPin,
  ClipboardPlus,
  MousePointerClick,
  Apple,
  Clock,
  Calendar,
  Stethoscope,
  Waves,
  Bed,
  Plus,
  ChevronUp,
} from "lucide-react";
import { BaseServiceForm } from "./BaseServiceForm";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
} from "@/components/ui/field";
import { AnimatedFieldError } from "@/components/blocks/AnimatedFieldErrorWrapper";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import AppButton from "@/components/primitives/AppButton";
import { Badge } from "@/components/ui/badge";
import { FormSection } from "../../../FormSection";
import { SafetyScreenFields } from "../SafetyScreenFields";
import { VitalsFields } from "../VitalsFields";

// Ties the disclosure trigger to the panel it opens for assistive technology.
const DETAILS_PANEL_ID = "teleconsult-optional-details";

const OPTIONAL_FIELDS = [
  "requestDetails.onset",
  "requestDetails.location",
  "requestDetails.duration",
  "requestDetails.characteristics",
  "requestDetails.aggravatingFactors",
  "requestDetails.alleviatingFactors",
  "requestDetails.timing",
] as const;

// Semantic theme tokens only (the hardcoded-color scan enforces this): the
// quality ramp runs muted -> chart accents -> primary rather than raw palette
// colors, so it stays correct in both light and dark themes.
const QUALITY_LEVELS = [
  {
    min: 0,
    max: 0,
    label: "Basic",
    color: "bg-muted-foreground",
    textColor: "text-muted-foreground",
    tip: "Add a few details so your doctor can prepare.",
  },
  {
    min: 1,
    max: 2,
    label: "Good",
    color: "bg-chart-4",
    textColor: "text-chart-4",
    tip: "Almost there — a couple more details help narrow the diagnosis.",
  },
  {
    min: 3,
    max: 4,
    label: "Detailed",
    color: "bg-chart-5",
    textColor: "text-chart-5",
    tip: "Great — your doctor can prepare a focused consultation.",
  },
  {
    min: 5,
    max: 7,
    label: "Complete",
    color: "bg-primary",
    textColor: "text-primary",
    tip: "Perfect intake. Your doctor has everything they need.",
  },
] as const;

// ─── Suggestion pills component ──────────────────────────────────────────────

interface SuggestionPillsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
  icon?: React.ReactNode;
}

function SuggestionPills({
  suggestions,
  onSelect,
  icon,
}: SuggestionPillsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {icon && (
        <div className="flex items-center text-muted-foreground">{icon}</div>
      )}
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          // min-h-9 keeps the pill a comfortable tap target on mobile.
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="size-3" />
          {suggestion}
        </button>
      ))}
    </div>
  );
}

// ─── Detail progress header ──────────────────────────────────────────────────

/**
 * Progress for the optional detail fields.
 *
 * This used to be a `fixed` overlay pinned above the wizard's own fixed footer,
 * which covered content and competed for the same tap zone on a phone. It now
 * sits at the top of the disclosed group, so the count, the bar and the fields
 * it describes are read as one block.
 */
function DetailProgress({ filledCount }: { filledCount: number }) {
  const total = OPTIONAL_FIELDS.length;
  const level =
    QUALITY_LEVELS.findLast((l) => filledCount >= l.min) ?? QUALITY_LEVELS[0];
  const pct = Math.round((filledCount / total) * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Intake quality
        </span>
        <Badge className={cn("text-xs", level.color)}>{level.label}</Badge>
      </div>

      <p
        className={cn("mt-1 text-sm font-semibold", level.textColor)}
        aria-live="polite"
      >
        {filledCount} of {total} details added
      </p>

      <div
        role="progressbar"
        aria-valuenow={filledCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Optional symptom details completed"
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            level.color,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{level.tip}</p>
    </div>
  );
}

function RevealField({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [visible]);

  return (
    <div
      ref={ref}
      // `data-visible` exposes the collapsed/expanded state of the animated
      // panel, which is otherwise only expressed through grid-row sizing.
      data-slot="reveal-field"
      data-visible={visible}
      className={cn(
        "grid transition-all duration-300 ease-in-out",
        visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <div className="pt-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Teleconsult({ readOnly = false }: { readOnly?: boolean }) {
  const { control } = useFormContext();
  const [expanded, setExpanded] = useState(false);

  const chiefComplaint = useWatch({
    control,
    name: "requestDetails.chiefComplaint",
  });
  const hasComplaint = Boolean(chiefComplaint?.trim());

  const optionalValues = useWatch({
    control,
    name: OPTIONAL_FIELDS as unknown as string[],
  }) as string[];

  const filledCount =
    optionalValues?.filter((v) => Boolean(v?.trim())).length ?? 0;

  useEffect(() => {
    if (filledCount > 0) setExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suggestion data
  const symptomSuggestions = {
    onset: [
      "2 days ago",
      "Yesterday",
      "Last week",
      "Gradually over 3 days",
      "Suddenly this morning",
    ],
    location: [
      "Head",
      "Chest",
      "Stomach",
      "Lower back",
      "Knee",
      "Throat",
      "Eyes",
    ],
    duration: [
      "3 days",
      "1 week",
      "2 weeks",
      "1 month",
      "On and off for months",
    ],
    characteristics: [
      "Sharp",
      "Dull",
      "Throbbing",
      "Burning",
      "Stabbing",
      "Aching",
      "Pulsating",
    ],
    aggravating: [
      "Movement",
      "Deep breathing",
      "Eating",
      "Standing",
      "Bending",
      "Coughing",
    ],
    alleviating: [
      "Rest",
      "Medication",
      "Ice pack",
      "Heat pack",
      "Massage",
      "Lying down",
    ],
    timing: [
      "Morning",
      "After meals",
      "At night",
      "During exercise",
      "When stressed",
      "Upon waking",
    ],
  };

  return (
    <>
      <BaseServiceForm
        icon={Video}
        title="Teleconsultation"
        description="Virtual consultation with a doctor"
        styles={{
          border: "border-indigo-200",
          bg: "bg-indigo-50",
          text: "text-indigo-600",
        }}
      >
        {/* pb-8 replaces the space previously reserved for the fixed nudge. */}
        <div className="space-y-4 pb-8">
          <Controller
            name="requestDetails.chiefComplaint"
            control={control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLegend>Kwento ang iyong nararamdaman</FieldLegend>
                <FieldDescription>
                  Ano ang iyong mga hinanakit?
                </FieldDescription>
                <SuggestionPills
                  suggestions={[
                    "Fever and cough",
                    "Headache",
                    "Stomach pain",
                    "Chest pain",
                    "Shortness of breath",
                    "Dizziness",
                  ]}
                  onSelect={(val) => field.onChange(val)}
                  icon={<Stethoscope className="size-3" />}
                />
                <FieldLabel className="flex items-center gap-2">
                  <Activity className="size-4 text-muted-foreground" />
                  <span>Chief Complaint</span>
                  <span className="text-xs text-red-500">*</span>
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    placeholder="e.g., Fever, cough, headache"
                    className="min-h-[100px] bg-background"
                    value={field.value || ""}
                    onChange={field.onChange}
                    disabled={readOnly}
                  />
                </FieldContent>
                {fieldState.invalid && (
                  <AnimatedFieldError error={fieldState.error} />
                )}
              </Field>
            )}
          />

          {/*
            Progressive disclosure, collapsed state. The heading is Tagalog and
            the supporting line English — the same split the disclosed header
            and the field labels below already use, so the two states read as
            one bilingual section instead of switching language on expand.
          */}
          {/*
            Red-flag screening sits directly under the chief complaint and
            OUTSIDE the optional-details disclosure. It is the only structured
            clinical input the deterministic safety router can act on, so it must
            not be hidden behind a collapsed panel a patient can skip.
          */}
          <RevealField visible={hasComplaint || readOnly}>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <SafetyScreenFields readOnly={readOnly} />
            </div>
          </RevealField>

          <RevealField visible={hasComplaint || readOnly}>
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <VitalsFields readOnly={readOnly} />
            </div>
          </RevealField>

          <RevealField visible={hasComplaint && !expanded && !readOnly}>
            <AppButton
              type="button"
              variant="ghost"
              aria-expanded={false}
              aria-controls={DETAILS_PANEL_ID}
              onClick={() => setExpanded(true)}
              className={cn(
                "mt-4 flex min-h-24 w-full items-center justify-between gap-3",
                "rounded-xl border-2 border-dashed border-primary bg-primary/5",
                "px-4 py-4 text-left",
                "hover:border-primary/70 hover:bg-muted",
                "group transition-colors duration-200",
              )}
            >
              <div className="flex items-center gap-3">
                <ClipboardPlus className="size-8 shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">
                    Bigyan ng Konteksto ang Doktor
                  </p>
                  <p className="text-xs whitespace-break-spaces text-muted-foreground">
                    Add onset, duration and timing details — {OPTIONAL_FIELDS.length}{" "}
                    optional questions that help your doctor diagnose faster.
                  </p>
                </div>
              </div>
              <MousePointerClick className="size-6 shrink-0 text-primary transition-transform group-hover:translate-y-0.5" />
            </AppButton>
          </RevealField>

          <RevealField visible={expanded || readOnly}>
            <FieldGroup id={DETAILS_PANEL_ID} className="gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <ClipboardPlus className="mt-0.5 size-6 shrink-0 text-primary" />
                  <div>
                    <FieldLegend>Bigyan ng Konteksto ang Doktor</FieldLegend>
                    <FieldDescription>
                      Sa pag sagot ng mga forms ay mapapabilis ang diagnosis sa
                      iyo.
                    </FieldDescription>
                  </div>
                </div>
                <DetailProgress filledCount={filledCount} />
                {!readOnly && (
                  <AppButton
                    type="button"
                    variant="ghost"
                    aria-expanded={true}
                    aria-controls={DETAILS_PANEL_ID}
                    onClick={() => setExpanded(false)}
                    className="min-h-11 w-full justify-center gap-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronUp className="size-4" />
                    Hide optional details
                  </AppButton>
                )}
              </div>
              <FormSection
                icon={<Apple className="size-4" />}
                title="Ang Simula"
              />

              {/*
                Onset is a relative clinical description ("2 days ago",
                "gradually over 3 days"), not a calendar date — the schema and
                the backend both store it as free text. It is a text input, like
                the sibling `duration` field, so the suggestion pills can write
                their own values back into it.
              */}
              <Controller
                name="requestDetails.onset"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>When did it start?</FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g., 2 days ago, gradually over a week"
                        className="h-11 bg-background"
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                    <SuggestionPills
                      suggestions={symptomSuggestions.onset}
                      onSelect={(val) => field.onChange(val)}
                      icon={<Clock className="size-3" />}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Onset timing can change the diagnosis.
                    </p>
                  </Field>
                )}
              />

              <Controller
                name="requestDetails.duration"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>How long has this been going on?</FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g., 3 days, on and off for a week"
                        className="h-11 bg-background"
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                    <SuggestionPills
                      suggestions={symptomSuggestions.duration}
                      onSelect={(val) => field.onChange(val)}
                      icon={<Calendar className="size-3" />}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Helps distinguish acute vs. chronic conditions.
                    </p>
                  </Field>
                )}
              />

              {/* Timing */}
              <Controller
                name="requestDetails.timing"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>When does it tend to happen?</FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g., every morning, after meals, at night"
                        className="h-11 bg-background"
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                    <SuggestionPills
                      suggestions={symptomSuggestions.timing}
                      onSelect={(val) => field.onChange(val)}
                      icon={<Clock className="size-3" />}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Patterns are often the key to a faster diagnosis.
                    </p>
                  </Field>
                )}
              />
              <FormSection
                icon={<Apple className="size-4" />}
                title="Ang Nararamdaman"
              />

              <Controller
                name="requestDetails.location"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span>Where on your body?</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g., lower back, behind the eyes"
                        className="h-11 bg-background"
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                    <SuggestionPills
                      suggestions={symptomSuggestions.location}
                      onSelect={(val) => field.onChange(val)}
                      icon={<MapPin className="size-3" />}
                    />
                  </Field>
                )}
              />

              <Controller
                name="requestDetails.characteristics"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>How would you describe it?</FieldLabel>
                    <FieldContent>
                      <Textarea
                        placeholder="e.g., sharp, dull, throbbing, burning, comes in waves"
                        className="min-h-[100px] bg-background"
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                    <SuggestionPills
                      suggestions={symptomSuggestions.characteristics}
                      onSelect={(val) => field.onChange(val)}
                      icon={<Waves className="size-3" />}
                    />
                  </Field>
                )}
              />
              <FormSection
                icon={<Apple className="size-4" />}
                title="Ang Nagpapalala/Nagpapagaling"
              />

              <Controller
                name="requestDetails.aggravatingFactors"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>What makes it worse?</FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g., movement, deep breathing, eating"
                        className="h-11 bg-background"
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                    <SuggestionPills
                      suggestions={symptomSuggestions.aggravating}
                      onSelect={(val) => field.onChange(val)}
                      icon={<Activity className="size-3" />}
                    />
                  </Field>
                )}
              />

              <Controller
                name="requestDetails.alleviatingFactors"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>What makes it better?</FieldLabel>
                    <FieldContent>
                      <Input
                        placeholder="e.g., rest, pain relievers, cold compress"
                        className="h-11 bg-background"
                        value={field.value || ""}
                        onChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <AnimatedFieldError error={fieldState.error} />
                    )}
                    <SuggestionPills
                      suggestions={symptomSuggestions.alleviating}
                      onSelect={(val) => field.onChange(val)}
                      icon={<Bed className="size-3" />}
                    />
                  </Field>
                )}
              />
            </FieldGroup>
          </RevealField>
        </div>
      </BaseServiceForm>
    </>
  );
}
