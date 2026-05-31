---
story_id: STORY-043-10
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
area: sprint-execution,quality,simplify
status: Draft
approved: true
ambiguity: 🟢 Low
complexity_label: L3
parallel_eligible: n
context_source: |
  Decomposed from EPIC-043 WS7 (Sprint Consolidation Pass — the one quality ADD).
  Each story is built by a Developer sealed in its own worktree, blind to the
  others, so cross-story duplication/divergence is structurally invisible during
  execution. This story inserts a Consolidation phase (D.5) into the sprint
  playbook between walkthrough and close: /simplify on the sprint diff, gated by a
  QA-Verify full-suite re-run (green keeps, red reverts). Files verified by Read
  2026-06-01. Shares SKILL.md + qa.md with WS1/WS8 stories — merge-order flagged.
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:41:39Z
source: local-authored
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-10
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:41:39Z
  sessions: []
---

# STORY-043-10: Sprint Consolidation Pass (D.5) — Cross-Story Simplify + QA Safety-Net Re-run

**Complexity:** L3 — Cross-cutting prose change spanning the sprint-execution playbook and the QA agent across canonical + payload mirrors; introduces a new sprint-loop phase (the one WS7 quality ADD) with a merge/revert decision branch.

## 1. The Spec (The Contract)

### 1.1 User Story

As the **sprint Orchestrator**, I want a **cross-story Consolidation phase that runs `/simplify` on the whole sprint diff and is gated by a full-suite QA-Verify re-run**, so that **the reuse, dedup, and altitude fixes that are structurally invisible to per-story Developers (each sealed in its own worktree, blind to the others) get caught before the sprint merges to main — without the simplification ever being trusted unverified.**

### 1.2 Detailed Requirements

