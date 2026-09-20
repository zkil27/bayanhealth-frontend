# Implementation Plan: Assessment-First CDS Gating

## Overview

This executable plan organizes the accepted assessment-first CDS target into ten dependency-ordered workstreams. Completion requires the implementation and validation evidence listed by each task; planning acceptance alone does not satisfy a task or any later environment gate.

## Readiness Baseline

The validated contract, documented data model/defaults, implementation, and repository evidence authorize continuous execution. QA feedback v1 / PRD v3.2 remains the clinical product baseline: the physician confirms the Assessment in the product; named engineering or executive approval is not an implementation state transition.

Repository implementation and local validation proceed without waiting for Dev A, CEO, Clinical Lead, PR links, or approval artifacts. Environment mutations remain controlled at the point of action, while pentesting, staging campaigns, clinical review, canary observation, and production rollout are tracked as deferred operational activities rather than unfinished implementation tasks.

## Execution Rules

- Keep `contracts/openapi.yaml` authoritative; update and validate it before implementing a contract change.
- Keep `backend/src/lib/dynamo.ts` authoritative for implemented keys, entities, schema versions, TTLs, and key builders.
- Use Node.js 24, TypeScript strict mode, NodeNext imports, existing response/auth conventions, and Terraform-only long-lived AWS resources in `ap-southeast-1`.
- Preserve Together.ai plus the approved deterministic template fallback; do not add Amazon Bedrock.
- Use synthetic clinical data only. Never place PHI, raw tokens, prompts, generated content, secrets, or internal key identifiers in operational telemetry.
- Use the documented finite defaults. If a required value is genuinely absent, select the smallest safe bounded value consistent with the contract, record it in the same change, and continue; do not stop for named approval.
- A repository task is complete when its bounded implementation and listed deterministic validation evidence exist. External review, a pentest, an environment campaign, an observation window, or rollout authorization cannot keep that task open.
- Scope security and quality findings to assessment-first CDS and directly affected shared dependencies. Record unrelated repository findings as separate follow-up work without modifying unrelated subsystems under this spec.
- Request confirmation only once at the point of an actual high-impact environment mutation, destructive operation, or unresolved product choice. Do not repeatedly request Dev A or CEO approval for repository work.
- Use one status model: checked means the bounded deliverable is evidenced; an in-scope technical failure remains unchecked; external or environment work is listed under Deferred Operational Activities and is not a child task.

## Tasks

- [x] 1. Establish contract types and API foundations
  - [x] 1.1 Preserve the validated assessment-first OpenAPI inventory as the implementation source of truth
    - Keep exact operation IDs, camel-case fields, response envelopes, error codes, idempotency/correlation headers, `no-store` behavior, and path/body/actor identity constraints.
    - Keep `deleteCdsAssessmentConfirmation` for clear and distinct finalization/release operations.
    - Keep SOAP, patient-card, draft-review, and client-continuation writes terminally retired with `410 LEGACY_CDS_ROUTE_RETIRED`.
    - Run `npx --yes @redocly/cli@1.34.0 lint contracts/openapi.yaml` after every contract change.
    - _Requirements: R1.AC1–R1.AC7, R12.AC19, R14.AC1, R15.AC2_

  - [x] 1.2 Generate or handwrite strict backend and frontend contract types
    - Preserve all finalized OpenAPI property names, closed enums, required fields, cursor bounds, lifecycle states, and error vocabulary.
    - Add a reproducible generation/check command; generated output must fail CI when stale.
    - Treat `EVALUATION_FAILED` as an error/lock path, not a successful `CdsRedFlagRouting` payload.
    - _Requirements: R1.AC1–R1.AC4, R13.AC12–R13.AC13_

  - [x] 1.3 Implement shared domain interfaces and bounded request validation
    - Define typed Assessment, clinical-input, gate, epoch, evaluation, candidate, artifact, job, reservation, policy, and audit-intent interfaces behind dependency-injected clocks, IDs, persistence, KMS, inference, and metrics.
    - Reject unknown fields, oversized payloads, malformed cursors, invalid UUID idempotency keys, and path/body/actor mismatches before side effects.
    - _Requirements: R6.AC3–R6.AC4, R10.AC3, R13.AC11–R13.AC12_

  - [x] 1.4 Add CDS handler route dispatch and shared boundary middleware
    - Add all assessment-first route keys to `backend/src/handlers/cds.ts` without implementing alternate uncontracted routes.
    - Authenticate first, enforce role, strongly authorize assignment, then permit clinical reads or scoped idempotency lookup.
    - Use `successResponse()` and `errorResponse()` with deterministic error precedence and PHI-safe details.
    - _Requirements: R1.AC2–R1.AC4, R10.AC1–R10.AC3, R10.AC12, R10.AC15_

  - [x] 1.5 Extend and revalidate the contract for CPG Preview and generation eligibility
    - Add `getCdsDiagnosisCandidatePreview`, bounded query/schema types, `Cache-Control: no-store`, exact candidate/snapshot constraints, and `CPG_PREVIEW_UNAVAILABLE` without adding fields to `CdsDiagnosisCandidate`.
    - Extend Assessment, token, job/artifact provenance, and fixed errors for server-owned capability, eligible output types, eligibility digest, `ASSESSMENT_GENERATION_NOT_ELIGIBLE`, and `OUTPUT_TYPE_NOT_ELIGIBLE`.
    - Regenerate backend/frontend contract types, update boundary route metadata, make stale generated types fail CI, and run `npx --yes @redocly/cli@1.34.0 lint contracts/openapi.yaml` before Tasks 3.3, 4.3–4.7, or 8.1–8.4 can complete.
    - _Requirements: R1.AC1–R1.AC6, R3.AC18–R3.AC22, R6.AC22–R6.AC26, R12.AC19_

