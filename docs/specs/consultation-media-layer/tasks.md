# Implementation Plan: Consultation Media Layer (Phase One — Live Video)

## Overview

Implementation is TypeScript strict on Node.js 24, following the design's placement rules: every
new capability attaches to a module that already exists and already carries the convention it
needs. Keys go through `backend/src/lib/dynamo.ts`, envelopes through `lib/response.ts`, auth
through `lib/auth.ts`, write idempotency through `lib/idempotency.ts`, provider egress through
`lib/circuit-breaker.ts`, and the three `video-session` routes join the existing `event.routeKey`
switch in `backend/src/handlers/bookings.ts`. No new Lambda handler is created, so
`scripts/package-lambdas.mjs` and the Terraform handler inventory are unchanged.

The order below builds the registry and the adapter first, then the store, then the routes, then
the lifecycle cleanup, then the definition-only entity shapes and the falsifiable transcript
socket, and only then deletes the demo stand-in — so nothing is removed before its replacement
is wired and green.

Three atomicity constraints from the requirements are load-bearing across task boundaries and are
restated here because a task list can otherwise split them:

- The contract operations, the route dispatch, and the Terraform route inventory entries must land
  in one change set (R3.1, R4.1, R5.1, R19.5, R21.1). Tasks 5.1, 5.3, and 12.1 are one commit.
- Removing `videoJoinUrl` from the contract, regenerating both generated type files, and migrating
  the four frontend consumers must land in one change set (R10.8). Tasks 5.1, 11.2, and 10.1 are
  one commit.
- Existing code is extended, not replaced: `handlers/media.ts` and `lib/media-upload.ts` keep the
  existing `MEDIA#` attachment prefix untouched. The new `MEDIA_ARTIFACT#` prefix is additive and
  its non-interference with `MEDIA#` is asserted in both directions (R12.14).

Scope is repository implementation and local validation. The `dev` `terraform apply`, staging
qualification, canary authorization, and production enablement are outside this task list; the
fast-follow CloudWatch alarms and dashboard (R24.4–R24.7, R24.9, R24.11–R24.13) are likewise
tracked outside it, per the design's launch-scope split.

## Tasks

- [x] 1. Key registry, retention classes, and the data-model record
  - [x] 1.1 Extend `backend/src/lib/dynamo.ts` with the media-layer registry additions
    - Add `EntityType.VideoSession`, `EntityType.MediaArtifact`, `EntityType.ConsentRecord` and a `SchemaVersion` of `1` for each
    - Add `KeyPrefix.VideoSession`, `KeyPrefix.MediaArtifact`, `KeyPrefix.MediaPatient`, `KeyPrefix.Retention`, `KeyPrefix.Consent`, `KeyPrefix.ConsentGrant`
    - Add `Ttl.VideoSession = Ttl.Session`, `Ttl.MediaArtifact = Ttl.Media`, `Ttl.MediaArtifactTraining = 365 * 24 * 60 * 60`, `Ttl.ConsentRecord = Ttl.PatientProfile`, changing no existing duration
    - Add the four `RetentionClass` labels and the `MediaLimits` constant block
    - Add the pure key builders: `videoSessionPrimaryKey`, `mediaArtifactPrimaryKey`, `mediaArtifactSkPrefix`, `mediaArtifactPatientIndexKey`, `mediaArtifactCorpusIndexKey`, `mediaArtifactCorpusShardIndex`, `consentRecordPrimaryKey`, `consentRecordActorSkPrefix`, `consentRecordConsultationSkPrefix`
    - Every prefix helper returns its value including the `#` delimiter; leave the existing `mediaSkPrefix()` (`MEDIA#`) unchanged
    - `mediaArtifactCorpusIndexKey` rejects an empty notice version, one over 64 characters, one containing `#`, and a shard index outside `0..CORPUS_SHARD_COUNT - 1`
    - _Requirements: 11.1, 11.4, 12.1, 12.2, 12.12, 12.14, 13.1, 14.2, 14.3, 14.7, 16.1, 16.2_

  - [ ]* 1.2 Write property test for the Media_Artifact key builders
    - **Property 12: Key builder round-trip, ordering, shard coverage, and disjointness**
    - **Validates: Requirements 12.2, 12.12, 12.14, 14.1, 14.2, 14.3, 14.5, 14.6, 14.7, 14.9, 14.10**
    - Shared generators `arbNoticeVersion`, `arbArtifactId` live here for reuse by later properties

  - [x] 1.3 Record the new entity shapes in `architecture/DATA_MODEL.md`
    - Video_Session, Media_Artifact, Consent_Record, Transcript_Artifact kind, the three key-shape queries, the four retention classes, and the additive `roomEpoch` and `roomCreatedAt` attributes
    - Recorded before the `lib/dynamo.ts` change merges
    - _Requirements: 11.9, 12.9, 13.9, 14.8, 16.7_

  - [ ]* 1.4 Write unit test asserting no existing retention duration changed
    - Snapshot assertion over the whole `Ttl` object
    - _Requirements: 16.2_

