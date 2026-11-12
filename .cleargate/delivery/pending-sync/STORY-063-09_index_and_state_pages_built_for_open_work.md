---
story_id: STORY-063-09
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 story 063-09; grounded against cleargate-cli main 2026-11-12
actor: Orchestrator agent (and the cleargate-wiki-query subagent)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: wiki,cleargate-cli,orientation
db_write_set: []
deferred_verification: []
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:33:53Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-11-11T23:02:51Z
  sessions:
    - session: 72e522d7-caa6-4837-81f5-8fa60f84f8b5
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-11T22:59:59Z
---

# STORY-063-09: Index and State Pages Built for Open Work
**Complexity:** L2 — rewrite the open section of `buildIndex` and two synthesis compilers; known pattern, about 6 source files.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator, and as the `cleargate-wiki-query` subagent running a duplicate check, I want `wiki/index.md` to list every open item with a short digest under its epic, and the state pages to count open work, so that "is this already planned?" and "what is open?" are answered from one page of at most 4,000 tokens instead of 300 raw files.

### 1.2 Detailed Requirements
- **R1 — One line per open item.** An item is open when its `status` is not in `TERMINAL_STATUSES` (`cleargate-cli/src/wiki/page-schema.ts:164`). Each open item appears exactly once, as `- [[ID]] — <status> · <sprint_cleargate_id or "no sprint"> — <title> — <digest>`.
  - The digest is the first ≤ 12 words of the objective or symptom that STORY-063-08 extracts (objective for epic, CR, proposal and initiative; sprint goal for sprints; symptom for bugs).
  - When 08 extracted nothing, the line ends at the title with no trailing separator.
- **R2 — Grouping.** Section order:
  1. Sprints.
  2. Epics. Each open epic is followed by its open CRs and bugs, indented one level, using the computed parent from STORY-063-13.
  3. Proposals and initiatives.
  4. CRs and bugs with no open parent epic, grouped by their `area:` value.
  5. "Unparented", for items with neither a parent nor an area.
  A CR or bug whose parent epic is terminal is listed under its area (or Unparented), never under the archived epic.
- **R3 — Archive unchanged.** Archived items stay as per-bucket counts with expand links (`cleargate-cli/src/wiki/page-schema.ts:540-545`).
- **R4 — Budget and compaction.** The index targets ≤ 4,000 tokens (`Math.round(bytes / 4)`, the existing heuristic at `cleargate-cli/src/wiki/lint-checks.ts:476,495`).
  - When a full build would exceed the target, the builder applies compaction tiers in order until it fits:
    - **Tier 1:** drop digests from nested CRs and bugs.
    - **Tier 2:** drop all digests.
    - **Tier 3:** render nested CRs and bugs as an ID list under their epic or area.
  - A compacted index carries one header line naming the tier used.
  - Every open ID always appears, whatever the tier.
- **R5 — Lint.** A new `index-budget-target` check prints a `warn:` line (not counted as a finding, so it never fails lint) when `index.md` exceeds `wiki.index_token_target` (new config key, default 4000, in `cleargate-cli/src/lib/wiki-config.ts`). The existing `index-budget` failure at `wiki.index_token_ceiling` (8,000, EPIC-015) is unchanged.
- **R6 — product-state.md counts open work.** `isActive` (`cleargate-cli/src/wiki/synthesis/product-state.ts:12,26-33`) counts only `Active`, `In Progress` and 🟢-prefixed statuses. It is replaced by "open = not terminal":
  - The summary table columns become Total | Open | Shipped.
  - "Active Epics" becomes "Open Epics".
  - Shipped stays "raw path under `archive/`".
- **R7 — open-gates.md covers every type.** Today Gate 1 lists proposals only (`cleargate-cli/src/wiki/synthesis/open-gates.ts:24-31`).
  - New rule: Gate 1 lists every open item of every ingested type with `approved` not `true`, each with the ids in its `cached_gate_result.failing_criteria`, or "gate not run" when `pass` is null. Sorted by type, then ID.
  - Gate 2 and Gate 3 are unchanged.
