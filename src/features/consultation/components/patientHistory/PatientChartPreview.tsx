"use client";

import { HistoryStatusChip } from "./HistoryStatusChip";
import { PatientHistoryPanel } from "./PatientHistoryPanel";

const DEMO_ROWS = [
  { bookingId: "demo-sch-ramon", name: "Ramon Dela Cruz", initials: "RD", note: "Returning patient · two saved versions" },
  { bookingId: "demo-req-manuel", name: "Manuel Tan", initials: "MT", note: "First consultation · no chart yet" },
];

/** Dev-only: queue rows and the drawer's history tab, side by side, on demo charts. */
export function PatientChartPreview() {
  return (
    <div className="grid gap-6">
      {DEMO_ROWS.map((row) => (
        <section key={row.bookingId} aria-label={row.name} className="grid gap-2">
          <p className="text-xs font-semibold tracking-wide text-(--text-muted) uppercase">{row.note}</p>
          <div className="flex items-center gap-3 rounded-xl border border-(--border-subtle) bg-(--surface-card) p-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-(--surface-brand-soft) text-sm font-bold text-(--text-heading)">
              {row.initials}
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-bold text-(--text-heading)">{row.name}</span>
              <span className="rounded-full bg-(--status-available-bg) px-2 py-0.5 text-[10px] font-bold text-(--status-available-fg)">
                Ready in room
              </span>
              <HistoryStatusChip bookingId={row.bookingId} />
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-card)">
            <PatientHistoryPanel bookingId={row.bookingId} mode="read" showTitle={false} />
          </div>
        </section>
      ))}
    </div>
  );
}