- [x] 2. Provider adapter seam and shared-library additions
  - [x] 2.1 Add video provider credential loading to `backend/src/lib/secrets.ts`
    - `ensureVideoProviderCredentialsLoaded()`, `validateVideoProviderConfiguration()`, `resetVideoProviderCredentialsCache()`, following `ensurePayRexCredentialsLoaded` and `validatePayRexConfiguration` exactly
    - Reuse the in-process cache and the `PLACEHOLDER_SET_VIA_CLI` detection; a placeholder yields an unavailable outcome, never an error surface
    - Startup validation emits one PHI-free structured record per Lambda container naming environment, selected provider, and whether the credential is populated or a placeholder, disclosing no credential value
    - _Requirements: 18.3, 18.4, 18.5, 19.9_

  - [x] 2.2 Generalise `backend/src/lib/circuit-breaker.ts` with a defaulted type parameter
    - `class CircuitBreaker<TAdapter = PaymentGatewayAdapter>` and `execute<T>(operation: (adapter: TAdapter) => Promise<T>, name: string)`
    - The default preserves every existing PayRex call site and inference; no runtime behaviour changes and `getStatus()` is untouched
    - _Requirements: 1.8, 1.9_

  - [x] 2.3 Implement `backend/src/lib/video-provider.ts`
    - Declare all five interface members; implement `createRoom`, `mintJoinCredential`, `endRoom`; `startRecording`/`stopRecording` return `RECORDING_NOT_IMPLEMENTED` with zero network requests
    - Document per-participant unmixed audio capture and audio as the only recordable track kind on the recording members
    - `VIDEO_PROVIDER` selection over `none` and `daily`; any other value behaves as `none` and emits one PHI-free configuration warning per container behind a module-level `warnedOnce` flag
    - Daily implementation with `fetch` only, no SDK and no new dependency: `POST /v1/rooms` with `privacy: 'private'`, `exp`, `start_video_off: true`, `start_audio_off: true`; `POST /v1/meeting-tokens` with the derived room name, opaque `participantLabel`, role label, and `exp`; `DELETE /v1/rooms/{name}` mapping `404` to success; duplicate-name rejection mapped to success
    - Derive `providerRoomId` locally as `"bh-" + environment + "-" + sha256(bookingId + "#" + roomEpoch).hex[0..24]` and `participantLabel` as `sha256(bookingId + ':' + actorSub).hex[0..32]`
    - Declare `VIDEO_JOIN_CREDENTIAL_TTL_SECONDS`, `VIDEO_CLEANUP_TIMEOUT_MS`, `VIDEO_PROVIDER_REQUEST_TIMEOUT_MS`, `VIDEO_ROOM_EXPIRY_SECONDS` once here and at no call site as a literal
    - Route every provider call through the breaker with the Daily adapter as primary and the `none` adapter as fallback, rewriting the fallback category to `breaker_open`
    - Emit one EMF metric record per provider operation under `BayanHealth/Video/{environment}` carrying count and latency, dimensioned only from closed enums
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 8.6, 8.10, 20.2, 23.4, 24.1, 24.2, 24.3, 24.10_

  - [x] 2.4 Add an optional trailing `headers` parameter to `errorResponse` in `backend/src/lib/response.ts`
    - Additive and positional-last so every existing call site is untouched; merged into `JSON_HEADERS` to carry `Retry-After`
    - _Requirements: 9.11_

  - [ ]* 2.5 Write unit tests for the adapter, constants, and credential loading
    - Five-key interface shape; `none` and unrecognised selection with zero fetch calls; warn-once per container; room-creation body carries `start_video_off`/`start_audio_off`; duplicate name and `endRoom` `404` mapped to success; token body carries a role label rather than a person name; recording members inert
    - Single Secrets Manager call across repeated adapter calls; placeholder and populated startup records contain no credential substring
    - Constants asserted by value and asserted to appear as a literal at no call site
    - _Requirements: 1.1, 1.3, 1.5, 1.6, 1.7, 8.6, 18.3, 18.4, 19.9_

  - [ ]* 2.6 Write property test for provider metric emission
    - **Property 16: Every provider call emits exactly one complete metric record**
    - **Validates: Requirements 24.1**

  - [ ]* 2.7 Write property test for log, error, audit, and metric redaction
    - **Property 7: Log, error, audit, and metric redaction**
    - **Validates: Requirements 8.3, 8.4, 9.8, 18.5, 21.9, 24.3**

