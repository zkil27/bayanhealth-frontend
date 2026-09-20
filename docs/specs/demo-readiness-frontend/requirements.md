# Requirements Document

## Introduction

This feature makes the BayanHealth **dev** environment demo-ready so a stakeholder can open the dev Amplify link and freely explore the product. The backend (10 V1 slices) is fully implemented and deployed to dev and staging; the frontend migration ("Slice 10") is barely started. The work is organized into ten incremental slices (Slice 0 through Slice 9). Each slice must leave the dev Amplify link in a shippable, strictly-better state without regressing the working backend.

The defining milestone is **Slice 2**: every patient, doctor, and admin route renders without crashing (mock data acceptable), in-app navigation and sign-out exist, and a single seeded demo account belongs to all role groups so one login can browse every role area. Earlier slices (0 and 1) make the deploy reliable and fix the broken auth role path that today traps confirmed users in a redirect loop. Later slices (3 through 9) progressively replace mock data with real backend wiring, one flow at a time.

All work targets AWS region `ap-southeast-1` only. Long-lived AWS resources (including any new Cognito trigger Lambda and Amplify) are provisioned through Terraform. The frontend uses a plain-fetch Cognito wrapper (no Amplify SDK) and a lightweight API client that attaches the Cognito IdToken. Backend API conventions are fixed: versioned `/v1/` routes, a `{data, meta}` success envelope, an `{error}` error envelope, and an `Idempotency-Key` (UUID v4) header on all write operations.

## Glossary

- **Demo_Environment**: The `dev` AWS deployment in `ap-southeast-1`, reachable through the dev Amplify branch URL, that the stakeholder explores.
- **Deploy_Pipeline**: The GitHub Actions `deploy-dev` workflow that packages Lambdas, runs Terraform, triggers the Amplify build, runs the backend smoke test, and checks the Amplify URL.
- **Terraform_Stack**: The Terraform configuration under `infra/environments/dev/` and its referenced modules that provision dev AWS resources.
- **Amplify_Build**: The AWS Amplify build-and-deploy job for the dev frontend branch, driven by `amplify.yml`.
- **Cognito_User_Pool**: The dev Cognito user pool (`ap-southeast-1_bnXemsKn2`) and its web client, including the RBAC groups `patient`, `doctor`, `admin`, `moderator`.
- **Post_Confirmation_Trigger**: A Cognito post-confirmation Lambda trigger that assigns a newly confirmed user to the Cognito group matching the role chosen at sign-up.
- **Frontend_App**: The Next.js application in `frontend/bayan-health-mvp/` hosted on Amplify.
- **Route_Guard**: The Next.js `middleware.ts` logic that gates routes by the roles stored in the `bayan-auth` cookie.
- **API_Client**: The frontend's lightweight `api` client that attaches the Cognito IdToken to backend requests.
- **Backend_API**: The deployed dev HTTP and WebSocket APIs implementing the `/v1/` endpoints.
- **Demo_Account**: A seeded, confirmed Cognito user assigned to all four RBAC groups, used to browse every role area with one login.
- **Role_Account**: A seeded, confirmed Cognito user assigned to a single role group (`patient`, `doctor`, `admin`, or `moderator`), including the smoke-test credentials.
- **Patient_Area**: Frontend routes under `/patient`.
- **Doctor_Area**: Frontend routes under `/doctor`.
- **Admin_Area**: Frontend routes under `/admin`.
- **Landing_Page**: The application entry route (`/`).
- **Idempotency_Key**: A UUID v4 value supplied in the `Idempotency-Key` header on write requests.

## Requirements

### Requirement 1: Reliable, repeatable dev deploy (Slice 0)

**User Story:** As the deploying engineer, I want a clean and repeatable dev apply, so that the demo can be (re)deployed on demand without manual state surgery.

#### Acceptance Criteria

