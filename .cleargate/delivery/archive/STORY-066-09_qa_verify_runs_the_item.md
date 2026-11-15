---
story_id: STORY-066-09
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: "Completed"
approved: true
approved_by: "sandrinio"
approved_at: "2026-11-15T09:00:00Z"
ambiguity: 🟢 Low
context_source: EPIC-066 (approved 2026-11-14; section 2 QA-Verify run-and-probe bullet, section 6 answers on rework routing and the second-model default); INITIATIVE-002 field evidence that owner walkthroughs and live runs find three to four times more defects than the read-only acceptance trace; dispenser_adapter SPRINT-45 field trial W010-3 (QA-Verify cannot get a green check on a red base)
actor: QA-Verify agent and the orchestrator that routes its verdict
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
area: sprint-execution,agent-prompts,scripts
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-14T19:47:48.671Z
updated_at: 2026-11-14T19:47:48.671Z
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
  last_gate_check: 2026-11-14T19:55:49Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-066-09: QA-Verify runs the item and states DEFECT_IN
**Complexity:** L2 — one prompt section rewritten, one new pack section, one heuristic removed; no new script.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator routing a failed item, I want QA-Verify to run the item rather than read its diff, to report defects against scenarios only, and to say whether the defect is in the code, the sealed red test or the spec, so that rework goes to the agent that can fix it.

### 1.2 Detailed Requirements
- **Mode: VERIFY becomes run-and-probe.** The dispatch line is `Mode: VERIFY — run and probe.` (the wording in the skill is STORY-066-12's). With no `Mode:` line the default stays VERIFY. In this mode QA-Verify: (1) runs the pack's `commands.typecheck` and `commands.test`, scoped to the touched-file neighbourhood on `standard` and full on `runtime` as the playbook already says; (2) runs `commands.proof.command` when the item declares one; (3) exercises each Gherkin scenario's behaviour (invokes the changed command, script or function with the scenario's Given state and observes the outcome) instead of only finding a matching test; (4) probes one or two boundary cases beyond the Gherkin. It records exit codes, not summaries.
- **Defects are against scenarios only.** Every defect names the scenario it breaks. Style, naming, structure and "could be cleaner" observations do not fail an item; they go in a `NOTES:` line and never change the verdict.
- **`DEFECT_IN`.** On `QA: FAIL` the output carries `DEFECT_IN: code | red-test | spec` and a `DEFECTS:` list, one line each: `<scenario> | <code|red-test|spec> | <evidence: command and observed result>`. `code` means the behaviour does not satisfy the scenario and the sealed red test states the scenario correctly. `red-test` means the sealed test asserts something the scenario does not state, or fails to assert what it does. `spec` means the scenario itself is contradictory, unimplementable or silent on a case the item needs. When defects of several kinds exist, the single `DEFECT_IN` value follows the precedence `spec`, then `red-test`, then `code` (the owner halts first; a wrong red test is fixed before the Developer is sent back to code against it). On `PASS` and `PASS-PENDING-SMOKE` the line reads `DEFECT_IN: none`. QA-Verify still never edits code or tests.
- **Output shape** gains `DEFECT_IN`, `DEFECTS`, `COMMANDS_RUN` (command, exit code) and `PROOF: pass | fail | n/a`. Existing fields and the verdict decision order (CR-081, CR-082) are unchanged.
- **Pack gains a `commands` section** in `prep_qa_context.mjs`: JSON key `commands` = `{ source, typecheck, test, proof: { tier, command } }`, and a matching prose `## Commands` section placed after `## Lane` and before `## Dev Handoff`. `typecheck` and `test` come from `qa.typecheck` and `qa.test` in `.cleargate/scripts/gate-checks.json` (the file `pre_gate_runner.sh` reads; an empty string is `null`); `source` is `gate-checks.json` or `absent`. `proof.tier` is the item's `proof_tier` frontmatter and `proof.command` is the first command line of its `## Proof` section, both `null` when the item does not declare them (so the pack works before EPIC-065 ships). When `commands` is absent from an older pack, QA-Verify falls back to `cleargate gate typecheck` and `cleargate gate test` as today.
- **Remove the `not-yet-runtime-aware` heuristic** now that `runtime` is a real lane value (STORY-066-05): delete the heuristic in `buildLane`, its prose in `proseLane`, its header comment, and the Lane-source hint bullet in `qa.md`. `lane.source` is `state.json` or `default`. The forward-compat clause stays for an unknown lane value.
- **Edit boundary.** This story edits only the Mode: VERIFY, Pack-First Ingest, Lane-Aware Playbook, Workflow, Output shape and Guardrails text of `qa.md`, and only the `commands` and `lane` parts of `prep_qa_context.mjs`. STORY-066-07 owns the Mode: RED text of `qa.md`; STORY-066-04 owns the pack's `baseline` section. Neither is touched.
- **Baseline.** QA-Verify treats failures listed in the pack's baseline section as pre-existing and does not count one against the item unless the item's diff touches the failing file or test. It states them under `REGRESSIONS: none (baseline: <n> known failures)`. The baseline file and its pack section are STORY-066-04's; this story only says how QA reads them.
- `qa.toml` is regenerated with `npm run gen:codex`.

