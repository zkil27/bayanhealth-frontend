import { describe, expect, it } from "vitest";

import type { BookingIntakeForm } from "@/features/doctor/lib/api/bookingIntake";

import { DEMO_SEED_VERSIONS } from "./demo";
import { countChanges, diffHistory, diffSection } from "./diff";
import {
  draftSectionState,
  emptyHistory,
  historyFromIntake,
  intakeNotes,
  isSectionEmpty,
  packYears,
  sectionRows,
  startDraft,
  versionSectionStates,
  visibleSections,
} from "./model";

function intake(details: NonNullable<BookingIntakeForm["sections"]["details"]>): BookingIntakeForm {
  return {
    bookingId: "b1",
    status: "submitted",
    currentStep: "review",
    completedSteps: ["purpose", "details", "review"],
    sections: { details },
  };
}

describe("packYears", () => {
  it("multiplies packs per day by years, to one decimal", () => {
    expect(packYears("1", "15")).toBe(15);
    expect(packYears("0.5", "25")).toBe(12.5);
    expect(packYears("0.33", "10")).toBe(3.3);
  });
  it("is undefined until both inputs are positive numbers", () => {
    expect(packYears("", "10")).toBeUndefined();
    expect(packYears("1", "")).toBeUndefined();
    expect(packYears("0", "10")).toBeUndefined();
    expect(packYears("abc", "10")).toBeUndefined();
  });
});

describe("historyFromIntake", () => {
  it("maps the contract's history fields and leaves the rest empty", () => {
    const data = historyFromIntake(
      intake({
        allergies: "Penicillin (rash)",
        demographics: { sex: "female", dateOfBirth: "1990-01-02" },
        structuredMedicalHistory: {
          knownConditions: ["asthma", "other"],
          noneReported: false,
          other: "Migraine",
          details: "Appendectomy, March 2025, PGH",
          currentMedications: "Salbutamol PRN",
        },
        reproductiveHealth: { pregnancyPossibility: "not_possible", lastMenstrualPeriod: "2026-11-01" },
      }),
    );
    expect(data.allergies).toEqual({ drug: "Penicillin (rash)", noneKnown: false, latex: "" });
    expect(data.medical.conditions).toEqual(["asthma"]);
    expect(data.medical.other).toBe("Migraine");
    expect(data.medical.maintenanceMeds).toBe("Salbutamol PRN");
    expect(data.surgical.entries[0].procedure).toBe("Appendectomy, March 2025, PGH");
    expect(data.obgyn.lastMenstrualPeriod).toBe("2026-11-01");
    expect(isSectionEmpty(data, "family")).toBe(true);
    expect(isSectionEmpty(data, "social")).toBe(true);
  });

  it("reads a negative allergy statement as no known allergies, not as an allergy", () => {
    const data = historyFromIntake(intake({ allergies: "NKDA" }));
    expect(data.allergies.noneKnown).toBe(true);
    expect(data.allergies.drug).toBe("");
  });

  it("returns an empty chart without an intake", () => {
    expect(historyFromIntake(null)).toEqual(emptyHistory());
  });
});

describe("visibleSections", () => {
  it("hides the gynecologic section for male patients only", () => {
    const data = emptyHistory();
    expect(visibleSections(data)).toContain("obgyn");
    data.demographics.sex = "male";
    expect(visibleSections(data)).not.toContain("obgyn");
  });
});

describe("sectionRows", () => {
  it("writes the obstetric score as G/P (T-P-A-L) for doctors and plain counts for patients", () => {
    const data = DEMO_SEED_VERSIONS.maria[0].data;
    expect(sectionRows(data, "obgyn").find((r) => r.key === "score")?.value).toBe("G2 P2 (2-0-0-2)");
    expect(sectionRows(data, "obgyn", "patient").find((r) => r.key === "score")?.value).toBe(
      "2 pregnancies, 2 living children",
    );
  });
  it("shows pack-years to doctors only", () => {
    const data = DEMO_SEED_VERSIONS.ramon[0].data;
    expect(sectionRows(data, "social")[0].value).toContain("15 pack-years");
    expect(sectionRows(data, "social", "patient")[0].value).not.toContain("pack-years");
  });
});

describe("diff", () => {
  const [v1, v2] = DEMO_SEED_VERSIONS.ramon;

  it("lists changed fields with before and after", () => {
    const changes = diffSection(v1.data, v2.data, "allergies");
    expect(changes).toEqual([
      { key: "drug", label: "Drug / other allergies", before: "No known allergies", after: "Amlodipine (peripheral edema)" },
    ]);
  });

  it("omits unchanged sections and counts every changed field", () => {
    const diff = diffHistory(v1.data, v2.data);
    expect(Object.keys(diff).sort()).toEqual(["allergies", "medical"]);
    expect(countChanges(diff)).toBe(3);
  });

  it("reports a removed operation", () => {
    const after = structuredClone(v1.data);
    after.surgical.entries = [];
    const changes = diffSection(v1.data, after, "surgical");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ label: "Appendectomy", after: "" });
  });
});

describe("draft section states", () => {
  it("marks intake-filled sections on a first consult as needing confirmation", () => {
    const draft = startDraft("b1", undefined, intake({ allergies: "Penicillin" }));
    expect(draftSectionState(draft, undefined, "allergies")).toBe("from_intake");
    expect(draftSectionState(draft, undefined, "family")).toBe("not_recorded");
    expect(versionSectionStates(draft, undefined).allergies).toBe("patient_reported");
  });

  it("separates reviewed, updated and carried sections against the base version", () => {
    const base = DEMO_SEED_VERSIONS.ramon[1];
    const draft = startDraft("b2", base, null);
    expect(draftSectionState(draft, base, "medical")).toBe("carried");

    draft.reviewed.push("medical");
    expect(draftSectionState(draft, base, "medical")).toBe("reviewed");

    draft.data.social.alcohol = "none";
    draft.edited.push("social");
    expect(draftSectionState(draft, base, "social")).toBe("updated");

    const frozen = versionSectionStates(draft, base);
    expect(frozen).toMatchObject({ medical: "reviewed", social: "updated", family: "carried" });
  });

  it("an edit that ends where it started counts as reviewed, not updated", () => {
    const base = DEMO_SEED_VERSIONS.ramon[1];
    const draft = startDraft("b2", base, null);
    draft.edited.push("family");
    expect(draftSectionState(draft, base, "family")).toBe("reviewed");
  });
});

describe("intakeNotes", () => {
  it("surfaces an allergy and a condition the latest version does not have", () => {
    const latest = DEMO_SEED_VERSIONS.ramon[1];
    const notes = intakeNotes(
      latest,
      intake({
        allergies: "Sulfa drugs",
        structuredMedicalHistory: { knownConditions: ["diabetes", "asthma"], noneReported: false },
      }),
    );
    expect(notes.allergies).toBe("Intake today lists: Sulfa drugs");
    expect(notes.medical).toContain("New on intake: Asthma");
  });

  it("is silent when the intake agrees with the chart", () => {
    const latest = DEMO_SEED_VERSIONS.ramon[1];
    const notes = intakeNotes(latest, intake({ allergies: "Amlodipine (peripheral edema)" }));
    expect(notes).toEqual({});
  });
});
