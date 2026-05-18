---
story_id: STORY-067-02
report_type: qa-red
author: qa-agent
date: 2026-05-18
sprint_id: SPRINT-28
---

# QA-Red Report — STORY-067-02

## Verdict

QA-RED: WRITTEN

## Red Test File

`cleargate-cli/test/scripts/status-vocab-phase-b.red.node.test.ts`
(written inside worktree `.worktrees/STORY-067-02`)

## Baseline Fail Summary

Runner: `tsx --test --test-reporter=spec`
Total tests: 75  |  PASS: 56  |  FAIL: **19**  |  skip: 0

### Failing scenarios

**Test 1 — repo-state (2 sub-tests)**

- `archive has no status: Done or status: Verified frontmatter lines`
  FAILS — 114 archive files carry `status: Done` or `status: Verified` today.
- `pending-sync has no status: Done or status: Verified frontmatter lines`
  PASSES today (no Done/Verified in pending-sync at this baseline).

**Test 2 — template status-vocab (17 sub-tests, 17 fail)**

Live and canonical templates both fail symmetrically:

| Template | Failing checks |
|---|---|
| story.md | "Completed" not present |
| Bug.md | `status: "Draft \| Triaged \| In Fix \| Verified"` line + no "Completed" |
| CR.md | "Completed" not present |
| epic.md | "Completed" not present |
| initiative.md | "Completed" not present |
| sprint_report.md | `- **Status:** Done \| Escalated…` line + no "Completed" |
| hotfix.md | "Completed" not present |

(Sprint Plan Template.md passes — no Done/Verified guidance lines today.)

**Test 3 — npm payload parity (vacuous pass)**

All 8 npm-payload template checks PASS today because templates are unchanged.
These flip to fail only after Dev edits canonical templates without running prebuild
(per flashcard 2026-05-18 · #qa #red-test #vacuous-pass).

## Advisory risks addressed

1. **Non-recursive walk** — test uses `fs.readdirSync(..., { recursive: true })`,
   so all subdirectory items are scanned regardless of script's own walk depth.
2. **Multi-line status break** — `countPatternInFile` scans every line of each file;
   multiple `status:` lines in one file are all counted.
3. **Dry-run audit pipe** — out of scope for this test (CI wiring concern per sprint-context).
4. **Exit-handler removal** — covered by STORY-067-01 Red tests.

## Wiring soundness (TPV checklist)

- Imports: `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:child_process`, `node:url` — all built-in, resolve cleanly.
- Path resolution: `__dirname` → `CLI_ROOT` → `REPO_ROOT` (same pattern as sibling `migrate-status-to-completed.red.node.test.ts`).
- `before()` after-hook present (prebuild in Test 3).
- No `test.skip()` anywhere.
- File named `*.red.node.test.ts` per SKILL.md §C.3 naming rule.
