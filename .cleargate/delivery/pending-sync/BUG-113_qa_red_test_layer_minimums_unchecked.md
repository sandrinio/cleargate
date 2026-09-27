---
bug_id: BUG-113
parent_ref: CR-111
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: sprint-execution
status: Triaged
severity: P3-Low
reporter: orchestrator (SPRINT-41 Codex dogfood run r5, issue I17)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T08:58:00Z
context_source: "Codex dogfood r5 (issues.md I17); verified codebase grounding at cli main 0e5b0ac: scaffold/core/.cleargate/templates/{story,Bug,CR}.md '| Test Type | Minimum Count | Notes |' tables; SKILL.md §C.3 QA-Red return block (:361-367) and TPV check list (:402)"
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
  last_gate_check: 2026-09-27T09:01:06Z
  transition: ready-for-fix
---

# BUG-113: Nothing checks QA-Red's sealed tests against the item's declared Test Layers minimums before the Developer starts

### Open Questions

- **Question:** A mechanical counter, or a reported table the TPV checks?
- **Recommended:** A reported table. A generic counter cannot know a target repo's test naming (the Codex dogfood's QA-Red wrote `test/done-store.test.js`, not `*.red.*`). Two text changes:
  - QA-Red's return block gains `LAYER_COUNTS:` — one line per `Test Type` row of the item's §5 table: `<type>: sealed <n> / minimum <m>`.
  - The TPV check list gains an item that rejects any row with `sealed < minimum`, so the shortfall goes back to QA-Red before the Developer starts.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** A story whose §5 table requires, say, 3 unit tests does not reach the Developer with 0 sealed unit tests.

**Actual Behavior:** In Codex r5, STORY-001-01 declared 3 task-store unit tests. QA-Red sealed process-level acceptance tests only. Neither the pre-gate scan nor the TPV nor the Developer checked the counts; QA-Verify caught it and bounced the story after the build. The owner then had to issue a standing rule ("test-layer shortfalls → back to QA-Red").

## 2. Reproduction Protocol
1. Read SKILL.md §C.3's QA-Red return block and the TPV check list: no per-layer count against §5.
2. Run a story whose §5 table requires unit tests, with a QA-Red that seals only acceptance tests. The first failure comes at QA-Verify.

Edge conditions:
- A row with minimum 0 needs no sealed tests.
- The fast lane (no QA-Red) is unaffected.
- The Codex render of the skill and `qa.toml` carry the same text (generated).

## 3. Evidence & Context
```
Codex r5 QA-Verify: "the story's Test Layers table requires 3 task-store unit tests; the sealed suite has process-level acceptance tests only" → BLOCKED
story.md:209  | Test Type | Minimum Count | Notes |
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- SKILL.md §C.3 QA-Red return block and §C.4 TPV check list (upstream BUG-103).
- `qa.md` QA-Red return contract; then `npm run gen:codex`.
- Tests beside the skill-drift tests.

**Do NOT modify:** the §5 table format in templates; `qa_red_lint.mjs`.

## Task Breakdown

> **Binding plan:** `.cleargate/sprint-runs/SPRINT-41/plans/M7.md` addendum 2026-09-27T09:41Z (A2/A4/A7, errata A1). The plan wins where it differs from this file.

- [ ] QA-Red (lane M7-A): qa-red-layer-counts red (3); CR-124 SKILL/architect appends at integration
- [ ] SKILL §C.3 LAYER_COUNTS return lines + orchestrator check at QA-RED: WRITTEN + §C.3.5 TPV (6); qa.md steps 4/6 + output shape; architect.md Mode TPV item 6; gen:codex
- [ ] Typecheck, targeted, skill-md-conditional-architect, render set, rule-16 set

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scaffold/qa-red-layer-counts.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One QA-Red → TPV path |
| Interfaces | T | The skill, the role file and their Codex renders |
| Data | F | No data variation |
| Rules | T | A shortfall is rejected at TPV |

```gherkin
Feature: Sealed tests meet declared layer minimums before the Developer starts

  @interfaces
  Scenario: QA-Red reports per-layer counts
    Then SKILL.md §C.3 and qa.md name "LAYER_COUNTS" with "sealed <n> / minimum <m>" per Test Type row

  @rules
  Scenario: TPV rejects a shortfall
    Then the TPV check list rejects any row whose sealed count is below its minimum
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | text assertions on canonical and generated files |
| Integration tests | 0 | none |
| E2E / acceptance tests | 0 | DT re-run |

---

## Prior work

- [[CR-123]]: enforces declared SPIDR coverage against Gherkin at authoring time; this is the execution-time analogue for test counts.
- [[CR-111]]: the test-layer naming convention.

## Context Source

**context_source:** Codex dogfood r5 (2026-09-27, issues.md I17); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
