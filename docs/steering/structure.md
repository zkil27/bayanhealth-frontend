# Project Structure

```
BayanHealthMVP/
├── architecture/          # Governance docs — read before making decisions
│   ├── DECISIONS.md       # Binding ADR log; all arch/security changes logged here
│   ├── API_DESIGN_STANDARDS.md                # Binding API rules (routes, envelopes, errors)
│   ├── AI_INFERENCE.md    # Binding CDS/AI inference design (ADR-20260525-01, Together.ai)
│   ├── DATA_MODEL.md      # DynamoDB access pattern analysis for app_core
│   ├── DEFINITION_OF_DONE.md
│   ├── PR_CHECKLIST.md
│   ├── REVIEW_AND_APPROVAL_MATRIX.md
│   ├── 30_60_90_PLAN.md               # Strategic execution plan (production hardening → pilot → GA)
│   ├── SESSION_HANDOFF.md             # Current working state, decisions in effect, next tasks
│   ├── DEMO_SCRIPT.md                 # Recordable patient+doctor walkthrough, booking -> prescription
│   ├── BayanHealth AI Architecture PRD v1.0.pdf
│   └── Bayanhealth_CDS_Solver_Library_v1.0.pdf
│
├── contracts/
│   └── openapi.yaml       # OpenAPI 3.1 — contract source of truth; write before handlers
│
├── backend/               # All Lambda handler code (Node 24 / TypeScript strict)
│   ├── src/
│   │   ├── handlers/      # One file per Lambda function (esbuild entry points)
│   │   │   ├── health.ts                    # GET /health, GET /v1/auth/me
│   │   │   ├── bookings.ts                   # booking CRUD + doctor assign + consultation start
│   │   │   ├── schedules.ts                  # doctor availability slots
│   │   │   ├── payment-proof.ts              # presigned upload/review + payment lifecycle
│   │   │   ├── payments.ts                   # payment hold/capture + doctor payouts (ledger/PayRex adapter)
│   │   │   ├── payrex-webhooks.ts            # POST /v1/webhooks/payrex — HMAC-verified, no JWT
│   │   │   ├── post-confirmation.ts          # Cognito Post-Confirmation trigger → group assignment
│   │   │   ├── intake.ts / intake-queue.ts   # patient intake forms + matching queue
│   │   │   ├── chat.ts / chat-ws.ts          # chat HTTP fallback + WebSocket
│   │   │   ├── consultation-documents.ts     # notes/prescriptions/certificates
│   │   │   ├── prescription-verify.ts        # public PHI-safe verification
│   │   │   ├── cds.ts                         # clinical decision support pipeline
│   │   │   ├── cds-audit-outbox.ts            # CDS audit outbox drain (DynamoDB stream → audit table)
│   │   │   ├── doctor-kyc.ts                  # doctor KYC/credentialing
│   │   │   ├── patient-chart.ts              # patient chart aggregation
│   │   │   ├── drugs.ts                       # drug reference data CRUD/search (drug-data-dynamodb)
│   │   │   ├── media.ts                       # consultation media upload/retrieval
│   │   │   ├── notifications.ts              # notification dispatch/list
│   │   │   └── admin.ts                       # admin controls + break-glass
│   │   └── lib/           # Shared modules — inlined by esbuild, never deployed separately
│   │       ├── dynamo.ts                # SINGLE SOURCE OF TRUTH for keys/GSIs/TTLs/entity types
│   │       ├── auth.ts                  # JWT extraction, requireAuth(), parseCognitoGroups()
│   │       ├── cognito-jwt.ts           # JWT verification helpers
│   │       ├── response.ts              # successResponse() / errorResponse() envelopes
│   │       ├── idempotency.ts           # Idempotency check/store helpers
│   │       ├── booking.ts / booking-status-index.ts
│   │       ├── schedule.ts
│   │       ├── payment-proof.ts / payments.ts / payrex-adapter.ts / payrex-client.ts / circuit-breaker.ts
│   │       ├── consultation-start.ts / sessions.ts / intake.ts / intake-queue.ts / matcher.ts
│   │       ├── chat-access.ts / chat-delivery.ts / chat-messages.ts / presence.ts / ws-connections.ts / sessions.ts
│   │       ├── consultation-documents.ts / consultation-document-export.ts / post-consult.ts / patient-chart.ts
│   │       ├── prescription-verification.ts / media-upload.ts / notifications.ts
│   │       ├── doctor-kyc.ts / admin-users.ts / admin-audit.ts / break-glass.ts / platform-settings.ts
│   │       ├── drug-data.ts / drug-validation.ts   # drug reference data + CDS lookup (drug-data-dynamodb)
│   │       ├── secrets.ts
│   │       └── cds/                     # CDS pipeline internals (Together.ai inference; solver-content.ts grounding, cache.ts)
│   ├── scripts/           # Dev/ops scripts (smoke tests, CDS demo seed/preparation, PayRex checks)
│   ├── reports/           # Generated validation evidence (e.g. cds-safety-regression.json)
│   ├── package.json
│   └── tsconfig.json
│
├── infra/
│   ├── bootstrap/         # One-time remote state setup (S3 + DynamoDB lock) — holds local tfstate
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   ├── modules/           # Reusable Terraform modules (complete list)
│   │   ├── amplify_hosting/
│   │   ├── cds_kms/           # ES256 gate-token signing key, replay-envelope key, verification manifest
│   │   ├── cds_operations/    # Assessment-first CDS transport, IAM, backup/restore, monitoring
│   │   ├── cognito/
│   │   ├── data_stores/
│   │   ├── http_api/
│   │   └── notifications/
│   ├── scripts/           # CDS operator scripts: cds-operator-recovery.sh, cds-isolated-restore.sh,
│   │                      #   cds-legal-hold.sh, cds-key-compromise.sh
│   └── tests/             # Infrastructure tests (cds-kms.test.mjs, test_cds_infrastructure.py)
│
├── frontend/              # Owned by Dev A (sole engineer); a fresh UI/UX board is pending implementation
└── .kiro/
    ├── specs/             # Spec packages (requirements/design/tasks per feature)
    └── steering/          # AI steering rules (this folder)
```

