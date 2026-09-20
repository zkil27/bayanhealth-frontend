/**
 * Reading a doctor's published availability, completely.
 *
 * `GET /v1/doctors/{doctorId}/schedules` paginates: it caps a page at 50 items
 * by default (100 maximum) and advertises a cursor in `meta.pagination.cursor`
 * when more remain. A caller that reads `data` and stops has not read the
 * doctor's availability — it has read the first page of it.
 *
 * That distinction is load-bearing on both sides of the product and in opposite
 * ways, which is why this walk lives here rather than in either feature:
 *
 * - **The doctor's calendar** renders a month at a time. A busy month runs to
 *   several hundred slots, so a truncated read left published days looking
 *   empty and made "does this date have availability?" answer wrongly.
 * - **The patient's booking flow** asks for a 30-day window across every doctor.
 *   A doctor running 15-minute appointments passes 50 slots inside two working
 *   days, so a truncated read silently withholds the rest of the month from the
 *   patient — availability the doctor published and nobody can book.
 *
 * Both are the same bug against the same endpoint, so both use the same walk.
 *
 * The walk is bounded (see {@link MAX_SCHEDULE_PAGES}) and de-duplicates by slot
 * identity, because consecutive cursor pages can overlap.
 */

import { api } from "@/lib/api";

/** Largest page the contract allows, so a range needs as few round trips as possible. */
export const SCHEDULE_PAGE_LIMIT = 100;

/**
 * Upper bound on the cursor walk.
 *
 * 20 pages of 100 covers any realistic month (a 12-hour day at 15-minute
 * granularity is 48 slots), and bounding the loop means a server that kept
 * advertising a cursor could never spin the browser.
 */
export const MAX_SCHEDULE_PAGES = 20;

/** The fields this module needs to tell two slots apart across pages. */
export interface SlotIdentity {
  slotId: string;
  /** YYYY-MM-DD */
  date: string;
}

/** Optional list controls — the server paginates via an opaque cursor. */
export interface SlotPageOptions {
  limit?: number;
  cursor?: string;
}

/** One page of slots plus the cursor for the next page, if the server has one. */
export interface SlotPage<T> {
  slots: T[];
  cursor?: string;
}

function schedulePath(
  doctorId: string,
  startDate: string,
  endDate: string,
  opts?: SlotPageOptions,
): string {
  const params = new URLSearchParams({ startDate, endDate });
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  return `/v1/doctors/${encodeURIComponent(doctorId)}/schedules?${params.toString()}`;
}

/** Read one page, exposing the pagination cursor the envelope carries in `meta`. */
export async function fetchSlotPage<T>(
  idToken: string,
  doctorId: string,
  startDate: string,
  endDate: string,
  opts?: SlotPageOptions,
): Promise<SlotPage<T>> {
  const res = await api.get<T[]>(
    schedulePath(doctorId, startDate, endDate, opts),
    idToken,
  );
  const cursor = res.meta?.pagination?.cursor;
  return { slots: res.data ?? [], ...(cursor ? { cursor } : {}) };
}

/**
 * Read every slot a doctor has in a date range, following the cursor to the end.
 *
 * Ordered by date + startTime ascending, as the endpoint returns them.
 */
export async function fetchSlotsInRange<T extends SlotIdentity>(
  idToken: string,
  doctorId: string,
  startDate: string,
  endDate: string,
): Promise<T[]> {
  const seen = new Set<string>();
  const all: T[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_SCHEDULE_PAGES; page += 1) {
    const result = await fetchSlotPage<T>(idToken, doctorId, startDate, endDate, {
      limit: SCHEDULE_PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });
    for (const slot of result.slots) {
      const key = `${slot.date}#${slot.slotId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(slot);
    }
    cursor = result.cursor;
    if (!cursor) break;
  }

  return all;
}
