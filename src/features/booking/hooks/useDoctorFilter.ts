"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Doctor-search filter state.
 *
 * Reduced to the two dimensions the platform can actually serve
 * (ADR-20260806-02). `GET /v1/doctors` returns `DoctorPublicSummary` —
 * `doctorId`, `fullName`, `specialty`, `onDemandAvailable` — and has no filter
 * query parameters, so filtering happens client-side over the already-fetched
 * list. Name and specialty are both present on that projection; hospital
 * affiliation, doctor gender, and spoken languages are not held anywhere on the
 * platform, so those three filters were removed rather than re-sourced.
 *
 * `languagePreferences` also used to be seeded with `["tagalog"]`, which made the
 * "Filter" badge read `1` before the patient had chosen anything — a filter
 * asserted on their behalf.
 */
export interface DoctorFilterState {
  /** Free-text name query, seeded from `?name=`. */
  doctorName: string;
  setDoctorName: (name: string) => void;
  /** Exact specialty match, or `""` for all. */
  specialization: string;
  setSpecialization: (specialization: string) => void;
  /**
   * Doctor id to hide from the results entirely, seeded from
   * `?excludeDoctorId=` (Task 13, guided rebooking wizard).
   *
   * Unlike `doctorName`/`specialization`, this is not exposed as a control the
   * patient can toggle in the filter drawer — a doctor who just declined a
   * booking is excluded by the flow that sent the patient here, not by a
   * choice the patient makes on this screen. It exists purely so the
   * rebooking route can seed it once and have the existing search page honour
   * it, with zero new UI in the filter drawer and zero backend involvement
   * (`GET /v1/doctors` has no filter params either way — this is the same
   * client-side-over-the-fetched-list mechanism `doctorName`/`specialization`
   * already use).
   */
  excludeDoctorId: string;
  /** Number of filters the patient has actually set. Starts at 0. */
  activeFilterCount: number;
  clearFilters: () => void;
}

export function useDoctorFilter(): DoctorFilterState {
  const searchParams = useSearchParams();
  const nameParam = searchParams.get("name") ?? "";
  const excludeDoctorId = searchParams.get("excludeDoctorId") ?? "";

  const [doctorName, setDoctorName] = useState<string>(nameParam);
  const [specialization, setSpecialization] = useState<string>("");

  // The query string is the entry point from the booking landing search box, so
  // a later navigation to `?name=…` must move the controlled input with it.
  useEffect(() => {
    setDoctorName(nameParam);
  }, [nameParam]);

  const clearFilters = useCallback(() => {
    setDoctorName("");
    setSpecialization("");
    // `excludeDoctorId` is deliberately NOT reset here. It came from the
    // rebooking redirect, not from a filter the patient set through this
    // drawer, so "Clear All Filters" clearing the patient's own choices must
    // not silently re-admit the doctor who just declined their booking.
  }, []);

  // Counted separately from `activeFilterCount`: it is not a filter the
  // "Clear All Filters" control resets, so it should not inflate the badge
  // that implies "these are the filters Clear will remove".
  const activeFilterCount =
    (doctorName.trim() ? 1 : 0) + (specialization ? 1 : 0);

  return {
    doctorName,
    setDoctorName,
    specialization,
    setSpecialization,
    excludeDoctorId,
    activeFilterCount,
    clearFilters,
  };
}
