# Requirements Document

## Introduction

This specification defines the **consultation media layer** for BayanHealth. Live video is
phase one of that layer, and this specification implements phase one only.

The framing is deliberate and load-bearing: this is not a video feature with recording
bolted on later. It is a media layer whose first producer happens to be live video. Every
entity, key shape, retention class, and configuration switch defined here is chosen so
that consented recording, transcription, and an eventual AI scribe become **configuration
changes and new producers**, not new projects and not a data migration.

This specification supersedes [ADR-20260720-02](../../../architecture/DECISIONS.md)
(Google Meet as the MVP video-consultation provider) as the video path, and retires the
`dev`-only demo stand-in accepted under ADR-20260807-06. The authorization, disclosure,
and system-of-record rules established by ADR-20260720-02 are **preserved verbatim in
substance** and restated here as binding acceptance criteria, because those rules were
correct and are the part of the earlier work that carries forward.

The engineering position, vendor comparison, and cost analysis behind these requirements
are recorded in `architecture/TELECONSULT_VIDEO_AND_AI_SCRIBE.md`.

### What this specification implements

- Three contracted HTTP operations for creating, reading, and ending a video session
- A provider-adapter seam (`lib/video-provider.ts`) behind an environment switch and the
  existing circuit breaker, degrading to chat-only on provider failure
- Daily as the launch provider, audio-only by default with camera on demand
- A single frontend seam component
- Room lifecycle cleanup on consultation completion, cancellation, and reschedule where a
  reschedule operation exists
- CloudWatch metrics and alarms per provider operation, following the PayRex alarm pattern
  under a video-specific namespace, alarm prefix, and dashboard
- Deletion of the demo video stand-in and every consumer of it

### What this specification defines but never writes to

- The Media_Artifact entity
- The Consent_Record entity
- The Transcript_Artifact type and the `TRANSCRIPT_PRODUCER` switch
- A training-eligible retention class

These are defined at launch because **key shape cannot be migrated cheaply and consent
cannot be reconstructed retroactively**. Nothing in this specification writes a
Media_Artifact, a Consent_Record, or a Transcript_Artifact in any environment.

### Explicitly out of scope

Recording, ASR, transcription, the AI scribe surface, the de-identification transformer
for transcripts, the curation and export pipeline, queue or Step Functions orchestration
for media processing, any change to an **existing** retention duration, Google Meet, and per-doctor
Google Workspace seats. Recording is a separate specification scheduled after counsel
review of RA 4200 obligations.

This specification changes **no existing** retention duration. It does introduce two new TTL
constants for the two new entity classes it defines: a **365-day** training-eligible
retention class (Requirement 12 criterion 1, matching the 1-year magnitude already used by
`Ttl.SolverContent`, `Ttl.PatientEducation`, `Ttl.DrugData`, and `Ttl.Slot`) and a **5-year**
Consent_Record retention (Requirement 13 criterion 1, matching the existing
`Ttl.PatientProfile` value).

#### Runtime behaviours deferred to the recording specification

Four behavioural rules that earlier drafts carried here have been moved out, because
Requirement 22 forbids building the recording path, the queue, the state machine, and the
scheduled job that would execute them. They are unimplementable and untestable at the
completion of this specification, so this specification keeps only their **shape**
obligation — the entity definitions must be able to express each behaviour without a
schema change — and defers the behaviour itself. The timings are recorded here so they are
not lost in the handover:

- **Revocation stops capture**: on a recording-scope revocation becoming durable,
  `stopRecording` is requested within **10000 milliseconds**, and audio captured at or
  after the revocation timestamp is ineligible for retention under every retention class.
- **Revocation is not deferred to end of consultation**: the recording precondition is
  re-evaluated at intervals no greater than **30000 milliseconds** for the duration of any
  in-flight recording.
- **Deletion enumeration**: the patient-scoped deletion path follows the pagination cursor
  with a page size of no more than **100 items per page** until the cursor is absent, and
  reports incomplete enumeration rather than success on any page failure.
- **Corpus de-indexing on revocation**: the sparse `gsi3` corpus attributes are stripped
  from every affected Media_Artifact within **60000 milliseconds** of a training-corpus
  revocation becoming durable, deleting no artifact and mutating no provenance field.

The fail-closed recording precondition of Requirement 13 criteria 6 through 8 is **not**
deferred. It is a shape-and-gate obligation, it is testable against zero persisted items,
and it is what makes `startRecording` unreachable without all-party consent.

### Delivery constraints these requirements are sized against

One engineer, roughly one week of implementation, three to four weeks to launch.

Live video is a **launch-blocking core feature of the production web application**, not a
`dev` experiment. `VIDEO_PROVIDER` is therefore `daily` in `dev`, `staging`, and `prod`,
and Requirement 19 defines the infrastructure for all three environments. What remains
outside this specification is the *applying*, not the *defining*: the `dev` apply is in
scope here, while the `staging` and `prod` applies are deferred operational work that each
require their own current, unused, operation-specific point-of-action authorization at
promotion time. Defining infrastructure is not applying it, and applying to `dev` is not
staging qualification.

Staging has never been qualified. Requirement 19 criterion 7 records staging qualification
of the `video-session` routes as a launch dependency tracked outside this specification,
and Requirement 22 keeps the qualification work itself out of scope here. Requirement 23
records the browser header and dependency surfaces that are already correct, so that no
change set modifies them on this feature's behalf.

### The falsifiable foundation claim

Requirement 17 exists so that the claim "this is a strong foundation for the scribe" is
**testable rather than asserted**. At launch, with `TRANSCRIPT_PRODUCER = none`, a
fabricated transcript must travel end-to-end into the existing CDS Subjective/Objective
path and land correctly behind the assessment-first physician gate
([ADR-20260703-01](../../../architecture/DECISIONS.md)). No ASR, no recording, no audio.
If that test is green, the scribe is a swap. If it is absent, the foundation is
unverified.

### Launch scope and fast-follow

The delivery target is one to two weeks, so the boundary between what lands at launch and
what follows immediately after is recorded here explicitly rather than improvised under time
pressure. Every item in the fast-follow set is deliberately chosen because deferring it
weakens observability or test depth but **does not weaken the foundation**: no entity shape,
no key shape, no retention decision, and no contract surface is deferred.

**In launch scope:**

- The three contracted `video-session` operations and their dispatch from the existing
  `bookings` handler (Requirement 21 criterion 10)
- The Video_Provider_Adapter with `createRoom`, `mintJoinCredential`, and `endRoom`, the
  Circuit_Breaker wiring, and credential loading through the Secrets_Loader
- The Video_Session entity and its key builders
- The definition-only entity shapes, key builders, and `DATA_MODEL.md` entries for
  Media_Artifact, Consent_Record, Transcript_Artifact, and the retention classes
- The `<ConsultationVideo />` component with its deliberate muted-on-join default, independent media toggles,
  third-party notice, and `429` handling
- Migration of the four `videoJoinUrl` surfaces and deletion of the Demo_Video_Stand_In
- Room lifecycle cleanup on consultation completion and cancellation
- The Requirement 17 transcript-to-CDS socket test
- The startup credential validation of Requirement 19 criterion 9
- Metric **emission** under Requirement 24 criteria 1 through 3

**Fast-follow, tracked outside the launch change set:**

- The CloudWatch alarms and dashboard of Requirement 24 criteria 4 through 7, 9, and 11
  through 13
- The property-based test suite of Appendix A beyond the four highest-value properties, which
  are A.1 credential non-disclosure, A.2 concealment indistinguishability, A.3 idempotent
  creation and read purity, and A.8 degradation totality
- The S3 bucket, KMS key, and lifecycle provisioning of Requirement 25, which belongs to the
  recording specification because nothing here writes a media object, as Requirement 25
  criterion 10 states

Deferring the alarms means a Video_Provider outage is visible in metrics but not paged, which
is acceptable only because Requirement 2 degrades the consultation to chat rather than
failing it. The alarms SHALL land before the corpus phase begins.

## Glossary

- **Media_Layer**: The booking-scoped subsystem that owns live media sessions and, in
  future phases, media artifacts derived from them. Live video is its first producer.
  Consultation-scoped reads resolve through the Booking.
- **Video_Session_Service**: The backend handler set that dispatches the three
  `video-session` operations defined in this specification.
- **Video_Session**: A persisted, **booking-scoped** record of one provider room, holding
  the provider name, provider room identifier, lifecycle state, and creation provenance.
  It is stored in the Booking partition under a fixed sort key (Requirement 11), so
  exactly one Video_Session may exist per Booking. A consultation-scoped view of a
  Video_Session is obtained by resolving the consultation to its Booking, because a
  Booking and a consultation are one-to-one on this platform.
- **Video_Provider_Adapter**: `backend/src/lib/video-provider.ts`. The only module that
  communicates with an external video provider.
- **Video_Provider**: The external video vendor selected by the `VIDEO_PROVIDER`
  environment variable. Permitted values at launch are `none` and `daily`.
- **Circuit_Breaker**: `backend/src/lib/circuit-breaker.ts`, the existing breaker used by
  the payments gateway adapter.
- **Join_Credential**: The provider-issued, participant-scoped, time-limited value a
  browser needs to enter a provider room. Treated as a secret at all times. Its lifetime is
  fixed at minting time (Requirement 8 criterion 6), it is minted only by
  `POST /v1/bookings/{bookingId}/video-session`, and an expired credential is re-obtained
  by a fresh `POST` rather than refreshed in place.
- **Owning_Patient**: The Cognito subject recorded as the patient on the Booking.
- **Assigned_Doctor**: The Cognito subject recorded as the assigned doctor on the Booking.
- **Eligible_Booking**: A Booking whose status is `confirmed` or `in_progress`.
- **Consultation_Video_Component**: The single frontend seam component
  `<ConsultationVideo />`, the only frontend module aware of provider specifics.
- **Chat_Channel**: The existing BayanHealth WebSocket chat, presence, and typing
  subsystem, with its HTTP polling fallback.
- **Media_Artifact**: A defined-only entity describing one stored media object derived
  from a consultation, carrying kind, per-participant track identity, storage pointer,
  duration, consent reference, retention class, and provenance.
- **Consent_Record**: A defined-only, first-class entity recording one consent grant by
  one actor, carrying actor identity, granted scopes, notice version, grant timestamp,
  and revocation state.
- **Transcript_Artifact**: A defined-only Media_Artifact kind describing a diarised,
  timestamped textual transcript, with a producer-agnostic shape. The segment text lives in
  S3 behind the artifact's storage pointer; the DynamoDB item holds metadata only
  (Requirement 15).
- **Training_Eligible_Retention_Class**: A retention class label marking an artifact as
  eligible for inclusion in a training corpus. Defining the label changes no retention
  duration.
- **Key_Registry**: `backend/src/lib/dynamo.ts`, the single source of truth for key
  prefixes, entity types, schema versions, GSI names, TTLs, and retention classes.
- **Data_Model_Document**: `architecture/DATA_MODEL.md`.
- **Contract**: `contracts/openapi.yaml`, the OpenAPI 3.1 source of truth.
- **Generated_Types**: `frontend/bayan-health-mvp/src/types/openapi.generated.ts`.
- **Audit_Writer**: The existing audit persistence path used for security-relevant events.
- **Secrets_Loader**: `backend/src/lib/secrets.ts`, with its in-process cache and
  placeholder detection.
- **Terraform_Configuration**: The Terraform sources under `infra/`.
- **Frontend_Configuration**: `frontend/bayan-health-mvp/next.config.ts`, including its
  response header configuration.
- **CDS_Pipeline**: The existing clinical decision support pipeline under
  `backend/src/lib/cds/`.
- **Assessment_Gate**: The server-side assessment-first gate required by ADR-20260703-01,
  which keeps Plan, prescription, final ICD, medical certificate, lab request, imaging
  request, and patient education locked until the physician confirms an Assessment.
- **Demo_Video_Stand_In**: `DEMO_VIDEO_JOIN_URL`, `backend/src/lib/video-session.ts`,
  `backend/src/lib/video-session.test.ts`, the `videoJoinUrl` field on the booking
  response, and the four frontend consumers of that field.
- **Requester**: The authenticated Cognito subject making an HTTP request.

## Requirements

### Requirement 1: Provider Adapter Seam

**User Story:** As the lead engineer, I want every provider interaction behind one
adapter selected by configuration, so that replacing the video vendor is a two-week
change that touches no product surface.

#### Acceptance Criteria

1. THE Video_Provider_Adapter SHALL declare `createRoom`, `mintJoinCredential`,
   `startRecording`, `stopRecording`, and `endRoom` as its complete outbound provider
   interface, so that a later recording phase adds no new seam.
2. THE Video_Provider_Adapter SHALL implement `createRoom`, `mintJoinCredential`, and
   `endRoom` under this specification.
3. IF `startRecording` or `stopRecording` is invoked, THEN THE Video_Provider_Adapter
   SHALL return a not-implemented outcome with error code `RECORDING_NOT_IMPLEMENTED`
   without issuing a network request to the Video_Provider.
4. THE Video_Provider_Adapter SHALL be the only backend module that issues network
   requests to a Video_Provider.
5. THE Video_Provider_Adapter SHALL select its implementation from the `VIDEO_PROVIDER`
   environment variable, accepting the values `none` and `daily`.
6. IF `VIDEO_PROVIDER` holds a value other than `none` or `daily`, THEN THE
   Video_Provider_Adapter SHALL behave as though the value were `none` and SHALL emit one
   PHI-free structured configuration warning per Lambda container.
7. WHERE `VIDEO_PROVIDER` is `none`, THE Video_Provider_Adapter SHALL report the media
   path as unavailable for every operation without issuing a network request.
8. THE Video_Provider_Adapter SHALL route every provider call through the Circuit_Breaker.
9. WHILE the Circuit_Breaker is open for the Video_Provider, THE Video_Provider_Adapter
   SHALL continue to route every provider call into the Circuit_Breaker and SHALL report
   the media path as unavailable from the Circuit_Breaker's fast-fail outcome, so that no
   network request reaches the Video_Provider and the breaker retains its own state
   transitions.
10. THE Video_Provider_Adapter SHALL declare per-participant unmixed audio track capture
    as a required provider capability in its interface documentation, so that a later
    recording phase inherits a diarisation-correct capture path.
11. THE Video_Provider_Adapter SHALL declare audio as the only recordable track kind in
    its `startRecording` interface documentation, so that a later recording phase captures
    no video track.
12. THE Video_Provider_Adapter SHALL accept a room configuration that requests audio-only
    participant defaults with participant-controlled camera activation.

