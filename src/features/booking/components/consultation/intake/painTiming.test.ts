import { describe, expect, it } from "vitest";

import { composeOnset, composePattern } from "./PainAssessmentStep";

const base = {
  frequency: undefined,
  frequencyOther: "",
  when: [] as string[],
  whenOther: "",
  durationValue: "",
  durationUnit: "minutes" as const,
};

describe("pain timing strings", () => {
  it("keeps the original shape for chip answers", () => {
    expect(composePattern({ ...base, frequency: "daily", when: ["night"], durationValue: "20" })).toBe(
      "Daily; worse at night; about 20 minutes each time",
    );
  });

  it("adds the patient's own words under Other", () => {
    expect(composePattern({ ...base, frequency: "other", frequencyOther: "Twice a month", when: ["night", "other"], whenOther: "after exercise" })).toBe(
      "Twice a month; worse at night and after exercise",
    );
    expect(composeOnset("other", " After a fall ")).toBe("After a fall");
    expect(composeOnset("yesterday", "")).toBe("Yesterday");
  });

  it("drops an empty Other", () => {
    expect(composePattern({ ...base, frequency: "other", when: ["other"] })).toBe("");
    expect(composeOnset("other", "  ")).toBeUndefined();
  });

  it("stays under the 1000-character contract cap", () => {
    const long = "x".repeat(120);
    const text = composePattern({ ...base, frequency: "other", frequencyOther: long, when: ["waking", "after_eating", "night", "all_day", "other"], whenOther: long, durationValue: "999" });
    expect(text.length).toBeLessThan(1000);
  });
});