1. THE Terraform_Stack SHALL exclude the transient Terraform artifacts `.terraform.tfstate.lock.info`, `tfplan`, and `tfplan-s34` from version control so that stale local files do not block a fresh apply.
2. WHEN the Deploy_Pipeline runs `terraform apply` against a dev state with no active lock, THE Terraform_Stack SHALL complete the apply within 15 minutes with a zero (success) exit status, with no interactive prompts and no manual edits to remote state.
3. IF the Deploy_Pipeline runs `terraform apply` against a dev state that has an active lock, THEN THE Terraform_Stack SHALL halt with a non-zero exit status and return an error indicating the lock holder, without modifying remote state.
4. IF an `import {}` block in the dev configuration references an AWS resource identifier that does not exist, THEN THE Terraform_Stack SHALL be corrected so that `terraform plan` completes with a zero (success) exit status and no import-resolution error.
5. WHEN `terraform plan` is run a second time in succession against an unchanged dev environment, THE Terraform_Stack SHALL report exactly 0 resources to add, 0 to change, and 0 to destroy.
6. WHEN the current Frontend_App is deployed through the Deploy_Pipeline, THE Amplify_Build SHALL, within 15 minutes of deployment start, return HTTP 200 at the dev Amplify branch URL.

### Requirement 2: Environment variable and CI secret correctness (Slice 0)

**User Story:** As the deploying engineer, I want all build-time configuration and CI secrets present and consistent, so that the frontend build receives correct backend coordinates and the pipeline can authenticate.

#### Acceptance Criteria

1. THE Frontend_App configuration example SHALL list all four build-time variables `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_AWS_REGION`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, and `NEXT_PUBLIC_COGNITO_CLIENT_ID`, each with a non-empty placeholder value.
2. WHEN the Amplify_Build runs its pre-build phase, THE Amplify_Build SHALL inject the four variables `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_AWS_REGION`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, and `NEXT_PUBLIC_COGNITO_CLIENT_ID` into the production build with non-empty values.
3. IF a required `NEXT_PUBLIC_` variable is absent or empty at build time, THEN THE Deploy_Pipeline SHALL terminate the build before producing a production artifact and SHALL emit a message naming each missing or empty variable.
4. WHEN the Deploy_Pipeline starts, THE Deploy_Pipeline SHALL verify that the `AWS_ROLE_TO_ASSUME` and `AMPLIFY_GITHUB_ACCESS_TOKEN` secrets are present before configuring AWS credentials.
5. IF either the `AWS_ROLE_TO_ASSUME` or `AMPLIFY_GITHUB_ACCESS_TOKEN` secret is absent or empty, THEN THE Deploy_Pipeline SHALL halt with a non-zero exit status and emit a message naming each missing secret.
6. THE Demo_Environment SHALL contain confirmed Role_Accounts matching the smoke-test credentials (`testpatient@example.com` assigned to the `patient` group and `testdoctor@example.com` assigned to the `doctor` group), each able to acquire authentication tokens for the backend smoke test.

### Requirement 3: Cognito role attribute resolution (Slice 1)

**User Story:** As a new user, I want sign-up to succeed when I select a role, so that I can create an account without an attribute error.

#### Acceptance Criteria

1. WHEN a user submits sign-up with a selected role, THE Frontend_App SHALL include in the registration request only Cognito attributes that are defined in the Cognito_User_Pool schema, and SHALL exclude every attribute not defined in that schema.
2. WHERE the `custom:role` attribute is retained, THE Cognito_User_Pool SHALL define a `custom:role` schema attribute that accepts exactly the two values `patient` and `doctor` and rejects any other value.
3. WHERE the `custom:role` attribute is removed from sign-up, THE Frontend_App SHALL make the selected role value (`patient` or `doctor`) available to the Post_Confirmation_Trigger so that the trigger can read the selected role at invocation time.
4. WHEN a user submits sign-up with valid credentials and a role value of `patient` or `doctor`, THE Cognito_User_Pool SHALL accept the registration without a schema-attribute error and create the user account.
5. IF a sign-up request includes any attribute not defined in the Cognito_User_Pool schema, THEN THE Cognito_User_Pool SHALL reject the request, SHALL return an error indicating the schema-attribute mismatch, and SHALL NOT create a user account.
6. IF a sign-up request supplies a `custom:role` value other than `patient` or `doctor`, THEN THE Cognito_User_Pool SHALL reject the request, SHALL return an error indicating the unsupported role value, and SHALL NOT create a user account.