## Key Conventions

### Backend Handler Pattern

Each handler file exports a single `handler` function. Multiple routes are dispatched via an `event.routeKey` switch inside the handler — one Lambda per domain, not one per route.

```typescript
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId;
  switch (event.routeKey) {
    case 'POST /v1/bookings': return handleCreate(event);
    case 'GET /v1/bookings':  return handleList(event);
    default: return errorResponse('NOT_FOUND', 'Route not found', requestId, 404);
  }
}
```

### Shared Library Rules

- `lib/dynamo.ts` is the single source of truth for all DynamoDB key prefixes, GSI names, TTL constants, entity-type discriminators, and key builder functions. Never inline `BOOKING#` or similar key strings in handlers — always route through a key builder.
- `lib/response.ts` provides `successResponse()` and `errorResponse()` — always use these, never build raw response objects.
- `lib/auth.ts` provides `requireAuth(event, role?)` — always call this first in protected routes.
- `lib/idempotency.ts` provides `checkIdempotency()` / `storeIdempotency()` / `hashPayload()` — use on every write endpoint.

### DynamoDB Single-Table Layout (`app_core`)

- Keys: `pk` (HASH), `sk` (RANGE)
- GSIs: `gsi1` (actor / booking-child lookups; also drug RxCUI), `gsi2` (doctor-scoped; also drug therapeutic class), `gsi3` (status queue for admin; also drug name prefix) — drug data reuses the three GSIs via sparse attribute population
- Every item carries: `entityType`, `schemaVersion`, `ttl`, `legalHold`
- ~25 entity types coexist in the table (booking, slot, payment, payout, intake, session, message, presence, consultation document, media, CDS draft/job, doctor profile/KYC, notification, prescription verification, platform settings, break-glass grant, idempotency, ws token, solver content, CDS inference cache, generic drug, marketed product, clinical warning)
- Key prefix vocabulary, entity types, schema versions, and TTLs all live in the `KeyPrefix` / `EntityType` / `SchemaVersion` / `Ttl` constants in `lib/dynamo.ts`
- A separate `app_audit_ai` table holds audit + AI metadata
- Update `architecture/DATA_MODEL.md` before adding new key prefixes or GSIs

### Contract Single-Source Rule

`contracts/openapi.yaml` is the only source of truth for the HTTP surface, and a route must be contracted in the **same change set** that dispatches it. Never add a route to a handler switch or to the Terraform route inventory without its operation, and never add an operation without checking whether one already exists for that path.

This rule exists because it was violated. In August 2026 two branches independently added `POST /v1/cds/demo/generate` under different component names. Git merged them with **no conflict** because the insertions sat at different file offsets, producing a document with the path key and `operationId` defined twice. Since the contract generates both backend and frontend types, a clean-looking merge silently corrupted the source of truth. `infra/tests/test_cds_infrastructure.py` enforces Terraform-route/OpenAPI parity, and the generated-type drift check enforces the rest — but neither catches a duplicate key added on both sides, so this is a discipline rule as much as a tooling one.

Before adding any operation: `grep -n '^  /v1/your/path:' contracts/openapi.yaml`.

