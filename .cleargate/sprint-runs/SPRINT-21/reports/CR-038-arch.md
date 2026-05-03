role: architect

# CR-038 Architect Post-Flight Review

## STORY: CR-038
## ARCH: PASS

## 1. Step 0 placement — ok

Verified via `git -C .worktrees/CR-038 show e7d4f0a -- cleargate-cli/src/commands/sprint.ts`:

- `refreshScopedGateCaches(opts.sprintId, cwd, execFn)` invoked at the post-diff equivalent of **L1478** in `sprintPreflightHandler`.
- The summary `stdoutFn(\`Step 0: refreshed ${refresh.refreshed.length} items, ${refresh.errors.length} errors.\n\`)` plus per-error loop run synchronously after `readSprintExecutionMode` and **before** the `const results: PreflightCheckResult[]` accumulator at **L1485**.
- All five checks (incl. CR-027 `checkPerItemReadinessGates` = Check 5) are constructed inside that array → all run after Step 0.
- Step 0 has no `exitFn` call; never short-circuits preflight (matches anchor §1 line 99 + §3 lines 145–148).

Placement matches QA finding and matches M2 plan §"Implementation sketch — Step 0 location" (lines 188, 215–227).

## 2. Symbol reuse — ok

All five reuse targets named in the M2 plan are referenced verbatim by Step 0 (no reimplementation):

| Symbol | Source | Step 0 callsite (post-diff) |
|---|---|---|
| `findSprintFile` | sprint.ts existing helper | inside `refreshScopedGateCaches` step 1 |
| `extractInScopeWorkItemIds` | sprint.ts (CR-027 seam, shells out to `assert_story_files.mjs --emit-json`) | step 2 |
| `findWorkItemFileLocal` | sprint.ts existing helper | step 3 |
| `TERMINAL_STATUSES` | sprint.ts module-scope constant (CR-027) | step 3 skip-guard |
| `execFn` | `SprintPreflightOptions` test seam | step 3 invocation + threaded as parameter |

`parseFrontmatter` + `fs.readFileSync` are also reused for the inline status read (no new YAML parser introduced). Zero duplication.

## 3. Test seam reuse — ok

- `execFn` parameter on `refreshScopedGateCaches` matches the existing `SprintPreflightOptions.execFn` signature (`(cmd, { cwd, encoding: 'utf8' }) => string`).
- 5 new vitest scenarios (15–19) inject canned `execFn` outputs per the M2 plan's mock pattern (M2 §"Mock pattern" lines 247).
- Existing 8 + intermediate scenarios → 23 total green per QA artifact diff. No regression.

## 4. Spec-deviation verdict — dev correct

| Surface | M2 plan sketch | Dev implementation | Acceptance §3 scenario 1 verbatim |
|---|---|---|---|
| Step 0 stdout summary | conditional `errMsg` (drop `, 0 errors` when zero) | unconditional `, ${N} errors.\n` | `"refreshed 5 items, 0 errors"` |

Spec verbatim text says `0 errors` is rendered even when there are none. Dev followed the anchor literally; Architect sketch was wrong (a "polish" that contradicted the spec). Spec wins; Dev call stands.

This pattern matches FLASHCARD `2026-05-02 #qa #spec #acceptance-metric` — aggregate acceptance metrics outweigh sketch suggestions when in conflict.

## 5. Hot file check — ok

- `cleargate-cli/src/commands/sprint.ts` is touched by CR-038 only in SPRINT-21 (M2 plan §"Hot file order" line 259 confirms).
- `cleargate-cli/test/commands/sprint-preflight.test.ts` is appended-to only — 8 existing scenarios untouched, 5 new appended at the tail.
- No conflict surface with CR-032 (different file domain: hooks + CLAUDE.md + templates).

## 6. New runtime deps — none

`git diff sprint/S-21..e7d4f0a -- cleargate-cli/package.json` returns empty. No package additions; no version bumps; no new transitive surface.

## 7. Pre-gate context

`[FAIL] typecheck` reported by the runner is a known false-positive — root `package.json` has no `typecheck` script; the runner walks up looking for one and fails. Local `cd cleargate-cli && tsc --noEmit` is clean per QA. Ignored.

## 8. flashcards_flagged

None new. The existing flashcard `2026-05-02 #qa #spec #acceptance-metric` already covers the "spec verbatim text wins over Architect sketch" lesson surfaced here; no second card needed.

## Post-merge housekeeping (NOT review-blocking)

- CR-038 anchor file still in `pending-sync/`. Move to `archive/` on merge per protocol.
- §2 anchor checkbox "FLASHCARD impact: add card on completion" remains unchecked. Dev/QA flagged but did not append; orchestrator-level housekeeping per QA report §"Post-commit actions outstanding".
- Commit prefix is `feat(SPRINT-21):` not `feat(CR-038):` or `feat(EPIC-008):`. Recurring across the sprint per FLASHCARD `2026-05-01 #commit-format #dod`.

---

ARCH: PASS
STEP_0_PLACEMENT: ok
SYMBOL_REUSE: ok
SPEC_DEVIATION_VERDICT: dev correct
flashcards_flagged: []
