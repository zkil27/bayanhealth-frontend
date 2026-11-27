import type { HistoryDraft } from "./types";

/**
 * The doctor's unsaved chart draft, per booking, in this browser.
 *
 * The draft is written in the call room and saved from the post-consult
 * workspace, two different pages, so it lives in `localStorage`
 * (`bh:pmh-draft:<bookingId>`), like the post-consult "not needed" marks. A
 * small listener set keeps two panels on the same page (the desktop rail and
 * the phone sheet) in step, and the `storage` event covers a second tab.
 */

const PREFIX = "bh:pmh-draft:";
const listeners = new Set<() => void>();
/** Cache by raw string so `useSyncExternalStore` sees a stable snapshot. */
const cache = new Map<string, { raw: string | null; draft: HistoryDraft | null }>();

export function draftStorageKey(bookingId: string): string {
  return PREFIX + bookingId;
}

export function readDraft(bookingId: string): HistoryDraft | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(draftStorageKey(bookingId));
  } catch {
    return null;
  }
  const cached = cache.get(bookingId);
  if (cached && cached.raw === raw) return cached.draft;
  let draft: HistoryDraft | null = null;
  try {
    draft = raw ? (JSON.parse(raw) as HistoryDraft) : null;
  } catch {
    draft = null;
  }
  cache.set(bookingId, { raw, draft });
  return draft;
}

function emit() {
  for (const listener of listeners) listener();
}

export function writeDraft(draft: HistoryDraft): void {
  try {
    window.localStorage.setItem(draftStorageKey(draft.bookingId), JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the draft still lives in memory for this page.
    cache.set(draft.bookingId, { raw: JSON.stringify(draft), draft });
  }
  emit();
}

export function clearDraft(bookingId: string): void {
  try {
    window.localStorage.removeItem(draftStorageKey(bookingId));
  } catch {
    // ignore
  }
  cache.delete(bookingId);
  emit();
}

export function subscribeDrafts(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(PREFIX)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