- [x] 3. Video_Session persistence
  - [x] 3.1 Implement `backend/src/lib/video-session-store.ts`
    - `readVideoSession`, `createVideoSessionClaimingMint`, `recordMintOnExistingSession`, `reopenVideoSessionClaimingMint`, `markVideoSessionEnded`, `markRoomCreated`, `evaluateMintCeiling`
    - Item under `pk = BOOKING#<bookingId>`, `sk = VIDEO_SESSION` via the key builder, carrying `entityType`, `schemaVersion`, `legalHold`, `retentionClass`, `provider`, `providerRoomId`, `roomEpoch`, `roomCreatedAt?`, `lifecycleState`, `createdByActorId`, `createdByActorRole`, `createdAt`, `endedAt?`, `mintAccounting`; `ttl` set when and only when `legalHold` is false; no `gsi1`/`gsi2`/`gsi3` attribute
    - At-most-one creation via `attribute_not_exists(pk) AND attribute_not_exists(sk)`, won before any provider call
    - Re-open under a `lifecycleState = ended` condition that increments `roomEpoch`, overwrites `providerRoomId`, clears `endedAt`, and mutates the same item
    - Mint accounting bounded to two actor entries, ceiling evaluated and incremented inside the same conditional write, three bounded retries then `contended`, `Retry-After` computed as whole seconds no greater than the window
    - No credential and no provider secret stored anywhere on the item, including inside `mintAccounting`
    - _Requirements: 3.5, 3.6, 3.7, 3.14, 3.15, 5.2, 5.7, 9.6, 9.11, 11.2, 11.3, 11.5, 11.6, 11.7, 11.8, 11.10, 11.11, 11.12, 11.13, 21.11_

  - [ ]* 3.2 Write property test for the Video_Session single-item invariant
    - **Property 11: Video_Session single-item invariant**
    - **Validates: Requirements 5.2, 5.4, 5.7, 11.2, 11.5, 11.6, 11.7, 11.8, 11.10, 11.12, 11.13, 21.11**

  - [ ]* 3.3 Write unit tests for mint accounting and the ceiling
    - Window expiry reset branch, within-window increment branch, contention exhaustion returning `contended`, `Retry-After` boundary at mint counts 19, 20, and 21
    - Exercised through an in-memory Document Client fake that enforces condition expressions
    - _Requirements: 9.6, 9.11, 11.10, 11.11_

- [x] 4. Checkpoint — registry, adapter, and store
  - Ensure all tests pass, ask the user if questions arise.
  - `cd backend && npm run typecheck && npm run lint && npm test`