### Requirement 2: Provider Degradation to Chat

**User Story:** As a patient in a consultation, I want the consultation to continue over
chat when video is unavailable, so that a vendor outage does not end my appointment.

#### Acceptance Criteria

1. IF the Video_Provider_Adapter reports the media path as unavailable, THEN THE
   Video_Session_Service SHALL respond `503` with error code
   `VIDEO_PROVIDER_UNAVAILABLE` and `retryable: true`, reached only at the provider
   availability stage of the evaluation order fixed by Requirement 6 criterion 5.
2. WHERE `VIDEO_PROVIDER` is `none`, THE Video_Session_Service SHALL respond `503` with
   error code `VIDEO_DISABLED` and `retryable: false`, reached only at the provider
   availability stage of the evaluation order fixed by Requirement 6 criterion 5, so that
   an unauthenticated or non-participant caller never learns that video is disabled.
3. WHEN THE Video_Session_Service responds with `VIDEO_PROVIDER_UNAVAILABLE` or
   `VIDEO_DISABLED`, THE Chat_Channel SHALL remain available to the Owning_Patient and
   the Assigned_Doctor under its existing eligibility rules.
4. THE Video_Session_Service SHALL complete `POST /v1/bookings/{bookingId}/start`
   successfully when the Video_Provider_Adapter reports the media path as unavailable.
5. THE Chat_Channel SHALL remain the retained clinical communication channel, served by
   the existing BayanHealth WebSocket API.
6. THE Media_Layer SHALL source chat, presence, and typing exclusively from the
   Chat_Channel.
7. THE Video_Session_Service SHALL treat Chat_Channel availability as the reason video
   degradation is safe, and SHALL introduce no change to Chat_Channel eligibility,
   availability, or failure behaviour under this specification.

### Requirement 3: Create a Video Session and Mint a Join Credential

**User Story:** As a participant in a consultation, I want one call that opens the
consultation room and hands me the credential to enter it, so that whoever arrives first
opens the room and neither of us waits on the other.

#### Acceptance Criteria

1. THE Contract SHALL define `POST /v1/bookings/{bookingId}/video-session` with
   `operationId: createBookingVideoSession` in the same change set that dispatches the
   route.
2. WHEN the Owning_Patient or the Assigned_Doctor calls
   `POST /v1/bookings/{bookingId}/video-session` for an Eligible_Booking that has no
   Video_Session, THE Video_Session_Service SHALL create one provider room, persist one
   Video_Session, and respond `201` with the Video_Session room state and a freshly minted
   Join_Credential scoped to the Requester.
3. WHEN the Owning_Patient or the Assigned_Doctor calls
   `POST /v1/bookings/{bookingId}/video-session` for an Eligible_Booking that already has
   an active Video_Session, THE Video_Session_Service SHALL reuse the existing provider
   room and respond `200` with the Video_Session room state and a freshly minted
   Join_Credential scoped to the Requester.
4. THE Video_Session_Service SHALL require an `Idempotency-Key` header holding a UUID v4
   on `POST /v1/bookings/{bookingId}/video-session`, and that key SHALL cover room
   creation only under Requirement 21 criterion 8.
5. THE Video_Session_Service SHALL persist the Video_Session using a DynamoDB conditional
   expression that permits at most one Video_Session record per Booking.
6. THE Video_Session_Service SHALL win the conditional expression of criterion 5 before
   requesting room creation from the Video_Provider_Adapter, so that a losing caller
   creates no provider room.
7. IF the conditional expression in criterion 5 fails, THEN THE Video_Session_Service
   SHALL create no provider room, SHALL read the winning Video_Session, and SHALL respond
   `200` with a freshly minted Join_Credential for the Requester rather than surfacing a
   conflict.
8. IF the Booking status is a value other than `confirmed` or `in_progress`, THEN THE
   Video_Session_Service SHALL respond `409` with error code `STATE_CONFLICT`, reached only
   at the eligibility stage of the evaluation order fixed by Requirement 6 criterion 5.
9. FOR ALL pairs of distinct Booking identifiers, THE Video_Session_Service SHALL resolve
   distinct provider room identifiers, so that no provider room serves two consultations.
10. THE Video_Session_Service SHALL create a provider room only on the first
    `POST /v1/bookings/{bookingId}/video-session` request for a Booking, so that room
    creation is lazy rather than performed at booking confirmation or consultation start,
    and no other operation SHALL create a provider room.
11. THE Video_Session_Service SHALL permit both the Owning_Patient and the Assigned_Doctor
    to call `POST /v1/bookings/{bookingId}/video-session`, and no criterion in this
    specification SHALL deny the Owning_Patient that operation on role grounds. Room
    creation is idempotent under criterion 5, it is booking-scoped and therefore
    consultation-scoped, it creates at most one room per Booking regardless of which
    participant calls first, and a patient who arrives before the doctor must not be locked
    out of the room. A role prohibition on this operation would prevent nothing while
    guaranteeing that outcome.
12. THE Video_Session_Service SHALL treat `POST /v1/bookings/{bookingId}/video-session` as
    the only operation that mints or discloses a Join_Credential, and SHALL mint that
    credential fresh on every such request rather than reading it from any persisted item.
13. WHEN the Owning_Patient or the Assigned_Doctor calls
    `POST /v1/bookings/{bookingId}/video-session` for an Eligible_Booking whose
    Video_Session lifecycle state is **ended**, THE Video_Session_Service SHALL request a
    new provider room from the Video_Provider_Adapter, SHALL overwrite the provider room
    identifier on the existing Video_Session item, SHALL transition the lifecycle state
    back to active, SHALL clear the ended timestamp, and SHALL respond `200` with the
    Video_Session room state and a freshly minted Join_Credential scoped to the Requester.
    A mis-click must be recoverable rather than terminal: a doctor who ends the room by
    mistake mid-consultation otherwise has no defined recovery, criteria 2 and 3 cover only
    "no Video_Session" and "an active Video_Session", and a room that cannot be re-opened
    turns an accidental end into a lost consultation. This platform has already been burned
    by exactly this failure class — ADR-20260807-02 had to add a revoke path to recover
    from a one-time-link lockout.
14. THE Video_Session_Service SHALL perform the re-open of criterion 13 under a DynamoDB
    conditional expression asserting that the current lifecycle state is ended, so that two
    concurrent re-opens cannot produce two provider rooms, and SHALL win that conditional
    expression before requesting room creation from the Video_Provider_Adapter under the
    same ordering rule as criterion 6, so that a losing caller creates no provider room.
15. THE Video_Session_Service SHALL preserve the one-item-per-Booking invariant of
    Requirement 11 across a re-open: the re-open of criterion 13 SHALL mutate the existing
    Video_Session item under the fixed sort key of Requirement 11 criterion 2 and SHALL NOT
    create a second Video_Session.
16. WHEN THE Video_Session_Service re-opens a Video_Session under criterion 13, THE
    Audit_Writer SHALL persist the distinct `video_session_reopened` event of Requirement 9
    criterion 10 rather than a `video_session_created` event, so that a re-open is
    distinguishable from a first creation in the audit trail.

### Requirement 4: Read a Video Session

**User Story:** As the owning patient, I want to check whether the consultation room is
open without changing anything, so that a page load, a prefetch, or a retry cannot
provision a room at the vendor on my behalf.

#### Acceptance Criteria

1. THE Contract SHALL define `GET /v1/bookings/{bookingId}/video-session` with
   `operationId: getBookingVideoSession` in the same change set that dispatches the route.
2. WHEN the Owning_Patient or the Assigned_Doctor calls
   `GET /v1/bookings/{bookingId}/video-session` for an Eligible_Booking that has a
   Video_Session, THE Video_Session_Service SHALL respond `200` with the Video_Session
   existence, its lifecycle state, and its provider name, and SHALL omit any
   Join_Credential from the response.
3. WHEN the Owning_Patient or the Assigned_Doctor calls
   `GET /v1/bookings/{bookingId}/video-session` for an Eligible_Booking that has no
   Video_Session, THE Video_Session_Service SHALL respond `404` with error code
   `RESOURCE_NOT_FOUND`, SHALL create no provider room, and SHALL persist no
   Video_Session.
4. THE Video_Session_Service SHALL keep `GET /v1/bookings/{bookingId}/video-session` safe
   and side-effect free: it SHALL request no room creation from the Video_Provider_Adapter,
   SHALL mint no Join_Credential, and SHALL write no item to DynamoDB, so that HTTP safety
   holds and no proxy, prefetch, or retry library can provision a provider room.
5. FOR ALL sequences of two or more `GET /v1/bookings/{bookingId}/video-session` calls on
   one Booking by any combination of the Owning_Patient and the Assigned_Doctor with no
   intervening `POST` operation, THE Video_Session_Service SHALL resolve every call to the
   same provider room identifier and the same lifecycle state, and SHALL leave
   Video_Provider state and `app_core` state unchanged.
6. THE Video_Session_Service SHALL omit the `Idempotency-Key` requirement on
   `GET /v1/bookings/{bookingId}/video-session`, because that operation performs no write;
   at-most-once room creation rests entirely on the conditional expression of
   Requirement 3 criterion 5.
7. THE Video_Session_Service SHALL require a participant to obtain a Join_Credential from
   `POST /v1/bookings/{bookingId}/video-session` under Requirement 3, and the credential
   minted there SHALL carry a participant identity and participant role matching the
   Requester's role on the Booking.

### Requirement 5: End a Video Session

**User Story:** As the assigned doctor, I want to close the consultation room, so that a
finished consultation is not a room anyone can re-enter.

#### Acceptance Criteria

1. THE Contract SHALL define `POST /v1/bookings/{bookingId}/video-session/end` with
   `operationId: endBookingVideoSession` in the same change set that dispatches the route.
2. WHEN the Assigned_Doctor calls `POST /v1/bookings/{bookingId}/video-session/end` for a
   Booking with an active Video_Session, THE Video_Session_Service SHALL request room
   termination through the Video_Provider_Adapter and SHALL record the Video_Session
   lifecycle state as ended.
3. IF the Video_Provider_Adapter reports failure while ending the room, THEN THE
   Video_Session_Service SHALL record the Video_Session lifecycle state as ended and
   respond `200`, treating provider termination as best-effort.
4. THE Video_Session_Service SHALL leave the Booking status unchanged when ending a
   Video_Session.
5. THE Video_Session_Service SHALL treat clinical completion of a consultation as
   established only by `POST /v1/bookings/{bookingId}/complete`.
6. THE Video_Session_Service SHALL require an `Idempotency-Key` header holding a UUID v4
   on `POST /v1/bookings/{bookingId}/video-session/end`.
7. WHEN the Assigned_Doctor calls `POST /v1/bookings/{bookingId}/video-session/end` for a
   Booking whose Video_Session lifecycle state is already ended, THE Video_Session_Service
   SHALL respond `200` without issuing a provider request.
8. WHEN `POST /v1/bookings/{bookingId}/complete` completes a consultation on a Booking
   holding an active Video_Session, THE Media_Layer SHALL end that Video_Session, and SHALL
   alter no existing completion semantics, no completion response shape, and no
   consultation-completion side effect.
9. WHEN a Booking holding an active Video_Session is cancelled, THE Media_Layer SHALL end
   that Video_Session.
10. WHERE a booking reschedule operation exists in the Booking lifecycle, WHEN a Booking
    holding an active Video_Session is rescheduled, THE Media_Layer SHALL end that
    Video_Session, so that the rescheduled Booking provisions a fresh provider room on its
    next `POST /v1/bookings/{bookingId}/video-session` under Requirement 3 criterion 2 or
    criterion 13 rather than reusing the room of the superseded appointment. The criterion
    is conditional because the documented Booking lifecycle is
    `pending_payment → payment_submitted → confirmed → in_progress → completed / cancelled`
    and contains no reschedule state, so a reschedule operation may not exist to hook.
11. FOR ALL of criteria 8 through 10, THE Media_Layer SHALL treat provider termination as
    best-effort: IF the Video_Provider_Adapter reports failure or reports the media path as
    unavailable, THEN THE Media_Layer SHALL record the Video_Session lifecycle state as
    ended, SHALL NOT fail or block the completion, cancellation, or reschedule operation,
    and SHALL emit the `video_session_ended` audit event of Requirement 9 criterion 3
    carrying the provider termination outcome, so that a leaked vendor room is observable
    rather than silent.
12. THE Media_Layer SHALL leave no provider room active for a Booking that is completed,
    cancelled, or rescheduled, so that provider rooms do not accumulate at the vendor for
    the lifetime of the account.
13. THE handler serving `POST /v1/bookings/{bookingId}/complete`, booking cancellation, and
    booking reschedule SHALL invoke the Video_Provider_Adapter **directly and
    synchronously** for the cleanup of criteria 8 through 10 as a **local function call
    within the same handler**, introducing no cross-handler invocation, no queue, no state
    machine, and no scheduled job, consistent with Requirement 22 criterion 4.
    Requirement 21 criterion 10 dispatches the three `video-session` routes from the same
    `bookings` handler that serves those three lifecycle operations, so the cleanup call and
    the `video-session` operations share one execution context and one execution role, and
    this criterion fixes that the cleanup is an in-process call rather than leaving the
    execution context undefined.
14. THE cleanup call of criterion 13 SHALL be bounded by an explicit timeout expressed as a
    named constant, `VIDEO_CLEANUP_TIMEOUT_MS`, set to 2000 milliseconds and declared once
    in the Video_Provider_Adapter rather than as a literal at any call site, and because
    cleanup is best-effort under criterion 11, a provider failure or an unavailable media
    path SHALL NOT extend the latency budget or the failure surface of the completion,
    cancellation, or reschedule operation, so that a slow provider cannot delay a clinical
    operation.
15. THE implementation SHALL confirm whether a booking reschedule operation exists in the
    Booking lifecycle before criterion 10 is claimed as satisfied, and IF no such operation
    exists, THEN THE implementation SHALL record criterion 10 as `not applicable` together
    with the Booking lifecycle states inspected, so that the criterion is never silently
    skipped.

### Requirement 6: Authorization Matrix and Existence Concealment

**User Story:** As a security reviewer, I want unauthorized callers to learn nothing about
bookings they have no relationship to, so that the API cannot be used to enumerate
consultations.

#### Acceptance Criteria

1. IF a request to any `video-session` operation carries no valid Cognito access token,
   THEN THE Video_Session_Service SHALL respond `401` with error code
   `AUTH_TOKEN_INVALID`.
