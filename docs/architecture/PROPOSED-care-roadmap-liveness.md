# Proposed: contract additions for Care Recovery Roadmap liveness

**Status: proposed, not decided, not built.** This is not an ADR — nothing here
has been accepted, scheduled, or implemented. It exists so three product ideas
that came up while building the patient-facing Care Recovery Roadmap
(`frontend/bayan-health-mvp/src/lib/patient/careRoadmap.ts`) are recorded
somewhere real instead of quietly dropped or, worse, faked in the client.

Per ADR-20260806-02 and the source-level guard at
`frontend/bayan-health-mvp/src/app/fabricated-data-scan.test.ts`, the frontend
must not render state the platform does not hold. Each item below is something
the roadmap could honestly show only once a contract change like this exists.

## 1. Release notification

**Gap:** `ProtectedArtifactLifecycle.commitRelease` enqueues no notification
today. The patient's only way to learn a prescription or education article
arrived is the 15s poll documented at
`frontend/bayan-health-mvp/src/features/consultation/lib/releasedArtifacts.ts`
(ADR-20260810-05) — a stated stopgap, not a fix.

**Would need:** a `prescription_released` / `education_released` notification
template, plus a patient-readable in-app feed —
`GET /v1/patients/me/notifications` or similar. `GET
/v1/admin/notification-events` is admin-only email/SMS outbox records and does
not serve this.

## 2. Recovery check-in submission

**Gap:** no check-in, questionnaire, survey, or PROM endpoint exists anywhere
in `openapi.yaml`. `FollowUpRecommendation` has no completion concept — no
`status`, no `completedAt` — so the roadmap's follow-up step can never be
marked done and there is nothing for a "how are you feeling?" mini-form to
submit to.

**Would need:** `POST
/v1/patients/me/follow-ups/{consultationId}/check-in` (or similar) plus a
completion field on `FollowUpRecommendation`.

## 3. Step ETA / queue position

**Gap:** no wait-time, queue-position, or aggregate step-duration endpoint
exists. The only `estimatedCompletionSeconds` in the contract is on
`CdsAsyncJobAccepted`, a doctor-only CDS generation job response
(`POST /v1/cds/.../{type}-generations`) — not reachable from any patient route.

**Would need:** either a patient-facing queue-position read on the booking, or
a computed aggregate (e.g. "typical time from confirmed to in_progress")
served from real historical data — not derived or estimated client-side, which
would be exactly the fabricated-statistic failure the scan above guards
against.

## Why this file, not an ADR

`architecture/DECISIONS.md` records decisions that were made and applied —
code changed, Terraform written, tests passing. None of these three have that;
they are unresolved product questions the roadmap work surfaced. If one is
picked up, it should get a real ADR entry there once decided, and this file's
corresponding section should be deleted rather than left to drift.

Related: `frontend/bayan-health-mvp/src/lib/patient/careRoadmap.ts`,
`frontend/bayan-health-mvp/src/features/patient/components/homepage/CareRecoveryRoadmap.tsx`.
