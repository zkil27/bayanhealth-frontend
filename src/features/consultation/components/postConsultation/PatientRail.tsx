"use client";

import { ClipboardCheck, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ageFromDateOfBirth,
  SEX_LABELS,
  type BookingIntakeForm,
} from "@/features/doctor/lib/api/bookingIntake";

import { PatientDetails } from "./PatientDetails";

/** Sticky, scan-first patient context for the post-consult doctor workspace. */
export function PatientRail({
  bookingId,
  intake,
}: {
  bookingId?: string;
  /** Intake already loaded by the workspace, to avoid fetching it twice. */
  intake?: BookingIntakeForm | null;
}) {
  const demographics = intake?.sections.details?.demographics;
  const age = ageFromDateOfBirth(demographics?.dateOfBirth);
  const sex = demographics?.sex ? SEX_LABELS[demographics.sex] : undefined;
  const patientName = intake?.patientName?.trim() || "Patient";
  const initials = patientName
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase())
    .join("");

  return (
    <aside
      data-slot="patient-rail"
      aria-label="Patient record"
      className="flex w-full flex-col overflow-hidden rounded-[18px] border border-(--border-subtle) bg-(--surface-card) shadow-[0_6px_16px_rgba(219,210,168,0.25),0_1px_3px_rgba(120,110,80,0.06)]"
    >
      <div className="border-b border-(--border-subtle) bg-(--surface-warm-soft) p-3.5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--surface-brand) text-sm font-bold text-(--text-on-brand)"
          >
            {initials || <User className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-(--text-heading)">{patientName}</p>
            <p className="text-xs text-(--text-muted)">
              {[typeof age === "number" ? `${age} years` : undefined, sex]
                .filter(Boolean)
                .join(" · ") || "Demographics not provided"}
            </p>
          </div>
          {intake ? (
            <Badge variant="outline" className="shrink-0 gap-1 capitalize">
              <ClipboardCheck className="size-3" /> {intake.status}
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-(--text-subtle)">Patient-reported intake · review before documenting</p>
      </div>
      <div className="p-3">
        <PatientDetails bookingId={bookingId} form={intake} />
      </div>
    </aside>
  );
}
