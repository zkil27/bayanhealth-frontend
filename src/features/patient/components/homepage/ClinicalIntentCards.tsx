import Link from "next/link";
import {
  Activity,
  ChevronRight,
  FileText,
  Pill,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

import { cardHoverClass } from "@/features/patient/components/redesign/primitives";

/**
 * "What do you need?" — four clinical entry points, full width.
 *
 * Replaces the generic services row (`Consult`, `My Health`, `Chat`, `Med Ed`),
 * which was app navigation dressed as care: it asked the patient to choose a
 * *section* when what they have is a *reason*. Each card carries a
 * `?serviceRequested=`, which the on-demand intake form already reads to prefill
 * the service field, so a card starts a pre-filtered booking rather than
 * dropping the patient on a blank form.
 *
 * The row now covers the four reasons a patient actually arrives with, and each
 * card carries its own distinct icon rather than borrowing the booking
 * directory's glyphs. Two of them — the refill and the lab-test review — have no
 * dedicated intake flow behind them (there is no refill route and no
 * diagnostic-review route), so they open a regular `teleconsult`: that is the
 * real path a patient takes to get a maintenance script re-issued or a result
 * read, and the doctor handles it in the call. Only the certificate card, which
 * is a single consolidated entry for the several "fit to …" variants, routes to
 * a certificate service (`sick-leave`).
 */
const INTENTS: ReadonlyArray<{
  /** A real `SERVICES` value the intake form can prefill. */
  service: string;
  icon: LucideIcon;
  title: string;
  blurb: string;
}> = [
  {
    service: "teleconsult",
    icon: Stethoscope,
    title: "General illness",
    blurb: "Cough, colds, fever, stomach upset",
  },
  {
    service: "sick-leave",
    icon: FileText,
    title: "Medical certificate",
    blurb: "Fit to work, sick leave, travel clearance",
  },
  {
    service: "teleconsult",
    icon: Pill,
    title: "Prescription refill",
    blurb: "Maintenance medicine & recurring prescriptions",
  },
  {
    service: "teleconsult",
    icon: Activity,
    title: "Lab test review",
    blurb: "Blood chemistry, urinalysis, imaging review",
  },
];

export function ClinicalIntentCards() {
  return (
    <section
      data-slot="patient-home-intents"
      aria-labelledby="intent-heading"
      className="flex flex-col gap-3"
    >
      <h2
        id="intent-heading"
        className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)"
      >
        What do you need?
      </h2>

      {/*
        A horizontal swipe list on mobile — four cards do not fit a phone width
        and clipping them is worse than scrolling — becoming a 2-up then 4-up
        grid as there is room for it.
      */}
      <ul
        className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
        style={{ scrollbarWidth: "none" }}
      >
        {INTENTS.map(({ service, icon: Icon, title, blurb }) => {
          return (
            <li
              key={title}
              className="w-[15rem] shrink-0 snap-start sm:w-auto"
            >
              <Link
                href={`/patient/booking/createBooking?mode=on-demand&serviceRequested=${encodeURIComponent(service)}`}
                className={`group flex h-full cursor-pointer flex-col gap-2 rounded-2xl border border-(--border-default) bg-(--surface-brand-soft) p-3.5 shadow-(--shadow-card) hover:border-(--action-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${cardHoverClass}`}
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-(--radius-md) border border-(--action-primary)/20 bg-(--surface-card) text-(--status-available-fg) [&_svg]:size-5">
                    <Icon aria-hidden />
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-(--text-subtle) transition-transform group-hover:translate-x-0.5 group-hover:text-(--action-primary)"
                  />
                </div>
                <span className="mt-1 text-[15px] font-bold text-(--text-heading)">
                  {title}
                </span>
                <span className="text-[13.5px] leading-[1.4] text-(--text-muted)">
                  {blurb}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
