"use client";

import { TogglePill } from "./BrandUI";
import { GENDER_OPTIONS } from "../constants/bookingConstants";

type GenderPreferenceProps = {
  /** Currently selected gender id ("any" | "female" | "male"), or "" if unset. */
  value: string;
  onSelect: (gender: string) => void;
};

/**
 * Single-select doctor-gender row for the O1 booking screen. The patient picks
 * exactly one of Any / Female / Male (see {@link GENDER_OPTIONS}).
 */
export function GenderPreference({ value, onSelect }: GenderPreferenceProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Doctor gender">
      {GENDER_OPTIONS.map((option) => (
        <TogglePill
          key={option.id}
          role="radio"
          aria-checked={value === option.id}
          selected={value === option.id}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </TogglePill>
      ))}
    </div>
  );
}
