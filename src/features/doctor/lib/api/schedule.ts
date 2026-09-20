/**
 * Doctor schedule (availability slot) data access.
 *
 * Backend contract (contracts/openapi.yaml, tag `Schedules`, authenticated):
 *   GET    /v1/doctors/{doctorId}/schedules?startDate&endDate[&limit&cursor] -> Slot[]
 *   POST   /v1/doctors/{doctorId}/schedules                                   -> Slot (201)
 *   DELETE /v1/doctors/{doctorId}/schedules?date&startTime&endTime            -> DeleteShiftResult
 *   PUT    /v1/doctors/{doctorId}/schedules/{slotId}?date=YYYY-MM-DD          -> Slot
 *   DELETE /v1/doctors/{doctorId}/schedules/{slotId}?date=YYYY-MM-DD          -> 204
 *
 * `{doctorId}` is the doctor's own Cognito user id (the `sub` claim, which is
 * what `requireAuth` compares the path parameter against). All requests go
 * through the authenticated client in `@/lib/api` (Bearer IdToken). Writes
 * (POST/PUT/DELETE) carry an `Idempotency-Key`; callers may pass an explicit key
 * (reused on retry of the same logical write) — one is auto-generated otherwise.
 * There is no mock: this hits the deployed backend.
 *
 * The list endpoint paginates, so range reads that must be complete use
 * {@link listSlotsInRange} rather than {@link listSlots}; and because the create
 * endpoint is one-slot-per-call, generating a shift goes through
 * {@link createSlots}, which owns the per-slot key and partial-failure rules.
 */

import { ApiError, api } from "@/lib/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import {
  MAX_SCHEDULE_PAGES,
  SCHEDULE_PAGE_LIMIT,
  fetchSlotPage,
  fetchSlotsInRange,
} from "@/lib/schedules";

/*
  Re-exported so the doctor calendar's own callers and tests keep one import
  site. The walk itself lives in `@/lib/schedules` because the patient booking
  flow reads the same paginated endpoint and needs exactly the same completeness
  guarantee — see that module for why a first-page read is a real defect on both
  sides.
*/
export { MAX_SCHEDULE_PAGES, SCHEDULE_PAGE_LIMIT };

/** contract: Slot.status */
export type SlotStatus = "available" | "booked" | "blocked";

/** Slot durations the backend accepts (minutes). */
export type SlotDuration = 15 | 30 | 45 | 60;

