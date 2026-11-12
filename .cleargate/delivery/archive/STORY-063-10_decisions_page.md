---
story_id: STORY-063-10
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 story 063-10; grounded against cleargate-cli main 2026-11-12
actor: Orchestrator agent
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
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
  last_gate_check: 2026-11-11T23:33:54Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-10
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:30:58Z
  sessions: []
---

# STORY-063-10: Decisions Page
**Complexity:** L2 — one new synthesis compiler and template, wired into build and ingest the same way as the existing four.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator, I want one `wiki/decisions.md` page listing every decision the owner has made on a work item, every architecture rule of an open epic, and what each one supersedes, so that I don't reopen settled questions or propose designs that break a locked rule.

### 1.2 Detailed Requirements
- **R1 — Sources.** The compiler reads raw delivery items, including stories. It uses the unfiltered `scanRawItems` result (`cleargate-cli/src/wiki/scan.ts:34`), since callers apply `wiki.ingest_buckets` only afterwards. From those items it extracts:
  - Epic §6 pairs: `- **AI Question…:**` followed by `- **Human Answer:** <text>`.
  - CR §0.5, story §1.4 and bug pairs: `- **Question:**` followed by `- **Human decision:** <text>`.
  - Open (non-terminal) epics' `<architecture_rules><rule>…</rule>` lines.
- **R2 — Skip placeholders.** A decision is skipped when its answer is empty, starts with `Unresolved` (`cleargate-cli/scaffold/core/.cleargate/templates/epic.md:177`), or is the literal `{populated during Brief review}` (`CR.md:74`, `story.md:133`, `Bug.md:76`).
- **R3 — Date.** Each item's decisions are dated with `approved_at` when present, else `updated_at`. Items are listed newest first.
- **R4 — Supersedes.** When a decision, rule or item body says `supersede(s|d|ing)` followed by a work-item ID in the same sentence, the entry records `Supersedes [[ID]]`. Example: EPIC-063's "supersedes EPIC-020's 'no changes to stamp-and-gate.sh in v1'".
- **R5 — Unresolved conflicts.** Entries in `wiki/contradictions.md` with `label: null` are listed in an "Unresolved conflicts" section as draft vs neighbour plus claim. The entry shape is written by `commitPhase4Findings`, `cleargate-cli/src/lib/wiki/contradict.ts:159-173`.
- **R6 — Shape.**
  - One `### [[ID]] — <title> (<date>)` block per item.
  - Under it: `- Q: <question, ≤ 20 words> → <answer, ≤ 40 words>`, `- Rule: <rule>`, and `- Supersedes: [[ID]]` lines.
  - Longer texts are truncated with "…" plus a link to the item's page.
- **R7 — Wiring.**
  - `decisions` joins the synthesis page list (`cleargate-cli/src/commands/wiki-ingest.ts:578`), `writeSynthesisPage` (`:623`) and `BUCKET_SYNTHESIS_MAP` (`:565`) for every bucket that carries decisions: epics, crs, bugs, proposals, initiatives, sprints.
  - `wiki build` writes it beside the other synthesis pages (`cleargate-cli/src/commands/wiki-build.ts:205-208`).
  - Build and ingest output are identical.
- **R8 — Contract for the brief.** Export `latestDecisions(items, n)` returning the n newest entries `{ id, date, text, supersedes[] }`. STORY-063-11 consumes it for the brief's "latest decisions" line.
- **R9 — Size warning.** When `wiki/decisions.md` exceeds 8,000 tokens (`Math.round(bytes / 4)`), `cleargate wiki lint` prints a `warn: decisions-size` line that is not counted as a finding, so lint never fails on it.

### 1.3 Out of Scope
- Legacy decision formats that don't use the template markers. Only 5 epic answers use the canonical `**Human Answer:**` marker today; older free-form answers are not mined.
- Architecture rules of terminal (archived) epics. See §1.4.
- Labelling contradictions. That stays a human task.
- Showing decisions in the session brief (STORY-063-11).

### 1.4 Open Questions

- **Question:** How much history should the page hold? The corpus has about 280 answered `**Human decision:**` lines and 347 `<rule>` lines across all epics. All of it comes to roughly 25k tokens, too big to read in one go even on demand.
- **Recommended:** Include every answered decision from every item, since that history is what gets asked about. Include architecture rules only from non-terminal epics. Truncate per R6, and print a `warn:` line from `wiki lint` above 8,000 tokens (no failure). Older rules stay reachable through each epic's page (STORY-063-08).
- **Human decision:** Owner approved 2026-11-12: every answered decision from every item; architecture rules only from open epics; long entries cut with "…" and a link to the item's page (R6); a `warn:` line above 8,000 tokens, never a failure (R9).

