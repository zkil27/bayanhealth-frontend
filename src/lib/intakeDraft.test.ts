import { describe, expect, it } from "vitest";

import {
  clearAllIntakeDrafts,
  clearIntakeDraft,
  intakeDraftKey,
  isDraftCurrent,
  readIntakeDraft,
  writeIntakeDraft,
  type IntakeDraft,
  type StorageLike,
} from "./intakeDraft";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    get length() {
      return map.size;
    },
    key: (index) => [...map.keys()][index] ?? null,
  };
}

const draft = (baseRevision: number): IntakeDraft<{ note: string }> => ({
  version: 1,
  savedAt: 1,
  baseRevision,
  values: { note: "cough" },
  ui: { "pain.timing.onset": "other" },
  safetyAnswer: "no",
  step: "concern",
  furthestStep: "concern",
});

describe("intake draft", () => {
  it("round-trips values, screen state and position", () => {
    const storage = memoryStorage();
    const key = intakeDraftKey("u1", "b1");
    expect(writeIntakeDraft(storage, key, draft(3))).toBe(true);
    expect(readIntakeDraft(storage, key)).toEqual(draft(3));
  });

  it("is used only against the same server revision", () => {
    expect(isDraftCurrent(draft(3), 3)).toBe(true);
    expect(isDraftCurrent(draft(3), 4)).toBe(false);
    expect(isDraftCurrent(null, 0)).toBe(false);
  });

  it("ignores corrupt entries", () => {
    const storage = memoryStorage();
    storage.setItem("k", "{not json");
    expect(readIntakeDraft(storage, "k")).toBeNull();
  });

  it("clears one draft, or every draft on sign-out", () => {
    const storage = memoryStorage();
    writeIntakeDraft(storage, intakeDraftKey("u1", "b1"), draft(1));
    writeIntakeDraft(storage, intakeDraftKey("u1", "b2"), draft(1));
    storage.setItem("unrelated", "keep");
    clearIntakeDraft(storage, intakeDraftKey("u1", "b1"));
    expect(readIntakeDraft(storage, intakeDraftKey("u1", "b1"))).toBeNull();
    clearAllIntakeDrafts(storage);
    expect(storage.length).toBe(1);
    expect(storage.getItem("unrelated")).toBe("keep");
  });

  it("keys drafts by user and booking", () => {
    expect(intakeDraftKey("u1", "b1")).not.toBe(intakeDraftKey("u2", "b1"));
  });
});
