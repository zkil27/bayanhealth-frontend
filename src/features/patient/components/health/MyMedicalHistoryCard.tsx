"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { Card, SectionHeading } from "@/features/patient/components/redesign/primitives";
import { fetchMyPatientHistory } from "@/features/consultation/lib/patientHistory/api";
import { PATIENT_SECTION_LABELS } from "@/features/consultation/lib/patientHistory/labels";
import { sectionRows, visibleSections } from "@/features/consultation/lib/patientHistory/model";
import type { HistorySectionId } from "@/features/consultation/lib/patientHistory/types";

/**
 * "My medical history": the latest chart version a doctor saved, read-only.
 *
 * Phone first: one 48px row per section that opens in place, 16px text, plain
 * words (no TPAL, no pack-years). The patient never edits it here; the intake
 * content rule keeps new patient questions out of this fork, and the doctor
 * owns the chart.
 */
export function MyMedicalHistoryCard() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const preview = useSearchParams().get("chartPreview");
  const query = useQuery({
    queryKey: ["patient-my-history", idToken, preview],
    queryFn: () => fetchMyPatientHistory(idToken ?? "", preview),
    enabled: !!idToken || !!preview,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const [open, setOpen] = useState<HistorySectionId | null>(null);

  const latest = query.data?.versions.at(-1);
  const sections = latest
    ? visibleSections(latest.data)
        .map((id) => ({ id, rows: sectionRows(latest.data, id, "patient").filter((r) => r.value !== "") }))
        .filter((s) => s.rows.length > 0)
    : [];

  return (
    <Card data-slot="patient-medical-history" className="p-4 sm:p-5">
      <SectionHeading tone="accent">My medical history</SectionHeading>

      {query.isPending && (!!idToken || !!preview) ? (
        <div className="mt-3 flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-(--radius-widget) bg-(--gray-bg)" />
          ))}
        </div>
      ) : !latest || sections.length === 0 ? (
        <p className="mt-3 text-base leading-relaxed text-(--text-body)">
          Your doctor fills this in with you during a consultation. Once it is saved, you can read it here.
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-sm text-(--text-muted)">
            Updated {new Date(latest.savedAt).toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" })} by{" "}
            {latest.savedBy}
          </p>
          <ul className="mt-3 divide-y divide-(--border-subtle) rounded-(--radius-widget) border border-(--border-subtle)">
            {sections.map(({ id, rows }) => {
              const expanded = open === id;
              const panelId = `my-history-${id}`;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? null : id)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-base font-semibold text-(--text-heading) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
                  >
                    {PATIENT_SECTION_LABELS[id]}
                    <ChevronDown
                      className={cn("size-5 shrink-0 text-(--text-muted) transition-transform motion-reduce:transition-none", expanded && "rotate-180")}
                      aria-hidden
                    />
                  </button>
                  {expanded ? (
                    <dl id={panelId} className="grid gap-2.5 px-3.5 pb-3.5">
                      {rows.map((row) => (
                        <div key={row.key}>
                          <dt className="text-sm text-(--text-muted)">{row.label}</dt>
                          <dd className="text-base text-(--text-body)">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-(--text-muted)">
            Something wrong or missing? Tell your doctor at your next consultation.
          </p>
        </>
      )}
    </Card>
  );
}