2. IF the Requester holds a valid token and is neither the Owning_Patient nor the
   Assigned_Doctor of the addressed Booking, THEN THE Video_Session_Service SHALL respond
   `404` with error code `RESOURCE_NOT_FOUND`.
3. IF the addressed Booking does not exist, THEN THE Video_Session_Service SHALL respond
   `404` with error code `RESOURCE_NOT_FOUND`.
4. FOR ALL Requesters who are neither the Owning_Patient nor the Assigned_Doctor, THE
   Video_Session_Service SHALL return responses for an existing Booking that are
   byte-identical, apart from `requestId`, to responses for a non-existent Booking
   identifier of the same syntactic form.
5. THE Video_Session_Service SHALL evaluate every `video-session` request in exactly the
   following order and SHALL respond from the first stage that fails, and no other
   criterion in this specification SHALL claim a status code independently of this order:
   (1) authentication, failing `401` with `AUTH_TOKEN_INVALID` under criterion 1;
   (2) participant relation, failing `404` with `RESOURCE_NOT_FOUND` under criteria 2 and 3;
   (3) operation role, failing `403` with `AUTH_INSUFFICIENT_ROLE` under criterion 6, which
   applies to `POST /v1/bookings/{bookingId}/video-session/end` alone;
   (4) Booking eligibility, failing `409` with `STATE_CONFLICT` under Requirement 7
   criterion 2;
   (5) the credential-mint ceiling of Requirement 9 criterion 6; and
   (6) Video_Provider availability, failing `503` with `VIDEO_PROVIDER_UNAVAILABLE` or
   `VIDEO_DISABLED` under Requirement 2 criteria 1 and 2.
6. IF the Requester is the Owning_Patient and the addressed operation is
   `POST /v1/bookings/{bookingId}/video-session/end`, THEN THE Video_Session_Service SHALL
   respond `403` with error code `AUTH_INSUFFICIENT_ROLE`, ending a Video_Session being
   reserved to the Assigned_Doctor under Requirement 5.
7. THE Video_Session_Service SHALL evaluate Booking ownership and assignment from
   BayanHealth-held state, and SHALL treat Video_Provider state as non-authoritative for
   authorization.
8. WHEN a request carries a valid Cognito access token, THE Video_Session_Service SHALL
   derive the Requester identity from the verified token claims rather than from any
   request body or query parameter.

### Requirement 7: Eligibility Window

**User Story:** As the owning patient, I want room access to open when my booking is
confirmed and close when it is not, so that access matches the appointment rather than
outliving it.

#### Acceptance Criteria

1. THE Video_Session_Service SHALL treat `confirmed` and `in_progress` as the complete set
   of Booking statuses eligible for Join_Credential disclosure.
2. FOR ALL Booking statuses outside `confirmed` and `in_progress`, THE
   Video_Session_Service SHALL respond `409` with error code `STATE_CONFLICT` and SHALL
   omit any Join_Credential from the response, reached only at the eligibility stage of the
   evaluation order fixed by Requirement 6 criterion 5.
3. THE Video_Session_Service SHALL apply the eligibility check of criterion 1 on every
   `video-session` operation, independently of whether a Video_Session record already
   exists.
4. THE Video_Session_Service SHALL apply the eligibility check of criterion 1 after
   confirming that the Requester is the Owning_Patient or the Assigned_Doctor, as the
   evaluation order of Requirement 6 criterion 5 requires, so that an ineligible status is
   disclosed only to a participant.

### Requirement 8: Join Credential Confidentiality

**User Story:** As a compliance reviewer, I want the join credential to exist in exactly
one place — a single-booking response to a participant — so that it cannot leak through a
log, a list, an error, or a notification.

#### Acceptance Criteria

1. THE Video_Session_Service SHALL disclose a Join_Credential only in the response body of
   `POST /v1/bookings/{bookingId}/video-session` addressed to a single Booking, and SHALL
   disclose no Join_Credential from `GET /v1/bookings/{bookingId}/video-session` or from
   `POST /v1/bookings/{bookingId}/video-session/end`.
2. THE Video_Session_Service SHALL omit Join_Credential values from every list endpoint
   response.
3. THE Video_Session_Service SHALL omit Join_Credential values from every CloudWatch log
   statement, including structured fields, error objects, and stack traces.
4. THE Video_Session_Service SHALL omit Join_Credential values from every error envelope
   `message` field.
5. THE Video_Session_Service SHALL omit Join_Credential values from every analytics event
   and every notification template.
6. THE Video_Session_Service SHALL request a Join_Credential lifetime of 30 minutes from
   the minting instant, expressed as a named constant declared once in the
   Video_Provider_Adapter rather than as a literal at any call site, and SHALL rely on the
   client re-minting through `POST /v1/bookings/{bookingId}/video-session` for any
   consultation that outlasts that lifetime.
7. THE Video_Session_Service SHALL treat Join_Credential expiry as independent of the
   eligibility window, because `in_progress` has no defined end instant and the
   Video_Provider fixes token expiry at mint time, and SHALL require an expired credential
   to be re-obtained by a fresh `POST` rather than refreshed, extended, or renewed in place.
   Eligibility is re-checked on every mint under Requirement 7 criterion 3, so a credential
   outliving eligibility grants at most one lifetime of residual access and no more.
8. THE Video_Session_Service SHALL omit Video_Provider secret values, including API keys
   and signing secrets, from every HTTP response.
9. THE Consultation_Video_Component SHALL obtain a Join_Credential only from a
   `POST /v1/bookings/{bookingId}/video-session` response and SHALL hold it in memory for
   the lifetime of the component instance.
10. THE provider room identifier SHALL be opaque and SHALL contain no patient name, no
    doctor name, no booking-derived clinical information, and no protected health
    information, because provider room identifiers are visible in the Video_Provider's own
    administration console and in participant-facing URLs, which are outside BayanHealth's
    control.

### Requirement 9: Audit Events

**User Story:** As an admin investigating an access question, I want a PHI-free record of
who was given room access and when, so that disclosure is reconstructable after the fact.

#### Acceptance Criteria

1. WHEN THE Video_Session_Service creates a Video_Session, THE Audit_Writer SHALL persist
   a `video_session_created` event carrying booking identifier, actor identifier, actor
   role, provider name, and timestamp.
2. WHEN THE Video_Session_Service mints and discloses a Join_Credential under Requirement 3
   criterion 12, THE Audit_Writer SHALL persist a `video_session_credential_disclosed` event
   carrying booking identifier, actor identifier, actor role, and timestamp.
3. WHEN THE Video_Session_Service records a Video_Session as ended, THE Audit_Writer SHALL
   persist a `video_session_ended` event carrying booking identifier, actor identifier,
   provider termination outcome, and timestamp.
4. WHEN THE Video_Session_Service denies an authenticated `video-session` request with
   `403` or `409`, THE Audit_Writer SHALL persist a `video_session_denied` event carrying
   the responded error code, actor identifier, actor role, booking identifier, and
   timestamp.
5. IF a `video-session` request is denied with `401`, or with `404` under the concealment
   rule of Requirement 6 criteria 2 through 4, THEN THE Video_Session_Service SHALL emit one
   CloudWatch metric datum naming the responded error code and THE Audit_Writer SHALL
   persist no event, because a denial reachable without a participant relation is reachable
   at probing volume and an audit row per probe is an attacker-controlled write amplifier.
6. THE Video_Session_Service SHALL bound Join_Credential minting to no more than 20
   successful `POST /v1/bookings/{bookingId}/video-session` responses per Booking per actor
   per rolling hour, expressed as a named constant rather than a literal, and IF that
   ceiling is exceeded THEN THE Video_Session_Service SHALL respond `429` with error code
   `VIDEO_CREDENTIAL_MINT_LIMIT` and `retryable: true`, SHALL request nothing from the
   Video_Provider_Adapter, and THE Audit_Writer SHALL persist one `video_session_denied`
   event for that denial. The ceiling is evaluated at the stage fixed by Requirement 6
   criterion 5. The value is 20 rather than 10 because a two-hour consultation already needs
   four scheduled mints at the 30-minute credential lifetime of Requirement 8 criterion 6,
   and reconnects on Philippine mobile data can add several more within a single poor hour,
   so a ceiling of 10 makes a mid-consultation `429` reachable in normal use, while 20 keeps
   provider quota consumption and audit volume per actor bounded at a level that is
   negligible for the Video_Provider.
7. WHEN the Video_Provider_Adapter reports the media path as unavailable, THE Audit_Writer
   SHALL persist a `video_session_provider_unavailable` event carrying booking identifier,
   provider name, failure category, and timestamp.
8. THE Audit_Writer SHALL omit Join_Credential values, provider secrets, patient names,
   and clinical content from every event defined in this requirement.
9. THE Audit_Writer SHALL record a `video_session_*` event as evidence of media access
   only, and the CDS_Pipeline SHALL treat no `video_session_*` event as evidence that a
   clinical consultation was completed.
10. WHEN THE Video_Session_Service re-opens an ended Video_Session under Requirement 3
    criterion 13, THE Audit_Writer SHALL persist a distinct `video_session_reopened` event
    carrying booking identifier, actor identifier, actor role, the superseded provider room
    identifier, and timestamp, so that a re-open is distinguishable from a first creation in
    the audit trail.
11. WHEN THE Video_Session_Service responds `429` with error code
    `VIDEO_CREDENTIAL_MINT_LIMIT` under criterion 6, THE Video_Session_Service SHALL carry a
    `Retry-After` header on that response naming the whole number of seconds until the
    rolling window of criterion 6 admits another mint for that Booking and actor, so that the
    Consultation_Video_Component honours a server-stated interval under Requirement 20
    criterion 13 rather than guessing a backoff.

### Requirement 10: Removal of the Demo Video Stand-In

**User Story:** As the lead engineer, I want the demo stand-in gone in the same change set
that lands the real integration, so that two video paths never coexist.

#### Acceptance Criteria

1. THE Video_Session_Service SHALL replace `backend/src/lib/video-session.ts` and
   `backend/src/lib/video-session.test.ts` with the Video_Provider_Adapter and its tests,
   and the two stand-in files SHALL be absent from the repository afterwards.
2. THE Contract SHALL omit the `videoJoinUrl` property from the booking response schema.
3. THE Generated_Types SHALL be regenerated from the Contract in the same change set that
   removes `videoJoinUrl`, so that the generated-type drift check passes.
4. THE Consultation_Video_Component SHALL replace the `videoJoinUrl` consumers in
   `ConsultationRoom`, `PatientBookingDetail`, `DoctorConsultationAccess`, and
   `DoctorDashboardDrawer`, and no frontend module SHALL reference `videoJoinUrl`
   afterwards.
5. THE Terraform_Configuration SHALL omit the `demo_video_join_url` variable and its
   Lambda environment binding, and SHALL omit the `DEMO_VIDEO_JOIN_URL` Lambda environment
   variable.
6. THE Video_Session_Service SHALL preserve the disclosure rules the Demo_Video_Stand_In
   enforced, namely participant-only disclosure, eligibility-window gating, and absence
   from list endpoints, logs, error messages, and notification templates.
7. THE Contract SHALL omit references to `architecture/GOOGLE_MEET_INTEGRATION.md` after
   the `videoJoinUrl` property is removed.
8. THE removal of the `videoJoinUrl` property from the booking response schema, the
   regeneration of the Generated_Types, and the frontend migration of criterion 4 SHALL
   land atomically in one change set, because removing the property is a breaking contract
   change and the booking response schema also projects into the booking list endpoints, so
   any partial landing leaves either the list responses or the frontend referencing a
   property that no longer exists.

### Requirement 11: Video Session Entity Definition

**User Story:** As the lead engineer, I want the one entity this specification actually
writes to be as fully specified as the entities it only defines, so that the item this
feature persists is not the least-governed item in the table.

#### Acceptance Criteria

1. THE Key_Registry SHALL define a Video_Session entity type, a schema version, a key
   prefix, a TTL constant, and a retention class, and SHALL expose key builder functions
   for Video_Session so that no handler inlines a Video_Session key prefix or a `BOOKING#`
   literal.
2. THE Key_Registry SHALL compose the Video_Session primary key from the Booking key prefix
   and one Booking identifier as the partition value, and one fixed sort value carrying no
   variable segment, following the established precedent that the intake form
   (`sk = INTAKE`) and the payment record (`sk = PAYMENT`) live in the Booking partition
   under a fixed sort key.
3. THE Video_Session_Service SHALL express the at-most-one-per-Booking conditional
   expression of Requirement 3 criterion 5 as a simple `attribute_not_exists` condition on
   that fixed key, which the key shape of criterion 2 makes sufficient without a sentinel
   item, a counter, or a transaction.
4. THE Key_Registry SHALL set the Video_Session TTL constant to the value of the existing
   `Ttl.Session` constant of 120 days, and SHALL reuse an existing retention class rather
   than introducing a new retention class or a new retention duration for this entity.
5. THE Video_Session definition SHALL carry the provider name, the provider room
   identifier, a lifecycle state holding exactly one of active or ended, the creating actor
   identifier and actor role, a creation timestamp in UTC with millisecond precision, an
   ended timestamp present when and only when the lifecycle state is ended, and the
   mint-accounting structure of criterion 10. THE lifecycle state field SHALL permit the
   transition active → ended under Requirement 5 criterion 2 **and** the transition
   ended → active under Requirement 3 criterion 13, and the provider room identifier and the
   ended timestamp SHALL therefore both be mutable: a re-open overwrites the provider room
   identifier and clears the ended timestamp on the existing item.
6. THE Video_Session definition SHALL carry `entityType`, `schemaVersion`, `ttl`, and
   `legalHold`, satisfying Requirement 21 criterion 11 for the only item this specification
   writes.
7. THE Video_Session definition SHALL hold no Join_Credential value and no Video_Provider
   secret value, so that the persisted record is not a credential store.
8. THE Video_Session definition SHALL populate no `gsi1`, `gsi2`, or `gsi3` attribute,
   because its single access pattern is a primary-key get by Booking identifier and it
   therefore consumes no index slot.
9. THE Data_Model_Document SHALL record the Video_Session entity before the Key_Registry
   change merges, including the partition and sort value shapes, the primary-key get access
   pattern, the `attribute_not_exists` conditional expression of criterion 3, the
   lifecycle-state conditional expression that guards the re-open of Requirement 3
   criterion 14, the mint-accounting structure of criterion 10 and the conditional write
   that maintains it under criterion 11, the TTL constant, and the retention class.
