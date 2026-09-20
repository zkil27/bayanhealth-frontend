import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { AUDIENCE_CONTENT, type AudienceCard } from "./content";
import { LandingButton } from "./LandingButton";
import { LandingMedia } from "./LandingMedia";

/** The hairline that ties each card to its path. */
const ACCENT_BORDER: Record<AudienceCard["accent"], string> = {
  green: "border-(--gradient-brand-end)",
  blue: "border-(--gradient-brand-start)",
};

/**
 * "Saan mo gustong magsimula?" — the audience split.
 *
 * This replaced a four-up grid of product features ("See a doctor online",
 * "Manage your bookings", ...). The design's judgement is that a visitor's first
 * question is not what the product does but whether it is for them: a family
 * booking a consult and an LGU mapping care gaps need different next steps, and
 * sending both to the same button served neither.
 */
export function FeaturesSection({ features }: { features: AudienceCard[] }) {
  return (
    <section
      id="features"
      aria-labelledby="audience-heading"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 lg:px-8 lg:py-20"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h2
          id="audience-heading"
          className="font-display text-3xl font-bold text-(--text-heading) md:text-4xl"
        >
          {AUDIENCE_CONTENT.heading}
        </h2>
        <p className="text-[15px] text-(--text-muted)">{AUDIENCE_CONTENT.subheading}</p>
      </div>

      <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
        {features.map((audience) => (
          <article
            key={audience.id}
            id={audience.id}
            data-slot="audience-card"
            className={cn(
              "flex h-full scroll-mt-20 flex-col overflow-hidden rounded-(--radius-card) border bg-(--surface-card) shadow-(--shadow-card) transition-all hover:-translate-y-0.5 hover:shadow-(--shadow-md)",
              ACCENT_BORDER[audience.accent],
            )}
          >
            <LandingMedia
              src={audience.imageSrc}
              alt={audience.imageAlt}
              className="aspect-[16/9] w-full rounded-none"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <div className="flex flex-1 flex-col items-start gap-3 p-6">
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-(--radius-md) bg-(--surface-accent-soft) text-(--status-available-fg)"
              >
                <audience.icon className="size-5" />
              </span>
              <h3 className="font-display text-xl font-bold text-(--text-heading)">
                {audience.title}
              </h3>
              <p className="flex-1 text-[15px] leading-relaxed text-(--text-muted)">
                {audience.description}
              </p>
              <LandingButton
                href={audience.cta.href}
                variant={audience.ctaVariant}
                size="sm"
                className="mt-auto"
              >
                {audience.cta.label}
                <ArrowRight className="size-4" aria-hidden />
              </LandingButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
