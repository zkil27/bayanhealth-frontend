# Implementation Plan: Demo Readiness Frontend

## Overview

This plan implements the frontend "Slice 10" demo-readiness work as ten incremental slices (0–9), each leaving the dev Amplify link shippable and strictly better. It is grounded in the existing BayanHealth codebase:

- Frontend (Next.js App Router, TypeScript) in `frontend/bayan-health-mvp/` — auth via the plain-fetch Cognito wrapper (`src/lib/cognito.ts`), Zustand store (`src/stores/useAuthStore.ts`), route guard (`src/middleware.ts`), and the API client (`src/lib/api.ts`).
- Backend (TypeScript Lambdas, Node.js 24.x) under `backend/src/handlers/` — contract-frozen, **non-regressable** (Requirement 15). The only new handler is the Cognito Post-Confirmation trigger (`backend/src/handlers/post-confirmation.ts`).
- Infrastructure (Terraform) under `infra/environments/dev/` and `infra/modules/cognito/`, all in `ap-southeast-1`.
- Pipeline: `.github/workflows/deploy-dev.yml` and `amplify.yml`.

Implementation languages follow the existing stack: **TypeScript** for all app/handler code, **HCL (Terraform)** for infrastructure, and **YAML** for pipeline/build config. Property-based tests use `fast-check` (`numRuns: 100`) on the new frontend/back-end test runner. Each property test is tagged `// Feature: demo-readiness-frontend, Property {n}: {text}`.

Slice 2 is the defining milestone: every role route renders (mock data acceptable), in-app navigation and sign-out exist, and one seeded demo account belongs to all role groups.

## Tasks

- [x] 1. Slice 0 — Deploy reliability & build/CI configuration
  - [x] 1.1 Set up the frontend test toolchain
    - Add `vitest` + `fast-check` (and `@vitest/coverage` as needed) to `frontend/bayan-health-mvp/package.json` devDependencies and a `test` script using `--run` (single execution, no watch)
    - Add a minimal `vitest.config.ts` with a `node`/`jsdom` environment and path alias `@/` matching `tsconfig.json`
    - This enables all property and unit tests across slices; no test is a stand-alone task
    - _Requirements: 7.1_
  - [x] 1.2 Exclude transient Terraform artifacts from version control
    - Add `infra/environments/**/.terraform.tfstate.lock.info`, `tfplan`, and `tfplan-s34` (and sibling stale plan files) to `.gitignore`
    - _Requirements: 1.1_
  - [x] 1.3 Reconcile dev Terraform `import {}` blocks against live AWS
    - Audit each `import {}` in `infra/environments/dev/main.tf`; remove or correct any block whose `id` references a non-existent resource so `terraform plan` resolves imports with exit 0 and a second `plan` reports 0/0/0
    - _Requirements: 1.4, 1.5_
  - [x] 1.4 Complete the frontend env example
    - Add `NEXT_PUBLIC_COGNITO_USER_POOL_ID` (with a non-empty placeholder) to `.env.example` so all four `NEXT_PUBLIC_*` variables are listed with placeholders
    - _Requirements: 2.1_
  - [x] 1.5 Implement the build-time env-var guard and wire it into `amplify.yml`
    - Add a pure `validateEnv(env)` helper (e.g. `frontend/bayan-health-mvp/scripts/validate-env.mjs` or `src/lib/validate-env.ts`) that returns success iff all four `NEXT_PUBLIC_*` vars are present and non-empty, otherwise returns the list of missing/empty names
    - Add an `amplify.yml` preBuild step that runs the guard and fails the build before `npm run build` if any variable is empty, emitting each missing/empty name
    - _Requirements: 2.2, 2.3_
  - [x] 1.6 Write property test for the env-var guard
    - **Property 11: Build env-var guard flags exactly the missing variables**
    - **Validates: Requirements 2.3**
  - [x] 1.7 Harden the `deploy-dev` workflow secret check and smoke gate
    - Add a secret-presence step that halts with a non-zero status and names each missing secret if `AWS_ROLE_TO_ASSUME` or `AMPLIFY_GITHUB_ACCESS_TOKEN` is absent/empty, ordered before AWS credential configuration
    - Replace the `for i in 1 2 3; do ... && break; done` smoke loop so the run exits non-zero with a smoke-failure message after 3 failed attempts (waits 15s then 30s); confirm the Amplify poll (every 20s, 30 min), FAILED/CANCELLED fast-fail, apply-before-trigger ordering, and the curl 200 URL check
    - _Requirements: 2.4, 2.5, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

