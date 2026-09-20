"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  ClipboardCheck,
  Phone,
  ShieldAlert,
  Stethoscope,
  Zap,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { patientPageClass } from "@/features/patient/components/PatientPage";
import { PatientPageHeader } from "@/features/patient/components/PatientPageHeader";
import {
  CONSULTATION_FEE_CENTS,
  CONSULTATION_FEE_CURRENCY,
  EMERGENCY_DISCLAIMER,
  ON_DEMAND_WAIT_ESTIMATE,
} from "../../constants/bookingConstants";
import { fetchDoctorSearch } from "../../lib/api/doctors";

/**
 * `/patient/booking` — the Book tab's landing: choose how you want to be seen.
 *
 * The tab used to open the doctor directory directly under the heading "Book for
 * later", with "Consult Now" demoted to a secondary card below it. That gave the
 * tab no identity of its own — it *was* the scheduled path — while the home
 * hero already offered both paths, so the choice was made twice and owned
 * nowhere. This screen owns it: the two paths sit side by side with the actual
 * trade-off between them stated, and the directory is one tap deeper at
 * `/patient/booking/search`.
 *
 * Both cards state only what the platform knows. The wait estimate is the
 * shared {@link ON_DEMAND_WAIT_ESTIMATE} constant, the fee is
 * {@link CONSULTATION_FEE_CENTS} (identical on both paths, which is worth saying
 * so the choice reads as convenience rather than price), and the scheduled
 * card's availability line is counted from the real doctor directory — never a
 * fabricated "3 doctors near you".
 */
export function BookingPathChooser() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ["booking-path-availability", idToken],
    // The same read the directory performs, so landing here warms its cache
    // rather than costing an extra round trip on the next tap.
    queryFn: () => fetchDoctorSearch(idToken ?? "", { scheduleWindowDays: 30 }),
    enabled: !!idToken,
    staleTime: 1000 * 60 * 5,
    retry: false,
    throwOnError: false,
  });

  const availability = useMemo(() => {
    const doctors = data ?? [];
    const withSlots = doctors.filter(
      (doctor) => (doctor.scheduleSpace?.length ?? 0) > 0,
    );
    return { total: doctors.length, withSlots: withSlots.length };
  }, [data]);

  const fee = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: CONSULTATION_FEE_CURRENCY,
    maximumFractionDigits: 0,
  }).format(CONSULTATION_FEE_CENTS / 100);

  return (
    <div
      data-slot="booking-path-chooser"
      className="flex h-full min-h-0 w-full flex-col justify-start pb-4"
    >
      <PatientPageHeader
        title="Book a consultation"
        subtitle={`Two ways to see a PRC-licensed doctor. Same ${fee} consultation fee — pick whichever suits you.`}
      />

      <div className={patientPageClass("wide", "gap-4 pt-4")}>
        {/* Educational comparison strip from Figma O12 */}
        <div className="flex items-center gap-2.5 rounded-(--radius-md) border border-(--status-available-fg)/20 bg-(--surface-accent-soft) p-3 text-[13px] text-(--status-available-fg)">
          <Zap className="size-4 shrink-0" aria-hidden />
          <span>
            <strong>Parehong daan, parehong presyo ({fee}) at parehong kalidad ng doktor</strong> — bilis lang ang pinagkaiba.
          </span>
        </div>

        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
          <PathCard
            href="/patient/booking/createBooking?mode=on-demand"
            icon={<Zap />}
            eyebrow="On demand"
            badge="Pinakamabilis"
            title="Consult Now"
            blurb="Ikokonekta ka namin sa unang available na doktor. Walang appointment na kailangan."
            points={[
              ON_DEMAND_WAIT_ESTIMATE,
              "Walang appointment na kailangan",
              "I-fill up ang intake form, tapos maghintay",
            ]}
            cta="Simulan ang intake (Start intake)"
            emphasis
          />

          <PathCard
            href="/patient/booking/search"
            icon={<CalendarClock />}
            eyebrow="Scheduled"
            title="Book for later"
            blurb="Maghanap ayon sa pangalan o specialty, suriin ang kalendaryo, at pumili ng oras."
            points={[
              isLoading
                ? "Checking availability…"
                : availability.withSlots > 0
                  ? `${availability.withSlots} of ${availability.total} ${
                      availability.total === 1 ? "doctor has" : "doctors have"
                    } open slots`
                  : availability.total > 0
                    ? "No open slots published right now"
                    : "Doctor directory",
              "Ikaw ang pipili ng doktor at oras",
              "Direkta sa kalendaryo ng doktor",
            ]}
            cta="Pumili ng doktor (Browse doctors)"
            loading={isLoading}
          />
        </div>

        {/* Clinical context and trust row — what the flat fee buys, how to come
            prepared, and what the platform can and cannot treat. */}
        <div className="grid gap-4 md:grid-cols-3">
          <ContextCard
            icon={<CheckCircle2 />}
            title={`What's included · ${fee} flat`}
            points={[
              "PRC-licensed physician",
              "Digital prescription (Rx)",
              "Official medical certificate",
              "Doctor care summary",
            ]}
          />
          <ContextCard
            icon={<ClipboardCheck />}
            title="Prepare for your consult"
            points={[
              "Have photos of previous labs or maintenance meds ready",
              "Note when symptoms started",
              "Test your camera and microphone",
            ]}
          />
          <ContextCard
            icon={<ShieldAlert />}
            title="Triage & clinical scope"
            points={[
              "Treats: cough, colds, fever, rashes, refills, certification",
              "Not for: severe chest pain, stroke symptoms, or emergency trauma",
            ]}
          />
        </div>

        <div
          data-slot="emergency-note"
          className="flex flex-col gap-2 rounded-(--radius-md) border border-(--danger-border) bg-(--danger-bg) p-3 text-sm text-(--danger-fg) sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {EMERGENCY_DISCLAIMER}
          </span>
          <a
            href="tel:911"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-(--radius-pill) border border-(--danger-border) bg-(--surface-card) px-3 py-1.5 text-[13px] font-bold text-(--danger-fg) transition-colors hover:bg-(--danger-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            <Phone className="size-3.5" aria-hidden />
            Call 911
          </a>
        </div>
      </div>
    </div>
  );
}

