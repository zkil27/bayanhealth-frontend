// Build-time environment-variable guard for the Amplify build.
//
// Feature: demo-readiness-frontend — supports Property 11 (build env-var guard
// flags exactly the missing variables). Validates Requirements 2.2, 2.3.
//
// This module is intentionally dependency-free and pure so it can be:
//   1. imported and unit/property tested (named export `validateEnv`), and
//   2. executed directly by `node scripts/validate-env.mjs` in `amplify.yml`'s
//      preBuild phase to fail the build before `npm run build` when any
//      required NEXT_PUBLIC_* variable is absent or empty.

import { pathToFileURL } from "node:url";

/**
 * The five build-time variables the unrestricted production frontend build
 * requires, unconditionally, in every environment.
 * @type {readonly string[]}
 */
export const REQUIRED_ENV_VARS = Object.freeze([
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_WS_URL",
  "NEXT_PUBLIC_AWS_REGION",
  "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
  "NEXT_PUBLIC_COGNITO_CLIENT_ID",
]);

/**
 * The subset of `REQUIRED_ENV_VARS` that a `NEXT_PUBLIC_LANDING_ONLY=true`
 * build does not need and Terraform does not supply.
 *
 * `infra/environments/staging/main.tf` deliberately passes empty strings for
 * `websocket_url`/`cognito_user_pool_id`/`cognito_web_client_id` under the
 * trimmed landing+waitlist scope — there is no WebSocket API and no Cognito
 * pool in that scope at all. Every code path that reads the resulting
 * `NEXT_PUBLIC_*` values (`lib/cognito.ts`, `lib/chatSocket.ts`,
 * `/api/auth/refresh`, `/api/auth/session`) is already gated behind
 * `isLandingOnlyBuild()` and never runs in this mode, so requiring them here
 * would fail a build that is otherwise correct and complete. Confirmed live:
 * staging's first Amplify build failed exactly this way (2026-08-31) before
 * this waiver existed.
 *
 * `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_AWS_REGION` are deliberately
 * NOT in this set — the waitlist form itself calls the API base URL, and the
 * region is a hard ADR-20260514-01 requirement with no cost to keeping it
 * required.
 * @type {readonly string[]}
 */
export const LANDING_ONLY_WAIVED_ENV_VARS = Object.freeze([
  "NEXT_PUBLIC_WS_URL",
  "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
  "NEXT_PUBLIC_COGNITO_CLIENT_ID",
]);

/**
 * Recognized build-time variables that are NOT required — the build must
 * succeed whether or not these are set, in every environment.
 *
 * `NEXT_PUBLIC_LANDING_ONLY` (read by `src/lib/route-guard.ts`'s
 * `isLandingOnlyBuild()`) restricts the whole app to the landing page and
 * `/coming-soon` when set to the exact string `"true"`. It stays optional
 * deliberately: dev, CI, and any environment that hasn't opted into the
 * restricted landing+waitlist launch must build exactly as before with this
 * variable absent.
 * @type {readonly string[]}
 */
export const OPTIONAL_ENV_VARS = Object.freeze(["NEXT_PUBLIC_LANDING_ONLY"]);

/**
 * Pure validator: succeeds iff every required NEXT_PUBLIC_* variable is present
 * and non-empty, otherwise reports exactly the missing/empty variable names.
 *
 * A value counts as missing when it is undefined, null, or (after trimming)
 * an empty string. When `env.NEXT_PUBLIC_LANDING_ONLY` is exactly `"true"`,
 * the vars in `LANDING_ONLY_WAIVED_ENV_VARS` are skipped entirely — this is
 * the one build mode where Terraform intentionally leaves them empty and no
 * code path reads them.
 *
 * @param {Record<string, string | undefined | null>} [env] map of env values
 * @returns {{ ok: boolean, missing: string[] }} structured result
 */
export function validateEnv(env = {}) {
  const landingOnly = env.NEXT_PUBLIC_LANDING_ONLY === "true";
  const required = landingOnly
    ? REQUIRED_ENV_VARS.filter((name) => !LANDING_ONLY_WAIVED_ENV_VARS.includes(name))
    : REQUIRED_ENV_VARS;
  const missing = required.filter((name) => {
    const value = env[name];
    return value === undefined || value === null || String(value).trim() === "";
  });
  return { ok: missing.length === 0, missing };
}

/**
 * CLI entry point: reads from the supplied environment (defaults to
 * process.env), prints a result, and returns the process exit code.
 *
 * @param {Record<string, string | undefined | null>} [env]
 * @param {{ log?: (msg: string) => void, error?: (msg: string) => void }} [io]
 * @returns {number} 0 on success, 1 when one or more variables are missing/empty
 */
export function runCli(env = process.env, io = {}) {
  const log = io.log ?? ((msg) => console.log(msg));
  const error = io.error ?? ((msg) => console.error(msg));

  const { ok, missing } = validateEnv(env);
  if (ok) {
    log("[validate-env] All required NEXT_PUBLIC_* variables are present.");
    // Informational only — never affects the exit code. Lets an operator
    // confirm from the Amplify build log alone which variant just built,
    // without needing console/Terraform access to check the branch's env vars.
    if (env.NEXT_PUBLIC_LANDING_ONLY === "true") {
      log("[validate-env] NEXT_PUBLIC_LANDING_ONLY=true — building the restricted landing+waitlist-only variant.");
      log(`[validate-env] Waived (not required in this mode): ${LANDING_ONLY_WAIVED_ENV_VARS.join(", ")}`);
    }
    return 0;
  }

  error(
    "[validate-env] Build aborted: the following required environment " +
      "variables are missing or empty:",
  );
  for (const name of missing) {
    error(`  - ${name}`);
  }
  return 1;
}

// Run as a script only when invoked directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  process.exit(runCli());
}
