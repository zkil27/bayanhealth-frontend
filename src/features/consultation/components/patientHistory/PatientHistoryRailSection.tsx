"use client";

import { useState } from "react";
import { ChevronDown, History } from "lucide-react";

import { StatusText } from "@/components/ui/status-text";
import { cn } from "@/lib/utils";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";
import { useHasHistoryDraft } from "@/features/consultation/hooks/usePatientHistory";

import { PatientHistoryPanel } from "./PatientHistoryPanel";

/**
 * The patient chart inside the post-consult rail: a disclosure under the lab
 * results, editable, with "Save as version N" at its foot. Open by default,
 * because saving the chart is a post-consult task the doctor must see.
 */
export function PatientHistoryRailSection({
  bookingId,
  intake,
  doctorName,
}: {
  bookingId: string;
  intake?: BookingIntakeForm | null;
  doctorName?: string;
}) {
  const [open, setOpen] = useState(true);
  const hasDraft = useHasHistoryDraft(bookingId);

  return (
    <section data-slot="patient-history-rail" aria-labelledby="pmh-rail-title" className="border-b border-(--border-subtle)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2 text-left hover:bg-(--surface-warm-soft) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <History className="size-4 text-(--teal-750) dark:text-(--teal-300)" aria-hidden />
          <span id="pmh-rail-title" className="text-sm font-bold text-(--text-heading)">
            Past medical history
          </span>
          {hasDraft ? (
            <StatusText tone="attention" size="sm">
              Not saved
            </StatusText>
          ) : null}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-(--text-muted) transition-transform motion-reduce:transition-none", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <PatientHistoryPanel
          bookingId={bookingId}
          intake={intake}
          mode="edit"
          saveEnabled
          savedBy={doctorName}
          showTitle={false}
          className="border-t border-(--border-subtle)"
        />
      ) : null}
    </section>
  );
}
