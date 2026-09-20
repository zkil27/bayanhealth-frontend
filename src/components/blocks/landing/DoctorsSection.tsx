"use client";

import Image from "next/image";
import { useState } from "react";
import AutoScroll from "embla-carousel-auto-scroll";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import { DOCTORS_CONTENT, type Doctor } from "./content";
import { LandingButton } from "./LandingButton";

/** "Dr. Marco Paolo Perpetua" -> "MP" — the fallback behind a headshot. */
function initials(name: string) {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const picks = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return picks.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

/**
 * "Care led by Filipino doctors" — the team, as an always-moving marquee.
 *
 * The roster is short, so the track is the list repeated three times: that
 * gives Embla enough width to overflow (a track that fits its viewport can't
 * scroll) and enough runway that the loop has no visible seam. Only the first
 * copy is exposed to assistive tech; the rest are decorative duplicates.
 *
 * The plugin instance is created once via a lazy state initialiser — a fresh
 * one on every render would re-initialise the carousel and cancel the scroll.
 *
 * The closing button is a stand-in: it routes to the waitlist for now and
 * becomes a real "talk to a doctor" action once live consults ship (see
 * {@link DOCTORS_CONTENT}).
 */
export function DoctorsSection({ doctors }: { doctors: Doctor[] }) {
  const [autoScroll] = useState(() =>
    AutoScroll({
      speed: 1.4,
      startDelay: 0,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
    }),
  );

  const track = [...doctors, ...doctors, ...doctors];

  return (
    <section
      id="doctors"
      aria-labelledby="doctors-heading"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 lg:px-8 lg:py-20"
    >
      <div className="flex max-w-2xl flex-col gap-2">
        <h2
          id="doctors-heading"
          className="font-display text-3xl font-bold text-balance text-(--text-heading) md:text-4xl"
        >
          {DOCTORS_CONTENT.heading}
        </h2>
        <p className="text-[15px] leading-relaxed text-(--text-muted)">
          {DOCTORS_CONTENT.subheading}
        </p>
      </div>

      <Carousel
        opts={{ align: "start", loop: true, watchDrag: false }}
        plugins={[autoScroll]}
        className="mt-10"
      >
        <CarouselContent>
          {track.map((doctor, index) => {
            const isClone = index >= doctors.length;
            return (
              <CarouselItem
                key={`${doctor.name}-${index}`}
                data-slot={isClone ? undefined : "doctor-card"}
                aria-hidden={isClone || undefined}
                className="basis-4/5 sm:basis-1/2 lg:basis-1/3"
              >
                <article className="flex h-full flex-col items-center gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-6 text-center shadow-(--shadow-card)">
                  <div className="relative size-24 overflow-hidden rounded-full border border-(--border-subtle)">
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center bg-(--surface-accent-soft) font-display text-xl font-bold text-(--status-available-fg)"
                    >
                      {initials(doctor.name)}
                    </span>
                    <Image
                      src={doctor.imageSrc}
                      alt={isClone ? "" : doctor.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-display text-base font-bold text-(--text-heading)">
                      {doctor.name}
                    </h3>
                    <p className="text-[13px] font-medium text-(--text-link)">
                      {doctor.credential}
                    </p>
                  </div>
                  <p className="text-[13px] leading-relaxed text-(--text-muted)">
                    {doctor.bio}
                  </p>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="mt-8 flex justify-center">
        <LandingButton href={DOCTORS_CONTENT.cta.href}>
          {DOCTORS_CONTENT.cta.label}
        </LandingButton>
      </div>
    </section>
  );
}
