---
story_id: STORY-028-08
parent_epic_ref: EPIC-028
parent_cleargate_id: EPIC-028
sprint_cleargate_id: SPRINT-28
carry_over: false
area: docs,agents,flashcard,ci
status: Draft
approved: false
ambiguity: 🟢 Low
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
lane: fast
context_source: |
  EPIC-028 §7 Batch 4 (final): Docs + agent prompts + FLASHCARD + the
  no-vitest CI guard. Per EPIC-028 §0 architecture rules, post-EPIC the repo
  has zero vitest references; this story enforces "stay zero" via a
  check:no-vitest npm script.

  Depends on STORY-028-05/-06/-07 — vitest must be gone from all three
  packages BEFORE the docs declare it gone. Last story of EPIC-028.

  Per FLASHCARD 2026-05-04 `#mirror #dogfood-split`: live `.claude/agents/`
  is gitignored; canonical edits to agent prompts require post-merge
  `cleargate init` re-sync OR hand-port. Touch canonical only; reminder
  goes in the PR description.
created_at: 2026-05-17T16:40:00Z
updated_at: 2026-05-17T16:40:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-17T19:19:22Z
stamp_error: no ledger rows for work_item_id STORY-028-08
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-17T19:19:22Z
  sessions: []
---

# STORY-028-08: Docs + Agent Prompts + FLASHCARD + No-Vitest Guard

**Complexity:** L1 — doc edits (CLAUDE.md + developer.md + FLASHCARD) + one tiny npm script + one pre-commit hook line. ~30 LOC across files.

## 1. The Spec

### 1.1 User Story

As a future ClearGate contributor, I want CLAUDE.md and developer.md to say "node:test is the only runner" with no residual two-runner language, the FLASHCARD to capture the EPIC-028 lesson, and a pre-commit guard to fail any future commit reintroducing `from 'vitest'` — so that the single-runner state is documented AND enforced.

### 1.2 Detailed Requirements

1. **`CLAUDE.md` (live)** — find and replace:
   - Any mention of "two-runner" / "permanent two-runner state" / "vitest + node:test" / "npm run test:vitest" → remove or rewrite to single-runner language.
   - Add one line under "Test + commit conventions" section: `- **Single test runner:** node:test only (via tsx). Adding vitest back is forbidden — see EPIC-028 closure 2026-NN-NN.`
2. **`cleargate-planning/CLAUDE.md`** — mirror the same edit.
3. **`cleargate-planning/.claude/agents/developer.md`** — canonical agent prompt. Update test-runner section:
   - Drop any "use vitest" / "either runner" language.
   - Single rule: tests use `node:test` via `tsx --test`. File naming: `*.node.test.ts`. Real-infra invariant retained.
   - Live `.claude/agents/developer.md` is gitignored; PR description reminds the human to run `cleargate init` post-merge OR hand-port.
4. **`.cleargate/FLASHCARD.md`** — append one new line at TOP (newest):
   ```
   2026-05-NN · #vitest #migration #node-test · EPIC-028 shipped: vitest fully eliminated from mcp/, cleargate-cli/, admin/. `npm test` is node:test only; *.node.test.ts is the only file naming. Adding vitest back is forbidden — check:no-vitest pre-commit guard enforces.
   ```
5. **No-vitest pre-commit guard**:
   - Add an npm script `"check:no-vitest"` to the ROOT-level package.json (if one exists) OR to each of the 3 package.jsons. Script: `! grep -r "from 'vitest'" --include='*.ts' --exclude-dir=node_modules --exclude-dir=dist . || (echo 'Error: vitest reference detected — repo is node:test only (EPIC-028)'; exit 1)`.
   - Wire into the pre-commit hook at `.claude/hooks/pre-commit-surface-gate.sh` (per FLASHCARD 2026-05-04 `#pre-commit #stub-extension`: extensions go IN the stub BEFORE the exec line, not in the delegated script). Add a line invoking `npm run check:no-vitest -s` and abort on non-zero.
   - For consistency: also expose the check via `cleargate-cli/src/lib/gate/no-vitest-check.ts` (or whatever existing gate-check module pattern fits — there is no `gate/` directory today, so this is a lightweight standalone script call from the hook; do NOT introduce a new gate-check abstraction).
