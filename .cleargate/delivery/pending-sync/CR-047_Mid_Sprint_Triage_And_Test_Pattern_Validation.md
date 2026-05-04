---
cr_id: CR-047
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-23
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-04T10:30:00Z
approved_by: human
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T10:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  V-Bounce-Engine references:
  - mid-sprint-triage rubric (skills/agent-team/references/mid-sprint-triage.md
    L18-48): every interruption classified Bug / Spec Clarification / Scope
    Change / Approach Change with documented bounce-impact rules; Bugs
    explicitly do NOT increment bounce counters; Scope/Approach require CR
    doc + paused bounce + human approval.
  - Test Pattern Validation gate (skills/agent-team/SKILL.md L339-355):
    Architect-only checkpoint between QA-Red and Dev. Architect verifies
    mock/import/constructor wiring once; Dev cannot weaken tests by
    "fixing" wiring issues.

  ClearGate evidence:
  - Mid-sprint triage: SPRINT-21 had 3 mid-sprint user inputs (vitest→node:test
    decision, drop CR-040, no-vitest enforcement). Each was triaged
    conversationally. SPRINT-22's CR-040 drop happened mid-Brief. With a
    formal rubric, classification is deterministic + auditable.
  - TPV gate: complementary to CR-043's Red/Green discipline. CR-043 prevents
    Dev from EDITING Red tests (file-level immutability). TPV gate prevents
    Architect from approving Red tests with broken WIRING (mocks pointing at
    wrong modules; constructor signatures off; import paths typo'd). Dev's
    "Green" attempt would fail not because impl is wrong but because tests
    can't run — wastes a Dev cycle. TPV catches it once before Dev starts.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T10:22:01Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-047
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T10:22:00Z
  sessions: []
---

# CR-047: Mid-sprint Triage Rubric + Test Pattern Validation Gate

## 0.5 Open Questions

- **Question:** Mid-sprint triage rubric — formal SKILL.md section vs separate doc?
  - **Recommended:** SKILL.md §C.10 (or wherever fits in the renumbered §C). Mirror V-Bounce's mid-sprint-triage.md as a ClearGate knowledge doc at `.cleargate/knowledge/mid-sprint-triage-rubric.md` referenced from SKILL.md.
  - **Human decision:** _populated during Brief review_

- **Question:** TPV gate — between QA-Red and Dev, OR after Dev?
  - **Recommended:** between QA-Red and Dev (V-Bounce pattern). Architect-only dispatch with `Mode: TPV` in the prompt. Reads QA-Red's Red tests; verifies mock/import/constructor wiring is sound; approves OR returns to QA-Red for fix. Cost: ~5min/standard-lane-story (Architect read-only review).
  - **Human decision:** _populated during Brief review_

- **Question:** TPV scope — what does Architect verify?
  - **Recommended:** (a) all imports resolve to real modules, (b) all constructor calls match actual signatures, (c) all `t.mock.method()` calls reference methods that exist on the mocked object, (d) test setup/teardown doesn't leave orphan state, (e) test file is `*.red.node.test.ts` (CR-043 naming). NOT: (f) test logic is "good" — that's Dev's TDD challenge.
  - **Human decision:** _populated during Brief review_

- **Question:** What if Dev finds a wiring issue post-TPV?
  - **Recommended:** Dev returns `BLOCKED: tpv-gap — <specific wiring issue>`. Orchestrator routes to Architect for re-TPV (re-dispatch with the gap). Re-TPV decrements `arch_bounces` only (not qa_bounces — QA-Red wrote correct test logic; wiring miss is Architect's review failure). Document in SKILL.md state machine.
  - **Human decision:** _populated during Brief review_

- **Question:** Triage rubric scope — applies only to USER input, or also to QA-FAIL bounces?
  - **Recommended:** USER input only. QA-FAIL bounces have their own counter (qa_bounces) and routing (re-dispatch Dev). Triage is for orchestrator-classifying mid-sprint USER messages: Bug / Clarification / Scope-Change / Approach-Change.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Mid-sprint user input is classified conversationally by the orchestrator.
- "Should this become a CR?" decisions are case-by-case judgment calls.
- After QA-Red writes failing tests, Dev starts immediately — no validation that the test wiring is correct.

**New Logic (The New Truth):**
- Mid-sprint user input flows through a formal 4-class rubric: Bug / Spec Clarification / Scope Change / Approach Change. Each class has documented routing rules (CR creation? bounce-counter impact? human approval needed?).
- Between QA-Red dispatch and Dev dispatch, orchestrator runs an Architect TPV (Test Pattern Validation) dispatch. Architect-only review of mock/import/constructor wiring. Approves OR returns to QA-Red.
- Dev only starts after TPV approves. Less wasted Dev cycles on broken-wiring Red tests.

## 2. Blast Radius & Invalidation

- [ ] **`cleargate-planning/.claude/skills/sprint-execution/SKILL.md`** — NEW §C.10 (Mid-Sprint Triage) + extension of §C.3 sequence to insert TPV between QA-Red and Dev (renumber §C.4..§C.10 → §C.5..§C.11 if needed).
- [ ] **`.cleargate/knowledge/mid-sprint-triage-rubric.md`** — NEW knowledge doc (4-class rubric with examples).
- [ ] **`cleargate-planning/.claude/agents/architect.md`** — extend with `Mode: TPV` dispatch contract; specify what Architect reviews (mock/import/constructor wiring) and the approve/return-to-QA-Red decision.
- [ ] **`cleargate-planning/.claude/agents/qa.md`** — Add note that QA-Red tests must be wiring-sound before TPV approves; gap routing returns to QA-Red.
- [ ] **`.cleargate/scripts/update_state.mjs`** — verify state machine accommodates TPV bounce (likely uses existing `arch_bounces` counter; no schema change needed).
- [ ] **`cleargate-cli/src/lib/triage-classifier.ts`** — NEW. Pure function `classify(userInput: string): { class: 'bug'|'clarification'|'scope'|'approach', confidence: 'high'|'low', reasoning: string }`. Used by orchestrator as advisory input.

## Existing Surfaces

- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C — execution loop (TPV insert post-CR-043 §C.3).
- **Surface:** `cleargate-planning/.claude/agents/architect.md` — Architect prompt (TPV mode addition).
- **Surface:** `cleargate-planning/.claude/agents/qa.md` — QA prompt (RED-mode wiring acceptance).
- **Surface:** `.cleargate/knowledge/` — knowledge dir for cross-cutting docs (rubric lives here).
- **Surface:** `.cleargate/scripts/update_state.mjs` — state machine (verify no schema change needed).
- **Why this CR extends rather than rebuilds:** Architect role exists; QA-Red dispatch shape exists (CR-043). CR-047 adds one Architect mode + one knowledge doc + one classifier helper. Not a from-scratch process introduction.

## 3. Execution Sandbox

**Modify:**
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — NEW §C.10 + insert TPV step in §C.3 sequence
- `cleargate-planning/.claude/agents/architect.md` — `Mode: TPV` contract
- `cleargate-planning/.claude/agents/qa.md` — RED-mode wiring acceptance note

**Add:**
- `.cleargate/knowledge/mid-sprint-triage-rubric.md` — 4-class rubric doc
- `cleargate-cli/src/lib/triage-classifier.ts` — pure classifier function
- `cleargate-cli/test/lib/triage-classifier.node.test.ts` — 8 scenarios: 2 per class with edge cases
- `cleargate-cli/test/scripts/tpv-architect.node.test.ts` — 4 scenarios: TPV approves, TPV returns wiring gap, arch_bounces increments on TPV gap, state machine handles TPV bounce

**Out of scope:**
- Auto-classification of mid-sprint input (classifier is advisory; orchestrator + human still decide).
- TPV for fast-lane stories (skip — fast lane already skips QA-Red per CR-043).
- Mid-sprint amendment workflow for sprint-context.md (CR-045's scope).

## 4. Verification Protocol

**Acceptance:**
1. `.cleargate/knowledge/mid-sprint-triage-rubric.md` exists with 4 classes (Bug/Clarification/Scope/Approach), each with: definition, routing rules, bounce-counter impact, human-approval-required flag, 2 examples.
2. `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` documents Mid-Sprint Triage in §C.10 with rubric reference + classifier-output usage.
3. SKILL.md §C.3 sequence inserts TPV step between QA-Red and Dev (cite exact location).
4. `cleargate-planning/.claude/agents/architect.md` has `Mode: TPV` dispatch contract: read QA-Red tests, verify wiring, return APPROVED or BLOCKED-WIRING-GAP.
5. `cleargate-cli/src/lib/triage-classifier.ts` exports `classify(userInput: string): TriageResult`. NEW `*.red.node.test.ts` (QA-Red authored) covers 8 scenarios.
6. `cleargate-cli/test/scripts/tpv-architect.node.test.ts` covers 4 scenarios; Dev makes them pass.
7. State machine verified: TPV gap increments `arch_bounces` (NOT `qa_bounces`); ≥3 hits escalate.
8. Mirror parity: `diff` canonical ↔ npm payload empty for all touched files post-prebuild.

**Test Commands:**
- `npm test -- test/lib/triage-classifier.node.test.ts test/scripts/tpv-architect.node.test.ts`

**Pre-commit:** `cd cleargate-cli && npm run typecheck` + `npm test` (node:test only). Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] Downstream impacts identified (SKILL.md, 2 agent prompts, NEW knowledge doc, NEW classifier lib, 2 test files).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification commands provided (8 acceptance criteria).
- [ ] `approved: true` is set in YAML frontmatter (post-Brief).
- [x] §Existing Surfaces cites at least one source-tree path the CR extends.
