---
story_id: STORY-026-02
parent_epic_ref: EPIC-026
parent_cleargate_id: EPIC-026
sprint_cleargate_id: SPRINT-20
carry_over: false
status: Done
ambiguity: 🟢 Low
context_source: EPIC-026 §2 IN-SCOPE M2.1 — collapse the duplicated four-agent-loop block in CLAUDE.md (live + canonical) down to a single bullet pointer once the sprint-execution skill is the canonical playbook. EPIC-026 §6 Q3 confirmed an explicit "when banner says Load skill X, invoke Skill tool" rule remains in CLAUDE.md as the always-on contract. Wave 2 dispatch — runs AFTER STORY-026-01 + CR-026 + BUG-025 land to avoid mirror-surface contention.
actor: Conversational orchestrator agent (always-on context surface consumer)
complexity_label: L1
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
approved: true
approved_by: sandrinio
approved_at: 2026-05-02T14:00:00Z
created_at: 2026-05-02T15:00:00Z
updated_at: 2026-05-02T15:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-02T17:53:21Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-026-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-02T17:53:21Z
  sessions: []
---

# STORY-026-02: CLAUDE.md Prune (Live + Canonical)

**Complexity:** L1 — prose pruning across two mirrored CLAUDE.md files; net delete ≥60 lines per file; one explicit always-on rule added.

## 1. The Spec (The Contract)

### 1.1 User Story

As the **conversational orchestrator agent** loading CLAUDE.md as always-on context, I want the four-agent-loop / dispatch-marker / Sprint-Execution-Gate / Architect-runs-twice / sprint-close-ack content collapsed to a single one-line pointer to `.claude/skills/sprint-execution/SKILL.md`, so the always-on token cost drops by ~1.5K per turn AND the orchestration playbook has exactly one source of truth — instead of being reconstructed from fragments across CLAUDE.md, cleargate-protocol.md, cleargate-enforcement.md, and per-agent contracts (which has measurably failed: BUG-005, FLASHCARDs `#cli #sprint-close #assume-ack` and `#cli #state-update #execution-mode`).

### 1.2 Detailed Requirements

- **R1 — Identify the prune surface in live CLAUDE.md.** The duplicated orchestration block lives roughly between the headings "Agent orchestration" and ends before "Test + commit conventions" (lines ~73–119 in pre-prune). Within the `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` injection block, the duplicated content additionally appears as: "Four-agent loop (roles in `.claude/agents/`)" bullet block, "Orchestrator Dispatch Convention" paragraph, "Sprint Execution Gate" paragraph, "Sprint close is Gate-4-class (CR-019)" paragraph, "Architect runs twice per sprint" paragraph. Any prose that the skill at `.claude/skills/sprint-execution/SKILL.md` already authoritatively documents is a prune candidate.
- **R2 — Replace with single one-line pointer.** Insert exactly one bullet, immediately after the "Triage first, draft second" paragraph in the CLEARGATE-block: `- **Sprint execution.** When a sprint is active, the orchestration playbook lives at .claude/skills/sprint-execution/SKILL.md — load it before dispatching any execution agent.` (or equivalent that names the skill path AND the load-first contract).
- **R3 — Add the explicit "load skill on banner" contract.** Per EPIC-026 §6 Q3, add one bullet (not pruned, always-on): `- **Skill auto-load directive.** When the SessionStart banner emits "Load skill: <name>", invoke the Skill tool to load it before continuing — description-match auto-load is advisory, not contractually forced.` Place near the existing "**State-aware surface**" paragraph or wherever the always-on rules cluster naturally.
- **R4 — Preserve halt rules verbatim.** The triage-first rule, Brief-is-the-universal-pre-push-handshake rule, halt-at-gates rule, Gate 1 rule, Gate 4 close-ack rule, "scope reminder" disclaimer, and project-overrides note MUST remain in post-prune CLAUDE.md — they fire on every conversational turn (not only sprint-execution). Pruning them would degrade non-execution behavior.
- **R5 — Preserve Sprint-mode v1/v2 + Boundary-gates pointers.** EPIC-026 §6 Q2 explicitly KEEPS both. They affect triage decisions outside sprint-active state — pruning would degrade non-execution behavior.
- **R6 — Mirror-parity edit.** Apply identical prune + insertions to `cleargate-planning/CLAUDE.md` (canonical). Per FLASHCARD `2026-05-01 #mirror #parity` — edits to live MUST mirror to canonical per-edit; pre-existing divergence is NOT reconciled as a side effect.
- **R7 — Net line-count check.** `wc -l CLAUDE.md` and `wc -l cleargate-planning/CLAUDE.md` each reduce by ≥60 lines vs the pre-prune SHA (validates the EPIC-026 success metric of ~40% drop in orchestration-specific lines).

