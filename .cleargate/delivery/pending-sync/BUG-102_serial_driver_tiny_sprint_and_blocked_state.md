---
bug_id: BUG-102
parent_ref: STORY-058-12
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: dispatch-serial
status: Triaged
severity: P2-Medium
reporter: orchestrator (SPRINT-41 Codex dogfood run, 2026-09-27)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'); applied by the orchestrator under sprint autonomy"
approved_at: 2026-09-27T08:05:00Z
context_source: "Codex dogfood run r3 (live codex-cli 0.154.0) final report and events; verified codebase grounding at cli main f0c33f7: scaffold/core/.cleargate/scripts/dispatch_serial.mjs:393-410 (waves load), :455-500 (record), scaffold/core/.cleargate/scripts/constants.mjs:35-46 (VALID_STATES), SKILL.md §A.4 tiny-sprint floor (claude :177-185, codex render :187-195), dispatch-serial.md §5-§6"
created_at: 2026-09-27T08:05:00Z
updated_at: 2026-09-27T08:29:07Z
created_at_version: strategy-phase-pre-init
updated_at_version: 94da1ca3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T07:51:39Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-102
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-27T07:51:39Z
  sessions: []
---

# BUG-102: The serial driver needs a waves.json that the tiny-sprint rule omits, and its verdicts never move state.json

### Open Questions

- **Question:** Should the tiny-sprint path produce a waves.json, or should `dispatch_serial.mjs` work without one? Which state transitions should the serial driver own?
- **Recommended:**
  - **(a) waves.json:** the N ≤ 2 single-dispatch SDR also writes a minimal `plans/waves.json`: schema_version 2, one serial wave per the §2.2 merge order. `dispatch_serial.mjs` keeps requiring it, and its missing-file error names the fix: `no plans/waves.json — even a 1–2 story sprint needs one serial wave (SKILL.md §A.4)`.
  - **(b) state:**
    - `next` moves the story it names from `Ready to Bounce` to `Bouncing` (no-op if it is already Bouncing);
    - `record` with ESCALATED sets `Escalated`;
    - `record` with BLOCKED leaves the story `Bouncing` and prints the blocker, so the state reads "in flight, awaiting a human", never `Ready to Bounce`;
    - GREEN changes nothing, because DevOps owns `Done`.
  - The driver calls `update_state.mjs` with the same `CLEARGATE_STATE_FILE` resolution the playbook uses.
- **Human decision:** Recommended option taken by the orchestrator under the owner's SPRINT-41 directives. The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A 1–2 story sprint on a serial host (Codex) runs through `dispatch_serial.mjs` without improvisation. After any recorded verdict, `state.json` agrees with the serial verdict log.

**Actual Behavior:**
1. **No waves.json.** SKILL.md §A.4's tiny-sprint floor (N ≤ 2) says "a wave plan is degenerate; run them in the order §2.2 Merge Ordering gives", so the SDR produces no `waves.json`. `dispatch_serial.mjs next` then fails with `cannot read …/plans/waves.json: ENOENT`. The Codex orchestrator had to improvise an extra Architect re-dispatch to fabricate one.
2. **State and verdict disagree.** After the Developer's BLOCKED verdict (spec-contradiction) was recorded, `state.json` still showed the story `Ready to Bounce`, although it had been dispatched and blocked. Codex reported "state and serial verdict disagree".

## 2. Reproduction Protocol
1. On a `cleargate init --host codex` repo, init a sprint with 2 stories and run the N ≤ 2 SDR path exactly as SKILL.md §A.4 says, which produces no waves.json.
2. Run `node .cleargate/scripts/dispatch_serial.mjs next --sprint SPRINT-01 --wave wave1` and observe `cannot read …/plans/waves.json: ENOENT`.
3. With a waves.json present, dispatch the story and record a BLOCKED verdict: `dispatch_serial.mjs record --sprint SPRINT-01 --wave wave1 --verdict <blocked.json>`.
4. Observe that `state.json` still has `STORY-001-01.state = "Ready to Bounce"`.

Edge conditions:
- `--resume` after a human resolution must still name the blocked story (its state stays Bouncing).
- A story already `Bouncing` (orchestrator-set) must not error.
- ESCALATED is terminal (`TERMINAL_STATES` includes Escalated).
- GREEN must not set Done.

