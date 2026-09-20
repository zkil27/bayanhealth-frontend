# Tech Stack & Build System

## Backend

- **Runtime**: Node.js 24.x (Lambda) — upgraded from 20.x per ADR-20260416-08
- **Language**: TypeScript 5.x — strict mode, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- **Module system**: `NodeNext` (ESM-compatible, `.js` extensions in imports)
- **Target**: ES2022
- **Bundler**: esbuild — per-handler zip bundles (no Lambda Layers); shared code in `backend/src/lib/` is inlined at build time. `npm run package:lambdas` runs a single parallel esbuild pass for all handlers (`scripts/package-lambdas.mjs`); per-handler `package:lambda-*` scripts remain for targeted builds (ADR-20260629-01)
- **Linter**: ESLint 9 with `typescript-eslint`
- **AWS SDK**: `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (v3, Document Client)

## Infrastructure

- **IaC**: Terraform — all long-lived AWS resources must be defined here (ADR-20260514-03)
- **Remote state**: S3 backend + DynamoDB lock table (bootstrap in `infra/bootstrap/`)
- **Environments**: `infra/environments/dev|staging|prod/`
- **Modules** (complete list): `infra/modules/amplify_hosting/`, `infra/modules/cds_kms/`, `infra/modules/cds_operations/`, `infra/modules/cognito/`, `infra/modules/data_stores/`, `infra/modules/http_api/`, `infra/modules/notifications/`
- **Other infra directories**: `infra/bootstrap/` (one-time remote state), `infra/scripts/` (CDS operator scripts), `infra/tests/` (infrastructure tests)
- **State boundary**: Terraform resources are definitions until applied to a named environment. Applied resources are not qualified merely by existing; staging qualification, restore execution/reconciliation, canary authorization/observation, and production/GA require their own evidence.
- **AWS region**: `ap-southeast-1` everywhere — hard requirement (ADR-20260514-01)

## AWS Services

| Service | Purpose |
|---|---|
| API Gateway HTTP API | REST endpoints |
| API Gateway WebSocket API | Realtime chat + presence |
| Lambda | All compute (TypeScript handlers) |
| DynamoDB | `app_core` (transactional) + `app_audit_ai` (audit/AI) |
| Cognito | Auth, JWT issuance, group-based RBAC |
| S3 | Media, de-identified/minimized AI artifacts where allowed, medical docs (all private) |
| SQS | Terraform-defined assessment-first protected-generation FIFO transport, worker DLQ, and audit DLQ; definition or prior dev evidence does not prove staging deployment or qualification |
| AWS Backup | Terraform-defined assessment-first DynamoDB vault/plan plus a disjoint isolated-restore operator role; restores create isolated, non-authoritative tables and require separate execution/reconciliation evidence |
| Step Functions | Async CDS continuation path (when needed) |
| Together.ai (HTTPS) | CDS Layers 3 & 5 → deterministic template fallback. Sole inference provider (ADR-20260525-01); original 72B/OpenBioLLM slugs retired. Active model comes from a named preset — see **CDS model presets** below and `architecture/AI_INFERENCE.md` |
| PayRex (HTTPS) | Implemented PH payment adapter behind circuit breaker/ledger fallback; currently disabled and unqualified, not a production-ready payment path (ADR-20260618-01) |
| Secrets Manager | `TOGETHER_API_KEY`, `payrex-credentials-{env}` |
| Amplify | Frontend hosting (Terraform-managed) |
| KMS | Encryption at rest |
| WAF | API protection baseline |
| GuardDuty | Threat detection — Low-tier security baseline (ADR-20260710-01) |
| AWS Config | Configuration/compliance tracking — Low-tier security baseline (ADR-20260710-01) |
| CloudWatch | Logs (30-day retention) + alarms |
| SES/SNS | Notifications (when configured) |

## CDS Model Presets

Together.ai remains the only provider (ADR-20260525-01) and the deterministic template path remains the only fallback. Which Together model is active is chosen at runtime from a named preset in `backend/src/lib/cds/profiles.ts`, so an operator can swap models with one Lambda env var — no slug memorization, no code change, no redeploy.

| Preset | Together slug | Status | Sync-path defaults |
|---|---|---|---|
| `qwen2.5-7b` | `Qwen/Qwen2.5-7B-Instruct-Turbo` | **`staging`/`prod` default; being deprecated by the provider** | 4096 max tokens, 15s timeout, non-streaming, not a reasoning model |
| `kimi-k2.6` | `moonshotai/Kimi-K2.6` | Upgrade candidate under evaluation | 4096 max tokens, 20s timeout, non-streaming, `disableThinking` required (~4.3s vs ~22s) |
| `qwen3.6-plus` | `Qwen/Qwen3.6-Plus` | **Active in `dev`** (ADR-20260809-02); unqualified | 4096 max tokens, 26s timeout, **streaming required**, `disableThinking` required (~17s vs ~65-70s) |

- **Selection**: `CDS_SOAP_MODEL_PRESET` and `CDS_PATIENT_MODEL_PRESET` per profile family. Unset or unrecognized values fall back to `qwen2.5-7b`. An explicit `CDS_SOAP_PRIMARY_MODEL` slug override still wins over the preset.
- **Currently set**: `dev` runs `qwen3.6-plus` on both families with `cds_soap_max_tokens = 4096` (ADR-20260809-02). `staging` and `prod` are unset and therefore on the `qwen2.5-7b` default. Raising the token cap in `dev` was not a cost decision: a truncated completion is rejected and silently demoted to the deterministic placeholder template, which for a prescription puts "physician selection required" on screen behind an HTTP 200.
- **Why `disableThinking` matters**: both candidates are reasoning models that bill thinking tokens against the same `max_tokens` budget and return that text on a separate `reasoning` field the pipeline neither parses nor logs. Left enabled, a request spends its budget thinking, returns empty `content`, and is silently demoted to the deterministic template. Disabling it is what makes these models viable on the synchronous path.
- **Hard ceiling**: API Gateway HTTP APIs cap integration time at a non-configurable 30s. Every preset timeout is set below that with room for the surrounding gate and persistence work. Latency figures were measured against the real SOAP prompt (~1.2K prompt tokens) on Together serverless, 2026-08-01.
- **Evidence boundary**: the two candidates are implemented and selectable. Neither is qualified. Preset availability is not provider qualification, and a dev-side comparison is not staging, canary, or production evidence.

## API Contract

- **Format**: OpenAPI 3.1 YAML — source of truth at `contracts/openapi.yaml`
- Contract is written before handler code (contract-first, ADR-20260416-09)

## Common Commands

All commands run from `backend/`:

```bash
# Type-check without emitting
npm run typecheck

