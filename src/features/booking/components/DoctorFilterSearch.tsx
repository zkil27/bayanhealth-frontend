"use client";

import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import AppButton from "@/components/primitives/AppButton";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GoToTopFAB } from "@/components/blocks/GoToTopFAB";
import { SpecializationFilter } from "./SpecializationFilter";
import type { DoctorFilterState } from "../hooks/useDoctorFilter";

/**
 * Doctor-search filter bar.
 *
 * Three things were wrong with this control and all three are fixed here
 * (ADR-20260806-02):
 *
 * 1. The search input used `defaultValue={doctorName}` with no `onChange`, so
 *    typing in it changed nothing anywhere. It is now controlled by the shared
 *    filter state.
 * 2. It held no shared state with the results list — `DoctorFilterSearch` and
 *    `DoctorSearchView` were rendered as siblings by the search page, so even a
 *    working input had no list to affect. Both now read one
 *    {@link DoctorFilterState} owned by `DoctorSearchPanel`.
 * 3. It offered hospital, gender, and language filters. The platform holds no
 *    doctor hospital affiliation, gender, or spoken languages — `GET /v1/doctors`
 *    returns only `doctorId`, `fullName`, `specialty`, `onDemandAvailable`, and
 *    has no filter query parameters. Those three sections were removed rather
 *    than left as controls that silently do nothing; the hospital list was eight
 *    invented affiliations besides.
 *
 * What remains — name and specialty — is filtered client-side over the fetched
 * list, which is genuinely backable.
 */
interface DoctorFilterSearchProps {
  filter: DoctorFilterState;
  /** Specialties present on the fetched doctors; drives the specialty options. */
  specialtyOptions: readonly string[];
}

export function DoctorFilterSearch({
  filter,
  specialtyOptions,
}: DoctorFilterSearchProps) {
  const {
    doctorName,
    setDoctorName,
    specialization,
    setSpecialization,
    activeFilterCount,
    clearFilters,
  } = filter;

  return (
    <div className="flex items-center gap-1 px-4">
      <Field orientation="horizontal" className="flex-1">
        <Input
          type="search"
          aria-label="Search doctors by name"
          placeholder="Search doctors by name..."
          className="min-h-11 rounded-(--radius-pill) border-(--border-default) bg-(--surface-card) text-[14px] text-(--text-body) placeholder:text-(--text-subtle)"
          value={doctorName}
          onChange={(event) => setDoctorName(event.target.value)}
        />
      </Field>
      <GoToTopFAB />

      <Drawer>
        <DrawerTrigger
          render={
            <AppButton variant="business" className="gap-2">
              <Filter className="size-4" />
              Filter
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 w-5 rounded-full bg-secondary p-0 text-white">
                  {activeFilterCount}
                </Badge>
              )}
            </AppButton>
          }
        />

        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center gap-0.5">
              <Filter className="size-4" />
              Filter Doctors
            </DrawerTitle>
            <DrawerDescription>
              Filter the available doctors by name or specialty
            </DrawerDescription>
          </DrawerHeader>

          <div className="scrollbar-none max-h-[60vh] scroll-fade space-y-6 overflow-y-auto px-4 py-2">
            <SpecializationFilter
              options={specialtyOptions}
              selectedSpecialization={specialization}
              onSpecializationChange={setSpecialization}
            />

            {activeFilterCount > 0 && (
              <div className="space-y-2 border-t border-border pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">
                    Active Filters
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {doctorName.trim() && (
                    <Badge className="bg-primary/10 text-primary">
                      {doctorName}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => setDoctorName("")}
                      />
                    </Badge>
                  )}
                  {specialization && (
                    <Badge className="bg-primary/10 text-primary">
                      {specialization}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => setSpecialization("")}
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <DrawerFooter className="mt-4">
            <Button onClick={clearFilters} variant="outline">
              Clear All Filters
            </Button>
            <DrawerClose render={<Button>Apply Filters</Button>}></DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