10. THE Video_Session definition SHALL carry a mint-accounting structure keyed by actor
    identifier, each entry holding a rolling-window start timestamp in UTC with millisecond
    precision and a mint count, bounded to at most 2 entries because a Booking has exactly
    one Owning_Patient and one Assigned_Doctor. This is not a separate entity: a
    per-Booking-per-actor counter with the same lifetime as the Video_Session has no access
    pattern of its own, and a second item would need its own key shape, TTL, and cleanup for
    no benefit.
11. THE Video_Session_Service SHALL evaluate and increment the credential-mint ceiling of
    Requirement 9 criterion 6 against the structure of criterion 10 within the same
    conditional write that records the mint, so that the ceiling cannot be bypassed by
    concurrent requests.
12. THE mint-accounting structure of criterion 10 SHALL hold no Join_Credential value,
    consistent with criterion 7.
13. WHEN `legalHold` is true on any item defined by this specification, THE writer SHALL
    unset the `ttl` attribute on that item, because DynamoDB TTL does not evaluate boolean
    attributes and a pinned item carrying a `ttl` would still expire. This restates the rule
    already stated in the `backend/src/lib/dynamo.ts` header, so that criterion 6 is not read
    as requiring both attributes to be populated simultaneously.

### Requirement 12: Media Artifact Entity Definition

**User Story:** As the lead engineer, I want the media artifact key shape settled before
any artifact exists, so that recording ships as a new producer against an existing shape
rather than as a data migration.

#### Acceptance Criteria

1. THE Key_Registry SHALL define a Media_Artifact entity type, a schema version, a key
   prefix whose string value differs from the existing `MEDIA` key prefix, a TTL constant,
   and a retention class set that includes the Training_Eligible_Retention_Class, all
   distinct from the existing `media` entity type used for consultation attachments, and
   SHALL set every Media_Artifact TTL constant to a value no greater than the
   Consent_Record TTL constant of Requirement 13 criterion 1. THE Key_Registry SHALL set the
   **default Media_Artifact TTL constant** to the value of the existing `Ttl.Media` constant
   of 120 days, matching the retention already applied to consultation attachments, so that
   the default is a named concrete value rather than an undefined reference, and that default
   SHALL remain the existing 120-day `Ttl.Media` value because only the training-eligible
   class changes under this specification. THE Key_Registry SHALL set the TTL constant
   associated with the Training_Eligible_Retention_Class to **365 days**, matching the 1-year
   magnitude already established in the Key_Registry by `Ttl.SolverContent`,
   `Ttl.PatientEducation`, `Ttl.DrugData`, and `Ttl.Slot`, so the constant is consistent with
   the existing registry rather than a novel magnitude. That value is decided at 1 year on
   product direction, so that a training corpus can accumulate more than six months of
   consultations, and it remains subject to counsel confirmation of RA 4200 obligations and
   to being stated in the consent notice under Requirement 13 criterion 14.
2. THE Key_Registry SHALL expose key builder functions for Media_Artifact that construct
   the partition key from the Booking key prefix and one Booking identifier, following the
   `chatMessageBookingPrimaryKey` precedent, because a Video_Session may open while the
   Booking is `confirmed` and no consultation session exists yet, SHALL expose a
   Media_Artifact sort-key prefix helper, and no handler SHALL inline a Media_Artifact key
   prefix. Partitioning on the Booking identifier is what makes every artifact reachable
   regardless of when it was created, including artifacts created before a consultation
   session exists, and Requirement 14 criterion 1 depends on that property.
3. THE Media_Artifact definition SHALL carry an artifact kind, a per-participant track
   identity, a storage pointer, a Consent_Record reference, exactly one retention class
   drawn from the retention class set of criterion 1, and provenance naming the producer
   that created the artifact. WHERE the artifact kind is the audio kind, THE Media_Artifact
   definition SHALL require a duration expressed in whole seconds no fewer than 1 and no
   more than 14400. WHERE the artifact kind is the transcript kind, THE Media_Artifact
   definition SHALL derive the duration from the source audio artifact named under criterion
   6 rather than accepting an independently supplied value, so that the two cannot drift.
   THE Media_Artifact definition SHALL carry no consultation identifier index attribute,
   because Requirement 14 criterion 1 serves the per-consultation query from the table
   primary key by resolving the consultation to its Booking. IF a construction argument
   falls outside the bounds stated in this requirement,
   THEN THE Media_Artifact construction function SHALL reject construction, SHALL return an
   error indicating which bound was violated, and SHALL persist no Media_Artifact item.
4. THE Media_Artifact definition SHALL represent one per-participant unmixed audio track as
   one artifact, so that a two-participant consultation produces one artifact per
   participant track rather than one mixed artifact, and SHALL bound one Video_Session to
   no more than 8 track identities. THE track identity SHALL be an opaque label of 1 to 64
   characters that contains no Cognito subject, no person name, no email address, and no
   phone number, SHALL be distinct per track within one Video_Session, SHALL remain stable
   for the lifetime of the artifact, and SHALL be resolvable to an actor only by joining
   Booking state.
5. THE Media_Artifact definition SHALL restrict its artifact kind set to exactly two
   values, one audio kind and one transcript kind, and SHALL define no recorded-video kind.
   IF construction is attempted with an artifact kind outside that two-value set, THEN THE
   Media_Artifact construction function SHALL reject construction, SHALL return an error
   indicating an unsupported artifact kind, and SHALL persist no Media_Artifact item.
6. WHERE the artifact kind is the audio kind, THE Media_Artifact definition SHALL carry the
   consent notice version identifier as an immutable string of 1 to 64 characters and the set
   of granted consent scopes copied by value at artifact creation time, holding no fewer than
   1 and no more than 8 entries each drawn from the closed scope set of Requirement 13
   criterion 5, and SHALL permit no mutation of either after creation, so that consent
   provenance is recorded rather than reconstructed. WHERE the artifact kind is the transcript
   kind, THE Media_Artifact definition SHALL carry a reference to the source audio artifact it
   was derived from and SHALL inherit that artifact's notice version identifier and copied
   consent scope set by reference rather than re-copying either, so that a transcript and its
   source audio cannot drift into disagreement about what was consented to. THE Media_Artifact
   definition SHALL carry, alongside the Consent_Record reference, the consultation identifier
   the referenced grant was bound to whenever that grant holds exactly one consultation
   identifier under Requirement 13 criterion 2, so that the grant's own binding is recorded on
   the artifact; the per-consultation artifact set itself is resolved through the Booking
   partition under Requirement 14 criterion 1.
7. IF the Consent_Record reference supplied to the Media_Artifact construction function is
   unresolvable, meaning absent, malformed against the Consent_Record key shape of
   Requirement 13 criterion 1, resolving to no item, or naming a consultation-bound grant
   without the consultation identifier required by criterion 6, THEN THE Media_Artifact
   construction function SHALL reject construction, SHALL return an error indicating an
   unresolvable consent reference, and SHALL persist no Media_Artifact item. IF the artifact
   kind is the transcript kind and the source audio artifact reference required by criterion 6
   is absent or unresolvable, THEN THE Media_Artifact construction function SHALL reject
   construction on the same terms.
8. THE Media_Artifact definition SHALL carry `entityType`, `schemaVersion`, `ttl`, and
   `legalHold`, consistent with every other item in `app_core`, and SHALL derive `ttl` from
   the retention class carried on the artifact. WHEN `legalHold` is true on a Media_Artifact,
   THE writer SHALL unset the `ttl` attribute on that item, because DynamoDB TTL does not
   evaluate boolean attributes and a pinned artifact carrying a `ttl` would still expire.
9. THE Data_Model_Document SHALL record the Media_Artifact access patterns and key shape
   before the Key_Registry change merges, including the Booking partition key, the sort-key
   composition of criterion 12, the absence of any `gsi1` attribute on a Media_Artifact, and
   the consultation-to-Booking resolution that Requirement 14 criterion 1 relies on.
10. THE Video_Session_Service SHALL write zero Media_Artifact items in every environment
    under this specification, SHALL expose no HTTP route that creates a Media_Artifact, and
    SHALL evidence the zero-write property with an automated test in the standard
    `npm test` suite.
11. THE Media_Artifact definition SHALL represent a storage pointer as an opaque reference
    of no more than 256 characters that contains no bucket name and no object key path, and
    every response and log SHALL omit raw S3 keys. THE storage pointer SHALL address the S3
    object holding the media payload for both artifact kinds: the captured audio for the
    audio kind, and the transcript segment text for the transcript kind under
    Requirement 15 criterion 1, so that the 256-character bound applies to a reference and
    never to content.
12. THE Key_Registry SHALL compose a Media_Artifact sort key from the Media_Artifact key
    prefix, a fixed-width ISO-8601 UTC creation timestamp with millisecond precision, and a
    UUID v4 artifact identifier, so that ascending lexicographic sort-key order equals
    ascending creation order and no two Media_Artifact items in one Booking partition share
    a sort key. THE Key_Registry SHALL expose this composition as a pure key builder
    function verifiable by unit test against zero persisted items.
13. IF a consent-scoped use of a Media_Artifact is attempted while the referenced
    Consent_Record holds revocation state revoked, or while the referenced Consent_Record
    lacks the scope that use requires, THEN THE Media_Layer SHALL deny that use for every
    consent-scoped use, SHALL leave the copied notice version identifier and copied consent
    scope set of criterion 6 unmodified, and SHALL leave deletion of the artifact governed
    only by its retention class and `legalHold`, so that revocation removes permission
    without erasing provenance.
14. THE Key_Registry SHALL define the Media_Artifact prefix so that no `begins_with` query
    on the existing attachment sort-key prefix returns a Media_Artifact and no
    `begins_with` query on the Media_Artifact sort-key prefix returns an attachment item,
    given that the attachment entity partitions under the consultation identifier with a
    sort key of the existing `MEDIA` prefix and one attachment identifier. THE Key_Registry
    SHALL require every prefix helper covered by this requirement to include the `#`
    delimiter in its returned value, so that non-interference is pinned by definition rather
    than left dependent on prefix string values, and SHALL evidence non-interference with an
    automated test in the standard `npm test` suite.
15. THE Media_Artifact definition SHALL hold no media payload and no transcript text in the
    DynamoDB item, and SHALL carry only metadata alongside the storage pointer of criterion
    11, following the `backend/src/lib/cds/audit.ts` precedent of writing the full payload to
    S3 and the metadata plus `s3Key` to DynamoDB. Requirement 15 criteria 1 and 2 state the
    metadata field set for the transcript kind.
16. BECAUSE DynamoDB TTL is measured from artifact creation, THE 365-day
    Training_Eligible_Retention_Class constant of criterion 1 SHALL yield a **rolling
    12-month corpus window** rather than indefinite accumulation: an artifact older than 365
    days expires, so corpus volume plateaus at roughly twelve months of consultations rather
    than growing without bound. WHERE an intent exists to retain a curated training set beyond
    that window, THE Media_Layer SHALL meet that intent with a separate durable-retention
    mechanism carrying its own authorization rather than by relying on this TTL, and SHALL NOT
    overload the `legalHold` attribute for that purpose, because `legalHold` means preservation
    for litigation or investigation and its meaning must stay unambiguous.

### Requirement 13: Consent Record Entity Definition

**User Story:** As counsel, I want consent recorded as a first-class, revocable,
notice-versioned event, so that RA 4200 all-party consent for recording is provable per
actor rather than inferred from a flag.

#### Acceptance Criteria

1. THE Key_Registry SHALL define a Consent_Record entity type, schema version, key prefix,
   TTL constant, and retention class, SHALL expose key builder functions for
   Consent_Record so that no handler inlines a Consent_Record key prefix, SHALL carry
   `entityType`, `schemaVersion`, `ttl`, and `legalHold` consistent with every other item
   in `app_core`, and SHALL set the Consent_Record TTL constant no shorter than the
   longest Media_Artifact TTL constant, so that a Consent_Record outlives every artifact
   that references it. THE Key_Registry SHALL set the Consent_Record TTL constant to
   **5 years**, matching the existing `Ttl.PatientProfile` value of
   `5 * 365 * 24 * 60 * 60`, which the Key_Registry already classifies as identity reference
   data rather than transactional state. A grant must comfortably outlive every artifact that
   references it: an artifact whose Consent_Record has expired is an artifact whose provenance
   can no longer be proven, and an unprovable grant is worse than no artifact. Five years
   clears the 365-day training-eligible constant of Requirement 12 criterion 1 with margin if
   that training retention is later raised. WHEN `legalHold` is true on a Consent_Record, THE writer SHALL unset
   the `ttl` attribute on that item, because DynamoDB TTL does not evaluate boolean
   attributes and a pinned grant carrying a `ttl` would still expire.
2. THE Consent_Record definition SHALL carry exactly one actor identifier holding the
   granting actor's own Cognito subject, one actor role drawn from the existing Cognito
   group vocabulary, a set of granted scopes drawn from the closed scope set of criterion
   5, a consent binding holding either exactly one consultation identifier or the standing
   value, a notice version identifier holding an immutable string of 1 to 64 characters, a
   grant timestamp in UTC with millisecond precision, a revocation state holding exactly
   one of granted or revoked, and a revocation timestamp present when and only when the
   revocation state is revoked.
3. THE Consent_Record definition SHALL represent one grant by one actor, so that
   all-party consent for a consultation is expressed as one Consent_Record per
   participant, SHALL require the actor identifier to equal the Cognito subject of the
   actor who performed the grant so that no actor may grant on behalf of another, and
   SHALL represent a doctor's standing registration-time grant and a patient's
   consultation-bound grant with one identical field set under one schema version,
   differing only in actor role, consent binding, and granted scopes.
4. THE Consent_Record SHALL be a standalone item, and the Booking entity SHALL carry no
   consent boolean. THE Consent_Record definition SHALL permit exactly one state
   transition after creation, from granted to revoked, and SHALL permit no other field
   mutation and no deletion before TTL expiry, so that a revoked grant remains provable
   rather than erased.
5. THE Consent_Record definition SHALL restrict granted scopes to a closed set of exactly
   three values covering recording, transcription, and training-corpus inclusion, and
   SHALL make each scope independently grantable in one Consent_Record and independently
   revocable without altering the revocation state of any other scope.
6. THE Media_Layer SHALL define a recording precondition function that returns exactly one
   of permitted or denied, and returns permitted only when, for both the Owning_Patient
   and the Assigned_Doctor, a Consent_Record exists whose revocation state is granted,
   whose granted scopes include the recording scope, whose consent binding holds the
   addressed consultation identifier, and whose notice version identifier equals the
   current notice version for the recording scope. THE function SHALL treat a
   Consent_Record whose consent binding holds the standing value as not satisfying the
   recording scope for either participant, so that per-communication authorization under
   Philippine Republic Act 4200 is not inferred from a standing registration-time grant.