- [x] 2. Checkpoint — Slice 0
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Slice 1 — Cognito role path & Post-Confirmation trigger
  - [x] 3.1 Fix sign-up to send only schema-defined attributes and convey role via ClientMetadata
    - In `src/lib/cognito.ts`, change `signUp` to send `UserAttributes: [{ Name: "email", ... }]` only and pass `ClientMetadata: { role }`; update `confirmSignUp` to accept and forward `ClientMetadata: { role }`
    - Update the confirm page (`src/app/(auth)/confirm/page.tsx`) to read the role from the sign-up store and pass it to `confirmSignUp`
    - Extract a pure registration-attribute builder so the attribute-name set is testable
    - _Requirements: 3.1, 3.3, 3.4_
  - [x] 3.2 Write property test for the sign-up attribute builder
    - **Property 3: Sign-up sends only schema-defined attributes**
    - **Validates: Requirements 3.1**
  - [x] 3.3 Add `resolvePrimaryRole` and correct role precedence
    - Add a pure `resolvePrimaryRole(groups: string[]): AppRole | null` (e.g. in `src/lib/roles.ts`) using precedence moderator → admin → doctor → patient, returning `null` for empty/no-match
    - Correct `ROLE_PRIORITY` in `src/stores/useAuthStore.ts` to match this order and have `primaryRole()` delegate to the helper
    - _Requirements: 4.5, 4.6_
  - [x] 3.4 Write property test for primary role resolution
    - **Property 1: Primary role resolution follows precedence**
    - **Validates: Requirements 4.5, 4.6**
  - [x] 3.5 Implement the Post-Confirmation trigger handler
    - Add `backend/src/handlers/post-confirmation.ts` (Node.js 24.x, TypeScript) that reads `event.request.clientMetadata?.role`, maps it via a pure `mapRoleToGroup(role?)` (returns `"doctor"` iff exactly `"doctor"`, else `"patient"`), and calls `AdminAddUserToGroup` with a bounded retry (3 total attempts), throwing on exhaustion
    - Add the esbuild package script (`package:lambda-post-confirmation`) following the existing handler packaging pattern
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 3.6 Write property test for the trigger's role-to-group mapping
    - **Property 2: Post-confirmation role-to-group mapping defaults to patient**
    - **Validates: Requirements 4.2**
  - [x] 3.7 Provision the Post-Confirmation trigger in Terraform
    - In `infra/modules/cognito/`, add the trigger Lambda (Node.js 24.x, `ap-southeast-1`), its IAM role/policy for `cognito-idp:AdminAddUserToGroup`, and wire it as the user pool `post_confirmation` lambda trigger
    - Confirm `terraform plan` shows no create/update/replace/destroy on existing deployed Lambdas
    - _Requirements: 4.4, 15.4_
  - [x] 3.8 Fix the route guard for the no-role and wrong-role cases
    - In `src/middleware.ts`, route an authenticated session with an empty `roles` array to the defined no-role destination (add a `/no-access` route or sign-out-with-message) instead of `/signIn`; redirect a valid session lacking the required area role to an area its roles permit; preserve public-path allow, absent/expired → `/signIn`, and never self-redirect to the same protected path
    - _Requirements: 4.6, 4.7, 5.2, 5.3, 13.4, 17.1, 17.2, 17.3_
  - [x] 3.9 Write property test for the route-guard decision
    - **Property 4: Route-guard authorization is correct and loop-free**
    - **Validates: Requirements 4.6, 4.7, 5.2, 5.3, 13.4, 17.1, 17.2, 17.3**

