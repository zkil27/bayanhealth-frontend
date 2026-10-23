import { ArrowDown, ArrowRight, TriangleAlert } from "lucide-react";

import {
  EMERGENCY_NOTICE,
  HERO_ASSURANCES,
  HERO_CONTENT,
  WAITLIST_CTA,
} from "./content";
import { HeroImageCycler } from "./HeroImageCycler";
import { LandingButton, LandingTextLink } from "./LandingButton";

export interface HeroSectionProps {
  variant: "authenticated" | "unauthenticated";
  displayName?: string;
  roleLabel?: string;
  dashboardHref?: string;
}

/** Observed by {@link LandingStickyCta}: the phone CTA bar appears once this scrolls away. */
export const HERO_SECTION_ID = "hero";

export function HeroSection({
  variant,
  displayName,
  roleLabel,
  dashboardHref,
}: HeroSectionProps) {
  const isAuthenticated = variant === "authenticated";

  // Split the headline around the accent phrase so the h1's text content
  // stays exactly HERO_CONTENT.headline.
  const [headlineBefore, headlineAfter] = HERO_CONTENT.headline.split(
    HERO_CONTENT.headlineAccent,
  );

  return (
    <section
      id={HERO_SECTION_ID}
      className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8 lg:py-20"
    >
      <div className="flex flex-col items-start gap-5">
        {/*
          The single h1 on the page. The authenticated variant greets the signed-in
          user instead of pitching the product to them — they have already bought
          in, and the job of this screen for them is to get out of the way.

          The accent is solid Brand Teal rather than the gradient: emphasis
          comes from colour against navy, not from gradient-clipped text.
        */}
        <h1 className="font-display text-[2.5rem] leading-[1.05] font-bold tracking-[-0.02em] text-balance text-(--text-heading) md:text-6xl">
          {isAuthenticated && displayName ? (
            `Welcome back, ${displayName}`
          ) : (
            <>
              {headlineBefore}
              <span className="text-(--action-primary)">
                {HERO_CONTENT.headlineAccent}
              </span>
              {headlineAfter}
            </>
          )}
        </h1>

        {isAuthenticated ? (
          <>
            {roleLabel ? (
              <span className="rounded-(--radius-pill) bg-(--surface-accent-soft) px-3 py-1 text-sm font-bold text-(--status-available-fg) capitalize">
                {roleLabel}
              </span>
            ) : null}
            {dashboardHref ? (
              <LandingButton href={dashboardHref}>
                Go to Dashboard
                <ArrowRight className="size-4" aria-hidden />
              </LandingButton>
            ) : null}
          </>
        ) : (
          <>
            <p className="font-script text-2xl text-(--action-primary)">
              {HERO_CONTENT.script}
            </p>
            <p className="max-w-(--measure) text-lg leading-relaxed text-(--text-muted)">
              {HERO_CONTENT.body}
            </p>

            {/*
              One solid action. "See how it works" is a text link so the reader
              is never asked to pick between two equally loud buttons.
            */}
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
              <LandingButton href={WAITLIST_CTA.href}>
                {WAITLIST_CTA.label}
                <ArrowRight className="size-4" aria-hidden />
              </LandingButton>
              <LandingTextLink
                href="/#paano-ito-gumagana"
                className="justify-center sm:justify-start"
              >
                See how it works
                <ArrowDown className="size-4" aria-hidden />
              </LandingTextLink>
            </div>

            {/*
              Placed directly under the call to action, not tucked into the
              footer alone: this is the one line on the page whose absence could
              cause harm, and it has to be read at the moment someone decides to
              book rather than after they have.
            */}
            <p
              role="note"
              data-slot="emergency-notice"
              className="flex max-w-(--measure) items-start gap-2 rounded-(--radius-md) border border-(--danger-border) bg-(--danger-bg) p-3 text-sm text-(--danger-fg)"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {EMERGENCY_NOTICE}
            </p>

            <ul className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
              {HERO_ASSURANCES.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2 text-sm font-medium text-(--text-body)"
                >
                  <item.icon
                    className="size-4 shrink-0 text-(--status-available-fg)"
                    aria-hidden
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <HeroImageCycler
        images={HERO_CONTENT.images}
        alt={HERO_CONTENT.imageAlt}
        priority
        className="aspect-[4/3] w-full shadow-(--shadow-lg) lg:aspect-[5/4]"
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
    </section>
  );
}