- [x] 5. Contract, audit writer, and route dispatch
  - [x] 5.1 Add the three operations to `contracts/openapi.yaml`, remove `videoJoinUrl`, and regenerate types
    - `grep -n '^  /v1/bookings/{bookingId}/video-session' contracts/openapi.yaml` first to confirm no operation already exists for either path
    - `createBookingVideoSession` (201, 200, 400, 401, 403, 404, 409, 429, 503), `getBookingVideoSession` (200, 401, 404, 409), `endBookingVideoSession` (200, 400, 401, 403, 404, 409)
    - New schemas `VideoSessionCredentialResponse` and `VideoSessionStateResponse`; the `429` response documents `Retry-After` as a response header
    - Remove the `videoJoinUrl` property from the booking response schema and its `GOOGLE_MEET_INTEGRATION.md` reference
    - Regenerate `backend/src/contracts/openapi.generated.ts` and `frontend/bayan-health-mvp/src/types/openapi.generated.ts` via `node scripts/generate-cds-contract-types.mjs`
    - _Requirements: 3.1, 4.1, 5.1, 10.2, 10.3, 10.7, 21.1, 21.2_

  - [x] 5.2 Implement `backend/src/lib/video-audit.ts`
    - Six events — `video_session_created`, `video_session_credential_disclosed`, `video_session_ended`, `video_session_denied`, `video_session_provider_unavailable`, `video_session_reopened` — into `app_audit_ai` under `VIDEO#EVENTS` with `sk = EVENT#<timestamp>#<eventId>`, item shape and TTL matching `recordAdminAudit`
    - Disclosure-path events fail-closed: awaited, unswallowed, ordered before the credential leaves the handler
    - Cleanup and denial events best-effort; no event carries a credential, provider secret, patient name, or clinical content
    - `401` and concealment `404` write no row
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8, 9.9, 9.10, 3.16_

  - [x] 5.3 Add the three `video-session` cases to `backend/src/handlers/bookings.ts`
    - `resolveVideoSessionRelation` shared helper resolving stages 1 through 3 of the evaluation ladder once; requester identity only from verified token claims via `requireAuth`
    - Fixed order: `401` → `404` (participant relation, malformed `bookingId` included) → `403` → `400` (`Idempotency-Key`, stage 3b) → `409 STATE_CONFLICT` → `409 IDEMPOTENCY_CONFLICT` (stage 4b) → `429` → `503`
    - `handleCreateVideoSession`: absent → conditional create then `createRoom`, `markRoomCreated`, `video_session_created`, mint, `201`; conditional loser re-reads and falls into the reuse branch with no provider room; active → mint and `200`, repairing a missing `roomCreatedAt` with an idempotent `createRoom`; ended → conditional re-open, new room, `video_session_reopened`, `200`
    - `handleGetVideoSession`: safe and side-effect free, no `Idempotency-Key`, no credential, no room URL, no DynamoDB write, no idempotency record; absent → `404`
    - `handleEndVideoSession`: Assigned_Doctor only, patient gets `403` at stage 3; `Idempotency-Key` required; already ended → `200` with no provider request; absent session → `404`; provider failure → still ended, still `200`; Booking status unchanged
    - `503 VIDEO_DISABLED` and `503 VIDEO_PROVIDER_UNAVAILABLE` reachable only at stage 6; `429 VIDEO_CREDENTIAL_MINT_LIMIT` carries `Retry-After`
    - Name the credential response field `token` so `sanitizeForIdempotencyStorage` redacts it with no change to `lib/idempotency.ts`
    - _Requirements: 2.1, 2.2, 2.4, 3.2, 3.3, 3.4, 3.8, 3.10, 3.11, 3.12, 3.13, 4.2, 4.3, 4.4, 4.6, 4.7, 5.3, 5.4, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.8, 8.9, 9.11, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.10, 23.9_

  - [ ]* 5.4 Write property test for credential non-disclosure
    - **Property 1: Credential non-disclosure across every negative path**
    - **Validates: Requirements 3.12, 4.2, 4.7, 7.2, 8.1, 8.2, 8.4, 8.8, 8.10, 10.6**

  - [ ]* 5.5 Write property test for concealment indistinguishability
    - **Property 2: Concealment indistinguishability**
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [ ]* 5.6 Write property test for idempotent room creation under concurrency and read purity
    - **Property 3: Idempotent room creation under concurrency, and read purity**
    - **Validates: Requirements 3.2, 3.3, 3.5, 3.6, 3.7, 3.9, 3.10, 3.13, 3.14, 3.15, 3.16, 4.3, 4.4, 4.5, 11.3**

  - [ ]* 5.7 Write property test for the eligibility-window invariant
    - **Property 4: Eligibility-window invariant**
    - **Validates: Requirements 7.1, 7.2, 7.3, 23.9**

  - [ ]* 5.8 Write property test for error precedence, the mint ceiling, and `Retry-After`
    - **Property 5: Error precedence totality, mint ceiling, and Retry-After**
    - **Validates: Requirements 2.1, 2.2, 3.8, 3.11, 6.1, 6.5, 6.6, 7.4, 9.4, 9.5, 9.6, 9.11, 11.11, 21.3, 21.4**

  - [ ]* 5.9 Write property test for requester identity resolution
    - **Property 6: Requester identity comes only from verified token claims**
    - **Validates: Requirements 6.8**

  - [ ]* 5.10 Write property test for the persisted idempotency copy and replay re-minting
    - **Property 8: The persisted idempotency copy holds no credential, and replays re-mint**
    - **Validates: Requirements 3.12, 21.6, 21.8**

  - [ ]* 5.11 Write property test for `Idempotency-Key` handling
    - **Property 9: Idempotency-key handling**
    - **Validates: Requirements 3.4, 5.6, 21.5, 21.7**

  - [ ]* 5.12 Write unit tests for the three handlers and the audit events
    - Happy path and exact field set per operation; `GET` without an `Idempotency-Key`; `/end` when already ended issues no provider request; `/end` with no session returns `404`; one test per audit event asserting the exact field set; `401` and concealment `404` write no row
    - _Requirements: 4.2, 4.6, 5.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.10_