- [x] 4. Slice 1 — Seeded demo & role accounts
  - [x] 4.1 Provision seeded demo and role accounts in Terraform
    - Add a `dev`-gated seed config (e.g. `infra/modules/cognito/seed.tf`) creating one Demo_Account in the `patient`, `doctor`, and `admin` groups, plus a Role_Account per role and the smoke users `testpatient@example.com` (patient) and `testdoctor@example.com` (doctor); use `aws_cognito_user` (SUPPRESS) + a permanent-password/confirm step + `aws_cognito_user_in_group`
    - _Requirements: 5.1, 5.4, 2.6_
  - [x] 4.2 Add provisioning verification for seeded accounts
    - Add a post-apply check (local-exec or pipeline step) asserting each required account exists, is CONFIRMED, and has its required groups; on any miss, exit non-zero identifying the account so no partially seeded account is left active
    - _Requirements: 5.6_

- [x] 5. Checkpoint — Slice 1 auth path verified end to end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Slice 2 — Landing page, navigation, sign-out, and full render coverage
  - [x] 6.1 Implement role-gated navigation
    - Add a pure `permittedAreas(roles: AppRole[])` helper and a shared navigation component (extending `features/patient/components` / doctor header / a shared app shell) that renders links only for permitted areas
    - _Requirements: 6.2, 6.3_
  - [x] 6.2 Write property test for navigation gating
    - **Property 5: Navigation controls match the user's roles**
    - **Validates: Requirements 6.2, 6.3**
  - [x] 6.3 Replace the developer "Links" landing with a product entry page
    - Rewrite `src/app/page.tsx` as a real product entry page that renders unauthenticated within 3s; ensure no user-facing control links to the dev Links page
    - _Requirements: 6.1, 6.7_
  - [x] 6.4 Implement the sign-out control
    - Add a sign-out action that calls `useAuthStore.clearSession()` (clears persisted store + deletes the `bayan-auth` cookie) and routes to `/signIn` within 2s; on failure, show an error and retain the session
    - _Requirements: 6.4, 6.5, 6.6_
  - [x] 6.5 Implement the AsyncView state machine
    - Add a shared `AsyncView` wrapper / `useAsyncResource` hook with a pure reducer over `loading → (data | empty | error)`, including a 10s timeout → error, keeping layout/nav interactive on error
    - _Requirements: 7.3, 7.4, 7.5_
  - [x] 6.6 Write property test for the async-view reducer
    - **Property 6: Async view resolves to exactly one defined state**
    - **Validates: Requirements 7.3, 7.4, 7.5, 8.4, 9.3, 9.4, 9.5, 10.2, 10.3, 10.6, 12.8, 13.5, 13.6, 14.3, 14.4, 14.5**
  - [x] 6.7 Create the Admin area route tree with mock data
    - Add `src/app/admin/` routes for user management, platform settings, and KYC supervision, each reachable from admin navigation and rendered with fully populated mock/placeholder data (no undefined/null/empty-template values)
    - _Requirements: 6.6, 7.2, 7.6_
  - [x] 6.8 Ensure render coverage for patient and doctor routes with mock data
    - Wire every patient/doctor route in the navigation map through `AsyncView` with mock/placeholder data so each renders its primary layout within 5s without uncaught exceptions or blank screens
    - _Requirements: 7.1, 7.2, 7.5_
  - [x] 6.9 Write the render-smoke suite for all navigation-mapped routes
    - Mount every patient/doctor/admin route with a mock-backed provider and assert each renders its primary layout without throwing and without a blank screen
    - _Requirements: 7.1, 17.4_

