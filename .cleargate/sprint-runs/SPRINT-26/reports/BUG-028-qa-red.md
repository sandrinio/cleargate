---
role: qa
mode: RED
story: BUG-028
sprint: SPRINT-26
created_at: 2026-05-05
commit: 14e5752
---

QA-RED: WRITTEN

RED_TESTS:
  - .worktrees/BUG-028/cleargate-cli/test/commands/upgrade-state-parity.red.node.test.ts
  - .worktrees/BUG-028/cleargate-cli/test/lib/merge-ui.red.node.test.ts

BASELINE_FAIL: 3

## Failing scenarios

1. **upgrade-state-parity.red.node.test.ts** — "dry-run emits a projected post-state annotation (state=X → Y) for upstream-changed files"
   - Pre-fix code emits: `[dry-run] .claude/hooks/session-start.sh  action=merge-3way  state=upstream-changed`
   - Missing: projected post-state notation (Direction Y: `state=upstream-changed → clean`)
   - AssertionError: `hasProjectedPostState` is false

2. **merge-ui.red.node.test.ts** — "appends a fallback annotation when createPatch returns an empty-body patch (ours === theirs)"
   - Pre-fix code returns raw header-only patch with no fallback annotation
   - AssertionError: `hasFallbackAnnotation` is false

3. **merge-ui.red.node.test.ts** — "appends a fallback annotation for multi-line identical content (empty patch body)"
   - Same failure mode as #2, multi-line variant

## Passing scenarios (regression guards, expected to pass pre-fix)

4. **upgrade-state-parity.red.node.test.ts** — "dry-run and live report the same state for a CRLF-on-disk / LF-upstream file"
   - CRLF normalization makes both states match (clean on both sides); correct behavior already

5. **merge-ui.red.node.test.ts** — "renders normal hunk lines for a real semantic change"
   - Semantic diffs work correctly; regression guard for post-fix

## Wiring soundness notes

- Imports resolve: `../../src/commands/upgrade.js`, `../../src/lib/merge-ui.js`, `../../src/lib/sha256.js`, `../../src/lib/manifest.js` — all verified present in worktree
- Constructor signatures: `upgradeHandler(flags, cli)` matches production signature; `renderInlineDiff(ours, theirs, filePath)` matches
- After-hook: `after()` present in upgrade-state-parity test for tmp dir cleanup
- File naming: `*.red.node.test.ts` — immutable post-Red

## Baseline run command

```
cd .worktrees/BUG-028/cleargate-cli && npx tsx --test --test-reporter=spec \
  'test/commands/upgrade-state-parity.red.node.test.ts' \
  'test/lib/merge-ui.red.node.test.ts'
```

Exit code: 1 (fail). 3 failed, 2 passed (regression guards).

flashcards_flagged:
  - "2026-05-05 · #qa #red #upgrade · RED tests for state-parity: assert desired post-fix behavior (arrow format), not current behavior; avoids false-green"
  - "2026-05-05 · #qa #red #diff · createPatch empty-body case: only triggers when ours===theirs as strings; CRLF/LF and trailing-NL DO produce hunks in diff pkg"
