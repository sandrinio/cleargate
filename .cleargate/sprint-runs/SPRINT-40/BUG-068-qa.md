# QA Report — BUG-068

role: qa

STORY: BUG-068
QA: PASS
TYPECHECK: n/a — sprint-context.md §Test Stack: no typecheck this sprint (cleargate-cli/package.json absent from every worktree by design). Not run; not treated as a gap.
TESTS: 39 passed, 0 failed, 0 skipped (bug068_dispatch_tool_name.red.sh 10/10 + test_flashcard_enforcement.sh 12/12 + test_flashcard_fail_closed.red.sh 17/17, all under `env -u SKIP_FLASHCARD_GATE -u CLEARGATE_ADVISORY CLEARGATE_NO_DASHBOARD=1`)
ACCEPTANCE_COVERAGE: 4 of 4 scenarios (bug §5: 3 unit + 1 integration) have matching, passing tests
MISSING: none
REGRESSIONS: none

## Adversarial verification performed (beyond re-running the suite)

1. **Predicate shape — read, not inferred.** Diffed all three files against `sprint/S-40`. `pre-tool-use-task.sh:47-58` and `pending-task-sentinel.sh:58-62` both implement a genuine `case` statement: `Task|Agent` accepted unconditionally, any other `tool_name` accepted only if `tool_input.subagent_type` is non-empty (else rejected + logged). This is the decided OR-predicate from M1.md §3.2(a)/(b) verbatim, not a widened name allow-list.

2. **Hunt for test-shaped fixes — none found, and independently disproved by construction.** Grepped the diff for fixture-specific literals (`developer`, `s1-agent`, `STORY-996`, etc.) — none appear outside the unmodified red test file. Then drove all three guard sites with a tool name that appears in **no** fixture anywhere in the repo (`"Workflow"`):
   - `pre-tool-use-task.sh` with `tool_name:"Workflow"` + `subagent_type:"qa"` → marker written, `agent_type=qa`, `work_item_id=STORY-900-01` (correct, from a mktemp fixture, not the harness).
   - Same tool name with no `subagent_type` → no marker, log line `no marker: rejected tool_name=Workflow (not Task/Agent, no tool_input.subagent_type)`.
   - `pending-task-sentinel.sh` flashcard barrier with `tool_name:"Workflow"` + `subagent_type` → correctly `exit 1` / `FLASHCARD GATE BLOCKED`.
   - `pending-task-sentinel.sh` sentinel write, same novel tool name + `subagent_type` → `.pending-task-*.json` written with correct `agent_type`/`work_item_id`; without `subagent_type` → no sentinel.
   All four probes behaved correctly against an input shape the implementation could not have been fit to. This is strong evidence against overfitting to the harness.

3. **settings.json.** Line 15 is exactly `"matcher": "Task|Agent"`; lines 28 (`Edit|Write`) and 37 (`AskUserQuestion`) are byte-unchanged. File parses as valid JSON (`python3 -m json` load succeeded).

4. **Bug §5 Verification Protocol satisfied in substance.** All three unit cases (marker write, flashcard barrier, silent-exit logging) and the one integration case (marker → token-ledger.sh attribution) are present as Sc1–Sc4 in the red test and all pass for the reasons the test asserts (agent_type/work_item_id values, not just exit codes).

5. **`IS_AGENT_SPAWN` scope claim — verified, not trusted.** Read `pending-task-sentinel.sh` in full: the variable is computed once at lines 58-62 (top level, no subshell) and read at line 167 inside `{ ... } 2>> "${HOOK_LOG}"`. Empirically confirmed bash semantics for this exact idiom (`{ VAR=x; } 2>>file` — a variable set *inside* the group is visible *outside* it afterward, i.e. no forked subshell), which is the stronger of the two directions and implies the weaker direction QA needed (a variable set *before* the group is visible *inside* it) trivially holds. Also drove the sentinel-write guard (line 167) directly with the novel-tool-name adversarial probes above — it fired correctly both ways, confirming no stale/unset read in practice, not just on paper.

6. **Header-comment prose.** Both hooks' header blocks no longer claim `PreToolUse:Task` in the old (Task-only) sense — `pre-tool-use-task.sh:2` now reads `PreToolUse:Task|Agent hook`, which is accurate (matches the widened matcher), and all "Task spawn"/"tool_name == Task" language elsewhere in both headers is rephrased to "subagent spawn". No stale claim remains.

7. **Scope discipline honored.** `ALLOW_LIST` untouched (still 5/11 roles) — correctly left alone per Open Decision 1. Task Breakdown row 5 (re-sync) correctly left unticked with a note pointing at M1.md §0 item 4. `.red.sh` immutability gap is honour-system as documented; the red test file is byte-identical to QA-Red's commit (`git diff 7029e212..HEAD` on that path is empty, reconfirmed). None of these were scored as defects.

## Observation (not a defect)

The worktree carries uncommitted, untracked/modified changes under `.cleargate/wiki/` (`index.md`, `log.md`, `product-state.md`, new `bugs/BUG-068.md`) — a side effect of the PostToolUse wiki-ingest hook firing on the bug file's Task Breakdown edit. These are not part of commit `fa4873a2` (`git show fa4873a2 --stat` lists exactly 4 files: the bug file + the 3 declared hook/settings surfaces) and are outside the story's Execution Sandbox. Flagging for orchestrator awareness only; not scored against the Developer.

VERDICT: Ship it. The accept-predicate is genuinely the rename-proof OR-shape decided in M1.md §3.2, not a name-only allow-list that happens to pass the fixture — confirmed both by reading the case statements and by exercising all three guard sites with a tool name absent from every fixture in the repo. `IS_AGENT_SPAWN` reuse across the two `pending-task-sentinel.sh` guard sites is genuinely in scope (verified by direct bash semantics test of the exact `{ ... } 2>>` idiom, plus live adversarial probes at both sites). `settings.json` changed exactly one line, remains valid JSON, and the two adjacent matcher blocks are untouched. All 4 of the bug's §5 scenarios are covered by passing, substantive assertions (not just exit-code checks), and the two named regression suites are green. The three orchestrator-declared out-of-scope gaps (ALLOW_LIST breadth, Task Breakdown row 5, `.red.sh` immutability) are correctly left untouched and are not defects.

flashcards_flagged: []