### 1.3 Out of Scope

- Reorganizing or pruning `.cleargate/knowledge/cleargate-protocol.md` or `cleargate-enforcement.md`. EPIC-026 §2 OUT-OF-SCOPE explicitly KEEPS both intact — they remain authoritative for non-execution rules (triage, gates, lifecycle, lane rubric).
- Removing legacy "bounce" terminology from any state.json fields, script names, or `Bouncing` state value. Code-bound; separate ticket.
- Renaming `--assume-ack`. Touches close_sprint.mjs + protocol + enforcement docs across multiple repos. Separate CR.
- Changes to `.claude/agents/{architect,developer,qa,reporter}.md`. Role contracts unchanged.

### 1.4 Open Questions

None. EPIC-026 §6 resolved Q1 (only emit directive on success), Q2 (KEEP v1/v2 and boundary-gates bullets), Q3 (YES, add explicit load-skill rule), Q5 (DEFER stall-watcher).

### 1.5 Risks

- **R1-Risk:** Pruning too aggressively. If a halt-rule or Gate-1/Gate-4 contract phrase is pruned, orchestrator behavior degrades on every turn (not just sprint-active). Mitigation: scan the prune diff against EPIC-026 §3 Reality-Check column 2 ("Halt rules must remain always-on") before commit; one-by-one verify each preserved rule still grep-matches in post-prune CLAUDE.md.
- **R2-Risk:** Mid-conversation regression — once CLAUDE.md no longer contains "Orchestrator Dispatch Convention" prose, the conversational agent must reliably read the SessionStart banner AND the new R3 always-on rule to find dispatch syntax. EPIC-026 §3 acknowledges this is contractual, not auto-magical. Mitigation: R3's always-on rule + STORY-026-01 R1's banner emit are the joint contract. Smoke-test in §2.2 by inspecting one full Task() spawn after the prune.
- **R6-Risk:** Mirror divergence. Pre-existing differences between live and canonical CLAUDE.md may exist outside the prune surface; if M2.1 reconciles them as a side effect, the diff balloons and review becomes hard. Mitigation: per FLASHCARD policy, only the prune surface + R3 insertion are touched. `git diff` should show ONLY those regions; anything else surfaces as a flag for the human reviewer.

## 2. The Truth (Acceptance Criteria)

### 2.1 Gherkin Scenarios

