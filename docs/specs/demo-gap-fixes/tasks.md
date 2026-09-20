# Implementation Plan: demo-gap-fixes

## Overview

Seven targeted frontend and CI changes that close all demo-readiness gaps. Five are blockers (visible to stakeholders) and two are clean-up items. All changes are confined to the Next.js frontend and the GitHub Actions CI workflow — no backend or infrastructure changes.

## Tasks

- [x] 1. Remove dead code and static placeholder copy
  - [x] 1.1 Delete `src/app/booking/doctor/id/page.tsx` (StaticDoctorPage)
    - Remove the static legacy doctor page file from the repository
    - Confirm no other file imports it (it is a Next.js route, not an imported module)
    - _Requirements: 1.9_

  - [x] 1.2 Delete `src/features/admin/data/mockData.ts` (DeadAdminMockData)
    - Remove the confirmed-unused mock data file
    - Verify with a grep that no file imports `features/admin/data/mockData` before deleting
    - _Requirements: 7.1, 7.2_

  - [x] 1.3 Replace PatientHeaderBooking placeholder copy
    - In `src/features/patient/components/Header.tsx`, locate the `PatientHeaderBooking` component export
    - Replace the string `"Some Feature, Some Feature, Some Feature, Some Feature, Some Feature,"` with `"Book a consultation with a specialist in minutes."`
    - _Requirements: 3.1_

- [x] 2. Strip dev-copy link from DoctorHeader and add sign-out
  - [x] 2.1 Remove POST-CONSULTATION dev link from DoctorHeader
    - In `src/features/doctor/components/header.tsx`, delete the `<Link href="/doctor/post-consultation/id">POST-CONSULTATION</Link>` element and any surrounding wrapper/styling that was solely for that link
    - No replacement element is rendered — Requirement 5.3 applies (no production-ready dynamic route exists)
    - _Requirements: 5.1, 5.3_

  - [x] 2.2 Add SignOutButton to DoctorHeader
    - Import `SignOutButton` from `@/components/blocks/navigation/SignOutButton`
    - Add `<Separator orientation="vertical" className="bg-border" />` then `<SignOutButton variant="ghost" size="icon" iconOnly />` into the `ml-auto flex gap-1` cluster, after `<DoctorNotification />`
    - Do not duplicate sign-out logic inline — delegate entirely to the existing `SignOutButton`
    - _Requirements: 4.2, 4.4_

- [x] 3. Update PatientHeader with real session data and sign-out
  - [x] 3.1 Wire session identity fields (name and ID) from `useAuthStore`
    - Replace the static `"Welcome, (User Name)"` string: read `session.email` from `useAuthStore`, derive display name via `deriveDoctorName(email)` (already available in `doctors.ts`)
    - Replace the static `"ID : 12457"` string: read `session.userId` from `useAuthStore`, display `userId.slice(-6).toUpperCase()` as the short ID
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Fetch and display Last Consultation from `GET /v1/bookings`
    - Add a `LastConsultState` union type (`loading | done | empty`) and manage it with `useState`/`useEffect`
    - Fetch `/v1/bookings?limit=5&sort=desc` using the `idToken` from `useAuthStore`; find the most recent item where `status === "completed"` or `status === "in_progress"`
    - If `idToken` is null, skip the fetch and set state to `empty`
    - On error or empty result, set state to `empty`
    - Implement `formatRelativeTime(isoTimestamp: string): string` as a local pure function using `Date.now()` arithmetic (e.g. `"2 days, 14h ago"`)
    - Render: `loading` → `<Skeleton />`, `done` → formatted date string, `empty` → `—`
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.3 Add SignOutButton to PatientHeader
    - Import `SignOutButton` from `@/components/blocks/navigation/SignOutButton`
    - Add `<SignOutButton variant="ghost" size="icon" iconOnly />` into the existing `flex shrink-0 items-center gap-3` icon cluster, after the Bell button
    - Do not duplicate sign-out logic inline
    - _Requirements: 4.1, 4.4_

  - [ ]* 3.4 Write property test for session identity rendering (Property 2)
    - **Property 2: Session identity fields are rendered without placeholders**
    - For any `AuthSession` with non-empty `email` and `userId`, assert that `PatientHeader` renders text derived from those fields and does NOT render the static strings `"(User Name)"` or `"12457"`
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 3.5 Write property test for Last Consultation selection (Property 3)
    - **Property 3: Most-recent qualifying booking is surfaced**
    - For any non-empty booking list, assert that the rendered "Last Consultation" value corresponds to the most-recent item with `status === "completed"` or `status === "in_progress"`; assert `—` is rendered when no qualifying item exists
    - **Validates: Requirements 2.3, 2.5**

