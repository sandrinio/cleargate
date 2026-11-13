<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
Task Breakdown: one `- [ ] <action>` row per executable step, in execution order. REQUIRED at L3 and above, optional at L2, omit the section entirely at L1. An absent section passes the gate; a present-but-empty one fails. Task Breakdown rows implement the Gherkin scenarios in §5; no row is written for an axis marked F.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it. §5 also carries a SPIDR coverage table (axes: Paths, Interfaces, Data, Rules) above a Gherkin block. Paths = more than one *successful* way through (the baseline error scenario is not a path). Interfaces = more than one surface exposes the behaviour (CLI / API / UI / hook). Data = behaviour differs by data type, shape or volume — usually a Scenario Outline with Examples. Rules = a business rule constrains the outcome — one scenario per rule, including breaking it. Tag each covered scenario with the matching `@paths` / `@interfaces` / `@data` / `@rules` marker directly above `Scenario:` / `Scenario Outline:`. There is no Spike row: open discovery is chartered as a SPIKE item before this Bug is written.
Output location: .cleargate/delivery/pending-sync/BUG-123_decisions-miss-question-forms-and-brief-line-garbled.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work    ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary        ← §1 The Anomaly (repro)
  - Open Questions ← ### Open Questions
  - Edge Cases     ← §2 Reproduction Protocol (edge conditions)
  - SPIDR          ← §5 Verification Protocol (SPIDR coverage table)
  - Risks          ← §4 Execution Sandbox (suspected blast radius)
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
bug_id: BUG-123
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: wiki,decisions,session-brief
status: Triaged
severity: P2-Medium
reporter: orchestrator (field upgrade test 0.28.0 → 0.30.0 in a Go target repo, 2026-11-13)
approved: true
approved_by: "sandrinio (2026-11-13: 'i want you to fix them all and make a new release')"
approved_at: 2026-11-13T00:00:00Z
context_source: "Field upgrade test 2026-11-13: the target repo's first 0.30.0 brief and wiki/decisions.md, checked line by line against its raw items; code grounding at cli main b9fe36a: src/wiki/extract-sections.ts:187 QUESTION_RE (matches **Question:** and **AI Question…**, not **Question N:**), src/wiki/synthesis/decisions.ts:123-124 (newest first by day, ties by id ascending), :137-146 latestDecisions (answers only, no dedupe), src/wiki/synthesis/session-brief.ts:275 excerpt (first 12 words, no ellipsis) and :376 join with '; '"
created_at: 2026-11-13T00:00:00Z
updated_at: 2026-11-13T00:00:00Z
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
  last_gate_check: 2026-11-12T21:56:55Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "05ac872470f9ed77b9bb578db598f1e89a4082b4046104d4fa8c5d74dfaf8604"
---

# BUG-123: The decisions page misses a common question form, and the brief's Decisions line repeats, cuts and orders entries badly

### Open Questions

- **Question:** What should one entry on the brief's Decisions line show?
- **Recommended:** What was decided, not only the answer. When the answer just accepts the recommendation ("Accepted the recommendation", "agreed", "✅ accepted as Recommended"), show an excerpt of the recommendation instead. Entries that render identically are shown once. An excerpt that is cut ends in `…`, and a trailing full stop is dropped before the `; ` join.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** How are the "latest five" chosen among items answered on the same day?
- **Recommended:** Newest first by the item's `updated_at` timestamp, not by day, with ties broken by id descending, so the newest items come first.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

- **Question:** Should the decisions page parse free-form answer records (a numbered list such as `1. **TLS:** on the upload listener…` under "All five questions answered by the owner")?
- **Recommended:** No. `wiki lint` warns when an Open Questions or AI Interrogation Loop section has text but no recognised question/answer pair, naming the item and the expected form. Parsing free prose would guess.
- **Human decision:** Recommended option accepted (sandrinio 2026-11-13: "i want you to fix them all and make a new release").

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** `wiki/decisions.md` lists every answered question with its question text, and the brief's `Decisions:` line shows the five most recent decisions as five distinct, readable statements.

