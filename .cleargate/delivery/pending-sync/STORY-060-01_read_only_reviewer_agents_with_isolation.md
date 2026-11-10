---
story_id: STORY-060-01
parent_epic_ref: EPIC-060
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-10-28T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-060 §2 (reviewer agents) and §0 architecture rules; owner direction 2026-10-28. Isolation keys taken from EGM's Claude adapters (.claude-plugin/agents/*.md: tools [Read, Grep, Glob], omitClaudeMd: true); omitClaudeMd verified present in the installed Claude Code 2.1.312 binary. Codex generation read from cleargate-cli/scripts/build-codex-payload.mjs:1-30,243. Revised 2026-10-28 after a fresh-context review: two reviewers, not three (the Zero-Decision check moved to the architect-reader digest, STORY-060-04); frontmatter parser named (src/wiki/parse-frontmatter.ts:parseFrontmatter); Codex TOML existence asserted in the unit test."
actor: Conversational agent at Gate 1
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
area: agent-prompts
db_write_set: []
deferred_verification: []
created_at: 2026-10-28T00:00:00Z
updated_at: 2026-10-28T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-10-28T10:55:37Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-060-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-10-28T10:55:36Z
  sessions: []
---

# STORY-060-01: Read-Only Reviewer Agents With Isolation
**Complexity:** L2 — two new agent files, one frontmatter key on an existing agent, generated Codex roles, one unit test.

## 1. The Spec (The Contract)

### 1.1 User Story
As the agent that drafted an epic or CR, I want two reviewer agents that read only the draft and the files it cites, so that someone who did not write the draft checks it before the owner does.

### 1.2 Detailed Requirements
**Prerequisite:** none. This is the first story of EPIC-060.

