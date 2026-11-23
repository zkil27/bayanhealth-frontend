import { describe, expect, it } from "vitest";
import { diagnosticTestValue, moveTestToModality, withDiagnosticTest } from "./diagnosticTest";

const base = { rationale: "r", priority: "routine" as const };

describe("diagnosticTest", () => {
  it("reads the modality's own field first, then the other", () => {
    expect(diagnosticTestValue({ ...base, testName: "CBC" }, "lab")).toBe("CBC");
    expect(diagnosticTestValue({ ...base, testName: "X-ray" }, "imaging")).toBe("X-ray");
    expect(diagnosticTestValue({ ...base, studyName: "X-ray", testName: "XR" }, "imaging")).toBe("X-ray");
    expect(diagnosticTestValue(base, "lab")).toBe("");
  });

  it("writes studyName for imaging and testName otherwise", () => {
    expect(withDiagnosticTest(base, "imaging", "CT")).toMatchObject({ studyName: "CT" });
    expect(withDiagnosticTest(base, "lab", "CBC")).toMatchObject({ testName: "CBC" });
  });

  it("moves a value shown from the other field instead of duplicating it", () => {
    const next = withDiagnosticTest({ ...base, testName: "X-ra" }, "imaging", "X-ray");
    expect(next.studyName).toBe("X-ray");
    expect(next.testName).toBeUndefined();
  });

  it("moves the value on a modality change", () => {
    const next = moveTestToModality({ ...base, testName: "Chest X-ray" }, "imaging");
    expect(next).toMatchObject({ studyName: "Chest X-ray" });
    expect(next.testName).toBeUndefined();
    const same = { ...base, testName: "CBC" };
    expect(moveTestToModality(same, "urinalysis")).toBe(same);
  });
});
