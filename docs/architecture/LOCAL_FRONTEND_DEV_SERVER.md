# Local Frontend Dev Server Against Cloud Dev Backend

How to run the Next.js frontend on `http://localhost:3000` — in hot-reload dev mode or
as a production build — while every API, auth, and storage call goes to the deployed
`dev` environment in AWS `ap-southeast-1`. This is the working setup for UI updates,
frontend coding, frontend tests, and build verification.

There is no local backend. Lambdas, DynamoDB, Cognito, and S3 are only ever the
deployed ones (`architecture/ENVIRONMENT_SETUP.md` §6). Nothing here mutates AWS.

The frontend is hosted through Terraform-managed AWS Amplify, not Vercel, and Amplify
builds with the same `next build` and the same five variables used below — so a local
production build is a faithful rehearsal of the deployed one. This document replaces
the frontend `README.md`, which was removed as obsolete.

**Verified on 2026-08-13** against this checkout and the live `dev` environment — see
[Verification](#verification) for what was checked and what was not.

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Create `.env.local`](#2-create-envlocal)
3. [Why `http://localhost:3000` exactly](#3-why-httplocalhost3000-exactly)
4. [Why the backend has to be the cloud one](#4-why-the-backend-has-to-be-the-cloud-one)
5. [Run the dev server](#5-run-the-dev-server)
6. [Run a production build locally](#6-run-a-production-build-locally)
7. [Signing in locally](#7-signing-in-locally)
8. [What you can and cannot exercise this way](#8-what-you-can-and-cannot-exercise-this-way)
9. [Checks to run before opening a PR](#9-checks-to-run-before-opening-a-pr)
10. [Troubleshooting](#10-troubleshooting)
11. [Verification](#verification)
12. [Follow-ups](#follow-ups)

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| Node.js ≥ 20.9 | Verified on `v22.19.0` / npm `11.6.0`. Lambda's Node 24 (ADR-20260416-08) is irrelevant here — nothing backend runs locally. |
| Port 3000 free | Not optional. See [§3](#3-why-httplocalhost3000-exactly). |
| AWS CLI (optional) | Only to mint a token for manual `curl` probes or to re-read endpoint IDs. |

```bash
cd frontend/bayan-health-mvp
npm ci
```

## 2. Create `.env.local`

`.env.local` is gitignored (`.gitignore` allows only `.env.example`). All five values
below are public, non-secret dev configuration and were confirmed live on 2026-08-13.
This file already exists in this checkout with exactly these contents; recreate it with:

```bash
cd frontend/bayan-health-mvp
cat > .env.local <<'EOF'
NEXT_PUBLIC_API_BASE_URL=https://f9xiyx5s64.execute-api.ap-southeast-1.amazonaws.com
NEXT_PUBLIC_WS_URL=wss://y7rkn7sc97.execute-api.ap-southeast-1.amazonaws.com/$default
NEXT_PUBLIC_AWS_REGION=ap-southeast-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-southeast-1_bnXemsKn2
NEXT_PUBLIC_COGNITO_CLIENT_ID=13msbvlaepqpkghalh775t9qgv
EOF
```

Rules that are easy to get wrong:

- **No trailing slash** on either URL. `lib/api.ts` strips one, `chatSocket.ts` strips
  one, but the CSP builder in `src/proxy.ts` parses the raw value.
- **`NEXT_PUBLIC_WS_URL` includes the literal `/$default` stage path.** API Gateway's
  WebSocket invoke URL does not route the bare host to a `$default` stage: the bare
  host returns `403` before `$connect` invokes Lambda. Terraform therefore publishes
  `module.http_api.websocket_api_endpoint` with `/$default` appended; mirror that
  complete invoke URL locally.
- **Restart `next dev` after editing `.env.local`, and rebuild before `npm start`.**
  `NEXT_PUBLIC_*` values are inlined into the bundle at compile time and also feed the
  CSP header at request time. A stale build keeps serving the old values.
- **`node scripts/validate-env.mjs` does not read `.env.local`.** It is a dependency-free
  guard for Amplify's `preBuild` phase and reads `process.env` only, so run on its own it
  reports all five variables missing even when the file is correct. That is the script
  working as designed, not a setup fault. To exercise it locally, export the values
  first: `set -a && . ./.env.local && set +a && node scripts/validate-env.mjs`.

Only `NEXT_PUBLIC_*` variables exist on the frontend, and they ship inside the browser
bundle. Never put a secret in one.

### Re-reading the endpoint IDs

If dev is ever recreated, the IDs change. Read them back rather than guessing:

```bash
aws apigatewayv2 get-apis --region ap-southeast-1 \
  --query "Items[?contains(Name,'bayanhealth-dev')].{Name:Name,Endpoint:ApiEndpoint}" --output table

cd infra/environments/dev && terraform output api_endpoint cognito_user_pool_id cognito_web_client_id
```

The dev root module exposes both `api_endpoint` and `websocket_api_endpoint`, so read
the complete URLs from Terraform outputs rather than reconstructing either one.

## 3. Why `http://localhost:3000` exactly

API Gateway CORS allows an exact origin list with wildcards forbidden by a Terraform
validation rule (ADR-20260726-01). For dev that list is
`https://main.d27420akzuajw.amplifyapp.com` and `http://localhost:3000`
(`infra/environments/dev/variables.tf` → `frontend_allowed_origins`).

Any other origin fails **every** API call while **sign-in still succeeds**, because
Cognito is a separate service with its own CORS policy. A configuration fault then
presents as a data fault: signed in, every screen empty. ADR-20260807-03 exists because
this was misdiagnosed twice.

| Origin | Result |
|---|---|
| `http://localhost:3000` | Works |
| `http://127.0.0.1:3000` | Every API call blocked |
| `http://localhost:3001` (port taken, Next picks the next one) | Every API call blocked |
| A LAN IP or tunnel hostname for device testing | Every API call blocked |

If Next reports port 3000 is in use and starts on another port, stop and free 3000
rather than continuing. To test on a phone or a tunnel, the origin has to be added to
`frontend_allowed_origins` and applied — that is an infrastructure mutation and needs
its own point-of-action authorization.

## 4. Why the backend has to be the cloud one

`src/proxy.ts` builds the `Content-Security-Policy` per request from the environment,
and `connect-src` only accepts an `https:` API origin and a `wss:` socket origin.
Anything else is dropped from the policy, so the browser blocks the request:

- Env unset → `connect-src` lists only `'self'`, Cognito, and S3. Every API call is
  CSP-blocked before it leaves the page.
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` → the `http:` origin is discarded by
  `configuredOrigin()`, same outcome.

So pointing this dev server at a plain-HTTP local backend is not a configuration
change; it requires editing `proxy.ts`. Don't — use deployed `dev`.

The same strict CSP (nonce + `strict-dynamic`, no `'unsafe-eval'`) runs locally,
exactly as deployed. That is intentional: CSP faults surface on localhost instead of
after a deploy.

## 5. Run the dev server

```bash
cd frontend/bayan-health-mvp
npm run dev          # Next 16, Turbopack, http://localhost:3000
```

Confirm the wiring before debugging anything else — the API and socket origins must
appear in `connect-src`:

```bash
curl -s -D - -o /dev/null http://localhost:3000/ | grep -io 'connect-src[^;]*'
```

Expected (abridged):

```text
connect-src 'self' https://f9xiyx5s64.execute-api.ap-southeast-1.amazonaws.com \
  wss://y7rkn7sc97.execute-api.ap-southeast-1.amazonaws.com \
  https://cognito-idp.ap-southeast-1.amazonaws.com https://s3.ap-southeast-1.amazonaws.com …
```

Check the backend independently, including its CORS answer for this origin:

```bash
curl -s -H 'Origin: http://localhost:3000' \
  https://f9xiyx5s64.execute-api.ap-southeast-1.amazonaws.com/health -D - | \
  grep -i -E 'HTTP/|access-control-allow-origin'
```

A healthy dev API returns `200`, `access-control-allow-origin: http://localhost:3000`,
and a `{ data: { status: "healthy" … } }` envelope.

## 6. Run a production build locally

Dev mode and the deployed bundle differ — minification, server components, and the
`NEXT_PUBLIC_*` inlining all behave differently under `next build`. Verify a build the
same way Amplify does, still against the deployed dev backend:

```bash
cd frontend/bayan-health-mvp
npm run build        # reads .env.local and inlines the five values
npm start            # serves the built app on http://localhost:3000
```

`next start` serves on port 3000 by default, so the CORS allow-list holds and nothing
else changes. Both commands read `.env.local`; no exported variables are needed.

Two things to be aware of:

- **`npm run build` must be re-run after any `.env.local` change.** `npm start` serves
  whatever `.next/` contains, and the API and socket hosts are baked into the client
  chunks at build time.
- **Amplify runs `node scripts/validate-env.mjs` in `preBuild` before this.** In Amplify
  the five values arrive as real environment variables from Terraform
  (`infra/modules/amplify_hosting/main.tf`), so the guard passes there; locally it needs
  the export form in [§2](#2-create-envlocal).

Confirm the built output is wired to dev rather than trusting the build log:

```bash
grep -rl 'f9xiyx5s64' .next/static | head -3   # API host inlined into client chunks
curl -s -D - -o /dev/null http://localhost:3000/ | grep -io 'connect-src[^;]*'
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/patient
```

The last call should be `307 http://localhost:3000/signIn` — an unauthenticated
protected route redirecting proves the route guard in `src/proxy.ts` is active in the
production build, which is where a broken guard would otherwise go unnoticed.

Stop `npm start` before returning to `npm run dev`; both want port 3000, and Next will
silently pick another port, which breaks every API call ([§3](#3-why-httplocalhost3000-exactly)).

## 7. Signing in locally

Dev has seeded, `CONFIRMED` Cognito accounts (`infra/modules/cognito/seed.tf`), all
present in the pool as of 2026-08-13:

| Account | Groups |
|---|---|
| `demo@example.com` | `patient`, `doctor`, `admin` |
| `rolepatient@example.com` | `patient` |
| `roledoctor@example.com` | `doctor` |
| `roleadmin@example.com` | `admin` |
| `testpatient@example.com` / `testdoctor@example.com` | smoke accounts |

The shared password comes from `TF_VAR_seed_account_password` in the approved secret
store. It is not recorded in the repository, and it must not be pasted into docs,
commits, or terminal history. ADR-20260807-02/03 both note the seeded credential
failing to authenticate at one point; if sign-in rejects a correct password, that is
the credential state, not this setup.

Session behaviour worth knowing while testing: tokens are held in memory only
(ADR-20260726-01), but the Cognito refresh token lives in an `HttpOnly` cookie whose
`Secure` flag is set from the request protocol (`src/app/api/auth/cookie.ts`), so it is
omitted on `http://localhost` and **reload-based session restore works locally** the
same way it does on HTTPS.

For manual API probing outside the browser:

```bash
aws cognito-idp initiate-auth --region ap-southeast-1 \
  --client-id 13msbvlaepqpkghalh775t9qgv \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=demo@example.com,PASSWORD=$SEED_PASSWORD" \
  --query 'AuthenticationResult.IdToken' --output text
```

Send it as `Authorization: Bearer <IdToken>`. Note that `curl` ignores CORS entirely, so
a passing `curl` says nothing about whether the browser will be allowed through — that
asymmetry is the whole subject of ADR-20260807-03.

## 8. What you can and cannot exercise this way

Works against dev like the deployed frontend does:

- Auth and RBAC, bookings, schedules, doctor search and availability
- Chat over the WebSocket API, including the short-lived `POST /v1/ws-token` exchange
  (a full JWT is never placed on the socket URL)
- Media and document presigned uploads to the private dev S3 bucket
- Public prescription verification

Constrained by server-side state, not by anything local:

- **CDS protected generation** stays locked until a physician confirms an Assessment,
  and the gate is enforced server-side on every protected endpoint (ADR-20260703-01).
  A `403` there is the gate working. Server-enabling protected generation in an
  environment is a mutation with its own authorization requirement — out of scope for
  frontend work.
- **Payments** run on the `ledger` adapter. PayRex is implemented but disabled and
  unqualified (ADR-20260618-01).
- **Together.ai inference** is live behind the CDS endpoints and costs money per call;
  dev currently runs the `qwen3.6-plus` preset (ADR-20260809-02), which is unqualified.
  Prefer fixtures and the frontend test suite for iteration on CDS UI.
- **Notifications** depend on SES/SNS configuration in dev; treat delivery as unproven.

Reading and writing dev data through the UI is a change to a shared environment. Keep
test artifacts identifiable and clean up what you create.

## 9. Checks to run before opening a PR

All from `frontend/bayan-health-mvp`:

```bash
npm run typecheck        # clean on this checkout
npm test                 # vitest --run
npm run contracts:check  # generated OpenAPI types current
npm run lint
npm run build            # same build Amplify runs; see §6
```

Baseline measured on this checkout, 2026-08-13:

| Command | Result |
|---|---|
| `npm run typecheck` | passes, no output |
| `npm test` | 104 files, 739 tests passed, ~56s |
| `npm run contracts:check` | "Generated OpenAPI types are current." |
| `npm run build` | succeeds; 31 routes compiled, all dynamic, proxy middleware emitted |
| `npm run lint` | **fails**: 105 errors, 2334 warnings, all pre-existing |

Lint is not clean today. Compare against this baseline rather than expecting zero, and
don't let a pre-existing rule violation absorb a feature branch — record unrelated
findings as follow-up work.

`npm test` is `vitest --run`, single-pass. Do not start watch mode from an agent or a
CI step.

If a change touches the HTTP surface, the contract comes first:
`contracts/openapi.yaml` is the only source of truth, and an operation must land in the
same change set as the code that calls it (`.kiro/steering/structure.md`).

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| UI error naming two origins, `NETWORK_UNREACHABLE` | This origin is not in `frontend_allowed_origins`, or the connection dropped. The browser withholds which. Check the address bar is exactly `http://localhost:3000`. |
| "The app was built without `NEXT_PUBLIC_API_BASE_URL`" | `.env.local` missing, or the dev server was not restarted / the build not re-run after editing it. |
| `validate-env.mjs` reports all five variables missing | Expected when run bare; it reads `process.env`, not `.env.local`. Use the export form in [§2](#2-create-envlocal). |
| Production build points at the wrong API | `.next/` predates the `.env.local` change. Re-run `npm run build`; the host is inlined at build time. |
| `npm start` serves an old UI | Same cause: `npm start` does not compile. Rebuild. |
| Console CSP violation on `connect-src` | The API/WS origin is absent from the policy: unset, `http:` instead of `https:`, or malformed. Re-run the `connect-src` check in [§5](#5-run-the-dev-server). |
| Signed in, but every list empty | The classic origin fault (ADR-20260807-03). Sign-in works because Cognito has its own CORS policy. |
| Chat silently falls back to HTTP polling | `NEXT_PUBLIC_WS_URL` unset or not `wss:`. `getWebSocketBaseUrl()` returns `null` and the realtime attempt is skipped by design. |
| `401` on every call after a while | Token expired; a `401` clears the in-memory session and returns you to sign-in. Network failures deliberately do not. |
| `403` on CDS Plan/Rx/ICD/medcert/patient-education | The assessment-first gate. Expected until an Assessment is confirmed. |
| Doctor's same-day slots disappear over the day | Intended client-side future-slot filter (ADR-20260807-02). |

## Verification

Checked directly on 2026-08-13 from this checkout:

- `npm run dev` serves `200` on `http://localhost:3000`; the CSP header is present with
  a per-request nonce, and Next's injected scripts carry that nonce.
- With the five variables set, `connect-src` contains both the API and the socket
  origin. With them unset, it contains neither.
- Turbopack's served dev chunks — including the HMR client — contain no `eval(`, so this
  CSP needs no `'unsafe-eval'` for local development.
- `npm run dev` with `.env.local` in place (no exported variables) serves `/`, `/signIn`,
  and `/verify` as `200`, redirects `/patient` to `/signIn` with `307`, and emits both dev
  origins in `connect-src`.
- `npm run build` succeeds with `.env.local` in place and compiles 31 routes plus the
  proxy middleware. Both the API host (`f9xiyx5s64`) and the socket host (`y7rkn7sc97`)
  are present in the emitted `.next/static` client chunks, confirming the build consumed
  `.env.local` rather than falling back to empty values.
- `npm start` serves the production build on `http://localhost:3000`: `/` and `/signIn`
  return `200`, the CSP `connect-src` carries both dev origins, and `/patient`,
  `/doctor`, `/admin` each return `307` to `/signIn` while unauthenticated.
- `node scripts/validate-env.mjs` run bare exits `1` listing all five variables, because
  it reads `process.env` and does not load `.env.local`. Documented in [§2](#2-create-envlocal)
  rather than treated as a defect.
- Live dev API: `GET /health` returns `200` `healthy`; an `OPTIONS` preflight for
  `POST /v1/bookings` from `Origin: http://localhost:3000` returns `204` with
  `access-control-allow-origin: http://localhost:3000` and the expected allowed methods
  and headers.
- Dev endpoint IDs, WebSocket stage (`$default`), Cognito pool, app client
  (no client secret, `USER_PASSWORD_AUTH` enabled), and the seven seeded `CONFIRMED`
  accounts were all read from AWS.
- `npm run typecheck`, `npm test`, `npm run contracts:check`, `npm run build`, and
  `npm run lint` were executed; results are in
  [§9](#9-checks-to-run-before-opening-a-pr).

Not verified: no browser session was driven, so rendering, sign-in, and interactive
flows are unproven here, and no authenticated API request was made — the seeded
credential was not used. Every check above was made over HTTP from the command line,
which is exactly the class of probe that cannot see a CORS denial
(ADR-20260807-03). This document describes a local development loop only — it is not
staging qualification, canary evidence, or production readiness.

## Follow-ups

Recorded, not actioned, as they fall outside this document:

1. `npm run lint` fails on 105 pre-existing errors, so lint cannot serve as a gate for
   frontend changes until that baseline is cleared. With no second engineer, the
   automated gates are the only routine review that exists.
