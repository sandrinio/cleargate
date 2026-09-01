# Dev Report BUG-068

## Summary

Replaced the `tool_name == "Task"` equality guard with the accept-predicate specified in
M1.md §3.2 (`tool_name ∈ {Task, Agent}` OR `tool_input.subagent_type` present) in
`cleargate-planning/.claude/hooks/pre-tool-use-task.sh` and both guards of
`cleargate-planning/.claude/hooks/pending-task-sentinel.sh`, and widened the
`PreToolUse` matcher in `cleargate-planning/.claude/settings.json` from `"Task"` to
`"Task|Agent"`. The previously-silent rejected-tool-name exit in
`pre-tool-use-task.sh` now logs a line to `pre-tool-use-task.log` naming the rejected
tool name, matching the existing early-exit log idiom.

`pending-task-sentinel.sh` computes the predicate once as `IS_AGENT_SPAWN`, alongside
the existing `TOOL_NAME_EARLY` read, and both the flashcard-gate barrier (former line
53) and the sentinel-write guard (former line 157) now branch on that one variable
instead of re-deriving `tool_name`. Header comment blocks in both hooks were corrected
from `PreToolUse:Task` / "Task spawn" language to reflect the widened predicate, per
M1.md §3.2's closing instruction.

`token-ledger.sh` was not touched — confirmed by `git diff --stat` on the final commit
(4 files: the three in-scope hooks/settings plus the bug's own Task Breakdown update).
Per M1.md §2, BUG-068 owns zero lines of that file; Sc4.2/Sc4.3 go green as a
consequence of the marker now being written, exactly as predicted.

## Implementation Guide compliance

Followed M1.md §3.2's decided replacement code verbatim for all three files — no
re-derivation. `ALLOW_LIST` at `pre-tool-use-task.sh:67` (unchanged) was left
untouched per §3.4/§3.5 (widening it is Open Decision 1, explicitly out of this
story's scope).

## Verification

Baseline (before edits), scrubbed env:
```
env -u SKIP_FLASHCARD_GATE -u CLEARGATE_ADVISORY CLEARGATE_NO_DASHBOARD=1 \
  bash .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh
```
`Passed: 1 / Failed: 9` (Sc4.1 only, as M1.md §3.3 predicted).

After edits, same scrubbed-env invocation: `Passed: 10 / Failed: 0`. All 10
assertions across Sc1-Sc4 pass.

Regression set (both scrubbed env, both still exercise `tool_name:"Task"` payloads
against the widened predicate):
- `bash .cleargate/scripts/test/test_flashcard_enforcement.sh` — 12 passed, 0 failed.
- `bash .cleargate/scripts/test/test_flashcard_fail_closed.red.sh` — 17 passed, 0
  failed.

No typecheck run, per sprint-context.md §Test Stack (environmental ENOENT,
unconditional, documented as out of scope for this sprint).

## Task Breakdown

Ticked 5 of 6 rows in the bug file. Row 5 ("Re-sync npm payload and the live
`/.claude/` instance") is explicitly superseded by M1.md §0 item 4 — the plan states
this is an orchestrator/human post-merge step, not Developer scope, and left
unticked with an inline note pointing at the plan. Row 6 ("Add a regression test...")
is ticked: the test already exists, committed by QA-Red before this dispatch
(`bug068_dispatch_tool_name.red.sh`, commit `7029e212`); this story made it green,
per M1.md §3.1's "you create no test file."

## Deviations from plan

None. Implemented the decided change shape from M1.md §3.2 verbatim in all three
files, including the exact predicate structure, log-line format, and variable
naming (`SUBAGENT_TYPE_PROBE`, `IS_AGENT_SPAWN`, `SUBAGENT_TYPE_EARLY`).

## Flashcards

None recorded — no surprise encountered. M1.md's Gotchas (§3.5) already named every
trap hit during verification (env hygiene for Sc2, `CLEARGATE_NO_DASHBOARD` for
Sc4, stderr-outside-the-log-group for Sc2.2) and all were avoided as documented.