### 1.3 Out of Scope
- The Mode: RED text and `seal_red.mjs` (STORY-066-07); the pack `baseline` section and `baseline.json` (STORY-066-04).
- Routing the verdict: `update_state.mjs --defect-in`, the rework event and the metrics split (STORY-066-10), and the orchestrator text in `SKILL.md` §C.5 and `dispatch-serial.md` (STORY-066-12).
- The second-model default for `runtime` items and `loop.models` (STORY-066-11).
- The pack's `spec_sources.plan_path`, which still looks only for `plans/M<N>.md` (`prep_qa_context.mjs:223-249`); a story plan at `plans/<ID>.md` is left for STORY-066-12 to wire when it removes the milestone plan.
- Proof tiers, the evidence file and the Done guard (EPIC-065).

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** The item's "own proof command" has no home until EPIC-065 adds `## Proof`. What does the pack read now?
- **Recommended:** Read `proof_tier` frontmatter and the first command line of a `## Proof` section if present, else `null`. QA-Verify runs it only when non-null. Resolved in §1.2.
- **Human decision:** Accepted as recommended (contract-conformant; no contradiction with the epic).

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** the live-versus-canonical parity test for the `qa.md` Capability Surface through Lane-Aware Playbook slice (`qa-content.integration.node.test.ts:168-188`) passes trivially in a worktree, because the live file is absent, but fails in the main checkout after merge until the live `.claude/agents/qa.md` is re-synced.
- **Mitigation:** the re-sync is the existing sprint-close step; the story's Definition of Done records it. The test is not weakened.
- **Risk:** the Mode: RED edit (STORY-066-07) and this story both change `qa.md` and the generated `qa.toml`.
- **Mitigation:** this story has 066-07 as upstream, so they run in sequence; regenerate the toml rather than merging it.
- **Risk:** the single `DEFECT_IN` value hides a second defect of a lower-precedence kind.
- **Mitigation:** the `DEFECTS:` list keeps every defect with its own kind; after the first rework round QA-Verify runs again and reports what remains.
- **Risk:** run-and-probe costs more than a diff read.
- **Mitigation:** the commands are the ones the scan already runs, scoped by lane; the epic's second-model and cost decisions are STORY-066-11's.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two ways to pass: with and without a declared proof command. |
| Interfaces | T | The pack JSON block and the pack prose both carry `commands`; `qa.md` and the generated `qa.toml` both carry the mode. |
| Data | F | The pack shape does not differ by data type or volume. |
| Rules | T | Scenario-only defects, and the `DEFECT_IN` precedence. |

```gherkin
Feature: QA-Verify runs the item and names where the defect is

  @paths
  Scenario: The pack carries the commands QA-Verify must run
    Given gate-checks.json sets qa.typecheck to "go vet ./..." and qa.test to "make check"
    And the item declares proof_tier "container" and a "## Proof" section whose first command is "make e2e"
    When prep_qa_context.mjs builds the pack
    Then the JSON block has commands.typecheck "go vet ./...", commands.test "make check" and commands.proof.command "make e2e"
    And the prose has a "## Commands" section after "## Lane"
    And an item with no proof_tier and no "## Proof" section gives commands.proof.tier null and commands.proof.command null

  @interfaces
  Scenario: The runtime lane is no longer a heuristic
    Given a story whose state.json lane is "standard" and whose diff touches cleargate-cli/src/commands/
    When prep_qa_context.mjs builds the pack
    Then lane.source is "state.json", never "not-yet-runtime-aware"
    And qa.md and the generated qa.toml contain no "not-yet-runtime-aware" text

  @rules
  Scenario: A passing run-and-probe says there is no defect
    Given the pack's commands exit 0 and every scenario's behaviour was exercised and held
    When QA-Verify returns
    Then the output has "QA: PASS", "DEFECT_IN: none" and a COMMANDS_RUN line with each exit code
    And a style observation is in NOTES and did not affect the verdict

  @rules
  Scenario: A red test that asserts the wrong behaviour is reported as a red-test defect
    Given the Developer's commit passes its sealed tests
    And running the scenario shows the behaviour the scenario states differs from what the sealed test asserts
    When QA-Verify returns
    Then the output has "QA: FAIL" and "DEFECT_IN: red-test"
    And the DEFECTS list names the scenario, the kind and the command and result that showed it
    And when the same run also finds a spec defect the line reads "DEFECT_IN: spec"

  Scenario: A finding that breaks no scenario does not fail the item
    Given the commands pass and every scenario holds
    And the diff has a badly named variable
    When QA-Verify returns
    Then the verdict is not FAIL and the variable appears only under NOTES
```