```gherkin
Feature: CLAUDE.md prune preserves halt rules and adds skill-load contract

  Scenario: Halt rules survive the prune
    Given STORY-026-02 has shipped
    When grepping CLAUDE.md and cleargate-planning/CLAUDE.md
    Then both files contain a paragraph about Gate 4 close ack ("--assume-ack" or "human ack")
    And both files contain the triage-first-draft-second rule
    And both files contain the Brief-is-the-universal-pre-push-handshake rule
    And both files contain the halt-at-gates rule
    And both files contain the State-aware surface paragraph

  Scenario: Skill pointer added
    Given STORY-026-02 has shipped
    When grepping CLAUDE.md and cleargate-planning/CLAUDE.md
    Then both files contain a one-line pointer naming ".claude/skills/sprint-execution/SKILL.md"
    And both files contain a rule mentioning "Skill tool" and "SessionStart banner" together

  Scenario: Duplicate content removed
    Given STORY-026-02 has shipped
    When grepping CLAUDE.md and cleargate-planning/CLAUDE.md
    Then NO match is found for "Orchestrator Dispatch Convention" header
    And NO match is found for "Architect runs twice per sprint"
    And NO match is found for "Sprint Execution Gate." paragraph header (the standalone CLAUDE.md version, not the skill's)
    But matches ARE found in .claude/skills/sprint-execution/SKILL.md for those phrases

  Scenario: Net line-count reduction meets the threshold
    Given the pre-prune CLAUDE.md SHA recorded at story start
    When STORY-026-02 has shipped
    Then `wc -l CLAUDE.md` returns at least 60 lines fewer than pre-prune
    And `wc -l cleargate-planning/CLAUDE.md` returns at least 60 lines fewer than pre-prune

  Scenario: Mirror parity holds
    Given STORY-026-02 has shipped
    When diffing the two CLAUDE.md files via the established mirror-parity check
    Then no NEW divergences exist beyond what was pre-existing before this story
```

### 2.2 Manual Verification Steps

1. **Diff inspection.** `git show HEAD -- CLAUDE.md cleargate-planning/CLAUDE.md` — only the prune surface (orchestration block) + R3 insertion are touched. Anything else flags.
2. **Halt-rule grep audit.** `grep -E "(Gate 4|--assume-ack|Triage first|Brief is the universal|halt at gates|State-aware surface|Sprint mode|Boundary gates)" CLAUDE.md` returns ≥6 hits (each rule preserved). Same for `cleargate-planning/CLAUDE.md`.
3. **Pointer grep.** `grep -F ".claude/skills/sprint-execution/SKILL.md" CLAUDE.md` returns 1 (the new pointer) + any pre-existing references. Same for canonical.
4. **Line-count delta.** `wc -l CLAUDE.md` returns ≥60 lines less than pre-prune. Same for canonical.
5. **Smoke conversational turn.** After the prune lands, open a fresh Claude Code session and ask the orchestrator to dispatch a synthetic Task — verify it reads the new R3 rule, reads the SessionStart banner, and invokes `Skill(sprint-execution)` before the Task() call. Pasted log evidence in the dev report.

## 3. Implementation Guide

### 3.1 Files to Modify

- `CLAUDE.md` (live) — prune the orchestration block per R1; insert R2 pointer + R3 always-on rule.
- `cleargate-planning/CLAUDE.md` (canonical, within `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->`) — identical prune + insertions.

### 3.2 Technical Logic

**Pre-prune SHA capture (commit step 1):**
```bash
git rev-parse HEAD:CLAUDE.md > /tmp/pre-prune-live.sha
git rev-parse HEAD:cleargate-planning/CLAUDE.md > /tmp/pre-prune-canonical.sha
wc -l CLAUDE.md cleargate-planning/CLAUDE.md > /tmp/pre-prune-counts.txt
```