- [x] 6. Room lifecycle cleanup
  - [x] 6.1 Implement `backend/src/lib/video-session-cleanup.ts`
    - `endVideoSessionForLifecycle` for the three triggers `consult_completed`, `booking_cancelled`, `booking_rescheduled`
    - Read the session; return when absent or already ended; otherwise `endRoom` bounded by `VIDEO_CLEANUP_TIMEOUT_MS`, record ended regardless of the provider outcome, emit `video_session_ended` carrying the provider termination outcome
    - Never throws and never rejects, so it cannot extend the latency budget or failure surface of the clinical operation; no queue, no state machine, no scheduled job, no cross-handler invocation
    - _Requirements: 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14_

  - [x] 6.2 Wire cleanup into the cancel and reschedule branches of `handleUpdateBooking` in `backend/src/handlers/bookings.ts`
    - Called as a local synchronous function after the lifecycle write commits, so a cleanup fault cannot roll back the cancellation or reschedule
    - Alters no existing response shape and no existing side effect
    - _Requirements: 5.9, 5.10, 5.13, 5.14_

  - [x] 6.3 Wire cleanup into `handleCompleteConsult` in `backend/src/handlers/payments.ts`
    - Same shared module inlined by esbuild into the `payments` bundle; completion semantics, response shape, and existing side effects unchanged
    - _Requirements: 5.5, 5.8, 5.13, 5.14_

  - [ ]* 6.4 Write property test for degradation totality
    - **Property 10: Degradation totality**
    - **Validates: Requirements 1.6, 1.7, 1.9, 2.1, 2.2, 2.3, 2.4, 5.3, 5.11, 5.12, 9.7, 18.4, 18.6, 23.8**

  - [ ]* 6.5 Write unit tests for each lifecycle trigger
    - One test per trigger asserting the cleanup call and an unchanged response shape; one test with a never-resolving `fetch` asserting the lifecycle operation still returns
    - _Requirements: 5.8, 5.9, 5.10, 5.14_

- [x] 7. Checkpoint — routes and lifecycle
  - Ensure all tests pass, ask the user if questions arise.
  - `cd backend && npm run typecheck && npm run lint && npm test` plus `node scripts/generate-cds-contract-types.mjs --check`

- [ ] 8. Definition-only entity modules
  - [x] 8.1 Implement `backend/src/lib/media-artifact.ts`
    - `MediaArtifactKind` with exactly `'audio' | 'transcript'` and no recorded-video kind; `buildMediaArtifact` with injected `resolveConsent` and `resolveSourceAudio` resolvers
    - Reject and persist nothing on: kind outside the two-value set, audio duration outside 1–14400 whole seconds, track identity outside 1–64 characters or carrying a Cognito subject, name, email, or phone shape, more than 8 track identities per session, storage pointer over 256 characters or carrying a bucket name or object key path, notice version outside 1–64 characters, scope set outside 1–8 closed-set entries, unresolvable consent reference, consultation-bound grant without its consultation identifier, transcript kind without a resolvable source audio reference, and training-eligible class against a grant lacking the training-corpus scope
    - Notice version and scope set copied by value for the audio kind and inherited by reference for the transcript kind; `ttl` derived from the retention class and absent when `legalHold` is true; metadata only, no payload and no transcript text
    - Import no `docClient` and no `@aws-sdk/lib-dynamodb` command, so the zero-write guarantee is mechanically checkable
    - _Requirements: 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.10, 12.11, 12.13, 12.15, 12.16, 16.3, 16.5_

  - [ ]* 8.2 Write property test for Media_Artifact constructibility
    - **Property 13: A Media_Artifact is unconstructible without valid, resolvable inputs**
    - **Validates: Requirements 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.11, 12.15, 15.1, 15.2, 16.3**

  - [x] 8.3 Implement `backend/src/lib/consent-record.ts`
    - Closed three-value `ConsentScope`, `ConsentBinding` of one consultation identifier or the standing value validated against `CONSULTATION_ID_RE`, `buildConsentRecord`, `revokeConsentScopes` permitting only granted → revoked, per-scope revocation leaving other scopes untouched
    - `actorId` must equal the granting Cognito subject; `revokedAt` present when and only when revoked, millisecond precision; 5-year TTL unset when `legalHold` is true
    - `evaluateRecordingPrecondition` fail-closed: permitted only when both participants hold an unrevoked, consultation-bound grant carrying the recording scope under the notice version supplied as an argument; a standing binding never satisfies the recording scope; unresolvable, failed, or slower than 2000 ms all deny with no partial permit and no effect on the Video_Session or the Chat_Channel
    - Import no `docClient` and no `@aws-sdk/lib-dynamodb` command
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.10, 13.11, 13.12, 13.13_

  - [ ]* 8.4 Write property test for consent scope separability
    - **Property 14: Consent scope separability, and care is never contingent on the training scope**
    - **Validates: Requirements 12.13, 13.2, 13.3, 13.4, 13.5, 13.12, 16.4, 16.5, 16.6**

  - [ ]* 8.5 Write property test for the fail-closed recording precondition
    - **Property 15: The recording precondition is fail-closed, and the deferred behaviours are expressible**
    - **Validates: Requirements 13.6, 13.7, 13.8, 13.11, 13.13, 14.11, 22.2, 22.3**

  - [x] 8.6 Implement `backend/src/lib/transcript.ts`
    - `TranscriptProducer` of `'none' | 'human' | 'asr'`; the producer-agnostic in-memory `TranscriptSegment` shape with `speakerTrackIdentity`, `startMs`, `endMs`, and `text`
    - `createTranscriptProducer()` is a code-level guard: `none` constructs nothing and exposes no route; `human` and `asr` return `TRANSCRIPT_PRODUCER_NOT_IMPLEMENTED` without constructing a producer and emit one PHI-free configuration warning per container
    - Transcript metadata carries `segmentCount`, `totalDurationSeconds` derived from the source audio, `producer`, and `languageTags`, and no transcript text, excerpt, preview, or summary
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 8.7 Write unit tests for the definition-only modules
    - Standing and consultation-bound grants share one field set under one schema version; the standing binding never satisfies the recording scope; the producer shape is identical for `human` and `asr`; each factory guard; `none` constructs nothing
    - _Requirements: 13.3, 13.6, 15.3, 15.5, 15.6_

