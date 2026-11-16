---
story_id: STORY-065-04
parent_epic_ref: EPIC-065
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Ready
approved: true
approved_by: sandrinio
approved_at: 2026-11-16T09:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-065 (approved 2026-11-16) §2 scope and §6 answers; surfaces re-mapped at cleargate-cli 99cbfd7 on 2026-11-16 after SPRINT-46; SPRINT-46 intake items folded in are named in Prior work
actor: Orchestrator running waves and the walkthrough (both hosts)
complexity_label: L3
area: sprint-execution,scripts,agent-prompts
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-16T07:39:06.129Z
updated_at: 2026-11-16T07:39:06.129Z
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
  last_gate_check: 2026-11-16T07:48:09Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "bdc9576e2f6cdc2a661e969583743f0c8b3c68ec47be1c798f531a44c83c0bf8"
---

# STORY-065-04: Prove Stage in the Build Loop
**Complexity:** L3 — one stage in the stage table that every lane runs, the barrier handling in both dispatch paths, and the walkthrough proof for live and human items, in both hosts.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator running a sprint, I want a prove step that runs every item's proof by script before it merges, and proves live and human items at the walkthrough, so that no item merges unproven without the loop saying so.

### 1.2 Detailed Requirements
- **R1 — Stage table.** `segment_stages.mjs` gains a `prove` stage, `kind: 'barrier-script'`, `script: 'record_evidence.mjs'`, placed directly before `merge` in every lane: fast `developer, prove, merge`; standard `… qa-verify, [architect-review], prove, merge`; runtime `… qa-verify, architect-review, prove, merge`. `STAGE_NAMES` and `STAGE_DEFS` gain it.
- **R2 — The runner stops at prove.** `wave_runner.js` already breaks at the first barrier-script (`:109`); a GREEN segment now ends before `prove`. `launch_wave.mjs` `validateVerdicts` accepts such a verdict unchanged (barrier stages are not `when: 'always'` agent stages); a test pins it. `wave_runner_args.mjs` model resolution skips the new stage (it already skips non-agent stages).
- **R2a — Sprint Review counts as merged (CR:spec-clarification, 2026-11-16, from the STORY-065-03 Done-reader survey).** `wave_runner_args.mjs:144` builds the merged set from `state === 'Done'` only; it also counts `Sprint Review` (merged, awaiting proof), so such an item is never relaunched.
- **R3 — The barrier runs prove, then merge.** SKILL §C.0.1 and §C.7 (Claude `SKILL.md`, the Codex rendering under `scaffold/core/.agents/skills/sprint-execution/`) and both `dispatch-serial.md` copies say: at the barrier, for each GREEN item in merge order, run `node .cleargate/scripts/record_evidence.mjs <ID> --worktree <story worktree>`, then `merge_story.mjs` only if it exited 0.
  - Exit 1 (proof failed): no merge; re-launch the item from `developer` with `--issue "<last lines of the evidence tail>"`, record `update_state.mjs <ID> --qa-bounce`, and treat it like a QA-Verify `FAIL` with `defect_in: code` (the bounce cap applies).
  - Exit 2 (could not run): no merge; halt and ask the owner, naming the reason (no tier, no command configured).
  - `live` and `human` items: the recorder writes `pending` and exits 0, so they merge and wait in `Sprint Review` (STORY-065-03).
- **R3a — Untiered items and the rework route (CR:spec-clarification, 2026-11-16, post-flight; applies Gate 2 decision 5).** An item that declares no `proof_tier` is not guarded: the recorder exits 2 with `record_evidence: no proof tier for <ID>` and writes nothing, and the barrier merges it as on exit 0 (§C.7 sets it Done). Any other exit 2 halts. After a failed proof (exit 1) the item re-runs through the lane's later agent stages — QA-Verify, and the post-flight review where the lane runs it — before the prove stage again, on both the wave and the serial path.
- **R4 — Walkthrough proof.** SKILL §D (both hosts) starts the walkthrough when every item is Done or in Sprint Review (was: every item terminal), and before inviting the owner:
  - for each `live` item in Sprint Review, runs `record_evidence.mjs <ID>` from the sprint branch checkout; a pass is followed by `update_state.mjs <ID> Done`;
  - when `gate-checks.json` `proof.browser` is set, runs it once and shows the owner its result beside the human items;
  - for each `human` item, shows the owner its `## Proof` steps; on the owner's confirmation runs `record_evidence.mjs <ID> --human "<the owner's words>"`, then `update_state.mjs <ID> Done`.
  - Items still unproven go to close as "built, not proven" (STORY-065-06).