### 1.5 Risks

- **Risk:** Story edits don't trigger ingest. `wiki ingest` exits at `cleargate-cli/src/commands/wiki-ingest.ts:157` for the excluded stories bucket, so a story's new decision appears only on the next ingest of any other item or on `wiki build`.
- **Mitigation:** Accepted lag. STORY-063-03's shell-path hook and normal drafting re-ingest something within the session. Stated in the page header.
- **Risk:** The supersede regex over-matches prose such as "this does not supersede EPIC-X".
- **Mitigation:** Skip sentences where `not` or `never` comes before `supersede`. The unit test includes that negative case.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Decisions found vs none found; with and without supersession. |
| Interfaces | T | `wiki build` and `wiki ingest` both produce the page; the brief consumes `latestDecisions`. |
| Data | T | Three marker shapes (epic Human Answer, CR/story/bug Human decision, epic rules). |
| Rules | T | Placeholder-skip rule; open-epics-only rule for architecture rules. |

```gherkin
Feature: Decisions page

  @paths @data
  Scenario: Answered decisions and open-epic rules are collected newest first
    Given EPIC-A (open, approved_at 2026-11-12) whose §6 has a Human Answer "Yes — two releases" and one architecture rule
    And CR-B (updated_at 2026-11-10) whose §0.5 has a Human decision "Not yet"
    And STORY-A-01 whose §1.4 has a Human decision "Use JSON"
    And archived EPIC-Z with architecture rules
    When `cleargate wiki build` runs
    Then wiki/decisions.md lists EPIC-A before CR-B
    And EPIC-A's block shows its question → "Yes — two releases" and its rule
    And STORY-A-01's decision is listed
    And EPIC-Z's rules are not listed
    And an answer longer than 40 words ends with "…" and a link to its item's page

  @rules
  Scenario Outline: Placeholder answers are skipped
    Given an item whose decision line reads <answer>
    When the wiki is built
    Then no entry is written for that question

    Examples:
      | answer                                                      |
      | "Unresolved — replace this entire line with the human's decision." |
      | "{populated during Brief review}"                           |
      | ""                                                          |

  @data
  Scenario: Supersession and unresolved conflicts are recorded
    Given EPIC-063's body says "This supersedes EPIC-020's 'no changes to stamp-and-gate.sh in v1'"
    And another item says "this does not supersede EPIC-030"
    And wiki/contradictions.md holds one entry with label: null
    When the wiki is built
    Then EPIC-063's block carries "Supersedes: [[EPIC-020]]"
    And no supersession is recorded against EPIC-030
    And the entry appears under "Unresolved conflicts"

  @interfaces
  Scenario: Ingest keeps the page current and identical to build
    Given a built wiki
    When an epic's Human Answer is edited and `cleargate wiki ingest` runs on it
    Then decisions.md shows the new answer
    And decisions.md is byte-identical to what `cleargate wiki build` produces
    And latestDecisions(items, 1) returns that answer
    And when decisions.md exceeds 8,000 tokens, `cleargate wiki lint` prints "warn: decisions-size" and does not count it as a finding

  Scenario: Error — malformed decision blocks do not break the page
    Given a Human decision line with no preceding Question line
    And a raw item whose frontmatter cannot be parsed
    When the wiki is built
    Then the orphan decision is listed with question "(no question text)"
    And the unparseable item is skipped with one warn line naming its path
    And decisions.md is still written
```

### 2.2 Verification Steps (Manual)
- [ ] Dogfood in the meta-repo after 0.30.0: `cleargate wiki build`; open `wiki/decisions.md`. Confirm EPIC-063's answers (Q1–Q3) and its supersession of EPIC-020 are listed, and record the token count.
- [ ] Confirm CR-126's two decisions appear once it is approved.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/wiki/synthesis/decisions.ts` |
| Related Files | `cleargate-cli/src/commands/wiki-ingest.ts`, `cleargate-cli/src/commands/wiki-build.ts`, `cleargate-cli/src/wiki/lint-checks.ts`, `cleargate-cli/src/commands/wiki-lint.ts`, `cleargate-cli/test/wiki/wiki-ingest-synthesis-parity.red.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/src/wiki/synthesis/decisions.ts`, `cleargate-cli/templates/synthesis/decisions.md`, `cleargate-cli/test/wiki/decisions-page.node.test.ts` |