# Lint
npm run lint

# Compile TypeScript
npm run build

# Run unit + property tests (vitest + fast-check)
npm test

# Bundle + zip ALL Lambda handlers in one parallel pass (preferred)
npm run package:lambdas

# Bundle + zip an individual Lambda handler (targeted builds)
npm run package:lambda-health
npm run package:lambda-bookings
npm run package:lambda-schedules
npm run package:lambda-payment-proof
npm run package:lambda-payments
npm run package:lambda-payrex-webhooks
npm run package:lambda-cds
npm run package:lambda-cds-audit-outbox
npm run package:lambda-consultation-documents
npm run package:lambda-prescription-verify
npm run package:lambda-chat
npm run package:lambda-chat-ws
npm run package:lambda-admin
npm run package:lambda-media
npm run package:lambda-intake
npm run package:lambda-intake-queue
npm run package:lambda-doctor-kyc
npm run package:lambda-notifications
npm run package:lambda-patient-chart
npm run package:lambda-drugs
npm run package:lambda-post-confirmation

# Smoke test against environments
npm run smoke:bookings-dev
npm run smoke:bookings-staging

# PayRex payment gateway compatibility / security / load checks
npm run test:payment-compatibility:dev
npm run security-test:payrex:dev
npm run load-test:payments:dev
```

Terraform commands run from the relevant environment directory (e.g., `infra/environments/dev/`):

```bash
terraform init
terraform plan
terraform apply
```
