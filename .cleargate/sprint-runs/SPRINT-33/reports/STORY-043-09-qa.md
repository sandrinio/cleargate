# STORY-043-09 QA Report

role: qa  
Mode: VERIFY  
Branch: story/STORY-043-09  
Commits: accb65a (impl) + 0140b3a (comment-removal)  
Date: 2026-06-01

---

## Summary

STORY: STORY-043-09
QA: PASS
TYPECHECK: pass
TESTS: 2400 total — 2270 passed, 91 failed, 39 cancelled, 0 skipped (full suite)
ACCEPTANCE_COVERAGE: 3 of 3 Gherkin scenarios have matching tests (both red suites: 26/26 pass)
MISSING: none
REGRESSIONS: none (91 failures confirmed pre-existing — none in cli-surface-hygiene.red.node.test.ts or write-dispatch-fallback.red.node.test.ts; all failures are in auth/admin/gate/changelog/state/mcp — untouched surfaces)

---

## Detailed Findings

### 1. Red Suite Results

Both red test suites run green (26/26 tests pass, 0 skipped):

- `test/commands/cli-surface-hygiene.red.node.test.ts` — 18/18 pass
  - Scenario A (8 sub-tests): all 8 plumbing commands carry `{ hidden: true }` in their `.command()` call
  - Scenario B (8 sub-tests): all 8 plumbing commands retain `.action(` handlers (callability preserved)
  - Scenario C: `story complete` description contains no "stub" substring
  - Scenario D: `src/lib/triage-classifier.ts` does not exist

- `test/scripts/write-dispatch-fallback.red.node.test.ts` — 8/8 pass
  - Scenario 1 (3 sub-tests): script exits 0 as no-op when same-session auto-marker exists; count stays 1
  - Scenario 2 (4 sub-tests): script writes exactly 1 marker when no prior marker exists; work_item_id + agent_type + session_id correct

### 2. Hidden + Callable

Eight commands confirmed `{ hidden: true }` in `src/cli.ts`:
- Line 168: `stamp <file>`
- Line 187: `ingest <file>` (under `wiki` subcommand)
- Line 284: `qa <worktree> <branch>` (under `gate` subcommand)
- Line 292: `arch <worktree> <branch>` (under `gate` subcommand)
- Line 352: `reconcile-lifecycle <sprint-id>`
- Line 429: `update <story-id> <new-state>` (under `state` subcommand)
- Line 442: `validate <sprint-id>` (under `state` subcommand)
- Line 454: `stamp-tokens <file>`

All 8 retain `.action(` handlers (verified by Scenario B tests). `grep -c "hidden plumbing:" src/cli.ts` → 0 (no test-appeasement cruft, confirmed by commit 0140b3a removal).

### 3. No-stub

`story complete` description at `cli.ts:418` reads: `mark a story complete and clean up its worktree` — no `stub` substring. Confirmed by grep and Scenario C test.

### 4. Orphan Deletion

- `cleargate-cli/src/lib/triage-classifier.ts` — DELETED (confirmed `ls` → not found)
- `cleargate-cli/test/lib/triage-classifier.red.node.test.ts` — DELETED (confirmed `ls` → not found)
- Dangling refs: `grep -rn "triage-classifier|triageClassifier" cleargate-cli/src/ cleargate-planning/.claude/` → 0 results
- §C.10 of SKILL.md references `mid-sprint-triage-rubric.md` (external doc), not `triage-classifier.ts` — no dangling ref

Commit body (accb65a) records orphan audit verdict:
> Other zero-src/-callers found: frontmatter-merge, ledger, pricing, script-incident — all imported by tests, NOT deleted (referenced by test harness, not dead code). No other orphans to delete.

### 5. write_dispatch.sh

- Fallback guard present at lines 81-97 of both copies: iterates `.dispatch-*.json` in sprint dir, detects auto-marker by `session_id == CLAUDE_SESSION_ID AND writer starts with "pre-tool-use-task.sh"`, exits 0 if found.
- Scenario 1 test passes: seeded auto-marker (writer=`pre-tool-use-task.sh@cleargate-0.13.0`) → script exits 0, marker count stays 1.
- Scenario 2 test passes: no prior marker → script writes exactly 1 marker with correct fields.
- Byte-identity check: `diff .cleargate/scripts/write_dispatch.sh cleargate-planning/.cleargate/scripts/write_dispatch.sh` → BYTE_IDENTICAL (verified).

### 6. SKILL.md Prose

Section header (line 82): "Dispatch marker — written automatically before every spawn (fallback only)"
Line 84: "The **primary path** is the PreToolUse:Task hook (`pre-tool-use-task.sh`)... The manual script below is a **fallback**..."
Line 93: "The script is idempotent: if a same-session auto-marker (written by `pre-tool-use-task.sh`) already exists for the current session, it exits 0 without writing a duplicate."

§C.10 (lines 511-526): references `mid-sprint-triage-rubric.md` only — no reference to deleted `triage-classifier.ts`. Confirmed no dangling reference.

### 7. Regression Confirmation

Full suite: 2400 tests, 91 fail. Failure sources confirmed pre-existing (all unrelated to this story):
- `test/auth/` — AdminApiClient, acquireAccessToken, keychain-store (auth infra failures)
- `test/commands/` — CHANGELOG format, cleargate CLI e2e, gate qa/arch v1/v2, state update/validate v1/v2, Scenario 5 wiki/index.md Hotfix Ledger
- `test/wiki/` — `contradict-cli.node.test.ts` (`it is not defined`), `ingest.node.test.ts` (`require is not defined`)
- `test/` — mcpServeHandler, createTokenStore, protocol Abandoned scenario

None of these test files were touched by commits accb65a or 0140b3a. No new test failures introduced.

### 8. Typecheck

`npm run typecheck` → exit 0, no errors.

---

HIDDEN_CALLABLE: 8 hidden + all still callable (action handlers present) + 0 cruft comments
ORPHAN: triage-classifier.ts + its red test gone; 0 dangling refs in src/ or canonical SKILL.md
WRITE_DISPATCH: fallback-only (exits 0 no-op when auto-marker present) + byte-identical between .cleargate/scripts/ and cleargate-planning/.cleargate/scripts/
SKILL_PROSE: fallback wording confirmed; §C.10 references mid-sprint-triage-rubric.md (external doc), not triage-classifier.ts — no fix needed there
NO_REGRESSION: 91 pre-existing fails confirmed; 0 new failures; all from untouched auth/admin/wiki/state surfaces

VERDICT: All 3 Gherkin scenarios covered by 26 passing tests. Hidden flags correct on all 8 plumbing commands, handlers intact, stub label removed, orphan deleted with zero dangling refs, write_dispatch.sh is fallback-only and byte-identical across both copies, SKILL.md prose updated correctly. Typecheck clean. No regressions. Ship it.

flashcards_flagged:
  - "2026-06-01 · #cli #commander · Commander hidden:true option is passed as 2nd arg to .command(); the .action() handler survives — hidden affects --help only, not dispatch. [SPRINT-33 043-09]"
