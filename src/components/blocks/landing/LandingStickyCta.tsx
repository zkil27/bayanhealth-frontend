"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { WAITLIST_CTA } from "./content";
import { HERO_SECTION_ID } from "./HeroSection";
import { LandingButtonFill, landingButtonClass } from "./LandingButton";

/**
 * The phone-only waitlist bar (below `sm`), pinned to the bottom of the screen.
 *
 * Once the hero's own button scrolls away, the page's one action would
 * otherwise be a full scroll from the thumb. The bar slides in after the hero
 * leaves the viewport and slides out as soon as the waitlist form is on
 * screen (or has been scrolled past), so it never sits on top of the form it
 * points at or over the footer's legal links.
 *
 * While hidden it is `inert`, so it is out of the tab order and the
 * accessibility tree. The slide honours `prefers-reduced-motion`.
 */
export function LandingStickyCta({
  targetId = "waitlist",
}: {
  /** The id of the waitlist section the bar points at. */
  targetId?: string;
}) {
  const [heroGone, setHeroGone] = useState(false);
  const [targetReached, setTargetReached] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(HERO_SECTION_ID);
    const target = document.getElementById(targetId);
    if (!hero || !target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) {
          setHeroGone(!entry.isIntersecting);
        } else if (entry.target === target) {
          // "Reached" covers both on screen and already scrolled past.
          setTargetReached(
            entry.isIntersecting || entry.boundingClientRect.top < 0,
          );
        }
      }
    });
    observer.observe(hero);
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const visible = heroGone && !targetReached;

  return (
    <div
      data-slot="landing-sticky-cta"
      inert={!visible}
      aria-hidden={!visible || undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-(--border-default) bg-(--surface-card) px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-(--shadow-lg) transition-[translate,visibility] duration-300 ease-out motion-reduce:transition-none sm:hidden",
        // `invisible` as well as off-screen, so iOS overscroll bounce can't reveal it.
        visible ? "visible translate-y-0" : "invisible translate-y-full",
      )}
    >
      <Link
        href={WAITLIST_CTA.href}
        className={landingButtonClass("primary", "md", "w-full")}
      >
        <LandingButtonFill variant="primary" />
        <span className="relative z-10 inline-flex items-center gap-2">
          {WAITLIST_CTA.label}
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