### Requirement 4: Post-confirmation group assignment (Slice 1)

**User Story:** As a confirmed user, I want to be placed in the Cognito group for my chosen role, so that I land on my role home instead of being redirected back to sign-in.

#### Acceptance Criteria

1. WHEN a user confirms their account, THE Post_Confirmation_Trigger SHALL assign the user to the Cognito group corresponding to the role selected at sign-up within 5 seconds of confirmation.
2. IF the role selected at sign-up is not one of `patient` or `doctor`, THEN THE Post_Confirmation_Trigger SHALL assign the user to the `patient` group.
3. IF the group-assignment operation fails, THEN THE Post_Confirmation_Trigger SHALL retry up to 3 total attempts and, if still unsuccessful, SHALL return an error indication without leaving the user partially assigned.
4. THE Post_Confirmation_Trigger SHALL be provisioned through the Terraform_Stack as a Node.js 24.x TypeScript Lambda in `ap-southeast-1`.
5. WHEN a user who completed sign-up, confirmation, and group assignment signs in, THE Frontend_App SHALL resolve a non-null primary role from the IdToken `cognito:groups` claim using the precedence order moderator, then admin, then doctor, then patient.
6. IF the IdToken `cognito:groups` claim is empty or absent when a user signs in, THEN THE Frontend_App SHALL treat the user as having no role and SHALL route the user to a defined no-role destination rather than entering a redirect loop.
7. WHEN a confirmed, group-assigned user signs in, THE Route_Guard SHALL route the user to the role home for the assigned group in a single navigation with zero redirects to `/signIn`.

### Requirement 5: Seeded demo and role accounts (Slice 1 and Slice 2)

**User Story:** As the demo presenter, I want ready-made accounts, so that the stakeholder can sign in immediately and browse every area.

#### Acceptance Criteria

1. THE Demo_Environment SHALL contain exactly one Demo_Account that is in a confirmed sign-in-ready status and is simultaneously assigned to all three of the `patient`, `doctor`, and `admin` groups.
2. WHEN the Demo_Account signs in with valid credentials, THE Route_Guard SHALL grant access to the Patient_Area, the Doctor_Area, and the Admin_Area, and each area SHALL render its role home within 3 seconds of navigation without redirecting back to the sign-in screen.
3. WHILE the Demo_Account session remains active, THE Route_Guard SHALL allow navigation between the Patient_Area, the Doctor_Area, and the Admin_Area without requiring re-authentication.
4. THE Demo_Environment SHALL contain at least one Role_Account, each in a confirmed sign-in-ready status, for each of the `patient`, `doctor`, and `admin` roles, totaling a minimum of three Role_Accounts.
5. WHEN an end-to-end sign-up, then confirmation, then sign-in is performed with a new account, THE Frontend_App SHALL display the role home for the account's assigned group within 3 seconds and SHALL settle on that role home without issuing more than one redirect.
6. IF the Demo_Account or any required Role_Account is absent, not in a confirmed sign-in-ready status, or missing a required group or role assignment when the Demo_Environment is provisioned, THEN THE Demo_Environment SHALL fail provisioning verification and surface an indication identifying the missing or unconfirmed account, leaving no partially seeded account active.

### Requirement 6: Real landing page and navigation (Slice 2)

**User Story:** As the stakeholder, I want a real entry point and in-app navigation, so that I can move between areas and sign out without editing URLs.

#### Acceptance Criteria

