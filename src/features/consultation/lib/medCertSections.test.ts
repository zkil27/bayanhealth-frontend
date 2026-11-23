import { describe, expect, it } from "vitest";
import { formatCertDate, parseMedCertRestrictions, serializeMedCertRestrictions } from "./medCertSections";

describe("medCertSections", () => {
  it("round-trips the three lines", () => {
    const sections = {
      bedRest: "3 days, Nov 23–25",
      fitToWork: "May return Nov 26",
      carePlan: "Paracetamol as prescribed.\nReturn if fever persists past 3 days.",
    };
    const text = serializeMedCertRestrictions(sections);
    expect(text).toBe(
      "Bed rest: 3 days, Nov 23–25\nFit to work: May return Nov 26\nCare plan: Paracetamol as prescribed.\nReturn if fever persists past 3 days.",
    );
    expect(parseMedCertRestrictions(text)).toEqual(sections);
  });

  it("keeps trailing spaces while the doctor is typing", () => {
    const text = serializeMedCertRestrictions({ bedRest: "3 ", fitToWork: "", carePlan: "" });
    expect(parseMedCertRestrictions(text).bedRest).toBe("3 ");
  });

  it("omits blank lines and returns undefined when everything is blank", () => {
    expect(serializeMedCertRestrictions({ bedRest: "", fitToWork: "Today", carePlan: "  " })).toBe("Fit to work: Today");
    expect(serializeMedCertRestrictions({ bedRest: "", fitToWork: "", carePlan: "" })).toBeUndefined();
  });

  it("treats unlabeled legacy text as the care plan and the date range as bed rest", () => {
    expect(
      parseMedCertRestrictions("Fit to work with precautions.", { validFrom: "2023-10-27", validThrough: "2023-10-29" }),
    ).toEqual({ bedRest: "Oct 27, 2023 to Oct 29, 2023", fitToWork: "", carePlan: "Fit to work with precautions." });
  });

  it("does not invent bed rest from a single-day range", () => {
    expect(parseMedCertRestrictions(undefined, { validFrom: "2026-11-23", validThrough: "2026-11-23" })).toEqual({
      bedRest: "",
      fitToWork: "",
      carePlan: "",
    });
  });

  it("accepts label variants and puts preamble text in the care plan", () => {
    expect(parseMedCertRestrictions("Rest well.\nBED REST RECOMMENDATION: 2 days\nFit to return: Monday")).toEqual({
      bedRest: "2 days",
      fitToWork: "Monday",
      carePlan: "Rest well.",
    });
  });

  it("formats calendar dates without a timezone shift", () => {
    expect(formatCertDate("2026-11-01")).toBe("Nov 1, 2026");
    expect(formatCertDate("nope")).toBeNull();
  });
});
