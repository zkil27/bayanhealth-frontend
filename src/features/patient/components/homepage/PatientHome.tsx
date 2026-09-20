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
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { derivePatientHomeState, type PatientHomeDerivation } from "@/lib/patient/patientHomeState";
import { fetchBookingPage, type BookingListItem } from "@/features/booking/lib/api/bookingList";
import { fetchDoctorPublicProfile } from "@/features/booking/lib/api/doctors";
import { formatConsultationDateTime } from "@/lib/consultation-time";
import { BrandLinkButton } from "@/features/patient/components/redesign/primitives";
import { patientPageClass } from "@/features/patient/components/PatientPage";

/** Quick triage symptoms tailored for Taglish elderly and family users (text-only, no emojis). */
const QUICK_SYMPTOMS = [
  { label: "Lagnat", query: "lagnat" },
  { label: "Ubo't Sipon", query: "ubo-sipon" },
  { label: "Sakit ng Ulo", query: "sakit-ng-ulo" },
  { label: "Sakit ng Tiyan", query: "sakit-ng-tiyan" },
  { label: "Pangangati", query: "pangangati" },
  { label: "Katawan", query: "sakit-ng-katawan" },
] as const;

/** 8-tile 4×2 Grab-inspired services grid with single scannable labels (zero truncation). */
const SERVICE_TILES = [
  {
    title: "Konsulta",
    href: "/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult",
    icon: Video,
    tone: "teal",
  },
  {
    title: "Pa-schedule",
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
    title: "Reseta",
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
    title: "Talaan",
    href: "/patient/health",
    icon: HeartPulse,
    tone: "teal",
  },
  {
    title: "Lahat",
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
 * - "Para sa'yo" curated clinical health guidance
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
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 30,
    refetchIntervalInBackground: true,
    retry: false,
    throwOnError: false,
  });

  const bookings = useMemo(() => data?.bookings ?? [], [data?.bookings]);
  const derivation = useMemo(
    () => derivePatientHomeState(bookings),
    [bookings],
  );

  return (
    <div
      data-slot="patient-home"
      className="flex h-full min-h-0 w-full flex-col justify-start pb-4"
    >
      {/* ----------------------------- 1. Top Bar: Search & Notification */}
      <header
        ref={searchContainerRef}
        data-slot="patient-home-topbar"
        className="relative z-30 w-full border-b border-(--teal-800)/20 bg-(--teal-700) shadow-xs dark:border-(--teal-700)/30 dark:bg-(--teal-800)"
      >
        <div className="relative mx-auto flex w-full max-w-lg items-center gap-2.5 px-4 py-3 sm:px-6 md:max-w-none md:px-8 lg:px-8">
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
              placeholder="Maghanap ng sintomas o doktor…"
              aria-expanded={isSearchOpen}
              aria-haspopup="listbox"
              aria-controls="patient-home-search-dropdown"
              className="h-10 w-full rounded-(--radius-card) border border-(--border-default) bg-(--surface-card) pr-9 pl-10 text-[14px] text-(--text-heading) shadow-(--shadow-xs) placeholder:text-(--text-subtle) focus-visible:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                aria-label="I-clear ang paghahanap"
                className="absolute right-2.5 flex size-7 items-center justify-center rounded-full text-(--text-muted) hover:bg-(--surface-warm) hover:text-(--text-heading)"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </form>

          <Link
            href="/patient/health"
            aria-label="Tingnan ang iyong mga abiso"
            onClick={() => setIsSearchOpen(false)}
            className="flex size-10 shrink-0 items-center justify-center rounded-(--radius-card) border border-white/25 bg-white/10 text-white shadow-xs transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Bell className="size-5" />
          </Link>

          {/* Mobile-friendly Search & Quick Symptoms Dropdown */}
          {isSearchOpen && (
            <div
              id="patient-home-search-dropdown"
              data-slot="patient-home-search-dropdown"
              className="absolute top-full left-4 right-4 z-50 mt-1.5 flex flex-col gap-2.5 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-3.5 shadow-xl sm:left-6 sm:right-6 md:left-8 md:right-8"
            >
              {searchQuery.trim() ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-(--radius-md) bg-(--surface-warm) px-3 py-2 text-left text-[13px] font-semibold text-(--action-primary) hover:bg-(--surface-accent-soft)"
                  >
                    <Search className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">
                      Hanapin ang doktor: <strong className="font-bold">&ldquo;{searchQuery}&rdquo;</strong>
                    </span>
                  </button>

                  <Link
                    href="/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult"
                    onClick={() => setIsSearchOpen(false)}
                    className="flex min-h-10 items-center gap-2.5 rounded-(--radius-md) px-3 py-2 text-[13px] font-medium text-(--text-heading) hover:bg-(--surface-warm)"
                  >
                    <Video className="size-4 shrink-0 text-(--status-available-fg)" aria-hidden />
                    <span>Kumonsulta agad (On-Demand)</span>
                  </Link>

                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wide">
                      Mga kaugnay na sintomas
                    </p>
                    {filteredSymptoms.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {filteredSymptoms.map(({ label, query }) => (
                          <Link
                            key={query}
                            href="/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult"
                            onClick={() => setIsSearchOpen(false)}
                            className="inline-flex min-h-9 items-center rounded-(--radius-pill) border border-(--border-subtle) bg-(--surface-warm) px-3 py-1.5 text-[12.5px] font-semibold text-(--text-heading) hover:border-(--action-primary) hover:bg-(--surface-accent-soft) active:scale-95 transition-all"
                          >
                            <span>{label}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-(--text-subtle)">
                        Walang tiyak na sintomas na tumugma.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-(--text-muted) uppercase tracking-wide">
                      <Stethoscope className="size-3.5 text-(--status-available-fg)" aria-hidden />
                      Mabilisang Sintomas
                    </span>
                    <span className="text-[11px] text-(--text-subtle)">
                      Pumili para mag-konsulta
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SYMPTOMS.map(({ label, query }) => (
                      <Link
                        key={query}
                        href="/patient/booking/createBooking?mode=on-demand&serviceRequested=teleconsult"
                        onClick={() => setIsSearchOpen(false)}
                        className="inline-flex min-h-9 items-center rounded-(--radius-pill) border border-(--border-subtle) bg-(--surface-warm) px-3.5 py-1.5 text-[13px] font-semibold text-(--text-heading) shadow-(--shadow-xs) hover:border-(--action-primary) hover:bg-(--surface-accent-soft) active:scale-95 transition-all"
                      >
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-(--border-subtle) pt-2">
                    <Link
                      href="/patient/booking/search"
                      onClick={() => setIsSearchOpen(false)}
                      className="flex min-h-9 items-center justify-between rounded-(--radius-md) px-2 py-1 text-[12.5px] font-medium text-(--text-heading) hover:bg-(--surface-warm) transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Search className="size-3.5 text-(--text-muted)" aria-hidden />
                        Tingnan ang lahat ng doktor
                      </span>
                      <ChevronRight className="size-3.5 text-(--text-muted)" aria-hidden />
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Home Content */}
      <div
        className={patientPageClass(
          "wide",
          "h-full min-h-0 justify-start gap-4 pt-4 pb-4",
        )}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 lg:max-w-none lg:mx-0 lg:gap-5">
          {/* --------------------------------------- 2. Emergency Interceptor Strip */}
        <aside
          role="note"
          aria-label="Paalala sa emergency"
          className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-(--danger-border) bg-(--danger-bg) p-3 text-(--danger-fg) shadow-(--shadow-xs)"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <ShieldAlert className="mt-0.5 size-4.5 shrink-0 text-(--danger-fg)" aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-(--danger-fg)">
                Hindi para sa emergency
              </p>
              <p className="text-[11.5px] leading-tight text-(--danger-fg)/85">
                Kung kagyat, tumawag agad sa 911 o pumunta sa ospital.
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
                aria-label="Aktibong Konsulta"
              >
                <LiveActivityCard derivation={derivation} bookings={bookings} />
              </section>
            )}

            {/* --------------------------------------- 4. Grab-Style 4x2 Service Grid */}
            <section
              data-slot="patient-home-services"
              aria-label="Mga Serbisyo"
              className="flex flex-col gap-2.5 sm:gap-3"
            >
              <h2 className="text-[17px] font-bold tracking-tight text-(--text-heading)">
                Mga Serbisyo
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

          {/* Right Sidebar Column: "Para sa'yo" Curated Advice Card & Clinical Assurance */}
          <div className="flex flex-col gap-4 lg:col-span-4 lg:gap-5">
            <section
              aria-label="Pang-araw-araw na payong pangkalusugan"
              className="flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-(--text-heading)">
                  <HeartPulse className="size-4 text-(--status-available-fg)" aria-hidden />
                  Para sa&apos;yo
                </h2>
                <Link
                  href="/patient/health?tab=medhub"
                  className="text-xs font-semibold text-(--action-primary) hover:underline"
                >
                  Tingnan lahat
                </Link>
              </div>

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
                      Pangangalaga sa Kalusugan
                    </span>
                    <h3 className="mt-0.5 text-[14px] font-bold text-(--text-heading) group-hover:text-(--action-primary) line-clamp-2">
                      Tamang Pag-inom ng Tubig at Pahinga
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
                  Garantiyang BayanHealth
                </h3>
                <ul className="mt-3 flex flex-col gap-2.5 text-[12.5px] text-(--text-body)">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-(--status-available-fg)" />
                    <span>100% PRC-Licensed mga Doktor</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-(--status-available-fg)" />
                    <span>FDA-Compliant Electronic Reseta</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-(--status-available-fg)" />
                    <span>Ligtas at Pribadong Medikal Records</span>
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
                    <p className="text-[13px] font-bold text-(--text-heading) truncate">Kailangan ng gabay?</p>
                    <p className="text-[11.5px] text-(--text-muted) truncate">Alamin ang proseso ng telekonsulta</p>
                  </div>
                </div>
                <Link
                  href="/patient/health?tab=medhub"
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-(--radius-pill) border border-(--border-subtle) px-3 text-xs font-semibold text-(--text-heading) hover:bg-(--surface-warm)"
                >
                  Basahin
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

  const doctorName = doctorQuery.data?.fullName
    ? `Dr. ${doctorQuery.data.fullName}`
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
            <span className="inline-flex items-center gap-2 rounded-full bg-(--action-primary)/15 px-2.5 py-1 text-[11px] font-bold text-(--status-available-fg) uppercase">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-2 rounded-full bg-(--action-primary) opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-(--action-primary)" />
              </span>
              Live Consultation
            </span>
            <span className="text-xs font-semibold text-(--status-available-fg)">
              Bukas na ang silid
            </span>
          </div>

          <h3 className="mt-2 text-[17px] font-bold text-(--text-heading)">
            Nagsimula na ang iyong konsulta
          </h3>
          <p className="mt-0.5 text-[14px] text-(--text-body)">
            Naghihintay si {doctorName} sa consultation room.
          </p>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <BrandLinkButton
            href={`/consultation/room/${encodeURIComponent(active.bookingId)}`}
            size="md"
            iconRight={<ArrowRight className="size-4" />}
            className="w-full sm:w-56 bg-(--action-primary) text-(--action-primary-text) justify-center shadow-(--shadow-sm)"
          >
            Pumasok sa Consultation Room
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
            Paparating na Konsulta
          </span>
          <span className="rounded-full bg-(--surface-accent-soft) px-2 py-0.5 text-[11px] font-bold text-(--status-available-fg)">
            Nakumpirma
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
            Tingnan
          </Link>
        </div>

        <p className="flex items-start gap-1.5 rounded-(--radius-md) bg-(--surface-warm) p-2.5 text-[12px] text-(--text-muted)">
          <Info className="mt-0.5 size-3.5 shrink-0 text-(--status-available-fg)" aria-hidden />
          <span>
            <strong className="font-semibold text-(--text-heading)">Paalala:</strong> Ihanda ang mga larawan ng lumang reseta o laboratory results bago magsimula ang tawag.
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
            Tapos na ang Konsulta
          </span>
          <span className="text-xs text-(--text-subtle)">Kamakailan</span>
        </div>

        <div>
          <h3 className="text-[16px] font-bold text-(--text-heading)">
            Care Summary mula kay {doctorName}
          </h3>
          <p className="mt-0.5 text-[13px] text-(--text-muted)">
            Maaari mo nang tingnan o i-download ang iyong digital prescription at medikal na payo.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <BrandLinkButton
            href="/patient/health?tab=records"
            size="sm"
            className="flex-1"
            iconRight={<ChevronRight className="size-4" />}
          >
            Buksan ang Care Kit
          </BrandLinkButton>
          <Link
            href="/patient/booking/createBooking?mode=on-demand"
            className="inline-flex min-h-11 items-center justify-center rounded-(--radius-pill) border border-(--border-subtle) px-3 text-xs font-semibold text-(--text-heading) hover:bg-(--surface-warm)"
          >
            Mag-book Ulit
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
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-(--status-available-fg) uppercase">
          <Clock className="size-3.5" /> Mabilisang Tulong
        </span>
        <h3 className="mt-1 text-[16px] sm:text-[17px] font-bold text-(--text-heading)">
          Kailangan mo ng doktor ngayon?
        </h3>
        <p className="mt-0.5 text-[13px] sm:text-[13.5px] text-(--text-muted)">
          Available ang PRC doctor sa loob ng 5–15 minuto para sa agarang telekonsulta.
        </p>
      </div>

      <div className="shrink-0 w-full sm:w-auto">
        <BrandLinkButton
          href="/patient/booking/createBooking?mode=on-demand"
          size="md"
          className="w-full sm:w-52 bg-(--action-primary) text-(--action-primary-text) justify-center shadow-(--shadow-sm)"
        >
          Kumonsulta Agad
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

