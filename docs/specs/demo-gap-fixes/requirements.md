# Requirements Document

## Introduction

This feature resolves all demo-readiness gaps identified in a codebase audit of the BayanHealth MVP frontend. The scope is strictly frontend and CI changes — no backend, API contract, or infrastructure changes are included. The seven gaps are grouped into five blockers (items that would visibly break or embarrass the demo) and two non-blockers (clean-up items that reduce risk and technical debt). All changes must leave the build, typecheck, and lint steps passing.

## Glossary

- **DoctorDetailPage**: The Next.js dynamic route page component at `src/app/booking/doctor/[doctorId]/page.tsx` that displays a doctor's profile and availability slots.
- **StaticDoctorPage**: The legacy static page at `src/app/booking/doctor/id/page.tsx` that is replaced by DoctorDetailPage.
- **AsyncView**: The shared React wrapper component used across the frontend to render loading, error, and empty states around asynchronous data fetches.
- **PatientHeader**: The React component at `src/features/patient/components/Header.tsx` that renders the sticky patient-shell header.
- **PatientHeaderBooking**: The React component exported from the same file as PatientHeader that renders the booking page hero section.
- **DoctorHeader**: The React component at `src/features/doctor/components/header.tsx` that renders the doctor-shell header.
- **AdminLayout**: The Next.js layout component at `src/app/admin/layout.tsx` that wraps all admin pages.
- **SignOutButton**: The existing shared component that invokes `useSignOut` to sign the current user out.
- **useAuthStore**: The Zustand store that holds the authenticated session, including `session.email`, `session.userId`, and related fields.
- **useSignOut**: The existing hook that handles Cognito sign-out and clears session state.
- **CI Pipeline**: The GitHub Actions workflow defined at `.github/workflows/ci.yml`.
- **FrontendJob**: The `frontend` job within the CI Pipeline that runs typecheck, lint, and build steps.
- **MockDoctorData**: The `getMockDoctorPage()` call path and its supporting data in `src/features/booking/data/sampleData.ts` used by the legacy `getDoctor()` function.
- **DeadAdminMockData**: The file `src/features/admin/data/mockData.ts` which is confirmed unused and not imported anywhere.

## Requirements

### Requirement 1: Doctor Detail Dynamic Route

**User Story:** As a patient, I want to view a real doctor's profile and available time slots so that I can make an informed booking decision without encountering placeholder data.

#### Acceptance Criteria

1. THE DoctorDetailPage SHALL exist at the file path `src/app/booking/doctor/[doctorId]/page.tsx` and SHALL accept `doctorId` as a dynamic Next.js route segment parameter.
2. WHEN the DoctorDetailPage mounts, THE DoctorDetailPage SHALL fetch the doctor's profile from `GET /v1/admin/users/{userId}` using the `doctorId` route parameter as the `userId`.
3. WHEN the DoctorDetailPage mounts, THE DoctorDetailPage SHALL fetch the doctor's availability from `GET /v1/doctors/{doctorId}/schedules` using the same `doctorId` route parameter.
4. WHILE the DoctorDetailPage is fetching data, THE AsyncView SHALL render a loading skeleton state.
5. IF a fetch in DoctorDetailPage fails, THEN THE AsyncView SHALL render an error state with a retry control.
6. WHEN the schedules response contains zero available slots, THE DoctorDetailPage SHALL render the empty-state message "No available slots — check back later".
7. WHILE no time slot is selected by the patient, THE DoctorDetailPage SHALL render the booking button in a disabled (non-interactive) state.
8. WHEN a patient selects an available time slot, THE DoctorDetailPage SHALL render the booking button in an enabled (interactive) state.
9. THE StaticDoctorPage file `src/app/booking/doctor/id/page.tsx` SHALL be deleted from the repository.
10. THE `getDoctor()` function in `src/features/booking/lib/api/doctors.ts` SHALL NOT call `getMockDoctorPage()` or reference MockDoctorData.

