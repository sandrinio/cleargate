---
bug_id: BUG-137
parent_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: hooks,worktree-lifecycle,metrics
status: Draft
severity: P2-Medium
reporter: orchestrator (SPRINT-46 Goal check d)
approved: false
context_source: SPRINT-46 Goal check (d) sandbox runs 1 and 2, findings S20, S15, B8 (.cleargate/field-trials/2026-11-sandbox-s46.md; ORCHESTRATOR_FINDINGS.md B8); deferred to a later sprint by iteration-3-scoping.md §7 ('S20 ... none — intake'); filed by the SPRINT-46 orchestrator under the owner's /goal delegation 2026-11-15
created_at: 2026-11-15T11:36:28.448Z
updated_at: 2026-11-15T11:36:28.448Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T11:37:28Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-137: Hooks resolve the project from CLAUDE_PROJECT_DIR in a Claude-managed worktree, so dispatches log off-sprint and the ledger attributes nothing

### Open Questions

- **Question:** Which root wins when `CLAUDE_PROJECT_DIR` (the main checkout) and the git toplevel of the tool call's cwd (the worktree) disagree? Options: (a) prefer the git toplevel of the payload `cwd` over `CLAUDE_PROJECT_DIR` whenever it holds a `.cleargate/` directory; (b) read `.active` in both and use whichever is non-empty; (c) leave resolution alone and make the scripts use `CLAUDE_PROJECT_DIR`.
- **Recommended:** (b) for `.active` lookup (cheap, keeps `ORCHESTRATOR_PROJECT_DIR` precedence and the existing cross-project routing of STORY-014-05 intact), with the ledger/dispatch writes going to the root that owns the non-empty `.active`. Option (a) changes root for every hook (pre-edit, autonomy, stamp) and is a wider blast radius.
- **Human decision:** _open_
- **Question:** Does the same split affect `pre-commit*.sh` and `stamp-and-gate.sh` (they also call `cg_repo_root`)?
- **Recommended:** Audit in the fix; the evidence below only proves the ledger, dispatch marker and flashcard-gate paths.
- **Human decision:** _open_

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** In a Claude Code session whose cwd is a Claude-managed worktree (`.claude/worktrees/<name>`, from `claude --worktree` or `claude --bg`), the ClearGate hooks find the sprint that is active in that worktree: SubagentStop ledger rows carry the sprint and story ids, the dispatch marker lands in the sprint's directory, and the flashcard gate sees the sprint.

**Actual Behavior:** The hooks take `CLAUDE_PROJECT_DIR`, which is the main checkout, where no sprint is active (`.active` empty or absent). Every dispatch is logged under `.cleargate/sprint-runs/_off-sprint/` of the main checkout; the ledger attributes no row to a story; the flashcard gate is skipped because it requires `SPRINT_ID != _off-sprint`. Meanwhile the scripts (`update_state.mjs`, `close_sprint.mjs`, ...) resolve from their own location or from the git toplevel, i.e. the worktree. The two halves of ClearGate therefore disagree about where the sprint lives.

## 2. Reproduction Protocol
Deterministic, no model needed:
1. In a repo with ClearGate installed, run `git worktree add .claude/worktrees/s99 -b worktree-s99 main`, then in the worktree create `sprint/S-99`'s state: `printf 'SPRINT-99\n' > .cleargate/sprint-runs/.active` (the main checkout's `.active` stays empty).
2. Export `CLAUDE_PROJECT_DIR=<main checkout>` (what Claude Code sets) and run the hook from the worktree cwd: `printf '{"cwd":"<worktree>","tool_name":"Agent","tool_input":{"subagent_type":"developer","prompt":"STORY-099-01"}}' | bash .claude/hooks/pending-task-sentinel.sh --host claude`.
3. Observe the marker written under `<main checkout>/.cleargate/sprint-runs/_off-sprint/`, none under `<worktree>/.cleargate/sprint-runs/SPRINT-99/`.
4. Repeat with `token-ledger.sh` on a SubagentStop payload: the row lands in `<main checkout>/.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl`.
5. Control: unset `CLAUDE_PROJECT_DIR`; both land under the worktree's `SPRINT-99`.