6. **Wiki rebuild** — after the commit, run `cleargate wiki build` to refresh log.md/index.md entries.

### 1.3 Out of Scope

- New gate-check framework / module under `cleargate-cli/src/lib/gate/`. The pre-commit guard is a single grep invocation.
- Updating archived FLASHCARDs (history is append-only).
- Re-running `cleargate init` autoMatically — the PR description carries the reminder; human owns the re-sync.
- Coverage tool replacement.

### 1.4 Open Questions

- **Question:** Should `check:no-vitest` also enforce that no `vitest.config.*` file reappears?
- **Recommended:** Yes — extend the grep with a second pass: `find . -name 'vitest.config.*' -not -path '*/node_modules/*' | grep . && exit 1`. Cheap belt-and-suspenders.
- **Human decision:** Developer's call.

### 1.5 Risks

| Risk | Mitigation |
|---|---|
| CLAUDE.md two-runner language exists in multiple places; one gets missed | Grep first: `rg "two-runner|two runner|test:vitest|vitest" CLAUDE.md cleargate-planning/CLAUDE.md` — fix every hit |
| Pre-commit hook makes legitimate non-test mentions of "vitest" fail (e.g. archived FLASHCARDs) | Grep limits to `*.ts` files only; FLASHCARD.md is `.md` → not scanned |
| Live `.claude/agents/developer.md` not re-synced post-merge → live agent behaves out-of-date | PR description includes "Reminder: run `cleargate init` to re-sync `/.claude/agents/`" |

### 1.6 Existing Surfaces

- **Surface:** `CLAUDE.md` (live, repo root).
- **Surface:** `cleargate-planning/CLAUDE.md` (canonical).
- **Surface:** `cleargate-planning/.claude/agents/developer.md` (canonical agent prompt).
- **Surface:** `.cleargate/FLASHCARD.md` (append-only log).
- **Surface:** `.claude/hooks/pre-commit-surface-gate.sh` (live stub; see FLASHCARD 2026-05-04 `#pre-commit #stub-extension` for the in-stub-before-exec pattern).
- **Surface:** package.json scripts in mcp/, cleargate-cli/, admin/.
- **Coverage of this story's scope:** ~90% — pure doc + guard wiring; no new abstraction.

### 1.7 Why not simpler?

- **Smallest existing surface that could carry this:** docs-only, no pre-commit guard.
- **Why isn't extension sufficient?** Without the guard, a future Dev could re-introduce `from 'vitest'` accidentally (FLASHCARD 2026-05-04 `#node-test #child-process` shows how a single bad env var silently nukes test discovery). The 3-line grep guard is cheap insurance.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Docs + no-vitest guard

  Scenario: CLAUDE.md no longer mentions two-runner
    Given STORY-028-08 commit
    When `rg "two-runner|two runner|test:vitest" CLAUDE.md cleargate-planning/CLAUDE.md` runs
    Then 0 matches
    And both files contain a "Single test runner: node:test only" line

  Scenario: developer.md updated
    Given STORY-028-08 commit
    When developer.md is read
    Then no "vitest" mention remains except possibly in a "deprecated:" history note
    And the file states tests use node:test via tsx with `*.node.test.ts` naming

  Scenario: FLASHCARD entry appended
    Given STORY-028-08 commit
    When `head -1 .cleargate/FLASHCARD.md | grep "#vitest #migration #node-test"` runs
    Then exit code is 0 (newest line tagged correctly)

  Scenario: Pre-commit guard catches a reintroduction
    Given STORY-028-08 commit + the no-vitest guard wired
    When a Dev stages a new test file with `import { test } from 'vitest'` and runs `git commit`
    Then the pre-commit hook fails with "Error: vitest reference detected — repo is node:test only (EPIC-028)"
    And the commit is blocked

  Scenario: check:no-vitest npm script
    Given STORY-028-08 commit
    When `npm run check:no-vitest` runs in repo root (or each package)
    Then exit code is 0 (no vitest references in any *.ts file or vitest.config.*)
