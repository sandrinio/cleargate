---
bug_id: BUG-111
parent_ref: STORY-058-12
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: serial-dispatch
status: Triaged
severity: P3-Low
reporter: orchestrator (SPRINT-41 Codex dogfood run r7, issue I23)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T10:05:00Z
context_source: "Codex dogfood r7 (issues.md I23); verified codebase grounding at cli main 0e5b0ac: scaffold/core/.cleargate/scripts/dispatch_serial.mjs:407 (no wave error), architect-synth wave naming wave1/wave2, dispatch-serial.md:17,26,61 (--wave <wave-id> with no example)"
created_at: 2026-09-27T10:05:00Z
updated_at: 2026-09-27T10:05:00Z
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

# BUG-111: `dispatch_serial.mjs` rejects an unknown wave id without naming the valid ones

### Open Questions

- **Question:** Accept aliases like `W2`, or just report the valid ids?
- **Recommended:** Report them; no aliasing. The error becomes `<file>: no wave 'W2' (waves: wave1, wave2)`, and `dispatch-serial.md` shows a concrete `--wave wave1` example next to the placeholder.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A wrong `--wave` value fails with a message that lets the caller correct it in one step.

**Actual Behavior:** `dispatch_serial.mjs next --sprint SPRINT-01 --wave W2` → `…/waves.json: no wave 'W2'`. architect-synth names waves `wave1`, `wave2`, and the playbook shows only `--wave <wave-id>`, so Codex guessed `W2`.

## 2. Reproduction Protocol
1. With a waves.json whose waves are `wave1` and `wave2`, run `node .cleargate/scripts/dispatch_serial.mjs next --sprint SPRINT-01 --wave W2`.
2. Observe the error, with no list of valid ids.

Edge conditions:
- A waves.json with zero waves reports `(waves: none)`.
- A valid id behaves exactly as today.

## 3. Evidence & Context
```
$ node .cleargate/scripts/dispatch_serial.mjs next --sprint SPRINT-01 --wave W2
dispatch_serial.mjs: …/plans/waves.json: no wave 'W2'
dispatch_serial.mjs:407  if (!wave) throw new UsageError(`${wavesFile}: no wave '${waveId}'`);
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs:407` (upstream BUG-102, which owns this script in the batch).
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md` example (upstream BUG-103).

**Do NOT modify:** wave naming in architect-synth; `nextAction` semantics.

## Task Breakdown
- [ ] QA-Red: the unknown-wave error lists the ids; zero-wave message; dispatch-serial.md example
- [ ] Implement the message and the example line
- [ ] Typecheck, targeted tests, dispatch_serial tests green

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/dispatch-serial-wave-ids.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One lookup path |
| Interfaces | T | The script error and the playbook example |
| Data | T | Two waves vs zero waves |
| Rules | F | No business rule |

```gherkin
Feature: Unknown wave ids are correctable

  @data @interfaces
  Scenario Outline: The error lists valid waves
    Given a waves.json with waves <waves>
    When dispatch_serial.mjs next --wave W2 runs
    Then it exits 2 with "no wave 'W2' (waves: <listed>)"
    Examples:
      | waves        | listed       |
      | wave1, wave2 | wave1, wave2 |
      | (none)       | none         |

  @interfaces
  Scenario: The playbook shows a concrete wave id
    Then dispatch-serial.md contains "--wave wave1"
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | two outline rows and the text assertion |
| Integration tests | 0 | none |
| E2E / acceptance tests | 0 | DT re-run |

---

## Prior work

- [[BUG-102]]: owns `dispatch_serial.mjs`'s waves.json handling in this batch; this item extends it.
- [[STORY-058-12]]: introduced `dispatch_serial.mjs`.

## Context Source

**context_source:** Codex dogfood r7 (2026-09-27, issues.md I23); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
