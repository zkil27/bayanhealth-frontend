import { sectionRows, visibleSections } from "./model";
import type { HistorySectionId, PatientHistoryData } from "./types";

export interface HistoryFieldChange {
  key: string;
  label: string;
  /** "" when the field was empty before (an addition). */
  before: string;
  /** "" when the field is now empty (a removal). */
  after: string;
}

/** Per-field changes in one section between two chart states, in display order. */
export function diffSection(
  before: PatientHistoryData,
  after: PatientHistoryData,
  id: HistorySectionId,
): HistoryFieldChange[] {
  const prev = sectionRows(before, id);
  const next = sectionRows(after, id);
  const prevByKey = new Map(prev.map((row) => [row.key, row]));
  const nextKeys = new Set(next.map((row) => row.key));
  const changes: HistoryFieldChange[] = [];

  for (const row of next) {
    const old = prevByKey.get(row.key);
    const oldValue = old?.value ?? "";
    if (oldValue !== row.value) {
      changes.push({ key: row.key, label: row.label, before: oldValue, after: row.value });
    }
  }
  // Removed dynamic rows (an operation or a family condition taken off).
  for (const row of prev) {
    if (!nextKeys.has(row.key) && row.value !== "") {
      changes.push({ key: row.key, label: row.label, before: row.value, after: "" });
    }
  }
  return changes;
}

/** Changes across every section that applies to the newer state. Sections without changes are omitted. */
export function diffHistory(
  before: PatientHistoryData,
  after: PatientHistoryData,
): Partial<Record<HistorySectionId, HistoryFieldChange[]>> {
  const out: Partial<Record<HistorySectionId, HistoryFieldChange[]>> = {};
  for (const id of visibleSections(after)) {
    const changes = diffSection(before, after, id);
    if (changes.length > 0) out[id] = changes;
  }
  return out;
}

export function countChanges(diff: Partial<Record<HistorySectionId, HistoryFieldChange[]>>): number {
  return Object.values(diff).reduce((sum, list) => sum + (list?.length ?? 0), 0);
}