/** contract: Slot */
export interface Slot {
  slotId: string;
  doctorId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  durationMinutes: number;
  status: SlotStatus;
  /** Present only when status is `booked`. */
  bookingId?: string;
  /** Returned by the backend when the slot was created with notes. */
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating a slot (contract: CreateSlotRequest). */
export interface CreateSlotRequest {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  durationMinutes: SlotDuration;
  notes?: string;
}

/** Body for updating a slot (contract: UpdateSlotRequest). All fields optional. */
export interface UpdateSlotRequest {
  status?: SlotStatus;
  startTime?: string;
  durationMinutes?: SlotDuration;
  notes?: string;
}

/** Optional list controls — server paginates via cursor (contract: pagination). */
export interface ListSlotsOptions {
  limit?: number;
  cursor?: string;
}

/**
 * List a doctor's slots in a date range, ordered by date + startTime ascending.
 *
 * `startDate` and `endDate` (both YYYY-MM-DD) are required by the contract.
 *
 * @returns the slot array (the `data` of the success envelope).
 */
export async function listSlots(
  idToken: string,
  doctorId: string,
  startDate: string,
  endDate: string,
  opts?: ListSlotsOptions,
): Promise<Slot[]> {
  const params = new URLSearchParams({ startDate, endDate });
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  const res = await api.get<Slot[]>(
    `/v1/doctors/${encodeURIComponent(doctorId)}/schedules?${params.toString()}`,
    idToken,
  );
  return res.data;
}

/** One page of slots plus the cursor for the next page, if the server has one. */
export interface SlotPage {
  slots: Slot[];
  cursor?: string;
}

/** Read one page, exposing the pagination cursor the envelope carries in `meta`. */
export function listSlotsPage(
  idToken: string,
  doctorId: string,
  startDate: string,
  endDate: string,
  opts?: ListSlotsOptions,
): Promise<SlotPage> {
  return fetchSlotPage<Slot>(idToken, doctorId, startDate, endDate, opts);
}

/**
 * Read every slot in a date range by following the pagination cursor.
 *
 * `listSlots` returns only the first page, and the server's default page size is
 * 50 — so a doctor with a full month (or even a busy week) published had slots
 * silently missing from the screen, which also made any "does this date have
 * slots?" indicator wrong.
 */
export function listSlotsInRange(
  idToken: string,
  doctorId: string,
  startDate: string,
  endDate: string,
): Promise<Slot[]> {
  return fetchSlotsInRange<Slot>(idToken, doctorId, startDate, endDate);
}

/**
 * Create a new availability slot. Returns the created slot (201).
 *
 * @param idempotencyKey - Optional explicit key; reuse on retry so the backend
 *   does not create a duplicate slot.
 */
export async function createSlot(
  idToken: string,
  doctorId: string,
  body: CreateSlotRequest,
  idempotencyKey?: string,
): Promise<Slot> {
  const res = await api.post<Slot>(
    `/v1/doctors/${encodeURIComponent(doctorId)}/schedules`,
    idToken,
    body,
    idempotencyKey ?? newIdempotencyKey(),
  );
  return res.data;
}

/** One slot that the backend refused, kept alongside its intended start time. */
export interface SlotCreateFailure {
  /** HH:MM of the slot that was not created. */
  startTime: string;
  /** Backend error code when the response carried one. */
  code?: string;
  message: string;
}

/** Per-slot outcome of a bulk generation run. */
export interface BulkCreateResult {
  created: Slot[];
  failures: SlotCreateFailure[];
}

/**
 * Create several slots for one shift, reporting each outcome separately.
 *
 * `POST /v1/doctors/{doctorId}/schedules` creates exactly one slot, so bulk
 * generation is a client-side loop. Two things make that loop non-obvious:
 *
 * - **Each request gets its own idempotency key.** Reusing one key would make
 *   the backend treat every request after the first as a replay of the first —
 *   generating six slots would return the same slot six times and persist one.
 * - **Requests run sequentially and failures do not abort the run.** A doctor
 *   who asked for six slots would rather have five created and be told which one
 *   failed than have the whole shift rejected, so the caller receives both lists
 *   and decides what to say.
 */
export async function createSlots(
  idToken: string,
  doctorId: string,
  requests: CreateSlotRequest[],
): Promise<BulkCreateResult> {
  const created: Slot[] = [];
  const failures: SlotCreateFailure[] = [];

  for (const body of requests) {
    try {
      created.push(
        await createSlot(idToken, doctorId, body, newIdempotencyKey()),
      );
    } catch (err) {
      failures.push({
        startTime: body.startTime,
        ...(err instanceof ApiError ? { code: err.code } : {}),
        message:
          err instanceof ApiError
            ? err.message
            : "The server did not accept this slot.",
      });
    }
  }

  return { created, failures };
}

/**
 * Update a slot (status/time/duration/notes). The `date` query param is
 * required by the contract to locate the slot. Returns the updated slot.
 */
export async function updateSlot(
  idToken: string,
  doctorId: string,
  slotId: string,
  date: string,
  patch: UpdateSlotRequest,
  idempotencyKey?: string,
): Promise<Slot> {
  const res = await api.put<Slot>(
    `/v1/doctors/${encodeURIComponent(doctorId)}/schedules/${encodeURIComponent(
      slotId,
    )}?date=${encodeURIComponent(date)}`,
    idToken,
    patch,
    idempotencyKey ?? newIdempotencyKey(),
  );
  return res.data;
}

/** One slot a shift delete removed (contract: DeleteShiftResult.deleted[]). */
export interface DeletedShiftSlot {
  slotId: string;
  /** HH:MM */
  startTime: string;
}

/** One slot a shift delete kept, and the reason to show (contract: RetainedShiftSlot). */
export interface RetainedShiftSlot extends DeletedShiftSlot {
  status: SlotStatus;
  /** Human-readable, safe to render verbatim. */
  reason: string;
}

/** What a shift delete did (contract: DeleteShiftResult). */
export interface DeleteShiftResult {
  date: string;
  startTime: string;
  endTime: string;
  deleted: DeletedShiftSlot[];
  retained: RetainedShiftSlot[];
}

/**
 * Delete every non-booked slot inside one time window on one date.
 *
 * A shift is not an entity — it is a run of independent slots — so removing one
 * meant a DELETE per slot from here: sixteen round trips to clear an eight-hour
 * day, each able to fail alone, with no single answer about the outcome.
 * `DELETE /v1/doctors/{id}/schedules` does that fan-out server-side and reports
 * both what went and what stayed.
 *
 * A `409 STATE_CONFLICT` — every slot in the window is booked — is *not* thrown.
 * It is an expected answer carrying the same per-slot `retained` list a success
 * does, and the caller renders the two identically; throwing would collapse
 * those reasons into one sentence. Every other failure still throws.
 */
export async function deleteShift(
  idToken: string,
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<DeleteShiftResult> {
  const params = new URLSearchParams({ date, startTime, endTime });
  const path = `/v1/doctors/${encodeURIComponent(doctorId)}/schedules?${params.toString()}`;

  try {
    const res = await api.delete<DeleteShiftResult>(path, idToken);
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.code === "STATE_CONFLICT") {
      return { date, startTime, endTime, deleted: [], retained: retainedFromError(err) };
    }
    throw err;
  }
}

/** The `retained` list a `409` carries in `error.details`, narrowed from untrusted JSON. */
function retainedFromError(err: ApiError): RetainedShiftSlot[] {
  const raw = err.details?.retained;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is RetainedShiftSlot =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as RetainedShiftSlot).slotId === "string" &&
      typeof (entry as RetainedShiftSlot).startTime === "string" &&
      typeof (entry as RetainedShiftSlot).reason === "string",
  );
}

