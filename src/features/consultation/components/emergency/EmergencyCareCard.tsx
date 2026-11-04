"use client";

import { MapPin, Phone, Siren } from "lucide-react";

import { cn } from "@/lib/utils";

/** Opens the device's maps app on a search for the closest emergency rooms. */
const NEAREST_ER_URL = "https://www.google.com/maps/search/?api=1&query=emergency+room+near+me";

/**
 * The one emergency instruction a patient sees, wherever it is raised:
 * the intake safety check (a "Yes" answer) and the doctor's "Send to ER".
 *
 * It has no dismiss control. The only ways out are acting on it, or, on the
 * intake only, `onRetract` for a patient who tapped "Yes" by mistake.
 */
export function EmergencyCareCard({
  title = "Go to the nearest emergency room now",
  description = "These symptoms need in-person emergency care. A video or chat consultation cannot treat them safely.",
  doctorNote,
  onRetract,
  className,
}: {
  title?: string;
  description?: string;
  /** The doctor's short instruction from Send to ER, shown as their words. */
  doctorNote?: string;
  /** Intake only: returns the patient to the safety question. */
  onRetract?: () => void;
  className?: string;
}) {
  return (
    <section
      role="alert"
      data-slot="emergency-care-card"
      className={cn(
        "space-y-4 rounded-2xl border border-(--danger-border) bg-(--danger-bg) p-5 text-(--danger-fg) sm:p-6",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h2 className="flex items-start gap-2.5 text-xl leading-snug font-bold text-balance">
          <Siren aria-hidden className="mt-0.5 size-6 shrink-0" />
          {title}
        </h2>
        <p className="text-base leading-relaxed">{description}</p>
      </div>

      {doctorNote ? (
        <blockquote className="rounded-xl border border-(--danger-border)/40 bg-(--surface-card) p-3.5 text-base leading-relaxed text-(--text-body)">
          <span className="mb-0.5 block text-sm font-semibold text-(--danger-fg)">From your doctor</span>
          {doctorNote}
        </blockquote>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2">
        <a
          href="tel:911"
          // A fixed red fill in both themes: the dark theme's --danger-border is a
          // light salmon that white text fails on (about 2.6:1). White on --red-600 is about 5.7:1.
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-(--red-600) px-6 text-lg font-bold text-white shadow-xs transition-colors hover:bg-(--red-700) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <Phone aria-hidden className="size-5" /> Call 911
        </a>
        <a
          href={NEAREST_ER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-(--danger-border) bg-(--surface-card) px-6 text-lg font-semibold text-(--danger-fg) transition-colors hover:bg-(--danger-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <MapPin aria-hidden className="size-5" /> Find nearest ER
          <span className="sr-only"> (opens maps in a new tab)</span>
        </a>
      </div>

      {onRetract ? (
        <button
          type="button"
          onClick={onRetract}
          className="min-h-12 px-1 text-base font-medium text-(--danger-fg) underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          I selected this by mistake
        </button>
      ) : null}
    </section>
  );
}
