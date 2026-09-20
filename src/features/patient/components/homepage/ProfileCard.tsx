"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Droplet, Ruler, Weight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn, initialsOf } from "@/lib/utils";
import { useUserId } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

import { dashboardLinkClass } from "./dashboardLink";

/**
 * The patient's identity card — top of the left rail.
 *
 * Laid out to the reference: a circular avatar that **juts out** past the top
 * edge of the card, then a centred name + sub-line, then a three-up stat row
 * (mini coloured label over a large value with a small unit).
 *
 * **On the stat strip.** The reference's strip is Blood · Height · Weight, and
 * those are the three now shown. `bloodType` is a real stored profile attribute
 * (`PUT /v1/patients/me/profile`, one of the eight ABO/Rh groups); an unset value
 * renders `--`, exactly like an unfilled height or weight. Height and weight the
 * intake has always collected.
 *
 * The avatar is initials, not a photo: there is no patient portrait anywhere in
 * the API. `PersonDataSection.populateSelfData()` copies these fields into a new
 * booking's intake, and `useProfile` now writes them all through to
 * `PUT /v1/patients/me/profile` (`isPersisted: true`).
 */
export function ProfileCard({ displayName }: { displayName: string }) {
  const userId = useUserId();
  const { profile, isLoading } = useProfile(userId);

  // The saved profile name wins; the greeting's name is the fallback, so the
  // card and the session greeting never disagree.
  const name = profile?.name?.trim() || displayName;

  const bloodStat = profile?.bloodType?.trim() || undefined;
  const heightStat = numeric(profile?.height);
  const weightStat = numeric(profile?.weight);

  // Today, in English ("Thursday · September 11, 2026"). Read after mount, never
  // during render: `new Date()` in render is impure and lets a server/client
  // timezone difference produce a hydration mismatch on this line.
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
    const date = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayLabel([weekday, date].join(" · "));
  }, []);

  return (
    <section
      data-slot="patient-home-profile"
      aria-labelledby="profile-card-heading"
      className="relative mt-6 flex flex-col items-center gap-3 rounded-(--radius-canvas) border border-(--border-subtle) bg-(--surface-card) p-4 pt-12 text-center shadow-(--shadow-float)"
    >
      {/* The avatar breaks the top border — half above the card, ringed in the
          page ground so the overlap reads as intentional, not a clipping bug.
          `pt-12` on the card keeps the greeting clear of the half that sits
          inside. */}
      <Link
        href="/patient/profile"
        aria-label="Open your profile"
        className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-(--surface-brand) text-base font-bold text-(--text-on-brand) shadow-md ring-4 ring-(--surface-page)">
          {initialsOf(name, "U")}
        </span>
      </Link>

      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-bold tracking-wider text-(--status-available-fg) uppercase">
          Kumusta,
        </span>
        <h2
          id="profile-card-heading"
          className="text-lg leading-tight font-bold text-(--text-heading)"
        >
          {name}
        </h2>
        <span className="text-[12px] font-medium text-(--text-subtle)">
          {todayLabel ?? " "}
        </span>
      </div>

      {isLoading ? (
        <div className="grid w-full grid-cols-3 gap-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-(--radius-sm) bg-(--gray-bg)"
            />
          ))}
        </div>
      ) : (
        <dl className="grid w-full grid-cols-3 divide-x divide-(--border-subtle) border-t border-(--border-subtle) pt-3">
          <Stat icon={Droplet} label="Blood type" value={bloodStat} />
          <Stat icon={Ruler} label="Height" value={heightStat} unit="cm" />
          <Stat icon={Weight} label="Weight" value={weightStat} unit="kg" />
        </dl>
      )}

      <Link
        href="/patient/profile/details"
        className={dashboardLinkClass("text-[12.5px]")}
      >
        Update health details
        <ArrowRight />
      </Link>
    </section>
  );
}

/** One cell of the three-up strip: a mini coloured label over a large value. */
function Stat({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  unit?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1">
      <dt className="flex items-center gap-1 text-[10px] font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
        <Icon className="size-3 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd
        className={cn(
          "flex min-w-0 items-baseline justify-center gap-0.5 text-[20px] leading-none font-bold",
          value ? "text-(--text-heading)" : "text-(--text-subtle)",
        )}
      >
        <span className="truncate">{value ?? "--"}</span>
        {value && unit ? (
          <span className="text-[11px] font-semibold text-(--text-muted)">
            {unit}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

/** Strip any unit the patient typed, so the strip renders one consistently. */
function numeric(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  const match = v.match(/[\d.]+/);
  return match ? match[0] : v;
}
