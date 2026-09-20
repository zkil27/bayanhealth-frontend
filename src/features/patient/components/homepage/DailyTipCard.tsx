"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";

import { initialsOf } from "@/lib/utils";
import { DOCTORS } from "@/components/blocks/landing";

/**
 * General public-health guidance — water, sleep, movement, taking maintenance
 * medicine on schedule, a yearly blood-pressure check. Nothing here is advice
 * for a condition, a dose, or a symptom: that belongs to a consultation. The
 * last line points anyone with a real concern at booking one.
 */
const HEALTH_TIPS: readonly string[] = [
  "Aim for 6–8 glasses of water through the day — more when it is hot or you have been active.",
  "Keep a consistent sleep and wake time, even on weekends, to steady your energy.",
  "Take maintenance medicines at the same time each day; pair them with a routine like breakfast.",
  "A 20–30 minute walk on most days is one of the most reliable things you can do for your heart.",
  "Wash your hands for 20 seconds before meals and after being out to lower your risk of infection.",
  "If you sit for long stretches, stand and stretch for a minute or two every hour.",
  "Have your blood pressure checked at least once a year, even when you feel well.",
  "Fill half your plate with vegetables or fruit at your main meals.",
  "Go easy on sugary drinks — they add up fast and leave you hungrier later.",
  "If a symptom is new, getting worse, or worrying you, book a consultation rather than waiting it out.",
];

/**
 * The daily health tip, presented by one of the BayanHealth physicians.
 *
 * Both the tip and the doctor are picked by the calendar day, so the card is the
 * same for everyone and stable for a whole day rather than reshuffling on every
 * render. The index is resolved after mount — the same guard `ScheduledHero`'s
 * countdown uses — so server and client agree on the first frame.
 *
 * **On the attribution.** The physicians are real: `DOCTORS` is team information
 * supplied by the business (name, credential, headshot), the same roster the
 * landing page shows. The tip lines are general public-health guidance, not
 * quotations — which is why they are set as plain copy and never in quote marks,
 * and why the card reads "shared by" rather than putting words in a named
 * clinician's mouth. If the team wants these to be each doctor's own words,
 * attach a `tips` array to the `DOCTORS` entries and read it here; the pairing
 * below becomes one line.
 */
/** The day's tip and the physician presenting it, without card chrome. */
export function DailyTipBody({ headingId }: { headingId?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(dayOfYear(new Date()));
  }, []);

  const tip = HEALTH_TIPS[index % HEALTH_TIPS.length]!;
  const doctor = DOCTORS[index % DOCTORS.length]!;

  return (
    <>
      <p
        id={headingId}
        className="flex items-center gap-1.5 text-[12px] font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase"
      >
        <Lightbulb className="size-3.5 shrink-0" />
        Daily health tip
      </p>

      <p className="text-[15px] leading-[1.55] text-(--text-body)">{tip}</p>

      <div className="mt-auto flex items-center gap-2.5 border-t border-(--border-subtle) pt-3">
        <DoctorAvatar name={doctor.name} imageSrc={doctor.imageSrc} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold text-(--text-heading)">
            {doctor.name}
          </p>
          <p className="truncate text-[12px] text-(--text-muted)">
            {doctor.credential} · shared by the BayanHealth medical team
          </p>
        </div>
      </div>
    </>
  );
}

/** The standalone card, used on the Health page's Overview. */
export function DailyTipCard() {
  return (
    <section
      data-slot="patient-home-tip"
      aria-labelledby="daily-tip-heading"
      className="flex h-full flex-col gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card)"
    >
      <DailyTipBody headingId="daily-tip-heading" />
    </section>
  );
}

/**
 * The headshot, falling back to initials if the portrait fails to load — the
 * same treatment the landing carousel gives it. A plain `img`: this is a 40px
 * avatar of a local asset, so Next's optimiser buys nothing here.
 */
function DoctorAvatar({
  name,
  imageSrc,
}: {
  name: string;
  imageSrc: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-(--radius-pill) bg-(--surface-brand) text-[13px] font-bold text-(--text-on-brand)"
      >
        {initialsOf(name, "BH")}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt=""
      width={40}
      height={40}
      onError={() => setFailed(true)}
      className="size-10 shrink-0 rounded-(--radius-pill) object-cover"
    />
  );
}

function dayOfYear(now: Date): number {
  return Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(now.getUTCFullYear(), 0, 0)) /
      86_400_000,
  );
}
