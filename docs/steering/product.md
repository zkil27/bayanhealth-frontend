# BayanHealth MVP — Product Overview

BayanHealth is a telemedicine platform being rebuilt as an AWS-native serverless application. It connects patients with doctors for remote consultations via video, audio, or chat.

## Core Capabilities (MVP implementation scope)

- **Auth & RBAC** — Cognito-based authentication with four roles: `patient`, `doctor`, `admin`, `moderator`
- **Bookings** — Patients create and manage consultation bookings through a lifecycle: `pending_payment → payment_submitted → confirmed → in_progress → completed / cancelled`
- **Doctor Schedules** — Availability slot management for doctors
- **Consultation Start** — `POST /v1/bookings/{bookingId}/start`, assigned doctor only, moves a confirmed booking to `in_progress`, which unlocks chat and creates the canonical CDS session. Replaced the one-time link, which was deleted entirely (ADR-20260808-01, ADR-20260808-04)
- **Realtime Chat** — WebSocket-based consultation chat with a polled HTTP fallback and write-before-emit persistence. Chat opens once a doctor is **assigned** (booking `confirmed`), not only once the consultation is started (ADR-20260809-05); pre-consult messages belong to the booking and carry no `sessionId`/`consultationId`, and realtime delivery, presence, and typing remain in-consult only because they are session-keyed
- **Realtime Presence** — Typing indicators and online/offline status during consultations
- **Consultation Documents** — Notes, prescriptions, certificates, summaries; export capabilities
- **Payment Platform** — Hold/capture/refund pattern via a gateway adapter; `ledger` simulation + **PayRex** adapter (implemented but disabled/unqualified) behind a circuit breaker that auto-falls-back to ledger; `PAYMENTS_GATEWAY_PROVIDER` per env (ADR-20260618-01)
- **Payment Proof Upload** — Private S3 upload with signed URL retrieval for assigned doctor only (legacy path)
- **CDS (Clinical Decision Support)** — 6-layer pipeline per AI Architecture PRD; Layers 3/5 via Together.ai with a deterministic template fallback; async continuation on timeout; solver-content grounding + opt-in dev inference cache (ADR-20260624-01, ADR-20260629-01). The active model is selected at runtime from a named preset: `qwen2.5-7b` (`Qwen/Qwen2.5-7B-Instruct-Turbo`) is the production default; `kimi-k2.6` and `qwen3.6-plus` are implemented upgrade candidates under evaluation, neither qualified — see the preset table in `.kiro/steering/tech.md`
- **Assessment-First, Post-Consult CDS Gating** — AI may organize Subjective/Objective support before/during consult, but Assessment, Plan, Rx, final ICD, medical certificate, lab/imaging requests, and patient education stay **locked until the physician confirms an Assessment** post-consult; the gate is enforced server-side on every protected endpoint (`consultation_id` + `assessment_version` + `physician_actor_id` + signed `gate_token`), never client-side; red-flag router runs before candidate display and before any post-Assessment generation (ADR-20260703-01, PRD v3.2)
- **Safety Guardrails** — Deterministic gate checks before CDS finalization
- **Public Prescription Verification** — PHI-safe unauthenticated endpoint
- **Patient Intake/Triage** — Forms with a doctor-issued intake link (a separate surviving feature from the retired consultation OTL), step-by-step completion, doctor review
- **Doctor KYC & Verification** — License upload, moderator review queue, consultation gating
- **On-demand Matching** — Auto-assignment of patients to available doctors based on KYC status
- **Notifications & Reminders** — Email/SMS outbox system with templates, DynamoDB stream triggers
- **Admin Controls** — Audit views, break-glass access, user management, platform settings
- **Media Upload** — Consultation-scoped file upload/download with presigned URLs
- **Patient Charts** — Longitudinal health records with timeline aggregation
- **Drug Reference Data** — Generic drugs, marketed products, and clinical warnings in `app_core`; admin CRUD + doctor search; grounds CDS prescription guidance (ADR-20260630-02)

## Current Status (as of 2026-08-04)

