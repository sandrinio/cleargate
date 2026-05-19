---
story_id: STORY-068-01
parent_epic_ref: CR-068
parent_cleargate_id: CR-068
sprint_cleargate_id: SPRINT-30
carry_over: false
area: cli/init,security
status: Approved
approved: true
approved_at: 2026-05-19T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: fast
context_source: |
  Decomposed from CR-068 at SPRINT-30 SDR 2026-05-19. CR-068 is a single
  call-site refactor; one story covers the audit + fix + regression guard.

  Audit during decomposition surfaced two `shell: true` call sites in
  cleargate-cli/src/: init.ts:452 and gate-run.ts:80. The init.ts site
  is the DEP0190 emitter observed during pdf_processor's 2026-05-18
  install. gate-run.ts:80 is the configured-gate-command runner and
  intentionally accepts user-provided strings — keep `shell: true` there,
  but document the trust boundary.

  Net effect: silence the deprecation warning AND tighten the security
  smell at the only site where it was unintentional. Grep regression
  guard via npm script prevents reintroduction.
created_at: 2026-05-19T00:00:00Z
updated_at: 2026-05-19T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-19T16:01:55Z
stamp_error: no ledger rows for work_item_id STORY-068-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-19T16:01:55Z
  sessions: []
---

# STORY-068-01: Drop `shell: true` from `cleargate init` child_process spawns + add grep regression guard

**Complexity:** L1 — one localized call-site edit + one new test assertion + one new npm script. ~30 LOC delta.

## 1. The Spec

### 1.1 User Story

As a fresh-machine onboarding user running `cleargate init`, I want zero `DEP0190 DeprecationWarning` lines in the install transcript, so that (a) the transcript reads clean, (b) the security smell of unescaped arg concatenation is removed, and (c) the install survives the future Node major that upgrades DEP0190 from warning to runtime throw.

### 1.2 Detailed Requirements

1. **Remove `shell: true`** from the spawn/exec call at `cleargate-cli/src/commands/init.ts:452`. Replace with the default `{ shell: false }` and pass args as an array. The command and its args at this site are trusted constants — no shell features required.
2. **Document the intentional `shell: true` retention** at `cleargate-cli/src/commands/gate-run.ts:80`. That site executes user-configured gate-command strings (e.g. `npm run lint && tsc --noEmit`) where shell features (pipes, chains) are the contract. Add a one-line code comment naming the trust boundary so future audits don't churn on it.
3. **Add an npm script** `check:no-shell-true-in-init` to `cleargate-cli/package.json`. Implementation: `! grep -n 'shell: true' src/commands/init.ts` (exits non-zero if grep finds a match). Wire into the existing `check:*` family so CI catches regressions.
4. **Add a test case** to `cleargate-cli/test/commands/init.node.test.ts` asserting that `cleargate init` stdout+stderr contains neither `DEP0190` nor `DeprecationWarning`. Real-process spawn against a tmpdir-built fixture repo.

### 1.3 Out of Scope

- Refactoring `gate-run.ts` to avoid `shell: true` — its semantics genuinely require shell features.
- Auditing the entire `cleargate-cli/src/` tree for other `shell: true` usages outside `init.ts` and `gate-run.ts`. The two sites above are exhaustive per the audit grep.
- Behavior changes to init itself (file scaffold, bounded-block injection, MCP registration). Pure noise/security fix.

### 1.4 Open Questions

None. CR-068 Open Question #1 resolved by the decomposition audit (call site is `init.ts:452`); Open Question #2 resolved as "yes, narrow audit" — only `init.ts` and `gate-run.ts` carry the pattern, and `gate-run.ts` is intentionally retained.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| Dropping `shell: true` breaks args that relied on shell-quoting (e.g. paths with spaces) | The call site uses array-form args; array form is shell-quoting-safe by construction. Verified by the new test running against a tmpdir whose path may include spaces. |
| New grep-gate npm script accidentally false-positives on a comment mentioning the string | Grep targets `init.ts` only and the file currently has no `shell: true` comments; once removed, no comment will reintroduce the literal string. |

