---
bug_id: BUG-103
parent_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: sprint-execution-skill
status: Triaged
severity: P2-Medium
reporter: orchestrator (SPRINT-41 Codex dogfood runs r2–r3, 2026-09-27)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'); applied by the orchestrator under sprint autonomy"
approved_at: 2026-09-27T08:10:00Z
context_source: "Codex dogfood runs r2 and r3 (live codex-cli 0.154.0) final reports and script incidents; verified codebase grounding at cli main f0c33f7: scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:129,153,158,312-317,352,422,455,481,638; scaffold/core/.cleargate/scripts/init_sprint.mjs:5,130-137; src/commands/sprint.ts (sprint init --stories required); scaffold/core/.cleargate/scripts/validate_bounce_readiness.mjs:100"
created_at: 2026-09-27T08:10:00Z
updated_at: 2026-09-27T08:10:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T07:52:30Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-103
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-27T07:52:30Z
  sessions: []
---

# BUG-103: The sprint-execution skill gives commands that fail and rules that contradict each other (found by a Codex agent following it literally)

### Open Questions

- **Question:** Should the fix be text-only, or should `validate_bounce_readiness.mjs` stop counting orchestrator bookkeeping paths as a dirty tree?
- **Recommended:** Text-only, plus one code change: `validate_bounce_readiness.mjs` ignores `.cleargate/wiki/**`, which the PostToolUse ingest rewrites on every delivery edit. The playbook names a legitimate home for orchestrator bookkeeping: a `chore(SPRINT-NN): …` commit on `sprint/S-NN`, which is what the meta-repo already does. So "the sprint branch is never committed to directly" becomes "no story code lands on the sprint branch directly; orchestrator bookkeeping commits do".
- **Human decision:** Recommended option taken by the orchestrator under the owner's SPRINT-41 directives. The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** An agent that follows SKILL.md literally, as a Codex agent does, gets working commands and non-contradictory rules from kickoff to close.

**Actual Behavior:** Five defects, each hit live by Codex:

1. **§A.3 init command fails.** `node .cleargate/scripts/init_sprint.mjs SPRINT-NN` exits with usage `node init_sprint.mjs <sprint-id> --stories ID1,ID2,...`. The CLI wrapper also needs the flag: `cleargate sprint init SPRINT-01` → `error: required option '--stories <csv>' not specified`.
2. **§A.1 check count is wrong.** It says "Six checks, all must pass", while `cleargate sprint preflight` reports "N/5 checks". Check 6 (devops reachability) is manual, as the skill itself notes.
3. **§A.2 contradicts the tree-clean check.** It says "Sprint branch is **never committed to directly**", yet sprint init and the Active flip leave tracked files modified: the plan, the sprint dir and six wiki pages rewritten by ingest. The mandated `validate_bounce_readiness.mjs` (§C.1) then refuses: "git working tree is dirty". Codex improvised by committing bookkeeping on `main` and fast-forwarding the sprint branch.
4. **The script rule's `<cmd>` is ambiguous.** "Script invocation rule (CR-046)" and §C.x give `bash .cleargate/scripts/run_script.sh <cmd> [args...]`. Codex read `<cmd>` as the script name and ran `run_script.sh dispatch_serial.mjs next …` → exit 127, "dispatch_serial.mjs: command not found" (2 script incidents).
5. **Report paths are relative.** Report paths are given as `.cleargate/sprint-runs/<id>/reports/…`. A role agent working inside `.worktrees/STORY-*` wrote its dev report into the worktree's copy, and the canonical main-checkout report was missing.

## 2. Reproduction Protocol
1. Fresh `cleargate init --host codex` repo with an approved epic and 2 stories. Ask a Codex session to run a sprint "exactly the way ClearGate's sprint process says".
2. Observe, in order:
   - `init_sprint.mjs SPRINT-01` prints usage;
   - `cleargate sprint init SPRINT-01` errors for `--stories`;
   - `validate_bounce_readiness.mjs STORY-001-01` reports a dirty tree after init;
   - `run_script.sh dispatch_serial.mjs …` exits 127;
   - the Developer's report lands in `.worktrees/STORY-001-01/.cleargate/sprint-runs/SPRINT-01/reports/`.

Edge conditions:
- Claude and Codex both read this playbook: the Codex copy is rendered from the Claude canonical by `build-codex-payload.mjs`.
- The live meta-repo `/.claude/skills/sprint-execution/SKILL.md` and the outer twins must be re-synced after merge (RS step).

