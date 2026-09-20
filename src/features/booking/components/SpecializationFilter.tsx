"use client";

/**
 * Specialty filter.
 *
 * The twelve options ("Cardiologist", "Dermatologist", …) used to be hardcoded
 * here, so the list a patient chose from bore no relation to the doctors the
 * platform actually has — most choices matched nobody, and a real specialty
 * outside the twelve could not be selected at all. Options are now derived from
 * the `specialty` values on the fetched `DoctorPublicSummary` records, which is
 * the only place the platform holds them (ADR-20260806-02).
 *
 * When the fetched doctors carry no specialty at all there is nothing to choose
 * from, so the control renders nothing rather than an empty dropdown.
 */
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

interface SpecializationFilterProps {
  /** Specialties present on the fetched doctors. */
  options: readonly string[];
  selectedSpecialization: string;
  onSpecializationChange: (specialization: string) => void;
}

export function SpecializationFilter({
  options,
  selectedSpecialization,
  onSpecializationChange,
}: SpecializationFilterProps) {
  if (options.length === 0) {
    return (
      <div className="space-y-3" data-slot="specialization-filter-empty">
        <h4 className="text-sm font-medium text-foreground">Specialization</h4>
        <p className="text-xs text-muted-foreground italic">
          No specialties listed for the available doctors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-slot="specialization-filter">
      <h4 className="text-sm font-medium text-foreground">Specialization</h4>
      <NativeSelect
        aria-label="Specialization"
        value={selectedSpecialization}
        onChange={(e) => onSpecializationChange(e.target.value)}
        className="w-full"
      >
        <NativeSelectOption value="">All Specializations</NativeSelectOption>
        {options.map((spec) => (
          <NativeSelectOption key={spec} value={spec}>
            {spec}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
