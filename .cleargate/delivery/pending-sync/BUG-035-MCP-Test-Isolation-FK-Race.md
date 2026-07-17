---
bug_id: BUG-035
parent_ref: STORY-047-01
parent_cleargate_id: "STORY-047-01"
sprint_cleargate_id: "SPRINT-36"
carry_over: false
status: Completed
severity: P1-High
reporter: SPRINT-36 verify (adversarial lenses)
approved: true
context_source: "verified codebase grounding (first-hand repro on mcp@8037b38 + parent 9f2204d) + recorded direct human approval (2026-06-04: 'fix harness first, then continue')"
area: mcp
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-04T00:00:00Z
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 0 declared-item (≥3 required)
  last_gate_check: 2026-06-04T17:34:51Z
stamp_error: no ledger rows for work_item_id BUG-035
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-04T20:13:28Z
  sessions: []
---

# BUG-035: mcp test suite — systemic cross-file FK seed race (Postgres 23503)

## 1. The Anomaly

**Expected:** `npm test` in `mcp/` runs deterministically — same commit, same result, green (or a stable known-failures baseline).

**Actual:** `npm test` is **non-deterministic**. On the same commit the failure count swings wildly (observed `122 → 2 → 0` full-suite fails with zero code change). The dominant failure is Postgres error **code 23503** — a foreign-key violation `Key (project_id)=… is not present in table projects` — raised when a test inserts a row (e.g. `app_tokens`, `members`, `invites`) referencing a `projects` row that a **sibling test file deleted mid-test**.

**Root cause:** ~20+ mcp test files run an **unconditional** `DELETE FROM projects` (and `DELETE FROM app_tokens` / `connections` / `pairings` / `admin_users`) in their `beforeEach`/setup, instead of scoping the delete to the file's own `created_by` / `ADMIN_ID`. When more than one thing touches the shared Postgres at once — concurrent test **files** (if `--test-concurrency` > 1), concurrent test **processes** (e.g. two `npm test` runs, or an orchestrator running multiple suite-readers against one DB), or an un-awaited teardown/seed window — one file's blanket `DELETE FROM projects` wipes another file's just-seeded fixture, and the dependent INSERT fails 23503. `--test-concurrency=1` (already set) reduces but does not eliminate the window, and `PG_POOL_MAX=1` (added by STORY-047-01's dev) does **not** fix it — it serializes one pool, not the blanket deletes across files.

**Pre-existing:** baseline parent `9f2204d` (before SPRINT-36) already runs ~30 fail / ~23× 23503. This bug predates EPIC-047; STORY-047-01 merely surfaced it (its new tables make the FK violation loud, and its adversarial verify re-ran the full suite repeatedly and concurrently).

**Impact on the sprint:** the DoD gate "`npm test` green for mcp/" cannot be satisfied by any mcp story (047-01..04) while the suite is non-deterministic — every story ESCALATES for the same reason. This is a **sprint-blocking** test-infrastructure defect, not a defect in any one story's production code (STORY-047-01's impl is verified correct and passes 16/16 in isolation).

## 2. Reproduction Protocol

```bash
cd /Users/ssuladze/Documents/Dev/ClearGate/mcp
# Real Postgres 18 @ localhost:5433 (container cleargate-postgres), DATABASE_URL set in .env
npm test ; npm test ; npm test     # 3 consecutive runs → failure count varies; 23503 FK violations appear non-deterministically
```

Isolated (single file, no siblings) — **always green**, proving impl/test design are sound and the fault is cross-file isolation:

```bash
PG_POOL_MAX=1 node --test --test-concurrency=1 --experimental-test-module-mocks --env-file=.env --import tsx/esm 'test/credential-*.node.test.ts'   # 16/16 green, deterministic
```

## 2.5 Impact

- **Edge condition:** the race only fires under contention (≥2 concurrent DB touchers, or an un-awaited seed/teardown overlap). A lucky single serial run can be green, masking the defect — which is exactly why a dev "N/N green" claim can be true once and false on re-run.
- **Risk if unfixed:** every mcp story this sprint ESCALATES on a flaky gate; the orchestrator's adversarial verify (parallel lenses each running the live suite) manufactures additional 23503s; CI/local "green" is untrustworthy.
- **Risk of the fix:** scoping deletes per-file requires each file's INSERTs and DELETEs to agree on one `created_by`/`ADMIN_ID`. Done wrong, a file could leave rows behind that break a sibling's clean-slate assumption, OR a too-broad scope could mask a genuine failure. The fix must NOT delete, skip, weaken, or vacuous-ify any existing assertion — isolation only.

## 3. Evidence & Context

- Full-suite RUN 1: 522 tests, 122 FAIL (67× 23503). RUN 2 (identical commit): 522 tests, 2 FAIL. Isolated 047 run 1: 3/16 FAIL; reruns 2–4: 16/16. (SPRINT-36 STORY-047-01 verify lenses, mcp@8037b38.)
- FK error: `app_tokens_project_id_projects_id_fk` violation, code 23503, `Key (project_id)=<uuid> is not present in table projects`.
- **Correct pattern already in-repo** — `test/credential-verify-trace.node.test.ts:59-61`:
  ```
  DELETE FROM app_tokens WHERE project_id IN (SELECT id FROM projects WHERE created_by = ${ADMIN_ID}::uuid)
  DELETE FROM projects   WHERE created_by = ${ADMIN_ID}::uuid
  DELETE FROM admin_users WHERE id = ${ADMIN_ID}::uuid
  ```