### 2.2 Verification Steps (Manual)
- [ ] Run `prep_qa_context.mjs` against a fixture sprint and confirm the `commands` JSON key and the `## Commands` heading, and that `lane.source` has no heuristic value.
- [ ] Read `qa.md` Mode: VERIFY and confirm it names the commands, the per-scenario exercise, the scenario-only rule and the `DEFECT_IN` values with their precedence.
- [ ] Run `npm run gen:codex` and confirm `qa.toml` matches `qa.md`.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml`, `cleargate-cli/scaffold/core/.cleargate/scripts/test/test_prep_qa_context.sh`, `cleargate-cli/test/agents/qa-content.integration.node.test.ts`, `cleargate-cli/test/scripts/prep-qa-context-commands.node.test.ts`, `cleargate-cli/test/agents/qa-verify-run-and-probe.node.test.ts` |
| New Files Needed | Yes — `prep-qa-context-commands.node.test.ts` and `qa-verify-run-and-probe.node.test.ts` |

### 3.2 Technical Logic
- `prep_qa_context.mjs`: add `buildCommands(storyPath)` reading `path.join(__dirname, 'gate-checks.json')` (`qa.typecheck`, `qa.test`; empty string becomes `null`; a missing or unparseable file gives `source: "absent"` and nulls, never a failure, in line with the script's R4 soft-degrade rule) and parsing the item file already located by `buildSpecSources` (`:202-218`): frontmatter `proof_tier` through the existing `parseFrontmatter` (`:124`), and the first line of the first fenced block under a `## Proof` heading. Add the key to `jsonPayload` (`:832-846`) after `lane`, add `proseCommands` and insert it in `bundleParts` (`:848-865`) after `proseLane(lane)`. Update the schema comment at the top (`:26-64`): add `commands`, change the `lane.source` enum, drop `not-yet-runtime-aware`.
- `buildLane` (`:477-500`): return `{ value, source: 'state.json' }` without the CLI-path check; remove the heuristic branch in `proseLane` (`:697-709`).
- `qa.md`: rewrite the Mode: VERIFY block (`:60-68`), the Workflow steps 3 and 5 (`:135`, `:140`) and the Output shape (`:146-158`); in the Lane-Aware Playbook replace the forward-compat clause's SPRINT-20 note with a plain "unknown value: treat it as `standard`" that still cites the state.json schema, delete the Lane-source hint bullet (`:121`), and add one line to the `fast` bullet that a fast item is not normally dispatched to QA-Verify (its gate is the merge script's pre-merge check). Keep the strings the existing doc-lint test asserts: the three lane names, `Full test suite`, `exit-code matrix`, `Integration smoke`, `treat it as \`standard\``, `state.json schema`. Update the Pack-First Ingest sentence that lists eight sections and cites line numbers 849-864 to nine sections with Commands, without line numbers. Run `npm run gen:codex`.
- Guardrails: keep "never approve on the Developer's word" and "never edit"; add "a finding with no scenario is a note, not a defect".

### 3.3 API Contract (if applicable)

| Surface | Contract |
|---|---|
| Pack JSON `commands` | `{ source: "gate-checks.json" \| "absent", typecheck: string \| null, test: string \| null, proof: { tier: string \| null, command: string \| null } }`; `schema_version` stays 1 (additive key) |
| QA-Verify output | adds `DEFECT_IN: none \| code \| red-test \| spec`, `DEFECTS:`, `COMMANDS_RUN:`, `PROOF: pass \| fail \| n/a` |

## Task Breakdown

