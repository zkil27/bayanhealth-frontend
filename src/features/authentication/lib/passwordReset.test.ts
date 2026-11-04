import { describe, expect, it } from "vitest";

import { CognitoError } from "@/lib/cognito";

import { passwordMeetsRules, resetErrorMessage } from "./passwordReset";

const err = (code: string) => new CognitoError(code, "raw");

describe("password reset", () => {
  it("never reveals whether an email has an account", () => {
    expect(resetErrorMessage("request", err("UserNotFoundException"))).toBeNull();
  });

  it("explains code problems plainly", () => {
    expect(resetErrorMessage("confirm", err("CodeMismatchException"))).toMatch(/code is not right/i);
    expect(resetErrorMessage("confirm", err("ExpiredCodeException"))).toMatch(/expired/i);
    expect(resetErrorMessage("confirm", err("LimitExceededException"))).toMatch(/too many/i);
  });

  it("falls back to a calm generic message", () => {
    expect(resetErrorMessage("confirm", new Error("network"))).toMatch(/try again/i);
  });

  it("uses the sign-up password rules", () => {
    expect(passwordMeetsRules("Short1!")).toBe(false);
    expect(passwordMeetsRules("longenough1!")).toBe(false);
    expect(passwordMeetsRules("LongEnough1!")).toBe(true);
  });
});
