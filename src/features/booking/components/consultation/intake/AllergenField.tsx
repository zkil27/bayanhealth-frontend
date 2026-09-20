"use client";

import { AlertTriangle } from "lucide-react";

import { MultiSelectDropdown } from "./MultiSelectDropdown";

const PRESET_ALLERGENS = [
  "Penicillin",
  "Sulfa Drugs",
  "Aspirin",
  "Latex",
  "Peanuts",
  "Shellfish",
  "Tree Nuts",
  "Pollen",
].map((allergen) => ({ value: allergen, label: allergen }));

interface AllergenFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function AllergenField({ value = [], onChange }: AllergenFieldProps) {
  return (
    <MultiSelectDropdown
      label="Allergies & Intolerances"
      icon={<AlertTriangle className="size-4" />}
      tone="danger"
      value={value}
      onChange={onChange}
      presets={PRESET_ALLERGENS}
      presetHeading="Common allergens"
      noneLabel="None — I have no known allergies"
      noneChipLabel="No known allergies"
      placeholder="Search or add allergen..."
      searchPlaceholder="Type an allergen, press Enter to add"
      // Blank is "not answered", which is clinically different from an
      // asserted "None" — so it prompts instead of claiming no allergies.
      emptyHint='Not answered yet. Select an allergen, or pick "None" if there are none.'
    />
  );
}