1. THE Landing_Page SHALL render a product entry page at the root path, and the development "Links" page SHALL NOT be reachable from any user-facing control.
2. WHILE an authenticated user with one or more of the roles `patient`, `doctor`, `admin`, or `moderator` is viewing any role area, THE Frontend_App SHALL display navigation controls for every area permitted by the user's roles.
3. WHILE an authenticated user is viewing any role area, THE Frontend_App SHALL NOT display navigation controls for areas not permitted by the user's roles.
4. WHEN an authenticated user activates the sign-out control, THE Frontend_App SHALL clear the stored session and delete the `bayan-auth` cookie.
5. WHEN the sign-out completes, THE Frontend_App SHALL route the user to `/signIn` within 2 seconds.
6. IF the sign-out action fails, THEN THE Frontend_App SHALL display an error indication and SHALL retain the user's current authenticated session.
7. WHEN an unauthenticated visitor opens the Landing_Page, THE Frontend_App SHALL render the page within 3 seconds without requiring authentication.

### Requirement 7: Complete render coverage across all areas (Slice 2)

**User Story:** As the stakeholder, I want every screen to render, so that I can explore the whole product surface without hitting crashes.

#### Acceptance Criteria

1. WHEN an authenticated user whose role authorizes the target area navigates to any route registered in the navigation map of the Patient_Area, the Doctor_Area, or the Admin_Area, THE Frontend_App SHALL render that route's primary page layout and content region within 5 seconds without throwing an uncaught exception and without displaying a blank screen.
2. WHERE a route has no connected backend endpoint, THE Frontend_App SHALL render the route with all primary content regions visibly populated using mock or placeholder data, showing no undefined, null, or empty-template values to the user.
3. WHILE a data dependency for a route has not yet resolved, THE Frontend_App SHALL render a defined loading state until the dependency resolves or a 10-second timeout elapses.
4. IF a data dependency for a route returns an error or fails to resolve within 10 seconds, THEN THE Frontend_App SHALL render a defined error state indicating the data could not be loaded, while keeping the surrounding page layout and navigation interactive.
5. IF a data dependency for a route resolves successfully but returns zero records, THEN THE Frontend_App SHALL render a defined empty state in place of the content region instead of a blank area.
6. THE Admin_Area SHALL provide rendered pages for user management, platform settings, and KYC supervision, each reachable from the Admin_Area navigation.

### Requirement 8: Flagship booking-to-intake flow (Slice 3)

**User Story:** As a patient, I want to create a booking that reaches a doctor's intake queue and can be accepted, so that the demo shows one real end-to-end story.

#### Acceptance Criteria

1. WHEN a patient submits a booking, THE Frontend_App SHALL call `POST /v1/bookings` on the Backend_API with an `Idempotency-Key` header containing a single UUID v4 value, and SHALL reuse that same key on any automatic retry of the request.
2. WHEN the Backend_API returns a success envelope for a created booking, THE Frontend_App SHALL display the created booking's identifier and lifecycle status (`pending_payment`) within 2 seconds.
3. WHEN a doctor opens the intake queue, THE Frontend_App SHALL display the bookings returned by `GET /v1/doctors/me/intake-queue`.
4. IF `GET /v1/doctors/me/intake-queue` returns zero bookings, THEN THE Frontend_App SHALL display a defined empty state rather than an error state.
5. WHEN a doctor accepts a queued booking, THE Frontend_App SHALL call the intake-queue process endpoint with a confirm action and an `Idempotency-Key` header containing a UUID v4 value.
6. WHEN the Backend_API confirms an accepted booking, THE Frontend_App SHALL remove the accepted booking from the queue display and present an acceptance indication within 2 seconds.
7. IF the Backend_API returns an error envelope for a booking create or accept write, THEN THE Frontend_App SHALL display an error state derived from the envelope `code` and `message`, retain any entered input, and remain operable without crashing.

### Requirement 9: Real doctor search and profile data (Slice 4)

**User Story:** As a patient, I want doctor search backed by real data, so that I see live doctors and schedules instead of hard-coded samples.

#### Acceptance Criteria

