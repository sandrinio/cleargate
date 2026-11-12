---
cr_id: CR-130
parent_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
context_source: "Filed 2026-11-12 as the follow-up to STORY-063-08 §1.4 Q2 (owner approved the M2 recommendations: bug wiki pages show 'Evidence' in the root-cause slot now; a follow-up CR adds a root-cause heading to the Bug template). Grounded against cleargate-cli main (Bug.md, readiness-gates.md, gate-section-index-pinning tests, QA/skill dispatch text) and the bug corpus on 2026-11-12. Filed for triage, not approved."
area: templates,readiness-gates
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:30:39Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-130
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:30:38Z
  sessions: []
---

# CR-130: The Bug Template Gets a Root Cause Section

## 0.5 Open Questions

- **Question (Q1):** Should a readiness predicate require the section before `ready-for-fix`?
- **Recommended:** No predicate in this CR. Bugs are often filed before diagnosis, and the fix itself is frequently where the cause is found. The section takes one of three explicit states — `Known:`, `Suspected:` or `Unknown — found during the fix` — and the wiki shows whichever is written. A predicate can follow once real bugs show whether `Unknown` gets abused.
- **Human decision:** {populated during triage}

- **Question (Q2):** Numbered (`## 4. Root Cause`, renumbering Execution Sandbox and Verification) or unnumbered?
- **Recommended:** Unnumbered, `## Root Cause`, placed between `## 3. Evidence & Context` and `## 4. Execution Sandbox`. Renumbering would turn "Bug §5" into §6 in four dispatch texts (both sprint-execution skills, `qa.md`, `qa.toml`). Every already-filed bug would also disagree with the new numbers. Unnumbered sections already exist in this template (`## Task Breakdown`, `## Prior work`).
- **Human decision:** {populated during triage}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The Bug template (`Anomaly → Reproduction → Evidence & Context → Execution Sandbox → Verification`) has no place for *why* the bug happens. Authors who know write it ad hoc: 21 of 106 bug files mention a root cause in prose, and only 1 uses a heading (corpus check, 2026-11-12). Tools cannot find it, so the EPIC-063 wiki page (STORY-063-08) falls back to showing "Evidence" in the root-cause slot.

**New Logic (The New Truth):**
- `Bug.md` gains an unnumbered `## Root Cause` section between `## 3. Evidence & Context` and `## 4. Execution Sandbox`. Its first line is one of `Known:`, `Suspected:` or `Unknown — found during the fix`, followed by one paragraph citing `file:line` where known.
- The wiki extractor (STORY-063-08) reads `## Root Cause` when present and keeps the "Evidence" fallback for older bugs.
- No new predicate (§0.5 Q1). The section is positioned after the only positional bug check (`section(2)`, reproduction steps), so no existing gate result changes.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Epic: none reverted. [[EPIC-063]] is the parent; STORY-063-08 ships first with the fallback and reads the new heading once it exists.
- [x] Invalidate/Update Story: none. Existing bugs keep their structure, and `repro-steps-deterministic` (`section(2)`) still resolves to `## 2. Reproduction Protocol`.
- [x] Database schema impacts? No.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/Bug.md:78` (`## 1. The Anomaly`), `:83` (`## 2. Reproduction Protocol`), `:90` (`## 3. Evidence & Context`), `:97` (`## 4. Execution Sandbox`), `:111` (`## 5. Verification Protocol`). The new section goes between `:90` and `:97`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/knowledge/readiness-gates.md:248-267`. The bug `ready-for-fix` gate; its only positional check is `section(2)` (`repro-steps-deterministic`).
- **Surface:** `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`. Pins every `section(N)` criterion to its heading; it must still pass unchanged.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/qa.md:42`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/qa.toml:39` and `cleargate-cli/scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:359`, `:457`. Dispatch text that cites "Bug §5", which is why the new section is unnumbered.
- **Why this CR extends rather than rebuilds:** one section is added to an existing template; no predicate, parser or gate changes.

## Prior work

- [[CR-111]] — Declare test layers at planning (archived). Last structural change to `Bug.md`'s verification section; unaffected here.
- [[BUG-054]] — Gate criteria pass on unedited templates (Draft). Not triggered, since this CR adds no criterion.
- [[EPIC-063]] — parent; STORY-063-08's bug extraction is the consumer.
- `.cleargate/FLASHCARD.md` grep for `root.cause`: none found.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/scaffold/core/.cleargate/templates/Bug.md`
- `cleargate-cli/test/docs/bug-template-root-cause.node.test.ts` (new)

## Task Breakdown

- [ ] Red docs test: `Bug.md` has `## Root Cause` between Evidence & Context and Execution Sandbox, with the three state prompts; `section(2)` still resolves to Reproduction Protocol.
- [ ] Add the section to `Bug.md`.
- [ ] Run `gate-section-index-pinning.node.test.ts` and a before/after `gate check` sweep over all 106 bugs: no changed results.
- [ ] Clean-room run: `cleargate new bug` shows the section.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`, then the clean-room run in `.cleargate/knowledge/clean-room-verification.md`.

**How we test this:**
- **What "working" means:** a newly created bug asks for its root cause in a fixed place, the wiki page shows it, and no existing bug's gate result changes.
- **Unit:** the docs test on `Bug.md`'s section order and prompts.
- **Regression:** the pinning test unchanged, plus a before/after `gate check` sweep over all bugs with zero changed results.
- **Real host:** a clean-room install, where `cleargate new bug` shows the section. Once STORY-063-08 is in, ingest a bug with `Known: …` and read its wiki page.
- **Regression guard:** the docs test stays in `npm test`.

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | New bug with the section; legacy bug without it. |
| Interfaces | F | One surface, the template; the wiki reader is STORY-063-08's scope. |
| Data | F | One section shape; the three states are prompt text, not branching behaviour here. |
| Rules | T | Placement rule: positional `section(2)` must not move. |

```gherkin
Feature: Bug template root cause section

  @paths
  Scenario: A new bug has a Root Cause section in the right place
    Given a bug created with `cleargate new bug`
    Then it contains "## Root Cause" after "## 3. Evidence & Context" and before "## 4. Execution Sandbox"
    And the section prompts for Known, Suspected or Unknown

  @rules
  Scenario: Positional gate checks do not move
    Given the updated Bug template and the 106 existing bugs
    When gate-section-index-pinning and a gate check sweep run
    Then section(2) still resolves to "## 2. Reproduction Protocol"
    And no existing bug's gate result changes

  @paths
  Scenario: Error — a legacy bug without the section still passes its gate
    Given a bug filed before this CR with no Root Cause section
    When `cleargate gate check` runs
    Then no criterion fails because the section is missing
```

**Test layers.** Declare all three below. `0` is a valid, explicit answer and must carry a reason in the Notes column; an absent row is not a decision.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | Docs test on section order and prompts. |
| Integration tests | 1 | Before/after gate sweep over all bugs plus the existing pinning suite. |
| E2E / acceptance tests | 1 | Clean-room `cleargate new bug` shows the section. |

---

## Context Source

**context_source:** STORY-063-08 §1.4 Q2 follow-up, filed 2026-11-12. Grounded in `Bug.md`, `readiness-gates.md`, the pinning tests, the QA/skill dispatch text and a corpus count on 2026-11-12.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