**Repository is unified on a single `main` branch** at `39faa4b` (PR #16). Task 10.3 is integrated and all gates pass on the merged candidate. The demo CDS route is removed. Squash merging is disabled so evidence documents may cite commit hashes; auto-delete-on-merge is enabled. Branch protection is unavailable while the repo is private on the free plan.

**Next milestone:** demo on 2026-08-07 for two doctors and the CEO, evaluating the end-to-end flow and the AI pipeline.

**Open blockers:** 37 messages in `bayanhealth-dev-cds-audit-dlq`; five CDS alarms permanently in `ALARM` from `treat_missing_data = "breaching"` against an intentionally idle dev environment.

### Prior status (2026-08-03)

**✅ Implemented product surface; demo-ready is qualified**: All 10 priority slices are implemented and the Amplify dev surface has prior smoke/demo evidence. This does not prove the new authenticated Assessment, Current, or History flows, an executed restore, staging qualification, provider qualification, or payment qualification.

**🔄 Recent changes (2026-08-01)**: Consult completion now ends the canonical CDS session via `POST /v1/bookings/{bookingId}/complete`; the Kimi K2.6 and Qwen3.6-Plus model presets plus a demo policy seed script (`npm run script:seed-cds-demo-policy`) landed; an ad-hoc demo consultation preparation script was added. The seed script server-enables protected generation for **all actors** in its target environment with no canary allowlist — treat it as a demo-only tool requiring its own point-of-action authorization, and roll it back via `cds-operator-recovery.sh mode-disable`.

**🔄 Assessment-first CDS validation layers**:

1. **Branch-preserved Task 10.3 work** — the Task 10.3 security fixes, suites, and evidence documents are committed on branch `task/assessment-first-10-3` (unpushed) after the isolated worktrees were removed on 2026-08-03. Branch-preserved work is not integrated work.
2. **Primary integration** — integration into the current primary checkout and a candidate-bound rerun remain pending. Branch `task/assessment-first-10-4` records a resilience preflight blocker; `task-10-5-nonprod-rehearsal` records a dev CDS validation run.
3. **Staging qualification** — authenticated Assessment/Current/History, restore/reconciliation, representative Together.ai behavior, and staging evidence remain unproven.
4. **Canary authorization and observation** — no canary authorization or observation window has completed.
5. **Production/GA** — production enablement and GA have not been reached.

**🔄 Provider and payment status**: Together.ai integration and deterministic fallback exist, but representative provider qualification remains pending, and neither upgrade preset is qualified. PayRex is implemented behind the adapter/circuit breaker but remains disabled and unqualified; ledger remains the active safe path until separately authorized sandbox/staging qualification succeeds.

**🔄 Planned but not started**: `soap-multi-transaction-cds` (SOAP multi-transaction CDS with pre-Assessment support organization, prepared artifacts, and physician-triggered disclosure) and `five-day-launch-readiness-roadmap` both have accepted specs with zero tasks executed.

> `architecture/SESSION_HANDOFF.md` is the live source of truth for current state, and `architecture/CDS_TASK_10_READINESS.md` records assessment-first CDS evidence.

## Target Environments

`dev` → `staging` → `prod`, all in AWS `ap-southeast-1` (Singapore), single account. Defined infrastructure or prior dev evidence is not proof of staging qualification, canary authorization/observation, or production/GA readiness.

## Team Model

Restructured for rapid delivery. Roles define ownership and review input, not approval gates for repository implementation:

- **Dev A** — Sole Engineer (`ben.bayanhealth`): the entire technical surface — backend, frontend, cloud, AI/CDS, DevOps, security, contracts, merge ownership, and production deployment operations (ADR-20260809-03).
- **UI/UX Designer** — Design direction; handing over a fresh UI/UX board for later implementation. Not a delivery owner and not a review gate.
- Dev B and Dev C are offboarded. There is no second engineer, so peer review is unavailable and the automated gates (CI, contract parity, infra tests, test suites) are the only routine review that exists.
- Kiro proceeds with bounded repository work and non-destructive evidence generation without waiting for named-person approval. Mutations remain governed by current, unused, operation-specific point-of-action authorization.

## Architecture Decisions in Effect

- **ADR-20260514-01**: Primary region `ap-southeast-1` (Singapore) 
- **ADR-20260525-01**: CDS inference via Together.ai (no Amazon Bedrock)
- **ADR-20260514-03**: Full Terraform provisioning for all AWS resources
- **ADR-20260416-08**: TypeScript on Node.js 24.x for all Lambda handlers
- **ADR-20260416-13**: Cognito groups for RBAC (`patient`, `doctor`, `admin`, `moderator`)
- **ADR-20260618-01**: Payment gateway — PayRex integration (adapter + circuit breaker + webhook; ledger fallback)
- **ADR-20260618-02/03**: Break-glass shared-partition key redesign (cross-admin revocation) + WebSocket short-lived connection token exchange (no JWT in WS query params)
- **ADR-20260624-01**: Solver content store for CDS grounding; all CDS profiles moved to `Qwen2.5-7B-Instruct-Turbo`, which remains the default baseline behind the runtime preset selector
- **ADR-20260629-01**: Pre-production cost optimization (CDS fallback de-dup, opt-in inference cache, log/S3/Lambda right-sizing)
- **ADR-20260630-01**: Team restructure for the 30-day MVP push; ownership lanes remain, while ADR-20260728-01 removes named-person approval as a repository implementation gate
- **ADR-20260630-02**: Drug reference data layer in `app_core` (sparse gsi1/gsi2/gsi3 reuse)
- **ADR-20260703-01**: Assessment-first, post-consult-only CDS generation (PRD v3.2 harness-only pivot); server-enforced gate before Plan/Rx/ICD/medcert/patient-education
- **ADR-20260726-01**: Task 10.3 least-privilege application boundary hardening (group assignment, admin-only assignment, server-owned pricing, atomic WS token consumption, fail-closed break-glass audit, memory-only browser auth/intake state, exact CORS origins, isolated Cognito privileges)
- **ADR-20260804-01**: Patient-education knowledge base — keyed ICD-10 retrieval in `app_core`, bilingual (English + Filipino) required for approval, mandatory citation, admin-only CSV ingest; **no embeddings and no vector store in V1** (see `architecture/PATIENT_EDUCATION_CORPUS_SCHEMA.md`)