1. WHEN a patient opens doctor search, THE Frontend_App SHALL request doctor and schedule data from the Backend_API and SHALL NOT read from any bundled or hard-coded mock data source.
2. WHEN the Backend_API returns a successful response containing one or more doctors, THE Frontend_App SHALL display each returned doctor together with that doctor's availability schedule within 3 seconds of receiving the response.
3. WHILE a doctor search request to the Backend_API is in progress, THE Frontend_App SHALL display a loading indicator and SHALL NOT display any previously cached or sample doctor data.
4. IF the Backend_API returns a successful response containing zero doctors, THEN THE Frontend_App SHALL display an empty-state message indicating that no doctors are currently available and SHALL display no doctor entries.
5. IF the doctor search request fails to complete within 10 seconds or the Backend_API returns an error response, THEN THE Frontend_App SHALL display an error message indicating that doctor data could not be loaded and SHALL provide a control allowing the patient to retry the request.

### Requirement 10: Patient booking list, detail, and status (Slice 5)

**User Story:** As a patient, I want to see my bookings and their statuses, so that I can track my consultations.

#### Acceptance Criteria

1. WHEN a patient opens the booking list and the Backend_API returns a successful `GET /v1/bookings` response, THE Frontend_App SHALL display the returned bookings within 3 seconds.
2. IF the Backend_API returns a successful `GET /v1/bookings` response containing zero bookings, THEN THE Frontend_App SHALL display a defined empty state.
3. IF the `GET /v1/bookings` request fails or returns no response within 10 seconds, THEN THE Frontend_App SHALL display an error state and provide a control to retry the request.
4. WHEN a patient opens a booking detail and the Backend_API returns a successful `GET /v1/bookings/{bookingId}` response, THE Frontend_App SHALL display the returned booking within 3 seconds.
5. IF `GET /v1/bookings/{bookingId}` returns a 404 (booking not found or not owned by the patient), THEN THE Frontend_App SHALL display a not-found state without exposing whether the booking exists.
6. IF `GET /v1/bookings/{bookingId}` fails with a non-404 error or returns no response within 10 seconds, THEN THE Frontend_App SHALL display an error state and provide a control to retry the request.
7. THE Frontend_App SHALL display the booking status using the defined lifecycle values `pending_payment`, `payment_submitted`, `confirmed`, `in_progress`, `completed`, and `cancelled`.
8. IF a booking carries a status value that is not one of the defined lifecycle values, or carries no status, THEN THE Frontend_App SHALL display a defined fallback status indication rather than a blank value.
9. WHEN the booking list response includes a pagination cursor in `meta`, THE Frontend_App SHALL provide a control to load the next page using that cursor.
10. IF the booking list response includes no pagination cursor in `meta` or an empty cursor, THEN THE Frontend_App SHALL NOT display a next-page control.

### Requirement 11: Consultation session and chat (Slice 6)

**User Story:** As a consultation participant, I want to activate a session and exchange chat messages, so that the consultation experience works in the demo.

#### Acceptance Criteria

1. WHEN a participant activates a one-time consultation link, THE Frontend_App SHALL call the OTL activation endpoint on the Backend_API and, upon receiving a success response within 5 seconds, transition the session to the active state.
2. IF the OTL activation endpoint returns a failure indicating the one-time consultation link is expired, already used, or otherwise invalid, THEN THE Frontend_App SHALL keep the session inactive and display an error message indicating the link cannot be activated.
3. WHEN a participant opens an active consultation, THE Frontend_App SHALL establish a WebSocket connection to the Backend_API by supplying the Cognito IdToken as a query token, completing the connection within 10 seconds.
4. WHEN a participant sends a chat message containing 1 to 4096 characters over the active WebSocket connection, THE Frontend_App SHALL deliver the message to the Backend_API and display the message in the conversation in chronological send order.
5. IF a participant submits a chat message that is empty or exceeds 4096 characters, THEN THE Frontend_App SHALL reject the message, retain the entered text in the input, and display an error message indicating the allowed message length.
6. IF the WebSocket connection fails or is not established within 10 seconds, THEN THE Frontend_App SHALL fall back to the HTTP chat endpoints on the Backend_API and display the current conversation state.

### Requirement 12: Post-consultation documents and media (Slice 7)

**User Story:** As a doctor, I want to produce consultation documents and upload media, so that post-consultation outputs appear in the demo.

#### Acceptance Criteria

