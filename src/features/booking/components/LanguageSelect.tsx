"use client";

import { TogglePill } from "./BrandUI";
import { LANGUAGES } from "../constants/bookingConstants";
import { cn } from "@/lib/utils";

type LanguageSelectProps = {
  selectedLanguages: string[];
  /** Receives the full next selection. An empty array means "any language". */
  onChange: (next: string[]) => void;
  className?: string;
};

/**
 * Language preference row for the O1 booking screen.
 *
 * "Any" (an empty selection) is the default and is offered as its own pill, so a
 * bilingual patient is not forced to name a language they do not care about.
 * Only the languages the platform can actually staff are listed (see
 * {@link LANGUAGES}).
 * Spans full width across to the right for easy clicking and touch ergonomics.
 */
export function LanguageSelect({
  selectedLanguages,
  onChange,
  className,
}: LanguageSelectProps) {
  const noPreference = selectedLanguages.length === 0;

  return (
    <div className={cn("grid w-full grid-cols-3 gap-2", className)}>
      <TogglePill
        selected={noPreference}
        className="w-full justify-center px-2 sm:px-4"
        onClick={() => onChange([])}
      >
        Any
      </TogglePill>
      {LANGUAGES.map((language) => {
        const isSelected = selectedLanguages.includes(language.value);
        return (
          <TogglePill
            key={language.value}
            selected={isSelected}
            className="w-full justify-center px-2 sm:px-4"
            onClick={() =>
              onChange(
                isSelected
                  ? selectedLanguages.filter((l) => l !== language.value)
                  : [...selectedLanguages, language.value],
              )
            }
          >
            {language.label}
          </TogglePill>
        );
      })}
    </div>
  );
}
