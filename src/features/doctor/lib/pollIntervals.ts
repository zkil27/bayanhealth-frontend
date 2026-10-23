/**
 * Shared polling cadences for the doctor dashboard.
 *
 * Each concern is also keyed under one shared React Query key
 * (`DOCTOR_INTAKE_QUEUE_QUERY_KEY`, `DOCTOR_TODAY_AGENDA_QUERY_KEY`,
 * `DOCTOR_TODAY_SLOTS_QUERY_KEY`), so every component reading the same data
 * shares one in-flight request and one poll timer.
 */

/**
 * Cadence for "live decision" queues — the intake queue and the on-demand
 * pool. Fast enough that accepting a request feels immediate to a second
 * doctor watching the same broadcast pool.
 */
export const LIVE_QUEUE_POLL_INTERVAL_MS = 5000;

/**
 * Cadence for "today's schedule" reads — the doctor's agenda and their own
 * published/blocked slots. Slower than the live queue: the doctor's own
 * actions already invalidate these keys on success, so the poll only has to
 * catch changes from elsewhere (another tab, an admin action).
 */
export const TODAY_SCHEDULE_POLL_INTERVAL_MS = 15000;
