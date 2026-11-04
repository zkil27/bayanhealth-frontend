import { describe, expect, it } from "vitest";

import {
  classifyBloodPressure,
  classifyVital,
  formatBloodPressure,
  formatVital,
  vitalPatientMessage,
  type VitalKind,
  type VitalStatus,
} from "./vitalStatus";

describe("classifyVital", () => {
  const cases: [VitalKind, unknown, VitalStatus][] = [
    ["spo2Percent", undefined, "not_recorded"],
    ["spo2Percent", "", "not_recorded"],
    ["spo2Percent", 0, "too_low"],
    ["spo2Percent", 49, "too_low"],
    ["spo2Percent", 50, "ok"],
    ["spo2Percent", 100, "ok"],
    ["spo2Percent", 101, "too_high"],
    ["spo2Percent", 97.5, "invalid"],
    ["temperatureC", 37.5, "ok"],
    ["temperatureC", 29.9, "too_low"],
    ["temperatureC", 45.1, "too_high"],
    ["temperatureC", Number.NaN, "invalid"],
    ["heartRateBpm", -5, "too_low"],
    ["heartRateBpm", 72, "ok"],
    ["heartRateBpm", 301, "too_high"],
    ["systolicBp", 40, "ok"],
    ["diastolicBp", 19, "too_low"],
    ["diastolicBp", "abc", "invalid"],
  ];
  it.each(cases)("%s %s is %s", (kind, value, expected) => {
    expect(classifyVital(kind, value)).toBe(expected);
  });
});

describe("blood pressure pair", () => {
  it("needs the top number higher", () => {
    expect(classifyBloodPressure(120, 80).pair).toBe("ok");
    expect(classifyBloodPressure(80, 120).pair).toBe("invalid");
    expect(classifyBloodPressure(100, 100).pair).toBe("invalid");
  });

  it("needs both numbers", () => {
    expect(classifyBloodPressure(120, undefined).pair).toBe("invalid");
    expect(classifyBloodPressure(undefined, undefined).pair).toBe("not_recorded");
  });

  it("reports an out-of-range half first", () => {
    expect(classifyBloodPressure(10, 80).pair).toBe("too_low");
  });
});

describe("read-back text", () => {
  it("shows a status word instead of a misleading number", () => {
    expect(formatVital("spo2Percent", 0)).toBe("Too low");
    expect(formatVital("spo2Percent", 98)).toBe("98%");
    expect(formatVital("temperatureC", 37.2)).toBe("37.2 °C");
    expect(formatBloodPressure(80, 120)).toBe("Invalid");
    expect(formatBloodPressure(120, 80)).toBe("120/80 mmHg");
  });

  it("tells the patient what to do", () => {
    expect(vitalPatientMessage("spo2Percent", "too_low")).toMatch(/^Too low\./);
    expect(vitalPatientMessage("heartRateBpm", "invalid")).toMatch(/whole numbers/i);
    expect(vitalPatientMessage("spo2Percent", "ok")).toBeNull();
  });
});
