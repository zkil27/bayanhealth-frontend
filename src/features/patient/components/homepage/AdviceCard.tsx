"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

import { DailyTipBody } from "./DailyTipCard";
import { dashboardLinkClass } from "./dashboardLink";

/**
 * "Advice" — the day's guidance, and the route to the real clinical corpus.
 *
 * No outer "Advice" heading: {@link DailyTipBody} already leads with its own
 * "Daily health tip" label, so a second title above it was redundant chrome.
 *
 * The tip comes from {@link DailyTipBody}: general public-health guidance paired
 * with a physician from the real `DOCTORS` roster, deliberately not in quote
 * marks — the physicians are real people and the lines are not their words.
 *
 * The footer links out to the Med Hub rather than embedding it: that is a full
 * screen with its own filters and protocol reader at
 * `/patient/health?tab=medhub`.
 */
export function AdviceCard() {
  return (
    <section
      data-slot="patient-home-advice"
      aria-labelledby="advice-tip-heading"
      className="flex h-full flex-col gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-sunken) p-4"
    >
      <DailyTipBody headingId="advice-tip-heading" />

      <Link
        href="/patient/health?tab=medhub"
        className={dashboardLinkClass(
          "mt-auto border-t border-(--border-subtle) pt-3",
        )}
      >
        <BookOpen className="size-3.5 shrink-0" aria-hidden />
        Open Med Hub — DOH, PAFP &amp; WHO guidelines
      </Link>
    </section>
  );
}
