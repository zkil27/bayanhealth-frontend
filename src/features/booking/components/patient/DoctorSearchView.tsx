"use client";

import { useEffect, useMemo } from "react";
import { Stethoscope } from "lucide-react";

import { AsyncView } from "@/components/async-view";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useAuthStore } from "@/stores/useAuthStore";

import { fetchDoctorSearch } from "../../lib/api/doctors";
import type { SearchDoctor } from "../../types/searchDoctors.types";
import { DoctorList } from "../doctor/DoctorList";

/** Client-side filter applied to the fetched list. */
export interface DoctorSearchFilter {
  /** Case-insensitive substring match on the doctor's registered name. */
  name?: string;
  /** Exact specialty match, or `""`/undefined for all. */
  specialty?: string;
  /**
   * Doctor id to omit from the results entirely (Task 13, guided rebooking
   * wizard — excludes a doctor who just declined the patient's booking).
   * `GET /v1/doctors` has no filter params, so this is applied over the
   * already-fetched list exactly like `name`/`specialty`.
   */
  excludeDoctorId?: string;
}

interface DoctorSearchViewProps {
  /** Render inside the booking landing rail ("Doctors For You") vs. full search. */
  inBookingPage?: boolean;
  /** Cap the number of doctors fetched (used by the landing rail). */
  maxDoctors?: number;
  /**
   * Filter applied after the fetch. `GET /v1/doctors` has no filter query
   * parameters, so narrowing happens here over the list already in hand
   * (ADR-20260806-02).
   */
  filter?: DoctorSearchFilter;
  /**
   * Reports the specialties actually present on the fetched doctors, so the
   * filter drawer can offer real options instead of a hardcoded list.
   */
  onSpecialtiesChange?: (specialties: string[]) => void;
}

/**
 * Backend-wired doctor search (Slice 4, Requirement 9).
 *
 * Drives the doctor list entirely from the backend through {@link AsyncView},
 * which standardises the four states this requirement needs:
 * - loading: a defined loading indicator while the request is in flight, with no
 *   cached or sample data shown (Requirements 9.1, 9.3);
 * - data: each returned doctor with its availability schedule (Requirement 9.2);
 * - empty: a defined "no doctors available" message on zero results (Req 9.4);
 * - error: a defined error message with a retry control on failure or the 10s
 *   timeout (Requirement 9.5).
 */
export function DoctorSearchView({
  inBookingPage = false,
  maxDoctors,
  filter,
  onSpecialtiesChange,
}: DoctorSearchViewProps) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);

  return (
    <AsyncView<SearchDoctor[]>
      fetcher={() => fetchDoctorSearch(idToken ?? "", { maxDoctors })}
      deps={[idToken, maxDoctors]}
      empty={<DoctorSearchEmpty />}
    >
      {(doctors) =>
        inBookingPage ? (
          <DoctorList recommendedDoctors={doctors} inBookingPage />
        ) : (
          <FilteredDoctorList
            doctors={doctors}
            filter={filter}
            onSpecialtiesChange={onSpecialtiesChange}
          />
        )
      }
    </AsyncView>
  );
}

/**
 * Applies the client-side filter and reports the available specialties.
 *
 * A separate component because the filtering and the specialty report both need
 * hooks, and `AsyncView`'s children are a render callback rather than a
 * component body.
 */
function FilteredDoctorList({
  doctors,
  filter,
  onSpecialtiesChange,
}: {
  doctors: SearchDoctor[];
  filter?: DoctorSearchFilter;
  onSpecialtiesChange?: (specialties: string[]) => void;
}) {
  const specialtyKey = useMemo(
    () =>
      Array.from(
        new Set(
          doctors
            .map((doctor) => doctor.specialty?.trim())
            .filter((specialty): specialty is string => !!specialty),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .join("\u0000"),
    [doctors],
  );

  // Keyed on the joined string rather than the array so a re-derived but
  // identical list does not re-notify the parent on every render.
  useEffect(() => {
    onSpecialtiesChange?.(specialtyKey ? specialtyKey.split("\u0000") : []);
  }, [specialtyKey, onSpecialtiesChange]);

  const nameQuery = filter?.name?.trim().toLowerCase() ?? "";
  const specialty = filter?.specialty ?? "";
  const excludeDoctorId = filter?.excludeDoctorId ?? "";

  const visible = doctors.filter((doctor) => {
    if (nameQuery && !doctor.name.toLowerCase().includes(nameQuery)) {
      return false;
    }
    if (specialty && doctor.specialty !== specialty) {
      return false;
    }
    if (excludeDoctorId && doctor.doctorId === excludeDoctorId) {
      return false;
    }
    return true;
  });

  if (visible.length === 0) {
    // A doctor exclusion is not "no matches from a choice the patient made" —
    // it is one specific doctor withheld, and every other one either did not
    // exist or was already filtered out for an unrelated reason. Worth its
    // own message so a patient who declined the only doctor with an open slot
    // for their specialty is told what actually happened, not left assuming
    // their name/specialty search was simply too narrow.
    if (excludeDoctorId && !nameQuery && !specialty) {
      return (
        <Empty data-slot="doctor-search-only-excluded-doctor">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Stethoscope />
            </EmptyMedia>
            <EmptyTitle>No other doctors available right now</EmptyTitle>
            <EmptyDescription>
              There are no other doctors to show besides the one excluded from
              this search. Please check back later.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }
    // Distinct from "no doctors available": the platform does have doctors, the
    // patient's own filter excluded them.
    return (
      <Empty data-slot="doctor-search-no-matches">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Stethoscope />
          </EmptyMedia>
          <EmptyTitle>No doctors match your filters</EmptyTitle>
          <EmptyDescription>
            No available doctor matches the name or specialty you selected. Try
            clearing the filters.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <DoctorList doctors={visible} />;
}

function DoctorSearchEmpty() {
  return (
    <Empty data-slot="doctor-search-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Stethoscope />
        </EmptyMedia>
        <EmptyTitle>No doctors available</EmptyTitle>
        <EmptyDescription>
          There are no doctors available right now. Please check back later.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
