---
epic_id: EPIC-044
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟡 Medium
context_source: |
  Spawned 2026-06-01 from the same framework self-review that produced EPIC-043.
  Split OUT of EPIC-043 deliberately: these two items are net-new DESIGN that
  touches the agent-dispatch protocol and harness integration, not hygiene —
  folding them into the hygiene epic would over-stuff it (the exact failure the
  review warned about). Recorded here as a backlog epic for its own decomposition.

  PROPOSAL-GATE WAIVER (per feedback_proposal_gate_waiver): proposal step retired
  (CR-025); owner requested these improvements recorded directly. Waiver recorded.

  These are the two highest-leverage RELIABILITY + TOKEN multipliers the review
  surfaced, deferred from EPIC-043 because they need design decisions (below in §6)
  before they are execution-ready. Left at 🟡 on purpose — this is a recorded
  backlog bet, not yet a Gate-1-approved sprint candidate.
owner: sandrinio
target_date: 2026-07-15
created_at: 2026-06-01T00:00:00Z
updated_at: 2026-05-31T21:34:31Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
area: framework/dispatch
approved: false
proposal_gate_waiver: true
approved_by: sandrinio
approved_at: 2026-06-01T00:00:00Z
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:34:31Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-044
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:34:30Z
  sessions: []
---

# EPIC-044: Agent Dispatch Reliability & Token Efficiency

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make serial agent dispatch deterministic (structured verdicts instead of free-text parsing) and token-efficient (prompt-cache-friendly dispatch structure + explicit model tiering), without altering the adversarial 5-agent split or any gate semantics.</objective>
  <architecture_rules>
    <rule>Do NOT alter the QA-Red seal, immutable-red-tests, DevOps single-writer, or bounce-cap. These are the integrity core; this epic optimizes dispatch mechanics around them.</rule>
    <rule>Structured-verdict adoption must MATCH the shape the parallel-wave path already returns (GREEN/ESCALATED/BLOCKED + tokens) so serial and parallel converge on one contract, not two.</rule>
    <rule>Model-tier choices are conservative-by-default: keep opus where judgment lives (architect-synth, QA verdicts), sonnet/haiku only for mechanical roles already proven on them (architect-reader, developer).</rule>
    <rule>Canonical → payload → live mirror discipline applies to every agent-contract edit.</rule>
  </architecture_rules>
  <target_files>
    <file path=".claude/skills/sprint-execution/SKILL.md" action="modify" />
    <file path=".claude/agents/qa.md" action="modify" />
    <file path=".claude/agents/architect.md" action="modify" />
    <file path=".claude/agents/developer.md" action="modify" />
    <file path=".claude/hooks/token-ledger.sh" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
The sprint loop has two efficiency/reliability ceilings the hygiene epic (EPIC-043) deliberately does not touch. **(1) Reliability:** serial dispatches return free text (`"QA: PASS"`) that the orchestrator parses heuristically, while the parallel-wave path already returns schema-typed verdicts (`GREEN`/`ESCALATED`/`BLOCKED` + tokens). The two paths use two contracts; the serial one is parse-fragile and makes token attribution approximate. **(2) Token:** every dispatch re-sends the full agent contract (the 16KB `architect.md`, plus `sprint-context.md`) as fresh context, and roles are not consistently tiered by model. A prompt-cache-friendly dispatch structure (stable prefix + variable suffix) plus deliberate model tiering is the biggest per-token lever in the loop.

**Success Metrics (North Star):**
- Serial and parallel dispatch return the **same structured verdict contract**; the orchestrator never parses free text to decide a transition.
- Token-ledger attribution is **exact** (from the verdict), not reconstructed from markers/transcript-grep.
- Measurable drop in per-dispatch input tokens from prefix-caching the stable agent-contract + sprint-context across a sprint's dispatches.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Structured-verdict contract for **serial** dispatches (Architect/QA/Dev/DevOps) matching the parallel-wave schema; orchestrator consumes the verdict, not prose.
- [ ] Exact token attribution sourced from the verdict payload.
- [ ] Prompt-cache-friendly dispatch layout: stable prefix (agent contract + `sprint-context.md`) + variable suffix (the story), so the prefix is cache-eligible across a sprint's dispatches.
- [ ] Documented model-tier table per role (which roles run haiku/sonnet/opus and why).

**Anticipated decomposition (deferred until §6 design questions resolve):** STORY-044-01 serial structured-verdict contract; STORY-044-02 verdict-sourced ledger attribution; STORY-044-03 prompt-cache-friendly dispatch layout; STORY-044-04 model-tier table + role assignment. IDs reserved, not yet drafted — this epic stays 🟡 backlog until designed.