**Prune list (per file):**
- "Agent orchestration" header + bullet block ("When running a sprint, spawn via the `Agent` tool with `subagent_type`: …" through "Full role contracts in `.claude/agents/*.md`. Communication model: …")
- The standalone "Orchestrator Dispatch Convention" paragraph inside the CLEARGATE-block.
- The "Architect runs twice per sprint" paragraph.
- The "Sprint Execution Gate" paragraph (the always-on description; the skill's preflight invocation contract supersedes).
- The "Sprint close is Gate-4-class (CR-019)" paragraph (collapsed to a single bullet under the new pointer; see R4 — the Gate-4-class halt rule survives, but the long description moves to the skill).
- "Boundary gates (CR-017)" paragraph — KEEP per R5.
- "Sprint mode" v1/v2 paragraph — KEEP per R5.
- All "Drafting work items" + "Initiative Intake" + "Brief is the universal pre-push handshake" + halt-rule paragraphs — KEEP.

**R2 + R3 insertions (one block, after the "Triage first, draft second" paragraph):**

```markdown
**Sprint execution.** When a sprint is active, the orchestration playbook lives at `.claude/skills/sprint-execution/SKILL.md` — load it before dispatching any execution agent (Architect / Developer / QA / Reporter). The skill is the canonical four-agent-loop spec; the always-on CLAUDE.md keeps only the halt-rules and the load-skill contract.

**Skill auto-load directive.** When the SessionStart banner emits `Load skill: <name>`, invoke the Skill tool to load it before continuing. Claude Code's description-match auto-load is advisory; this rule is the contract.
```

**Post-prune verification (commit step 2):**

```bash
diff <(wc -l CLAUDE.md cleargate-planning/CLAUDE.md) /tmp/pre-prune-counts.txt
# Expect: each file's count drops by ≥60.
```

### 3.3 API Contract

No code surfaces touched. Documentation-only edit. Mirror-parity invariant holds via per-edit canonical sync.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

- **Documentation tests are by-grep.** Add a CI-equivalent grep assertion under `cleargate-cli/test/scaffold/` (or extend an existing CLAUDE.md scaffold-lint test):
  - Asserts the new pointer line `.claude/skills/sprint-execution/SKILL.md` exists in `cleargate-planning/CLAUDE.md`.
  - Asserts the always-on R3 rule with both `Skill tool` and `SessionStart banner` substrings exists.
  - Asserts the legacy "Orchestrator Dispatch Convention" header is ABSENT.
  - Asserts the legacy "Architect runs twice per sprint" header is ABSENT.
- **Test count enforcement:** ≥4 new grep assertions in one test file. DoD §4.1 test counts ENFORCED.

### 4.2 Definition of Done

- [ ] `git diff CLAUDE.md cleargate-planning/CLAUDE.md` shows ONLY the prune surface + R2/R3 insertions; no incidental edits.
- [ ] Halt-rule grep audit (§2.2 step 2) passes — ≥6 hits.
- [ ] Pointer grep (§2.2 step 3) passes — exactly 1 new pointer per file.
- [ ] Line-count delta (§2.2 step 4) — each file ≥60 lines fewer than pre-prune.
- [ ] Mirror parity: live and canonical CLAUDE.md only diverge by pre-existing differences (verified by capturing diff baseline before the story).
- [ ] Smoke conversational-turn test (§2.2 step 5) executed; log pasted into dev report.
- [ ] `npm run typecheck` clean for `cleargate-cli/`. (Should be unaffected — no code change — verify regardless.)
- [ ] `npm test` green for `cleargate-cli/` — new grep assertions pass.
- [ ] One commit `feat(EPIC-026): STORY-026-02 prune CLAUDE.md to single-source skill pointer`.
- [ ] Pre-commit hook clean (no `--no-verify`).

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this story extends.

- **Surface:** Live `CLAUDE.md` prose at L98–L159 (bounded block) — the prune target
- **Surface:** `cleargate-planning/CLAUDE.md` L7–L68 — canonical mirror of the bounded block
- **Coverage of this story's scope:** Pure delete-from-existing, no new surface introduced

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this:** Comment-out the obsolete blocks in CLAUDE.md.
- **Why isn't extension / parameterization / config sufficient?** HTML comments still ship in the bounded block injected by `cleargate init`; downstream users of `cleargate init` would receive the commented-out prose in their own CLAUDE.md. Hard deletion from the canonical is required so the injected block is clean.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Wave 2 Dispatch (after STORY-026-01 + CR-026 + BUG-025 land)**

Requirements satisfied:
- [x] §1 spec articulates user story, R1–R7 requirements, scope boundaries, risks.
- [x] §2 Gherkin covers 5 scenarios across two coherent clusters (halt-rule preservation + prune surface validation).
- [x] §3 implementation guide cites exact files, prune list, code blocks for the inserted bullets.
- [x] §4 test count ≥4 enforced; DoD checklist concrete.
- [x] All v2 decomposition signals set in frontmatter (parallel_eligible=n — Wave 2 sequential dependency on STORY-026-01).
- [x] Mirror-parity invariant flagged in §1 R6 + §3 (FLASHCARD `2026-05-01 #mirror #parity`).