- [x] 4. Checkpoint — PatientHeader and DoctorHeader
  - Ensure all tests pass and the app compiles without type errors. Ask the user if questions arise.

- [x] 5. Add SignOutButton to AdminLayout
  - [x] 5.1 Add SignOutButton to AdminLayout
    - In `src/app/admin/layout.tsx`, import `SignOutButton` from `@/components/blocks/navigation/SignOutButton`
    - Add `<div className="ml-auto"><SignOutButton variant="ghost" size="sm" /></div>` inside the sticky `<header>` element, after the title block
    - Do not duplicate sign-out logic inline
    - _Requirements: 4.3, 4.4_

- [x] 6. Implement DoctorDetailPage dynamic route
  - [x] 6.1 Add `fetchDoctorDetail` to `src/features/booking/lib/api/doctors.ts`
    - Replace the `getDoctor()` function (which calls `getMockDoctorPage()`) with `fetchDoctorDetail(doctorId: string, token: string)`
    - Implement using `Promise.all([api.get(\`/v1/admin/users/${doctorId}\`, token), api.get(\`/v1/doctors/${doctorId}/schedules\`, token)])` following the same pattern as `fetchDoctorSearch`
    - Remove the `getMockDoctorPage()` import and all references to `MockDoctorData`
    - Return `{ profile: DoctorProfileResponse; slots: BackendSlot[] }`
    - _Requirements: 1.2, 1.3, 1.10_

  - [x] 6.2 Create `src/app/booking/doctor/[doctorId]/page.tsx`
    - Mark as `"use client"` component
    - Accept `{ params }: { params: Promise<{ doctorId: string }> }` via Next.js 14 App Router dynamic segment
    - Read `idToken` from `useAuthStore`
    - Wrap `fetchDoctorDetail(doctorId, idToken)` in `AsyncView` (fetcher form) for loading/error/retry states
    - Add `useState<string | null>(null)` for `selectedSlotId`
    - Filter slots by `status === "available"`; if none, render `<p>No available slots — check back later</p>` and omit the booking button
    - Render booking button with `disabled={selectedSlotId === null}`; on click navigate to `/booking/createBooking/${doctorId}?slotId=${selectedSlotId}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 6.3 Write property test for slot selection gating the booking button (Property 1)
    - **Property 1: Slot selection gates the booking button**
    - For any rendered `DoctorDetailPage` with at least one available slot, assert button is disabled with no selection, enabled after selection, and returns to disabled if selection is cleared
    - **Validates: Requirements 1.7, 1.8**

- [x] 7. Add test gate to CI Pipeline
  - [x] 7.1 Insert `npm test` step in the `frontend` job of `.github/workflows/ci.yml`
    - Add a new step named `Test` with `run: npm test` between the existing `Lint` step and the existing `Build` step
    - The `working-directory` for this job is already set to `frontend/bayan-health-mvp` — no additional config needed
    - `npm test` resolves to `vitest --run` (already configured in `package.json`), so the step terminates and exits with the test suite exit code
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Final checkpoint — full pipeline green
  - Run `npx tsc --noEmit`, `npm run lint`, and `npm test` from `frontend/bayan-health-mvp`. Ensure all pass. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Tasks 1.1 and 1.2 are pure deletions — do them first to avoid stale imports interfering with typecheck in later tasks
- The `deriveDoctorName` utility is already in `src/features/booking/lib/api/doctors.ts` — import it rather than duplicating
- `SignOutButton` accepts `variant`, `size`, and `iconOnly` props; all sign-out logic stays inside the component via `useSignOut`
- Property tests use the design's Correctness Properties section as the specification
- Each task references granular acceptance criteria numbers for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "6.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "6.3"] },
    { "id": 4, "tasks": ["7.1"] }
  ]
}
```