- Insert a new **Phase D.5 — Consolidation** into `.claude/skills/sprint-execution/SKILL.md`, positioned **between Phase D (Sprint Walkthrough, §6) and Phase E (Gate 4 Close, §7)**. It runs once per sprint, after every story has merged into `sprint/S-NN` and the walkthrough is complete, before the Gate-4 close.
- The Consolidation phase MUST state its rationale verbatim: each story is built by a Developer sealed in its own worktree, blind to the other stories, so cross-story duplication, divergent patterns, and missed reuse are structurally invisible during execution. D.5 is the only place a single reviewer sees the whole sprint diff.
- D.5 runs the `code-simplifier` agent via `/simplify` against the sprint diff `git diff main...sprint/S-NN`, applying reuse / dedup / altitude fixes as a single **consolidation commit on the sprint branch** (`sprint/S-NN`), not on any story branch (story branches/worktrees are already torn down by §C.7 at this point).
- The consolidation step **MUST NOT touch any `*.red.node.test.ts` file** — the same immutability rule the Developer obeys (Red tests are frozen post-Red, SKILL.md §C.3). The phase prose must state this constraint explicitly and instruct the Orchestrator to verify no `*.red.node.test.ts` appears in the consolidation commit's file list.
- After the consolidation commit lands, **QA-Verify (`.claude/agents/qa.md`) re-runs the FULL suite** as the safety net for the consolidation commit specifically. Add a short Consolidation-mode note to `qa.md` documenting this dispatch: it is a sprint-diff full-suite re-run, read-only, no code edits, and its sole question is "does the full suite stay green after the `/simplify` commit?".
- **Green → keep:** if the full-suite re-run is green, the consolidation commit stays on `sprint/S-NN` and the sprint proceeds to Phase E (Gate 4 close).
- **Red → revert:** if the full-suite re-run is red, the Orchestrator reverts the consolidation commit (`git revert <consolidation-sha>` or equivalent on `sprint/S-NN`) so the pre-consolidation sprint state is restored, logs the revert in sprint §4 Execution Log, and proceeds to close on the un-simplified (still-green) diff. The full rebuild / un-simplified diff remains the correctness floor.
- D.5 prose MAY note an **optional sprint-diff `/code-review`** on `git diff main...sprint/S-NN` to catch integration bugs the per-story QA (each sealed to one story) cannot see. This is advisory, not a gate, and is distinct from the `/simplify` quality pass.
- **Mirror canonical + payload.** The same D.5 block + qa.md Consolidation-mode note land in `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical), byte-identical to the live `.claude/` edit per the dogfood-split rule. The npm payload (`cleargate-cli/templates/cleargate-planning/...`) is regenerated by `npm run prebuild`, not hand-edited.

### 1.3 Out of Scope

- Any change to the `code-simplifier` / `/simplify` agent or skill itself, or to `/code-review` — this story only *invokes* them from the playbook; it does not author them.
- The per-story QA-Verify behavior in §C.5 and the EPIC-031 scoped-test default — D.5's QA-Verify is an additive sprint-diff full-suite dispatch, not a change to the per-story lane playbook.
- Any change to worktree-per-story isolation, the five-agent split, or Gate-4 close semantics (load-bearing core; out-of-scope per EPIC-043 §2).
- The other EPIC-043 workstreams (WS1 README/qa-prose reconciliation, WS8 reporter.md re-sync) even though they touch the same `qa.md` / SKILL.md files — those are separate stories. See §Existing Surfaces for the merge-order flag.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Sprint Consolidation Pass (D.5)

  Scenario: Consolidation phase sits between walkthrough and close
    Given the live and canonical sprint-execution SKILL.md
    When a reader scans the phase order
    Then a "Phase D.5 — Consolidation" section exists after Phase D (Sprint Walkthrough, section 6)
    And it appears before Phase E (Gate 4 Close, section 7)
    And it instructs running /simplify (the code-simplifier agent) on "git diff main...sprint/S-NN"
    And it states the consolidation lands as one commit on the sprint branch

  Scenario: Green re-run keeps the consolidation commit
    Given a consolidation commit has been applied on sprint/S-NN
    When QA-Verify re-runs the FULL suite against the sprint diff
    And the full suite is green
    Then the consolidation commit is kept on sprint/S-NN
    And the sprint proceeds to Phase E (Gate 4 close)

  Scenario: Red re-run reverts the consolidation (Error / failure path)
    Given a consolidation commit has been applied on sprint/S-NN
    When QA-Verify re-runs the FULL suite and it goes red with an Error
    Then the Orchestrator reverts the consolidation commit on sprint/S-NN
    And the revert is logged in sprint section 4 Execution Log
    And the sprint closes on the un-simplified still-green diff

  Scenario: Red-test immutability is preserved during consolidation
    Given the consolidation commit's file list
    When the Orchestrator inspects the changed files
    Then no "*.red.node.test.ts" file appears in the consolidation commit
    And the SKILL.md D.5 prose states the red-test immutability constraint explicitly

  Scenario: Canonical and live SKILL.md carry an identical D.5 block
    Given .claude/skills/sprint-execution/SKILL.md and cleargate-planning/.claude/skills/sprint-execution/SKILL.md
    When the two files are diffed
    Then both contain the Phase D.5 Consolidation block
    And the qa.md Consolidation-mode note is present in both .claude/agents/qa.md and the canonical mirror
```

### 2.2 Verification Steps (Manual)

- [ ] Grep `.claude/skills/sprint-execution/SKILL.md` for `Phase D.5` and confirm it appears textually between the Phase D walkthrough heading (§6) and the Phase E close heading (§7).
- [ ] Confirm the D.5 block names `git diff main...sprint/S-NN`, the `code-simplifier` / `/simplify` agent, the consolidation-commit-on-sprint-branch instruction, and the `*.red.node.test.ts` immutability constraint.
- [ ] Confirm the green→keep / red→revert decision branch is present and that the red path logs the revert in sprint §4.
- [ ] Read `.claude/agents/qa.md` and confirm a Consolidation-mode note documents the sprint-diff full-suite re-run as a read-only, no-edit safety net.
- [ ] `diff -q` the live SKILL.md against `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`; confirm no drift in the D.5 block. Repeat for the two `qa.md` files.
- [ ] Run `cleargate gate check` on this story file and confirm `story.ready-for-execution passed`.

## 3. The Implementation Guide

### 3.1 Context & Files

