---
bug_id: BUG-108
parent_ref: CR-024
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: sprint-execution
status: Triaged
severity: P2-Medium
reporter: orchestrator (SPRINT-41 Codex dogfood runs r6/r7, issues I21 + I24)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T10:05:00Z
context_source: "Codex dogfood r6/r7 (issues.md I21, I24); verified codebase grounding at cli main 0e5b0ac: scaffold/hosts/claude/.claude/agents/qa.md:23-27,89-91 (pack required on spawn; pack-absent fallback = FAIL), scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md (no prep_qa_context invocation anywhere), scaffold/core/.cleargate/scripts/prep_qa_context.mjs usage '<story-id> <worktree-path>'"
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
  last_gate_check: 2026-09-27T09:01:04Z
  transition: ready-for-fix
---

# BUG-108: The QA role requires a context pack that the sprint-execution skill never tells the orchestrator to build

### Open Questions

- **Question:** Which QA dispatches need the pack, and where does the skill prescribe building it?
- **Recommended:** Only QA-Verify needs it: the pack's sections (Dev Handoff, Baseline, Adjacent Files) presuppose a Developer commit. QA-Red runs before any Dev handoff.
  - `SKILL.md` gains one step before the QA-Verify spawn: `node .cleargate/scripts/prep_qa_context.mjs <STORY-ID> <absolute worktree path>`, with both arguments shown.
  - `qa.md` (and its generated Codex TOML) scopes "first action on spawn: read the pack" and the pack-absent FAIL to Verify mode; QA-Red mode reads the story, plan and flashcards directly.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Every artifact a role requires on spawn is produced by a step the orchestrator's playbook prescribes, with its exact arguments.

**Actual Behavior:** `qa.md` makes the QA Context Pack the first action on spawn and says a missing pack is `QA: FAIL — pack missing … orchestrator must run prep_qa_context.mjs before QA dispatch`. The sprint-execution skill never mentions `prep_qa_context.mjs`. In the Codex dogfood:
- QA-Red for STORY-001-02 stopped because no pack existed (r6);
- the orchestrator then guessed the call, `prep_qa_context.mjs STORY-001-02`, and got a usage error: the script needs `<story-id> <worktree-path>` (r7).

## 2. Reproduction Protocol
1. `command grep -n "prep_qa_context" scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` → no match.
2. `command grep -n "prep_qa_context\|qa-context" scaffold/hosts/claude/.claude/agents/qa.md` → the pack is required on spawn, with a FAIL fallback.
3. Follow the skill literally for a standard-lane story: no step builds `.qa-context-<id>.md`, so QA stops.

Edge conditions:
- The Codex render of the skill and the Codex `qa.toml` must carry the same fix (generated; `npm run gen:codex`).
- The fast lane skips QA-Red; QA-Verify still needs the pack.
- The pack command runs from the main checkout, with the worktree path absolute.

## 3. Evidence & Context
```
Codex r7: node .cleargate/scripts/prep_qa_context.mjs STORY-001-02
Usage: node prep_qa_context.mjs <story-id> <worktree-path> [--output <path>] [--dev-handoff-json <path>]
qa.md:89  - **First action on spawn (after flashcard check):** `Read(.cleargate/sprint-runs/<sprint>/.qa-context-<story-id>.md)`.
qa.md:91  - **Pack-absent fallback:** … emit `QA: FAIL — pack missing at <expected-path>; orchestrator must run prep_qa_context.mjs before QA dispatch` and stop.
SKILL.md: 0 matches for prep_qa_context
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`: one pre-QA-Verify step with the exact invocation. This edits the same file as BUG-103, so it has upstream BUG-103.
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md`: scope the pack requirement to Verify mode. Then `npm run gen:codex`.
- Tests beside the skill-drift and codex-render tests.

**Do NOT modify:** `prep_qa_context.mjs` (M2-frozen, `schema_version: 1`); pack structure.

## Task Breakdown
- [ ] QA-Red: skill names `prep_qa_context.mjs <STORY-ID> <worktree>` before QA-Verify; qa.md requires the pack in Verify mode only; the Codex renders match
- [ ] Edit SKILL.md and qa.md, then gen:codex
- [ ] Typecheck, targeted tests, sprint-execution-mirror (red until the RS step), codex render tests

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scaffold/qa-context-pack-prescribed.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One path: the orchestrator builds the pack before QA-Verify |
| Interfaces | T | The Claude skill and role file, and their Codex renders |
| Data | F | No data variation |
| Rules | T | Verify mode requires the pack; Red mode does not |

```gherkin
Feature: The QA context pack is prescribed where it is required

  @interfaces
  Scenario: The skill builds the pack before QA-Verify
    Given the canonical sprint-execution SKILL.md and its Codex render
    Then each prescribes "prep_qa_context.mjs <STORY-ID> <worktree" before the QA-Verify spawn

  @rules
  Scenario: Only Verify mode requires the pack
    Given qa.md and the generated qa.toml
    Then the pack-absent FAIL is scoped to Verify mode
    And QA-Red mode names the story, plan and flashcards as its inputs
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | text assertions on canonical and generated files |
| Integration tests | 0 | the mirror test covers live parity after the RS step |
| E2E / acceptance tests | 0 | observed in the DT Codex re-run |

---

## Prior work

- [[CR-024]]: introduced the QA Context Pack and `prep_qa_context.mjs`.
- [[BUG-103]]: rewrites SKILL.md for five other drift defects; this item adds the missing pack step on top of it.

## Context Source

**context_source:** Codex dogfood r6/r7 (2026-09-27, issues.md I21/I24); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
