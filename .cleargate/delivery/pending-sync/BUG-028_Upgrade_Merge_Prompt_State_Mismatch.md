---
bug_id: BUG-028
parent_ref: EPIC-016 — Upgrade UX
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P3-Low
reporter: sandrinio
approved: true
approved_at: 2026-05-05T08:40:00Z
approved_by: sandrinio
created_at: 2026-05-05T08:00:00Z
updated_at: 2026-05-05T08:00:00Z
created_at_version: cleargate@0.11.3
updated_at_version: cleargate@0.11.3
server_pushed_at_version: null
context_source: |
  Observed during the SPRINT-25 → 0.11.x dogfood upgrade pass on
  /Users/ssuladze/Documents/Dev/markdown_file_renderer (2026-05-04). Two
  related upgrade-merge UX inconsistencies surfaced together: (a) `cleargate
  upgrade --dry-run` reported `state=clean` for `.claude/hooks/session-start.sh`
  while the immediately-following real run reported `state=upstream-changed`
  for the same file; (b) the interactive merge prompt rendered an empty diff
  body between `--- installed` and `+++ upstream` even when state classification
  said upstream-changed. Confusing because the human can't tell whether to
  press [k]eep mine or [t]ake theirs without seeing what's actually different.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-05T08:51:26Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-028
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-05T08:51:01Z
  sessions: []
---

# BUG-028: Upgrade merge prompt: dry-run vs real-run state mismatch + empty diff render

### 0.5 Open Questions

- **Question:** Is the dry-run state computation re-using a different code path from the live computation, or is it the same computation racing with a concurrent re-hash?
- **Recommended:** Same code path; the discrepancy is likely a stale cached `currentSha` from `.drift-state.json` being read in dry-run but recomputed in live mode.
- **Human decision:** _populated during Brief review_

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `cleargate upgrade --dry-run` and a real `cleargate upgrade` invoked back-to-back must report identical `state=` for every file. The interactive merge prompt must display a non-empty diff between installed and upstream content for any file flagged `state=upstream-changed`.

**Actual Behavior:**
- Dry-run reports `state=clean` for `.claude/hooks/session-start.sh`. Immediately rerunning without `--dry-run` reports `state=upstream-changed` for the same file.
- During the interactive merge, the rendered diff body between `--- installed` and `+++ upstream` is blank (no hunks) for several `state=upstream-changed` files — likely whitespace-only or EOL-only differences. The user has no way to inspect the real change before choosing k/t/e.

## 2. Reproduction Protocol

- **Step 1 — Set up an upgrade target.** Pick a repo whose installed scaffold predates the latest payload (e.g., `markdown_file_renderer` before this session's upgrade).
- **Step 2 — Run dry-run.** `cleargate upgrade --dry-run` and capture the output. Note any line `[dry-run] .claude/hooks/session-start.sh action=merge-3way state=clean`.
- **Step 3 — Run live without `--dry-run`.** `cleargate upgrade` (no flag). Compare the same file's reported `state=`. Observe: now reads `state=upstream-changed`.
- **Step 4 — Reach the merge prompt.** Continue through merge-3way prompts. Observe the rendered diff for the upstream-changed file: between `--- installed` and `+++ upstream` there is no hunk content (visual blank).
- **Step 5 — Confirm by hand.** `diff <(cat .claude/hooks/session-start.sh) <(cat /path/to/upstream/payload/.claude/hooks/session-start.sh)` shows the actual difference (whitespace, BOM, EOL — depends).

## 3. Evidence & Context

Observed in the live test session 2026-05-04:

```
[dry-run] .claude/hooks/session-start.sh  action=merge-3way  state=clean
...
[merge] .claude/hooks/session-start.sh  state=upstream-changed

Index: .claude/hooks/session-start.sh
===================================================================
--- .claude/hooks/session-start.sh    installed
+++ .claude/hooks/session-start.sh    upstream

[k]eep mine / [t]ake theirs / [e]dit in $EDITOR:
```

The `=== ` header bar followed by an empty body is the visual artifact. `createPatch()` from the `diff` package produced no hunks because the changes are below the diff window (likely whitespace/EOL).

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/commands/upgrade.ts` — dry-run code path (around lines 430–442) vs live execute loop (445–504). Confirm both consume the same `currentSha` source.
- `cleargate-cli/src/lib/manifest.ts` `computeCurrentSha()` — verify deterministic across consecutive calls.
- `cleargate-cli/src/lib/merge-ui.ts` `renderInlineDiff()` — when `createPatch()` returns the empty body shape, fall back to a "(whitespace/EOL-only differences — N bytes changed)" annotation so the user has a signal.

**Do NOT touch:** the merge-3way write paths (`applyAlwaysOverwrite`, `applyMerge3Way`); those work correctly. Only the dry-run preview and diff rendering.

## 5. Verification Protocol (The Failing Test)

**Test 1 — dry-run/live state parity:** add `cleargate-cli/test/commands/upgrade.test.ts` case that fixtures a target file with whitespace-only diff vs upstream, runs dry-run, captures state, runs live, captures state, asserts they match.

**Test 2 — diff render fallback:** add `cleargate-cli/test/lib/merge-ui.test.ts` case where `ours` and `theirs` differ only in trailing newline; assert `renderInlineDiff()` output contains either a hunk OR a fallback annotation noting whitespace/EOL-only divergence.

**Command:** `cd cleargate-cli && npm test`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** — repro is solid; root cause needs source inspection to confirm whether dry-run reads cached drift state.

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [ ] Verification command (failing test) is provided. — *test cases sketched, not yet written*
- [ ] `approved: true` is set in the YAML frontmatter.
