"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { useAuthStore } from "@/stores/useAuthStore";
import { fetchMyMedications } from "@/features/patient/lib/api/patientMedications";

/**
 * The left rail's "notifications" slot: the most recently released prescription.
 *
 * Fed by `GET /v1/patients/me/medications`, which aggregates released
 * prescriptions — a line appears only once a physician has released the
 * prescription it belongs to.
 *
 * **On the schedule line.** The reference design renders a dosing schedule as
 * day chips — `MON · WED · FRI · SUN` over `2 times a day after food`. That
 * cannot be built here and is not a styling shortfall:
 * `PatientMedicationLine.frequency` is a **free-text string (1–120 chars)** copied
 * verbatim from the physician's own prescription, and there is no `daysOfWeek`,
 * no `timesPerDay`, no before/after-food flag and no `startedAt` anywhere in the
 * contract. The physician may have typed "BID", "twice daily" or "every 12h".
 * Splitting that into day chips would be inventing structure the source does not
 * carry, on a clinical surface, so the card prints the physician's strings as
 * written and lets them say what they say.
 *
 * For the same reason there is no "active" dot driven by a computed state: the
 * indicator reflects that a prescription *exists on the record*, which is the
 * only thing the data supports.
 */
export function MedicationsPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  // `isLoading`, not `isPending`. A query disabled by `enabled: !!idToken`
  // stays `pending` forever with `fetchStatus: 'idle'`, so driving the skeleton
  // from `isPending` left this panel spinning permanently for anyone without a
  // token instead of falling through to its empty state.
  const { data, isLoading } = useQuery({
    queryKey: ["patient-medications", idToken],
    queryFn: () => fetchMyMedications(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 1000 * 60 * 2,
    retry: false,
    throwOnError: false,
  });

  const latest = useMemo(() => (data ?? [])[0], [data]);
  const total = data?.length ?? 0;

  return (
    <section
      data-slot="patient-home-medications"
      aria-labelledby={embedded ? undefined : "medications-heading"}
      aria-label={embedded ? "Latest prescription" : undefined}
      className={
        embedded
          ? "flex flex-col gap-2"
          : "flex flex-col gap-3 rounded-2xl border border-(--border-subtle) bg-(--surface-card) p-5 shadow-(--shadow-float)"
      }
    >
      {embedded ? (
        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-(--tracking-overline) text-(--status-available-fg) uppercase">
          <span
            aria-hidden
            className={
              latest
                ? "size-1.5 shrink-0 rounded-full bg-(--status-available-fg)"
                : "size-1.5 shrink-0 rounded-full bg-(--border-strong)"
            }
          />
          {latest ? "Active medication" : "Medication"}
        </p>
      ) : null}

      {!embedded ? (
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={
              latest
                ? "size-2 shrink-0 rounded-full bg-(--status-available-fg)"
                : "size-2 shrink-0 rounded-full bg-(--border-strong)"
            }
          />
          <h3
            id="medications-heading"
            className="text-[11px] font-semibold tracking-(--tracking-overline) text-(--text-subtle) uppercase"
          >
            {latest ? "Latest prescription" : "Prescriptions"}
          </h3>
          {total > 1 ? (
            <span className="ml-auto text-[11.5px] font-semibold text-(--text-subtle)">
              +{total - 1} more
            </span>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="h-16 animate-pulse rounded-(--radius-widget) bg-(--gray-bg)"
        />
      ) : !latest ? (
        <div data-slot="patient-home-medications-empty" className="flex flex-col gap-1.5">
          <p className="text-[13px] leading-[1.45] text-(--text-muted)">
            No active prescriptions — issued deliverables appear here after a
            consultation.
          </p>
          <Link
            href="/patient/health"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-(--status-available-fg) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          >
            View your health record
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Name + dose on one line, the way the reference heads its card. */}
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-[15px] leading-tight font-bold text-(--text-heading)">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-(--status-available-fg)"
              />
              <span className="truncate">{latest.genericName}</span>
            </p>
            {latest.dose ? (
              <span className="shrink-0 text-[13px] font-semibold text-(--text-body)">
                {latest.dose}
              </span>
            ) : null}
          </div>

          {/* The physician's own frequency words, verbatim — never parsed into
              day chips (the contract carries free text, not structured days). */}
          {latest.frequency ? (
            <p className="text-[12px] font-bold tracking-wide text-(--status-available-fg) uppercase">
              {latest.frequency}
            </p>
          ) : null}
          {latest.instructions || latest.duration ? (
            <p className="text-[12.5px] leading-[1.45] text-(--text-muted)">
              {[latest.duration, latest.instructions].filter(Boolean).join(" · ")}
            </p>
          ) : null}

          <p className="mt-0.5 text-[11.5px] text-(--text-subtle)">
            Prescribed {formatReleasedAt(latest.releasedAt)} · a record, not a
            dispensable script
          </p>
        </div>
      )}
    </section>
  );
}

function formatReleasedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}
