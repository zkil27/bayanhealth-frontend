/**
 * Device copy of an in-progress intake (pilot feedback: "save form data
 * automatically" and "Back must not lose saved data").
 *
 * The server keeps a page once Continue saves it. This copy covers what the
 * server does not have yet: half-filled pages, the answer on the safety page,
 * and screen-only selections. It lives in `sessionStorage`, so it is scoped to
 * this browser tab and gone when the tab closes; it is also cleared on submit
 * and on sign-out, because it holds health details.
 *
 * Logic change: new persistence. No API, schema, or payload change.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

export const INTAKE_DRAFT_PREFIX = "bh:intake-draft:v1:";

export interface IntakeDraft<V = unknown> {
  version: 1;
  savedAt: number;
  /** Server intake revision this draft was written against. */
  baseRevision: number;
  values: V;
  ui: Record<string, unknown>;
  safetyAnswer: "no" | "yes" | undefined;
  step: string;
  furthestStep: string;
}

export function intakeDraftKey(userId: string, bookingId: string): string {
  return `${INTAKE_DRAFT_PREFIX}${userId}:${bookingId}`;
}

/** The tab's sessionStorage, or null where it does not exist or is blocked. */
export function browserDraftStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readIntakeDraft<V>(storage: StorageLike | null, key: string): IntakeDraft<V> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntakeDraft<V>;
    return parsed && parsed.version === 1 && typeof parsed.baseRevision === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeIntakeDraft<V>(storage: StorageLike | null, key: string, draft: IntakeDraft<V>): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    // Quota or privacy mode: the server copy still holds every Continue.
    return false;
  }
}

export function clearIntakeDraft(storage: StorageLike | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to recover.
  }
}

/** Removes every intake draft in this tab, e.g. on sign-out. */
export function clearAllIntakeDrafts(storage: StorageLike | null = browserDraftStorage()): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(INTAKE_DRAFT_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Nothing to recover.
  }
}

/**
 * A draft is used only when it was written against the revision the server
 * holds now. A newer server revision means another tab or device saved since,
 * and that copy wins.
 */
export function isDraftCurrent(draft: IntakeDraft | null, serverRevision: number): draft is IntakeDraft {
  return !!draft && draft.baseRevision === serverRevision;
}