- [x] 9. Falsifiable transcript-to-CDS socket
  - [x] 9.1 Implement `backend/src/lib/transcript-cds-socket.ts`
    - `ingestTranscriptForClinicalOrganisation` flattens diarised segments held in memory, runs the unmodified `checkForPii` gate from `lib/cds/deidentify.ts`, submits to the existing SOAP organisation path in `lib/cds/soap.ts`, and projects only `subjective` and `objective`
    - Reachable from an automated test and from no HTTP route while `TRANSCRIPT_PRODUCER` is `none`; mints no gate token and performs no KMS signing operation
    - _Requirements: 17.1, 17.2, 17.3, 17.7, 17.8, 17.9_

  - [x] 9.2 Write the Requirement 17 socket test
    - Not marked optional: this test *is* the deliverable that makes the foundation claim falsifiable rather than asserted
    - One example in the standard `npm test` suite: fabricated in-memory Transcript_Artifact from hardcoded text, `checkForPii` reports it safe with `deidentify.ts` unmodified and unbypassed, Subjective and Objective content derived from that text, returned shape carries no assessment or plan
    - Attempt a protected generation for at least one protected output type with no confirmed Assessment and assert `CONFIRMED_ASSESSMENT_REQUIRED`
    - Assert zero DynamoDB writes, zero S3 writes, zero KMS calls, and zero adapter recording calls
    - _Requirements: 17.4, 17.5, 17.6, 17.7, 17.8, 17.9_

- [x] 10. Demo stand-in removal
  - [x] 10.1 Delete the backend demo stand-in and its booking-response surface
    - Delete `backend/src/lib/video-session.ts` and `backend/src/lib/video-session.test.ts`
    - Remove the `videoJoinUrlForBooking` call and the `videoJoinUrl` attachment from `handleGetBooking` in `backend/src/handlers/bookings.ts`
    - Lands in the same commit as tasks 5.1 and 11.2, because removing the contract property is breaking
    - _Requirements: 10.1, 10.2, 10.6, 10.8_

  - [x] 10.2 Remove the demo stand-in from Terraform
    - Remove the `demo_video_join_url` variable and its validation from `infra/modules/http_api/variables.tf`, the `DEMO_VIDEO_JOIN_URL` Lambda environment binding from `infra/modules/http_api/main.tf`, and the variable and its `dev` default from `infra/environments/dev/`
    - _Requirements: 10.5_

  - [ ]* 10.3 Write scope-containment and zero-write repository scan tests
    - Following the `task10-3-security-scan.test.ts` precedent: stand-in files absent; no provider host or outbound provider URL outside `lib/video-provider.ts`; the three definition modules import no `docClient` or `@aws-sdk/lib-dynamodb` command; no route, handler, or writer references the new entity types or prefixes outside `lib/dynamo.ts`, the definition modules, and their tests; no call site invokes `startRecording` or `stopRecording`; no SQS, Step Functions, or scheduled-rule reference added; `lib/cds/deidentify.ts` byte-unchanged; no corpus curation or export path; no provider chat, presence, or typing API referenced; no live or in-consult AI surface added; `Google Meet` and `meet.google.com` absent from configuration, dependencies, and provider implementation; `videoJoinUrl` absent from backend, frontend, and contract source; `demo_video_join_url` and `DEMO_VIDEO_JOIN_URL` absent from `infra/`; `backend/package.json` dependency set unchanged; `scripts/package-lambdas.mjs` unchanged; the frontend provider dependency version carries no range operator; `next.config.ts` headers unchanged with no CSP; every prefix helper returns a value ending in `#` and `MEDIA#`/`MEDIA_ARTIFACT#` non-interference holds in both directions
    - _Requirements: 1.4, 2.6, 10.1, 10.2, 10.4, 10.5, 12.10, 12.14, 13.10, 22.1, 22.3, 22.4, 22.5, 22.6, 22.8, 22.9, 22.10, 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