- [x] 7. Checkpoint — Slice 2 milestone (all role routes render, nav + sign-out work)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Slice 3 — Flagship booking-to-intake flow
  - [x] 8.1 Wire patient booking create to `POST /v1/bookings`
    - Replace mock submission in the booking create flow (`src/app/booking/createBooking/`, `features/booking`) with `api.post('/v1/bookings', ...)`, reusing the same `Idempotency-Key` on retry; on success display the booking id and `pending_payment` status within 2s; on error envelope, render an error state from `code`/`message`, retain input, and stay operable
    - _Requirements: 8.1, 8.2, 8.7_
  - [x] 8.2 Write property test for idempotency-key handling
    - **Property 7: Writes carry a valid idempotency key, reused on retry**
    - **Validates: Requirements 8.1, 8.5, 12.1**
  - [x] 8.3 Wire the doctor intake queue and accept action
    - Render `GET /v1/doctors/me/intake-queue` through `AsyncView` (empty state on zero bookings); accept via `POST /v1/doctors/me/intake-queue/{bookingId}/process` (confirm action, UUID v4 `Idempotency-Key`), removing the accepted booking and showing acceptance within 2s
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7_
  - [x] 8.4 Write unit tests for intake-queue render, empty state, and item removal
    - Test queue render, empty-state on zero bookings, and removal of an accepted booking
    - _Requirements: 8.3, 8.4, 8.6_

- [x] 9. Slice 4 — Real doctor search and profile data
  - [x] 9.1 Wire doctor search to the backend
    - Replace `features/booking/data/sampleData.ts` usage in doctor search with backend doctor-list + `GET /v1/doctors/{doctorId}/schedules` calls; show a loading indicator (no cached/sample data) while in progress, render doctors + schedules within 3s, empty state on zero doctors, and an error state with a retry control on error or 10s timeout
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 9.2 Write unit tests for doctor search states
    - Test loading (no sample data), populated, empty, and error/retry states
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 10. Slice 5 — Patient booking list, detail, and status
  - [x] 10.1 Implement booking status and pagination helpers
    - Add pure `displayBookingStatus(status)` (defined label for each of the six lifecycle values + fallback for unknown/missing) and `hasNextPage(meta)` (true iff `meta.pagination.cursor` is a non-empty string)
    - _Requirements: 10.7, 10.8, 10.9, 10.10_
  - [x] 10.2 Write property test for booking status display
    - **Property 8: Booking status always renders a defined label**
    - **Validates: Requirements 10.7, 10.8**
  - [x] 10.3 Write property test for next-page gating
    - **Property 9: Next-page control is gated by cursor presence**
    - **Validates: Requirements 10.9, 10.10**
  - [x] 10.4 Wire the patient booking list with pagination
    - Render `GET /v1/bookings` through `AsyncView` (within 3s; empty state on zero; error + retry on failure/10s timeout); render a next-page control using the cursor only when `hasNextPage(meta)` is true
    - _Requirements: 10.1, 10.2, 10.3, 10.9, 10.10_
  - [x] 10.5 Wire the booking detail with not-found handling
    - Render `GET /v1/bookings/{bookingId}` within 3s; map 404 to a not-found state that does not reveal existence; non-404 error or 10s timeout → error state with retry; display status via `displayBookingStatus`
    - _Requirements: 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 11. Checkpoint — Slices 3–5 backend-wired flows
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Slice 6 — Consultation session and chat
  - [x] 12.1 Implement chat message validation
    - Add a pure `validateChatMessage(text)` accepting 1–4096 characters inclusive and rejecting empty / >4096
    - _Requirements: 11.4, 11.5_
  - [x] 12.2 Write property test for chat message validation
    - **Property 10: Chat message length validation**
    - **Validates: Requirements 11.4, 11.5**
  - [x] 12.3 Wire OTL activation
    - Call the OTL activation endpoint (`POST /v1/otl/{token}/activate`); on success within 5s transition the session to active; on expired/used/invalid failure, keep it inactive and show an activation error
    - _Requirements: 11.1, 11.2_
  - [x] 12.4 Wire WebSocket chat with HTTP fallback
    - Establish the WebSocket connection with the IdToken query token (within 10s); send validated messages and display them in chronological order; reject oversized/empty messages with text retained and a length error; on connect failure or 10s timeout, fall back to `GET/POST /v1/bookings/{bookingId}/messages` and show current conversation state
    - _Requirements: 11.3, 11.4, 11.5, 11.6_

