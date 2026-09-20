"use client";

import { TogglePill } from "./BrandUI";
import { LANGUAGES } from "../constants/bookingConstants";

type LanguageSelectProps = {
  selectedLanguages: string[];
  /** Receives the full next selection. An empty array means "any language". */
  onChange: (next: string[]) => void;
};

/**
 * Language preference row for the O1 booking screen.
 *
 * "Any" (an empty selection) is the default and is offered as its own pill, so a
 * bilingual patient is not forced to name a language they do not care about.
 * Only the languages the platform can actually staff are listed (see
 * {@link LANGUAGES}) — the Figma mock also shows "Bisaya", but regional
 * languages were deliberately dropped rather than accepted and silently ignored.
 */
export function LanguageSelect({
  selectedLanguages,
  onChange,
}: LanguageSelectProps) {
  const noPreference = selectedLanguages.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <TogglePill selected={noPreference} onClick={() => onChange([])}>
        Any
      </TogglePill>
      {LANGUAGES.map((language) => {
        const isSelected = selectedLanguages.includes(language.value);
        return (
          <TogglePill
            key={language.value}
            selected={isSelected}
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
