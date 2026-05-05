role: developer

# BUG-028 Developer Report

**Story:** BUG-028 — Upgrade merge prompt: dry-run vs real-run state mismatch + empty diff render
**Sprint:** SPRINT-26
**Commit:** d9e5928

## Summary

Implemented M1 BUG-028 Direction Y (two-state dry-run line) and the `renderInlineDiff` empty-body fallback.

**upgrade.ts** (dry-run path, lines 445-467 post-fix): The dry-run loop now computes a projected post-state (`classify(entry.sha256, entry.sha256, entry.sha256, entry.tier)` → always `clean` post-take-theirs) and emits `state=<pre> → <post>` when the states differ. When they match, only `state=<s>` is emitted (no noise for already-clean files).

**merge-ui.ts** (`renderInlineDiff`): Added a post-`createPatch` check — if the patch has no hunk lines (lines starting with `+`/`-` excluding `+++`/`---`), a fallback annotation `(whitespace/EOL-only differences — N bytes changed)` is appended. The `createPatch` output is preserved verbatim for all normal-diff cases.

## Verification

- All 5 Red scenarios pass: 2/2 upgrade-state-parity + 3/3 merge-ui.
- `npm run typecheck` → clean.
- `npm test` (node:test full suite) → 134/136 pass; 2 pre-existing failures in `test/examples/red-green-example.node.test.ts` (tsx binary missing at worktree root — not caused by BUG-028, confirmed by stash test).
- `npm run test:vitest` → pre-existing failures only (missing `mcp/package.json` in worktree + other worktree-specific path issues); no new regressions from BUG-028.
