"use client";

import { TogglePill } from "./BrandUI";
import { GENDER_OPTIONS } from "../constants/bookingConstants";
import { cn } from "@/lib/utils";

type GenderPreferenceProps = {
  /** Currently selected gender id ("any" | "female" | "male"), or "" if unset. */
  value: string;
  onSelect: (gender: string) => void;
  className?: string;
};

/**
 * Single-select doctor-gender row for the O1 booking screen. The patient picks
 * exactly one of Any / Female / Male (see {@link GENDER_OPTIONS}).
 * Spans full width across to the right for easy clicking and touch ergonomics.
 */
export function GenderPreference({ value, onSelect, className }: GenderPreferenceProps) {
  return (
    <div
      className={cn("grid w-full grid-cols-3 gap-2", className)}
      role="radiogroup"
      aria-label="Doctor gender"
    >
      {GENDER_OPTIONS.map((option) => (
        <TogglePill
          key={option.id}
          role="radio"
          aria-checked={value === option.id}
          selected={value === option.id}
          className="w-full justify-center px-2 sm:px-4"
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </TogglePill>
      ))}
    </div>
  );
}