### 3.2 Technical Logic
- **Compiler.** Follow `cleargate-cli/src/wiki/synthesis/product-state.ts`:
  - `compile(items, templateDir)` loads `decisions.md` from the tracked `cleargate-cli/templates/synthesis/` directory (resolved like `product-state.ts:81-85`) and renders through `render.ts`.
  - Use STORY-063-08's exported heading locator `findSection` to find §6, §0.5 and §1.4. Don't add a second section parser.
- **Dependencies.** Depends on STORY-063-08 (`findSection`), so `parallel_eligible: n`. It does not need STORY-063-13. STORY-063-11 consumes `latestDecisions`.
- **Pairing.** Walk the section's bullet lines in order. A question line opens a pair and the next answer line closes it. An answer with no open question becomes "(no question text)".
- **Input set.** The compiler needs stories. `recompileSynthesis` filters the scan by ingest buckets (`cleargate-cli/src/commands/wiki-ingest.ts:681-682`), and so does `wiki build` (`cleargate-cli/src/commands/wiki-build.ts:84-85`). Pass the decisions compiler the unfiltered `scanRawItems` result; the other four compilers keep the filtered list.
- **Wiring.** Extend `ALL_FOUR_SYNTHESIS_PAGES` (rename to `SYNTHESIS_PAGES`), the `writeSynthesisPage` switch and `BUCKET_SYNTHESIS_MAP`. Update `wiki-ingest-synthesis-parity.red.node.test.ts`'s expectations for which pages each bucket rewrites.
- **Lint.** `wiki lint` prints `warn: decisions-size` above 8,000 tokens, not counted as a finding (same warning channel STORY-063-09 adds).

### 3.3 API Contract (if applicable)

| Export | Signature | Consumer |
|---|---|---|
| `compile` | `(items: RawItem[], templateDir?: string) => string` | `wiki build`, `wiki ingest` |
| `latestDecisions` | `(items: RawItem[], n: number) => Array<{ id: string; date: string; text: string; supersedes: string[] }>` | STORY-063-11 (session brief) |

## Task Breakdown

- [ ] Write red tests for R1–R8, including the "does not supersede" negative and the orphan-answer case.
- [ ] Implement `decisions.ts` (`compile` + `latestDecisions`) and the template.
- [ ] Wire the page into ingest (page list, switch, bucket map) and build.
- [ ] Add the `decisions-size` lint warning.
- [ ] Update the synthesis-parity test expectations.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 9 | One per R1–R9. EPIC-063 verification level: unit. |
| Integration tests | 0 | No real infrastructure; build and ingest run against a temporary fixture repo inside the unit suite. |
| E2E / acceptance tests | 1 | Dogfood in the meta-repo after 0.30.0 (§2.2). EPIC-063 verification level: dogfood. The brief's use of `latestDecisions` is proven by STORY-063-12's truth oracle. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/wiki/synthesis/product-state.ts:14` `compile` and `:81-85` `resolveDefaultTemplateDir`. The compiler pattern to copy.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:565` `BUCKET_SYNTHESIS_MAP`, `:578` `ALL_FOUR_SYNTHESIS_PAGES`, `:623` `writeSynthesisPage`, `:645` `recompileSynthesis`. Where a new synthesis page is wired.
- **Surface:** `cleargate-cli/src/commands/wiki-build.ts:205-208`. Where build writes synthesis pages.
- **Surface:** `cleargate-cli/src/lib/wiki/contradict.ts:159-173` `commitPhase4Findings`. Writes the `contradictions.md` entries R5 reads.
- **Coverage of this requirement:** partial. The wiring is ≥ 80% extension; the decision extractor is new, built on 08's heading locator.

## Prior work

- [[EPIC-063]] — parent; this is story 063-10 (decisions page).
- [[EPIC-020]] — Wiki Contradiction Detection (Completed). Defined the `contradictions.md` entry shape R5 reads.
- [[CR-112]] — Heading-anchored predicates (Draft). Shares the need for a heading locator; 08 decides whether to reuse it.
- Depends on STORY-063-08 (heading locator `findSection`). Consumed by STORY-063-11.

## Why not simpler?

- **Smallest existing surface that could carry this:** the synthesis-page pattern: one compiler, one template, three wiring lines.
- **Why isn't extension / parameterization / config sufficient?** No existing page collects decisions. They sit in three different template sections, behind two marker spellings, across five item types. Grepping at question time is what the orchestrator does today, and it misses the supersession links and costs a read of every raw file. One compiled page is the smallest thing that answers "what has the owner already decided?" in a single read.

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
