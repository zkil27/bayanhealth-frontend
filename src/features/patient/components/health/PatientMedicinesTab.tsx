"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pill } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, SectionLabel } from "@/features/patient/components/redesign/primitives";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatConsultationDateTime } from "@/lib/consultation-time";
import {
  fetchMyMedications,
  type PatientMedicationLine,
} from "@/features/patient/lib/api/patientMedications";
import { groupByMonth, occurredAtMs } from "@/features/patient/lib/health/recordsModel";
import { HealthDrawer } from "./HealthDrawer";
import { PrescriptionDrawerContent } from "./HealthDrawerContent";
import { LoadError, LoadingRows, NoMatches } from "./healthStates";

/**
 * The Medicines tab — the Figma S2 "Gamot" tab, previously declared
 * unbuildable because `/v1/drugs/*` is doctor/admin-only. That reasoning
 * missed the endpoint this reads: `GET /v1/patients/me/medications`
 * aggregates every released prescription line the patient's consultations
 * have produced.
 *
 * `fetchMyMedications`'s own contract is explicit that there is no "active"
 * flag and no days-remaining in the source — this reads as "what was
 * prescribed, and when", never as a current list a pharmacy can act on.
 */
export function PatientMedicinesTab({ query }: { query: string }) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["patient-medications", idToken],
    queryFn: () => fetchMyMedications(idToken ?? ""),
    enabled: !!idToken,
    staleTime: 1000 * 60,
    retry: false,
    throwOnError: false,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerConsultationId, setDrawerConsultationId] = useState<string | null>(null);
  const openDrawer = (consultationId: string) => {
    setDrawerConsultationId(consultationId);
    setDrawerOpen(true);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const lines = data ?? [];
    if (!needle) return lines;
    return lines.filter((line) =>
      `${line.genericName} ${line.instructions}`.toLowerCase().includes(needle),
    );
  }, [data, query]);

  const groups = useMemo(
    () => groupByMonth(filtered, (line) => occurredAtMs(line.releasedAt)),
    [filtered],
  );

  if (isLoading) return <LoadingRows label="Loading your medicines…" />;
  if (error) {
    return <LoadError error={error} onRetry={() => void refetch()} isFetching={isFetching} />;
  }

  if ((data ?? []).length === 0) {
    return (
      <Empty data-slot="patient-health-medicines-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Pill />
          </EmptyMedia>
          <EmptyTitle>No medicines on record</EmptyTitle>
          <EmptyDescription>
            Whatever a doctor prescribes during a consultation appears here, with
            the date it was released.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (groups.length === 0) return <NoMatches />;

  return (
    <div data-slot="patient-health-medicines" className="flex flex-col gap-4">
      {groups.map(({ label, items }) => (
        <div key={label} className="flex flex-col gap-2.5">
          <SectionLabel className="pt-1">{label}</SectionLabel>
          {items.map((line, index) => (
            <MedicineRow
              key={`${line.consultationId}-${line.genericName}-${index}`}
              line={line}
              onView={() => openDrawer(line.consultationId)}
            />
          ))}
        </div>
      ))}

      <HealthDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Your prescription">
        {drawerConsultationId ? (
          <PrescriptionDrawerContent consultationId={drawerConsultationId} />
        ) : null}
      </HealthDrawer>
    </div>
  );
}

function MedicineRow({
  line,
  onView,
}: {
  line: PatientMedicationLine;
  onView: () => void;
}) {
  return (
    <Card data-slot="patient-health-medicine" className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-(--text-heading)">
            {line.genericName}
            {line.dose ? ` — ${line.dose}` : ""}
          </p>
          <p className="mt-0.5 text-[13px] text-(--text-muted)">
            {[line.route, line.frequency, line.duration].filter(Boolean).join(" · ")}
          </p>
          {line.instructions ? (
            <p className="mt-1 text-[12.5px] text-(--text-subtle)">{line.instructions}</p>
          ) : null}
          <p className="mt-1.5 text-[12px] text-(--text-subtle)">
            Prescribed {formatConsultationDateTime(line.releasedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onView}
          className="shrink-0 rounded-(--radius-pill) border border-(--border-default) bg-(--surface-card) px-3 py-1.5 text-[12.5px] font-semibold text-(--text-heading) transition-colors hover:bg-(--action-secondary-hover-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          View prescription
        </button>
      </div>
    </Card>
  );
}