- **R8 — Parity.** `wiki build` and `wiki ingest` keep producing the same index through the shared `buildIndex` (CR-103; existing test `cleargate-cli/test/wiki/build-ingest-parity.node.test.ts`).

### 1.3 Out of Scope
- Section extraction (STORY-063-08) and computed relations (STORY-063-13). Both are inputs to this story.
- The decisions page (063-10) and the session brief (063-11).
- Trimming `product-state.md`'s all-time shipped list.
- `roadmap.md`.
- Changing EPIC-015's 8,000-token ceiling.
- Per-story wiki pages.

### 1.4 Open Questions

- **Question:** EPIC-063 asks for ≤ 4,000 tokens on a corpus twice today's size. With digests, today's 87 open rows come to about 3,600 tokens, so a doubled corpus cannot fit without dropping detail. Is the R4 compaction order acceptable? It drops nested digests first, then all digests, then lists nested bugs and CRs as bare IDs.
- **Recommended:** Yes. It follows EPIC-015's collapse precedent, it never hides an open ID, and the duplicate-check subagent can open the epic page for the detail. The 1× corpus is expected to fit at Tier 0.
- **Human decision:** Owner approved 2026-11-12: compaction in tiers (nested digests first, then all digests, then nested bugs and CRs as bare IDs), never dropping an open ID. 4,000 tokens is a lint warning; EPIC-015's 8,000 stays the failure ceiling. This is R4 and R5, covered by the second and third scenarios.

### 1.5 Risks

- **Risk:** Digest quality depends on 08's extraction. A bad extract turns into 12 noisy words on every line.
- **Mitigation:** The digest takes only the first sentence of the extracted objective or symptom, truncated at 12 words. The golden test in 08 covers the extract itself.
- **Risk:** Gate 1 in `open-gates.md` grows from 3 proposals to about 80 items.
- **Mitigation:** `open-gates.md` is read on demand, not loaded at session start. The brief (063-11) shows counts and the top 5.
- **Risk:** The corpus keeps growing past 2× and Tier 3 stops fitting.
- **Mitigation:** The R5 warning makes this visible, and the 8,000 failure ceiling still guards the hard limit.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Full index vs compacted index are two successful routes. |
| Interfaces | T | `wiki build`, `wiki ingest` and `wiki lint` all touch the index; state pages are separate outputs. |
| Data | T | Corpus at 1× vs 2×; items with or without parent, area and digest. |
| Rules | T | Terminal-status rule, budget target vs ceiling rule, Gate 1 approval rule. |

```gherkin
Feature: Index and state pages built for open work

  @paths @interfaces
  Scenario: Open items are listed once, with a digest, under their epic
    Given a corpus with open EPIC-A, open BUG-1 and CR-2 whose parent is EPIC-A, and open BUG-3 with area "wiki" and no parent
    When `cleargate wiki build` runs
    Then index.md lists EPIC-A with BUG-1 and CR-2 indented beneath it
    And BUG-3 is listed under the "wiki" area group
    And every line reads "- [[ID]] — status · sprint — title — digest"
    And no open item appears twice
    And running `cleargate wiki ingest` on BUG-1 afterwards leaves index.md byte-identical

  @data @paths
  Scenario Outline: The index stays within its token target as the corpus grows
    Given a synthetic corpus shaped like today's (338 items; 87 open: 48 bugs, 12 CRs, 15 epics, 6 proposals, 5 sprints, 1 initiative) scaled <scale>
    When the wiki is built
    Then index.md is at most 4,000 tokens, measured as Math.round(bytes / 4)
    And every open item ID appears in index.md
    And the compaction header line is <header>

    Examples:
      | scale | header                           |
      | 1x    | absent                           |
      | 2x    | present, naming the tier applied |

  @rules
  Scenario: Lint warns above the target and fails only above the ceiling
    Given index.md at 4,500 tokens
    When `cleargate wiki lint` runs
    Then it prints a "warn: index-budget-target" line
    And the index-budget-target warning is not counted as a finding
    And at 8,500 tokens the existing index-budget finding is reported as before

  @rules @interfaces
  Scenario: State pages count open work and every type waiting at Gate 1
    Given 15 non-terminal epics, none with status "Active"
    And Draft BUG-9 with approved false and failing criterion "repro-steps-deterministic"
    When the wiki is built
    Then product-state.md reports 15 open epics
    And open-gates.md lists BUG-9 under Gate 1 with "repro-steps-deterministic"
    And an open item whose gate has never run is listed with "gate not run"

  Scenario: Error — items with nothing to group by or no digest still render cleanly
    Given an open CR with no parent and no area
    And an open bug for which no symptom was extracted
    When the wiki is built
    Then the CR is listed under "Unparented"
    And the bug's line ends at its title with no trailing " — "
```

