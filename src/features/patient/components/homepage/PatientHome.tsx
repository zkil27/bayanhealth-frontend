"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  ArrowRight,
  Bell,
  BriefcaseMedical,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
  LayoutGrid,
  Phone,
  Pill,
  Search,
  ShieldAlert,
  Stethoscope,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatDoctorName } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { derivePatientHomeState, type PatientHomeDerivation } from "@/lib/patient/patientHomeState";
import { fetchBookingPage, type BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { formatConsultationDateTime } from "@/lib/consultation-time";
import { BrandLinkButton } from "@/features/patient/components/redesign/primitives";
import { patientPageClass } from "@/features/patient/components/PatientPage";
import { getActiveConsultation } from "@/lib/patient/activeConsultationStorage";

/** Quick triage symptoms tailored for elderly and family users (text-only, no emojis). */
const QUICK_SYMPTOMS = [
  { label: "Fever", query: "lagnat" },
  { label: "Cough and colds", query: "ubo-sipon" },
  { label: "Headache", query: "sakit-ng-ulo" },
  { label: "Stomach ache", query: "sakit-ng-tiyan" },
  { label: "Itching", query: "pangangati" },
  { label: "Body aches", query: "sakit-ng-katawan" },
] as const;

/** 8-tile 4×2 Grab-inspired services grid with single scannable labels (zero truncation). */
const SERVICE_TILES = [
  {
    title: "Consult",
    href: "/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult",
    icon: Video,
    tone: "teal",
  },
  {
    title: "Schedule",
    href: "/patient/booking/search",
    icon: CalendarClock,
    tone: "navy",
  },
  {
    title: "Fit to Work",
    href: "/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult",
    icon: BriefcaseMedical,
    tone: "navy",
  },
  {
    title: "Sick Leave",
    href: "/patient/booking/createBooking?mode=on-demand&serviceRequested=sick-leave",
    icon: FileText,
    tone: "navy",
  },
  {
    title: "Prescription",
    href: "/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult",
    icon: Pill,
    tone: "teal",
  },
  {
    title: "Lab Review",
    href: "/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult",
    icon: FlaskConical,
    tone: "teal",
  },
  {
    title: "Records",
    href: "/patient/health",
    icon: HeartPulse,
    tone: "teal",
  },
  {
    title: "All services",
    href: "/patient/booking",
    icon: LayoutGrid,
    tone: "neutral",
  },
] as const;

/**
 * Unified Patient Home (`/patient`).
 *
 * Designed mobile-first using clean Grab-style scannability principles:
 * - Top search and quick notification access
 * - Emergency interceptor strip with direct dialable action
 * - Quick symptom chips
 * - State-driven Live Activity card (Live Room, Scheduled, Post-Consult, Idle)
 * - 4×2 service grid with single scannable labels and 48px+ touch targets
 * - "For you" curated clinical health guidance
 *
 * Scales responsively on desktop (`lg+`) with a spacious two-column
 * layout (`lg:max-w-6xl xl:max-w-7xl`) while preserving mobile ergonomic
 * perfection across all screen sizes.
 */
export function PatientHome() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
    router.push(`/patient/booking/search?name=${encodeURIComponent(trimmed)}`);
  };

  const filteredSymptoms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return QUICK_SYMPTOMS;
    return QUICK_SYMPTOMS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.query.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["patient-home-bookings", idToken],
    queryFn: () => fetchBookingPage(idToken ?? "", undefined, 20),
    enabled: !!idToken,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 15,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    retry: false,
    throwOnError: false,
  });

  const cachedActive = useMemo(() => getActiveConsultation(), []);
  const bookings = useMemo(() => {
    const list = data?.bookings ?? [];
    if (list.length === 0 && cachedActive?.bookingId) {
      const mock: BookingListItem = {
        bookingId: cachedActive.bookingId,
        status: cachedActive.status || (cachedActive.stage === "room" ? "in_progress" : "confirmed"),
        serviceType: cachedActive.serviceType || "teleconsult",
        updatedAt: new Date(cachedActive.updatedAt).toISOString(),
      };
      return [mock];
    }
    return list;
  }, [data?.bookings, cachedActive]);

  const derivation = useMemo(
    () => derivePatientHomeState(bookings),
    [bookings],
  );

  return (
    <div
      data-slot="patient-home"
      className="flex w-full flex-1 flex-col justify-start"
    >
      {/* ----------------------------- 1. Top Bar: Search & Notification */}
      <header
        data-slot="patient-home-topbar"
        className="relative z-50 w-full m-0 p-0 border-0 border-none bg-(--teal-750) shadow-none dark:bg-(--surface-nav) pt-[env(safe-area-inset-top,0px)]"
      >
        <div className="w-full px-4 py-3 sm:px-6 md:px-8 lg:pl-[18rem] lg:pr-8">
          <div
            ref={searchContainerRef}
            className="relative flex w-full items-center gap-2.5"
          >
            <form
              role="search"
              onSubmit={handleSearchSubmit}
              className="relative flex min-w-0 flex-1 items-center"
            >
              <Search
                className="pointer-events-none absolute left-3.5 size-4 text-(--text-muted)"
                aria-hidden
              />
              <input
                ref={searchInputRef}
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isSearchOpen) setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsSearchOpen(false);
                    searchInputRef.current?.blur();
                  }
                }}
                placeholder="Search symptoms or doctors…"
                role="combobox"
                aria-expanded={isSearchOpen}
                aria-haspopup="listbox"
                aria-controls="patient-home-search-dropdown"
                className="h-10 w-full rounded-(--radius-card) border border-(--border-default) bg-(--surface-card) pr-9 pl-10 text-[16px] sm:text-[14px] text-(--text-heading) shadow-(--shadow-xs) placeholder:text-(--text-subtle) focus-visible:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 flex size-7 items-center justify-center rounded-full text-(--text-muted) hover:bg-(--surface-warm) hover:text-(--text-heading)"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </form>

            <Link
              href="/patient/health"
              aria-label="View your notifications"
              onClick={() => setIsSearchOpen(false)}
              className="flex size-10 shrink-0 items-center justify-center rounded-(--radius-card) border border-white/25 bg-white/10 text-white shadow-xs transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Bell className="size-5" />
            </Link>

            {/* Mobile-friendly Search & Quick Symptoms Dropdown (spans full width including space below notification bell) */}
            {isSearchOpen && (
              <div
                id="patient-home-search-dropdown"
                data-slot="patient-home-search-dropdown"
                className="absolute top-full left-0 right-0 z-50 mt-2 flex max-h-[calc(100vh-140px)] flex-col gap-3 overflow-y-auto rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-3.5 shadow-2xl transition-all"
              >
                {searchQuery.trim() ? (
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="flex min-h-11 w-full items-center gap-2.5 rounded-(--radius-md) bg-(--surface-warm) px-3 py-2.5 text-left text-[13px] font-semibold text-(--action-primary) hover:bg-(--surface-accent-soft) transition-colors"
                    >
                      <Search className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">
                        Search doctors for: <strong className="font-bold underline decoration-(--action-primary)/40 decoration-2 underline-offset-2">&ldquo;{searchQuery}&rdquo;</strong>
                      </span>
                    </button>

                    <Link
                      href="/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult"
                      onClick={() => setIsSearchOpen(false)}
                      className="flex min-h-11 items-center gap-2.5 rounded-(--radius-md) border border-(--border-subtle) px-3 py-2.5 text-[13px] font-semibold text-(--text-heading) hover:bg-(--surface-warm) transition-colors"
                    >
                      <Video className="size-4 shrink-0 text-(--status-available-fg)" aria-hidden />
                      <span>Consult now (on-demand)</span>
                    </Link>

                    <div className="pt-1">
                      <p className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide">
                        Related symptoms
                      </p>
                      {filteredSymptoms.length > 0 ? (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {filteredSymptoms.map(({ label, query }) => (
                            <Link
                              key={query}
                              href="/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult"
                              onClick={() => setIsSearchOpen(false)}
                              className="group flex min-h-11 items-center justify-between rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-warm) px-3.5 py-2.5 text-[13.5px] font-semibold text-(--text-heading) shadow-(--shadow-xs) hover:border-(--action-primary) hover:bg-(--surface-accent-soft) hover:text-(--action-primary) active:scale-[0.99] transition-all"
                            >
                              <span>{label}</span>
                              <ChevronRight className="size-4 text-(--text-muted) transition-colors group-hover:text-(--action-primary)" />
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 rounded-(--radius-md) bg-(--surface-warm)/60 p-3 text-center text-xs text-(--text-muted)">
                          No symptoms match &ldquo;{searchQuery}&rdquo;.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-(--border-subtle) pb-2">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-(--status-available-fg) uppercase">
                        <Stethoscope className="size-3.5" aria-hidden />
                        Common symptoms
                      </span>
                      <span className="text-[11px] font-medium text-(--text-muted)">
                        Pick one before you consult
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {QUICK_SYMPTOMS.map(({ label, query }) => (
                        <Link
                          key={query}
                          href="/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult"
                          onClick={() => setIsSearchOpen(false)}
                          className="group flex min-h-11 items-center justify-between rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-warm) px-3.5 py-2.5 text-[13.5px] font-semibold text-(--text-heading) shadow-(--shadow-xs) hover:border-(--action-primary) hover:bg-(--surface-accent-soft) hover:text-(--action-primary) active:scale-[0.99] transition-all"
                        >
                          <span>{label}</span>
                          <ChevronRight className="size-4 text-(--text-muted) transition-colors group-hover:text-(--action-primary)" />
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-(--border-subtle) pt-2">
                      <Link
                        href="/patient/booking/search"
                        onClick={() => setIsSearchOpen(false)}
                        className="flex min-h-11 items-center justify-between rounded-(--radius-md) px-3 py-2 text-[13px] font-semibold text-(--text-heading) hover:bg-(--surface-warm) hover:text-(--action-primary) transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Search className="size-4 text-(--action-primary)" aria-hidden />
                          See all doctors
                        </span>
                        <ChevronRight className="size-4 text-(--text-muted)" aria-hidden />
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dimmed backdrop scrim when search is open */}
      {isSearchOpen && (
        <div
          data-slot="patient-home-search-backdrop"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
          onClick={() => setIsSearchOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Home Content */}
      <div
        className={patientPageClass(
          "wide",
          "min-h-full justify-start gap-4 pt-4 pb-4 sm:pb-4",
        )}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 lg:max-w-none lg:mx-0 lg:gap-5">
          {/* --------------------------------------- 2. Emergency Interceptor Strip */}
        <aside
          role="note"
          aria-label="Emergency notice"
          className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-(--danger-border) bg-(--danger-bg) p-3 text-(--danger-fg) shadow-(--shadow-xs)"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <ShieldAlert className="mt-0.5 size-4.5 shrink-0 text-(--danger-fg)" aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-(--danger-fg)">
                Not for emergencies
              </p>
              <p className="text-[11.5px] leading-tight text-(--danger-fg)/85">
                If it&apos;s urgent, call 911 or go to a hospital right away.
              </p>
            </div>
          </div>
          <a
            href="tel:911"
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-(--radius-pill) border border-(--danger-border) bg-(--surface-card) px-3 py-1.5 text-xs font-bold text-(--danger-fg) shadow-(--shadow-xs) hover:bg-(--danger-bg)"
          >
            <Phone className="size-3.5" aria-hidden />
            911
          </a>
        </aside>

        {/* ----------------------------- 3. Main Dashboard Grid (Responsive 2-column desktop) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6 lg:items-start">
          {/* Main Left Column: Hero Activity + Services Grid */}
          <div className="flex flex-col gap-4 lg:col-span-8 lg:gap-5">
            {error ? (
              <HomeLoadError
                error={error}
                onRetry={() => void refetch()}
                isFetching={isFetching}
              />
            ) : isLoading ? (
              <div
                data-slot="patient-home-loading"
                role="status"
                aria-label="Loading your consultations"
                className="h-44 animate-pulse rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-warm)"
              />
            ) : (
              <section
                data-slot="patient-home-activity"
                aria-label="Active consultation"
              >
                <LiveActivityCard derivation={derivation} bookings={bookings} />
              </section>
            )}

            {/* --------------------------------------- 4. Grab-Style 4x2 Service Grid */}
            <section
              data-slot="patient-home-services"
              aria-label="Services"
              className="flex flex-col gap-2.5 sm:gap-3"
            >
              <h2 className="text-[17px] font-bold tracking-tight text-(--text-heading)">
                Services
              </h2>

              <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
                {SERVICE_TILES.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <Link
                      key={tile.title}
                      href={tile.href}
                      className="group flex min-h-[96px] flex-col items-center justify-center rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-2.5 py-3.5 text-center shadow-(--shadow-card) transition-all duration-200 hover:-translate-y-0.5 hover:border-(--action-primary) hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) sm:min-h-[108px] sm:p-4 lg:min-h-[116px]"
                    >
                      <span
                        className={cn(
                          "flex size-12 items-center justify-center rounded-xl transition-colors sm:size-14",
                          tile.tone === "teal"
                            ? "bg-(--surface-accent-soft) text-(--status-available-fg) group-hover:bg-(--action-primary) group-hover:text-(--action-primary-text)"
                            : tile.tone === "navy"
                              ? "bg-(--surface-brand-soft) text-(--text-heading) group-hover:bg-(--surface-brand) group-hover:text-(--text-on-brand)"
                              : "bg-(--surface-accent-soft) text-(--text-muted) group-hover:text-(--text-heading)",
                        )}
                      >
                        <Icon className="size-6 sm:size-7" aria-hidden />
                      </span>

                      <span className="mt-2.5 w-full truncate px-0.5 text-center text-[12.5px] font-bold leading-tight text-(--text-heading) sm:text-[13.5px]">
                        {tile.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Sidebar Column: "For you" Curated Advice Card & Clinical Assurance */}
          <div className="flex flex-col gap-4 lg:col-span-4 lg:gap-5">
            <section
              aria-label="Daily health tips"
              className="flex flex-col gap-2.5"
            >
              <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-(--text-heading)">
                <HeartPulse className="size-4 text-(--status-available-fg)" aria-hidden />
                For you
              </h2>

              <Link
                href="/patient/health?tab=medhub"
                className="group flex flex-col gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-3.5 sm:p-4 shadow-(--shadow-card) transition-all duration-200 hover:border-(--action-primary) hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--surface-accent-soft) text-(--status-available-fg)">
                    <Stethoscope className="size-5.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[11px] font-semibold text-(--status-available-fg) uppercase tracking-wide">
                      Health care
                    </span>
                    <h3 className="mt-0.5 text-[14px] font-bold text-(--text-heading) group-hover:text-(--action-primary) line-clamp-2">
                      Drinking enough water and getting rest
                    </h3>
                    <p className="mt-1 text-[12px] text-(--text-muted)">
                      2 min read • BayanHealth Clinical Team
                    </p>
                  </div>
                  <ChevronRight className="size-4.5 shrink-0 text-(--text-muted) transition-transform group-hover:translate-x-0.5 group-hover:text-(--action-primary)" />
                </div>
              </Link>

              {/* Trust & Clinical Assurance Card */}
              <div className="rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card)">
                <h3 className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">
                  The BayanHealth guarantee
                </h3>
                <ul className="mt-3 flex flex-col gap-2.5 text-[12.5px] text-(--text-body)">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-(--status-available-fg)" />
                    <span>100% PRC-licensed doctors</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-(--status-available-fg)" />
                    <span>FDA-compliant e-prescriptions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-(--status-available-fg)" />
                    <span>Safe and private medical records</span>
                  </li>
                </ul>
              </div>

              {/* Quick Medical Guide Card */}
              <div className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-3.5 sm:p-4 shadow-(--shadow-card)">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--surface-accent-soft) text-(--status-available-fg)">
                    <BriefcaseMedical className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-(--text-heading) truncate">Need a guide?</p>
                    <p className="text-[11.5px] text-(--text-muted) truncate">Learn how teleconsultation works</p>
                  </div>
                </div>
                <Link
                  href="/patient/health?tab=medhub"
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-(--radius-pill) border border-(--border-subtle) px-3 text-xs font-semibold text-(--text-heading) hover:bg-(--surface-warm)"
                >
                  Read
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

/**
 * Live Activity Card: displays the most relevant card based on patient's current state.
 */
function LiveActivityCard({
  derivation,
}: {
  derivation: PatientHomeDerivation;
  bookings: BookingListItem[];
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const active = derivation.activeBooking;
  const doctorId = active?.doctorId ?? "";

  const doctorQuery = useQuery({
    queryKey: ["doctor-public-profile", doctorId, idToken],
    queryFn: () => fetchDoctorPublicProfile(doctorId, idToken ?? ""),
    enabled: !!idToken && doctorId.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: false,
    throwOnError: false,
  });

  const doctorName = doctorQuery.data?.fullName?.trim()
    ? formatDoctorName(doctorQuery.data.fullName)
    : "PRC Doctor";

  if (derivation.state === "LIVE_ROOM" && active) {
    return (
      <div
        data-slot="patient-home-hero"
        data-state="LIVE_ROOM"
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-(--radius-card) border-2 border-(--action-primary) bg-(--surface-accent-soft) p-4 sm:p-5 shadow-(--shadow-card)"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--action-primary)/30 bg-(--action-primary)/10 px-2.5 py-1 text-[11px] font-bold text-(--status-available-fg) uppercase tracking-wide">
              <span className="size-2 rounded-full bg-(--action-primary)" />
              Live Consultation
            </span>
            <span className="text-xs font-semibold text-(--status-available-fg)">
              Your room is open
            </span>
          </div>

          <h3 className="mt-2 text-[18px] sm:text-[20px] font-bold text-(--text-heading)">
            Your consultation has started
          </h3>
          <p className="mt-0.5 text-[14px] text-(--text-body)">
            {doctorName} is waiting in the consultation room. Tap to go back now.
          </p>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <BrandLinkButton
            href={`/consultation/room/${encodeURIComponent(active.bookingId)}`}
            size="md"
            iconRight={<ArrowRight className="size-4" />}
            className="w-full sm:w-56 bg-(--action-primary) text-(--action-primary-text) justify-center shadow-(--shadow-sm) font-bold"
          >
            Back to your consultation
          </BrandLinkButton>
        </div>
      </div>
    );
  }

  if (derivation.state === "ON_DEMAND_WAITING" && active) {
    const isDoctorAssigned = !!active.doctorId;
    const isRoomReady = active.status === "confirmed";

    return (
      <div
        data-slot="patient-home-hero"
        data-state="ON_DEMAND_WAITING"
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-(--radius-card) border-2 border-(--action-primary) bg-(--surface-accent-soft) p-4 sm:p-5 shadow-(--shadow-card)"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--action-primary)/30 bg-(--action-primary)/10 px-2.5 py-1 text-[11px] font-bold text-(--status-available-fg) uppercase tracking-wide">
              <span className="size-2 rounded-full bg-(--action-primary)" />
              {isRoomReady ? "Room ready" : "In the queue"}
            </span>
            <span className="text-xs font-semibold text-(--status-available-fg)">
              {isDoctorAssigned ? `Assigned to ${doctorName}` : "Finding an available doctor…"}
            </span>
          </div>

          <h3 className="mt-2 text-[18px] sm:text-[20px] font-bold text-(--text-heading)">
            {isRoomReady
              ? "Your teleconsultation is open"
              : "Your teleconsultation request is active"}
          </h3>
          <p className="mt-0.5 text-[13.5px] text-(--text-body)">
            {isRoomReady
              ? `You can now join the waiting room to talk with ${doctorName}.`
              : "Please stay on the line. We'll connect you with the first available licensed doctor."}
          </p>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <BrandLinkButton
            href={`/patient/booking/getBooking/${encodeURIComponent(active.bookingId)}`}
            size="md"
            iconRight={<ArrowRight className="size-4" />}
            className="w-full sm:w-56 bg-(--action-primary) text-(--action-primary-text) justify-center shadow-(--shadow-sm) font-bold"
          >
            {isRoomReady ? "Join waiting room" : "Back to consultation status"}
          </BrandLinkButton>
        </div>
      </div>
    );
  }

  if (derivation.state === "UNFINISHED_INTAKE" && active) {
    return (
      <div
        data-slot="patient-home-hero"
        data-state="UNFINISHED_INTAKE"
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-(--radius-card) border-2 border-amber-500/80 bg-amber-50/80 dark:bg-amber-950/30 p-4 sm:p-5 shadow-(--shadow-card)"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              <Clock className="size-3 text-amber-700 dark:text-amber-400" />
              Unfinished consultation
            </span>
          </div>

          <h3 className="mt-2 text-[18px] sm:text-[20px] font-bold text-slate-900 dark:text-slate-100">
            We still need a few details
          </h3>
          <p className="mt-0.5 text-[13.5px] text-slate-600 dark:text-slate-300">
            You started a booking. Complete the intake form or payment hold to join the doctor&apos;s queue.
          </p>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <BrandLinkButton
            href={`/patient/booking/getBooking/${encodeURIComponent(active.bookingId)}`}
            size="md"
            iconRight={<ArrowRight className="size-4" />}
            className="w-full sm:w-56 bg-amber-600 hover:bg-amber-700 text-white justify-center shadow-(--shadow-sm) font-bold"
          >
            Continue booking
          </BrandLinkButton>
        </div>
      </div>
    );
  }

  if (derivation.state === "SCHEDULED" && active) {
    return (
      <div
        data-slot="patient-home-hero"
        data-state="SCHEDULED"
        className="flex flex-col gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card)"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-(--status-available-fg)">
            <CalendarClock className="size-4" aria-hidden />
            Upcoming consultation
          </span>
          <span className="rounded-full bg-(--surface-accent-soft) px-2 py-0.5 text-[11px] font-bold text-(--status-available-fg)">
            Confirmed
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold text-(--text-heading)">
              {doctorName}
            </h3>
            <p className="mt-0.5 text-[13.5px] text-(--text-muted)">
              {formatConsultationDateTime(active.scheduledAt)}
            </p>
          </div>
          <Link
            href={`/patient/booking/getBooking/${active.bookingId}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-(--radius-pill) border border-(--border-default) bg-(--surface-warm) px-3 py-1.5 text-xs font-bold text-(--text-heading) hover:bg-(--surface-card)"
          >
            View
          </Link>
        </div>

        <p className="flex items-start gap-1.5 rounded-(--radius-md) bg-(--surface-warm) p-2.5 text-[12px] text-(--text-muted)">
          <Info className="mt-0.5 size-3.5 shrink-0 text-(--status-available-fg)" aria-hidden />
          <span>
            <strong className="font-semibold text-(--text-heading)">Reminder:</strong> Have photos of past prescriptions or lab results ready before the call starts.
          </span>
        </p>
      </div>
    );
  }

  if (derivation.state === "POST_CONSULT" && active) {
    return (
      <div
        data-slot="patient-home-hero"
        data-state="POST_CONSULT"
        className="flex flex-col gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card)"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-(--status-available-fg)">
            <CheckCircle2 className="size-4 text-(--status-available-fg)" />
            Consultation finished
          </span>
          <span className="text-xs text-(--text-subtle)">Recent</span>
        </div>

        <div>
          <h3 className="text-[16px] font-bold text-(--text-heading)">
            Care summary from {doctorName}
          </h3>
          <p className="mt-0.5 text-[13px] text-(--text-muted)">
            You can now view or download your digital prescription and medical advice.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <BrandLinkButton
            href="/patient/health?tab=records"
            size="sm"
            className="flex-1"
            iconRight={<ChevronRight className="size-4" />}
          >
            Open care kit
          </BrandLinkButton>
          <Link
            href="/patient/booking/createBooking?mode=on-demand"
            className="inline-flex min-h-11 items-center justify-center rounded-(--radius-pill) border border-(--border-subtle) px-3 text-xs font-semibold text-(--text-heading) hover:bg-(--surface-warm)"
          >
            Book again
          </Link>
        </div>
      </div>
    );
  }

  // Default IDLE State
  return (
    <div
      data-slot="patient-home-hero"
      data-state="IDLE"
      className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 sm:p-5 shadow-(--shadow-card)"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-[20px] sm:text-[22px] font-bold text-(--text-heading) leading-snug">
          Need a doctor now?
        </h3>
        <p className="mt-1 text-[13px] sm:text-[13.5px] text-(--text-muted)">
          A PRC doctor is available within 5–15 minutes for an immediate teleconsultation.
        </p>
      </div>

      <div className="shrink-0 w-full sm:w-auto">
        <BrandLinkButton
          href="/patient/booking/createBooking?mode=on-demand"
          size="md"
          className="w-full sm:w-52 bg-(--action-primary) text-(--action-primary-text) justify-center shadow-(--shadow-sm)"
        >
          Consult now
        </BrandLinkButton>
      </div>
    </div>
  );
}

/**
 * Home's error state: a visible message and a retry.
 */
function HomeLoadError({
  error,
  onRetry,
  isFetching,
}: {
  error: unknown;
  onRetry: () => void;
  isFetching: boolean;
}) {
  const message =
    error instanceof Error ? error.message : "Something went wrong";

  return (
    <section
      data-slot="patient-home-error"
      className="flex flex-col gap-3 rounded-2xl border border-(--danger-border) bg-(--danger-bg) p-4 md:p-5"
    >
      <div className="flex items-start gap-3">
        <AlertCircleIcon
          className="mt-0.5 size-5 shrink-0 text-(--danger-fg)"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-(--danger-fg)">
            We couldn&apos;t load your consultations
          </p>
          <p className="mt-0.5 text-[14.5px] leading-[1.45] text-(--danger-fg)">
            {message}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isFetching}
        className="self-start"
      >
        {isFetching ? (
          <>
            <Spinner className="mr-2 size-3" />
            Retrying…
          </>
        ) : (
          "Try again"
        )}
      </Button>
    </section>
  );
}

