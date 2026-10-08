"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Video, X } from "lucide-react";
import {
  getActiveConsultation,
  type ActiveConsultationRef,
} from "@/lib/patient/activeConsultationStorage";

/**
 * Omnipresent Active Consultation Banner.
 *
 * Appears across all patient pages (/patient, /patient/health, /patient/records,
 * /patient/profile, etc.) whenever the patient has an in-flight, unfinished, or
 * live consultation room session. Ensures the patient never loses their place
 * if they accidentally navigate out of the consultation room or booking wizard.
 */
export function ActiveConsultationBanner() {
  const [active, setActive] = useState<ActiveConsultationRef | null>(null);
  const [dismissedBookingId, setDismissedBookingId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Initial read
    setActive(getActiveConsultation());

    const handleActiveChange = (e: Event) => {
      const custom = e as CustomEvent<ActiveConsultationRef | null>;
      setActive(custom.detail ?? getActiveConsultation());
    };

    window.addEventListener("bayanhealth:active-consultation-change", handleActiveChange);
    window.addEventListener("storage", () => setActive(getActiveConsultation()));

    return () => {
      window.removeEventListener("bayanhealth:active-consultation-change", handleActiveChange);
    };
  }, []);

  if (!active || !active.bookingId) return null;
  if (dismissedBookingId === active.bookingId) return null;

  // Do not show banner if the user is already on that booking's detail or room page
  if (
    pathname.includes(`/consultation/room/${active.bookingId}`) ||
    pathname.includes(`/patient/booking/getBooking/${active.bookingId}`)
  ) {
    return null;
  }

  const isLiveRoom = active.stage === "room" || active.status === "in_progress";
  const targetHref = isLiveRoom
    ? `/consultation/room/${encodeURIComponent(active.bookingId)}`
    : `/patient/booking/getBooking/${encodeURIComponent(active.bookingId)}`;

  return (
    <aside
      role="banner"
      aria-label="Aktibong Konsulta"
      data-slot="active-consultation-banner"
      className="sticky top-0 z-50 w-full shrink-0 border-b border-(--border-subtle) bg-(--surface-card) text-(--text-body) shadow-(--shadow-xs) transition-colors duration-200"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3.5 py-2 sm:px-6 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="flex size-7.5 sm:size-8 shrink-0 items-center justify-center rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-accent-soft) text-(--status-available-fg)">
            <Video className="size-3.5 sm:size-4" aria-hidden />
          </span>

          <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs sm:text-sm font-bold text-(--text-heading) truncate">
              {isLiveRoom ? "Bukas ang iyong consultation room" : "May aktibong konsulta"}
            </span>
            <span className="hidden sm:inline text-(--text-subtle)">•</span>
            <span className="text-[11px] sm:text-xs text-(--text-muted) truncate">
              {isLiveRoom
                ? "Nandito ang doktor o naghihintay sa video call."
                : "May naghihintay kang sesyon sa telemedisina."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={targetHref}
            className="inline-flex min-h-9 sm:min-h-8 items-center justify-center gap-1.5 rounded-(--radius-pill) bg-(--action-primary) px-3.5 py-1.5 text-xs font-bold text-(--action-primary-text) shadow-(--shadow-xs) hover:bg-(--action-primary-hover) active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            <span>Bumalik sa Konsulta</span>
            <ArrowRight className="size-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setDismissedBookingId(active.bookingId)}
            className="flex size-9 sm:size-8 items-center justify-center rounded-(--radius-md) text-(--text-muted) hover:bg-(--surface-warm) hover:text-(--text-heading) transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            title="Itago pansamantala"
            aria-label="Itago ang paalala"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
