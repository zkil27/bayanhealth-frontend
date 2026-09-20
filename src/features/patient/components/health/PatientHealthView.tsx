"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { patientPageClass } from "@/features/patient/components/PatientPage";
import { PatientPageHeader } from "@/features/patient/components/PatientPageHeader";
import { SegmentedTabs } from "@/features/patient/components/redesign/primitives";
import type { RecordFilter } from "@/features/patient/lib/health/recordsModel";
import { PatientMedHub } from "./PatientMedHub";
import { HealthOverviewTab } from "./HealthOverviewTab";
import { PatientMedicinesTab } from "./PatientMedicinesTab";
import { PatientRecordsTab } from "./PatientRecordsTab";

/**
 * `/patient/health` — the patient's Health area (Figma S2, "My Health").
 *
 * This is the single screen the "Health" nav tab opens, and it replaces two
 * overlapping ones: `/patient/records` (a bookings list) and `/patient/chart`
 * (a chart timeline). Both now redirect here.
 *
 * - **Overview** (default) — the page's identity: a health identity strip
 *   (blood type, height, weight, allergies), what's prescribed, the next
 *   follow-up, the latest care plan, and a daily tip.
 * - **Medicines** — every released prescription line
 *   (`GET /v1/patients/me/medications`), the Figma S2 "Gamot" tab. An earlier
 *   version of this file claimed the tab "cannot be built" because
 *   `/v1/drugs/*` is doctor/admin-only — true, but irrelevant: this endpoint
 *   was never that one.
 * - **Records** — one consultation spine, replacing what used to be three
 *   tabs (Consultations, Documents, Timeline) reading the same two sources
 *   (`GET /v1/bookings` and `GET /v1/patients/me/chart`). Each visit expands
 *   to reveal its own events; a chart entry with no loaded booking gets its
 *   own row. Filter chips (`All | Visits | Documents | Labs`) narrow it.
 * - **Med Hub** — `MEDICAL_PROTOCOLS` rendered in the patient shell.
 *
 * The search control (Records / Medicines only) filters the rows already
 * loaded — client-side, over doctor name, service, medicine and document
 * title. There is no patient-scoped search endpoint.
 */

type TabId = "overview" | "medicines" | "records" | "medhub";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "medicines", label: "Medicines" },
  { id: "records", label: "Records" },
  { id: "medhub", label: "Med Hub" },
];

/** Tabs whose content the search box filters. */
const SEARCHABLE_TABS: ReadonlySet<TabId> = new Set(["records", "medicines"]);

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

function isRecordFilter(value: string | null): value is RecordFilter {
  return value === "all" || value === "visits" || value === "documents" || value === "labs";
}

/**
 * Legacy tab ids, and the Records filter each one's content most closely
 * matches, now that Consultations/Documents/Timeline are one Records tab.
 * `Consultations` showed only booking-backed cards (→ Visits); `Documents`
 * showed the chart's `document`/`lab_result` entries combined (→ Documents,
 * the closer of the two now that they're split); `Timeline` showed every
 * chart entry type (→ All).
 */
const LEGACY_TAB_FILTER: Record<string, RecordFilter> = {
  consultations: "visits",
  documents: "documents",
  timeline: "all",
};

function resolveTab(raw: string | null): {
  tab: TabId;
  isLegacyAlias: boolean;
  legacyFilter?: RecordFilter;
} {
  if (isTabId(raw)) return { tab: raw, isLegacyAlias: false };
  if (raw && raw in LEGACY_TAB_FILTER) {
    return { tab: "records", isLegacyAlias: true, legacyFilter: LEGACY_TAB_FILTER[raw] };
  }
  return { tab: "overview", isLegacyAlias: false };
}

export function PatientHealthView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const { tab: active, isLegacyAlias, legacyFilter } = resolveTab(requestedTab);

  const requestedFilter = searchParams.get("filter");
  const filter: RecordFilter = isRecordFilter(requestedFilter)
    ? requestedFilter
    : (legacyFilter ?? "all");

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchable = SEARCHABLE_TABS.has(active);

  // Canonicalise a bookmarked/linked legacy tab id (`consultations`,
  // `documents`, `timeline`) to `records`, carrying over the filter its old
  // content most closely matches, so the address bar settles on the current
  // shape rather than quietly rendering new content behind an old URL.
  useEffect(() => {
    if (!isLegacyAlias) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "records");
    if (!next.get("filter")) next.set("filter", legacyFilter ?? "all");
    router.replace(`/patient/health?${next.toString()}`, { scroll: false });
    // Deliberately re-runs only on the alias transition, not on every
    // `searchParams`/`router` identity change `useSearchParams` produces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLegacyAlias]);

  /**
   * `replace`, not `push`: a tab is a filter on one screen, not a step in a
   * journey. Pushing would make the browser back button walk backwards through
   * every tab the patient tried before it finally left the screen.
   */
  const selectTab = (id: TabId) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id === "overview") next.delete("tab");
    else next.set("tab", id);
    // The selected-protocol read only means anything on the Med Hub tab, and
    // the filter chips only mean anything on Records.
    if (id !== "medhub") next.delete("protocol");
    if (id !== "records") next.delete("filter");
    const qs = next.toString();
    router.replace(qs ? `/patient/health?${qs}` : "/patient/health", {
      scroll: false,
    });
  };

  const selectFilter = (id: RecordFilter) => {
    const next = new URLSearchParams(searchParams.toString());
    if (id === "all") next.delete("filter");
    else next.set("filter", id);
    const qs = next.toString();
    router.replace(qs ? `/patient/health?${qs}` : "/patient/health", {
      scroll: false,
    });
  };

  return (
    <div
      data-slot="patient-health"
      className="flex h-full min-h-0 w-full min-w-0 flex-col justify-start pb-4"
    >
      <PatientPageHeader
        title="My Health"
        subtitle="Your health identity, medicines and full record — plus the Med Hub."
        action={
          searchable ? (
            <button
              type="button"
              aria-label={
                searchOpen ? "Close search" : "Search your health records"
              }
              aria-expanded={searchOpen}
              onClick={() => {
                setSearchOpen((open) => !open);
                if (searchOpen) setQuery("");
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-(--radius-md) border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {searchOpen ? (
                <X className="size-4.5" />
              ) : (
                <Search className="size-4.5" />
              )}
            </button>
          ) : null
        }
      />

      <div className={patientPageClass("wide", "gap-4 pt-4")}>
        {searchable && searchOpen && (
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by doctor, service, medicine or document…"
            aria-label="Filter your health records"
            className="h-11 w-full rounded-(--radius-md) border border-(--border-default) bg-(--surface-card) px-3.5 text-[15px] text-(--text-body) placeholder:text-(--text-subtle) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          />
        )}

        <SegmentedTabs
          tabs={TABS}
          active={active}
          onChange={selectTab}
          ariaLabel="Health sections"
        />

        {active === "overview" ? (
          <HealthOverviewTab />
        ) : active === "medhub" ? (
          <PatientMedHub />
        ) : active === "medicines" ? (
          <PatientMedicinesTab query={query} />
        ) : (
          <PatientRecordsTab query={query} filter={filter} onFilterChange={selectFilter} />
        )}
      </div>
    </div>
  );
}