1. WHEN a doctor saves a consultation document, THE Frontend_App SHALL call the consultation-documents endpoint on the Backend_API with an `Idempotency-Key` header containing a UUID v4 value.
2. IF the Backend_API returns an error when saving a consultation document, THEN THE Frontend_App SHALL display an error indication and SHALL retain the entered document content.
3. WHEN the Backend_API returns a success response for a finalized document, THE Frontend_App SHALL display the finalized document state within 2 seconds.
4. IF a doctor finalizes a document that is already finalized, THEN THE Frontend_App SHALL display the existing finalized state without producing a duplicate document.
5. WHEN a participant uploads consultation media, THE Frontend_App SHALL obtain a presigned URL from the Backend_API, upload the file to that URL, confirm the upload with the Backend_API, and display a confirmed-upload state on success.
6. IF any step of the media upload (presigned URL request, file upload, or confirmation) fails, THEN THE Frontend_App SHALL display an error indication and SHALL NOT show the media as uploaded.
7. WHEN the Backend_API returns CDS drafts for a consultation, THE Frontend_App SHALL display those CDS drafts.
8. WHILE CDS drafts for a consultation are still being generated, THE Frontend_App SHALL display an in-progress indicator.

### Requirement 13: Admin panel real data (Slice 8)

**User Story:** As an admin, I want the admin pages backed by real data, so that user management, settings, and KYC supervision are functional in the demo.

#### Acceptance Criteria

1. WHEN an admin opens the users page AND the Backend_API admin endpoint returns a user list, THE Frontend_App SHALL display every user record from that response within 3 seconds of receiving it.
2. WHEN an admin opens the settings page AND the Backend_API returns platform settings, THE Frontend_App SHALL display those settings within 3 seconds of receiving the response.
3. WHEN an admin opens the KYC supervision page AND the Backend_API returns the KYC review queue, THE Frontend_App SHALL display every queue entry from that response within 3 seconds of receiving it.
4. IF a user whose role is not admin requests an Admin_Area route, THEN THE Route_Guard SHALL prevent the Admin_Area from rendering and SHALL redirect the user to a non-Admin_Area route.
5. IF a Backend_API admin request fails or does not return a response within 10 seconds, THEN THE Frontend_App SHALL display an error indication on the affected admin page and SHALL NOT display partial or previously cached data for that page.
6. WHEN the Backend_API returns an empty result for the users list, platform settings, or KYC review queue, THE Frontend_App SHALL display an empty-state indication on the corresponding admin page rather than a blank area.

### Requirement 14: Patient home and doctor metrics (Slice 9)

**User Story:** As a patient or doctor, I want real content on my home and metrics views, so that the demo shows live information instead of static placeholders.

#### Acceptance Criteria

1. WHEN a patient opens the patient home, THE Frontend_App SHALL request home content from the Backend_API and, within 3 seconds of receiving a successful response, render that content in place of any static carousel placeholders.
2. WHEN a doctor opens the metrics view, THE Frontend_App SHALL request metrics from the Backend_API and, within 3 seconds of receiving a successful response, render the returned numeric metric values in place of any placeholder values.
3. WHILE a home or metrics request to the Backend_API is in progress and has not yet completed, THE Frontend_App SHALL display a loading indicator and SHALL NOT display static carousel or placeholder values.
4. IF the Backend_API returns a successful response containing zero content items for a home or metrics view, THEN THE Frontend_App SHALL display an empty state containing a visible text message indicating that no content is available.
5. IF a home or metrics request to the Backend_API fails to return a successful response within 10 seconds, or returns an error response, THEN THE Frontend_App SHALL display an error state containing a visible text message indicating that content could not be loaded and SHALL provide a control to retry the request.

### Requirement 15: Backend non-regression (Non-functional)

**User Story:** As the backend owner, I want the demo work to leave the deployed backend unchanged in behavior, so that the working dev and staging environments are not regressed.

#### Acceptance Criteria

