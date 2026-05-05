role: architect

# BUG-028 Architect Post-Flight Review

**Sprint:** SPRINT-26
**Story:** BUG-028 — Upgrade merge prompt: dry-run vs real-run state mismatch + empty diff render
**Mode:** POST-FLIGHT REVIEW
**Reviewer SHA basis:** Red `14e5752` → Dev `d9e5928` (over post-BUG-027 base `bb81be2`)

---

ARCH: PASS

---

## Verification Matrix

| Check | Result | Evidence |
|---|---|---|
| 1. Aligns with M1 Direction Y (two-state line + empty-body fallback) | PASS | `upgrade.ts:445-471` — `state=<pre> → <post>` only when `state !== projectedPostState`, single-state line otherwise. `merge-ui.ts:23-46` — fallback annotation appended when `hasHunkLines === false`. Comment block at `upgrade.ts:450-456` cites "BUG-028 Direction Y" verbatim. |
| 2. No off-surface edits beyond `upgrade.ts` + `merge-ui.ts` | PASS | `git diff bb81be2..d9e5928` lists exactly 2 src files: `cleargate-cli/src/commands/upgrade.ts` (+22/-2) and `cleargate-cli/src/lib/merge-ui.ts` (+25/-1). No `mcp/`, `cleargate-planning/`, `templates/`, or `admin/` edits. |
| 3. CR-059 territory pristine (`SESSION_LOAD_PATHS` / `sessionRestartFiles`) | PASS | Block at `upgrade.ts:491-550` (post-BUG-028 line numbers) is byte-identical to pre-BUG-028 `upgrade.ts:471-530`. BUG-028 inserted 20 lines above the block; the block content shifted but its semantics are untouched. CR-059's mandate to use symbol references (per M1 §"BUG-028 ↔ CR-059 sequencing") is the correct rebase strategy. |
| 4. No new dependencies | PASS | `git diff bb81be2..d9e5928 -- cleargate-cli/package.json` returns empty. No `npm install` performed. |
| 5. Pre-existing test environment issues confirmed pre-existing | PASS | (a) `mcp/` directory is absent from the BUG-028 worktree (sibling git repo, never checked out into worktree) — this is a worktree-mechanics fact unrelated to BUG-028. Vitest path failures referencing `mcp/package.json` predate this story. (b) `cleargate-cli/node_modules/.bin/tsx` ENOENT in `red-green-example.node.test.ts` — that test file dates back to SPRINT-22 CR-043 (`8a98bbd feat(SPRINT-22): CR-043 Red/Green TDD discipline`); BUG-028 modifies neither the test nor the worktree node_modules layout. |

## Implementation Audit

**`upgrade.ts` dry-run path (Direction Y):**

```ts
const projectedPostSha = item.entry.sha256;
const projectedPostState = classify(
  item.entry.sha256,        // installSha after take-theirs == entry.sha256
  item.entry.sha256,        // currentSha after take-theirs == entry.sha256
  projectedPostSha,         // postSha == entry.sha256
  item.entry.tier
);
const stateLabel =
  state !== projectedPostState
    ? `state=${state} → ${projectedPostState}`
    : `state=${state}`;
```

This is the M1-prescribed shape: classify via `entry.sha256` arguments to project the post-take-theirs world, then compare. Matches plan §"Direction Y" recommendation 1:1. The single-state branch correctly avoids noise on already-clean files (the case the plan explicitly called out).

**`merge-ui.ts` empty-body fallback:**

```ts
const hasHunkLines = patch
  .split('\n')
  .filter((l) => l.startsWith('+') || l.startsWith('-'))
  .filter((l) => !l.startsWith('+++') && !l.startsWith('---'))
  .length > 0;
```

Detection predicate matches the M1 plan §"Reuse" guidance verbatim. Fallback annotation `(whitespace/EOL-only differences — N bytes changed)` matches the BUG-028 §4 "Execution Sandbox" suggestion. The `Buffer.byteLength(..., 'utf-8')` calculation is a reasonable bytes-changed approximation for the user-facing signal (trailing newline edge case yields `1 byte changed`, which is what the user wants to see).

**Test wiring (Red commit `14e5752`):**
- 5 scenarios across 2 files; all 5 GREEN post-fix (re-ran locally during this review: `tests 5 / pass 5 / fail 0` in 210ms).
- Files match `*.red.node.test.ts` immutability convention (CR-043).

## Findings

1. **Direction Y implementation is faithful and minimal.** No merge-logic duplication (Direction X risk avoided). Net diff: +45/-3 across 2 files.
2. **CR-059's rebase target is clean.** The `SESSION_LOAD_PATHS` Set literal and `sessionRestartFiles.push` site are byte-identical content; CR-059's Developer must locate them by symbol per M1 mandate (line numbers shifted +20). No rebase-time semantic surprises expected.
3. **Bytes-changed signal is `same byte count` when files differ only by line-ending normalization that doesn't change byte counts** (e.g. CRLF vs LF on a single-line file: `"x\r\n"` vs `"x\n"` differs by 1 byte; `"x\r"` vs `"x"` differs by 1 byte). The fallback handles this correctly via the `ourBytes !== theirBytes` ternary; the `same byte count` branch covers BOM-only divergences. Acceptable user signal.
4. **Comment quality:** the inline rationale at `upgrade.ts:450-456` cites BUG-028 + Direction Y, helps future maintainers. No spurious dev-process noise in the source.
5. **No FLASHCARD updates required.** Both surfaces (`upgrade.ts` dry-run path and `merge-ui.ts` `renderInlineDiff`) were already documented in the M1 plan §"Gotchas surfaced from code inspection". No new gotcha surfaced during the fix that future sprints should know.

## Cross-story risk re-assessment (post-BUG-028)

- **BUG-028 ↔ CR-059 (M1 cross-story risk #1):** UNCHANGED. CR-059 must rebase on `d9e5928` (or its merge SHA) with symbol-based references. Line shift confirmed: 471→491, 516→536. Architect mandate from M1 holds.
- **BUG-028 dry-run "would-be" post-state computation (M1 cross-story risk #4):** RESOLVED via Direction Y. No merge-logic duplication occurred; `applyMerge3Way` was not touched.

## flashcards_flagged

None. The two flashcards QA-Red surfaced in `BUG-028-qa-red.md` are QA-craft cards (Red tests assert desired behavior; createPatch empty-body trigger semantics) — they belong in QA-Red's column and are already recorded there.

---

**Recommendation:** Proceed to merge. CR-059 dispatch is unblocked; orchestrator should rebase CR-059's worktree on the post-BUG-028 sprint branch tip and re-confirm symbol-based references in CR-059's dispatch text.
