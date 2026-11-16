---
story_id: STORY-065-01
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
actor: Owner and orchestrator planning a sprint; the readiness gate and preflight
complexity_label: L3
area: templates,gates,cli,sprint-execution
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-16T07:39:05.279Z
updated_at: 2026-11-16T07:39:05.279Z
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
  last_gate_check: 2026-11-16T07:48:08Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "2d073ccfbcef19019fb6a793bc53f4f8e969252384c2ffd7ab57ac2475ca4a8c"
---

# STORY-065-01: Items Declare a Proof Tier
**Complexity:** L3 — three item templates, the goal check, one new closed-set predicate with a date cut-over, and a preflight rule, in both hosts' skill text.

## 1. The Spec (The Contract)

### 1.1 User Story
As the owner planning a sprint, I want every story, CR and bug to say before it is built how it will be proven and at which tier, so that "QA passed" can no longer stand in for "it works".

### 1.2 Detailed Requirements
- **R1 — Templates.** `story.md`, `CR.md` and `Bug.md` gain a `proof_tier: ""` frontmatter key (comment: `unit | container | live | human`) and a `## Proof` section placed directly after the item's acceptance/verification section (story: after `## 4. Quality Gates`; CR: after `## 4. Verification Protocol`; bug: after `## 5. Verification Protocol (The Failing Test)`). That placement shifts none of the positional `section(N)` criteria in `readiness-gates.md` (story 3 and 5, CR 3 and 6, bug 2). The section holds:
  - `- **Tier:**` (repeats the frontmatter value for the reader),
  - `- **Expected result:**` what a pass looks like,
  - `- **Why human:**` (only for `human`: why no agent can reach the check),
  - `- **Steps:**` (for `live` and `human`, when the proof is not one command),
  - one fenced block whose first non-blank line is the proof command — the format `prep_qa_context.mjs` `parseProofCommand` already reads. For `unit` and `container` the block may be omitted; the command then comes from `gate-checks.json` `proof.<tier>` (STORY-065-02).
- **R2 — Holdout guidance.** The Gherkin section of each template says: an item whose tier is `container` or `live` tags at least one scenario `@holdout` on the line above `Scenario:`; QA-Red and the Developer never see it, and QA-Verify writes and runs its test (STORY-065-05).
- **R3 — Goal tier.** `templates/sprint_context.md` `## Goal Acceptance Check` gains a `- **Tier:**` line, and SKILL §A.5 (Claude `SKILL.md` and the Codex rendering under `scaffold/core/.agents/skills/sprint-execution/`) asks for the goal's tier when the check is derived.
- **R4 — Predicate `proof-declared`.** A closed-set predicate in `readiness-predicates.ts`, registered for story `ready-for-execution`, CR `ready-to-apply` and bug `ready-for-fix`, documented as vocabulary entry 14 (the header's "exactly 13 predicate shapes" becomes 14). It passes for an item whose `created_at` is before the cut-over constant `PROOF_DECLARED_CUTOVER` (an ISO date set to the day this story merges). Otherwise it requires: `proof_tier` is one of the four values; a `## Proof` section exists; `Expected result` is filled; `human` has a filled `Why human`; `live` has a command block or filled `Steps`; `container` and `live` have at least one `@holdout`-tagged scenario. A `{…}` placeholder counts as empty, so an unedited template fails (BUG-054's rule). The failure detail names the first missing part.
- **R5 — Preflight.** `cleargate sprint preflight` check 5 also fails any non-terminal in-scope item without a valid `proof_tier`, whatever its `created_at`, with `<ID>: proof-declared`.
- **R6 — No existing item changes.** A before/after `cleargate gate check` sweep over every item in `pending-sync/` shows no changed result.

### 1.3 Out of Scope
- Recording or running proofs (STORY-065-02), the Done guard (065-03), the prove stage (065-04), hiding holdouts (065-05), close and report (065-06).
- Hotfixes: they keep `## 3. Verification Steps` and get no tier.
- Epics and initiatives: their Testing Strategy already carries the real-host level (CR-126).

### 1.4 Open Questions

