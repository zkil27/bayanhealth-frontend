import { ArrowRight, CircleCheck, Stethoscope, TriangleAlert } from "lucide-react";

import {
  CONSULT_HREF,
  EMERGENCY_NOTICE,
  HERO_ASSURANCES,
  HERO_CONTENT,
} from "./content";
import { HeroImageCycler } from "./HeroImageCycler";
import { LandingButton } from "./LandingButton";

export interface HeroSectionProps {
  variant: "authenticated" | "unauthenticated";
  displayName?: string;
  roleLabel?: string;
  dashboardHref?: string;
}

export function HeroSection({
  variant,
  displayName,
  roleLabel,
  dashboardHref,
}: HeroSectionProps) {
  const isAuthenticated = variant === "authenticated";

  // Split the headline around the gradient-painted phrase so the h1's text
  // content stays exactly HERO_CONTENT.headline.
  const [headlineBefore, headlineAfter] = HERO_CONTENT.headline.split(
    HERO_CONTENT.headlineAccent,
  );

  return (
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
      <div className="flex flex-col items-start gap-5">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-(--status-available-fg) uppercase">
          <Stethoscope className="size-4" aria-hidden />
          {HERO_CONTENT.eyebrow}
        </p>

        {/*
          The single h1 on the page. The authenticated variant greets the signed-in
          user instead of pitching the product to them — they have already bought
          in, and the job of this screen for them is to get out of the way.
        */}
        <h1 className="font-display text-4xl leading-[1.08] font-bold text-balance text-(--text-heading) md:text-5xl">
          {isAuthenticated && displayName ? (
            `Welcome back, ${displayName}`
          ) : (
            <>
              {headlineBefore}
              <span className="text-gradient-brand">
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
            <p className="font-script text-xl text-(--action-primary) italic">
              {HERO_CONTENT.script}
            </p>
            <p className="max-w-(--measure) text-[17px] leading-relaxed text-(--text-muted)">
              {HERO_CONTENT.body}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <LandingButton href={CONSULT_HREF}>
                <Stethoscope className="size-4" aria-hidden />
                Join Our Waitlist
              </LandingButton>
              <LandingButton href="/#paano-ito-gumagana" variant="secondary">
                <CircleCheck className="size-4" aria-hidden />
                See How It Works
              </LandingButton>
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

            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
              {HERO_ASSURANCES.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2 whitespace-nowrap text-sm text-(--text-muted)"
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
        className="aspect-[4/3] w-full shadow-(--shadow-lg)"
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
    </section>
  );
}