### API Rules (enforced by `architecture/API_DESIGN_STANDARDS.md`)

- All routes versioned under `/v1/`
- Success envelope: `{ data, meta: { requestId, timestamp, pagination? } }`
- Error envelope: `{ error: { code, message, requestId, retryable } }`
- Error codes: `SCREAMING_SNAKE_CASE` — prefixed `AUTH_`, `INVALID_`, `RESOURCE_`, `STATE_`, `INTERNAL_`, plus feature-specific codes (e.g. `IDEMPOTENCY_CONFLICT`, `PAYMENT_PROOF_*`)
- All write operations (POST/PUT/PATCH/DELETE) require `Idempotency-Key: <uuid-v4>` header
- Status-mutating writes use DynamoDB conditional expressions to prevent lost updates; conditional failure → `STATE_CONFLICT` (409)
- Never include PHI, raw S3 keys, or presigned URL values in error messages or logs
- 401 = missing/invalid token; 403 = valid token, wrong role; 404 used for ownership/assignment mismatches too (avoid leaking existence)

### Architecture Decision Records

Architecture, security, and product decisions are logged in `architecture/DECISIONS.md` so the repository remains self-describing. Record or amend the ADR as part of the same implementation task; lack of prior named-person approval does not stop bounded repository work when the accepted specification defines the behavior. Every mutation classified by a governing specification still requires its own current, unused, operation-specific point-of-action authorization; a missing or mismatched authorization means zero mutation and `DEFER`.

Current binding decisions to be aware of:
- **Region**: `ap-southeast-1` (Singapore), single AWS account, `dev`/`staging`/`prod` (ADR-20260514-01)
- **CDS inference**: external Together.ai per the AI Architecture PRD — **no Amazon Bedrock** (ADR-20260525-01, `architecture/AI_INFERENCE.md`); deterministic template fallback is the only fallback. Active model resolves from a runtime preset in `backend/src/lib/cds/profiles.ts`: `qwen2.5-7b` is the default baseline (ADR-20260624-01), with `kimi-k2.6` and `qwen3.6-plus` implemented as unqualified upgrade candidates selected via `CDS_SOAP_MODEL_PRESET` / `CDS_PATIENT_MODEL_PRESET`
- **CDS gating**: assessment-first, post-consult only — Plan/Rx/ICD/medcert/patient-education stay locked server-side until the physician confirms an Assessment (ADR-20260703-01, PRD v3.2)
- **Payments**: gateway adapter with `ledger` + **PayRex** production adapter behind a circuit breaker; `PAYMENTS_GATEWAY_PROVIDER` per env (ADR-20260618-01)
- **IaC**: Terraform-only for all long-lived AWS resources, including Amplify (ADR-20260514-03)
- **Runtime**: TypeScript on Node.js 24.x for all Lambda handlers (ADR-20260416-08)
- **RBAC**: Cognito groups `patient`/`doctor`/`admin`/`moderator` (ADR-20260416-13)

## Current Implementation Status (2026-08-03)

**✅ Implemented Surface; Qualified Demo Claim**: Ten backend priority slices and the frontend surface are implemented, with prior Amplify dev smoke/demo evidence. Authenticated Assessment/Current/History, an executed restore, staging qualification, and provider/payment qualification are not proven.
**🔄 Task 10.3 Evidence Boundary**: The isolated `.worktrees/` checkouts were removed on 2026-08-03. The Task 10.3 security fixes, suites, and evidence documents are committed on branch `task/assessment-first-10-3` (commit `106ad33`, unpushed) and are **not** merged into the primary checkout. Primary-checkout integration and a rerun against the exact integrated candidate remain pending.
**🔄 Qualification Layers**: Branch-preserved work is not primary integration. Primary integration is not staging qualification. Staging qualification is not canary authorization/observation. Canary evidence is not production enablement or GA.
**🔄 Providers and Payments**: Together.ai and PayRex integrations are implemented, but representative Together.ai qualification remains pending, neither upgrade model preset is qualified, and PayRex is disabled/unqualified behind the ledger fallback.
**🔄 Accepted but Unstarted Specs**: `soap-multi-transaction-cds` and `five-day-launch-readiness-roadmap` have complete specs with zero tasks executed. Their `requirements.md`/`design.md`/`tasks.md` describe intended, not implemented, behavior.

> Authority rule: repository code and `architecture/SESSION_HANDOFF.md` remain authoritative for the checkout they describe. Current contradiction: the successful Task 10.3 evidence lives on an unmerged, unpushed branch while this primary checkout has not integrated or rerun that candidate; branch evidence must not be promoted to primary, staging, canary, production, or GA status.