- `.claude/skills/sprint-execution/SKILL.md` — live playbook; insert the Phase D.5 Consolidation section between Phase D (§6 Sprint Walkthrough) and Phase E (§7 Gate 4 Close).
- `.claude/agents/qa.md` — live QA agent; add the Consolidation-mode note documenting the sprint-diff full-suite safety-net re-run.
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — canonical mirror of the playbook; receives the byte-identical D.5 block (and the qa.md canonical mirror at `cleargate-planning/.claude/agents/qa.md` receives the Consolidation-mode note; the npm payload is regenerated by `npm run prebuild`, never hand-edited).

### 3.2 Technical Logic

This is a prose / playbook change, not code. The D.5 section follows the existing phase-heading style in SKILL.md (`## 6. Phase D — Sprint Walkthrough (v2)`, `## 7. Phase E — Gate 4 Close ...`):

1. **Trigger.** D.5 fires once, after all stories are merged into `sprint/S-NN` and the Phase D walkthrough resolves all `UR:bug` items, and **before** the Phase E close. Story branches/worktrees are already gone (torn down in §C.7), so the only surviving artifact is the integrated `sprint/S-NN` branch.
2. **Rationale (verbatim in prose).** Each story was built by a Developer sealed in its own worktree, blind to the others — cross-story duplication, divergent patterns, and missed reuse are structurally invisible during execution. D.5 is the first and only place one reviewer sees the whole sprint diff.
3. **Simplify.** Run `/simplify` (the `code-simplifier` agent) on `git diff main...sprint/S-NN`. It applies reuse / dedup / altitude fixes as **one consolidation commit on `sprint/S-NN`**. Constraint: it MUST NOT touch any `*.red.node.test.ts` file (Red-test immutability, same rule as the Developer in §C.3). The Orchestrator verifies the commit's file list contains no `*.red.node.test.ts` path.
4. **Verify (safety net).** Dispatch QA-Verify (`qa.md`) to re-run the **FULL suite** against the post-consolidation `sprint/S-NN`. This is read-only; QA writes no code. Its single question: does the full suite stay green after the `/simplify` commit?
5. **Decision.** Green → keep the consolidation commit and proceed to Phase E. Red → `git revert <consolidation-sha>` on `sprint/S-NN`, log the revert in sprint §4 Execution Log, and close on the un-simplified (still-green) diff. The un-simplified diff is the correctness floor — a failed simplification never blocks the sprint, it is simply discarded.
6. **Optional.** Note that a sprint-diff `/code-review` on `git diff main...sprint/S-NN` MAY run to catch integration bugs the per-story QA could not see; advisory, not a gate.
7. **qa.md.** Add a brief Consolidation-mode note (alongside the existing Red / Verify mode dispatch documentation) so QA recognizes the sprint-diff full-suite re-run dispatch and treats it as a read-only safety net rather than a per-story verify.
8. **Mirror.** Apply the identical edit to canonical `cleargate-planning/.claude/...`; payload regenerates via `npm run prebuild`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Surface | Expectation |
|---|---|
| SKILL.md phase order | `Phase D.5` heading exists after §6 (Phase D) and before §7 (Phase E) in both live and canonical |
| D.5 content | Names `git diff main...sprint/S-NN`, `/simplify` / `code-simplifier`, consolidation commit on `sprint/S-NN`, and the `*.red.node.test.ts` immutability constraint |
| Decision branch | green→keep + red→`git revert` + §4 Execution Log entry on revert all present |
| qa.md note | Consolidation-mode note present; describes a read-only sprint-diff full-suite re-run |
| Mirror parity | `diff -q` live ↔ canonical SKILL.md and qa.md shows no D.5 / note drift |

### 4.2 Definition of Done

