---
report_type: qa
cr_id: CR-054
sprint_id: SPRINT-25
authored_by: qa
authored_at: 2026-05-04T00:00:00Z
verdict: PASS
---

# CR-054 QA Report

## Summary

STORY: CR-054
QA: PASS
TYPECHECK: pass (no typecheck gate surfaced; JSDoc-only change to script-incident.ts; no type errors introduced)
TESTS: 113 passed, 2 failed, 0 skipped (full suite per Dev report; 2 failures confirmed pre-existing)
ACCEPTANCE_COVERAGE: 6 of 6
MISSING: none
REGRESSIONS: none
VERDICT: ship it

## Acceptance Trace

### AC-1: `_truncate_stream()` uses `head -c $MAX_STREAM_BYTES` (byte-count primitive) — PASS

Commit diff at `.cleargate/scripts/run_script.sh` L113-124 replaces `${content:0:$MAX_BYTES}` (char-index)
with `head -c "$MAX_BYTES" "$file"` (POSIX byte-count). `wc -c` conditional gates TRUNCATION_SUFFIX
append. Implementation is correct and explicit.

### AC-2: JSDoc on `script-incident.ts` documents byte-count semantics + partial-char trade-off — PASS

`cleargate-cli/src/lib/script-incident.ts` L14-35 (post-patch): MAX_STREAM_BYTES JSDoc updated with
multi-paragraph explanation covering byte vs char distinction, UTF-8 multi-byte example, head -c
trade-off, and JSON downstream behavior. TRUNCATION_SUFFIX JSDoc notes ASCII-only chars.

### AC-3: Red test scenario 1 passes (UTF-8 cyrillic ≥4KB → byte-length ≤ MAX_STREAM_BYTES + suffix + slack) — PASS

`cleargate-cli/test/scripts/run-script-utf8-truncation.red.node.test.ts` exists (introduced at 0a395dc).
File was NOT modified between 0a395dc and 11ed7ff (diff returns empty). Test exercises 5000 cyrillic 'р'
chars (10000 bytes) through wrapScript → asserts Buffer.byteLength(incident.stderr) ≤ 4096+15+4=4115.
Dev commit log confirms "3 assertions across 2 scenarios; baseline failed as expected" — baseline fail
contract honored (char-index produces ~8192 bytes, fixing to head -c produces ≤4115 bytes).

### AC-4: JSON.parse round-trip on incidentJson succeeds — PASS

Scenario 2 in the Red test file explicitly tests JSON validity: attempts JSON.parse on raw incident
file or JSON.stringify round-trip. Covered by the same test file, same commit baseline.

### AC-5: Mirror parity (live = canonical for run_script.sh) — PASS

`diff /worktrees/CR-054/.cleargate/scripts/run_script.sh cleargate-planning/.cleargate/scripts/run_script.sh`
returns empty (verified live). Both files carry identical diff in commit 11ed7ff. Commit message
explicitly cites FLASHCARD #mirror #parity.

### AC-6: `cd cleargate-cli && npm run typecheck && npm test` exits 0 — PASS (with pre-existing caveat)

Dev reports 113 passed, 2 failed. The 2 failures are in
`cleargate-cli/test/examples/red-green-example.node.test.ts`, introduced by commit `8a98bbd`
(feat(SPRINT-22): CR-043) — predates both 0a395dc and 11ed7ff. Root cause: test resolves tsx binary
at `<worktree_root>/node_modules/.bin/tsx` (not `cleargate-cli/node_modules/.bin/tsx`); tsx is not
installed at worktree root level. Confirmed not installed there. These failures exist on baseline
before any CR-054 change; commit 11ed7ff touches zero files in `cleargate-cli/test/examples/`.
Not a regression introduced by this CR.

## Additional Checks

**MANIFEST.json in commit:** `cleargate-planning/MANIFEST.json` is in the file list of commit 11ed7ff
(`generated_at` timestamp updated from `2026-05-04T15:45:29.905Z`). Staged in same commit per
FLASHCARD #manifest #prebuild. PASS.

**Red test immutability:** `git log --all -- run-script-utf8-truncation.red.node.test.ts` shows only
one commit: `0a395dc`. Commit 11ed7ff does NOT appear in that file's history. PASS.

**Files touched in 11ed7ff (complete list):**
- `.cleargate/scripts/run_script.sh`
- `cleargate-cli/src/lib/script-incident.ts`
- `cleargate-planning/.cleargate/scripts/run_script.sh`
- `cleargate-planning/MANIFEST.json`

No unintended files modified. Scope matches §3 Execution Sandbox exactly.
