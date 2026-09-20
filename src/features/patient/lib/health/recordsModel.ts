import type { BookingListItem } from "@/features/booking/lib/api/bookingList";
import type { PatientChartEntry } from "@/features/patient/lib/api/patientChart";

/**
 * The Records tab's merge of `GET /v1/bookings` and `GET /v1/patients/me/chart`
 * into one list, replacing what used to be three separate tabs (Consultations,
 * Documents, Timeline) reading the same two sources.
 *
 * Each consultation is the spine; its chart events (intake, session, released
 * documents) nest under it rather than repeating as siblings. A chart entry
 * nests under a booking only when that booking has actually loaded — bookings
 * are cursor-paginated, so an entry whose `bookingId` points past the loaded
 * page would otherwise vanish. It shows as its own top-level row instead, and
 * re-parents automatically once its booking's page loads.
 */

export type RecordFilter = "all" | "visits" | "documents" | "labs";

export const RECORD_FILTERS: ReadonlyArray<{ id: RecordFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "visits", label: "Visits" },
  { id: "documents", label: "Documents" },
  { id: "labs", label: "Labs" },
];

export type RecordNode =
  | {
      kind: "consultation";
      key: string;
      occurredAtMs: number;
      booking: BookingListItem;
      /**
       * This visit's own chart events, oldest first (intake → session →
       * documents) — the same order `ClinicalSummaryDrawerContent` already
       * reads a booking's events in.
       */
      entries: PatientChartEntry[];
    }
  | {
      kind: "event";
      key: string;
      occurredAtMs: number;
      event: PatientChartEntry;
    };

export interface RecordGroup<T> {
  label: string;
  items: T[];
}

/** ISO-8601 → epoch ms, or `-Infinity` for anything unparseable — sorts undated last. */
export function occurredAtMs(value?: string): number {
  if (!value) return -Infinity;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? -Infinity : ms;
}

/**
 * Merge bookings and chart entries into spine nodes, then apply the filter and
 * the search query.
 *
 * `entries` should be every loaded chart entry, not pre-filtered — filtering
 * happens here so a "Documents" match still knows which consultation it
 * belongs to.
 */
export function buildRecordNodes({
  bookings,
  entries,
  filter,
  query,
}: {
  bookings: BookingListItem[];
  entries: PatientChartEntry[];
  filter: RecordFilter;
  query: string;
}): RecordNode[] {
  const loadedBookingIds = new Set(bookings.map((booking) => booking.bookingId));

  const entriesByBooking = new Map<string, PatientChartEntry[]>();
  const orphanEntries: PatientChartEntry[] = [];
  for (const entry of entries) {
    if (entry.bookingId && loadedBookingIds.has(entry.bookingId)) {
      const list = entriesByBooking.get(entry.bookingId) ?? [];
      list.push(entry);
      entriesByBooking.set(entry.bookingId, list);
    } else {
      orphanEntries.push(entry);
    }
  }
  for (const list of entriesByBooking.values()) {
    list.sort((a, b) => occurredAtMs(a.occurredAt) - occurredAtMs(b.occurredAt));
  }

  const needle = query.trim().toLowerCase();
  const matchesNeedle = (haystack: string) =>
    !needle || haystack.toLowerCase().includes(needle);

  const nodes: RecordNode[] = [];

  for (const booking of bookings) {
    const bookingEntries = entriesByBooking.get(booking.bookingId) ?? [];
    const filteredEntries =
      filter === "documents"
        ? bookingEntries.filter((entry) => entry.type === "document")
        : filter === "labs"
          ? bookingEntries.filter((entry) => entry.type === "lab_result")
          : bookingEntries;

    // "Visits" is the consultation itself, regardless of what it carries;
    // "documents"/"labs" only mean anything once the visit actually has one.
    if (filter === "documents" || filter === "labs") {
      if (filteredEntries.length === 0) continue;
    }

    const haystack = [
      booking.serviceType ?? "",
      booking.status ?? "",
      ...bookingEntries.flatMap((entry) => [entry.title, entry.summary ?? ""]),
    ].join(" ");
    if (!matchesNeedle(haystack)) continue;

    nodes.push({
      kind: "consultation",
      key: `booking:${booking.bookingId}`,
      occurredAtMs: occurredAtMs(booking.scheduledAt ?? booking.createdAt),
      booking,
      entries: filteredEntries,
    });
  }

  // Orphans are never "visits" — they have no booking to be one.
  if (filter !== "visits") {
    for (const entry of orphanEntries) {
      if (filter === "documents" && entry.type !== "document") continue;
      if (filter === "labs" && entry.type !== "lab_result") continue;
      if (!matchesNeedle(`${entry.title} ${entry.summary ?? ""}`)) continue;

      nodes.push({
        kind: "event",
        key: `event:${entry.type}:${entry.documentId ?? entry.consultationId ?? entry.occurredAt}`,
        occurredAtMs: occurredAtMs(entry.occurredAt),
        event: entry,
      });
    }
  }

  return nodes;
}

/**
 * Group items into month buckets, newest month first and newest item first
 * inside each. An item with no usable timestamp still belongs to the patient,
 * so it gets its own "Undated" bucket at the end rather than being dropped.
 */
export function groupByMonth<T>(
  items: T[],
  msOf: (item: T) => number,
): RecordGroup<T>[] {
  const buckets = new Map<string, { sort: number; items: T[] }>();
  for (const item of items) {
    const ms = msOf(item);
    const valid = Number.isFinite(ms);
    const label = valid
      ? new Date(ms).toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : "Undated";
    const bucket = buckets.get(label);
    if (bucket) {
      bucket.items.push(item);
      bucket.sort = Math.max(bucket.sort, ms);
    } else {
      buckets.set(label, { sort: ms, items: [item] });
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1].sort - a[1].sort)
    .map(([label, bucket]) => ({
      label,
      items: bucket.items.sort((a, b) => msOf(b) - msOf(a)),
    }));
}
