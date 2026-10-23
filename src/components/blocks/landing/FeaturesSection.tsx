import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  AUDIENCE_CONTENT,
  WAITLIST_CTA,
  type AudienceCard,
  type CareTrack,
} from "./content";
import { LandingButton, LandingTextLink } from "./LandingButton";
import { LandingMedia } from "./LandingMedia";

/**
 * Icon tile per track. Navy and teal only: red is reserved for emergencies and
 * gold for "Soon", so neither may decorate a care path.
 */
const TRACK_ICON: Record<string, string> = {
  "general-consultation": "bg-(--surface-brand) text-(--text-on-brand)",
  "specialist-referral": "bg-(--surface-brand-soft) text-(--text-heading)",
  "clinical-guidelines": "bg-(--surface-accent-soft) text-(--status-available-fg)",
};

/**
 * "Where would you like to start?" — the audience split, with the care tracks
 * folded in.
 *
 * This used to be followed by a second row of three "care track" cards that
 * restated the same choice (consult vs. read up). The tracks now live inside
 * the path they belong to: General consultation and Specialist referral under
 * the consult path, Clinical guidelines under the Med Hub path. The consult
 * path is the page's lead, so it is the wider card and the only one with the
 * solid waitlist button; the reading path carries a text link.
 *
 * The cards are not links as a whole, so they do not lift on hover.
 */
export function FeaturesSection({
  features,
  tracks,
}: {
  features: AudienceCard[];
  tracks: CareTrack[];
}) {
  const trackById = new Map(tracks.map((track) => [track.id, track]));

  return (
    <section
      id="features"
      aria-labelledby="audience-heading"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 lg:px-8 lg:py-24"
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <h2
          id="audience-heading"
          className="font-display text-3xl font-bold tracking-[-0.02em] text-balance text-(--text-heading) md:text-[2.75rem] md:leading-[1.1]"
        >
          {AUDIENCE_CONTENT.heading}
        </h2>
        <p className="text-base leading-relaxed text-(--text-muted)">
          {AUDIENCE_CONTENT.subheading}
        </p>
      </div>

      <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-[1.45fr_1fr]">
        {features.map((audience) => {
          const isLead = audience.ctaVariant === "primary";
          const audienceTracks = audience.trackIds
            .map((id) => trackById.get(id))
            .filter((track): track is CareTrack => Boolean(track));

          return (
            <article
              key={audience.id}
              id={audience.id}
              data-slot="audience-card"
              className={cn(
                "flex h-full scroll-mt-20 flex-col overflow-hidden rounded-(--radius-card) border bg-(--surface-card)",
                isLead
                  ? "border-(--gradient-brand-end) shadow-(--shadow-card)"
                  : "border-(--border-default)",
              )}
            >
              <LandingMedia
                src={audience.imageSrc}
                alt={audience.imageAlt}
                className={cn(
                  "w-full rounded-none",
                  isLead ? "aspect-[16/9] lg:aspect-[2/1]" : "aspect-[16/9]",
                )}
                sizes={
                  isLead
                    ? "(min-width: 1024px) 58vw, 100vw"
                    : "(min-width: 1024px) 40vw, 100vw"
                }
              />
              <div className="flex flex-1 flex-col items-start gap-5 p-6 lg:p-8">
                <div className="flex flex-col gap-2">
                  <h3
                    className={cn(
                      "font-display font-bold text-(--text-heading)",
                      isLead ? "text-2xl lg:text-[1.75rem]" : "text-xl lg:text-2xl",
                    )}
                  >
                    {audience.title}
                  </h3>
                  <p className="max-w-[60ch] text-base leading-relaxed text-(--text-muted)">
                    {audience.description}
                  </p>
                </div>

                {audienceTracks.length > 0 && (
                  <ul className="flex w-full flex-col divide-y divide-(--border-subtle) border-y border-(--border-subtle)">
                    {audienceTracks.map((track) => (
                      <li
                        key={track.id}
                        data-slot="care-track"
                        data-default={track.isDefault ? "true" : undefined}
                        className="flex items-start gap-4 py-4"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-(--radius-sm)",
                            TRACK_ICON[track.id] ??
                              "bg-(--surface-accent-soft) text-(--status-available-fg)",
                          )}
                        >
                          <track.icon className="size-5" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h4 className="text-base font-bold text-(--text-heading)">
                              {track.title}
                            </h4>
                            {track.isDefault && (
                              <span className="rounded-(--radius-pill) bg-(--surface-accent-soft) px-2 py-0.5 text-xs font-bold text-(--status-available-fg)">
                                Start here
                              </span>
                            )}
                          </div>
                          <p className="text-[15px] leading-relaxed text-(--text-body)">
                            {track.description}
                          </p>
                          <p className="text-sm leading-relaxed text-(--text-muted)">
                            {track.note}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
                  {isLead && (
                    <LandingButton href={WAITLIST_CTA.href}>
                      {WAITLIST_CTA.label}
                      <ArrowRight className="size-4" aria-hidden />
                    </LandingButton>
                  )}
                  <LandingTextLink
                    href={audience.cta.href}
                    className="justify-center sm:justify-start"
                  >
                    {audience.cta.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </LandingTextLink>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