- [x] 13. Slice 7 — Post-consultation documents, media, and CDS
  - [x] 13.1 Wire consultation documents
    - Save/finalize via `POST/GET /v1/consultations/{consultationId}/documents` with UUID v4 `Idempotency-Key`; on error show an indication and retain entered content; on finalized success show finalized state within 2s; finalizing an already-finalized document shows the existing state without duplication
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [x] 13.2 Wire the media upload chain
    - Obtain presigned URL → upload file → confirm upload; show confirmed-upload state on success; if any step fails, show an error and do not mark the media uploaded
    - _Requirements: 12.5, 12.6_
  - [x] 13.3 Display CDS drafts
    - Render `GET /v1/cds/consultations/{consultationId}/drafts` through `AsyncView`; show an in-progress indicator while drafts are still being generated
    - _Requirements: 12.7, 12.8_

- [x] 14. Slice 8 — Admin panel real data
  - [x] 14.1 Wire admin users, settings, and KYC pages to the backend
    - Replace mock data in the admin pages with `GET /v1/admin/users`, `GET /v1/admin/settings`, and `GET /v1/admin/kyc-applications` through `AsyncView`; render results within 3s; empty-state on empty results; error indication (no partial/cached data) on failure or 10s timeout
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6_
  - [x] 14.2 Enforce admin-only access in the route guard
    - Ensure a non-admin requesting an `/admin` route is prevented from rendering the Admin area and redirected to a non-admin route (builds on the Slice 1 guard)
    - _Requirements: 13.4_

- [x] 15. Slice 9 — Patient home and doctor metrics
  - [x] 15.1 Compose the patient home from existing endpoints
    - Replace static carousel placeholders with content composed from `GET /v1/bookings` (and related existing endpoints) through `AsyncView`; loading indicator while pending (no static placeholders), render within 3s, empty state with visible text on zero items, error state with retry on failure/10s timeout
    - _Requirements: 14.1, 14.3, 14.4, 14.5_
  - [x] 15.2 Compose doctor metrics from existing endpoints
    - Replace placeholder metric values with values composed from `GET /v1/doctors/me/intake-queue` and `GET /v1/doctors/me/payouts` through `AsyncView`; render numeric metrics within 3s; loading/empty/error+retry states as above
    - _Requirements: 14.2, 14.3, 14.4, 14.5_

- [x] 16. Final checkpoint — backend non-regression
  - Run `terraform plan` (dev) to confirm no create/update/replace/destroy on existing deployed Lambdas and run the backend smoke test (`npm run smoke:bookings-dev`) to confirm it still passes 100%. Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 15.1, 15.2, 15.4_

## Notes

- Tasks marked with `*` are optional (property/unit/render tests) and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each property test is tagged `// Feature: demo-readiness-frontend, Property {n}: {text}` and runs with `fast-check` at `numRuns: 100`.
- The eleven correctness properties map 1:1 to tasks: P1→3.4, P2→3.6, P3→3.2, P4→3.9, P5→6.2, P6→6.6, P7→8.2, P8→10.2, P9→10.3, P10→12.2, P11→1.6.
- No backend `/v1/` route, request field, or envelope is changed; the only server-side additions are the Post-Confirmation trigger and seeded accounts (Requirement 15).
- Checkpoints provide incremental validation; each slice leaves the dev Amplify link shippable.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.7"] },
    { "id": 1, "tasks": ["1.6", "3.1", "3.3", "3.5", "3.7", "3.8", "4.1"] },
    { "id": 2, "tasks": ["3.2", "3.4", "3.6", "3.9", "4.2"] },
    { "id": 3, "tasks": ["6.1", "6.3", "6.4", "6.5", "6.7"] },
    { "id": 4, "tasks": ["6.2", "6.6", "6.8"] },
    { "id": 5, "tasks": ["6.9"] },
    { "id": 6, "tasks": ["8.1", "8.3"] },
    { "id": 7, "tasks": ["8.2", "8.4"] },
    { "id": 8, "tasks": ["9.1", "10.1", "12.1", "13.1", "13.2", "13.3", "14.1", "14.2", "15.1", "15.2"] },
    { "id": 9, "tasks": ["9.2", "10.2", "10.3", "10.4", "10.5", "12.2", "12.3", "12.4"] }
  ]
}
```
