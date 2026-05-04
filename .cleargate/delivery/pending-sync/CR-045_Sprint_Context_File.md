---
cr_id: CR-045
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-23
carry_over: false
status: Draft
approved: false
created_at: 2026-05-04T10:00:00Z
updated_at: 2026-05-04T09:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  V-Bounce-Engine reference (skills/agent-team/SKILL.md L258-263): every
  agent task receives a Sprint Context File injection — `.vbounce/sprint-
  context-S-NN.md` written at sprint kickoff. Cross-cutting decisions
  ("we're in v2 mode", "no vitest in this sprint", "DevOps owns merges")
  propagate to every dispatch without re-dispatching the Architect.

  ClearGate equivalent: `.cleargate/templates/sprint_context.md` template
  ALREADY EXISTS in the repo (verified 2026-05-04). It's never written or
  consumed by the orchestration. CR-045 wires the missing plumbing.

  SPRINT-22 evidence of need: every Dev/QA dispatch in SPRINT-22 carried
  a duplicated "NO VITEST" reminder + "Mode: RED/VERIFY" routing in the
  dispatch text. Each one was hand-written by orchestrator. With a Sprint
  Context File, that boilerplate moves out of dispatch text and into a
  single sprint-scoped file; orchestrator just references "see
  sprint-context.md for cross-cutting rules."
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T09:58:56Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-045
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T09:51:58Z
  sessions: []
---

# CR-045: Sprint Context File — orchestrator dispatches read this once

## 0.5 Open Questions

- **Question:** When does the Sprint Context File get written?
  - **Recommended:** at sprint kickoff. Extend `.cleargate/scripts/init_sprint.mjs` to copy `.cleargate/templates/sprint_context.md` to `.cleargate/sprint-runs/<sprint-id>/sprint-context.md` populated with sprint-specific values (sprint_id, execution_mode, goal, no-vitest constraint, active-CR list).
  - **Human decision:** _populated during Brief review_