### 1.6 Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/init.ts:452` — the `shell: true` spawn call this story edits.
- **Surface:** `cleargate-cli/src/commands/gate-run.ts:80` — intentional `shell: true` site (user-supplied gate commands); story adds a trust-boundary comment but does NOT remove.
- **Surface:** `cleargate-cli/test/commands/init.node.test.ts` — existing init test file; story adds the DEP0190 assertion here.
- **Coverage of this story's scope:** ~80% — pure call-site refactor inside existing files. No new abstractions.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** the single-line edit at `init.ts:452` itself.
- **Why isn't extension sufficient?** The single-line edit IS the entire fix. The story wraps it with a test assertion and a grep-gate npm script to prevent regression. Without the grep gate, a future contributor reintroducing `shell: true` would not be caught until DEP0190 fires again at runtime.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: cleargate init emits no DEP0190 deprecation warning

  Scenario: fresh init in a tmpdir repo produces clean transcript
    Given a fresh git-initialized tmpdir
    When I run `cleargate init` in that tmpdir
    Then stdout+stderr contains no "DEP0190" substring
    And stdout+stderr contains no "DeprecationWarning" substring
    And init exits 0

  Scenario: grep-gate npm script catches regression
    Given the codebase post-fix
    When I run `npm run check:no-shell-true-in-init`
    Then it exits 0
    And the script body is `! grep -n 'shell: true' src/commands/init.ts`
```

### 2.2 Verification Steps (Manual)

- [ ] Run `cleargate init` in a fresh tmpdir on Node 24+ — no DEP0190 in transcript.
- [ ] Manually reintroduce `shell: true` to init.ts:452 → `npm run check:no-shell-true-in-init` exits non-zero.
- [ ] `npm run typecheck` clean.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/init.ts` |
| Related Files | `cleargate-cli/src/commands/gate-run.ts` (one-line comment only), `cleargate-cli/package.json` (new npm script) |
| Test File | `cleargate-cli/test/commands/init.node.test.ts` |
| New Files Needed | No |

### 3.2 Technical Logic

1. At `cleargate-cli/src/commands/init.ts:452`, change `{ shell: true, ... }` → `{ ...other-opts-only }`. Args must already be in array form at this site (the DEP0190 trigger is the specific combination of arg-array + shell:true).
2. At `cleargate-cli/src/commands/gate-run.ts:80`, add one comment line above the spawn: `// Intentional shell:true — gate-command strings are user-configured and may include pipes/chains. Args are not concatenated; the entire command is one string.`
3. In `cleargate-cli/package.json` `scripts` block, add: `"check:no-shell-true-in-init": "! grep -n 'shell: true' src/commands/init.ts"`. Wire into the existing aggregate check script if one exists (e.g. `npm run check:all`).
4. In `cleargate-cli/test/commands/init.node.test.ts`, add a test that spawns the built CLI against a tmpdir fixture and asserts the absence of `DEP0190` / `DeprecationWarning` in combined stdout+stderr.

### 3.3 API Contract

N/A — no exported API change.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Integration — fresh init transcript | 1 | Asserts absence of DEP0190 |
| Script gate | 1 | `npm run check:no-shell-true-in-init` exits 0 post-fix |

### 4.2 Definition of Done

- [ ] `cleargate-cli/src/commands/init.ts` no longer contains `shell: true`.
- [ ] `cleargate-cli/src/commands/gate-run.ts` has trust-boundary comment above its retained `shell: true`.
- [ ] `cleargate-cli/package.json` has the new `check:no-shell-true-in-init` script.
- [ ] New test in `cleargate-cli/test/commands/init.node.test.ts` passes.
- [ ] `npm run typecheck` + `npm test` green in cleargate-cli/.
- [ ] Manual: fresh `cleargate init` on Node 24+ shows no DEP0190.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/init.ts` — DEP0190 emitter at line 452; this story removes the `shell: true` opt.
- **Surface:** `cleargate-cli/src/commands/gate-run.ts` — intentional `shell: true` site; story adds a one-line comment naming the trust boundary.
- **Surface:** `cleargate-cli/test/commands/init.node.test.ts` — existing init integration tests; story adds the DEP0190-absence assertion.
- **Surface:** `cleargate-cli/package.json` — gains a new `check:no-shell-true-in-init` script entry.
- **Coverage of this story's scope:** ~80% — pure call-site edit inside existing files plus one new npm script row.

## Why not simpler?

> See §1.7 above.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — call site localized to `init.ts:452`; one-line fix.

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved CR.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] §1.6 Existing Surfaces cites at least one source-tree path.
- [x] §1.7 Why not simpler? has both sub-bullets answered.