**Actual Behavior:** In the field repo's first 0.30.0 brief:
```
Decisions: ⟦STORY-001-01⟧ Changed (owner, 2026-11-12). The workflow keeps its jobs, but its only trigger; ⟦STORY-001-02⟧ Accepted the recommendation (owner, 2026-11-12).; ⟦STORY-001-02⟧ Accepted the recommendation (owner, 2026-11-12).; ⟦STORY-001-03⟧ Accepted the recommendation (owner, 2026-11-12).; ⟦STORY-001-04⟧ Accepted the recommendation (owner, 2026-11-12).
```
- `STORY-001-02` appears twice with identical text. Four of five entries say only "Accepted the recommendation", so the reader learns nothing (`latestDecisions` returns answers only, with no dedupe).
- The first entry stops mid-sentence ("but its only trigger"): `excerpt` keeps 12 words and adds no `…`.
- `.;` doubled punctuation: the answer's full stop is kept before the `; ` join.
- Everything was answered on 2026-11-12. Ties sort by id ascending, so the "latest five" are the oldest stories, and the newest work (`EPIC-002`, `SPRINT-02`'s stories) is not shown.
- `wiki/decisions.md` renders three `STORY-001-06` entries (and `STORY-001-08`'s) as `Q: (no question text)`. Those stories write `- **Question 1:** …`, `- **Recommended:** …`, `- **Human decision:** …`, and `QUESTION_RE` (`extract-sections.ts:187`) accepts `**Question:**` but not `**Question N:**`.
- `EPIC-002`'s five owner answers appear nowhere. They are written as a numbered list under "All five questions answered by the owner on 2026-11-12", which is not a recognised form (see the third question).

## 2. Reproduction Protocol
1. A corpus with: one item using `- **Question 1:**` / `- **Recommended:**` / `- **Human decision:** Accepted the recommendation (owner, 2026-11-12).`; one item with two questions answered with identical text; one answer longer than 12 words; five items all dated 2026-11-12.
2. `cleargate wiki build`.
3. Read `wiki/decisions.md` and the `Decisions:` line of `wiki/brief.md`.

Edge conditions:
- A `**Question:**` item (no number) keeps rendering as today.
- An orphan Human decision with no question still renders `(no question text)` ([[STORY-063-10]]'s Gherkin).
- An answer of 12 words or fewer is not given a `…`.

## 3. Evidence & Context
*(Field-repo output: its `[[ID]]` wikilinks are shown as `⟦ID⟧` so this repo's wiki does not link them to its own unrelated items with the same IDs.)*
Field `wiki/decisions.md`:
```
### ⟦STORY-001-06⟧ — The hub stores and answers (2026-11-12)
- Q: (no question text) → Accepted the recommendation (owner, 2026-11-12).
- Q: (no question text) → Accepted the recommendation (owner, 2026-11-12).
- Q: (no question text) → Accepted the recommendation (owner, 2026-11-12).
```
Raw `STORY-001-06`:
```
- **Question 1:** Who applies the network file to the database: `owl-hub serve` at start-up, or a
  separate command?
- **Recommended:** `owl-hub serve --network <file>` applies it with `store.ApplyNetwork` at start-up …
```
Code: `QUESTION_RE = /^\s*[-*+]\s+\*\*(?:AI Question[^*]*?|Question):?\*\*:?\s*(.*)$/i`. `out.sort(… a.date === b.date ? byCOrder(a.item.id, b.item.id) …)`. `excerpt = … .slice(0, 12).join(' ')`.

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/src/wiki/extract-sections.ts` `QUESTION_RE` (accept `**Question N:**`).
- `cleargate-cli/src/wiki/synthesis/decisions.ts` `collect` ordering and `latestDecisions` (carry the recommendation, dedupe).
- `cleargate-cli/src/wiki/synthesis/session-brief.ts` `excerpt` and the Decisions section render.
- `cleargate-cli/src/commands/wiki-lint.ts` (or the lint module): the unrecognised-section warning.
- `cleargate-cli/scripts/brief-oracle.sh` if the decisions fact shape changes ([[STORY-063-12]]'s oracle must keep agreeing).

**Do NOT modify:** the 1,500-token brief cap; the supersession rules.

## Task Breakdown
- [ ] QA-Red: the scenarios below.
- [ ] `QUESTION_RE` numbered form; recommendation carry-through; dedupe; ellipsis and punctuation; ordering.
- [ ] Lint warning for unrecognised question sections.
- [ ] Brief oracle parity; typecheck; wiki and brief tests.

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/wiki/decisions-forms-and-brief-line.red.node.test.ts`

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | one build path |
| Interfaces | T | `wiki/decisions.md`, the brief line and `wiki lint` |
| Data | T | question forms, answer lengths, same-day dates |
| Rules | T | the line shows five distinct decisions, newest first |

```gherkin
Feature: Decisions read as decisions

  @data
  Scenario Outline: Question forms are recognised
    Given an item whose question is written as "<form>"
    When cleargate wiki build runs
    Then wiki/decisions.md shows the question text, not "(no question text)"

    Examples:
      | form                    |
      | - **Question:** …       |
      | - **Question 1:** …     |

  @rules
  Scenario: An accepted recommendation shows what was accepted
    Given a pair whose Human decision is "Accepted the recommendation (owner, 2026-11-12)."
    When the brief is built
    Then its Decisions entry shows an excerpt of the Recommended text

  @rules
  Scenario: Identical entries are shown once
    Given one item with two questions answered with the same text
    When the brief is built
    Then the Decisions line names that item's answer once

  @data
  Scenario: A cut excerpt says so
    Given an answer of 30 words
    When the brief is built
    Then its entry ends in "…" and no entry ends in ".;"

  @rules
  Scenario: Same-day ties put the newest item first
    Given five items answered on 2026-11-12 with different updated_at times
    When the brief is built
    Then the Decisions line lists them newest updated_at first

  @interfaces
  Scenario: An unrecognised answer record is flagged
    Given an epic whose Open Questions section holds only a numbered list of answers
    When cleargate wiki lint runs
    Then it warns naming the epic and the expected - **Question:** form
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | one per scenario row |
| Integration tests | 1 | `brief-oracle.sh` agrees with the new brief on a fixture corpus |
| E2E / acceptance tests | 0 | the next field brief |

---

## Prior work

- [[STORY-063-10]] (Completed, 0.30.0): the decisions page; recognises `- **Question:**` pairs only.
- [[STORY-063-11]] (Completed, 0.30.0): the brief's Decisions line, the five newest from `latestDecisions`, no dedupe rule.
- [[STORY-063-12]] (Completed, 0.30.0): the brief oracle that must keep agreeing.

## Context Source

**context_source:** field upgrade test 2026-11-13 (the target repo's first 0.30.0 brief and decisions page); code grounding at cli main `b9fe36a`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