7. IF the recording precondition function cannot resolve a qualifying Consent_Record for
   either participant, or resolution fails, or resolution does not complete within 2000
   milliseconds, THEN THE Media_Layer SHALL return denied without any partial or
   single-party permit, matching the fail-closed posture of the break-glass audit path,
   and SHALL leave the Video_Session and the Chat_Channel unaffected by the denial.
8. THE Video_Provider_Adapter SHALL reach `startRecording` only through the recording
   precondition function of criterion 6, so that recording is unreachable without
   all-party consent records.
9. THE Data_Model_Document SHALL record the Consent_Record access patterns and key shape
   before the Key_Registry change merges, including the resolution of a consultation-bound
   grant for one actor and one consultation, and the resolution of every grant held by one
   actor.
10. THE Video_Session_Service SHALL write zero Consent_Record items in every environment
    under this specification, SHALL expose no HTTP route that creates or revokes a
    Consent_Record, and SHALL evidence the zero-write property with an automated test in
    the standard `npm test` suite.
11. THE Consent_Record and Media_Artifact definitions SHALL be able to express
    revocation-after-capture without a schema change, so that a later recording phase can
    stop capture on revocation and mark post-revocation audio ineligible against the shape
    settled here. Specifically, the Consent_Record SHALL carry a revocation timestamp with
    millisecond precision under criterion 2, the Media_Artifact SHALL carry a creation
    timestamp with millisecond precision and a duration under Requirement 12 criteria 3 and
    12, and the retention class carried at capture time SHALL remain the sole retention
    authority for audio captured before the revocation timestamp, so that ordering an
    artifact against a revocation instant is decidable from persisted fields alone. THE
    behaviour that acts on that expressible state, including the stop-capture and
    re-evaluation timings, is deferred to the recording specification and recorded in the
    Introduction, because Requirement 22 criteria 2 through 4 forbid building the recording
    path, the queue, and the scheduled job it requires.
12. THE Media_Layer SHALL make no Booking, Video_Session, Join_Credential, Chat_Channel,
    consultation document, or CDS_Pipeline capability conditional on the training-corpus
    scope, and IF the training-corpus scope is absent or revoked for any actor, THEN THE
    Media_Layer SHALL produce behaviour on every other operation that is identical to the
    behaviour produced when that scope is granted, so that care is never contingent on a
    training-corpus grant.
13. THE Consent_Record and Media_Artifact definitions SHALL be able to express notice
    supersession without a schema change, so that a later phase can retire a notice version
    against the shape settled here. Specifically, the notice version identifier SHALL be an
    immutable field on the Consent_Record under criterion 2 and on the Media_Artifact under
    Requirement 12 criterion 6, no field mutation other than the granted-to-revoked
    transition of criterion 4 SHALL be permitted, and the recording precondition function of
    criterion 6 SHALL compare the grant's notice version identifier against the current
    notice version for the scope as an argument rather than against a hardcoded value, so
    that publishing a superseding notice makes a superseded grant fail the precondition
    without touching any stored item and without erasing the superseded identifier that
    existing Media_Artifact items carry as provenance. Runtime detection and propagation of a
    supersession event is deferred to the recording specification.
14. THE consent notice identified by the notice version identifier of criterion 2 SHALL state
    the retention period applied to each granted scope, including the 365-day training-corpus
    retention of Requirement 12 criterion 1. WHEN a stated retention period changes, THE
    Media_Layer SHALL require a superseding notice version, which under criterion 13 causes
    prior grants to fail the recording precondition of criterion 6 until the actor grants again
    under the current notice. THE retention number and the notice version are therefore
    coupled: revising retention later carries a re-consent cost across the existing actor
    population, which is why the value is settled now rather than left open.

### Requirement 14: The Three Key-Shape Queries

**User Story:** As the lead engineer, I want the three queries the media layer will
depend on to be answerable on day one, so that a wrong key shape is caught by a test
today instead of by a migration in month four.

#### Acceptance Criteria

1. THE Media_Layer SHALL serve the per-consultation artifact query by resolving the
   consultation identifier to its Booking identifier and then querying the **table primary
   key** partition formed from the Booking key prefix and that Booking identifier, with a
   sort-key condition on the Media_Artifact sort-key prefix of Requirement 12 criterion 12,
   using no global secondary index. A Booking and a consultation are one-to-one on this
   platform — `POST /v1/bookings/{bookingId}/start` creates the canonical session and
   `getSessionByConsultationId` resolves the reverse direction — so the resolution is a
   lookup rather than a scan. THE Key_Registry SHALL populate no `gsi1` partition value and
   no `gsi1` sort value on a Media_Artifact, and `gsi1` SHALL therefore remain unconsumed by
   Media_Artifact and available to a later access pattern. Serving this query from the
   primary key is also what makes it total: Requirement 7 criterion 1 makes `confirmed` an
   eligible status and no consultation session exists at `confirmed`, so any design that
   depended on a consultation identifier being present at artifact creation time would leave
   every pre-consultation artifact permanently unreachable by this query.
2. THE Key_Registry SHALL populate on every Media_Artifact a sparse `gsi2` partition value
   formed from a **distinct reserved key prefix defined for the patient-scoped media
   artifact set**, followed by the patient identifier, and a sparse `gsi2` sort value formed
   from the Media_Artifact key prefix, the creation timestamp in UTC with millisecond
   precision, and the artifact identifier, so that every Media_Artifact for one patient
   identifier is retrieved by one `gsi2` query using one partition equality condition and one
   sort-prefix condition. THE `gsi2` partition prefix SHALL NOT be the existing `PATIENT#`
   prefix, because patient bookings already write `PATIENT#` partitions on `gsi1`, and one
   prefix vocabulary spanning two indexes for two different entity types is a maintenance
   trap: a reader cannot tell from the key alone which index a `PATIENT#` partition was meant
   for, and a future projection or index change silently widens in scope.
3. THE Key_Registry SHALL populate, on and only on a Media_Artifact carrying the
   Training_Eligible_Retention_Class, a sparse `gsi3` partition value formed from a
   reserved retention-class key prefix, the retention class label, and a hash shard index
   over the fixed shard count of criterion 4, and a sparse `gsi3` sort value whose leading
   segment is the consent notice version identifier,
   followed by the creation timestamp in UTC with millisecond precision and the artifact
   identifier, so that every Media_Artifact carrying the Training_Eligible_Retention_Class
   and one given consent notice version is retrieved by one `gsi3` query **per shard**, each
   using one partition equality condition on the retention-class-and-shard value and one
   sort-prefix condition on the notice version. THE retention class SHALL be the partition dimension and the notice
   version SHALL be the leading sort segment, because every invocation of the corpus query
   fixes the retention class to exactly one label from the closed retention class
   vocabulary while the notice version set grows without bound as notices are superseded;
   this assignment also makes the retention class a single key-condition query per shard, and
   it does not serve one notice version across multiple retention classes in a single query,
   which this specification does not require. THE shard index SHALL be derived by a
   deterministic hash of the artifact identifier reduced modulo the shard count, following the
   audit-outbox shard assignment precedent in `backend/src/lib/dynamo.ts`, and SHALL be
   rendered as a fixed-width zero-padded segment so that shard partition values sort and
   compare uniformly.
4. THE Key_Registry SHALL express the corpus shard count as a named Key_Registry constant
   rather than a literal at any call site, and SHALL set it to the value of the existing
   `CdsLimits.AUDIT_OUTBOX_SHARD_COUNT` shard count of 16, following that precedent rather
   than inventing a second sharding scheme. Sharding is required because an unsharded
   retention-class partition would hold every training-eligible artifact the platform ever
   produces in one index partition, against DynamoDB's 10 GB partition ceiling and with
   `projection_type = ALL` on `gsi3` copying every attribute into it, which is an unbounded
   hot partition by construction.
5. THE corpus query SHALL therefore be a fan-out of one query per shard, with results merged
   by the caller, SHALL be executed only from an administrative batch path and from no
   patient-facing or doctor-facing route, and SHALL be executed with a page size of no more
   than 100 items per page. The fan-out cost is acceptable because the corpus query is never
   on a request path: it serves corpus export and batch training reads, where a
   shard-count-bounded set of queries is unremarkable, and it buys a write path that scales.
   A change to the shard count SHALL be treated as a key-shape change requiring its own
   Data_Model_Document entry, matching the audit-outbox rule that a shard-count change needs
   a revisioned activation record.
6. THE Key_Registry SHALL satisfy criteria 2 and 3 using the existing `gsi2` and `gsi3`
   indexes through sparse attribute population, following the drug reference data precedent
   of ADR-20260630-02, and SHALL add no new global secondary index. A Media_Artifact SHALL
   therefore consume **two of the three index slots** — `gsi2` for the patient scope and
   `gsi3` for the sharded corpus scope — while `gsi1` remains free under criterion 1, because
   the per-consultation query is served from the table primary key. Any additional
   Media_Artifact single-query access pattern proposed later SHALL be recorded as requiring
   either a filtered query, the still-free `gsi1` slot, or a new index, rather than asserted
   to fit an already-assigned slot.
7. THE Key_Registry SHALL expose criteria 2 and 3 as pure key builder functions that take the
   patient identifier, retention class label, shard index, notice version identifier, creation
   timestamp, and artifact identifier as arguments, that read no clock, no environment
   variable, and no persisted item, and that are verifiable by unit test against zero
   persisted items, and SHALL expose the primary-key partition builder of criterion 1 on the
   same terms taking one Booking identifier. IF the notice version identifier contains the `#`
   segment delimiter, or is empty, or exceeds 64 characters, THEN THE `gsi3` key builder
   SHALL reject the construction with an error indicating an invalid notice version rather
   than emitting a sort value whose prefix match can straddle segments. IF the shard index
   falls outside the range zero through the shard count of criterion 4 minus one, THEN THE
   `gsi3` key builder SHALL reject the construction with an error indicating an invalid shard
   index.
8. THE Data_Model_Document SHALL record the three access patterns of criteria 1 through 3
   with, for each, the index name or the primary key, the partition value shape, the sort
   value shape, the key condition used, and the disjointness argument of criterion 9, SHALL
   record the two-of-three slot consumption statement of criterion 6 including the fact that
   `gsi1` is left free, and SHALL record the corpus shard count of criterion 4 and the
   per-shard fan-out of criterion 5, before the Key_Registry change merges.
9. THE Key_Registry SHALL produce a `gsi2` partition prefix under criterion 2 that is
   disjoint from the doctor and therapeutic-class partition prefixes already written to
   `gsi2` and from the `PATIENT#` prefix written to `gsi1`, and a `gsi3` partition prefix
   under criterion 3 that is disjoint from the booking-status, KYC-status, and drug-name
   partition prefixes already written to `gsi3`, so that no existing index reader observes a
   Media_Artifact and no Media_Artifact query observes another entity type. THE Key_Registry
   SHALL write no `gsi1` attribute on a Media_Artifact at all, which discharges `gsi1`
   disjointness by absence rather than by prefix choice. THE `npm test` suite SHALL assert
   each of these disjointness properties.
10. THE `gsi2` key shape of criterion 2 SHALL be able to express complete enumeration of the
    artifact set for one patient identifier without a schema change, so that a later phase can
    run the patient deletion execution path against the shape settled here: the partition
    value SHALL be the reserved prefix of criterion 2 and the patient identifier alone,
    carrying no time segment and no shard segment, and the sort
    value SHALL order artifacts by creation time so that a cursor-followed enumeration is
    total and resumable. THE pagination behaviour of that deletion path, including its page
    size and its incomplete-enumeration failure reporting, is deferred to the recording
    specification and recorded in the Introduction, because Requirement 22 criteria 1 and 4
    forbid the write and deletion paths it would operate on.
11. THE Media_Artifact definition SHALL be able to express corpus de-indexing on
    training-corpus revocation without a schema change, so that a later phase can strip corpus
    membership against the shape settled here: the `gsi3` partition and sort attributes SHALL
    be sparse and independently removable, their removal SHALL leave the retention class value,
    the notice version identifier, the granted scope set copied at creation, and the storage
    pointer unmodified, and no artifact SHALL be deleted by their removal, so that index
    membership alone expresses corpus eligibility and the corpus query of criterion 3 needs no
    consent re-check filter. THE runtime de-indexing behaviour and its timing are deferred to
    the recording specification and recorded in the Introduction, because Requirement 22
    criterion 4 forbids the scheduled job it requires.

### Requirement 15: Transcript Artifact Type and Producer Switch

**User Story:** As the lead engineer, I want the transcript type and its producer switch
defined with only the inert value implemented, so that adding ASR later changes one
environment variable and one adapter.

#### Acceptance Criteria

1. THE Key_Registry SHALL define a Transcript_Artifact as a Media_Artifact kind describing
   diarised, timestamped text segments with a per-segment speaker track identity, and THE
   segment text SHALL be stored as a single S3 object addressed by the Media_Artifact storage
   pointer of Requirement 12 criterion 11, following the `backend/src/lib/cds/audit.ts`
   precedent of writing the full payload to S3 and the metadata plus `s3Key` to DynamoDB.
2. THE Transcript_Artifact DynamoDB item SHALL carry only metadata — the segment count, the
   total duration derived under Requirement 12 criterion 3, the producer provenance, and the
   language tags — and SHALL carry no transcript text, including no inline excerpt, preview,
   first segment, or summary of the text, so that the item and the S3 object cannot drift.
   Keeping the text in S3 keeps the corpus out of the transactional table, keeps PITR and
   backup size flat as the corpus grows, and makes batch training reads and corpus export
   S3-native rather than a table scan.
3. THE Transcript_Artifact definition SHALL omit producer-specific fields, so that a human
   transcriber and an ASR service populate the identical shape.
4. THE Media_Layer SHALL read a `TRANSCRIPT_PRODUCER` environment variable accepting the
   values `none`, `human`, and `asr`.
5. WHERE `TRANSCRIPT_PRODUCER` is `none`, THE Media_Layer SHALL implement no producer,
   SHALL expose no transcript-producing HTTP route, and SHALL create no
   Transcript_Artifact.
6. IF `TRANSCRIPT_PRODUCER` holds `human` or `asr`, THEN THE internal transcript producer
   factory SHALL return a not-implemented outcome with error code
   `TRANSCRIPT_PRODUCER_NOT_IMPLEMENTED` without constructing a producer, and SHALL emit one
   PHI-free structured configuration warning per Lambda container. This is a code-level guard
   on the factory rather than an HTTP response, because criterion 5 establishes that no
   transcript-producing route exists to respond on, so no `503` is reachable and a criterion
   promising one would be untestable.