- [x] Write `test/scripts/prep-qa-context-commands.node.test.ts` first (commands present, proof present, proof absent, gate-checks absent, lane source never the heuristic) -> Scenarios 1, 2
- [x] Add `buildCommands`, the JSON key, `proseCommands` and the bundle slot; remove the lane heuristic and update the schema comment -> Scenarios 1, 2
- [x] Update `test_prep_qa_context.sh` section-header check to expect the Commands section -> Scenario 1
- [x] Rewrite `qa.md` Mode: VERIFY, Workflow, Output shape, Lane-Aware Playbook and Guardrails per §3.2; run `npm run gen:codex` -> Scenarios 3, 4, 5
- [x] Write `test/agents/qa-verify-run-and-probe.node.test.ts` (doc-lint: run-and-probe line, `DEFECT_IN` values and precedence, scenario-only rule, no heuristic text in `qa.md` or `qa.toml`) -> Scenarios 2-5
- [x] Update `qa-content.integration.node.test.ts` only where a stale phrase is asserted; keep the slice-parity test unchanged
- [x] Run `npm run typecheck`, the new tests, `qa-content`, and `test_prep_qa_context.sh`

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Covers the epic's Unit and Contract levels; journey steps "Ordinary story: QA-Verify runs it" and "Wrong red test: QA-Verify fails a scenario".

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | `buildCommands` via the script on a fixture: commands set, proof set, proof absent, gate-checks absent or unparseable, lane source with a CLI-touching diff |
| Integration tests | 1 | `prep_qa_context.mjs` end to end on a temp git worktree and sprint directory (the existing shell harness pattern), checking the JSON block and the prose heading |
| E2E / acceptance tests | 5 | One per Gherkin scenario in §2.1; scenarios 3 to 5 are doc-lint over `qa.md` and `qa.toml`, because the agent's behaviour is judged by the real-host run in the pilot sprint |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] `qa.toml` regenerated from `qa.md`, not hand-edited.
- [ ] Mode: RED text and the pack `baseline` section unchanged by this story's diff.
- [ ] Live `.claude/agents/qa.md` re-sync noted for sprint close (parity test, §1.5).
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:60-68` — Mode: VERIFY as a read-only acceptance trace.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:94-121` — Lane-Aware Playbook, including the `runtime` lane, the forward-compat clause and the `not-yet-runtime-aware` hint.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:146-167` — output shape and the verdict decision order (CR-081 and CR-082).
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs:477-500` — `buildLane`, with the heuristic; `:697-709` its prose; `:848-865` the bundle order.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs:124-138` — `parseFrontmatter`, reused for `proof_tier`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json` — `qa.typecheck` and `qa.test`, the commands the scan already runs.
- **Surface:** `cleargate-cli/test/agents/qa-content.integration.node.test.ts:113-190` — doc-lint on the playbook and the slice-parity check.
- **Coverage of this requirement:** partial, about 40%. The lane-aware playbook, the pack and the verdict order exist; the commands section, the run-and-probe mode, scenario-only defects and `DEFECT_IN` are new.

## Prior work

- [[EPIC-066]] — parent; owner decisions on run-and-probe and rework routing.
- [[CR-024]] — introduced the QA context pack, the lane-aware playbook and the heuristic being removed.
- [[CR-081]] — red-now-green clause; unchanged.
- [[CR-082]] — `PASS-PENDING-SMOKE` and the verdict decision order; unchanged.
- [[EPIC-031]] — scoped tests as QA's default; kept for the `standard` lane.
- [[CR-122]] — Developer may read its reds; compatible, it does not change who may edit them.
- [[STORY-066-04]] (this sprint) — owns the pack's baseline section; [[STORY-066-07]] — owns the RED section of `qa.md`; [[STORY-066-10]] — records `defect_in`; [[STORY-066-12]] — rewrites the skill's §C.5.
- [[EPIC-065]] — owns proof tiers and `## Proof`; the pack reads them when present.
- No prior work found for: stating where a QA defect lives, or a pack section that lists the commands to run.

## Why not simpler?

- **Smallest existing surface that could carry this:** the existing `runtime` lane playbook in `qa.md:112-117`, which already runs the full suite and an exit-code matrix.
- **Why isn't extension / parameterization / config sufficient?** Extending the playbook would still leave QA-Verify tracing a diff on `standard` items, with no list of commands to run (it re-derives them each time, and the pack's own lane heuristic points the wrong way), and no vocabulary for where a defect lives, which the rework routing in STORY-066-10 needs as input. A `commands` section in the pack is the smallest change that gives the prompt something to run, and the `DEFECT_IN` line is the smallest output that lets the orchestrator route rework.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
