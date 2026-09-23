"use client";

import { ClipboardCheck, FileText, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";

import { PatientDetails } from "./PatientDetails";

/** Sticky, scan-first patient context for the post-consult doctor workspace. */
export function PatientRail({
  bookingId,
  intake,
  collapsed = false,
  onToggleCollapse,
}: {
  bookingId?: string;
  /** Intake already loaded by the workspace, to avoid fetching it twice. */
  intake?: BookingIntakeForm | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  if (collapsed) {
    return (
      <aside
        data-slot="patient-rail"
        data-collapsed="true"
        aria-label="Patient intake (collapsed)"
        className="flex flex-col items-center gap-3 rounded-[14px] border border-(--border-subtle) bg-(--surface-card) py-3.5 shadow-xs"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0 rounded-lg text-(--text-muted) hover:text-(--navy-900) hover:bg-(--surface-warm-soft)"
          onClick={onToggleCollapse}
          title="Expand patient intake"
          aria-label="Expand patient intake"
        >
          <PanelLeftOpen className="size-4.5" />
        </Button>
        <span className="flex size-7 items-center justify-center rounded-md bg-(--surface-brand-soft) text-(--teal-800)">
          <FileText className="size-4" />
        </span>
        <span
          className="text-[11px] font-bold text-(--ink-600) tracking-wider uppercase [writing-mode:vertical-lr] rotate-180"
        >
          Intake
        </span>
        {intake ? (
          <span
            className="size-2 rounded-full bg-(--teal-600)"
            title={`Intake: ${intake.status}`}
          />
        ) : null}
      </aside>
    );
  }

  return (
    <aside
      data-slot="patient-rail"
      aria-label="Patient intake"
      className="flex w-full flex-col overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-xs"
    >
      <div className="flex items-center justify-between border-b border-(--border-subtle) bg-(--surface-warm-soft)/60 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-(--teal-700)" />
          <h2 className="text-xs font-bold text-(--navy-900)">Patient Intake</h2>
          {intake ? (
            <Badge
              variant="outline"
              className="gap-1 border-(--border-default) px-1.5 py-0 text-[10px] font-semibold text-(--ink-700) capitalize"
            >
              <ClipboardCheck className="size-2.5 text-(--teal-700)" /> {intake.status}
            </Badge>
          ) : null}
        </div>
        {onToggleCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 p-0 rounded-lg text-(--text-muted) hover:text-(--navy-900) hover:bg-(--surface-warm-soft)"
            onClick={onToggleCollapse}
            title="Collapse intake rail"
            aria-label="Collapse intake rail"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="p-3">
        <PatientDetails bookingId={bookingId} form={intake} />
      </div>
    </aside>
  );
}
