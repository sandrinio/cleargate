---
bug_id: BUG-110
parent_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: true
area: scripts
status: Triaged
severity: P2-Medium
reporter: orchestrator (SPRINT-41 Codex dogfood runs r2-r6, issue I18)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T08:58:00Z
context_source: "Codex dogfood (issues.md I18); verified codebase grounding at cli main 0e5b0ac: scaffold/core/.cleargate/scripts/validate_bounce_readiness.mjs:36-45, scaffold/core/.cleargate/scripts/update_state.mjs:209-215 (resolveStateFile throws when CLEARGATE_STATE_FILE is unset); SKILL.md examples call both with no env"
created_at: 2026-09-27T08:58:00Z
updated_at: 2026-09-27T08:58:00Z
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
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T09:01:05Z
  transition: ready-for-fix
---

# BUG-110: The state scripts the skill prescribes exit 1 unless `CLEARGATE_STATE_FILE` is set, and no example sets it

### Open Questions

- **Question:** Should every skill example carry `CLEARGATE_STATE_FILE=…`, or should the scripts resolve state.json themselves?
- **Recommended:** The scripts resolve it. When the env is unset, `validate_bounce_readiness.mjs` and `update_state.mjs` use `<main checkout>/.cleargate/sprint-runs/<.active>/state.json`. The main checkout is the parent of `git rev-parse --path-format=absolute --git-common-dir`, so the fallback works from a linked worktree too; outside git it is the script's own repo root. The env still wins when set. With no `.active` sentinel, both exit 1 with the existing message plus `(no .cleargate/sprint-runs/.active either)`.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A command the playbook prescribes verbatim, e.g. `node .cleargate/scripts/validate_bounce_readiness.mjs STORY-NNN-NN`, works in an installed repo with an active sprint.

**Actual Behavior:** Both scripts exit 1 with `CLEARGATE_STATE_FILE env var not set; cannot resolve state.json`. Codex worked this out in early runs and lost it at every new session; the operator had to put `CLEARGATE_STATE_FILE=<abs path>` into each run's prompt (r4–r8).

## 2. Reproduction Protocol
1. In an installed repo, `init_sprint.mjs SPRINT-01` (writes `.active` and state.json).
2. Run `node .cleargate/scripts/validate_bounce_readiness.mjs STORY-001-01` with no env → exit 1, the message above.
3. Run `node .cleargate/scripts/update_state.mjs STORY-001-01 "Ready to Bounce"` with no env → same error.

Edge conditions:
- A set `CLEARGATE_STATE_FILE` keeps precedence (tests and cross-project orchestration rely on it).
- Run from a linked worktree, the fallback resolves the MAIN checkout's state.json, never the worktree's stale copy.
- No `.active` → the error stays, with the added hint.

## 3. Evidence & Context
```
$ node .cleargate/scripts/validate_bounce_readiness.mjs STORY-001-02
Error: CLEARGATE_STATE_FILE env var not set; cannot resolve state.json
validate_bounce_readiness.mjs:36  const stateFile = process.env.CLEARGATE_STATE_FILE ? path.resolve(...) : null;
update_state.mjs:209  function resolveStateFile() { … throw new Error('CLEARGATE_STATE_FILE env var not set; cannot resolve state.json'); }
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/validate_bounce_readiness.mjs` and `update_state.mjs`: a shared fallback (a small helper in `scripts/lib/` if one fits the existing layout).
- Tests beside the existing update_state / bounce-readiness tests.

**Do NOT modify:** the env-first precedence; state.json schema; the `.active` writer (`init_sprint.mjs`).

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-41/plans/M7.md` addendum 2026-09-27T09:41Z (A2/A4/A7, errata A1). The plan wins where it differs from this file.

- [ ] QA-Red (lane M7-B): state-file-fallback red (4); update_state.mjs row + state-file.mjs addition; validate_bounce_readiness append at integration
- [ ] lib/state-file.mjs (mainCheckoutRoot, resolveStateFile); update_state.mjs + validate_bounce_readiness.mjs delegate with Error: output; twins (update_state + lib in one outer commit)
- [ ] Typecheck, targeted, test_update_state.integration, state/story suites, BUG-102/103 script tests, verify-pack (+1 declared), M2 pair

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/state-file-fallback.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Main checkout and linked worktree both resolve the same state.json |
| Interfaces | T | Two scripts share the fallback |
| Data | F | No data variation |
| Rules | T | The env wins; a missing sentinel still errors |

```gherkin
Feature: State scripts find the active sprint's state.json

  @paths @interfaces
  Scenario Outline: No env, active sprint
    Given an installed repo with .active = SPRINT-01 and a linked worktree
    When <script> runs from <cwd> with CLEARGATE_STATE_FILE unset
    Then it reads the main checkout's .cleargate/sprint-runs/SPRINT-01/state.json
    Examples:
      | script                        | cwd           |
      | validate_bounce_readiness.mjs | main checkout |
      | update_state.mjs              | worktree      |

  @rules
  Scenario: The env wins
    Given CLEARGATE_STATE_FILE points at another state.json
    Then both scripts use it

  @rules
  Scenario: No sentinel
    Given no .cleargate/sprint-runs/.active and no env
    Then both scripts exit 1 naming CLEARGATE_STATE_FILE and .active
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | two outline rows, env precedence, no sentinel |
| Integration tests | 0 | none |
| E2E / acceptance tests | 0 | the DT Codex re-run runs with no operator note |

---

## Prior work

- [[BUG-103]]: edits `validate_bounce_readiness.mjs` (the wiki-dirt rule) in the same batch, so this has upstream BUG-103; none found for the env path itself.

## Context Source

**context_source:** Codex dogfood (2026-09-27, issues.md I18); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