### 2.2 Verification Steps (Manual)
- [ ] Dogfood in the meta-repo after 0.30.0: `cleargate wiki build`, then `cleargate wiki lint`. Record the index token count; no `warn: index-budget-target` line at today's corpus size.
- [ ] Spot-check that BUG-102..116 appear (nested under their epic or area) and that EPIC-063 has its CRs and bugs beneath it.
- [ ] Open `open-gates.md` and confirm epics, CRs and bugs waiting at Gate 1 are listed with their failing checks.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/wiki/page-schema.ts` |
| Related Files | `cleargate-cli/src/wiki/lint-checks.ts`, `cleargate-cli/src/commands/wiki-lint.ts`, `cleargate-cli/src/lib/wiki-config.ts`, `cleargate-cli/src/wiki/synthesis/product-state.ts`, `cleargate-cli/src/wiki/synthesis/open-gates.ts`, `cleargate-cli/templates/synthesis/product-state.md`, `cleargate-cli/templates/synthesis/open-gates.md`, `cleargate-cli/scaffold/core/.cleargate/config.example.yml`, `cleargate-cli/test/wiki/build-index-hierarchical.node.test.ts`, `cleargate-cli/test/wiki/lint-index-budget.node.test.ts`, `cleargate-cli/test/wiki/build-ingest-parity.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/test/wiki/index-open-work.node.test.ts`, `cleargate-cli/test/wiki/state-pages-open-work.node.test.ts`, `cleargate-cli/test/wiki/fixtures/corpus-shape.ts` (synthetic corpus generator at 1× and 2×) |

### 3.2 Technical Logic
- **Dependencies.** Depends on STORY-063-08 (extracted objective or symptom for the digest) and STORY-063-13 (computed `parent` for nesting), so `parallel_eligible: n`. STORY-063-11 consumes this story's open-item and Gate 1 logic.
- **`buildIndex` (`cleargate-cli/src/wiki/page-schema.ts:429`).**
  - Keep the header, code-map block and archive block.
  - Replace the flat active list with the R2 grouping, using the computed `parent` from STORY-063-13 and the extracted digest from STORY-063-08, both carried on `IndexItem`.
  - Render, measure with `Math.round(Buffer.byteLength(text) / 4)`, and if over `index_token_target`, re-render at the next compaction tier (R4).
  - Measure in-process; do not write and re-read the file.
- **Lint.** `checkIndexBudget` (`cleargate-cli/src/wiki/lint-checks.ts:487`) stays as the failure check. Add `checkIndexTarget` returning a warning string. `wiki-lint.ts` prints it as `warn: index-budget-target …` outside the findings count.
- **Config.** Add `index_token_target` beside `index_token_ceiling` in `wiki-config.ts`, defaulting to 4000. Document it in `config.example.yml` next to line 5.
- **product-state.** Replace `isActive` with `!TERMINAL_STATUSES.has(status)`; update the template headings.
- **open-gates.** Gate 1 filter: `!TERMINAL_STATUSES.has(status) && fm.approved !== true` across all buckets in `items`. Add a failing-criteria column read from `fm.cached_gate_result`.
- **Synthetic corpus generator.** Emits raw delivery files with realistic title and objective lengths, copied from length distributions measured on the real corpus (stated in the generator's header comment), so budget tests do not depend on the meta-repo corpus. The cli repo does not contain it.

### 3.3 API Contract (if applicable)

The index line format is a contract, read by the `cleargate-wiki-query` subagent and by STORY-063-12's oracle.

| Element | Format | Notes |
|---|---|---|
| Item line | `- [[ID]] — <status> · <sprint-or-"no sprint"> — <title>[ — <digest>]` | Digest ≤ 12 words, omitted when empty or at Tier ≥ 2 |
| Nested line | two-space indent + item line | Tier 1 drops the digest; Tier 3 collapses nested lines into one `  - IDs: BUG-1, CR-2, …` line |
| Compaction header | `> Compacted (tier N): <what was dropped>` | Absent at Tier 0 |

## Task Breakdown

- [ ] Add the synthetic corpus generator (1× and 2×) and red tests for R1–R8.
- [ ] Add `index_token_target` to `wiki-config.ts` and `config.example.yml`.
- [ ] Rewrite the open section of `buildIndex` with grouping and compaction tiers.
- [ ] Add the `index-budget-target` warning to lint.
- [ ] Switch product-state to open counts; update its template.
- [ ] Widen Gate 1 in open-gates to every type, with failing criteria; update its template.
- [ ] Update `build-index-hierarchical` and `lint-index-budget` tests; confirm `build-ingest-parity` still passes.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | One per R1–R7. R8 parity uses the existing parity test. EPIC-063 verification level: unit. |
| Integration tests | 0 | No real infrastructure involved; build and ingest run against a temporary fixture repo inside the unit suite. |
| E2E / acceptance tests | 1 | Dogfood in the meta-repo after 0.30.0 (§2.2). EPIC-063 verification level: dogfood. |
| Performance test | 2 | Index size at 1× and 2× synthetic corpus, measured with `Math.round(bytes / 4)` on the built `index.md`. Target ≤ 4,000 tokens. Baseline: 2,647 tokens today, titles only, 87 open rows. EPIC-063 verification level: unit. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:429` `buildIndex`. Shared by build and ingest since CR-103. It already splits active from archived via `TERMINAL_STATUSES` (`:164`) and renders archive counts (`:540-545`).
- **Surface:** `cleargate-cli/src/wiki/lint-checks.ts:487` `checkIndexBudget`, with the token heuristic at `:476` and `:495`.
- **Surface:** `cleargate-cli/src/wiki/synthesis/product-state.ts:26-33` `isActive`, the filter that produces "0 active epics".
- **Surface:** `cleargate-cli/src/wiki/synthesis/open-gates.ts:24-31`. The proposals-only Gate 1 filter.
- **Surface:** `cleargate-cli/src/lib/wiki-config.ts:40` `DEFAULT_INDEX_TOKEN_CEILING`. Home for the new target key.
- **Coverage of this requirement:** ≥ 80% extension. Every change edits an existing function or template; the only new code is the compaction loop and the test fixtures.

## Prior work

- [[EPIC-063]] — parent; this is story 063-09 (index and state pages).
- [[EPIC-015]] — Wiki Index Hygiene & Scale (Completed). Set the 8,000-token ceiling and the "collapse children under the parent" precedent R4 follows.
- [[CR-103]] — Wiki Page and Index Fidelity (archived). Made build and ingest share `buildIndex`; R8 keeps that parity.
- [[EPIC-024]] — AI Orientation Surface Slim (Completed). Orientation budgets this index feeds.
- Depends on STORY-063-08 for extracted digests and STORY-063-13 for computed parents.

## Why not simpler?

- **Smallest existing surface that could carry this:** `buildIndex` plus the two synthesis compilers, all already wired into build and ingest.
- **Why isn't extension / parameterization / config sufficient?** It is extension. A config switch can't fix the problem:
  - **Titles only:** too vague for duplicate checks.
  - **Flat list:** buries 15 epics under 60 bugs and CRs.
  - **State pages:** filter on a status value no epic carries.
  The compaction loop is the one new piece, and it exists only because the 2× budget cannot be met any other way without hiding open items.

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
