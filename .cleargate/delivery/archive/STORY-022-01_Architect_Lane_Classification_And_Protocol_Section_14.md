---
story_id: STORY-022-01
parent_epic_ref: EPIC-022
parent_cleargate_id: "EPIC-022"
sprint_cleargate_id: "SPRINT-14"
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-022_Sprint_Lane_Classifier_And_Hotfix_Path.md
actor: Architect agent
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
sprint: SPRINT-14
milestone: M3
approved: true
approved_at: 2026-04-26T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-26T17:33:31Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-022-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T17:33:31Z
  sessions: []
---

# STORY-022-01: Architect Lane Classification — rubric in `architect.md` + protocol §9
**Complexity:** L2 — two synchronized surfaces (agent file + protocol section), one new rubric, no new code paths.

## 1. The Spec (The Contract)

### 1.1 User Story

As the orchestrator, I want the Architect agent to emit a `lane: standard | fast` recommendation per story (with one-line rationale for non-standard lanes) during Sprint Design Review, so that downstream Developer/QA spawn decisions can route through a deterministic checklist rather than ad-hoc judgement.

### 1.2 Detailed Requirements

Two synchronised surfaces land:

1. **`.claude/agents/architect.md`** — append §"Lane Classification" with the seven-check rubric from PROPOSAL-013 §2.3 (LOC cap, forbidden surfaces, no new dependency, single acceptance scenario, existing tests cover, expected_bounce_exposure: low, no epic-spanning subsystem touches). The Architect's Sprint Design Review tail step (defined by STORY-013-09) gains the lane-emission contract: write a §2.4 "Lane Audit" subsection in the Sprint Plan listing every fast-lane story with a ≤80-char rationale.
2. **`.cleargate/knowledge/cleargate-enforcement.md`** + scaffold mirror — append §9 "Lane Routing" with the rubric, demotion mechanics (one-way `fast → standard`), forbidden-surface file-path prefix list, AND register the `LD` (Lane Demotion) event-type AS A SELF-CONTAINED SENTENCE WITHIN §9 ITSELF (per Architect M3 §6 #3 — §10 is wiki-protocol, not events; STORY-022-03 handles the parallel sprint_report.md vocabulary registration). ≤30 lines per the protocol section-length convention. Both files (live + `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md`) MUST stay byte-identical.

The forbidden-surface list (per PROPOSAL-013 §2.3 check #2):
- Database schema/migration (anything under `mcp/src/db/`, `**/migrations/`).
- Auth/identity flow (anything under `mcp/src/auth/`, `mcp/src/admin-api/auth-*`).
- Runtime config schema (`cleargate.config.json` shape, `mcp/src/config.ts`).
- MCP adapter API surface (`mcp/src/adapters/`).
- Scaffold manifest (`cleargate-planning/MANIFEST.json` shape).
- Security-relevant code (token handling, invite verification, gate enforcement).

### 1.3 Out of Scope

- Implementing the lane assignment in `state.json` (STORY-022-02 owns schema bump + migration).
- Templates carrying lane fields (STORY-022-03 owns).
- Pre-gate scanner / demotion mechanics in code (STORY-022-04 owns).
- Developer agent reading lane (STORY-022-05 owns).
- Hotfix lane (STORY-022-06 owns).
- Reporter contract (STORY-022-07 owns).
- §9 self-disabling rubric after 3 consecutive "n" retrospect answers (deferred per EPIC-022 §2 OUT-OF-SCOPE — observe drift signal in practice first).

## 2. The Truth (Executable Tests)

### 2.1 Gherkin Acceptance Criteria

```gherkin
Feature: Architect Lane Classification

  Scenario: Architect agent file documents the seven-check rubric
    Given the file `.claude/agents/architect.md`
    When a reader greps for "Lane Classification"
    Then a section exists with seven explicitly numbered checks (1..7)
    And each check restates the corresponding rule from PROPOSAL-013 §2.3
    And the section also documents the §2.4 Lane Audit emission contract

  Scenario: Protocol §9 documents the rubric, demotion, forbidden surfaces, and LD event
    Given `.cleargate/knowledge/cleargate-protocol.md`
    When a reader navigates to §9 "Lane Routing"
    Then the section contains: the rubric (mirrored from agent file), demotion mechanics, forbidden-surface table, and the LD event-type registered as a self-contained sentence within §9

  Scenario: Protocol byte-equality is preserved
    Given `.cleargate/knowledge/cleargate-protocol.md` and `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`
    When `diff` is run between the two files
    Then the diff is empty

  Scenario: §9 length conforms to protocol section-length convention
    Given §9 in either protocol file
    When the section line count is measured
    Then it is ≤30 lines (heading + content)
```

### 2.2 Manual Verification

- Read `.claude/agents/architect.md` — confirm "Lane Classification" section present and matches the rubric.
- Read either protocol file at §9 — confirm it documents the same rubric verbatim plus demotion + LD event.
- Run any existing protocol byte-equality test in the cleargate-cli test suite — must pass.

## 3. Implementation Guide

### 3.1 Files To Modify

- `.claude/agents/architect.md` (live, gitignored — orchestrator's runtime instance) AND `cleargate-planning/.claude/agents/architect.md` (scaffold canonical, tracked). Both must be updated. The live file is gitignored per `.gitignore` `/.claude/`; only the scaffold version is committed, and it is what gets re-installed on `cleargate upgrade`.
- `.cleargate/knowledge/cleargate-protocol.md` (live).
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` (scaffold mirror) — both must remain byte-identical.

### 3.2 Technical Logic

No code paths change. This is documentation-as-contract: the Architect agent reads its own definition file and applies the rubric during Sprint Design Review. The protocol section is the single-source-of-truth spec; the agent file is the runtime instruction.

§9 numbering: STORY-014-01 took §8 in M2; CR-010 took §7 in M1. This story takes §9 (the original protocol slot reserved for lane routing). Confirm by reading the post-M2 protocol file and finding the next available slot — if §9 is already taken by something unexpected, either renumber to the next available OR escalate.

### 3.3 API / CLI Contract

No CLI surface change. The Architect agent's emission contract is an artifact (Sprint Plan §2.4 Lane Audit subsection); STORY-022-03 writes the template skeleton.

## 4. Quality Gates

### 4.1 Test Expectations

- Protocol byte-equality test passes (existing test from STORY-014-01 round 2 — preserve).
- ≥1 test or grep-based assertion that §9 exists with the seven-check rubric. If the cleargate-cli test suite has a "protocol section presence" pattern, follow it; otherwise add a small test under `cleargate-cli/test/lib/` that reads the protocol file and asserts the section heading.
- Manual smoke: read the Sprint Design Review section of `architect.md` and verify the lane-emission contract is referenced.

### 4.2 Definition of Done

- [ ] §"Lane Classification" added to `cleargate-planning/.claude/agents/architect.md` (and reflected in the live `.claude/agents/architect.md`).
- [ ] §9 "Lane Routing" added to BOTH protocol files, byte-identical.
- [ ] §9 length ≤30 lines.
- [ ] LD event type registered as a self-contained sentence within §9 (NOT in §10 — §10 is wiki protocol per Architect M3 §6 #3; sprint_report.md vocabulary is STORY-022-03's responsibility).
- [ ] Protocol byte-equality test passes.
- [ ] Forbidden-surface list explicit per §1.2.
- [ ] `npm run typecheck` clean for cleargate-cli.
- [ ] `npm test` green for cleargate-cli.
- [ ] Commit message: `feat(STORY-022-01): SPRINT-14 M3 — Architect Lane Classification rubric + protocol §9`.
- [ ] One commit. NEVER `--no-verify`.
