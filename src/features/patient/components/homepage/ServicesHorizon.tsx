import Link from "next/link";
import { Activity, FileText, Pill, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionLabel } from "@/features/patient/components/redesign/primitives";

/**
 * "Services We Offer" — the top layer of the right-hand sheet.
 *
 * Four entry doors into the on-demand intake (`/patient/booking/createBooking`). Two of
 * them prefill a real `serviceRequested` value from `SERVICES`
 * (`bookingConstants.ts`): "General illness" → `teleconsult`, "Medical cert" →
 * `sick-leave`. The other two have no distinct service in the catalogue — a
 * prescription refill and a lab review are both handled inside a regular
 * teleconsult — so they open the same intake with `teleconsult` prefilled and
 * let the patient describe the specifics. Nothing here invents a service the
 * booking flow cannot actually take.
 *
 * Static navigation: no request, no state.
 */
interface ServiceDoor {
  key: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
  serviceRequested: string;
  /** Left-accent stripe — keys the tile to its care family, no severity meaning. */
  accent: string;
}

const DOORS: ServiceDoor[] = [
  {
    key: "general-illness",
    label: "General illness",
    blurb: "Fever, cough, colds",
    icon: Stethoscope,
    serviceRequested: "teleconsult",
    accent: "border-l-(--teal-600)",
  },
  {
    key: "medical-cert",
    label: "Medical cert",
    blurb: "Fit to work, leave",
    icon: FileText,
    serviceRequested: "sick-leave",
    accent: "border-l-(--navy-500)",
  },
  {
    key: "prescription-refill",
    label: "Prescription refill",
    blurb: "Maintenance medicine",
    icon: Pill,
    serviceRequested: "teleconsult",
    accent: "border-l-(--teal-800)",
  },
  {
    key: "lab-review",
    label: "Lab review",
    blurb: "Blood chemistry, tests",
    icon: Activity,
    serviceRequested: "teleconsult",
    accent: "border-l-(--gold-600)",
  },
];

export function ServicesHorizon() {
  return (
    <section
      data-slot="patient-home-services"
      aria-labelledby="services-horizon-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel id="services-horizon-heading">
          Services we offer
        </SectionLabel>
        <span className="shrink-0 text-[12px] font-semibold text-(--status-available-fg)">
          Direct care access
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {DOORS.map((door) => {
          const Icon = door.icon;
          return (
            <Link
              key={door.key}
              href={`/patient/booking/createBooking?mode=on-demand&serviceRequested=${door.serviceRequested}`}
              className={`group flex flex-col gap-1 rounded-xl border border-(--border-subtle) border-l-4 ${door.accent} bg-(--surface-card) p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
            >
              <Icon
                aria-hidden
                className="size-4 shrink-0 text-(--status-available-fg)"
              />
              <span className="mt-1 text-[13.5px] font-bold text-(--text-heading) group-hover:underline">
                {door.label}
              </span>
              <span className="text-[12px] leading-[1.35] text-(--text-muted)">
                {door.blurb}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