1. **Two agent files** in `cleargate-cli/scaffold/hosts/claude/.claude/agents/`: `cleargate-review-simplicity.md` and `cleargate-review-clarity.md`. Frontmatter: `name` (the file's base name), `description`, `tools: Read, Grep, Glob` (the comma form the other agents use), `model: sonnet`, `omitClaudeMd: true`.
2. **Shared rules**, written out in each body (no shared include file):
   - Read the target file and every file it cites before reporting. Use nothing else as context.
   - Do not edit, create or delete any file.
   - If the target or a cited file cannot be read, return `INCOMPLETE REVIEW: <path>` and no findings.
   - Report each finding as four lines: `Severity:` (Blocker | Major | Nit), `Location:` (section heading), `Finding:`, `Why it matters:`.
   - No praise and no summary. Return `no findings` when there are none.
3. **Simplicity lens.** Flags features, settings or abstractions built for a need nobody has stated. Flags new code where existing code already does the job: before claiming something does or does not exist, search the source tree with Grep or Glob and cite the hit. Also flags a fix aimed at a symptom rather than its cause, and epic or CR text that drops into code-level detail. Checks that the `## Why not simpler?` and `## Existing Surfaces` answers hold up.
4. **Clarity lens.** Reads as someone new to the project. Flags terms, IDs, acronyms and components used without a definition or a link, steps that assume setup the document does not state, and claims of a mechanism ("handled automatically") that never say how. Searches the whole document for a definition before flagging a term.
5. **Attribution.** Each body ends with: `Approach adapted from Google's Elephant-Goldfish Model (https://github.com/google/elephant-goldfish-model, Apache-2.0).` The prompt text is ClearGate's own.
6. **`cleargate-wiki-contradict.md`** gains `omitClaudeMd: true`. Its tools are unchanged.
7. **Codex roles.** Run `npm run gen:codex` in `cleargate-cli/` and commit the two generated `scaffold/hosts/codex/.codex/agents/cleargate-review-*.toml` files. `cleargate-wiki-contradict.toml` does not change, because the generator emits only `name`, `description` and the body.

### 1.3 Out of Scope
- Dispatching the reviewers at Gate 1 (STORY-060-02).
- A readiness / Zero-Decision reviewer agent. That check rides the architect-reader digest (STORY-060-04).
- Restricting tools on Codex, which has no per-agent allowlist.
- `omitClaudeMd` on Developer, DevOps, QA, Architect or the architect readers.
- EGM's other lenses (design critic, structural, style, codebase details) and its synthesizer agent.

### 1.4 Open Questions

- **Question:** Agent names?
- **Recommended:** `cleargate-review-<lens>`. The prefix keeps ClearGate's agents apart from domain reviewers a target lists under `sprint.draft_reviewers`, and "simplicity / clarity" says what each checks without EGM's vocabulary.
- **Human decision:** Accepted 2026-10-28 (owner) at the EPIC-060 Brief.

### 1.5 Risks

- **Risk:** `omitClaudeMd` is not described in the Claude Code docs we have on hand. It is present in the installed 2.1.312 binary, and EGM relies on it from 2.1.271.
- **Mitigation:** The manual probe in §2.2 checks it. If a future client drops the key, the reviewer loads CLAUDE.md: weaker isolation, not a failure.
- **Risk:** On Codex the reviewers load AGENTS.md and have every tool.
- **Mitigation:** The read-only rule is in the body, so it applies on both hosts as an instruction. EPIC-060 §3 records this limit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One way through: the agent files exist with the stated frontmatter. |
| Interfaces | T | Two surfaces: the Claude agent markdown and the generated Codex role. |
| Data | F | The behaviour does not vary by input shape. |
| Rules | T | The read-only rule and the incomplete-review rule. |

```gherkin
Feature: Read-only reviewer agents with isolation

  @interfaces
  Scenario: Each reviewer is registered read-only and isolated on Claude Code
    Given the canonical agents directory
    When the frontmatter of cleargate-review-simplicity and cleargate-review-clarity is parsed
    Then each has tools exactly Read, Grep, Glob
    And each has omitClaudeMd true and model sonnet

  @interfaces
  Scenario: Codex roles exist for both reviewers
    Given npm run gen:codex has run
    When the generated Codex agents directory is listed
    Then cleargate-review-simplicity.toml and cleargate-review-clarity.toml exist
    And each carries the name of its canonical agent

  @rules
  Scenario: Each reviewer body carries the shared rules and the credit line
    Given the two reviewer bodies
    When they are read
    Then each contains the read-only rule, the INCOMPLETE REVIEW rule and the four-line finding format
    And each ends with the Elephant-Goldfish Model credit line

  @interfaces
  Scenario: The contradiction checker is isolated too
    Given the canonical cleargate-wiki-contradict agent
    When its frontmatter is parsed
    Then omitClaudeMd is true and its tools are unchanged

  @rules
  Scenario: Error — a reviewer that cannot read its target gives no verdict
    Given a reviewer dispatched with a path that does not exist
    When it runs
    Then it returns INCOMPLETE REVIEW naming the path, and no findings
```

### 2.2 Verification Steps (Manual)
- [ ] Isolation probe: dispatch `cleargate-review-clarity` in this repo and ask it, before any tool call, whether the phrase "ClearGate Meta-Repo" (the root CLAUDE.md heading) is in its context. Expected: no.
- [ ] Error scenario: dispatch `cleargate-review-simplicity` on `.cleargate/delivery/pending-sync/DOES-NOT-EXIST.md`. Expected: `INCOMPLETE REVIEW: …` and no findings.
- [ ] Read-only probe: ask `cleargate-review-simplicity` to fix a finding it reports. Expected: it declines; it has no Edit or Write tool.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-review-simplicity.md` |
| Related Files | `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-review-clarity.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-contradict.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-review-simplicity.toml`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/cleargate-review-clarity.toml`, `cleargate-cli/test/agents/review-agents.node.test.ts` |
| New Files Needed | Yes — the two agent files, two generated TOMLs, one test file |

### 3.2 Technical Logic
Write each agent body as: a short role statement, the shared rules (§1.2 item 2), the lens checklist (§1.2 item 3 or 4), the output format, the credit line. Keep each body short; `cleargate-wiki-contradict.md` is the length and tone to match.

The test resolves canonical files with `canonicalPath` from `test/helpers/scaffold-roots.js`, as `test/agents/reporter-content.node.test.ts` does. It parses frontmatter with `parseFrontmatter` from `src/wiki/parse-frontmatter.ts`. `tools` comes back as the string `"Read, Grep, Glob"`: split on `,`, trim each part, and assert the set equals `{Read, Grep, Glob}`. For scenario 2, it asserts both TOML files exist and contain `name = "cleargate-review-<lens>"`; `prebuild`'s `--check` separately keeps them in sync with the markdown.

### 3.3 API Contract (if applicable)
Not applicable — no endpoint.

## Task Breakdown

- [ ] Write `cleargate-review-simplicity.md` and `cleargate-review-clarity.md`.
- [ ] Add `omitClaudeMd: true` to `cleargate-wiki-contradict.md`.
- [ ] Run `npm run gen:codex` and stage the two generated TOMLs.
- [ ] Write `test/agents/review-agents.node.test.ts` for scenarios 1–4.
- [ ] Run the manual probes in §2.2 and record the results in the dev report.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 4 | One per §2.1 scenario 1–4, in `test/agents/review-agents.node.test.ts`. |
| Integration tests | 0 | No infrastructure involved. |
| E2E / acceptance tests | 0 | Scenario 5 and the isolation probe need a live model dispatch; they are manual (§2.2). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered (scenario 5 by the manual step).
- [ ] Peer/Architect Review passed.
- [ ] Live mirror re-synced per the framework-sprint routine; `node cleargate-cli/dist/cli.js doctor` reports no scaffold drift for the three agent files.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/cleargate-wiki-contradict.md` — existing read-only (Read, Grep, Glob) advisory reviewer; the pattern the new agents follow.
- **Surface:** `cleargate-cli/scripts/build-codex-payload.mjs:renderAgentToml` — generates a Codex role from each canonical agent; no change needed.
- **Surface:** `cleargate-cli/src/wiki/parse-frontmatter.ts:parseFrontmatter` — the frontmatter parser the test uses.
- **Surface:** `cleargate-cli/test/agents/reporter-content.node.test.ts` — existing agent-content test; copy its `canonicalPath` usage.
- **Coverage of this requirement:** partial. Agent format, Codex generation, parser and test pattern all exist; the two agents are new.

## Prior work

- [[EPIC-059]] — STORY-059-01 dispatches target-supplied domain reviewers at §A.4 and ships none; these two are Gate-1 reviewers and do not join that list.
- [[EPIC-058]] — clean-room harnesses; isolation of an install environment, not of a reviewer's context.
- `omitClaudeMd` or read-only reviewer isolation: none found.

## Why not simpler?

- **Smallest existing surface that could carry this:** a general-purpose subagent given an inline review prompt at each dispatch.
- **Why isn't extension / parameterization / config sufficient?** An inline prompt changes with every dispatch, so the criteria drift and the dispatching agent's framing leaks in. A general-purpose subagent also loads CLAUDE.md and has write tools. Fixed agent files are the only place to pin the criteria and the isolation settings, and Codex roles come from them for free.

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
