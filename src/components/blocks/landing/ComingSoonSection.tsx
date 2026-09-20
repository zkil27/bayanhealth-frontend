import Link from "next/link";
import { ArrowRight, Clock, Stethoscope } from "lucide-react";

import { COMING_SOON_CONTENT } from "./content";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";

/**
 * The holding page for a surface that is linked but not built.
 *
 * `title` is a prop rather than content because one route serves every such
 * surface: the visitor arrives having clicked "Case Studies" and must land on a
 * page that says "Case Studies", not a generic "Coming soon" that leaves them
 * wondering whether they mis-clicked.
 */
export function ComingSoonSection({ title }: { title: string }) {
  return (
    <section
      aria-labelledby="coming-soon-heading"
      className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center lg:px-8 lg:py-28"
    >
      <span className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-(--status-soon-bg) px-3 py-1 text-xs font-bold tracking-(--tracking-overline) text-(--status-soon-fg) uppercase">
        <Clock className="size-3.5" aria-hidden />
        {COMING_SOON_CONTENT.eyebrow}
      </span>

      <h1
        id="coming-soon-heading"
        className="font-display text-3xl font-bold text-(--text-heading) md:text-4xl"
      >
        {title}
      </h1>

      <p className="text-[15px] leading-relaxed text-(--text-muted)">
        {COMING_SOON_CONTENT.body}
      </p>

      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href={COMING_SOON_CONTENT.primaryCta.href}
          className={`inline-flex min-h-11 items-center gap-2 rounded-(--radius-pill) bg-(--action-primary) px-5 text-[15px] font-bold text-(--action-primary-text) shadow-(--shadow-btn-inset) transition-colors hover:bg-(--action-primary-hover) ${focusRing}`}
        >
          <Stethoscope className="size-4" aria-hidden />
          {COMING_SOON_CONTENT.primaryCta.label}
        </Link>
        <Link
          href={COMING_SOON_CONTENT.secondaryCta.href}
          className={`inline-flex min-h-11 items-center gap-2 rounded-(--radius-pill) border border-(--action-secondary-border) px-5 text-[15px] font-bold text-(--action-secondary-text) transition-colors hover:bg-(--action-secondary-hover-surface) ${focusRing}`}
        >
          {COMING_SOON_CONTENT.secondaryCta.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <Link
        href={COMING_SOON_CONTENT.homeCta.href}
        className={`mt-2 inline-flex min-h-11 items-center rounded-md text-sm font-medium text-(--text-muted) transition-colors hover:text-(--text-heading) ${focusRing}`}
      >
        {COMING_SOON_CONTENT.homeCta.label}
      </Link>
    </section>
  );
}
