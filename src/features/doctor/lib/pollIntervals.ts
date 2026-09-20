/**
 * Shared polling cadences for the doctor dashboard (Task 6 of the
 * doctor-dashboard rebuild).
 *
 * Before this, each dashboard data hook picked its own interval independently
 * — `usePatientBoard` at 5000ms, `RequestPool` at a separately declared 5000ms,
 * `useTodayAgenda` at 15000ms, `useTodaySlots` at 30000ms — four numbers that
 * happened to be hand-tuned per hook rather than reasoned about as a set. Two
 * of those (intake queue and the on-demand pool) already agreed by
 * coincidence; the other two did not, despite both feeding the same
 * "what does today look like" concern across `ReadyToStartCard` and
 * `UpcomingTodayCard`.
 *
 * This does not eliminate multiple network requests — a dashboard genuinely
 * reads several distinct things (a live accept/claim queue, today's schedule,
 * a settled archive) and collapsing those into one request would mean either
 * a new aggregate backend route (forbidden — the backend is contract-frozen
 * for this task) or serving stale data for whichever concern polled less
 * often. What this *does* eliminate is duplicate requests for the *same* data:
 * every hook below is also keyed under one shared React Query key
 * (`DOCTOR_INTAKE_QUEUE_QUERY_KEY`, `DOCTOR_TODAY_AGENDA_QUERY_KEY`,
 * `DOCTOR_TODAY_SLOTS_QUERY_KEY`), so two cards reading the same concern —
 * `IncomingRequestsCard` and `ReadyToStartCard` both reading the intake queue,
 * or `ReadyToStartCard` and `UpcomingTodayCard` both reading today's agenda —
 * share one in-flight request and one poll timer rather than each running
 * their own.
 */

/**
 * Cadence for "live decision" queues — the intake queue and the on-demand
 * pool. Fast enough that accepting a request feels immediate to a second
 * doctor watching the same broadcast pool.
 */
export const LIVE_QUEUE_POLL_INTERVAL_MS = 5000;

/**
 * Cadence for "today's schedule" reads — the doctor's agenda and their own
 * published/blocked slots. Slower than the live queue: a doctor's own
 * schedule changes far less often per minute than an incoming request queue
 * does, and both `UpcomingTodayCard`'s block-time action and `ReadyToStartCard`'s
 * accept/start actions already invalidate these keys explicitly on success —
 * the poll exists to catch changes from *elsewhere* (another tab, another
 * admin action), not to carry the doctor's own writes.
 */
export const TODAY_SCHEDULE_POLL_INTERVAL_MS = 15000;

/**
 * Cadence for the per-row presence poll on `ReadyToStartCard`. Deliberately
 * not shared with either constant above: this is not a whole-dashboard
 * concern like the two above it — it is one bounded poll per row actually
 * rendered on screen (capped by that card's own visible-item limit), each
 * keyed to a single booking rather than to "the dashboard's live queue" or
 * "today's schedule" as a whole. Collapsing it into `LIVE_QUEUE_POLL_INTERVAL_MS`
 * would tie an unrelated per-row concern to the intake queue's cadence for no
 * reason other than the numbers currently matching.
 */
export const PRESENCE_POLL_INTERVAL_MS = 10000;
