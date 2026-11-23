import { describe, expect, it } from "vitest";
import { listMissing, missingRequiredFields } from "./requiredFields";

const med = { genericName: "Paracetamol", dose: "500 mg", route: "per orem", frequency: "every 4 hours", duration: "3 days", instructions: "" };

describe("missingRequiredFields", () => {
  it("names a blank prescription Instructions box (the server's 422 on slide 6)", () => {
    expect(missingRequiredFields("prescription", { medications: [med] })).toEqual(["Instructions"]);
  });

  it("prefixes per-row fields when there is more than one row", () => {
    expect(
      missingRequiredFields("prescription", { medications: [{ ...med, instructions: "After meals" }, { ...med, dose: " " }] }),
    ).toEqual(["Medication 2: Dose", "Medication 2: Instructions"]);
  });

  it("checks the certificate's Assessment / Diagnosis only", () => {
    expect(missingRequiredFields("medical_certificate", { statement: "", validFrom: "2026-11-23", validThrough: "2026-11-23" })).toEqual([
      "Assessment / Diagnosis",
    ]);
  });

  it("reads the single Test field for either modality", () => {
    expect(
      missingRequiredFields("diagnostic_request", {
        modality: "imaging",
        items: [{ studyName: "X-ray", rationale: "", priority: "routine" }],
      }),
    ).toEqual(["Impression / Diagnosis"]);
    expect(
      missingRequiredFields("diagnostic_request", { modality: "lab", items: [{ testName: "", rationale: "r", priority: "routine" }] }),
    ).toEqual(["Test"]);
  });

  it("passes a complete document", () => {
    expect(missingRequiredFields("prescription", { medications: [{ ...med, instructions: "After meals" }] })).toEqual([]);
  });
});

describe("listMissing", () => {
  it("joins into one readable phrase", () => {
    expect(listMissing([])).toBe("");
    expect(listMissing(["Dose"])).toBe("Dose");
    expect(listMissing(["Dose", "Route", "Instructions"])).toBe("Dose, Route and Instructions");
  });
});
