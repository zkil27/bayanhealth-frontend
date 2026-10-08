import { AlertTriangle, Stethoscope } from "lucide-react";

import { cn } from "@/lib/utils";

/** Up to two uppercase initials for the avatar. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * Who this patient is, and what must not be missed, in one reserved place.
 *
 * NIST IR 7804 puts patient identification first among EHR use errors and asks
 * for identity to sit in a consistent, reserved area so a physician never
 * documents against the wrong chart. This is that area: name, age and sex, a
 * reference, and recorded allergies. Allergies get their own full line on a
 * phone, where an inline chip would be cut off.
 */
export function PatientSafetyStrip({
  name,
  fallbackTitle,
  age,
  sex,
  reference,
  allergies,
  hideAvatarBelowLg = false,
  allergiesClassName,
  className,
}: {
  /** Patient display name, when the booking carries one. */
  name?: string;
  /** Heading when there is no name, e.g. the chief complaint. */
  fallbackTitle?: string;
  /** Whole years. */
  age?: number;
  /** Human-readable sex, e.g. "Female". */
  sex?: string;
  /** A short consultation reference, e.g. "Konsulta #1042". */
  reference?: string;
  /** Recorded allergies worth warning about; omitted for an asserted "none". */
  allergies?: string;
  /** Drop the initials avatar on phones, where the row is short of width. */
  hideAvatarBelowLg?: boolean;
  /** e.g. hide the inline allergy chip where the caller draws a full-width line instead. */
  allergiesClassName?: string;
  className?: string;
}) {
  const trimmed = name?.trim();
  const heading = trimmed || fallbackTitle?.trim() || "Patient";
  const formattedAge =
    typeof age === "number" ? (age === 0 ? "<1 y/o" : `${age} y/o`) : null;
  const meta = [formattedAge, sex?.trim() || null, reference ?? null].filter(Boolean);

  return (
    <div
      data-slot="patient-safety-strip"
      className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5", className)}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full bg-(--surface-brand) text-sm font-bold text-(--text-on-brand)",
            hideAvatarBelowLg && "max-lg:hidden",
          )}
        >
          {trimmed ? initials(trimmed) : <Stethoscope className="size-4.5" />}
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-display text-base font-bold text-(--text-heading) sm:text-lg">
            {heading}
          </h1>
          {meta.length > 0 ? (
            <p className="truncate text-xs font-medium text-(--text-muted)">{meta.join(" · ")}</p>
          ) : null}
        </div>
      </div>

      {allergies ? (
        <p
          data-slot="patient-allergy"
          className={cn(
            "flex min-w-0 items-center gap-1.5 rounded-full border border-(--danger-border)/50 bg-(--danger-bg) px-2.5 py-1 text-xs font-bold text-(--danger-fg) max-md:basis-full max-md:rounded-lg",
            allergiesClassName,
          )}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">Allergies: {allergies}</span>
        </p>
      ) : null}
    </div>
  );
}
