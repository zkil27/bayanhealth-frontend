import { describe, expect, it } from "vitest";

import {
  canEnterStep,
  clampResumeStep,
  concernBlockedReason,
  isSafetyHardStop,
  redFlagFromScreen,
  safetyBlockedReason,
  type RedFlagState,
} from "./intakeGates";

const flag = (answer: RedFlagState["answer"], bleeding = false): RedFlagState => ({ answer, bleeding });

describe("safety check", () => {
  it("requires an answer", () => {
    expect(safetyBlockedReason(flag(undefined))).toMatch(/answer/i);
  });

  it("lets a 'No' continue", () => {
    expect(safetyBlockedReason(flag("no"))).toBeNull();
    expect(isSafetyHardStop(flag("no"))).toBe(false);
  });

  it("stops every 'Yes', whatever else is set", () => {
    for (const bleeding of [false, true]) {
      expect(isSafetyHardStop(flag("yes", bleeding))).toBe(true);
      expect(safetyBlockedReason(flag("yes", bleeding))).not.toBeNull();
    }
  });

  it("locks every later teleconsult page until the answer is 'No'", () => {
    for (const answer of [undefined, "yes"] as const) {
      for (const key of ["about", "history", "concern", "review"] as const) {
        expect(canEnterStep(key, true, flag(answer))).toBe(false);
      }
    }
    expect(canEnterStep("review", true, flag("no"))).toBe(true);
    expect(canEnterStep("safety", true, flag("yes"))).toBe(true);
  });

  it("does not gate services without a safety page", () => {
    expect(canEnterStep("review", false, flag(undefined))).toBe(true);
  });

  it("reopens a saved positive screen on the hard stop", () => {
    const answer = redFlagFromScreen({ chestPain: true, dyspnea: false });
    expect(answer).toBe("yes");
    expect(clampResumeStep("review", true, flag(answer))).toBe("safety");
  });

  it("resumes where the patient was after a 'No'", () => {
    expect(clampResumeStep("concern", true, flag(redFlagFromScreen({ chestPain: false, dyspnea: false })))).toBe("concern");
  });

  it("treats a half-answered screen as unanswered", () => {
    expect(redFlagFromScreen({ chestPain: false })).toBeUndefined();
  });
});

describe("concern page", () => {
  it("requires a main concern", () => {
    expect(concernBlockedReason("  ")).toMatch(/main concern/i);
    expect(concernBlockedReason("Cough for 3 days")).toBeNull();
  });

  it("holds an unbelievable home reading", () => {
    expect(concernBlockedReason("Cough", { spo2Percent: 40 })).toMatch(/vitals/i);
    expect(concernBlockedReason("Cough", { systolicBp: 80, diastolicBp: 120 })).toMatch(/blood pressure/i);
    expect(concernBlockedReason("Cough", { systolicBp: 120 })).toMatch(/blood pressure/i);
  });

  it("passes believable or absent readings", () => {
    expect(concernBlockedReason("Cough", { spo2Percent: 88, systolicBp: 190, diastolicBp: 120 })).toBeNull();
    expect(concernBlockedReason("Cough", {})).toBeNull();
  });
});