7. THE Terraform_Configuration SHALL set `TRANSCRIPT_PRODUCER` to `none` in every
   environment defined under this specification.

### Requirement 16: Training-Eligible Retention Class

**User Story:** As the lead engineer, I want a retention class that marks corpus-eligible
artifacts without changing any retention duration, so that the corpus query has a stable
label to filter on and the label change carries no policy risk.

#### Acceptance Criteria

1. THE Key_Registry SHALL define a Training_Eligible_Retention_Class label alongside the
   existing retention class labels.
2. THE Key_Registry SHALL preserve every existing retention duration and TTL constant
   unchanged under this specification, and SHALL set the TTL constant associated with the
   Training_Eligible_Retention_Class to the 365-day training-eligible constant of
   Requirement 12 criterion 1, matching the 1-year magnitude already used by
   `Ttl.SolverContent`, `Ttl.PatientEducation`, `Ttl.DrugData`, and `Ttl.Slot`, so that the
   label carries a decided value rather than an open one. That value remains subject to
   counsel confirmation, and it is coupled to the consent notice under Requirement 13
   criterion 14: changing it requires a superseding notice version and therefore re-consent
   across the existing actor population.
3. THE Media_Artifact definition SHALL carry exactly one retention class value, drawn from
   the Key_Registry retention class labels.
4. THE Training_Eligible_Retention_Class SHALL require a Consent_Record reference whose
   granted scopes include training-corpus inclusion, so that an artifact carrying the
   label is traceable to an explicit grant.
5. IF a Media_Artifact requests the Training_Eligible_Retention_Class with a
   Consent_Record reference whose granted scopes omit training-corpus inclusion, THEN THE
   Media_Artifact construction function SHALL reject the construction rather than
   substituting a different retention class.
6. THE Media_Artifact construction function SHALL require a resolvable Consent_Record
   reference for every retention class, and SHALL require training-corpus scope only for
   the Training_Eligible_Retention_Class.
7. THE Data_Model_Document SHALL record the Training_Eligible_Retention_Class and its
   consent precondition.

### Requirement 17: Falsifiable Transcript-to-CDS Socket

**User Story:** As the CEO, I want proof that the scribe is a swap and not a rebuild, so
that the launch claim about a strong AI foundation is verified rather than asserted.

#### Acceptance Criteria

1. THE Media_Layer SHALL expose an internal transcript ingestion function that accepts a
   Transcript_Artifact and submits its text to the existing CDS_Pipeline
   Subjective/Objective organisation path.
2. WHERE `TRANSCRIPT_PRODUCER` is `none`, THE Media_Layer SHALL keep the transcript
   ingestion function reachable from an automated test and unreachable from any HTTP
   route.
3. THE Media_Layer SHALL include an automated end-to-end test that constructs a fabricated
   Transcript_Artifact from hardcoded text, submits it through the transcript ingestion
   function, and asserts that the CDS_Pipeline produces Subjective and Objective content
   derived from that text.
4. THE test of criterion 3 SHALL assert that Plan, prescription, final ICD, medical
   certificate, lab request, imaging request, and patient education remain locked by the
   Assessment_Gate until a physician confirms an Assessment.
5. THE test of criterion 3 SHALL execute with no ASR service, no recording, and no audio
   input.
6. THE test of criterion 3 SHALL run in the standard `npm test` suite, so that a
   regression in the transcript socket fails the build.
7. THE test of criterion 3 SHALL construct the fabricated Transcript_Artifact in memory,
   and THE Media_Layer SHALL persist no Transcript_Artifact and no Media_Artifact to
   DynamoDB or S3 as a result of that test.
8. THE test of criterion 3 SHALL submit the fabricated Transcript_Artifact to the
   Subjective/Objective organisation path **without** a gate token, because
   Subjective/Objective organisation is not a `ProtectedOutputType` and the assessment-first
   gate of `backend/src/lib/cds/gate-authority.ts` authorizes protected output types only —
   its `authorize()` takes a `ProtectedOutputType` and denies `OUTPUT_TYPE_NOT_ELIGIBLE` when
   the requested type is absent from `eligibleOutputTypes`, and the protected set under
   ADR-20260703-01 is Plan, prescription, final ICD, medical certificate, lab request,
   imaging request, and patient education. THE test SHALL prove the gate independently and
   more cheaply than by signing a token: it SHALL attempt a protected generation for at least
   one protected output type with no confirmed Assessment present and SHALL assert that the
   gate denies it with `CONFIRMED_ASSESSMENT_REQUIRED`, which is what criterion 4 actually
   needs to demonstrate. No KMS signing operation is required by this test, and no change set
   SHALL re-add a gate-token signing step to it.
9. THE fabricated transcript text of criterion 3 SHALL be constructed to pass `deidentify.ts`
   unmodified, and THE test SHALL assert that it does. `deidentify.ts` is a hard pre-inference
   block that a realistic consultation transcript trips on names, contact details, and
   identifiers, so the fabricated text SHALL be authored clinically meaningful but free of the
   patterns that block reaches on, and THE test SHALL neither disable, bypass, nor relax that
   block, consistent with Requirement 22 criterion 5.

### Requirement 18: Provider Credentials and Secrets Handling

**User Story:** As a security reviewer, I want provider credentials handled exactly like
the PayRex credentials already are, so that there is one credential pattern to audit
rather than two.

#### Acceptance Criteria

1. THE Terraform_Configuration SHALL define a Secrets Manager secret for Video_Provider
   credentials named `bayanhealth-{environment}-video-provider-credentials`.
2. THE Terraform_Configuration SHALL create the secret with a placeholder value and SHALL
   ignore subsequent changes to the secret string, matching the PayRex secret pattern.
3. THE Video_Provider_Adapter SHALL read Video_Provider credentials through the
   Secrets_Loader, using its in-process cache and its placeholder detection.
4. IF the Secrets_Loader detects a placeholder credential value, THEN THE
   Video_Provider_Adapter SHALL report the media path as unavailable and SHALL emit one
   PHI-free structured configuration warning per Lambda container.
5. THE Video_Provider_Adapter SHALL omit credential values from every log statement and
   every error message.
6. IF the Video_Provider rejects the supplied credential during a provider call, THEN THE
   Video_Provider_Adapter SHALL report the media path as unavailable, so that an
   undetected placeholder or a rotated credential degrades to chat rather than surfacing a
   provider error.
7. THE Video_Session_Service SHALL grant the browser no direct Video_Provider control
   capability beyond the participant-scoped Join_Credential.
8. THE Terraform_Configuration SHALL grant read access to the Video_Provider credentials
   secret of criterion 1 to the **single** `bookings` handler execution role, which under
   Requirement 21 criterion 10 serves both the three `video-session` operations and the
   lifecycle operations whose synchronous cleanup Requirement 5 criterion 13 defines. Placing
   the `video-session` routes in the same handler as the lifecycle operations removes the
   second grant entirely: the provider credential is readable from one execution role rather
   than two, so there is no blast-radius trade to accept.
9. THE Video_Provider's media transport and any provider-side storage SHALL be recorded as
   sitting **outside** the `ap-southeast-1` boundary that
   [ADR-20260514-01](../../../architecture/DECISIONS.md) pins for BayanHealth-held data, and
   the cross-border transfer position, the provider's sub-processor list, and the provider's
   deletion guarantee SHALL be confirmed in writing before the Video_Provider carries a real
   patient consultation. This is an obligation under the Philippine Data Privacy Act of 2012
   and not a HIPAA one.

### Requirement 19: Infrastructure and Environment Scope

**User Story:** As the lead engineer, I want the video infrastructure defined and enabled
for all three environments while only the `dev` apply is authorized here, so that a core
production feature is not configured out of production and definition is still never
mistaken for qualification.

#### Acceptance Criteria

1. THE Terraform_Configuration SHALL define every long-lived resource introduced by this
   specification, including the credentials secret and the Lambda environment variables.
2. THE Terraform_Configuration SHALL place every resource introduced by this specification
   in the `ap-southeast-1` region.
3. THE `dev` apply of the Terraform_Configuration SHALL be in scope for this specification.
   THE `staging` and `prod` applies SHALL be deferred operational work, each requiring its
   own current, unused, operation-specific point-of-action authorization at promotion time,
   and this specification SHALL authorize neither. Defining infrastructure is not applying
   it, and applying to `dev` is not staging qualification.
4. THE Terraform_Configuration SHALL set `VIDEO_PROVIDER` to `daily` in `dev`, `staging`,
   and `prod`, because live video is a core feature of the production web application: a
   `none` value in `staging` or `prod` would combine with Requirement 2 criterion 2 and
   Requirement 20 criterion 5 to render every production consultation chat-only, which is not
   the product this specification is describing.
5. THE Terraform_Configuration SHALL register every `video-session` route in the Terraform
   route inventory in the same change set that adds the Contract operations, so that the
   Terraform-route to OpenAPI parity check passes.
6. THE Video_Session_Service SHALL be packaged as a Lambda bundle by the existing
   `package:lambdas` build pass.
7. THE staging qualification of the `video-session` routes SHALL be recorded as a **launch
   dependency tracked outside this specification**, not an optional follow-up, because live
   video is a launch-blocking core feature under criterion 4. Requirement 22 criterion 7 keeps
   the qualification activity itself out of scope here; this criterion records that launch
   does not happen without it. THE launch dependency of this criterion SHALL include the
   credential population of criterion 8 alongside staging qualification.
8. THE Video_Provider credential SHALL be populated in an environment's Secrets Manager
   secret **before** the `video-session` routes are treated as enabled in that environment,
   and a placeholder credential in `staging` or `prod` SHALL be treated as a launch blocker
   rather than a degraded-but-acceptable state, because live video is a core production
   feature under criterion 4. Criterion 4 sets `VIDEO_PROVIDER` to `daily` while
   Requirement 18 criterion 2 creates the secret with a placeholder and Requirement 18
   criterion 4 correctly degrades a placeholder to unavailable, so a first apply that is not
   followed by credential population yields an environment where every consultation is
   chat-only until someone sets the secret by CLI — the trap PayRex currently sits in.
9. THE Video_Session_Service SHALL perform a startup configuration validation that reports
   the Video_Provider credential state for the running environment, following the existing
   `validatePayRexConfiguration` pattern in `backend/src/lib/secrets.ts`, and SHALL emit one
   PHI-free structured record per Lambda container naming the environment and whether the
   credential is populated or a placeholder, so that a placeholder is visible in logs at cold
   start rather than discovered by a patient. THE validation SHALL disclose no credential
   value, consistent with Requirement 18 criterion 5.

### Requirement 20: Frontend Seam and Deliberate Media Start

**User Story:** As a patient on Philippine mobile data, I want the consultation to start
audio-only with the camera under my control, so that the call connects reliably and costs
me less.

#### Acceptance Criteria

1. THE Consultation_Video_Component SHALL be the only frontend module that references
   Video_Provider specifics, so that a provider swap is contained to a single file.
2. THE Consultation_Video_Component SHALL join a provider room with both the local camera
   and local microphone inactive, so neither participant transmits media before an explicit
   point-of-action control.
3. WHEN a participant activates the camera control, THE Consultation_Video_Component SHALL
   enable the local camera track without changing the local microphone state.
4. WHEN a participant deactivates the camera control, THE Consultation_Video_Component
   SHALL disable the local camera track without interrupting the audio track.
5. IF a `video-session` request returns `VIDEO_PROVIDER_UNAVAILABLE` or `VIDEO_DISABLED`,
   THEN THE Consultation_Video_Component SHALL render a chat-only state that directs the
   participant to the Chat_Channel.
6. THE Consultation_Video_Component SHALL request a Join_Credential only while the Booking
   status is `confirmed` or `in_progress`.
7. THE Consultation_Video_Component SHALL source chat, presence, and typing from the
   Chat_Channel, and SHALL use the Video_Provider for media transport only.
8. THE Consultation_Video_Component SHALL expose the camera and microphone controls with
   accessible names and keyboard operability.
9. WHEN a Join_Credential reaches the end of the 30-minute lifetime of Requirement 8
   criterion 6 while the Booking remains eligible, THE Consultation_Video_Component SHALL
   obtain a new credential by issuing `POST /v1/bookings/{bookingId}/video-session` rather
   than attempting to refresh or extend the expired value, and SHALL keep the existing media
   session running while it does so where the Video_Provider permits.
10. THE Consultation_Video_Component SHALL use `GET /v1/bookings/{bookingId}/video-session`
    for room state only, and SHALL treat a `404` from that operation as "no room yet" rather
    than as an error state, because that operation creates nothing under Requirement 4.
11. THE Consultation_Video_Component SHALL present a participant-facing notice that a
    third-party provider carries the video and audio of the consultation, to both the
    Owning_Patient and the Assigned_Doctor, before the first join, and SHALL expose that
    notice with an accessible name and keyboard operability on the same terms as criterion 8.
    THE notice SHALL be disclosure of the transport arrangement recorded in Requirement 18
    criterion 9 and SHALL NOT be represented as, or collected as, a Consent_Record, which
    Requirement 22 criterion 1 forbids this specification from writing.
12. IF a `POST /v1/bookings/{bookingId}/video-session` request returns `429` with error code
    `VIDEO_CREDENTIAL_MINT_LIMIT` WHILE a media session is already connected, THEN THE
    Consultation_Video_Component SHALL keep that session running and SHALL NOT tear down the
    call, because the Join_Credential already held remains valid until its own expiry under
    Requirement 8 criterion 6 and a mint ceiling says nothing about the credential in hand.
13. THE Consultation_Video_Component SHALL surface a `429 VIDEO_CREDENTIAL_MINT_LIMIT` as a
    **non-blocking notice** rather than as an error state, SHALL honour the `Retry-After`
    header of Requirement 9 criterion 11 in the interval it presents, and SHALL issue no
    retry of `POST /v1/bookings/{bookingId}/video-session` earlier than that interval.
14. IF a `POST /v1/bookings/{bookingId}/video-session` request returns `429` with error code
    `VIDEO_CREDENTIAL_MINT_LIMIT` WHILE no media session is connected, THEN THE
    Consultation_Video_Component SHALL render the chat-available state of criterion 5 and
    SHALL direct the participant to the Chat_Channel, because the Chat_Channel is unaffected
    by the mint ceiling and a participant who cannot mint must still be able to consult.

### Requirement 21: Platform Convention Compliance

