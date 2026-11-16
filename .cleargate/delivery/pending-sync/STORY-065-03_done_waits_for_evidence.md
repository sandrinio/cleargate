---
story_id: STORY-065-03
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
actor: merge_story.mjs and the orchestrator moving items to Done
complexity_label: L2
area: scripts,sprint-execution
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-16T07:39:05.856Z
updated_at: 2026-11-16T07:39:05.856Z
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
last_contradict_sha: "3c05ed8f971ce8d675f19941a1fda6acaf9cad9cf8e2eeb49f86bfcb55beb7ec"
---

# STORY-065-03: Done Waits for Evidence
**Complexity:** L2 — the merge's state step, one guard in `update_state.mjs`, the DevOps exit-5 instruction in both hosts, and the protocol's Done definition.

## 1. The Spec (The Contract)

### 1.1 User Story
As the owner, I want an item to become Done only when evidence for its declared tier exists, so that a merged item that was never proven shows as waiting, not finished.

### 1.2 Detailed Requirements
- **R1 — Merge leaves an unproven item in Sprint Review.** `merge_story.mjs`'s `state` step (`:376-378`) reads `<sprintDir>/evidence/<ID>.json`. `status: "pass"` → `update_state.mjs <ID> Done`, as today. Missing, `pending` or `fail` → `update_state.mjs <ID> "Sprint Review"`, and the tail gains `awaiting proof: <tier> (<missing|pending|fail>)`. The JSON result gains `state` (`Done` or `Sprint Review`) and `evidence` (path or null). A resumed run (`:381-385`) applies the same rule.
- **R1a — Untiered items (Gate 2, decision 5).** An item with no `proof_tier` goes to `Done` at merge, as today, so R1 matches R3 and SPRINT-46's merge tests (untiered fixtures expecting Done) stay green. The Sprint Review choice applies only to an item that declares a tier. 03 reads evidence and tiers only through `lib/proof.mjs` (`readEvidence`, `proofStatus`, `readProofTier`; contract C1).
- **R2 — The Done guard.** `update_state.mjs <ID> Done` refuses, with exit 1 and no event appended, when the item declares a `proof_tier` and `evidence/<ID>.json` is missing, is not `status: "pass"`, or records a different tier: `Error: <ID> has no <tier>-tier evidence (<path>: missing|pending|fail|tier <recorded>)`. The item's state is unchanged. The tier is read from the item file through `lib/proof.mjs` (STORY-065-02).
- **R3 — Items without a tier are not guarded.** An item with no `proof_tier` (a sprint started before this release) moves to Done as today, so older sprints can still close.
- **R4 — DevOps.** `devops.md` and `devops.toml` say: after a kept exit-5 merge, move the item with `update_state.mjs <ID> Done` when its evidence passes, else `"Sprint Review"`; never edit the evidence file.
- **R5 — Protocol.** `cleargate-protocol.md` §21 Status Vocabulary defines `Sprint Review` as "merged, awaiting proof at its declared tier" and `Done` as "merged and proven: `evidence/<ID>.json` records a pass at the declared tier".

### 1.3 Out of Scope
- Producing evidence (STORY-065-02) or running the prove stage and the walkthrough proof (065-04).
- Enforcing the rest of `STATE_TRANSITIONS` ([[BUG-075]]); this guards only the edge into Done.
- What close does with items still in Sprint Review (065-06).

### 1.4 Open Questions

- **Question:** Should `CLEARGATE_ADVISORY=1` (the break-glass) let `update_state.mjs` write Done without evidence?
- **Recommended:** No. The close ack already lets the owner accept an unproven item as "built, not proven" (STORY-065-06), so there is no case where Done must be written without evidence; a bypass would make Done mean nothing again.
- **Human decision:** As recommended (owner, 2026-11-16: "approve as recommended").

### 1.5 Risks

- **Risk:** The wave runner, the dashboard or close read `Done` as the only "merged" state and treat Sprint Review items as unfinished work.
- **Mitigation:** The dev report lists every reader of `state === 'Done'` under `scaffold/core/.cleargate/scripts/` and `src/` (grep) and whether Sprint Review is handled; close is changed in 065-06, the dashboard already labels Sprint Review (`src/dashboard/render.ts:63`).

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Merge with passing evidence; merge without; Done after a later proof. |
| Interfaces | T | `merge_story.mjs` and a direct `update_state.mjs` call both meet the guard. |
| Data | T | Missing, pending, fail and wrong-tier evidence, through one Outline. |
| Rules | T | Untiered items are not guarded. |