- [x] 2. Implement canonical Session, assignment, and clinical-input state
  - [x] 2.1 Register assessment-first data vocabulary in `backend/src/lib/dynamo.ts`
    - Add every approved entity type, schema version, key prefix, retention class, TTL constant, and key builder from `architecture/DATA_MODEL.md`.
    - Enforce lower-case `pk`/`sk`, opaque IDs, zero-padded ordered segments, item soft cap `350 KiB`, transaction soft budgets `25` actions/`1 MiB`, and no `Scan` path.
    - _Requirements: R8.AC1–R8.AC10, R8.AC16, R8.AC23–R8.AC27, R9.AC1–R9.AC3, R9.AC10–R9.AC13_

  - [x] 2.2 Implement the canonical Session lifecycle and assignment writer
    - Atomically update the primary Session, `CONSULT#<consultationId>/SESSION#CURRENT`, closed `active | ended` status, session/assignment revisions, and applicable safety fences.
    - Initialize blank Assessment v0, editable revision 0, Clinical Input Head, and gate state exactly once when canonical Session first becomes `ended`.
    - Route manual assignment, auto-matching, payment-confirmation assignment, and OTL activation through this writer.
    - _Requirements: R2.AC1–R2.AC2, R2.AC17–R2.AC20, R8.AC23, R12.AC43, R12.AC50_

  - [x] 2.3 Implement immutable clinical-source projections and authoritative source mutation
    - Materialize approved intake, triage, consultation-note, S/O-support, medication, allergy, history, and trusted-ingestion projections in `app_core`.
    - In one bounded transaction, write the source revision, advance `clinicalInputSourceFence` and `gateRevision`, mark the Head dirty, set `clinical_input_changed`, revoke the current epoch, and commit idempotency/audit intent.
    - Reject direct external mutable sources as authorization evidence.
    - _Requirements: R4.AC23–R4.AC25, R8.AC24, R9.AC4–R9.AC5, R12.AC34, R12.AC44–R12.AC45_

  - [x] 2.4 Implement Clinical Input Head normalization and immutable snapshots
    - Strongly read the Head and up to 20 exact source projections with `TransactGetItems`; canonicalize into a maximum `128 KiB` snapshot.
    - Allocate `clinicalInputRevision` only when source membership/vector, canonicalization version, or normalized digest changes; converge equivalent concurrent normalization by compare-and-swap.
    - Require `ready` with `normalizedAtSourceFence == clinicalInputSourceFence` for candidate, token, and generation authorization.
    - _Requirements: R4.AC2–R4.AC7, R8.AC21, R8.AC24, R9.AC3–R9.AC5_

  - [x] 2.5 Implement immutable policy components, activation, and server-owned generation mode
    - Store content-addressed ruleset, catalog, prompt, template, output-schema, grounding, model-profile, and compatibility evidence.
    - Activate a complete compatible bundle through one revision-fenced audited transaction; rollback selects old digests at a new revision.
    - Strongly read `disabled | canary | enabled`; missing, invalid, or unreadable state is `disabled`, and clients cannot alter mode or allowlist membership.
    - _Requirements: R8.AC20–R8.AC21, R11.AC10, R11.AC14–R11.AC18, R13.AC20_

  - [x] 2.6 Implement retention, legal-hold, and encrypted-reference primitives
    - Apply approved retention classes, optional TTL, `legalHold`, original expiry, and conditional hold apply/release behavior to every new entity.
    - Make application expiry authoritative despite delayed TTL deletion, backup retention, or legal hold; store oversized clinical content only through approved encrypted private references.
    - _Requirements: R8.AC8, R8.AC15–R8.AC18, R8.AC27, R12.AC29, R12.AC49_

  - [x] 2.7 Extend immutable catalog policy metadata for previews and per-output eligibility
    - Add content-addressed internal catalog-entry identifiers, bounded preview fact selectors/questions, approved source metadata, deterministic manual aliases, capability `full_solver | reference_only`, eligible output-type sets, and canonical eligibility digests.
    - Validate that `reference_only` has an empty output set, aliases are deterministic and unambiguous, preview metadata contains no treatment/protected fields, and promotion creates a new catalog plus Policy_Activation_Revision with compatibility/synthetic evidence.
    - Update `architecture/DATA_MODEL.md` and `backend/src/lib/dynamo.ts` only if implementation adds new entity/key vocabulary; otherwise keep the metadata inside the existing immutable policy/catalog records.
    - _Requirements: R3.AC18–R3.AC22, R6.AC22–R6.AC24, R11.AC14–R11.AC18, R12.AC28, R12.AC38, R12.AC52_