## 3. Evidence & Context
```
Dogfood r3 (codex events): dispatch_serial.mjs next --sprint SPRINT-01 --wave M1
dispatch_serial.mjs: cannot read .../plans/waves.json: ENOENT: no such file or directory
Codex: "The serial dispatcher cannot run because the tiny-sprint SDR rule says not to create `waves.json`, while the required serial contract requires it. I'll make one narrowly scoped Architect re-dispatch to generate the minimal serialized wave plan"

Dogfood r3 final report:
- STORY-001-01: `BLOCKED` by recorded serial verdict (`spec-contradiction`). `state.json` remains `Ready to Bounce`, so state and serial verdict disagree.

SKILL.md §A.4 (claude canonical :185 / codex render :195): "With ≤ 2 stories a wave plan is degenerate; run them in the order §2.2 Merge Ordering gives."
dispatch_serial.mjs:394-399: const wavesFile = path.join(sprintDir, 'plans', 'waves.json'); … throw new UsageError(`cannot read ${wavesFile}: ${err.message}`);
constants.mjs VALID_STATES: Ready to Bounce, Bouncing, QA Passed, Architect Passed, Sprint Review, Done, Escalated, Parking Lot
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs`: the missing-waves error text; `next` → Bouncing; `record` ESCALATED → Escalated and BLOCKED → stays Bouncing, via update_state.
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` §A.4 tiny-sprint paragraph: the single-dispatch Architect also writes a one-wave `waves.json`. Then regenerate the Codex render (`build-codex-payload.mjs`, `--check` green) and `dispatch-serial.md` if it restates it.
- Tests beside `dispatch-serial` / `dispatch-serial-cli` (STORY-058-12's contract tests stay green).

**Do NOT modify:** `update_state.mjs` semantics, `constants.mjs`, or the verdict schema (`validateVerdicts`).

**Coordination:** BUG-103 also edits SKILL.md, in §A.1, §A.3 and the script rule. The Architect orders the two or folds this bug's one §A.4 paragraph into BUG-103's edit.

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-41/plans/M7.md` §3 BUG-102 (errata §1 E5, E6 (OD-M7-4: record drives state; next writes nothing), E7; all prose moves to BUG-103 (OD-M7-5)). The plan wins where it differs from this file.

- [ ] QA-Red: dispatch-serial-state red (5)
- [ ] ENOENT message; record-driven state sync via update_state.mjs (BLOCKED→Bouncing from Ready to Bounce, ESCALATED→Escalated, GREEN none); twin
- [ ] Typecheck, targeted, -12 dispatch tests, rule-16 set, scripted codex-loop

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scripts/dispatch-serial-state.red.node.test.ts` (solo), plus `dispatch-serial` and `dispatch-serial-cli` green.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | GREEN, BLOCKED and ESCALATED verdicts each take a different successful path through record |
| Interfaces | F | One surface: the dispatch_serial.mjs CLI (next/record) |
| Data | F | Verdict shape is fixed by validateVerdicts; no data-shape variation |
| Rules | T | DevOps owns Done (GREEN never sets it); a blocked story stays resumable; a tiny sprint still needs one wave |

```gherkin
Feature: The serial driver runs tiny sprints and keeps state.json in step

  @rules
  Scenario: A missing waves.json names the fix
    Given a sprint dir with no plans/waves.json
    When dispatch_serial.mjs next runs
    Then it exits 2 and the message names SKILL.md §A.4's one-wave waves.json

  @paths @rules
  Scenario: next and BLOCKED keep the story in flight
    Given STORY-001-01 is "Ready to Bounce" in a one-wave plan
    When next names STORY-001-01 and a BLOCKED verdict is recorded for it
    Then state.json shows STORY-001-01 "Bouncing" and next --resume names it again

  @paths
  Scenario: ESCALATED is recorded in state
    When an ESCALATED verdict is recorded for STORY-001-01
    Then state.json shows STORY-001-01 "Escalated"

  @paths @rules
  Scenario: GREEN leaves Done to DevOps
    When a GREEN verdict is recorded for STORY-001-01
    Then state.json is unchanged by the driver
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | one per scenario, temp sprint dirs with a real state.json |
| Integration tests | 0 | dispatch-serial-cli (existing) covers the CLI wiring |
| E2E / acceptance tests | 0 | proven by the SPRINT-41 Codex dogfood re-run (tiny sprint, no improvisation) |

---

## Prior work

- [[STORY-058-12]]: introduced `dispatch_serial.mjs` and the Codex serial dispatch mode.
- [[CR-124]]: the contract-first waves.json schema_version 2 the driver reads.
- [[EPIC-058]]: owns Codex host execution.

## Context Source

**context_source:** Live Codex dogfood run r3 (2026-09-27); code grounding at cli main `f0c33f7`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