- **Wrong pattern** — e.g. `test/credential-verify.red.node.test.ts:60-63`, `test/push-item-*.red.node.test.ts`, `test/pull-item-404.red.node.test.ts`, `src/tools/*.node.test.ts`, `src/auth/service-token.node.test.ts:80`, `src/middleware/audit.node.test.ts:30`, … : `await db.execute(sql\`DELETE FROM projects\`)` (no WHERE), and bare `DELETE FROM app_tokens/connections/pairings/admin_users`.
- 40 files contain `DELETE FROM projects`; ~20+ are unconditional. 13 distinct `ADMIN_ID` constants already exist (files mostly already use unique IDs — they just don't scope their deletes to them). No shared test-helper module exists; each file rolls its own setup.

## 4. Execution Sandbox

- **Repo:** `/Users/ssuladze/Documents/Dev/ClearGate/mcp` (separate git, origin `sandrinio/cleargate-mcp`). Branch **off `main`**: `fix/mcp-test-isolation`.
- **In scope:** every `**/*.node.test.ts` under `mcp/test/`, `mcp/src/`, `mcp/scripts/` that performs an unconditional fixture DELETE. Scope each cleanup DELETE to the file's own `ADMIN_ID`/`created_by` (the `credential-verify-trace.node.test.ts` pattern). Where a file lacks a unique `ADMIN_ID`, give it one. Prefer a small shared helper (e.g. `test/support/db-fixture.ts` exporting `scopedCleanup(db, adminId)` + a `uniqueAdminId(seed)` minter) and adopt it, IF that reduces churn/risk vs per-file edits — developer's call, but document the choice.
- **Out of scope:** NO production-code changes (no `src/**` non-test files except if a test imports a missing helper you add under `test/`). NO assertion changes. NO test deletions/skips. Do not "fix" failures by weakening tests. The STORY-047-01 `PG_POOL_MAX=1` change (package.json + `src/db/client.ts`) may stay (harmless) or be reverted — note which and why.

## 5. Verification Protocol

The fix is proven when **all** hold:

1. **Determinism gate:** `npm test` run **3 consecutive times, serially** (one run fully finishes before the next starts) → **identical** result each time, **0× code-23503** FK violations.
2. **Green (or declared baseline):** the suite is green; OR any residual NON-race failures are itemized with root cause (real bug → note for a separate ticket; do NOT mask). Target: 0 fail. Report the exact final `tests/pass/fail/skip` line.
3. **No weakening:** `git diff main` touches test files only; no `it.skip`/`.only`/`todo` added; no assertions removed; assertion/`it()` counts preserved or higher. `tsc --noEmit` clean.
4. **Concurrency-safe (stretch, report only):** note whether two concurrent `npm test` processes against one DB still collide (they will if both runs use the same ADMIN_ID constants — this is the orchestrator's separate concern re: per-run DB isolation, not required for this Bug's close).

---

### Ambiguity Gate
- [x] Repro is deterministic enough to act on (race is contention-dependent but root cause + fix pattern are unambiguous and grounded in first-hand evidence).
- [x] Scope is bounded (test files only; no production code; no assertion changes).
- [x] Fix pattern is specified (per-file scoped DELETE; in-repo exemplar cited).
- [x] Human approved the path (2026-06-04: "fix harness first, then continue").

🟢 — local/pre-member (not pushed); Triaged + approved for fix dispatch.

---

## 6. Resolution (Completed 2026-06-05)

Fixed in mcp `main` (local-only, unpushed) across two commits:
- `bcf3f15` / merge `ba244fb` — scoped per-file fixture deletes across 38 test files + new shared helper `test/support/db-fixture.ts` (`scopedCleanup`, `uniqueAdminId`, `scopedCleanupByHandle`). Kills the dominant `projects` FK 23503 race.
- `2f3f360` / merge `f58840d` — `admin-users.node.test.ts` FK-safe-clears FOREIGN admins in `beforeEach` (bootstrapAdmin precedent; `=== 3` assertion unchanged). Kills the full-table admin-count residual.

**Verified:** full `npm test` **509-green (047-less branch) and 525/524/0/1 (with STORY-047-01) — 5× serial, identical, 0 race-23503.** `--test-concurrency=1` confirmed to truly serialize files end-to-end (handle-transition probe) — the residual leaks were **cross-PROCESS** (a separate run's leftover rows on the shared `:5433` DB), not intra-run overlap. Test files only; 0 assertions weakened; typecheck clean.

### Open follow-up (out of this Bug's scope)
- **`audit.node.test.ts` `244 != 250`** — same cross-PROCESS class: a sibling's wholesale `DELETE FROM audit_log` (no inbound FK → 23503-safe, so BUG-035's scoping deliberately left it global) can wipe this file's 250 audit rows IF a *second process* runs concurrently. Does NOT reproduce in clean serial runs (the authoritative gate), so non-blocking. **Root cure = per-process DB isolation** (each concurrent `npm test` gets its own database), which also removes the orchestrator's need to serialize verify lenses. Track as a future test-infra item if parallel CI is ever introduced.