**User Story:** As the lead engineer, I want this feature to be indistinguishable from the
rest of the platform in its contract, envelope, idempotency, and key discipline, so that
it carries no special-case knowledge.

#### Acceptance Criteria

1. THE Contract SHALL define the three `video-session` operations as OpenAPI 3.1
   operations under the `/v1/` prefix in the same change set that dispatches them.
2. THE Video_Session_Service SHALL verify that no operation already exists for each
   `video-session` path before the Contract addition merges.
3. THE Video_Session_Service SHALL return success responses in the
   `{ data, meta: { requestId, timestamp } }` envelope.
4. THE Video_Session_Service SHALL return error responses in the
   `{ error: { code, message, requestId, retryable } }` envelope with a
   SCREAMING_SNAKE_CASE code.
5. IF a write operation carries a repeated `Idempotency-Key` with a different request
   payload, THEN THE Video_Session_Service SHALL respond `409` with error code
   `IDEMPOTENCY_CONFLICT`.
6. WHEN a write operation carries a repeated `Idempotency-Key` with an identical request
   payload, THE Video_Session_Service SHALL return the stored response for the original
   request, with the Join_Credential handled under criterion 8 rather than replayed.
7. IF a write operation omits the `Idempotency-Key` header or carries a value that is not
   a UUID v4, THEN THE Video_Session_Service SHALL respond `400` with error code
   `INVALID_PAYLOAD` and a `fields` entry naming `Idempotency-Key`.
8. THE `Idempotency-Key` on `POST /v1/bookings/{bookingId}/video-session` SHALL cover **room
   creation only**. THE Join_Credential SHALL be minted freshly on every request under
   Requirement 3 criterion 12 and SHALL never be replayed from the idempotency record, so a
   replayed request re-mints rather than returning a stale or already-expired token. THE
   Video_Session_Service SHALL therefore redact the Join_Credential from the response body
   stored in the idempotency record, leaving the persisted replay copy free of any credential
   value, and SHALL merge a freshly minted credential into the replayed response before
   returning it.
9. THE Video_Session_Service SHALL omit protected health information, raw S3 keys, and
   credential values from every log statement and every error message.
10. THE Video_Session_Service SHALL dispatch the three `video-session` routes from the
    **existing `bookings` handler** through that handler's existing `event.routeKey` switch,
    and SHALL introduce no new Lambda handler for them. The routes are booking
    sub-resources addressed under `/v1/bookings/{bookingId}`, their authorization is entirely
    Booking ownership and assignment which the `bookings` handler already evaluates, and the
    closest existing precedent is `POST /v1/bookings/{bookingId}/start`, which creates
    canonical consultation session state from within `bookings.ts`. A separate handler would
    duplicate the Booking read and the participant-relation check that Requirement 6
    criterion 5 fixes, and would need its own copy of the credential and metric grants that
    Requirement 18 criterion 8 and Requirement 24 criterion 14 now hold once.
11. THE Video_Session_Service SHALL persist every item it writes with `entityType`,
    `schemaVersion`, and `legalHold`, and with `ttl` **except where Requirement 11
    criterion 13 requires `ttl` to be unset because `legalHold` is true**, using key builders
    from the Key_Registry. The exception is stated here so that this criterion and
    Requirement 11 criterion 13 read consistently rather than appearing to demand both a
    populated `ttl` and an unset `ttl` on a pinned item.
12. THE accepted cost of criterion 10 SHALL be recorded: the `bookings` Lambda bundle grows,
    and `bookings` is on the hot path for every booking read, so a fault in the
    `video-session` code shares a container with booking reads. That cost is accepted because
    the Video_Provider_Adapter uses the runtime `fetch` API and adds no SDK dependency under
    Requirement 23 criterion 4, every provider call is routed through the Circuit_Breaker
    under Requirement 1 criterion 8 and bounded by the `VIDEO_CLEANUP_TIMEOUT_MS` constant of
    Requirement 5 criterion 14, and Requirement 2 already forbids a video failure from
    blocking or failing a booking operation.

### Requirement 22: Scope Containment

**User Story:** As the lead engineer, I want the out-of-scope boundary enforced by the
code rather than by intent, so that a definition-only entity cannot quietly acquire a
write path.

#### Acceptance Criteria

1. THE Media_Layer SHALL expose no HTTP operation that creates, updates, or deletes a
   Media_Artifact, a Consent_Record, or a Transcript_Artifact under this specification.
2. THE Media_Layer SHALL request no recording operation from the Video_Provider_Adapter
   under this specification.
3. THE Video_Provider_Adapter SHALL leave `startRecording` and `stopRecording` unimplemented
   under this specification, and no Media_Layer code path SHALL invoke either function.
4. THE Media_Layer SHALL introduce no queue, no Step Functions state machine, and no
   scheduled job under this specification.
5. THE Media_Layer SHALL introduce no de-identification transformer for transcripts under
   this specification, and the existing `deidentify.ts` behaviour SHALL remain unchanged.
6. THE Media_Layer SHALL introduce no corpus curation or export path under this
   specification.
7. THE Media_Layer SHALL introduce no staging qualification, restore execution, canary
   authorization, or production enablement activity under this specification.
8. THE Media_Layer SHALL retain the Chat_Channel unchanged, and SHALL adopt no
   Video_Provider chat, presence, or typing feature.
9. THE Media_Layer SHALL introduce no live or in-consult AI assistance surface under this
   specification.
10. THE Media_Layer SHALL reference Google Meet in no configuration value, no dependency,
    and no provider implementation.
11. THE Media_Layer SHALL carry only the shape obligations of Requirement 13 criteria 11 and
    13 and Requirement 14 criteria 10 and 11 for the four runtime behaviours deferred to the
    recording specification, and SHALL implement none of those behaviours, because criteria 1
    through 4 of this requirement forbid the recording path, the queue, the state machine, and
    the scheduled job each one needs. The deferred behaviours and their timings are recorded in
    the Introduction so the handover carries them.

### Requirement 23: Surfaces Deliberately Left Unchanged

**User Story:** As the lead engineer, I want the already-correct browser and dependency
surfaces recorded as out of bounds, so that a well-meaning change set does not modify a
header or add a package that this feature does not need.

#### Acceptance Criteria

1. ~~THE Frontend_Configuration SHALL retain `Permissions-Policy: camera=(self), microphone=(self)`
   unchanged, because the existing value already permits same-origin camera and microphone
   use by the embedded provider surface.~~ **Superseded, then restored.** This criterion
   assumed the embedded provider surface was same-origin. It was not while
   Consultation_Video_Component used Daily's Prebuilt iframe (`Daily.createFrame` against
   `https://<account>.daily.co`), which `(self)` alone excludes — discovered during dev
   end-to-end testing, and briefly fixed by widening this header to also grant
   `https://*.daily.co` and `https://*.dailywebrtc.com`. Criterion 5 below records why
   Prebuilt was replaced with Call Object mode; once the component embeds no iframe at all,
   `getUserMedia` is called from this same-origin document directly, and the original
   `camera=(self), microphone=(self)` claim holds again. THE Frontend_Configuration SHALL
   therefore retain `Permissions-Policy: camera=(self), microphone=(self)` in both
   `next.config.ts` and `src/proxy.ts`, which SHALL be kept identical to each other.
2. THE Frontend_Configuration SHALL retain `X-Frame-Options: DENY` unchanged, because that
   header governs other origins framing BayanHealth rather than BayanHealth embedding a
   provider.
3. ~~THE Frontend_Configuration SHALL introduce no Content-Security-Policy header under this
   specification.~~ **Superseded, then narrowed.** This criterion assumed the frontend
   introduced no CSP header at all; `src/proxy.ts` already sets a strict one. While
   Consultation_Video_Component used Daily's Prebuilt iframe, the CSP's absent `frame-src`
   made the browser fall back to `default-src 'self'` and block that iframe outright, fixed
   at the time by adding a `frame-src` scoped to the two Daily origins. Criterion 5 below
   records why Prebuilt was replaced with Call Object mode, which embeds no iframe, so
   `frame-src` is no longer needed; what Call Object mode's WebRTC signalling and REST
   calls do need is a `connect-src` allowance for the same two Daily origins (plus
   `dailywebrtc.net`, confirmed from the installed SDK bundle) in both `https:` and `wss:`
   form, since that traffic now originates from this document directly. THE
   Frontend_Configuration SHALL add that `connect-src` allowance to `src/proxy.ts` and
   SHALL introduce no `frame-src` directive and no other CSP directive change under this
   specification.
4. THE Video_Provider_Adapter SHALL communicate with the Video_Provider using the runtime
   `fetch` API, and the backend `package.json` SHALL gain no dependency under this
   specification.
5. ~~THE Consultation_Video_Component SHALL be implemented with the Video_Provider hosted
   prebuilt call surface, and any frontend dependency it requires SHALL be pinned to an
   exact version.~~ **Superseded.** Building the hosted Prebuilt surface (`Daily.createFrame`)
   while also layering a custom connecting overlay and custom camera/mic controls on top of
   it produced four consecutive live bugs, each traced to one root cause: that combination
   is a hybrid of Daily's two integration modes, and every one of Prebuilt's un-set UI
   defaults (CSP framing, Permissions-Policy, its own prejoin lobby, its own
   chat/screenshare/knocking surfaces) kept surfacing as a bug instead of being decided
   once. THE Consultation_Video_Component SHALL instead be implemented with Daily's **Call
   Object** mode (`Daily.createCallObject`), which renders no Daily-owned UI at all — this
   component owns 100% of the rendered surface, which is also already the shape of the
   fully custom video UI this product intends to build long-term, so no second migration
   is anticipated. Any frontend dependency it requires SHALL still be pinned to an exact
   version.
6. WHERE this specification introduces a new Lambda handler, THE Terraform_Configuration
   and the `scripts/package-lambdas.mjs` handler inventory SHALL both list that handler in
   the same change set that adds the handler file. THIS specification introduces **no new
   Lambda handler**, because Requirement 21 criterion 10 dispatches the three
   `video-session` routes from the existing `bookings` handler, so the condition is satisfied
   by the existing `bookings` entry in both inventories and no change to
   `scripts/package-lambdas.mjs` is required.
7. THE Media_Layer SHALL use the existing `jose`, AWS SDK, and `fast-check` dependencies
   rather than adding an equivalent package.
8. THE Video_Session_Service SHALL retain the `VIDEO_DISABLED` branch of Requirement 2
   criterion 2, and no change set SHALL remove it as dead code. It is unreachable by
   configuration now that Requirement 19 criterion 4 sets `VIDEO_PROVIDER` to `daily` in all
   three environments, but it remains reachable through the unrecognised-value path of
   Requirement 1 criterion 6, and it is a deliberate safety default rather than an oversight.
9. THE Video_Session_Service SHALL retain the eligibility check of Requirement 7 criterion 3
   on `GET /v1/bookings/{bookingId}/video-session`, and no change set SHALL relax it for read
   operations. The consequence is that once a Booking reaches `completed` no participant can
   read whether a room existed; this is intentional concealment consistency, and this
   specification defines no post-hoc read path for a concluded consultation.

### Requirement 24: Provider Metrics and Alarms

**User Story:** As the lead engineer, I want the video provider observed the same way the
payment provider already is, so that "handled exactly like PayRex" covers the half that
tells us when the provider is failing, not only the half that keeps its credential safe.

#### Acceptance Criteria

1. THE Video_Provider_Adapter SHALL emit one CloudWatch custom metric per provider operation
   — `createRoom`, `mintJoinCredential`, and `endRoom` — recording the outcome and the
   observed latency for each call, following the PayRex custom-metric pattern recorded in
   ADR-20260618-01.
2. THE Video_Provider_Adapter SHALL publish those metrics under a per-environment namespace
   of the form `BayanHealth/Video/{environment}`, chosen deliberately as the
   environment-scoped form rather than as a match to an existing convention, because no
   single existing convention exists — see criterion 11.
3. THE Video_Provider_Adapter SHALL omit protected health information, Join_Credential
   values, provider secrets, booking identifiers, and actor identifiers from every metric
   name and every metric dimension, so that observability adds no disclosure surface.
4. THE Terraform_Configuration SHALL define a CloudWatch alarm on provider success rate
   below 95 percent and a CloudWatch alarm on p95 provider latency above 5000 milliseconds,
   matching the PayRex alarm thresholds, following the alarm pattern already established in
   `infra/modules/http_api/monitoring.tf`.
5. THE Terraform_Configuration SHALL define a CloudWatch alarm on Circuit_Breaker transitions
   to open for the Video_Provider, so that degradation to chat under Requirement 2 is
   observable rather than inferred from a support ticket.
6. THE Terraform_Configuration SHALL define a **video-specific** CloudWatch dashboard
   resource for the Video_Provider metrics rather than adding them to the existing
   `aws_cloudwatch_dashboard.payrex_payment_health` dashboard in
   `infra/modules/http_api/monitoring.tf`, because that dashboard is PayRex-specific and is
   created only where PayRex is enabled to avoid per-dashboard billing — which is currently
   every environment, so video metrics added to it would have no dashboard to appear on.
7. THE Terraform_Configuration SHALL set `treat_missing_data` on every alarm introduced by
   this requirement so that an idle environment does not hold an alarm in `ALARM`, because
   `breaching` against an intentionally idle `dev` environment is a known source of permanently
   red alarms on this platform: five CDS alarms currently sit permanently in `ALARM` from
   `treat_missing_data = "breaching"` against an intentionally idle environment, which trains
   an operator to ignore the alarm channel.
8. THE Terraform_Configuration SHALL grant the Video_Session_Service Lambda role only
   `cloudwatch:PutMetricData` scoped by a `cloudwatch:namespace` condition to the namespace of
   criterion 2, matching the scoping already applied to the PayRex namespaces.
9. THE Terraform_Configuration SHALL define the alarms of criteria 4 and 5 for all three
   environments, and definition SHALL confer no qualification claim under Requirement 19
   criterion 3.
10. THE Video_Provider_Adapter SHALL emit these metrics through the existing AWS SDK already
    bundled by the backend, and the backend `package.json` SHALL gain no dependency for
    metrics emission, consistent with Requirement 23 criterion 4.
11. THE Terraform_Configuration SHALL NOT propagate the existing namespace inconsistency into
    the video metrics. The existing PayRex observability uses **three** namespace values —
    `PayRex` for most metrics and most alarms, `PayRex/Audit` for the log metric filters, and
    `BayanHealth/PayRex/${var.environment}` for exactly one alarm covering webhook failures —
    so there is no single existing convention for criterion 2 to match. Normalising the PayRex
    namespaces SHALL be recorded as separate follow-up work outside this specification.
