import { describe, expect, it } from "vitest";

import { allergyWriteBack } from "./profileWriteBack";

const profile = { name: "Maria Santos", allergens: ["Penicillin"], otherAllergens: "" };

describe("allergyWriteBack", () => {
  it("copies a changed answer for the patient themselves", () => {
    expect(allergyWriteBack({ forWhom: "self", allergens: ["Penicillin", "Latex"] }, profile, true)).toEqual({
      allergens: ["Penicillin", "Latex"],
      otherAllergens: "",
    });
  });

  it("skips an unchanged answer, in any order or case", () => {
    expect(allergyWriteBack({ allergens: ["penicillin"] }, profile, true)).toBeNull();
  });

  it("never clears the profile with a blank answer", () => {
    expect(allergyWriteBack({ allergens: [] }, profile, true)).toBeNull();
  });

  it("respects the opt-out, dependents, and a profile without a name", () => {
    expect(allergyWriteBack({ allergens: ["Latex"] }, profile, false)).toBeNull();
    expect(allergyWriteBack({ forWhom: "other", allergens: ["Latex"] }, profile, true)).toBeNull();
    expect(allergyWriteBack({ allergens: ["Latex"] }, { ...profile, name: " " }, true)).toBeNull();
  });
});