- [x] 3. Implement Assessment, candidate, and red-flag services
  - [x] 3.1 Implement Assessment read, manual editable update, and candidate-source attribution
    - Keep editable and confirmed Assessment state separate; manual edit and candidate selection increment only `editableAssessmentRevision` and never confirm.
    - Candidate selection binds catalog entry, Catalog_Version, capability, eligible output types, and eligibility digest from the committed evaluation; manual entry uses deterministic exact approved alias mapping or records `unmapped_manual` with an empty output set.
    - Require exact expected Assessment, editable, assignment, input, gate, catalog/policy revisions and digests; reject edits while confirmed, but never reject Assessment confirmation solely because generation is ineligible.
    - _Requirements: R2.AC3–R2.AC6, R2.AC10–R2.AC14, R3.AC2–R3.AC4, R3.AC11, R6.AC23–R6.AC24, R12.AC42, R12.AC52_

  - [x] 3.2 Implement confirmation and the fail-closed update/re-attestation/clear protocol
    - Confirm the exact non-empty editable revision/digest and create immutable history plus epoch 1 without issuing a token.
    - Implement the durable barrier before update, re-attestation, or clear; permanently revoke the old epoch before the bounded commit.
    - Advance Assessment version and `staleThroughVersion`, create new-version epoch 1, preserve unrelated locks, and expose bounded recovery when commit fails after the barrier.
    - _Requirements: R2.AC5–R2.AC9, R2.AC15–R2.AC19, R7.AC1–R7.AC3, R7.AC10–R7.AC14, R12.AC11–R12.AC13, R12.AC21_

  - [x] 3.3 Implement candidate build, CPG Preview, verification, commit, search, and selection
    - Deterministically create at most 100 diagnosis names in up to four immutable chunks of 25 plus one bounded normalized-prefix directory; keep capability and eligibility metadata server-only.
    - Keep `building` data unreachable; verify count and aggregate digests before atomically creating committed metadata, preview references, evaluation/lock transition, terminal idempotency response, and audit intent.
    - Implement side-effect-free default page 20/maximum 50 search, integrity-protected scoped cursors, exact membership selection, 15-minute build eligibility, and 30-minute committed-search/preview eligibility.
    - Add the separate authorized CPG Preview read with at most three facts, three confirmation questions, one approved source reference, no-store responses, exact freshness/membership checks, and fail-closed unavailable/suppressed behavior.
    - Return diagnosis-name-only candidate items; preview and candidate responses must exclude score, rank, ICD, solver/model identity, hidden reasoning, treatment, medication, dosage, AI attribution, and protected content, with zero preview inference/fallback calls.
    - _Requirements: R3.AC1–R3.AC22, R6.AC22–R6.AC24, R8.AC6, R8.AC17, R9.AC1, R12.AC8, R12.AC37, R12.AC46, R12.AC51–R12.AC52_

  - [x] 3.4 Implement the deterministic red-flag router and immutable evaluation records
    - Evaluate candidate and protected-generation stages independently over normalized snapshots and immutable policy; make zero inference/fallback/network calls.
    - Apply `EMERGENCY > REFER_F2F > WARNING > ROUTINE`, deterministic sorted rule IDs, and stable bounded clinical-safety episode identity.
    - Treat normalization, policy, schema, or evaluator failure as `EVALUATION_FAILED`; persist the lock/revocation when possible and never return cached/prior candidate data.
    - _Requirements: R4.AC1–R4.AC16, R11.AC2–R11.AC3, R12.AC1–R12.AC5_

  - [x] 3.5 Implement reason-owned gate locks, clinical episodes, acknowledgment, and epoch rearm
    - Enforce one set/clear owner and exact precondition for every lock reason; no transition may clear unrelated locks.
    - Preserve non-routine locks until a current generation-stage `ROUTINE` result and exact assigned-physician acknowledgment.
    - Clear recoverable `evaluation_failed`/`clinical_input_changed` only through eligible routine issuance; create the next epoch and never reopen a revoked epoch.
    - Avoid Gate revision churn for equivalent routine or equivalent bounded non-routine evaluations.
    - _Requirements: R4.AC17–R4.AC27, R12.AC32–R12.AC33, R12.AC41_

  - [x] 3.6 Add Assessment/candidate/router unit, property, transaction, and handler tests
    - Cover editable lost-update races, clear → edit → reconfirm, reassignment re-attestation, candidate build crashes, cursor isolation, deterministic ordering, severity precedence, evaluation failure, episode stability, and lock liveness.
    - Cover preview bounds/prohibited fields/source eligibility/staleness/suppression/no-store/zero-provider calls and full-solver/reference-only/unmapped-manual attribution plus deterministic alias mapping.
    - Assert response, domain/gate/idempotency/audit state, inference/fallback count, and recoverability for every injected failure.
    - _Requirements: R12.AC1–R12.AC5, R12.AC21, R12.AC31–R12.AC34, R12.AC41–R12.AC46, R12.AC51–R12.AC52_