12. THE Terraform_Configuration SHALL name every alarm introduced by this requirement with a
    video-specific prefix of the form `{project}-{environment}-video`, rather than reusing the
    existing `local.alarm_prefix` of `${var.project_name}-${var.environment}-payrex`, which is
    PayRex-specific.
13. THE Terraform_Configuration SHALL gate the alarms of criteria 4 and 5 and the dashboard of
    criterion 6 on video being enabled **and** on an alarm notification target being
    configured, and SHALL NOT inherit the existing `local.monitoring_enabled` condition of
    `var.sns_alarm_topic_arn != ""` as it is applied to the PayRex resources, so that video
    observability does not depend on PayRex being turned on.
14. THE Terraform_Configuration SHALL grant `cloudwatch:PutMetricData`, scoped by the
    `cloudwatch:namespace` condition of criterion 8, to the **single** `bookings` handler
    execution role, because Requirement 21 criterion 10 dispatches the `video-session`
    operations from the same handler that performs the synchronous cleanup of Requirement 5
    criterion 13, so one role issues every provider call that criterion 1 requires a metric
    datum for. Placing the routes in that handler removes the second grant entirely: one role,
    not two.

### Requirement 25: Media Object Storage Decisions

**User Story:** As the lead engineer, I want the object-store decisions settled at the same
time as the key shape, so that the recording phase inherits them rather than relitigating
them under delivery pressure.

#### Acceptance Criteria

1. THE media objects addressed by the Media_Artifact storage pointer of Requirement 12
   criterion 11 and by the Transcript_Artifact payload of Requirement 15 criterion 1 SHALL be
   stored in a **dedicated S3 bucket** for the Media_Layer, separate from the existing
   `ai_raw_logs` and `media_private` buckets, so that the corpus carries its own KMS key, its
   own lifecycle configuration, and its own access boundary rather than inheriting three sets
   of rules written for other payloads.
2. THE dedicated bucket of criterion 1 SHALL use a **dedicated KMS key**, so that corpus
   access is separately auditable in CloudTrail and the key is rotatable or revocable without
   touching clinical media or AI logs.
3. THE object lifecycle expiration for each media object SHALL be **derived from the
   retention class carried on the referencing Media_Artifact** rather than configured
   independently of it, with the retention values of Requirement 12 criterion 1 as the single
   source of truth. Two numbers that must agree but live in different files will drift, and a
   DynamoDB item outliving its S3 object — or the reverse — yields either an artifact whose
   metadata cannot be resolved to content or content that no index can reach.
4. THE drift hazard criterion 3 closes SHALL be recorded concretely: the existing
   `media_private` bucket carries lifecycle rules for the `payment-proofs/` and `media/`
   prefixes only, and `media_expiration_days` is 365 in the module default but 90 in `dev`, so
   an artifact placed under `media/` would lose its audio at 90 days in `dev` while its
   metadata survived the 365-day training-eligible retention of Requirement 12 criterion 1,
   and an artifact placed under a new prefix would match no rule and never expire at all.
5. THE retention applied to media objects and to Media_Artifact items SHALL be **identical
   across `dev`, `staging`, and `prod`**, and `dev` SHALL NOT carry a shortened media
   retention. `dev` is a test environment and `staging` mimics production, so a
   per-environment retention split guarantees the environments disagree about what exists and
   makes a `dev` reproduction of a `staging` retention defect impossible.
6. THE dedicated bucket of criterion 1 SHALL enable **versioning** and SHALL rely on
   versioning together with least-privilege IAM for durability, and SHALL **NOT** enable S3
   Object Lock, unlike the existing `ai_raw_logs` and `media_private` buckets. Object Lock
   would make Data Privacy Act erasure impossible to honour, and the corpus is the one store
   most likely to receive an erasure request.
7. THE write path SHALL be the only principal granted `s3:PutObject` on the dedicated bucket,
   and a **separate curation role** SHALL be the only principal granted read access. No
   consultation-serving Lambda execution role SHALL be granted read access to that bucket, so
   that a compromised request handler cannot exfiltrate the corpus.
8. THE dedicated bucket of criterion 1 SHALL block public access on all four settings and
   SHALL enforce server-side encryption, matching the existing bucket pattern in
   `infra/modules/data_stores/main.tf`.
9. THE object key layout SHALL contain no patient name, no doctor name, and no protected
   health information, consistent with Requirement 8 criterion 10 for the provider room
   identifier, because object keys appear in S3 access logs and in operator tooling.
10. THIS specification SHALL define the decisions of criteria 1 through 9 and SHALL provision
    **no bucket, no KMS key, and no lifecycle rule**, because no code path in this
    specification writes a media object; provisioning belongs to the recording specification,
    which is the first phase that writes one. THE Data_Model_Document or an equivalent
    architecture record SHALL carry these decisions so that the recording phase inherits them
    rather than deciding them again.

## Appendix A — Correctness Properties for Property-Based Testing

Non-normative. This appendix records the properties the design phase is expected to
formalise as `fast-check` properties, with the acceptance criteria each one falsifies.
Listed here because several of these properties are the reason the corresponding criteria
are phrased as universals.

Per the launch scope recorded in the Introduction, four of these properties land in the
launch change set — A.1, A.2, A.3, and A.8 — and the remainder are fast-follow. The split is
a test-depth deferral only: every criterion they falsify is still in launch scope and still
covered by example-based tests.

### A.1 Credential non-disclosure across every negative path

For all combinations of `{requester role} × {ownership relation} × {booking status} ×
{provider availability} × {operation}` that do not satisfy "Requester is Owning_Patient or
Assigned_Doctor **and** status is `confirmed` or `in_progress` **and** provider available",
the serialised response contains no substring of the Join_Credential and no substring of
any Video_Provider secret. Separately, for all generated booking, patient-name, and
doctor-name inputs, the resolved provider room identifier contains no substring of any of
them and no booking-derived clinical value. Falsifies R8.1–R8.5, R8.10, R7.2.

### A.2 Concealment indistinguishability

For all Requesters lacking a participant relation, the response to an existing booking
identifier and the response to a well-formed non-existent booking identifier are equal
after `requestId` is elided — same status, same code, same message. Falsifies R6.2–R6.4.

### A.3 Idempotent room creation under concurrency, and read purity

For all interleavings of a bounded set of concurrent `POST` `video-session` calls on one
booking by the Owning_Patient and the Assigned_Doctor, exactly one Video_Session record
exists afterwards and every successful response carries the same provider room identifier.
For all pairs of distinct bookings, the resolved provider room identifiers differ, and no
interleaving leaves a provider room without a Video_Session record. Separately, for all
sequences of `GET` `video-session` calls interleaved anywhere in that set, no `GET` creates
a Video_Session record, requests a provider room, or mints a credential, and the
`app_core` and provider state observed before and after any `GET`-only subsequence are
equal. For all interleavings that include a `video-session/end` followed by a bounded set of
concurrent `POST` calls, exactly one new provider room is created by the re-open, the
Video_Session count remains one, the lifecycle state afterwards is active, the ended
timestamp is absent, and the superseded provider room identifier appears in exactly one
`video_session_reopened` audit event. Falsifies R3.5–R3.7, R3.9, R3.10, R3.11, R3.13–R3.16,
R4.3–R4.5.

### A.4 Eligibility-window invariant

For all booking statuses, `credential_disclosed ⇒ status ∈ {confirmed, in_progress}`, and
for all status transition sequences, disclosure occurring at a step implies the status at
that step is eligible. Falsifies R7.1–R7.3.

### A.4b Error precedence totality

For all combinations of `{token valid | invalid | absent} × {participant | non-participant}
× {operation} × {booking status} × {mint count} × {provider availability}`, the responded
status code equals the code of the first failing stage in the fixed order — `401`, then
`404`, then `403`, then `409`, then `429`, then `503` — and no combination produces a later
stage's code while an earlier stage is failing. Additionally, for all interleavings of
concurrent `POST` calls by one actor on one booking, the number of successful mints never
exceeds the ceiling within a rolling window, because the ceiling is evaluated and incremented
in the same conditional write that records the mint. For all `429` responses, a `Retry-After`
header is present and names a whole number of seconds no greater than the rolling window
length. Falsifies R6.5, R6.6, R2.1, R2.2, R7.2, R9.6, R9.11, R11.11.

### A.5 Log and error redaction

For all provider error shapes, including provider payloads that embed a credential, the
emitted log records and the returned error envelope contain no credential substring, no
raw S3 key, and no patient-identifying field. Falsifies R8.3, R8.4, R18.5, R21.9.

### A.5b Persisted idempotency copy holds no credential, and replays re-mint

For all successful `POST` `video-session` responses, the body written to the idempotency
record contains no Join_Credential substring while the body returned to the first caller
does. For all replayed `POST` requests sharing an `Idempotency-Key` with an identical
payload, the returned Join_Credential is freshly minted — it differs from the credential
returned to the first caller, or where the provider mints deterministically its expiry is
later — so no replay can return an already-expired token. Falsifies R21.6, R21.8, R3.12.

### A.6 Key builder round-trip, shard coverage, and disjointness

For all booking identifiers, patient identifiers, artifact identifiers, retention classes,
and notice versions, the Media_Artifact key builders produce keys that (a) round-trip
through their parser to the original components, (b) are answerable by the three queries of
R14.1–R14.3 — the per-consultation query against the Booking primary-key partition, the
patient query on `gsi2`, and the per-shard corpus query on `gsi3` — (c) collide with no
existing key prefix in the Key_Registry, including the existing `MEDIA#` attachment prefix
and the `PATIENT#` prefix already written to `gsi1`, and (d) populate no `gsi1` attribute at
all. For all sets of artifact identifiers, every derived shard index lies within
`0..shardCount-1`, and the union of the per-shard corpus queries returns exactly the
training-eligible set with no duplicate and no omission. Falsifies R12.1, R12.2, R14.1–R14.9.

### A.6b Video_Session single-item invariant

For all sequences of `POST` `video-session` and `video-session/end` calls on one booking,
including sequences that end and re-open the room any number of times, exactly one
Video_Session item exists in the Booking partition under the fixed sort key of R11.2, it
carries `entityType`, `schemaVersion`, and `legalHold`, it carries `ttl` when and only when
`legalHold` is false, it holds no credential substring anywhere including its
mint-accounting structure, its mint-accounting structure holds no more than two actor
entries, its ended timestamp is present when and only when its lifecycle state is ended, and
it carries no `gsi1`, `gsi2`, or `gsi3` attribute. Falsifies R3.15, R11.2, R11.3, R11.5,
R11.6–R11.8, R11.10, R11.12, R11.13, R21.11.

### A.7 Idempotency-key handling

For all pairs of requests sharing an `Idempotency-Key`, identical payloads yield identical
stored responses apart from the freshly minted credential of A.5b, and differing payloads
yield `IDEMPOTENCY_CONFLICT`. Falsifies R21.5–R21.7.

### A.8 Degradation totality

For all provider failure modes — timeout, non-2xx, malformed body, open breaker,
placeholder credential, `VIDEO_PROVIDER = none` — the response is a `503` with
`VIDEO_PROVIDER_UNAVAILABLE` or `VIDEO_DISABLED`, the Chat_Channel remains available, and
`POST /v1/bookings/{bookingId}/start` still succeeds. Falsifies R2.1–R2.4, R18.4.

### A.9 Consent scope separability

For all subsets of grantable consent scopes, a Consent_Record carrying that subset denies
every scope outside it, and no Media_Artifact may carry the
Training_Eligible_Retention_Class without a referenced Consent_Record granting
training-corpus inclusion. Falsifies R13.5, R16.4–R16.6.

### A.10 Media artifact unconstructible without resolvable consent

For all generated Media_Artifact field combinations, construction succeeds only when the
Consent_Record reference resolves, the copied notice version is present, and the artifact
kind is an audio or transcript kind. Every absent, malformed, or unresolvable consent
reference is rejected, no recorded-video kind is constructible, and a transcript-kind
artifact is constructible only with a resolvable source audio artifact reference from which
it inherits notice version and consent scopes rather than re-copying them. Falsifies R12.3,
R12.5, R12.6, R12.7.

### A.11 Recording precondition fail-closed under all consent combinations

For all combinations of `{patient consent present | absent | revoked} × {doctor consent
present | absent | revoked} × {granted scope subsets} × {notice version current |
superseded}`, the recording precondition returns permitted only when both participants hold
an unrevoked, consultation-bound Consent_Record granting the recording scope under the
current notice version passed as an argument, and `startRecording` is invoked in no other
case. Falsifies R13.6–R13.8, R22.2, R22.3.

Note that this property covers the precondition only. The four runtime behaviours moved to
the recording specification are deliberately absent from this appendix, because there is no
recording path, queue, or scheduled job in this specification to run them against. What
remains testable here is expressibility: for all revocation timestamps and artifact creation
timestamps, an artifact is orderable against a revocation instant from persisted fields
alone, and the `gsi3` corpus attributes are removable without disturbing any provenance
field. Falsifies R13.11, R13.13, R14.10, R14.11, R22.11.

### A.12 Integration-test-only criteria

The following are deliberately **not** property tests, because their behaviour does not
vary meaningfully with input and the subject under test is an external service or a build
artifact: Terraform application scope (R19.3), provider enablement per environment (R19.4),
route-inventory parity (R19.5), credential population before enablement and its startup
report (R19.8, R19.9), the cross-border transfer confirmation (R18.9), generated type drift
(R10.3), the atomic `videoJoinUrl` removal change set (R10.8), Lambda packaging (R19.6,
R23.6), browser header retention (R23.1–R23.3), dependency absence (R23.4, R23.7), the
reschedule-existence confirmation (R5.15), metric, alarm, dashboard, prefix, and gating
definition (R24.4–R24.7, R24.9, R24.11–R24.13), the single-role credential and metric grants
(R18.8, R24.8, R24.14), the absence of a new Lambda handler and therefore of any
`scripts/package-lambdas.mjs` change (R21.10, R23.6), and the transcript-to-CDS socket test
(R17.3, R17.8, R17.9), which is one example executed once.

The Media Object Storage decisions of R25 are likewise not property tests, and R25.10 makes
them not integration tests either: this specification provisions no bucket, no KMS key, and no
lifecycle rule, so the whole of R25.1–R25.10 is satisfied by the architecture record required
by R25.10 and verified by document review. The properties that will falsify them belong to the
recording specification, which is the first phase that writes a media object.