1. WHILE the demo-readiness work is in progress, THE Backend_API SHALL retain its existing `/v1/` routes with no route removed, renamed, or relocated, no required request field added or removed, and success and error envelope structures identical to the currently published API contract.
2. WHEN the Deploy_Pipeline runs the backend smoke test, THE Backend_API SHALL pass 100% of the smoke-test assertions with zero failures.
3. IF the backend smoke test fails, THEN THE Deploy_Pipeline SHALL halt the deployment, retain the previously deployed backend version, and surface a failure indication.
4. WHERE a new server-side resource is required (the Post_Confirmation_Trigger), THE Terraform_Stack SHALL add the resource such that `terraform plan` shows no create, update, replace, or destroy on existing deployed Lambdas, and the post-change smoke test still passes 100%.
5. WHEN a request carries a valid token whose Cognito group authorizes the route, THE Backend_API SHALL authorize the request using the Cognito groups `patient`, `doctor`, `admin`, and `moderator`.
6. IF a request carries a missing or invalid token, THEN THE Backend_API SHALL reject it with a 401 response.
7. IF a request carries a valid token whose Cognito group is not authorized for the route, THEN THE Backend_API SHALL reject it with a 403 response.

### Requirement 16: Deploy pipeline reliability (Non-functional)

**User Story:** As the deploying engineer, I want the deploy pipeline to verify the demo end to end, so that a green run guarantees the Amplify link is usable.

#### Acceptance Criteria

1. WHEN the Deploy_Pipeline reports a successful (green) run, THE Deploy_Pipeline SHALL have completed, in order, a successful Terraform apply, an Amplify_Build that reached `SUCCEED` status, a passing backend smoke test, and an HTTP 200 response from the dev Amplify branch URL.
2. IF the backend smoke test fails on an attempt, THEN THE Deploy_Pipeline SHALL retry it until 3 total attempts have been made, waiting 15 seconds before the second attempt and 30 seconds before the third attempt.
3. IF the backend smoke test has not passed after 3 total attempts, THEN THE Deploy_Pipeline SHALL fail the run with an error indicating smoke test failure.
4. IF the Amplify_Build job does not reach `SUCCEED` status within a 30-minute wait window, polled every 20 seconds, THEN THE Deploy_Pipeline SHALL fail the run with a timeout error.
5. IF the Amplify_Build job reaches `FAILED` or `CANCELLED` status during the wait window, THEN THE Deploy_Pipeline SHALL fail the run immediately with an error indicating Amplify build failure, without waiting for the remainder of the 30-minute wait window.
6. IF the Terraform apply step does not complete successfully, THEN THE Deploy_Pipeline SHALL fail the run with an error indicating the apply failure before triggering the Amplify_Build.
7. IF the dev Amplify branch URL does not return an HTTP 200 response, THEN THE Deploy_Pipeline SHALL fail the run with an error indicating the URL check failure.
8. THE Deploy_Pipeline SHALL run all AWS operations against the `ap-southeast-1` region.

### Requirement 17: Free-exploration demo access (Slice 2)

**User Story:** As the stakeholder, I want to explore freely with one login, so that I can see the whole product without help.

#### Acceptance Criteria

1. WHEN the Demo_Account completes a single sign-in, THE Frontend_App SHALL allow navigation to the Patient_Area, the Doctor_Area, and the Admin_Area without prompting for credentials again for the duration of the valid session.
2. WHILE the Demo_Account session is valid, THE Route_Guard SHALL permit access to every role area mapped to the Demo_Account's assigned groups and SHALL NOT redirect navigation among the Patient_Area, the Doctor_Area, and the Admin_Area.
3. WHEN the Route_Guard detects that the Demo_Account session has expired, THE Route_Guard SHALL redirect the user to `/signIn` within 2 seconds of the next navigation or guard evaluation, and SHALL present an indication that the session has ended.
4. WHEN the Demo_Account navigates to any patient, doctor, or admin route reachable from its assigned groups, THE Demo_Environment SHALL render that route's primary content within 5 seconds without throwing an unhandled error that prevents the route from displaying.
5. IF a route reachable by the Demo_Account fails to render its primary content, THEN THE Frontend_App SHALL display an error indication identifying the failed route and SHALL keep the remaining role areas navigable without requiring re-authentication.