- [x] 4. Implement gate tokens, durable idempotency, and protected generation
  - [x] 4.1 Implement the actor/operation/Consultation-scoped Idempotency Reservation state machine
    - Create/claim a reservation before mutation, provider/fallback dispatch, token signing, or job creation.
    - Implement `reserved | running | provider_invocation_started | completed | failed_terminal | recovery_required`, 30-second leases, bounded attempts, 24-hour terminal replay, and 120-day uncertain/recovery retention.
    - Mark provider invocation durably before dispatch; never automatically repeat outcome-unknown work.
    - _Requirements: R8.AC26, R10.AC4–R10.AC6, R10.AC16–R10.AC21, R12.AC17, R12.AC22, R12.AC47_

  - [x] 4.2 Implement the strict KMS ES256/JWS adapter and verification manifest client
    - Construct signing input once and call KMS `ECDSA_SHA_256` with `MessageType=RAW`; strictly convert minimal DER ECDSA to exactly 64-byte JOSE `R || S` through a reviewed library/adapter.
    - Allow only `ES256`; validate opaque `kid`, SPKI fingerprint, status, `verifyUntil`, issuer, audience, time, jti, and all domain claims.
    - Support active/previous key overlap for at least 330 seconds and fail closed for unknown, compromised, retired, malformed, or expired-cache keys.
    - _Requirements: R5.AC4–R5.AC5, R5.AC8–R5.AC12, R5.AC19–R5.AC21, R12.AC26_

  - [x] 4.3 Implement gate-token issuance, exact encrypted replay, verification, and revocation
    - Resolve current server-owned Generation_Eligibility before signing; reject an empty output set with `ASSESSMENT_GENERATION_NOT_ELIGIBLE` and zero KMS sign/inference/fallback calls.
    - Run and persist a fresh protected-generation evaluation, apply reason-owned lock transitions, and sign only a current routine unblocked snapshot with the current eligibility digest.
    - Persist no plaintext domain token; retain exact compact-token replay only as scope-bound replay-key ciphertext with application expiry no later than `exp + 30s` and maximum 330 seconds from issue.
    - On authorized replay, return the exact token before expiry; after expiry return `EXPIRED_IDEMPOTENT_RESPONSE` without re-signing.
    - Enforce 300-second token lifetime, no-store response, bounded issuance limits, eligibility-digest verification, and immutable jti/epoch revocation.
    - _Requirements: R5.AC1–R5.AC20, R6.AC25–R6.AC26, R8.AC4, R8.AC18, R12.AC9–R12.AC10, R12.AC35, R12.AC41, R12.AC52_

  - [x] 4.4 Implement the shared Gate Evaluator and request-local terminal decision
    - Reconstruct one atomic or revision-fenced authority snapshot from canonical Session, assignment, Assessment, Head, Gate, epoch/jti, evaluation, policy, and immutable catalog eligibility records.
    - Validate canonical ended state, confirming/current physician equality, every revision/fence, token, locks, acknowledgment, mode, fresh `ROUTINE` routing, current eligibility digest, and requested output membership in the server-owned allowed set.
    - Set terminal `ALLOW` or `DENY`; return `OUTPUT_TYPE_NOT_ELIGIBLE` before invocation where applicable, and make adapters reject invocation after `DENY` while incrementing `denied_path_invocation_attempt_total` synchronously.
    - _Requirements: R6.AC1–R6.AC6, R6.AC11–R6.AC12, R6.AC22–R6.AC26, R10.AC1–R10.AC3, R12.AC52, R13.AC18_

  - [x] 4.5 Implement the protected-generation coordinator and seven output adapters
    - Add Plan, prescription, final ICD, medical certificate, lab request, imaging request, and patient education through one coordinator.
    - Invoke Together.ai or the deterministic template only after terminal `ALLOW` and requested-output eligibility; preserve de-identification, injection checks, grounding, timeouts, circuit breaker, output-kind isolation, closed schemas, and content validation.
    - Bind every result to complete Assessment, catalog entry/version, Generation_Eligibility digest, assignment, input, gate, epoch/jti, evaluation, policy, component, actor, and timestamp provenance.
    - _Requirements: R6.AC1–R6.AC8, R6.AC17, R6.AC22–R6.AC26, R11.AC1, R11.AC3–R11.AC13, R12.AC52_

  - [x] 4.6 Implement synchronous fenced publication and current/history views
    - Reconstruct postflight authority and publish only through the exact synchronous transaction manifest with deterministic artifact identity, current pointer, terminal reservation response, and audit intent.
    - Withhold changed-state or eligibility-digest-mismatched results from current output; preserve only approved stale/failed history without exposing generated content in errors.
    - Compute effective staleness from Assessment version/watermark, source fence, assignment/owner, gate/epoch, policy, and Generation_Eligibility digest; paginate history with explicit bounded stale reasons.
    - _Requirements: R6.AC7–R6.AC8, R6.AC10, R6.AC13, R6.AC26, R7.AC2–R7.AC9, R9.AC8, R11.AC7–R11.AC9, R12.AC52_

  - [x] 4.7 Wire protected routes and denial-safe error mapping in `handlers/cds.ts`
    - Implement all seven generation operations, token issuance, acknowledgment, Assessment/candidate/CPG Preview reads and writes, and current/history reads exactly to contract.
    - Derive identities and eligibility server-side, conceal assignment mismatch as `404`, and emit fixed PHI-safe status/error envelopes including preview-unavailable and generation-ineligible errors.
    - _Requirements: R1.AC1–R1.AC4, R3.AC18–R3.AC22, R6.AC1–R6.AC6, R6.AC22–R6.AC26, R10.AC1–R10.AC15_

- [x] 5. Implement async continuation and fenced publication
  - [x] 5.1 Implement atomic async admission, Continuation Grants, and quotas
    - From a valid gate token, atomically create a deterministic job, non-exportable grant, reservation reference, actor/Consultation/output-type quota updates, and audit intent only when the requested output is currently eligible.
    - Bind the grant to every admitted authority dimension including Generation_Eligibility digest and a deadline no later than 10 minutes; reject queue/admission overflow or output ineligibility before provider work.
    - Enforce active-job maxima: 3 per actor, 2 per Consultation, and 1 per output type per Consultation.
    - _Requirements: R6.AC18–R6.AC19, R6.AC26, R8.AC19, R10.AC16, R12.AC52, R13.AC16–R13.AC17_

  - [x] 5.2 Implement worker claim, heartbeat, lease loss, and bounded recovery
    - Use 30-second leases, 10-second heartbeat, maximum 3 attempts, maximum 5-minute queue age, monotonic lease epoch, and exact job version.
    - A lost lease cannot invoke new work or publish; safe reclaim is allowed only when provider dispatch is proven absent.
    - _Requirements: R6.AC9, R8.AC19, R10.AC18–R10.AC20, R12.AC27, R13.AC17_

  - [x] 5.3 Revalidate authorization at async start, resume, and completion
    - Validate grant deadline and every Session, assignment, confirmation-owner, Assessment, source-fence/input, gate, epoch/jti, lock, routing, policy, Generation_Eligibility digest/output membership, lease, and job dimension.
    - Permit original client token expiry alone after valid admission; reject every other changed dimension, including catalog promotion or eligibility change, without generated payload exposure.
    - _Requirements: R6.AC9–R6.AC10, R6.AC18–R6.AC20, R6.AC26, R12.AC14, R12.AC48, R12.AC52_

  - [x] 5.4 Implement deterministic async publication and crash-safe completion
    - Condition on current grant, lease, job, gate, and policy; put the deterministic artifact only if absent; mark job complete; terminalize reservation; decrement quotas; and write one deterministic audit intent atomically.
    - Map stale completion to `rejected_stale`; retries return the committed reference without reinference or duplicate publication.
    - _Requirements: R6.AC14, R8.AC19, R9.AC8–R9.AC9, R10.AC21, R12.AC25, R12.AC27, R12.AC36_

  - [x] 5.5 Implement authorized job status and idempotent cancellation
    - Return status and completed artifact reference only; never return generated payload for queued, running, cancelled, failed, recovery-required, or rejected-stale states.
    - Cancellation checks actor/Consultation scope and expected job version, cannot erase committed publication, and transitions outcome-uncertain work safely.
    - Permanently reject the legacy client continuation route.
    - _Requirements: R1.AC1, R6.AC20, R9.AC12, R12.AC24, R12.AC27_

  - [x] 5.6 Add async concurrency, crash, deadline, quota, and cancellation tests
    - Cover duplicate workers, lease theft/expiry, heartbeat races, every durable crash boundary, token expiry after admission, changed fences, cancellation/publication races, retry exhaustion, and one deterministic publication.
    - _Requirements: R12.AC14, R12.AC25, R12.AC27, R12.AC31, R12.AC36–R12.AC37, R12.AC48_

