import { describe, expect, it } from "vitest";
import type { StorageLike } from "./intakeDraft";
import { claimMoment, hasSeenMoment, markMomentSeen, MOTION_MOMENT_PREFIX } from "./motionMoments";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
  };
}

function throwingStorage(): StorageLike {
  const fail = () => {
    throw new Error("SecurityError");
  };
  return { getItem: fail, setItem: fail, removeItem: fail, length: 0, key: fail };
}

describe("claimMoment", () => {
  it("returns true the first time a moment is claimed", () => {
    expect(claimMoment(memoryStorage(), "booking-confirmed:b1")).toBe(true);
  });

  it("returns false on every later claim of the same moment", () => {
    const storage = memoryStorage();
    claimMoment(storage, "booking-confirmed:b1");
    expect(claimMoment(storage, "booking-confirmed:b1")).toBe(false);
    expect(claimMoment(storage, "booking-confirmed:b1")).toBe(false);
  });

  it("keeps separate moments separate", () => {
    const storage = memoryStorage();
    expect(claimMoment(storage, "booking-confirmed:b1")).toBe(true);
    expect(claimMoment(storage, "booking-confirmed:b2")).toBe(true);
    expect(claimMoment(storage, "doctor-accepted:b1")).toBe(true);
  });

  it("namespaces its keys", () => {
    const storage = memoryStorage();
    claimMoment(storage, "released:a1");
    expect([...storage.data.keys()]).toEqual([`${MOTION_MOMENT_PREFIX}released:a1`]);
  });

  it("returns false, never throws, when storage is missing or blocked", () => {
    expect(claimMoment(null, "booking-confirmed:b1")).toBe(false);
    expect(() => claimMoment(throwingStorage(), "booking-confirmed:b1")).not.toThrow();
    expect(claimMoment(throwingStorage(), "booking-confirmed:b1")).toBe(false);
  });
});

describe("hasSeenMoment / markMomentSeen", () => {
  it("reads without claiming, so repeated reads agree", () => {
    const storage = memoryStorage();
    expect(hasSeenMoment(storage, "x")).toBe(false);
    expect(hasSeenMoment(storage, "x")).toBe(false);
    markMomentSeen(storage, "x");
    expect(hasSeenMoment(storage, "x")).toBe(true);
  });

  it("treats missing or blocked storage as already seen, so nothing replays", () => {
    expect(hasSeenMoment(null, "x")).toBe(true);
    expect(hasSeenMoment(throwingStorage(), "x")).toBe(true);
    expect(() => markMomentSeen(throwingStorage(), "x")).not.toThrow();
  });
});