- [ ] Phase D.5 Consolidation section inserted in live SKILL.md between §6 (Phase D) and §7 (Phase E).
- [ ] D.5 names the `/simplify` `code-simplifier` agent, the `git diff main...sprint/S-NN` target, the consolidation-commit-on-sprint-branch instruction, and the `*.red.node.test.ts` immutability constraint.
- [ ] Green→keep / red→revert decision branch documented, with the revert logged to sprint §4.
- [ ] Optional sprint-diff `/code-review` advisory note included.
- [ ] qa.md Consolidation-mode note added documenting the read-only full-suite safety-net re-run.
- [ ] Canonical mirror (`cleargate-planning/.claude/...`) updated byte-identical; payload regenerated via `npm run prebuild`.
- [ ] `cleargate gate check` on this story file passes `story.ready-for-execution`.
- [ ] Merge-order flag (shared SKILL.md + qa.md with other EPIC-043 stories) raised to the sprint Architect at SDR.

## Existing Surfaces

> L1 reuse audit. Source paths verified by Read on 2026-06-01.

- **Surface:** `.claude/skills/sprint-execution/SKILL.md:542` — `## 6. Phase D — Sprint Walkthrough (v2)` is the current end-of-execution phase; `## 7. Phase E — Gate 4 Close (Reporter + Human Sign-off)` at `.claude/skills/sprint-execution/SKILL.md:559`. There is **no** consolidation step between them today — that gap is exactly what D.5 fills. This story inserts the new phase here.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md:269` — the Red-test immutability rule (`File-naming: *.red.node.test.ts (immutable post-Red)`) that D.5's `/simplify` constraint reuses verbatim; the consolidation commit obeys the same rule the Developer does.
- **Surface:** `.claude/agents/qa.md:33-63` — the existing Mode Dispatch (Red vs Verify) block; the new Consolidation-mode note is appended here so QA recognizes the sprint-diff full-suite dispatch as read-only.
- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — canonical mirror (currently `diff -q`-clean vs live, 46071 bytes); receives the byte-identical D.5 block per the dogfood-split rule.
- **No `code-simplifier` / `/simplify` agent file exists under `.claude/` today** (grep returned zero hits) — D.5 invokes the harness `/simplify` slash-command skill, not a sprint-loop agent, so no new agent registration is required.
- **Merge-order dependency (flag):** this story edits `SKILL.md` and `qa.md`, which are **also** edited by EPIC-043 WS1 (qa.md prose reconciliation) and WS8(f) (reporter.md / SKILL.md cascade). These are independent text regions but the same files — the sprint Architect MUST sequence the merges (last-merged wins on overlap) or split by hunk. Flagged for SDR.
- **Coverage of this story's scope by existing surfaces:** ~100% — pure prose insertion into existing playbook + agent files. No net-new code module, no new agent, no new command.

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface:** the `.claude/skills/sprint-execution/SKILL.md` phase list (§6 → §7 gap) plus the `.claude/agents/qa.md` Mode Dispatch block. The change is an insertion into existing prose and a note appended to an existing block — no new file, agent, command, or script.
- **Why isn't extension / config sufficient?** A consolidation pass cannot be a config flag because it is a **new sequenced phase with a decision branch** (run `/simplify` on the sprint diff → gate on a full-suite re-run → keep or revert). There is no existing phase that sees the whole sprint diff: per-story QA-Verify is sealed to one worktree and the walkthrough is human-facing, not a code reviewer. The branch (green keeps the commit, red reverts it and closes on the un-simplified diff) is irreducible behavior, so it must be authored as playbook prose, not toggled. It stays L3 (not L2) because the same edit must land across two files and their canonical mirrors and it introduces a brand-new sprint-loop phase rather than tweaking an existing one.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — Ready for Sprint Planning / Decomposition**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements met to reach Green:
- [x] Parent EPIC-043 has `approved: true` (waiver recorded in epic frontmatter).
- [x] §1 Spec (User Story + Detailed Requirements + Out of Scope) is complete.
- [x] §2 Acceptance Criteria has a Feature + ≥2 Scenarios including a named Error/failure path (red re-run revert).
- [x] §3 Implementation Guide cites only this story's real file paths (verified by Read 2026-06-01).
- [x] §4 Quality Gates has a test-expectations table + DoD checklist.
- [x] §Existing Surfaces cites at least one real source path with file:line.
- [x] §Why not simpler? answers both sub-bullets.
- [x] 0 "TBD"s exist in the document.