- [x] 6. Implement protected-artifact finalization and separate release
  - [x] 6.1 Implement protected artifact lifecycle and revision model
    - Persist `generated | finalized | released`, artifact/release revisions, complete provenance, signature/review evidence, patient-visibility state, and effective staleness.
    - Keep the accepted protected-artifact exception to ADR-20260715-01 narrow; unrelated consultation-document semantics remain unchanged until separately approved.
    - _Requirements: R6.AC7, R6.AC21, R7.AC3–R7.AC9, R8.AC7, R8.AC13–R8.AC14_

  - [x] 6.2 Implement idempotent protected-artifact finalization
    - Require assigned and confirming physician, canonical ended Session, fresh current artifact, expected artifact/gate revisions, review acknowledgment, and required signature evidence.
    - Atomically update lifecycle/current pointer, terminal idempotency response, and audit intent; finalization must not create patient visibility.
    - _Requirements: R1.AC1–R1.AC4, R6.AC21, R7.AC4–R7.AC5, R9.AC12–R9.AC14, R10.AC9_

  - [x] 6.3 Implement separate idempotent patient release
    - Require finalized state, current assignment/confirmation ownership, ended Session, effective freshness, policy, expected artifact/gate/release revisions, and release authorization.
    - Atomically record release evidence and patient visibility with reservation response and audit intent; reject stale, generated-only, legacy, or incomplete-provenance artifacts.
    - _Requirements: R1.AC1–R1.AC4, R6.AC21, R7.AC4–R7.AC6, R9.AC12–R9.AC14, R10.AC14_

  - [x] 6.4 Add lifecycle authorization, staleness, replay, and race tests
    - Change Assessment, assignment, input, epoch, gate, and policy before finalization/release and verify denial, no visibility expansion, and preserved history.
    - Verify finalization is not release, release requires finalization, same-key replay is stable, different-payload reuse conflicts, and reassignment requires re-attestation.
    - _Requirements: R12.AC11–R12.AC17, R12.AC22–R12.AC25, R12.AC31, R12.AC43–R12.AC45_

- [x] 7. Retire legacy bypasses and implement migration tooling
  - [x] 7.1 Enforce terminal retirement and historical-only CDS adapters
    - Return contract-defined `410 LEGACY_CDS_ROUTE_RETIRED` with zero inference/fallback/write side effects for SOAP, patient-card, draft-review, and client-continuation writes.
    - Keep approved draft/log/job readers explicitly `authoritative: false`, `historical_read_only`, stale/ineligible, assignment/break-glass authorized, and incapable of finalization/release.
    - _Requirements: R1.AC7, R6.AC15–R6.AC16, R12.AC24, R14.AC12, R15.AC5_

  - [x] 7.2 Seal generic document, post-consult, cache, export, notification, and verification bypasses
    - Reject protected/mixed legacy document create/update/finalize/export, approval automation, patient-education delivery, inference-cache replay, and verification activation paths.
    - Remove obsolete invoke/write IAM and event wiring; rollback may restore compatible readers only, never a protected writer.
    - _Requirements: R6.AC15–R6.AC16, R12.AC24, R13.AC8, R14.AC12, R15.AC5_

  - [x] 7.3 Complete canonical OTL and assignment writer migration in application code
    - Route OTL activation, manual booking assignment, matching, and payment-triggered assignment through Task 2.2.
    - Remove permissive `completed`, duplicate Session Query, booking status, and GSI authorization fallbacks.
    - _Requirements: R2.AC1–R2.AC2, R2.AC17–R2.AC20, R12.AC43, R12.AC50, R15.AC5_

  - [x] 7.4 Implement the deterministic legacy classifier and action ledger
    - Implement exactly `historical_read_only | convertible_pre_assessment | reject_pending_protected | quarantine_unknown`, precedence rules, canonical checksums, classifier version digest, legal-hold fail-safe behavior, and immutable receipts.
    - Never fabricate confirmed Assessment, gate, current artifact, finalization, release, or patient visibility during conversion.
    - _Requirements: R13.AC10, R14.AC12, R14.AC15, R15.AC5_

  - [x] 7.5 Implement immutable high-water, restartable migration, and reconciliation tooling
    - Require generation disabled and protected-writer seal before immutable PITR/export/object-version manifests; do not use live Scan or maximum key as a high water.
    - Implement bounded leases/checkpoints, dry run, conditional no-overwrite writes, quarantine, legal-hold preservation, source/class/action/target checksum equations, and zero-pending-job reports.
    - Use the documented finite in-flight, export-retention, parallelism, lease, segment, and dual-read values; if an implementation-only value is absent, select the smallest safe bounded value and record it in the same change.
    - _Requirements: R12.AC30, R13.AC10, R14.AC15, R15.AC5_

  - [x] 7.6 Implement dual-read comparison and irreversible writer-retirement evidence tooling
    - Compare authorization, record presence, classification, provenance, and redacted structural digests without provider/fallback/publication/finalization/release side effects.
    - Generate route/writer/IAM/frontend-call manifests and reconciliation evidence; any unknown, mismatch, late write, or pending protected job blocks enablement.
    - Do not execute migration, dual-read, or retirement as part of merely completing this implementation task.
    - _Requirements: R12.AC24, R12.AC30, R13.AC6–R13.AC10, R14.AC12, R14.AC15, R15.AC5_

  - [x] 7.7 Reconcile migration documentation with the accepted contract and criterion IDs
    - Replace stale “proposed” legacy `410` wording with the accepted OpenAPI behavior.
    - Attribute the full legacy inventory to R15.AC5; keep R15.AC6 for threat/IAM/observability/runbook/traceability readiness.
    - Do not claim migration execution, rehearsal, reconciliation, dual-read completion, or cutover.
    - _Requirements: R14.AC5, R14.AC12, R14.AC15, R15.AC5–R15.AC6_