/**
 * Delete named slots one request at a time, reporting each outcome separately.
 *
 * The mirror of {@link createSlots}, and the fallback path for
 * {@link removeShift}. A `booked` slot yields `409` from the per-slot endpoint,
 * which lands in `retained` with the backend's own wording rather than aborting
 * the run — a doctor who asked to clear a morning would rather have the open
 * hours cleared and be told which appointment stayed.
 */
export async function deleteSlots(
  idToken: string,
  doctorId: string,
  slots: readonly Slot[],
): Promise<{ deleted: DeletedShiftSlot[]; retained: RetainedShiftSlot[] }> {
  const deleted: DeletedShiftSlot[] = [];
  const retained: RetainedShiftSlot[] = [];

  for (const slot of slots) {
    if (slot.status === "booked") {
      // The backend would refuse this anyway; not sending it saves a round trip
      // and lets the reason be specific rather than a bare 409 message.
      retained.push({
        slotId: slot.slotId,
        startTime: slot.startTime,
        status: slot.status,
        reason:
          "A patient has booked this slot. Cancel the appointment before removing the time.",
      });
      continue;
    }
    try {
      await deleteSlot(idToken, doctorId, slot.slotId, slot.date);
      deleted.push({ slotId: slot.slotId, startTime: slot.startTime });
    } catch (err) {
      retained.push({
        slotId: slot.slotId,
        startTime: slot.startTime,
        status: slot.status,
        reason:
          err instanceof ApiError ? err.message : "The server did not remove this slot.",
      });
    }
  }

  return { deleted, retained };
}

/**
 * Remove a whole shift, preferring the one-request route and falling back to
 * per-slot deletes when it is not reachable.
 *
 * The fallback is not defensive padding: `DELETE /v1/doctors/{id}/schedules` is
 * a route this change adds, and an API Gateway stage that has not had the new
 * route applied yet answers any request to it with a plain `404` — no
 * `error.code`, because the response never reached a Lambda. That signature
 * (`404` with the generic `API_ERROR` code) means *the route is missing*, not
 * *the shift is missing*, and it is the one case worth retrying a different way
 * so the button works on both sides of the deploy.
 *
 * A `404` that does carry a backend error code is a real not-found and is left
 * to throw.
 */
export async function removeShift(
  idToken: string,
  doctorId: string,
  shift: { date: string; startTime: string; endTime: string; slots: readonly Slot[] },
): Promise<DeleteShiftResult> {
  const { date, startTime, endTime, slots } = shift;
  try {
    return await deleteShift(idToken, doctorId, date, startTime, endTime);
  } catch (err) {
    const routeMissing =
      err instanceof ApiError && err.status === 404 && err.code === "API_ERROR";
    if (!routeMissing) throw err;

    const outcome = await deleteSlots(idToken, doctorId, slots);
    return { date, startTime, endTime, ...outcome };
  }
}

/**
 * Delete a slot. Only `available` or `blocked` slots may be deleted (a `booked`
 * slot yields 409 from the backend). The `date` query param is required.
 */
export async function deleteSlot(
  idToken: string,
  doctorId: string,
  slotId: string,
  date: string,
  idempotencyKey?: string,
): Promise<void> {
  await api.delete<unknown>(
    `/v1/doctors/${encodeURIComponent(doctorId)}/schedules/${encodeURIComponent(
      slotId,
    )}?date=${encodeURIComponent(date)}`,
    idToken,
    idempotencyKey ?? newIdempotencyKey(),
  );
}