```gherkin
Feature: Done waits for evidence

  @paths @interfaces
  Scenario: A proven item is Done at merge
    Given STORY-A declares proof_tier "container" and evidence/STORY-A.json records a container pass
    When merge_story.mjs STORY-A merges it
    Then STORY-A's state is "Done" and the result names the evidence path

  @paths
  Scenario: An unproven item waits in Sprint Review after merge
    Given STORY-D declares proof_tier "live" and evidence/STORY-D.json records status "pending"
    When merge_story.mjs STORY-D merges it
    Then STORY-D's state is "Sprint Review"
    And the tail says "awaiting proof: live (pending)"

  @data @interfaces
  Scenario Outline: Done is refused without passing evidence at the declared tier
    Given STORY-B declares proof_tier "container" and is in "Sprint Review"
    And its evidence is <evidence>
    When update_state.mjs STORY-B Done runs
    Then it exits 1 with "STORY-B has no container-tier evidence (<reason>)"
    And STORY-B stays in "Sprint Review" and no event is appended

    Examples:
      | evidence                         | reason   |
      | absent                           | missing  |
      | status "pending"                 | pending  |
      | status "fail"                    | fail     |
      | a unit-tier pass                 | tier unit |

  @paths
  Scenario: An item proven later moves to Done
    Given BUG-C declares proof_tier "human" and is in "Sprint Review"
    When record_evidence.mjs BUG-C --human "owner confirmed" has written a pass
    And update_state.mjs BUG-C Done runs
    Then BUG-C's state is "Done"

  @rules
  Scenario: An item without a tier is not guarded
    Given STORY-Z has no proof_tier and no evidence
    When update_state.mjs STORY-Z Done runs
    Then STORY-Z's state is "Done"

  @rules
  Scenario: The DevOps role and the protocol state the same rule
    When devops.md, devops.toml and cleargate-protocol.md §21 are read
    Then both DevOps roles move a kept exit-5 merge to Done only when its evidence passes, else to "Sprint Review"
    And §21 defines Sprint Review as merged and awaiting proof, and Done as merged and proven by evidence/<ID>.json
```

### 2.2 Verification Steps (Manual)
- [ ] `devops.md`, `devops.toml` and protocol §21 read as R4 and R5 say.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/devops.toml`, `cleargate-cli/scaffold/core/.cleargate/knowledge/cleargate-protocol.md` |
| New Files Needed | Yes — `cleargate-cli/test/scripts/done-guard.red.node.test.ts` |

### 3.2 Technical Logic
- Guard placement: in the transition branch (`update_state.mjs:425-448`), after the `VALID_STATES` check and before the idempotency check, when `newState === 'Done'`. Resolve the sprint dir from the state file's directory (`CLEARGATE_STATE_FILE` or the default), so tests and `merge_story.mjs` (which sets `CLEARGATE_STATE_FILE`) agree.
- Read the evidence JSON defensively: unreadable or unparseable counts as `missing`.
- `merge_story.mjs`: choose the target state before calling `update_state.mjs`; the guard then agrees with the choice. Add `state` and `evidence` to `buildResult` (`:177-181`).

### 3.3 API Contract (if applicable)
N/A — reads the `evidence/<ID>.json` contract defined in STORY-065-02 (`status`, `tier`).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | Four Outline rows, untiered item, later proof, wrong-tier detail. Epic level: Unit. Journey: "Build to Done". |
| Integration tests | 2 | `merge_story.mjs` on a real temp repo: passing evidence → Done; pending → Sprint Review. |
| E2E / acceptance tests | 0 | The release sandbox run shows a live or human item waiting in Sprint Review. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] The `state === 'Done'` reader list is in the dev report.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/merge_story.mjs:376-378` — writes Done after every merge.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/update_state.mjs:425-448` — the transition branch; only the target state's validity is checked.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/constants.mjs:52-61` — `Sprint Review → Done` already exists; no script enters Sprint Review today.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md:38,122` — DevOps sets Done after a kept exit-5 merge.
- **Coverage of this requirement:** partial — the state and the edge exist; the guard and the merge's choice are new.

## Prior work

- [[EPIC-065]] — parent.
- [[BUG-075]] (Triaged) — `update_state.mjs` accepts any edge; this story guards the edge into Done only and leaves the rest to BUG-075.
- [[CR-082]] (Completed) — checked proof only at close; here Done itself waits.
- [[STORY-066-08]] (Completed) — merge by script; the state step changed here is its.

## Why not simpler?

- **Smallest existing surface that could carry this:** CR-082's close gate, which checks evidence once, at close.
- **Why isn't extension / parameterization / config sufficient?** A close-time check lets every item read Done for the whole sprint and the dashboard, the walkthrough and the Reporter all see Done for unproven work. The change is one guard on an existing edge plus a choice in the merge's existing state step; the state itself already exists.

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