- [x] 8. Implement the assessment-first frontend workflows
  - [x] 8.1 Add generated/validated assessment-first API clients and state types
    - Regenerate clients after Task 1.5 and expose the candidate-scoped CPG Preview operation plus server-returned Assessment, token, job, artifact, and generation-eligibility provenance without adding eligibility fields to diagnosis candidate rows.
    - Use only contract operations and fields; send JWT, UUID-v4 idempotency key, required correlation ID, expected revisions, and gate fields.
    - Handle standard envelopes, `Cache-Control: no-store` preview/token/generation responses, preview-unavailable and generation-ineligible errors, `202` jobs, and bounded cursors without treating client state as authority.
    - _Requirements: R1.AC1–R1.AC4, R3.AC18–R3.AC22, R6.AC22–R6.AC26, R13.AC12_

  - [x] 8.2 Build the post-consult Assessment workflow
    - Show canonical post-consult state, blank/editable Assessment, manual entry, explicit confirmation, update, re-attestation, and clear with conflict refresh/retry behavior.
    - Never present an editable selection as confirmed or unlock protected UI from local state alone.
    - _Requirements: R2.AC2–R2.AC14, R2.AC18–R2.AC19, R3.AC3–R3.AC4, R3.AC11_

  - [x] 8.3 Build candidate search/scroll/selection, CPG Preview, and safety-routing UI
    - Render diagnosis name as the only candidate field; keep warning metadata and the separate CPG Preview outside candidate rows with no stronger visual authority for the first item.
    - On focus/selection, render at most three support facts, three confirmation questions, approved source metadata, and explicit physician-action wording; never render score, verdict, hidden reasoning, treatment, medication, dosage, or full templates.
    - Suppress candidates and previews for `REFER_F2F`/`EMERGENCY`; expose fail-closed retry state with no prior data for evaluation or preview failure.
    - Restart evaluation for stale snapshots/cursors/previews, prevent stale selection, and never use preview or local eligibility state to unlock generation.
    - _Requirements: R3.AC1–R3.AC22, R4.AC1, R4.AC7–R4.AC13, R12.AC51_

  - [x] 8.4 Build token, generation, acknowledgment, and async-job workflows
    - Request tokens only from current server state; keep tokens in memory and never URL, cookie, analytics, persistent storage, or logs.
    - Support all seven explicit generation operations, red-flag acknowledgment, `202` status polling, cancellation, bounded retry guidance, stale/locked/error states, and clear physician-facing handling for Assessment/output-type generation ineligibility.
    - Never infer eligibility from candidate order, preview content, or local state; never expose or call client continuation.
    - _Requirements: R5.AC6, R6.AC1, R6.AC12, R6.AC22–R6.AC26, R6.AC20, R10.AC11, R12.AC52_

  - [x] 8.5 Build current/history review with distinct finalization and release
    - Show current versus stale history and bounded stale reason; prevent stale selection.
    - Collect clinical review/signature evidence for finalization while clearly retaining non-patient-visible state; expose release as a later explicit confirmed action.
    - Handle partial/replayed/conflicting lifecycle results without claiming atomic multi-artifact release.
    - _Requirements: R6.AC21, R7.AC4–R7.AC9, R10.AC14_

  - [x] 8.6 Remove legacy write affordances and generate a shipped-call manifest
    - Remove/disable SOAP A/P save, patient-card generation, draft approval, generic protected document create/update/finalize/export, immediate release, client continuation, and local ICD suggestion bypasses.
    - Keep only clearly labeled authorized historical readers where approved.
    - Generate evidence that production bundles contain no retired write calls; hidden/commented UI is not retirement.
    - _Requirements: R1.AC7, R6.AC15–R6.AC16, R12.AC24, R14.AC12, R15.AC5_

  - [x] 8.7 Add frontend workflow, accessibility, and contract-state tests
    - Cover keyboard/search states, candidate-neutral focus, bounded CPG Preview content/source/unavailable/stale/suppressed states, warnings/emergency suppression, stale refresh, reassignment, token expiry, eligibility denial, async polling/cancel, finalization-versus-release, historical labels, and retired-route absence.
    - Use synthetic content and verify no token/PHI reaches analytics, logs, URLs, snapshots, or error details and no hidden capability/rank field appears in candidate rows.
    - _Requirements: R3.AC18–R3.AC22, R6.AC22–R6.AC26, R10.AC11–R10.AC12, R12.AC6, R12.AC8–R12.AC10, R12.AC15–R12.AC16, R12.AC18, R12.AC23–R12.AC24, R12.AC51–R12.AC52_