Edge conditions: `ORCHESTRATOR_PROJECT_DIR` set (must still win, STORY-014-05); worktree without a sprint (stay off-sprint); main checkout with its own active sprint at the same time (two sprints, two roots: the worktree's cwd must not write into the other sprint).

## 3. Evidence & Context
Run 1 (S15, B8), the Reporter: "The ledger-delta sum of 26,504,198 is not credible and no per-agent table is published; 21 of 27 ledger rows are unattributed." Untracked `.cleargate/sprint-runs/_off-sprint/` appeared in run 1's main checkout after `.active` was cleared (S2, close at 08:55-08:57).

Run 2 (S20), the orchestrator, 10:49-10:58 UTC: "The Claude Code hooks still resolve to the main checkout, where no sprint is active, so every dispatch so far was logged under `_off-sprint` there." and, at the 10:57-11:12 waves: "Every verdict returned `tokens: {\"metering\":\"unavailable\"}`, and the hooks logged the dispatches to the main checkout's `_off-sprint` bucket". Run 2 Reporter, 11:12-11:17: "the ledger is absent, so cost is recorded as absent, not estimated". Owner answer (10:58): stay in the worktree for comparability with run 1.

Source behaviour (read 2026-11-15):
```
cleargate-cli/scaffold/hosts/claude/.claude/hooks/lib/harness.sh:46  if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then printf '%s\n' "${CLAUDE_PROJECT_DIR}"; return 0
token-ledger.sh:88            ACTIVE_SENTINEL="${REPO_ROOT}/.cleargate/sprint-runs/.active"
pending-task-sentinel.sh:80   [[ -z "${SPRINT_ID}" ]] && SPRINT_ID="_off-sprint"
pending-task-sentinel.sh:105  if [[ "${IS_AGENT_SPAWN}" == "1" && "${SKIP_FLASHCARD_GATE:-0}" != "1" && "${SPRINT_ID}" != "_off-sprint" ]]; then
```
The payload-cwd git-toplevel fallback (`harness.sh:50-58`) only runs when `CLAUDE_PROJECT_DIR` is unset, which under Claude Code it never is. Impact: `sprint_metrics.mjs` dispatch counts come from transcripts and are unaffected; cost, per-agent tables and the flashcard gate are.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify (canonical, `cleargate-cli` repo, story branch):**
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/lib/harness.sh` (`cg_repo_root`)
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/token-ledger.sh`
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/pre-tool-use-task.sh`
- `cleargate-cli/test/scripts/token-ledger-resolver.red.integration.node.test.ts` (existing resolver tests to extend)
- `cleargate-cli/test/hosts/` (hook harness tests)

Out of scope: `run_script.sh` root resolution (BUG-107 (a) already moved it to the git common dir), and the tracked-run-files problem (BUG-074, BUG-086). Live `.claude/` re-sync after the canonical edit (dogfood split).

## Task Breakdown

- [ ] Write the red test: hook run with `CLAUDE_PROJECT_DIR`=main and cwd=worktree with an active sprint -> Scenario 1
- [ ] Decide the resolution rule (Open Question 1) and implement it in `cg_repo_root` or the per-hook `.active` lookup -> Scenario 1, 2
- [ ] Keep `ORCHESTRATOR_PROJECT_DIR` precedence and the no-worktree behaviour byte-identical -> Scenario 2, 3
- [ ] Audit the other `cg_repo_root` callers (pre-edit, autonomy, stamp, pre-commit) and record the result -> Open Question 2
- [ ] Re-sync live `.claude/` (or hand-port) and add a flashcard

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npx tsx --test test/scripts/token-ledger-resolver.red.integration.node.test.ts` (extend with a worktree fixture)

**SPIDR coverage.** One row per axis.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Plain checkout, Claude-managed worktree and cross-project orchestrator are different successful ways through. |
| Interfaces | T | The ledger hook, the dispatch-marker hook and the flashcard gate all read the root. |
| Data | F | No behaviour differs by data shape; the sentinel is one trimmed string. |
| Rules | T | `ORCHESTRATOR_PROJECT_DIR` keeps precedence; a worktree with no sprint stays off-sprint. |

```gherkin
Feature: Hooks find the sprint active in a Claude-managed worktree

  @paths @interfaces
  Scenario: A dispatch in a worktree session is logged to the worktree's sprint
    Given the main checkout has an empty .active and a worktree has .active reading SPRINT-99
    And CLAUDE_PROJECT_DIR is the main checkout and the payload cwd is the worktree
    When the dispatch marker hook and the SubagentStop ledger hook run
    Then the marker and the ledger row are written under the worktree's sprint-runs/SPRINT-99/
    And nothing is written under the main checkout's _off-sprint/
    And the flashcard gate runs for the agent spawn

  @paths
  Scenario: A plain checkout is unchanged
    Given no worktree and .active reading SPRINT-99
    When the hooks run
    Then output is identical to today's

  @rules
  Scenario: ORCHESTRATOR_PROJECT_DIR still wins
    Given ORCHESTRATOR_PROJECT_DIR names another project
    When the hooks run from a worktree
    Then they write into that project's sprint-runs/ tree
```

**Test layers.**

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | `cg_repo_root` resolution table (bash harness test) |
| Integration tests | 2 | Real git worktree fixture for the ledger hook and the marker hook; no mocks |
| E2E / acceptance tests | 0 | Covered by the SPRINT-46 Goal check (d) re-run in a worktree session (run 3a) |

---

## Prior work

- [[BUG-107]] (run_script.sh root resolution in worktrees, different hook), [[BUG-069]] (ledger fallback attribution), [[BUG-101]] (Codex dispatch attribution), [[STORY-066-17]] (names S20 as out of scope, intake). No item covers hook root vs script root in a worktree session.

## Context Source

**context_source:** SPRINT-46 Goal check (d), runs 1 and 2, findings S20, S15, B8; iteration-3-scoping.md §7 lists it as "later".

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [ ] Open Question 1 (which root wins) has a human decision.