## 3. Evidence & Context
```
$ node .cleargate/scripts/init_sprint.mjs SPRINT-01
Usage: node init_sprint.mjs <sprint-id> --stories ID1,ID2,... [--force]
$ cleargate sprint init SPRINT-01
error: required option '--stories <csv>' not specified
$ cleargate sprint preflight SPRINT-01
cleargate sprint preflight: 2/5 checks failed for SPRINT-01
$ CLEARGATE_STATE_FILE=.cleargate/sprint-runs/SPRINT-01/state.json node .cleargate/scripts/validate_bounce_readiness.mjs STORY-001-01
Error: git working tree is dirty. Uncommitted changes:
 M .cleargate/delivery/pending-sync/SPRINT-01_tiny_node_todo_cli.md
 M .cleargate/wiki/active-sprint.md  (… 5 more wiki pages)
script incident: command "dispatch_serial.mjs", stderr ".cleargate/scripts/run_script.sh: line 125: dispatch_serial.mjs: command not found", exit_code 127
Codex r3 friction 7: "The Developer report was required under the root sprint-run reports path, but was written inside the worktree's copied `.cleargate` directory instead, so the canonical root report is absent."

SKILL.md (claude canonical, cli main f0c33f7): :129 "Six checks, all must pass:" · :153 "Sprint branch is **never committed to directly**." · :158 "node .cleargate/scripts/init_sprint.mjs SPRINT-NN" · :317 "validate_bounce_readiness.mjs checks: … working tree clean. Fail → halt." · :352/:422/:455/:481/:638 "run_script.sh <cmd> [args...]"
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`:
  - §A.1: five automated checks plus the manual devops check;
  - §A.2: bookkeeping commits go on `sprint/S-NN` as `chore(SPRINT-NN): …`, and story code never lands there directly;
  - §A.3: `cleargate sprint init SPRINT-NN --stories <§1 ids>`;
  - the CR-046 rule: a concrete `run_script.sh node .cleargate/scripts/<x>.mjs …` example;
  - report paths: every role report goes to the main checkout's absolute `<repo>/.cleargate/sprint-runs/<id>/reports/`, and the orchestrator passes the absolute path in each dispatch.
- Then regenerate the Codex render (`build-codex-payload.mjs`, `--check` green).
- `cleargate-cli/scaffold/core/.cleargate/scripts/validate_bounce_readiness.mjs`: ignore `.cleargate/wiki/**` in the dirty-tree check.
- The anchor tests that pin SKILL.md text (sprint-execution mirror / canonical-live parity / skill-anchor tests) are updated in the same commit.

**Do NOT modify:** `init_sprint.mjs` or `sprint init` argument parsing (the docs follow the code); `dispatch_serial.mjs` (BUG-102).

**Coordination:** BUG-102 edits SKILL.md §A.4. The Architect orders the two bugs or folds §A.4 into this bug's edit. After merge, the meta-repo live `/.claude/skills/sprint-execution/SKILL.md` needs a re-sync.

## Task Breakdown
- [ ] QA-Red: anchor tests for the five corrected passages (text present in both the Claude canonical and the Codex render); validate_bounce_readiness ignores a dirty `.cleargate/wiki/**` but still refuses other dirty paths
- [ ] Edit SKILL.md (5 passages) and validate_bounce_readiness.mjs; regenerate the Codex payload
- [ ] Typecheck, targeted and anchor tests, `build-codex-payload.mjs --check`, M2 parity pair

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scaffold/sprint-execution-skill-drift.red.node.test.ts` (solo), plus the existing sprint-execution anchor/mirror tests green.

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | Each defect is one corrected passage; no alternative successful flows |
| Interfaces | T | The same text reaches two surfaces: the Claude canonical SKILL.md and the rendered Codex SKILL.md |
| Data | F | No data-shape variation |
| Rules | T | The tree-clean rule ignores wiki churn but still blocks real dirt; story code never lands on the sprint branch directly |

```gherkin
Feature: The sprint-execution skill's commands work and its rules agree

  @interfaces
  Scenario: Both renders carry the corrected kickoff commands
    Given the Claude canonical SKILL.md and the rendered Codex SKILL.md
    Then both say "cleargate sprint init SPRINT-NN --stories", "five automated checks", and give a run_script.sh example that names node and the script path

  @interfaces
  Scenario: Both renders give absolute report paths
    Then both tell the orchestrator to pass the main checkout's absolute reports path in every dispatch

  @rules
  Scenario: Wiki churn does not make the tree dirty
    Given a git repo whose only uncommitted changes are under .cleargate/wiki/
    When validate_bounce_readiness.mjs checks a Ready to Bounce story
    Then the dirty-tree check passes

  @rules
  Scenario: Real uncommitted work still blocks
    Given an uncommitted change under src/
    When validate_bounce_readiness.mjs runs
    Then it exits non-zero with "git working tree is dirty"
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario |
| Integration tests | 0 | text and one script check; covered by unit tests over real files |
| E2E / acceptance tests | 0 | proven by the SPRINT-41 Codex dogfood re-run following the skill without improvisation |

---

## Prior work

- [[CR-078]]: made `init_sprint.mjs` real, and flagged that SKILL.md §A.3 prose needed reconciling with it.
- [[BUG-090]]: its fresh-folder journey confirmed that the working invocation is `sprint init SPRINT-01 --stories …`.
- [[CR-046]]: the run_script.sh wrapper rule whose `<cmd>` placeholder Codex misread.
- [[STORY-058-12]]: the Codex render of this playbook (build-codex-payload.mjs).

## Context Source

**context_source:** Live Codex dogfood runs r2 and r3 (2026-09-27); code grounding at cli main `f0c33f7`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
