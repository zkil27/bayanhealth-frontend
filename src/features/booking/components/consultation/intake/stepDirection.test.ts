import { describe, expect, it } from "vitest";
import { stepDirection } from "./stepDirection";

describe("stepDirection", () => {
  it("is forward when the new page comes later", () => {
    expect(stepDirection(0, 1)).toBe("forward");
    expect(stepDirection(1, 4)).toBe("forward");
  });

  it("is back when the new page comes earlier", () => {
    expect(stepDirection(3, 2)).toBe("back");
    expect(stepDirection(4, 0)).toBe("back");
  });

  it("is none when the page did not change", () => {
    expect(stepDirection(2, 2)).toBe("none");
  });
});
