import { Building2, Check } from "lucide-react";

import { ORGANISATION_PAGE_CONTENT } from "./content";

/**
 * The organisation value proposition on `/para-sa-organisasyon`.
 *
 * The lead capture itself is {@link WaitlistSection} with its segment locked to
 * the partner option, so an LGU that arrives here lands in the same list as one
 * that picked "LGU / Employer Partner" on the landing page — one list, not two
 * that have to be reconciled later.
 */
export function OrganisationSection() {
  return (
    <section
      aria-labelledby="organisation-heading"
      className="mx-auto max-w-3xl px-4 py-14 lg:px-8 lg:py-20"
    >
      <span className="inline-flex w-fit items-center gap-2 rounded-(--radius-pill) bg-(--surface-accent-soft) px-3 py-1 text-xs font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
        <Building2 className="size-3.5" aria-hidden />
        {ORGANISATION_PAGE_CONTENT.eyebrow}
      </span>

      <h1
        id="organisation-heading"
        className="mt-4 font-display text-3xl leading-snug font-bold text-(--text-heading) md:text-4xl"
      >
        {ORGANISATION_PAGE_CONTENT.heading}
      </h1>

      <p className="mt-3 text-[15px] leading-relaxed text-(--text-muted) md:text-base">
        {ORGANISATION_PAGE_CONTENT.body}
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {ORGANISATION_PAGE_CONTENT.points.map((point) => (
          <li
            key={point.title}
            className="flex gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-5 shadow-(--shadow-card)"
          >
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--surface-accent-soft) text-(--status-available-fg)"
            >
              <Check className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-base font-bold text-(--text-heading)">
                {point.title}
              </h2>
              <p className="text-[15px] leading-relaxed text-(--text-muted)">
                {point.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