- **Question:** Should the cut-over read `created_at` (an ISO timestamp every item carries) or `created_at_version`?
- **Recommended:** `created_at`. The `test-layers-declared` comment (`readiness-predicates.ts:1270-1272`) records that a `created_at_version` compare cannot be built, because `>=` coerces with `Number()`.
- **Human decision:** As recommended (owner, 2026-11-16: "approve as recommended").

### 1.5 Risks

- **Risk:** The new section is placed where `section(N)` counts it and a positional criterion silently reads the wrong section.
- **Mitigation:** R1 fixes the placement; the gate-section pinning test (`test/docs/gate-section-index-pinning.node.test.ts`) gains one case per template proving the indexes are unchanged.
- **Risk:** Items drafted between the cut-over and a host's upgrade fail a gate they cannot see in their old template.
- **Mitigation:** The failure detail names the missing part and the template section to copy; `cleargate upgrade` brings the new templates.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | An item passes by command, or by steps plus reason (human). |
| Interfaces | T | The readiness gate (`cleargate gate check`) and sprint preflight both enforce it. |
| Data | T | Three item types and four tiers, through one Outline. |
| Rules | T | Cut-over rule, holdout rule, unedited-template rule. |

```gherkin
Feature: Items declare a proof tier

  @data @paths
  Scenario Outline: A new item that declares its proof passes proof-declared
    Given a <type> created after the cut-over with proof_tier "<tier>" and a filled Proof section <proof>
    When cleargate gate check runs on it
    Then proof-declared passes

    Examples:
      | type  | tier      | proof                                                     |
      | story | unit      | with no command block (gate-checks proof.unit is used)    |
      | CR    | container | with the command "make e2e" and one @holdout scenario     |
      | bug   | human     | with Why human "agents cannot reach the controller" and Steps |

  @rules
  Scenario: A container item without a holdout scenario fails
    Given a story created after the cut-over with proof_tier "container" and no @holdout scenario
    When cleargate gate check runs on it
    Then proof-declared fails with "container tier needs at least one @holdout scenario"

  @rules
  Scenario: An unedited template fails
    Given a story created by "cleargate new story" after the cut-over and not edited
    Then the story shows a proof_tier key, a "## Proof" section after "## 4. Quality Gates" and the @holdout guidance
    When cleargate gate check runs on it
    Then proof-declared fails with "proof_tier is missing"

  @paths
  Scenario: The sprint goal names a tier
    Given a sprint initialised by init_sprint.mjs
    Then sprint-context.md's Goal Acceptance Check has a "Tier:" line

  @rules
  Scenario: Items created before the cut-over are unchanged
    Given every item in pending-sync was created before the cut-over
    When cleargate gate check runs on each of them before and after this change
    Then no item's gate result changes

  @interfaces
  Scenario: An item without a tier cannot enter a sprint
    Given CR-E was created before the cut-over and has no proof_tier
    And CR-E is in scope of a sprint plan
    When cleargate sprint preflight runs for that sprint
    Then check 5 fails with "CR-E: proof-declared"
```

### 2.2 Verification Steps (Manual)
- [ ] `cleargate new story --epic EPIC-065 x` in a temp copy shows `proof_tier` and `## Proof`; `cleargate gate check` names `proof-declared`.
- [ ] A fresh `sprint-context.md` written by `init_sprint.mjs` shows the `Tier:` line under Goal Acceptance Check.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/readiness-predicates.ts` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md`, `cleargate-cli/scaffold/core/.cleargate/templates/story.md`, `cleargate-cli/scaffold/core/.cleargate/templates/CR.md`, `cleargate-cli/scaffold/core/.cleargate/templates/Bug.md`, `cleargate-cli/scaffold/core/.cleargate/templates/sprint_context.md`, `cleargate-cli/src/commands/sprint.ts`, `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`, `cleargate-cli/scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/lib/proof-declared.red.node.test.ts`, `cleargate-cli/test/commands/preflight-proof-tier.red.node.test.ts` |

