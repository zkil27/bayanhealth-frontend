"use client";

import { useState } from "react";
import { UserRoundX } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DoctorFilterSearch } from "../DoctorFilterSearch";
import { useDoctorFilter } from "../../hooks/useDoctorFilter";
import { DoctorSearchView } from "./DoctorSearchView";

/**
 * Owns the doctor-search filter state.
 *
 * The search route used to render `<DoctorFilterSearch />` and
 * `<DoctorSearchView />` as sibling server-rendered children with no state
 * between them, so nothing the patient did in the filter bar could reach the
 * results list. This client component holds the one filter state both read, and
 * receives back the specialties actually present on the fetched doctors so the
 * specialty options are real (ADR-20260806-02).
 *
 * `excludeDoctorId` (Task 13, guided rebooking wizard) is the one filter
 * dimension `DoctorFilterSearch` never renders a control for — it arrives
 * from a declined booking's "Find another doctor" link
 * (`lib/rebookingUrl.ts`), not from anything the patient sets on this screen.
 * The banner below is what makes that silent filter visible: without it, a
 * patient landing here after a decline would see an ordinary search results
 * page with no indication that one doctor is deliberately missing from it.
 */
export function DoctorSearchPanel() {
  const filter = useDoctorFilter();
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);

  return (
    <>
      {filter.excludeDoctorId ? (
        <div className="px-4">
          <Alert data-slot="rebooking-exclusion-notice">
            <UserRoundX className="size-4" />
            <AlertTitle>Finding you another doctor</AlertTitle>
            <AlertDescription>
              The doctor who declined your previous booking is not shown in
              these results.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      <DoctorFilterSearch filter={filter} specialtyOptions={specialtyOptions} />
      <DoctorSearchView
        filter={{
          name: filter.doctorName,
          specialty: filter.specialization,
          excludeDoctorId: filter.excludeDoctorId,
        }}
        onSpecialtiesChange={setSpecialtyOptions}
      />
    </>
  );
}