**❌ OUT-OF-SCOPE**
- Any change to the adversarial 5-agent split, gate semantics, worktree isolation, or the MCP store.
- The EPIC-043 hygiene workstreams (docs, templates, flashcard curation, wiki recompile, surface hygiene, gates-that-don't-gate, consolidation pass).
- Re-architecting the parallel-wave path (it already has the target contract; this epic brings serial up to it).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Contract convergence | One verdict schema for serial + parallel — not two. |
| Integrity | The 5-agent seals and bounce-cap are untouched; this is dispatch plumbing only. |
| Harness coupling | Prompt-cache behavior depends on the Claude Code harness; design must degrade gracefully if caching is unavailable. |
| Mirror discipline | Agent-contract edits propagate canonical → payload → live. |

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-01.

- **Surface:** `.cleargate/scripts/launch_wave.mjs` — already returns schema-typed segment verdicts (`GREEN`/`ESCALATED`/`BLOCKED` + tokens); this epic extends that contract to serial dispatch rather than inventing a new one.
- **Surface:** `.claude/hooks/token-ledger.sh` (31KB, 3-level attribution fallback) — exact verdict-sourced attribution would let the serial fallback chain shrink.
- **Surface:** `.claude/agents/architect.md` (~16KB) + `sprint-context.md` — the stable prefix candidate for prompt caching.
- **Coverage:** ~100% extension of existing dispatch mechanics; no net-new subsystem.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** the parallel-wave verdict contract in `launch_wave.mjs` — serial dispatch should adopt it, not get a parallel invention.
- **Why isn't extension / config sufficient?** It largely is for the verdict half (adopt the existing schema). The prompt-cache half needs a real change to how dispatches are assembled (prefix/suffix split), which is design, not config — hence a backlog epic with the open questions in §6 rather than a hygiene CR.

## 4. Technical Grounding

**Affected files:** `.claude/skills/sprint-execution/SKILL.md` (dispatch assembly + verdict consumption), `.claude/agents/{qa,architect,developer,devops}.md` (emit structured verdict), `.claude/hooks/token-ledger.sh` (consume verdict tokens). Mirror canonical + payload.

**Data Changes:** None to product schema/DB/MCP. The verdict is a dispatch-time artifact.

## 5. Acceptance Criteria

```gherkin
Feature: Deterministic, token-efficient agent dispatch

  Scenario: Serial dispatch returns a structured verdict
    Given a QA-Verify dispatch on a story
    When it completes
    Then it returns a schema-typed verdict (status + tokens) matching the parallel-wave shape
    And the orchestrator transitions state from the verdict field, not from parsing prose

  Scenario: Exact token attribution
    Given a completed story's dispatches
    Then each ledger row's tokens come from the verdict payload
    And no row depends on transcript-grep reconstruction

  Scenario: Error path — malformed or missing verdict
    Given a dispatch returns no parseable structured verdict
    Then the orchestrator halts that story with an Error (does NOT silently assume PASS)
    And surfaces the offending dispatch for human review
```

## 6. AI Interrogation Loop (Human Input Required)

- **Q1 — verdict transport.** How does a serial subagent return a structured verdict to the orchestrator — a sentinel block in its final message the orchestrator parses, a written `verdict.json` artifact, or the StructuredOutput tool pattern the review workflows use? **Recommended:** the StructuredOutput/schema pattern (same as parallel). **Human Answer:** _waiting_
- **Q2 — prompt-cache mechanism.** Does the Claude Code harness expose prompt-cache controls the framework can target for the stable prefix, or is this best-effort via dispatch ordering? **Human Answer:** _waiting_
- **Q3 — model-tier table.** Confirm the per-role model assignment (architect-synth/QA-verdict = opus; architect-reader/developer = sonnet; any haiku candidates?). **Human Answer:** _waiting_
- **Q4 — sequencing.** Does EPIC-044 run after EPIC-043 (so dispatch mechanics change on a clean, gate-correct base), or in parallel? **Recommended:** after EPIC-043. **Human Answer:** _waiting_

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity — recorded backlog bet, not yet Gate-1-approved**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] Proposal document has `approved: true`. — **N/A: proposal retired (CR-025); waiver via frontmatter `proposal_gate_waiver: true`. Surfaced in Brief.**
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains real, verified file paths (grep-verified 2026-06-01).
- [ ] §6 AI Interrogation Loop is empty — **4 design questions open; this is intentionally a backlog epic.**
- [x] 0 "TBDs" exist in the document.
- [x] §Existing Surfaces cites at least one source-tree path.
- [x] §Why not simpler? has both sub-bullets answered.
