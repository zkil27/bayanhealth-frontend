import Image from "next/image";

import { DOCTORS_CONTENT, type Doctor } from "./content";

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
 * "Care led by Filipino doctors" — the team, shown still.
 *
 * This was an always-moving auto-scroll marquee with no pause control and
 * drag disabled, which fails WCAG 2.2.2 (Pause, Stop, Hide) and ignored
 * `prefers-reduced-motion`. The roster is three people, so it fits on screen:
 * a white band with three columns split by hairlines on desktop, and a stacked
 * list (portrait left, text right) on phones. Nothing is hidden behind a swipe.
 *
 * The section carries no button of its own; the waitlist action sits in the
 * header, the sticky phone bar, and the sections either side.
 */
export function DoctorsSection({ doctors }: { doctors: Doctor[] }) {
  return (
    <section
      id="doctors"
      aria-labelledby="doctors-heading"
      className="scroll-mt-16 border-b border-(--border-subtle) bg-(--surface-card) py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2
            id="doctors-heading"
            className="font-display text-3xl font-bold tracking-[-0.02em] text-balance text-(--text-heading) md:text-[2.75rem] md:leading-[1.1]"
          >
            {DOCTORS_CONTENT.heading}
          </h2>
          <p className="text-base leading-relaxed text-(--text-muted)">
            {DOCTORS_CONTENT.subheading}
          </p>
        </div>

        <ul className="mt-10 grid divide-y divide-(--border-subtle) border-y border-(--border-subtle) md:grid-cols-3 md:divide-x md:divide-y-0 md:border-y-0">
          {doctors.map((doctor) => (
            <li
              key={doctor.name}
              data-slot="doctor-card"
              className="flex items-center gap-4 py-5 md:flex-col md:items-center md:gap-4 md:px-6 md:py-2 md:text-center"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-(--border-default) bg-(--surface-accent-soft) md:size-32">
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-(--status-available-fg) md:text-3xl"
                >
                  {initials(doctor.name)}
                </span>
                <Image
                  src={doctor.imageSrc}
                  alt={doctor.name}
                  fill
                  sizes="(min-width: 768px) 128px, 80px"
                  className="object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-display text-lg font-bold text-(--text-heading)">
                  {doctor.name}
                </h3>
                <p className="text-sm font-bold text-(--text-link)">
                  {doctor.credential}
                </p>
                <p className="text-[15px] leading-relaxed text-(--text-muted)">
                  {doctor.bio}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
