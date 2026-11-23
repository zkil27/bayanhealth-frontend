import { describe, expect, it } from "vitest";
import { safeReturnTo, withReturnTo } from "./safeReturnTo";

describe("safeReturnTo", () => {
  it("accepts an in-scope app path, keeping its query", () => {
    expect(safeReturnTo("/patient/booking/getBooking/bk_1", "/patient/")).toBe("/patient/booking/getBooking/bk_1");
    expect(safeReturnTo("/doctor/history?page=2", "/doctor/")).toBe("/doctor/history?page=2");
  });

  it("rejects missing, out-of-scope and cross-role paths", () => {
    expect(safeReturnTo(null, "/patient/")).toBeNull();
    expect(safeReturnTo("", "/patient/")).toBeNull();
    expect(safeReturnTo("/doctor/history", "/patient/")).toBeNull();
    expect(safeReturnTo("/patientx", "/patient/")).toBeNull();
  });

  it("rejects anything that could leave the app", () => {
    expect(safeReturnTo("https://evil.com/patient/", "/patient/")).toBeNull();
    expect(safeReturnTo("//evil.com/patient/", "/patient/")).toBeNull();
    expect(safeReturnTo("/patient/\\evil.com", "/patient/")).toBeNull();
    expect(safeReturnTo("/patient/../admin", "/patient/")).toBeNull();
    expect(safeReturnTo("/patient/\nx", "/patient/")).toBeNull();
  });
});

describe("withReturnTo", () => {
  it("encodes the target and picks the right separator", () => {
    expect(withReturnTo("/patient/chat/bk_1", "/patient/booking/getBooking/bk_1")).toBe(
      "/patient/chat/bk_1?returnTo=%2Fpatient%2Fbooking%2FgetBooking%2Fbk_1",
    );
    expect(withReturnTo("/doctor/chat/bk_1?x=1", "/doctor/history")).toBe(
      "/doctor/chat/bk_1?x=1&returnTo=%2Fdoctor%2Fhistory",
    );
  });
});