### Requirement 2: Patient Header Real Data

**User Story:** As a patient, I want the app header to show my real name, ID, and last consultation so that I know the app is connected to my actual account.

#### Acceptance Criteria

1. THE PatientHeader SHALL read the authenticated user's display name from `useAuthStore` and render it in place of the static "Welcome, (User Name)" string.
2. THE PatientHeader SHALL read the authenticated user's `session.userId` from `useAuthStore` and render a formatted version of it in place of the static "ID : 12457" string.
3. WHEN the PatientHeader mounts, THE PatientHeader SHALL fetch the patient's booking history from `GET /v1/bookings` and display the most recent booking where status is `completed` or `in_progress` as the "Last Consultation" value.
4. WHILE the bookings fetch is in progress, THE PatientHeader SHALL render a skeleton indicator in the "Last Consultation" display area.
5. IF the bookings fetch returns an error or an empty list, THEN THE PatientHeader SHALL render a dash (`—`) in the "Last Consultation" display area.

### Requirement 3: PatientHeaderBooking Placeholder Copy

**User Story:** As a stakeholder viewing the demo, I want the booking hero section to show a real product description so that placeholder text does not appear during the presentation.

#### Acceptance Criteria

1. THE PatientHeaderBooking SHALL render the text "Book a consultation with a specialist in minutes." in place of the placeholder string "Some Feature, Some Feature, Some Feature, Some Feature, Some Feature,".

### Requirement 4: Sign-Out in Authenticated Shells

**User Story:** As an authenticated user in any role, I want a sign-out control available in the app header so that I can end my session without navigating away from my current view.

#### Acceptance Criteria

1. THE PatientHeader SHALL render the SignOutButton component so that a signed-in patient can sign out from the patient shell.
2. THE DoctorHeader SHALL render the SignOutButton component adjacent to the existing notification and history icon cluster so that a signed-in doctor can sign out from the doctor shell.
3. THE AdminLayout SHALL render the SignOutButton component so that a signed-in admin or moderator can sign out from the admin shell.
4. THE SignOutButton rendered in each shell SHALL invoke `useSignOut` on activation and SHALL NOT duplicate the sign-out logic inline.

### Requirement 5: Doctor Header Dev-Copy Link Removal

**User Story:** As a stakeholder viewing the demo, I want the doctor header to contain only real navigable links so that all-caps placeholder navigation items do not appear during the presentation.

#### Acceptance Criteria

1. THE DoctorHeader SHALL NOT render the `<Link href="/doctor/post-consultation/id">POST-CONSULTATION</Link>` element in its current all-caps, static-id form.
2. IF a post-consultation feature page is reachable via a real dynamic route at the time of this change, THEN THE DoctorHeader SHALL render a correctly cased label and a working dynamic link to that page.
3. IF no production-ready post-consultation page exists at the time of this change, THEN THE DoctorHeader SHALL render no link in the position previously occupied by the POST-CONSULTATION element.

### Requirement 6: CI Test Gate

**User Story:** As an engineer, I want every pull request and push to main to run the frontend test suite so that regressions are caught before a merge or deployment.

#### Acceptance Criteria

1. THE FrontendJob SHALL include an `npm test` step that executes the frontend test suite.
2. WHEN the `npm test` step exits with a non-zero code, THE CI Pipeline SHALL fail the FrontendJob and SHALL NOT proceed to the build step for that run.
3. THE `npm test` step in the FrontendJob SHALL run after the lint step and before the build step.

### Requirement 7: Delete Dead Admin Mock Data

**User Story:** As an engineer, I want dead code removed from the repository so that the codebase stays clean and no mock data is accidentally shipped.

#### Acceptance Criteria

1. THE file `src/features/admin/data/mockData.ts` (DeadAdminMockData) SHALL be deleted from the repository.
2. WHEN the DeadAdminMockData file is deleted, THE build step in the CI Pipeline SHALL continue to pass with no import errors referencing that file.
