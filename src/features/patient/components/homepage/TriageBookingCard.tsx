import Link from "next/link";
import { CalendarClock, Zap } from "lucide-react";

/** The forest-teal action hero: a subtle diagonal deepen toward brand navy. */
const HERO_GRADIENT =
  "bg-[linear-gradient(135deg,var(--surface-nav)_0%,color-mix(in_srgb,var(--surface-nav)_78%,var(--navy-900))_100%)]";

/**
 * The rail's primary action: start a consultation now, or schedule one.
 *
 * This is the reference layout's bottom-left card — where the mockup puts a
 * saved payment method, which this product has no store for. The triage CTA
 * takes the slot instead: it is the single most valuable action on the page and
 * it was previously buried in a full-width hero.
 *
 * It renders only in the states where booking is the right offer. When a doctor
 * is already in the room `PatientHome` withholds it and gives the whole fold to
 * the live cockpit — an offer to "consult now" beside "your consultation has
 * started" is the exact contradiction the state machine exists to prevent.
 */
export function TriageBookingCard() {
  return (
    <section
      data-slot="patient-home-triage"
      aria-labelledby="triage-heading"
      className={`flex flex-col gap-2 overflow-hidden rounded-(--radius-canvas) ${HERO_GRADIENT} p-4 text-(--text-on-brand) shadow-(--shadow-float)`}
    >
      <span className="inline-flex w-fit items-center gap-1.5 rounded-(--radius-pill) bg-(--surface-nav-accent)/20 px-2.5 py-0.5 text-[10px] font-bold tracking-(--tracking-overline) text-(--surface-nav-accent) uppercase">
        <Zap className="size-3" aria-hidden /> On-demand care
      </span>
      <div>
        <h2
          id="triage-heading"
          className="text-[17px] leading-tight font-bold text-(--text-on-brand)"
        >
          Need a doctor today?
        </h2>
        <p className="mt-1 text-[12.5px] leading-[1.4] text-(--text-on-brand)/85">
          Connect with a PRC-licensed physician in ~5–15 mins.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/patient/booking/createBooking?mode=on-demand"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-(--radius-pill) bg-(--surface-nav-accent) px-4 py-2.5 text-[14px] font-bold text-(--text-on-accent) shadow-(--shadow-sm) transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-(--action-primary-hover) hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--surface-card) motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Zap className="size-4" aria-hidden />
          Consult Now
        </Link>
        <Link
          href="/patient/booking/search"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-(--radius-pill) border border-(--text-on-brand)/35 px-4 py-2.5 text-[13px] font-semibold text-(--text-on-brand) transition-colors hover:bg-(--text-on-brand)/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--surface-card)"
        >
          <CalendarClock className="size-4" aria-hidden />
          Book for Later
        </Link>
      </div>
    </section>
  );
}