- **R4a — Earlier pins and the Codex text (Gate 2, decision 7).** `test/scripts/segment-stages.red.node.test.ts` (exact lane lists) and `loop-spec-three-paths.red` T1 gain `prove`, edited in this item's QA-Red commit. The Codex rendering replaces §C.0 and its §C.7 merge text wholesale, so the prove step is added to the R3 replacement text in `cleargate-cli/scripts/build-codex-payload.mjs` and the rendered files are regenerated with `npm run gen:codex`; the six renderer anchor lines stay verbatim.
- **R5 — The agents' proof run stays a check.** The SKILL says QA-Verify's `PROOF:` line is the agent's own run, and the evidence file from the prove stage is the record the Done guard reads.

### 1.3 Out of Scope
- The recorder itself (STORY-065-02), the Done guard (065-03), holdout tests (065-05), close and report (065-06).
- Running proofs in parallel; the barrier stays serial (EPIC-055, CR-124).
- A browser harness; only an already-configured `proof.browser` command is run.

### 1.4 Open Questions

- **Question:** Should a failed proof count against the item's QA bounce cap?
- **Recommended:** Yes. A failed proof after QA-Verify passed is the case this epic exists to catch, and it is a code defect found late; counting it keeps the existing escalation path instead of adding a new counter.
- **Human decision:** As recommended (owner, 2026-11-16: "approve as recommended").

### 1.5 Risks

