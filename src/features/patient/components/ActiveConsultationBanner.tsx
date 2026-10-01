"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Video, X } from "lucide-react";
import {
  getActiveConsultation,
  type ActiveConsultationRef,
} from "@/lib/patient/activeConsultationStorage";
import { cn } from "@/lib/utils";

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
      className="sticky top-0 z-50 w-full shrink-0 border-b border-teal-600/40 bg-teal-900 text-white shadow-md transition-all duration-200"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3.5 py-2 sm:px-6 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full rounded-full bg-teal-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-teal-300" />
          </span>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold truncate">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-teal-800/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-teal-200">
              <Video className="size-3 text-teal-300" />
              {isLiveRoom ? "Live Call" : "Aktibong Konsulta"}
            </span>
            <span className="truncate">
              {isLiveRoom
                ? "Bukas pa ang iyong consultation room."
                : "May naghihintay kang konsulta sa telemedisina."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={targetHref}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-(--action-primary) px-3.5 text-xs font-bold text-(--action-primary-text) shadow-sm hover:brightness-105 active:scale-[0.98] transition-all"
          >
            <span>Bumalik sa Konsulta</span>
            <ArrowRight className="size-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => setDismissedBookingId(active.bookingId)}
            className="size-7 flex items-center justify-center rounded-full text-teal-300 hover:text-white hover:bg-teal-800/50 transition-colors"
            title="Itago pansamantala"
            aria-label="Itago ang paalala"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
