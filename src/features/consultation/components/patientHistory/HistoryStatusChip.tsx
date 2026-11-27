"use client";

import { FileClock, UserPlus } from "lucide-react";

import { StatusText } from "@/components/ui/status-text";
import { usePatientHistoryRecord } from "@/features/consultation/hooks/usePatientHistory";

/**
 * Queue-row chip: does this accepted patient already have a chart?
 * "New patient" on a first consult; "Chart v2 · 14 Aug" for a returning one.
 * Renders nothing while loading, and nothing for a real booking until the
 * history API exists (it cannot tell new from returning yet).
 */
export function HistoryStatusChip({ bookingId }: { bookingId: string }) {
  const { data } = usePatientHistoryRecord(bookingId);
  if (!data || data.availability === "unavailable") return null;

  const latest = data.versions.at(-1);
  if (!latest) {
    return (
      <StatusText tone="neutral" size="sm" icon={UserPlus}>
        New patient · no chart
      </StatusText>
    );
  }
  const date = new Date(latest.savedAt).toLocaleDateString("en-PH", { day: "numeric", month: "short" });
  return (
    <StatusText tone="info" size="sm" icon={FileClock}>
      Chart v{latest.version} · {date}
    </StatusText>
  );
}