- **Risk:** A long container proof (dispenser's `make check` took about four minutes) runs once per item at the barrier and slows the wave.
- **Mitigation:** The barrier is already serial for merges; the dev report records the barrier time on the sandbox run, and the proof timeout (`CLEARGATE_PROOF_TIMEOUT_S`) bounds it.
- **Risk:** The serial-dispatch path (Codex) is missed and Codex sprints merge unproven items as Done.
- **Mitigation:** R3 names both `dispatch-serial.md` copies; the Done guard (065-03) refuses Done without evidence on either path.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Command proof passes and merges; live/human items merge pending and are proven at the walkthrough. |
| Interfaces | T | The wave runner path and the serial-dispatch path both stop at prove. |
| Data | T | Three lanes' stage lists through one Outline. |
| Rules | T | A failed proof blocks the merge and counts as a bounce; a proof that cannot run halts. |

```gherkin
Feature: Prove stage in the build loop

  @data
  Scenario Outline: Every lane proves before it merges
    When stagesFor("<lane>") is read
    Then its last two stages are "prove" (a barrier-script running record_evidence.mjs) and "merge"

    Examples:
      | lane     |
      | fast     |
      | standard |
      | runtime  |

  @interfaces
  Scenario: A GREEN segment stops before prove and its verdict is valid
    Given a standard-lane item whose segment ran qa-red, developer and qa-verify
    When the wave runner returns its GREEN verdict
    Then stages_run ends at "qa-verify" and validateVerdicts accepts it
    And the serial dispatch path stops at the same stage

  @rules
  Scenario: A failed proof blocks the merge and sends the item back
    Given STORY-A passed QA-Verify and record_evidence.mjs STORY-A exits 1
    When the orchestrator follows the barrier steps in the skill
    Then merge_story.mjs is not run for STORY-A
    And STORY-A is re-launched from "developer" with the evidence tail as the issue and its qa_bounces rises by one

  @rules
  Scenario: A proof that cannot run halts for the owner
    Given record_evidence.mjs STORY-E exits 2 with "no container proof command configured"
    When the orchestrator follows the barrier steps in the skill
    Then STORY-E is not merged and the orchestrator halts naming that reason

  @paths
  Scenario: Live and human items are proven at the walkthrough
    Given STORY-D (proof_tier "live") and BUG-C (proof_tier "human") merged with pending evidence and are in "Sprint Review"
    And gate-checks.json sets proof.browser
    When the orchestrator follows the walkthrough steps in the skill
    Then it runs record_evidence.mjs STORY-D before inviting the owner, and a pass moves STORY-D to Done
    And it runs proof.browser once and shows its result beside BUG-C
    And on the owner's confirmation it runs record_evidence.mjs BUG-C --human with the owner's words and then update_state.mjs BUG-C Done
    And the walkthrough began although neither item was terminal
    And the skill names QA-Verify's PROOF line as the agent's check and the evidence file as the record
```

### 2.2 Verification Steps (Manual)
- [ ] Read SKILL §C.0.1, §C.7 and §D and both `dispatch-serial.md` copies: the prove step, its exits and the walkthrough proof read as R3–R5.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js`, `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner_args.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/dispatch_serial.mjs`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/dispatch-serial.md`, `cleargate-cli/scripts/build-codex-payload.mjs`, `cleargate-cli/test/scripts/segment-stages.red.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/scripts/prove-stage.red.node.test.ts` |

### 3.2 Technical Logic
- `segment_stages.mjs:22-60`: add the name, the def and the lane entries; `stagesFor` (`:76-83`) needs no change.
- `wave_runner.js:105-109`: no change expected; the test proves the GREEN path stops at `prove`. If `finish()` or `stages_run` filtering assumes `merge` is the only barrier, generalise to "first barrier-script".
- `launch_wave.mjs:267-289` and `dispatch_serial.mjs:281,327,476`: confirm both read `stagesFor` and need no change; pin with tests.
- Skill text: §C.0.1 barrier list, §C.7 exit table (prove exits before merge exits), §D entry condition and the walkthrough proof steps; both hosts; the docs tests that pin skill sections (grep `test/docs/`) are updated in the same commit.

### 3.3 API Contract (if applicable)
N/A — calls `record_evidence.mjs` per STORY-065-02 (exit 0 / 1 / 2).

## Task Breakdown
- [x] QA-Red: write prove-stage.red (6 scenarios), edit sealed segment-stages.red :48-51 and codex-sprint-execution-render.red R3 :54, then seal -> R1, R2, R3, R4, R4a, R5
- [x] segment_stages.mjs: `prove` in STAGE_NAMES, STAGE_DEFS and every lane before `merge` -> R1
- [x] Verify that wave_runner.js, wave_runner_args.mjs, launch_wave.mjs and dispatch_serial.mjs stay unchanged under the tests -> R2
- [x] Claude SKILL: §5 table, §C.0.1 step 8, §C.6 clean path, new §C.6.5, §C.7 state sentence, §D walkthrough proof, §8 row -> R3, R4, R5
- [x] dispatch-serial.md step 3 and §3 merge row -> R3
- [x] build-codex-payload.mjs R3, then npm run gen:codex and npm run prebuild -> R4a
- [x] npm run typecheck; test:file prove-stage, segment-stages, codex-sprint-execution-render, loop-spec-three-paths, wave-runner, dispatch-serial-doc, skill-md-serial-pointers, skill-md-conditional-architect, expected-red-not-a-flag, test-gate-amend-b, prep-reporter-test-gate, agent-environment-rule, contract-first-dag-text, wave-runner-sandbox-fixes -> all

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | Three Outline rows, GREEN verdict on the runner path and on the serial path. Epic level: Unit. |
| Integration tests | 0 | The barrier runs real scripts covered by 065-02 and 065-03 tests. |
| E2E / acceptance tests | 3 | Skill-text pins for the failed-proof rule, the cannot-run halt and the walkthrough proof; the release sandbox run exercises them live. Journey: "Build to Done", "Human proof". |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/segment_stages.mjs:22-83` — the stage table and `stagesFor`; `merge` is the one barrier-script today.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/wave_runner.js:105-109` — stops at the first barrier-script.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/launch_wave.mjs:267-289` — verdict validation against the lane's stages.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:599-617` — Phase D waits for every item to be terminal.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:72` — QA-Verify already runs `commands.proof.command` and reports `PROOF:`.
- **Coverage of this requirement:** partial — the barrier mechanism and the agent's proof run exist; the prove stage and the walkthrough proof are new.

## Prior work

- [[EPIC-065]] — parent; §6 Q10 places the prove step in EPIC-066's stage table.
- [[EPIC-066]] (Completed) — built the stage table, the runner and merge by script.
- [[STORY-066-06]] (Completed) — the stage table; [[STORY-066-09]] (Completed) — QA-Verify runs the item.
- [[BUG-087]] (Draft) — typecheck in a worktree; a prove command that type-checks inside the worktree may meet it.

## Why not simpler?

- **Smallest existing surface that could carry this:** a step inside `merge_story.mjs` before its merge.
- **Why isn't extension / parameterization / config sufficient?** The owner placed the prove step in the stage table (EPIC-065 §6 Q10) so that lanes, verdict validation and the serial path all see it as a stage; it reuses the existing barrier-script kind and the existing barrier, so no new mechanism is added. Folding it into the merge script would hide a failed proof inside a merge failure and lose the rework route.

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