### 3.2 Technical Logic
- Add `proof-declared` to the closed-set dispatch (`readiness-predicates.ts:188-214`) beside `test-layers-declared`. It receives `ParsedDoc {fm, body, absPath}`. Read `fm.created_at` (string or Date); compare with `PROOF_DECLARED_CUTOVER` as dates; before the cut-over return pass with detail `pre-cutover`.
- Locate `## Proof` with the same fence-aware scan `parseProofCommand` uses (`prep_qa_context.mjs:545-569`): heading recognised outside fences, section ends at the next `#`/`##` heading. Read the bullet values; treat `{…}` and empty as missing.
- Holdout count: lines `@holdout` (alone or among other tags) directly above a `Scenario:`/`Scenario Outline:` line inside a fenced `gherkin` block.
- Preflight: inside `evaluateItem` (`sprint.ts:~1673-1710`), after the terminal-status skip, push `{id, reason: 'proof-declared', failingCriteria: ['proof-declared']}` when `fm.proof_tier` is not one of the four values.
- Update `readiness-gates.md`: add `- id: proof-declared` / `check: "proof-declared"` to the three blocks and the vocabulary entry; bump the count line.

### 3.3 API Contract (if applicable)
N/A — no endpoint. The predicate's id is `proof-declared`; STORY-065-02 and 065-04 read `proof_tier` and the `## Proof` command with the existing `parseProofCommand` rule.

## Task Breakdown
- [ ] Red tests: the Outline's three rows pass; container without holdout fails; unedited template fails; pre-cut-over item passes; preflight names `CR-E: proof-declared`.
- [ ] Templates: `proof_tier` key, `## Proof` section after the verification section, `@holdout` guidance in the three Gherkin sections; `Tier:` line in `sprint_context.md`.
- [ ] `proof-declared` evaluator, cut-over constant, dispatch entry; registry and vocabulary entry 14.
- [ ] Preflight rule in `evaluateItem`.
- [ ] SKILL §A.5 sentence in both hosts.
- [ ] Pinning test cases; before/after gate sweep over `pending-sync/` recorded in the dev report.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | One per Outline row and per rule scenario, plus the pinning cases. Epic Testing Strategy level: Unit. |
| Integration tests | 1 | Preflight over a fixture sprint with an old item lacking a tier. Journey: "Plan with proof". |
| E2E / acceptance tests | 0 | The release sandbox run declares tiers on every item (sprint Goal Acceptance Check). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Before/after gate sweep shows no changed result.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs:545-591` — `parseProofCommand` and the `proof_tier` read; the section format this story writes into the templates.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:188-214,1270-1285` — closed-set dispatch and `test-layers-declared`, the nearest predicate in shape.
- **Surface:** `cleargate-cli/src/commands/sprint.ts:1637-1784` — preflight check 5 `checkPerItemReadinessGates`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/assign_lane.mjs:92-136` — already reads `proof_tier` for lanes.
- **Coverage of this requirement:** partial — the reader and the lane signal exist; the template fields, predicate and preflight rule are new.

## Prior work

- [[EPIC-065]] — parent (approved 2026-11-16).
- [[CR-128]] (Draft) — real-host proof row for CRs and bugs; absorbed by this story's tier and `## Proof` section, and closes when it merges.
- [[CR-111]] (Completed) — test-layer counts; kept beside the tier.
- [[CR-126]] (Completed) — epic Testing Strategy with a real-host level; carried to items here.
- [[CR-130]] (Draft) — also edits `Bug.md`; sequence after this story if both enter a sprint.
- [[BUG-054]] — unedited templates must fail their own gate; R4 follows it.

## Why not simpler?

- **Smallest existing surface that could carry this:** `test-layers-declared` (`readiness-predicates.ts:1285`) with a fourth row, as CR-128 proposed.
- **Why isn't extension / parameterization / config sufficient?** A count row says how many real-host checks exist, not which tier the item is proven at or how. The loop needs a machine-readable tier (`assign_lane.mjs`, the prove stage, the Done guard and the report all read it) and a command the recorder can run, so the tier lives in frontmatter and the command in the section `parseProofCommand` already reads. The predicate is new because no existing one reads frontmatter and body together with a date cut-over.

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