- [x] 11. Frontend seam
  - [x] 11.1 Implement `<ConsultationVideo />` as the only provider-aware frontend module
    - Superseded 2026-08-20: built on Daily's Call Object mode (`Daily.createCallObject`) rather than the hosted Prebuilt call surface originally planned here, after four consecutive live bugs traced to layering custom UI on top of Prebuilt's own iframe UI — see design.md C12 and requirements.md Requirement 23 criterion 5. The dependency pin to an exact version, no range operator, is unchanged.
    - Joins with the camera and microphone inactive; each toggle enables or disables only its own local track; both controls carry accessible names and are keyboard operable
    - Requests a credential only while the Booking is `confirmed` or `in_progress`; holds the credential in memory for the component instance lifetime with no storage write; re-mints by `POST` at the end of the 30-minute lifetime
    - `GET` `404` treated as "no room yet"; `VIDEO_PROVIDER_UNAVAILABLE` and `VIDEO_DISABLED` render a chat-only state directing the participant to the existing chat; `429` while connected keeps the call with a non-blocking notice honouring `Retry-After` and no earlier retry; `429` while not connected shows a chat-available state
    - Third-party transport notice to both participants before the first join, accessible and keyboard operable, explicitly not a Consent_Record and submitting no consent
    - Chat, presence, and typing continue to come from the existing Chat_Channel; `next.config.ts` is not touched
    - _Requirements: 8.7, 8.9, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 20.11, 20.12, 20.13, 20.14, 22.1, 23.5_

  - [x] 11.2 Migrate the four `videoJoinUrl` consumers to `<ConsultationVideo />`
    - `ConsultationRoom` (replacing `VideoCallCard`), `PatientBookingDetail` (replacing `VideoConsultationCard`), `DoctorConsultationAccess`, `DoctorDashboardDrawer`
    - Remove the `videoJoinUrl` field from `frontend/bayan-health-mvp/src/features/booking/lib/api/bookingDetail.ts` and update `ConsultationRoom.test.tsx` fixtures; no frontend module references `videoJoinUrl` afterwards
    - Lands in the same commit as tasks 5.1 and 10.1
    - _Requirements: 10.4, 10.6, 10.8, 20.1_

  - [ ]* 11.3 Write property test for the component's credential request window
    - **Property 17: The component requests a credential only inside the eligibility window**
    - **Validates: Requirements 20.6**

  - [ ]* 11.4 Write unit tests for the component behaviours
    - Muted-on-join behavior; independent camera and microphone toggle round trips; accessible names and keyboard operability on both controls; third-party notice for both roles with no consent submission; chat-only state on each `503` code; `GET` `404` as "no room yet"; `429` while connected keeps the call; `429` while disconnected shows chat-available; `Retry-After` honoured with no earlier retry; credential held in memory with no storage write
    - Accessible-name and keyboard assertions only; not a WCAG conformance claim, which needs manual assistive-technology testing and expert review
    - _Requirements: 8.9, 20.2, 20.3, 20.4, 20.5, 20.8, 20.10, 20.11, 20.12, 20.13, 20.14_

- [x] 12. Terraform definitions
  - [x] 12.1 Define the video infrastructure in `infra/`
    - `aws_secretsmanager_secret` `bayanhealth-{env}-video-provider-credentials` with a placeholder value and `ignore_changes = [secret_string]`; its ARN added to `aws_iam_role_policy.lambda_secrets`
    - `BayanHealth/Video/${var.environment}` added to the `cloudwatch:namespace` condition on `aws_iam_role_policy.lambda_cloudwatch_metrics`, granted on the shared `lambda_exec` role whose blast radius is every non-admin handler
    - Three `aws_apigatewayv2_route` resources targeting the existing `bookings` integration, registered in the same change set as tasks 5.1 and 5.3
    - `VIDEO_PROVIDER`, `VIDEO_PROVIDER_CREDENTIALS_SECRET_ARN`, and `TRANSCRIPT_PRODUCER` on the `bookings` and `payments` Lambda environments; `video_provider = "daily"` and `TRANSCRIPT_PRODUCER = "none"` in `dev`, `staging`, and `prod`
    - Everything in `ap-southeast-1`; no new bucket, KMS key, lifecycle rule, or global secondary index
    - _Requirements: 15.7, 18.1, 18.2, 18.7, 18.8, 19.1, 19.2, 19.4, 19.5, 19.6, 24.8, 24.14, 25.10_

  - [ ]* 12.2 Write Terraform assertion tests
    - Secret name, placeholder, and `ignore_changes`; secret ARN on the secrets policy; video namespace on the metrics condition; `VIDEO_PROVIDER = daily` and `TRANSCRIPT_PRODUCER = none` in all three environments; no new bucket, KMS key, or lifecycle rule; no new global secondary index
    - Route-inventory/contract parity through the existing `infra/tests/test_cds_infrastructure.py` check
    - _Requirements: 14.6, 15.7, 18.1, 18.2, 18.8, 19.4, 19.5, 21.1, 24.8, 24.14, 25.10_