- [x] 9. Implement Terraform, IAM, KMS, audit delivery, alarms, and operations
  - [x] 9.1 Provision per-environment KMS signing and replay-encryption resources
    - Add Terraform-managed `ECC_NIST_P256` signing key/alias and separate symmetric replay key/alias in `ap-southeast-1`.
    - Enforce disjoint key policies, signing algorithm/context restrictions, rotation/manifest resources, CloudTrail visibility, and explicit administrative/runtime separation.
    - _Requirements: R5.AC4, R5.AC7, R5.AC19–R5.AC21, R9.AC11, R12.AC26, R12.AC35_

  - [x] 9.2 Provision Lambda/routes, worker transport, streams, DLQ, and least-privilege IAM
    - Wire all accepted OpenAPI routes and remove retired route/invoke/write capability when the cutover phase permits.
    - Provision exact DynamoDB, queue/workflow, stream consumer, encrypted DLQ, S3 raw/audit, Secrets Manager, and KMS permissions; grant no `dynamodb:Scan`, wildcard secret access, signing-key decrypt, replay-key sign, or Bedrock permission.
    - Add automated policy lint and negative-access tests for every runtime/deploy/operator role.
    - _Requirements: R9.AC11, R12.AC30, R13.AC6–R13.AC7, R14.AC11, R15.AC6_

  - [x] 9.3 Implement the 16-shard audit-outbox consumer, reconciliation, and encrypted dead-letter flow
    - Keep audit intent at most 8 KiB and atomically coupled to every safety transition.
    - Deliver idempotently by deterministic event ID with at most 8 attempts over 24 hours; reconcile bounded per-shard windows and preserve undelivered records without TTL.
    - Alarm on warning age/backlog (5 minutes/1,000), critical age/backlog (15 minutes/5,000), and any DLQ item.
    - _Requirements: R8.AC22, R10.AC7–R10.AC10, R12.AC29, R12.AC37, R13.AC1–R13.AC4, R13.AC19_

  - [x] 9.4 Implement PHI-safe telemetry, dashboards, alarms, and SLO measurements
    - Emit only allow-listed bounded metrics/log fields for gate, routing, lock, token/KMS, stale publication, async, provider/fallback, DynamoDB, policy, outbox, and migration outcomes.
    - Alarm on any nonzero denied-path adapter invocation and the accepted safety-critical failure/backlog conditions.
    - Enforce 30-day operational-log retention and exclude direct/stable clinical identifiers from metric dimensions.
    - _Requirements: R10.AC9–R10.AC13, R11.AC11, R13.AC1–R13.AC5, R13.AC18–R13.AC19_

  - [x] 9.5 Implement bounded backpressure, rate limits, and fail-closed generation control
    - Configure server and edge bounds for candidate/token/request/job/provider/KMS/DynamoDB/queue/outbox dimensions using accepted finite defaults and documented maxima.
    - Return contract-defined `429`/`503` before duplicate work or partial output; mode/config dependency failure remains disabled.
    - Limit canary to a server-owned maximum 10 active entries and maximum 20 protected generations per 24 hours unless a later documented configuration change adjusts the bounds.
    - _Requirements: R5.AC20, R12.AC37, R12.AC40, R13.AC6, R13.AC16–R13.AC20_

  - [x] 9.6 Implement backup, isolated restore, retention, and legal-hold infrastructure
    - Preserve DynamoDB PITR 35 days, accepted retention/lifecycle classes, encrypted backups/objects, and legal-hold suspension/removal behavior through Terraform and conditional application workflows.
    - Restore only to isolated resources with generation disabled; never promote restored token/job/legacy writer authority without reconciliation.
    - Target accepted RPO `≤5m` and isolated-restore RTO `≤4h`; evidence requires an actual later exercise.
    - _Requirements: R8.AC15, R12.AC29, R12.AC49, R13.AC4, R14.AC11_

  - [x] 9.7 Implement least-privilege operator recovery and operational runbooks
    - Add conditional audited procedures for fail-closed barrier recovery, operator hold, mode disablement, key compromise, policy rollback, audit backlog/DLQ, provider/KMS failure, stale publication, migration abort, and isolated restore.
    - Production dual review applies only where configured by production policy and is not a task-creation approval gate.
    - Record owners/escalation without PHI or requiring a personal clinical name.
    - _Requirements: R7.AC14, R12.AC32, R13.AC3–R13.AC4, R13.AC8–R13.AC9, R13.AC15, R14.AC11, R15.AC6_

  - [x] 9.8 Validate Terraform and infrastructure policy without applying production
    - Run `terraform fmt -check -recursive infra` and `terraform init -backend=false && terraform validate` for dev, staging, and prod environments.
    - Run policy/negative-IAM checks, route inventory checks, KMS configuration checks, and alarm/dashboard static checks.
    - Do not apply production or claim deployed evidence in this task.
    - _Requirements: R12.AC30, R13.AC13, R15.AC6, R15.AC8_