function ContextCard({
  icon,
  title,
  points,
}: {
  icon: React.ReactNode;
  title: string;
  points: string[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card)">
      <p className="flex items-center gap-2 text-[14px] font-bold text-(--text-heading) [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-(--status-available-fg)">
        {icon}
        {title}
      </p>
      <ul className="flex flex-col gap-1">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-[13px] leading-[1.45] text-(--text-muted)"
          >
            <CircleCheck className="mt-0.5 size-3 shrink-0 text-(--status-available-fg)" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PathCard({
  href,
  icon,
  eyebrow,
  badge,
  title,
  blurb,
  points,
  cta,
  emphasis,
  loading,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  badge?: string;
  title: string;
  blurb: string;
  points: string[];
  cta: string;
  emphasis?: boolean;
  loading?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-3 rounded-(--radius-card) border bg-(--surface-card) p-4 shadow-(--shadow-card) transition-colors md:p-5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        emphasis
          ? "border-(--action-primary) hover:bg-(--surface-accent-soft)"
          : "border-(--border-subtle) hover:border-(--border-strong)",
      )}
    >
      {badge && (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-(--surface-accent-soft) px-2.5 py-0.5 text-[11px] font-bold text-(--status-available-fg)">
          <Zap className="size-3" aria-hidden />
          {badge}
        </span>
      )}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) [&_svg]:size-[22px]",
            emphasis
              ? "bg-(--action-primary) text-(--action-primary-text)"
              : "bg-(--surface-accent-soft) text-(--status-available-fg)",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 pr-16">
          <p className="text-[12px] font-bold tracking-(--tracking-overline) text-(--text-subtle) uppercase">
            {eyebrow}
          </p>
          <p className="font-display text-[19px] leading-tight font-bold text-(--text-heading)">
            {title}
          </p>
        </div>
      </div>

      <p className="text-[14.5px] leading-[1.5] text-(--text-body)">{blurb}</p>

      <ul className="flex flex-col gap-1.5">
        {points.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-[14px] text-(--text-muted)"
          >
            {loading && point.endsWith("…") ? (
              <Spinner className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-(--status-available-fg)" />
            )}
            {point}
          </li>
        ))}
      </ul>

      <span
        className={cn(
          "mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-pill) px-4 text-[15px] font-bold transition-colors",
          emphasis
            ? "bg-(--action-primary) text-(--action-primary-text) shadow-(--shadow-btn-inset) group-hover:bg-(--action-primary-hover)"
            : "border border-(--action-primary) text-(--status-available-fg) group-hover:bg-(--surface-accent-soft)",
        )}
      >
        {cta}
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

/**
 * Small print under the two cards on the directory screen, naming the other
 * path so a patient who came looking for a doctor and would rather not wait for
 * a slot is not stuck.
 */
export function OtherPathNote({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="mx-4 flex items-center gap-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-3.5 shadow-(--shadow-card) transition-colors hover:border-(--action-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) md:mx-2"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--surface-accent-soft) text-(--status-available-fg)">
        <Stethoscope className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-(--text-heading)">
          {label}
        </span>
        <span className="block text-[13.5px] text-(--text-muted)">
          {detail}
        </span>
      </span>
      <ArrowRight className="hidden size-4 shrink-0 text-(--text-subtle) sm:block" />
    </Link>
  );
}