- [x] 13. Governance record
  - [x] 13.1 Record the ADR and update the affected architecture documents
    - New `### ADR-YYYYMMDD-NN` entry in `architecture/DECISIONS.md` following the established field set: the media-layer framing and Daily as launch provider; supersession of ADR-20260720-02 as the video path with its authorization, disclosure, and system-of-record rules preserved in substance; retirement of the stand-in accepted under ADR-20260807-06; the definition-only shapes, the two new TTL constants, and the statement that no existing retention duration changed; design decisions D1 through D11; findings F1 through F4 and the two wording notes with their recommended amendments; follow-ups (fast-follow alarms and dashboard, fast-follow property suite, per-handler execution role split, PayRex namespace normalisation); and an explicit evidence boundary
    - Record the Requirement 25 media-object-storage decisions as an architecture record that provisions nothing
    - Update `architecture/DEMO_SCRIPT.md` and `architecture/TELECONSULT_VIDEO_AND_AI_SCRIBE.md` to stop referring to the removed variable
    - Record the launch dependencies tracked outside this specification: staging qualification of the routes, credential population before enablement, and the cross-border transfer, sub-processor, and deletion-guarantee confirmations
    - _Requirements: 10.5, 18.9, 19.3, 19.7, 19.8, 22.7, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8, 25.9, 25.10_

- [x] 14. Final checkpoint — full local validation
  - Ensure all tests pass, ask the user if questions arise.
  - `cd backend && npm run typecheck && npm run lint && npm test`
  - `cd frontend/bayan-health-mvp && npm run typecheck && npm run lint && npm test`
  - `node scripts/generate-cds-contract-types.mjs --check`
  - `npx --yes @redocly/cli@1.34.0 lint contracts/openapi.yaml`
  - `python -m unittest discover -s infra/tests -p test_cds_infrastructure.py -v`
  - `cd infra/environments/dev && terraform validate && terraform fmt -check`
  - `cd backend && npm run package:lambdas` to confirm the bundle builds with no inventory change

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Task 9.2 is deliberately
  **not** optional: Requirement 17 exists so the foundation claim is falsifiable, and skipping that
  test would leave the claim asserted rather than tested.
- Property tests use the existing `fast-check` dev dependency at a minimum of 100 iterations, one
  property per test, each carrying a tag comment naming its design property, for example
  `// Feature: consultation-media-layer, Property 3: Idempotent room creation under concurrency, and read purity`.
- Generators are built once in task 1.2 and shared: `arbBookingStatus`, `arbRequesterRelation`,
  `arbOperation`, `arbProviderFailureMode`, `arbIdempotencyKey`, `arbNoticeVersion`, `arbArtifactId`,
  `arbConsentScopeSubset`, `arbTrackIdentity`. The requirements' edge cases are generator
  obligations, not separate tests.
- DynamoDB is exercised through an in-memory Document Client fake that enforces condition
  expressions, so interleavings are deterministic and reproducible from a `fast-check` seed. `fetch`
  is stubbed per test, with a spy asserting zero calls where a property requires no network request.
- Properties 1, 2, 3, and 10 are launch scope. Properties 4 through 9 and 11 through 17 are
  fast-follow: that defers test *depth*, not coverage, since every criterion they falsify has an
  example-based test at launch.
- The `dev` `terraform apply`, staging qualification, canary authorization, and production
  enablement are outside this task list. Each environment mutation needs its own current, unused,
  operation-specific point-of-action authorization at the moment of application.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "2.1", "2.2", "2.4", "5.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "2.3", "5.2", "8.1", "8.3", "8.6", "11.1"] },
    { "id": 2, "tasks": ["2.5", "2.6", "2.7", "3.1", "8.2", "8.4", "8.5", "8.7", "9.1", "11.2"] },
    { "id": 3, "tasks": ["3.2", "3.3", "5.3", "6.1", "9.2", "11.3", "11.4"] },
    { "id": 4, "tasks": ["5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12", "6.3", "12.1"] },
    { "id": 5, "tasks": ["6.2", "6.4", "6.5", "12.2"] },
    { "id": 6, "tasks": ["10.1", "10.2"] },
    { "id": 7, "tasks": ["10.3", "13.1"] }
  ]
}
```