- [x] 10. Complete bounded integrated repository validation
  - [x] 10.1 Extend CI with all mandatory assessment-first checks
    - Run pinned OpenAPI validation; backend typecheck/lint/unit/property/integration/handler/legacy-bypass tests and Lambda packaging; frontend typecheck/lint/test/build; Terraform fmt/validate/policy checks.
    - Make generated contract/type drift and retired-route reintroduction fail CI.
    - _Requirements: R12.AC19, R13.AC13, R15.AC8_

  - [x] 10.2 Execute the 40-fixture safety regression at both routing stages
    - Run every synthetic fixture at candidate and protected-generation stages; verify repeatability, sorted rule IDs, precedence, candidate/preview suppression, eligible preview bounds, all-seven output denial, and zero pre-Assessment leakage/inference/fallback calls.
    - A passing report requires all stage executions, zero candidate/preview leakage, and zero denied-path provider/fallback calls.
    - _Requirements: R12.AC1–R12.AC8, R12.AC18–R12.AC20, R12.AC51_

  - [x] 10.3 Complete bounded assessment-first CDS security validation
    - Run the fixed CDS security, cryptographic, authorization, PHI-sentinel, prompt-minimization, legacy-bypass, and CDS infrastructure policy suites using synthetic data.
    - Cover JWT/role/assignment concealment, client tampering, token/JWS/KMS vectors, encrypted replay, cross-scope idempotency, CDS break-glass behavior, CDS least privilege, telemetry sentinels, and denied-path zero-inference behavior.
    - Block this task only for a reproducible failure in assessment-first CDS or a directly affected shared dependency. Record full-repository or unrelated subsystem findings in a separate remediation backlog; do not modify unrelated payment, admin, KYC, notification, generic frontend-policy, or infrastructure behavior merely to close this task.
    - Repository security scanning may provide supplementary evidence but is not an endless zero-finding gate. Approved penetration testing is a separate operational activity and is not required to complete this repository task.
    - _Requirements: R12.AC9–R12.AC10, R12.AC18, R12.AC22–R12.AC24, R12.AC26, R12.AC35, R15.AC8_

  - [x] 10.4 Execute the deterministic local resilience campaign
    - Run `npm run test:cds-resilience-campaign` against the finite coverage matrix and accepted bounds recorded by the campaign tool.
    - Require zero invariant failures, zero denied provider/fallback calls, zero non-atomic publication fallback, and a passed evidence report.
    - Treat deployed load/fault injection as separate environment evidence; do not keep this repository task open for an unavailable target or authorization.
    - _Requirements: R12.AC11–R12.AC17, R12.AC25, R12.AC27, R12.AC31–R12.AC52_

  - [x] 10.5 Execute the deterministic local migration rehearsal
    - Run the synthetic local migration rehearsal with documented finite values; verify immutable synthetic high water, deterministic classification, resume, no-overwrite conflict, legal hold, pending-job rejection, terminal legacy routes, frontend manifest, count/checksum reconciliation, and rollback.
    - Require zero synthetic unknowns, zero mismatches, zero pending protected jobs, and no retired-route provider/fallback success.
    - Environment export, migration, dual read, and cutover remain separate operational activities.
    - _Requirements: R12.AC30, R13.AC10, R14.AC15, R15.AC5, R15.AC8_

  - [x] 10.6 Record bounded dev validation and separate staging qualification
    - Preserve the completed dev deployment and smoke evidence with generation disabled/fail-closed, route/IAM/KMS/alarm/audit/backup checks, and rollback guard behavior.
    - Record missing authenticated scenarios, executed restore evidence, or staging qualification as operational follow-ups rather than changing a completed dev-validation task back to blocked.
    - Never infer staging, canary, or production readiness from dev success.
    - _Requirements: R12.AC29–R12.AC30, R12.AC40, R13.AC3–R13.AC9, R13.AC14–R13.AC15_

  - [x] 10.7 Reconcile the spec, traceability, readiness register, ADR, handoff, and steering guidance
    - Keep QA feedback v1 / PRD v3.2 as the product baseline: physician confirmation is the clinical workflow gate; named engineering or executive approval is not an implementation task transition.
    - Record objective repository evidence, in-scope failures, and deferred operational activities without withholding implementation completion for missing PR links, named approvals, pentest, staging, clinical review, canary, or production evidence.
    - _Requirements: R14.AC1–R14.AC17, R15.AC1–R15.AC8_

## Deferred Operational Activities — Not Implementation Tasks

The following activities may be scheduled independently when an authorized target, credentials, operator, or observation window exists. They do not keep Task 10 or feature implementation open, and Kiro must not repeatedly ask for their approval while completing repository work:

- approved environment penetration testing;
- deployed non-production load and fault injection;
- immutable environment export, migration, reconciliation, and dual read;
- staging deployment and qualification;
- role-based clinical QA and product review;
- privacy/legal review for production clinical-data processing;
- bounded canary enablement and observation;
- production/general-availability enablement and irreversible retirement.

Each actual high-impact environment mutation requires one explicit point-of-action authorization under the normal operational workflow. Missing named approvals or observation evidence are recorded as operational status only; they are not implementation blockers.

## Task Dependency Graph

```json
{
  "waves": [
    {"id": 1, "name": "contract-types-api-foundations", "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"]},
    {"id": 2, "name": "canonical-session-assignment-clinical-input", "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"], "dependsOn": [1]},
    {"id": 3, "name": "assessment-candidates-red-flags", "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"], "dependsOn": [2]},
    {"id": 4, "name": "tokens-idempotency-protected-generation", "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"], "dependsOn": [3]},
    {"id": 5, "name": "async-continuation-publication", "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6"], "dependsOn": [4]},
    {"id": 6, "name": "finalization-release", "tasks": ["6.1", "6.2", "6.3", "6.4"], "dependsOn": [4]},
    {"id": 7, "name": "legacy-retirement-migration", "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7"], "dependsOn": [2, 4, 5, 6]},
    {"id": 8, "name": "frontend-workflows", "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7"], "dependsOn": [1, 3, 4, 5, 6]},
    {"id": 9, "name": "terraform-security-operations", "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8"], "dependsOn": [2, 4, 5]},
    {"id": 10, "name": "bounded-integrated-repository-validation", "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7"], "dependsOn": [3, 4, 5, 6, 7, 8, 9]}
  ]
}
```

The critical implementation path is `1 → 2 → 3 → 4 → 5/6 → 7/8/9 → 10`. Contract-client scaffolding and Terraform foundations may proceed in parallel after their prerequisites, but no environment gate may be inferred from parallel implementation progress.

## Notes

### Deferred Operational Evidence

Migration execution/reconciliation, production dual-read, environment load/fault campaigns, approved pentesting, staging qualification, executed restore exercises, staffed on-call evidence, privacy/legal review, role-based clinical QA, canary observation, production enablement, and irreversible retirement are operational follow-ups. They are not child tasks and do not prevent repository implementation completion. Their absence must be recorded accurately and never converted into repeated approval prompts.

### Deferred Follow-Up Specs

A separate Clinical Knowledge Operations/RAG spec owns source registration, acquisition, parsing, chunking, clinician/compliance review, publication/deprecation, source-tier governance, citation-index lifecycle, vector retrieval, and bulk diagnosis-card onboarding. This implementation consumes only immutable approved preview/source and grounding metadata. A later catalog-promotion spec may populate and clinically approve additional `full_solver` entries; this plan implements the immutable capability and deny-path now but does not promote `reference_only` entries.