```

### 2.2 Verification Steps (Manual)

- [ ] `rg "from 'vitest'" --include='*.ts' --exclude-dir=node_modules --exclude-dir=dist .` returns 0 matches.
- [ ] `find . -name 'vitest.config.*' -not -path '*/node_modules/*'` returns 0 files.
- [ ] Simulate a reintroduction: add `import { test } from 'vitest';` to a scratch file; run check:no-vitest; verify it fails; revert.

## 3. Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary Files | `CLAUDE.md`, `cleargate-planning/CLAUDE.md`, `cleargate-planning/.claude/agents/developer.md`, `.cleargate/FLASHCARD.md` |
| Hook | `.claude/hooks/pre-commit-surface-gate.sh` (insert grep call BEFORE the exec line) |
| Scripts | `mcp/package.json`, `cleargate-cli/package.json`, `admin/package.json` (add `check:no-vitest` script to each) |
| New Files Needed | No |

### 3.2 Technical Logic

1. Grep CLAUDE.md (both copies) for two-runner language; rewrite to single-runner.
2. Edit developer.md test-runner section to single-rule.
3. Prepend FLASHCARD entry per §1.2 step 4 (newest line at top — FLASHCARD convention).
4. Add `"check:no-vitest": "..."` script to all 3 package.json files.
5. Insert hook line BEFORE `exec` in pre-commit-surface-gate.sh:
   ```
   if ! npm run check:no-vitest -s --prefix mcp 2>/dev/null && ! npm run check:no-vitest -s --prefix cleargate-cli 2>/dev/null && ! npm run check:no-vitest -s --prefix admin 2>/dev/null; then exit 1; fi
   ```
   (Actual command: grep all 3 packages; abort on any non-zero.)
6. Run `cleargate wiki build` post-commit.

### 3.3 API Contract

CLI: `npm run check:no-vitest` (per package) — exit 0 = clean, exit 1 = vitest reintroduced.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Grep-based assertions | 3 | CLAUDE.md, developer.md, FLASHCARD |
| Guard works on reintroduction | 1 | Manual scratch verification (recorded in commit message) |

### 4.2 Definition of Done

- [ ] Both CLAUDE.md files updated; rg grep clean.
- [ ] developer.md updated.
- [ ] FLASHCARD entry at top.
- [ ] `check:no-vitest` script in all 3 package.json files.
- [ ] Pre-commit hook calls the guard before its exec line.
- [ ] `cleargate wiki build` ran post-commit.
- [ ] PR description reminds human to run `cleargate init` to re-sync `/.claude/agents/`.

## Existing Surfaces

- **Surface:** `CLAUDE.md` — repo-root live copy.
- **Surface:** `cleargate-planning/CLAUDE.md` — canonical mirror.
- **Surface:** `cleargate-planning/.claude/agents/developer.md` — canonical agent prompt.
- **Surface:** `.cleargate/FLASHCARD.md` — append-only log.
- **Surface:** `.claude/hooks/pre-commit-surface-gate.sh` — live stub; see FLASHCARD 2026-05-04 `#pre-commit #stub-extension` for the in-stub-before-exec pattern.
- **Surface:** `mcp/package.json` + `cleargate-cli/package.json` + `admin/package.json` — three workspace package.json files for `check:no-vitest` script wiring.
- **Coverage of this story's scope:** ~90% — pure doc + guard wiring; no new abstraction.

## Why not simpler?

> See §1.7.

## Ambiguity Gate
🟢 Low — one open question on extending the guard to vitest.config files; either resolution acceptable.
