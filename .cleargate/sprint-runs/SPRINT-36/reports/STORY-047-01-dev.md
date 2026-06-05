# STORY-047-01 — Developer Report (rework attempt 3)

role: developer · SPRINT-36 · EPIC-047 · repo: mcp · branch: story/STORY-047-01

## Verdict
DONE. Full `npm test` is now **deterministically green — 10/10 runs, 521 pass / 0 fail / 1 pre-existing skip**. Typecheck clean.

## What this rework changed
The prior commit (99d7450) was substance-correct per all three QA lenses (indexed O(1) verify, fail-closed, bcrypt cost-12, additive migration 0010, created_by columns). The FALSIFICATION was a **test-isolation flake**, not a logic defect: ~1/3 of full-suite runs failed with PG `23503` FK violations (`app_tokens_project_id_projects_id_fk`) during the red/trace files' `seedAppToken` INSERT.

### Root cause (proven, not guessed)
node:test runs the `it()` subtests inside a single `describe(...)` **concurrently** (the `--test-concurrency=1` flag only serializes *files*, not subtests within a file). The frozen `credential-verify.red.node.test.ts` uses ONE shared `ADMIN_ID` across all 4 subtests and an **unscoped** `beforeEach` (`DELETE FROM app_tokens` + `DELETE FROM projects WHERE created_by = ADMIN_ID`). When subtests interleave under suite-wide DB load, one subtest's `beforeEach` DELETE lands between another subtest's `seedProject()` (commit) and `seedAppToken()` (INSERT) — across two different pooled connections (pool `max:20`) — so the app_tokens INSERT references a project that was just deleted -> FK 23503. Reproduced exactly with a `Promise.allSettled` probe of 4 concurrent seed sequences (9 fails at max:20, 0 fails at max:1).

The two `.red.node.test.ts` files are **frozen acceptance** — I could not (and did not) edit them, so the fix had to live at a layer I control.

### The fix (2 files, minimal, no production-behavior change)
1. `src/db/client.ts` — `buildPool` now reads an optional `PG_POOL_MAX` env override; **defaults to 20** when unset (production is unaffected — the var is only set in the test script).
2. `package.json` — the `test` script now prefixes `PG_POOL_MAX=1`. A single shared connection serializes all DB work in the test process in FIFO order, guaranteeing read-after-write visibility and eliminating the cross-connection seed race **regardless of node:test's concurrent subtest scheduling**.

No deadlock materialized: the full suite (including the `db.transaction()` paths in push-item/sync-work-items/bootstrap/admin-users) passes cleanly at `max:1` across all 10 runs.

## Files changed (this rework)
- `mcp/src/db/client.ts` — env-overridable pool max (default 20)
- `mcp/package.json` — `PG_POOL_MAX=1` on the test script

(Unchanged from prior commit 99d7450 and re-verified byte-identical: `src/db/schema.ts`, `src/db/migrations/0010_demonic_tana_nile.sql`, `src/db/migrations/meta/*`, `src/auth/credential-verify.ts`, `test/credential-verify-trace.node.test.ts`.)

## Verification performed
- `npm run db:migrate` -> migration 0010 applied to fresh PG18 @ localhost:5433 (journal idx 10, no 0009 collision). `\d app_tokens` confirms `idx_app_tokens_token_id` UNIQUE btree(token_id), `app_tokens_project_id_projects_id_fk` CASCADE, token_id NOT NULL text, created_by uuid nullable.
- `npm run typecheck` -> exit 0.
- `npm test` -> **10/10 green**, 521 pass / 0 fail / 1 skip every run.
- DoD §4.2 grep: `credential-verify.ts` has NO executable `for (const row of rows)` and NO unfiltered app_tokens SELECT — the only such string is a doc comment naming the avoided anti-pattern.
- Regression-guard proof: temporarily swapped the impl for the forbidden whole-table scan -> `credential-verify-trace.node.test.ts` FAILED (2 fail), confirming the trace spies are non-vacuous. Reverted; impl byte-identical to 99d7450.

## Deviations from story surface
- `src/db/client.ts` and `package.json` are not in the story's §3.1 file table. They are the minimal, in-`mcp/` test-isolation fix required to make the frozen red tests pass deterministically (the §4.2 DoD "npm test green" gate). The production pool default (20) is unchanged. EPIC-027 boundary respected — no `cleargate-cli/src` or `.claude/` touched.

## Script incidents
None.
