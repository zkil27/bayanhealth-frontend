"use client";

import { Apple } from "lucide-react";

import { MultiSelectDropdown } from "./MultiSelectDropdown";

const DIET_PRESETS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten-free", label: "Gluten Free" },
  { value: "dairy-free", label: "Dairy Free" },
  { value: "keto", label: "Keto" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "low-sodium", label: "Low Sodium" },
  { value: "diabetic", label: "Diabetic" },
  { value: "low-fat", label: "Low Fat" },
];

interface DietaryFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function DietaryField({ value = [], onChange }: DietaryFieldProps) {
  return (
    <MultiSelectDropdown
      label="Dietary Preferences & Restrictions"
      icon={<Apple className="size-4" />}
      tone="info"
      value={value}
      onChange={onChange}
      presets={DIET_PRESETS}
      presetHeading="Common dietary preferences"
      noneLabel="None — I have no dietary restrictions"
      noneChipLabel="No dietary restrictions"
      placeholder="Select dietary preferences..."
      searchPlaceholder="Type a preference, press Enter to add"
    />
  );
}