- **Question:** Who can update mid-sprint?
  - **Recommended:** Architect SDR can update at sprint kickoff. Architect mid-sprint dispatch can update on `CR:scope-change` or `CR:approach-change`. Orchestrator + Dev/QA agents are read-only. Updates appended (don't rewrite).
  - **Human decision:** _populated during Brief review_

- **Question:** How do dispatches "read" it?
  - **Recommended:** orchestrator's dispatch text injects: "Cross-cutting sprint rules — read `.cleargate/sprint-runs/<id>/sprint-context.md` BEFORE you start work. Adhere to every rule listed there." Dev/QA agents Read it as part of preflight. Cost: ~1k tokens per dispatch (much cheaper than re-dispatching Architect for a clarification).
  - **Human decision:** _populated during Brief review_

- **Question:** What's the schema?
  - **Recommended:** sections — `## Sprint Goal` (verbatim from plan §0), `## Cross-Cutting Rules` (bullets — "no vitest", "v2 mode", "all new tests *.node.test.ts", etc.), `## Active CRs` (id + title + lane), `## Mid-Sprint Amendments` (append-only timeline). Template at `.cleargate/templates/sprint_context.md` already has the skeleton; CR-045 verifies + extends.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Cross-cutting sprint rules ("no vitest", "v2 mode", "all new tests `*.node.test.ts`", "DevOps owns merges") are repeated verbatim in every Dev/QA dispatch text.
- Mid-sprint clarifications require re-dispatching the Architect or restating in every subsequent dispatch.
- The `.cleargate/templates/sprint_context.md` template exists but is never consumed by orchestration code.

**New Logic (The New Truth):**
- `.cleargate/sprint-runs/<sprint-id>/sprint-context.md` is written at sprint kickoff (init_sprint.mjs extension).
- Architect SDR can amend on kickoff or on mid-sprint CR:approach/scope-change.
- Every Dev/QA dispatch text instructs the agent to Read the sprint-context.md file as preflight.
- Orchestrator's dispatch boilerplate shrinks: cross-cutting rules move out of dispatch text, into sprint-context.md.

## 2. Blast Radius & Invalidation

- [ ] **`.cleargate/templates/sprint_context.md`** — verify the existing template covers the proposed schema; extend/correct if needed.
- [ ] **`.cleargate/scripts/init_sprint.mjs`** — extend to copy template + populate frontmatter values (sprint_id, execution_mode, goal extracted from plan §0).
- [ ] **`.cleargate/scripts/init_sprint.mjs` test fixture** — update to assert sprint-context.md is created.
- [ ] **`cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §A.3** (Initialize sprint state) — document that init_sprint.mjs writes sprint-context.md.
- [ ] **`cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §B + §C.x** — update dispatch contracts to reference sprint-context.md as required preflight reading for Dev + QA + DevOps.
- [ ] **`cleargate-planning/.claude/agents/{architect,developer,qa,devops,reporter}.md`** — add "Preflight" section: Read `.cleargate/sprint-runs/<sprint-id>/sprint-context.md` before any other action.
- [ ] **Architect SDR contract** — Architect can amend the file on kickoff or mid-sprint CR:approach/scope-change. Document in architect.md.
- [ ] **No state-machine change** — sprint-context.md is content, not state.

## Existing Surfaces

- **Surface:** `.cleargate/templates/sprint_context.md` — pre-existing template (skeleton only; never wired).
- **Surface:** `.cleargate/scripts/init_sprint.mjs` — sprint kickoff script; this CR extends it.
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §A.3 + §B + §C — dispatch contracts (this CR adds preflight-read instruction).
- **Why this CR extends rather than rebuilds:** the template exists; only the wiring is missing. Not a from-scratch infrastructure introduction.

## 3. Execution Sandbox

**Modify:**
- `.cleargate/scripts/init_sprint.mjs` — extend to write sprint-context.md
- `.cleargate/templates/sprint_context.md` — verify schema; correct if drift
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §A.3 + §B + dispatch contracts in §C
- `cleargate-planning/.claude/agents/architect.md` — Preflight section + amendment contract
- `cleargate-planning/.claude/agents/developer.md` — Preflight section
- `cleargate-planning/.claude/agents/qa.md` — Preflight section
- `cleargate-planning/.claude/agents/devops.md` — Preflight section
- `cleargate-planning/.claude/agents/reporter.md` — Preflight section

**Add:**
- `cleargate-cli/test/scripts/init-sprint-context.node.test.ts` — 3 scenarios: kickoff writes file, schema present, sprint_id substituted. Red phase per CR-043.

**Out of scope:**
- Mid-sprint amendment workflow validation (file is append-only by convention, not enforced).
- Sprint-context.md content gating (no test that asserts specific cross-cutting rules exist — orchestrator decides).

## 4. Verification Protocol

**Acceptance:**
1. `node .cleargate/scripts/init_sprint.mjs SPRINT-TEST --stories CR-001` writes `.cleargate/sprint-runs/SPRINT-TEST/sprint-context.md` with the expected schema (Sprint Goal / Cross-Cutting Rules / Active CRs / Mid-Sprint Amendments sections).
2. `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §A.3 documents the file write; §B + §C dispatch contracts reference "Read sprint-context.md as preflight."
3. Each agent prompt (`architect`, `developer`, `qa`, `devops`, `reporter`) has a Preflight section instructing Read of sprint-context.md.
4. New `*.red.node.test.ts` (QA-Red authored) covers the 3 scenarios above; Dev makes them pass.
5. Mirror parity: `diff` canonical ↔ npm payload empty for all touched files post-prebuild.
6. SPRINT-23's own kickoff writes a sprint-context.md (dogfood validation).

**Test Commands:**
- `npm test -- test/scripts/init-sprint-context.node.test.ts`
- (Manual) inspect `.cleargate/sprint-runs/SPRINT-23/sprint-context.md` post-kickoff.

**Pre-commit:** `cd cleargate-cli && npm run typecheck` + `npm test` (node:test only). Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] Downstream impacts identified (init_sprint, SKILL.md, 5 agent prompts, 1 test file).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification commands provided (6 acceptance criteria).
- [ ] `approved: true` is set in YAML frontmatter (post-Brief).
- [x] §Existing Surfaces cites at least one source-tree path the CR extends.
