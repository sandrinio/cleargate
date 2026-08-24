---
epic_id: EPIC-052
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-08-06T00:00:00Z
ambiguity: 🟢 Low
context_source: "direct-human-ask 2026-08-06 (\"draft epic 051\"). Proposal gate waived: sharp intent after a two-turn option-evaluation conversation in which the epic's scope was narrowed live — #4 (git status reconciliation) dropped on discovery that cleargate-cli/src/lib/lifecycle-reconcile.ts already ships it, and #5 (`cleargate research`) dissolved into a lint check rather than a new command. Inline references: cleargate-cli/src/lib/readiness-predicates.ts:124 (the prior-work-recorded pattern this epic mirrors), cleargate-cli/src/wiki/lint-checks.ts, cleargate-cli/src/commands/wiki-ingest.ts, .cleargate/config.yml:12-18. Waiver per ~/.claude memory feedback_proposal_gate_waiver.md. Originating evidence: a cross-repo field report where STORY-152-34's hand-written per-requirement SHIPPED/PARTIAL annotations were the only artifact that made 'is this done?' answerable — and existed by author diligence, not by contract."
owner: sandrinio
target_date: 2026-09-15
area: cli,templates,wiki
created_at: 2026-08-06T00:00:00Z
updated_at: 2026-08-06T00:00:00Z
created_at_version: 0.23.0
updated_at_version: 0.23.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-06T10:58:26Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-052
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-06T10:59:06Z
  sessions: []
---

# EPIC-052: Requirement-Level Grounding — Make "Is This Shipped?" Answerable

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make every requirement in an Epic, Story, CR, Bug, or Initiative carry a machine-checked status + code citation + locking test, and detect when those citations go stale.</objective>
  <architecture_rules>
    <rule>Must extend the existing readiness-predicate registry in cleargate-cli/src/lib/readiness-predicates.ts — mirror the closed-set shape of prior-work-recorded (:124), do not invent a parallel validation path.</rule>
    <rule>Must extend the existing wiki lint pass in cleargate-cli/src/wiki/lint-checks.ts — evidence verification is a lint check, NOT a new top-level command.</rule>
    <rule>Evidence is ranked: executing a row's locking test is proof; resolving its file::symbol is only a staleness tripwire. Never present symbol resolution as proof that a requirement shipped.</rule>
    <rule>Citations are required only for rows claiming SHIPPED or PARTIAL. Never require a citation for a SPECIFIED/OPEN/BLOCKED row — that would force authors to invent evidence for unwritten code.</rule>
    <rule>The relevance judge (WS6) is advisory and stays advisory. It must never gate a promotion or exit non-zero.</rule>
    <rule>No changes to cleargate-cli/src/lib/lifecycle-reconcile.ts — git-based status reconciliation already ships; EPIC-043 WS5 deliberately marked its command hidden:true. Do not unhide, do not duplicate.</rule>
    <rule>No changes to the MCP push payload or adapter surface. Grounding is a local planning artifact; what pushes to the server is unchanged.</rule>
    <rule>Templates edited under .cleargate/templates/ MUST be mirrored to cleargate-planning/.cleargate/templates/ in the same commit — canonical edits do not auto-propagate.</rule>
    <rule>Depends on CR-103. Do not start before it merges: a grounding table rendered through the current 200-char page builder is truncated to nothing.</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/templates/epic.md" action="modify" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".cleargate/templates/CR.md" action="modify" />
    <file path=".cleargate/templates/Bug.md" action="modify" />
    <file path=".cleargate/templates/initiative.md" action="modify" />
    <file path="cleargate-cli/src/lib/readiness-predicates.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/lint-checks.ts" action="modify" />
    <file path="cleargate-cli/src/commands/wiki-ingest.ts" action="modify" />
    <file path=".cleargate/knowledge/readiness-gates.md" action="modify" />
    <file path=".cleargate/config.yml" action="modify" />
    <file path=".claude/agents/cleargate-wiki-contradict.md" action="modify" />
    <file path="cleargate-cli/src/commands/wiki-contradict.ts" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

The planning layer can say an item *exists*. It cannot say whether the thing the item describes is *shipped*. Today that answer is reconstructed by hand — read the raw item, grep the source, guess — and the reconstruction is thrown away each time. In the originating field report, four items were checked against the code and **three had statuses that contradicted the repository**; the one artifact that made the question tractable was a hand-written per-requirement table with `file::symbol` citations, which existed because one author happened to write it well.

The failure is not that authors are careless. It is that nothing in ClearGate *asks* for requirement-level grounding, so it appears only by accident, and when it does appear nothing keeps it honest as the code moves underneath it.

**Success Metrics (North Star):**

- **M1 — Contract exists:** 100% of newly-authored Epics, Stories, CRs, Bugs, and Initiatives promoted to 🟢 carry a `## Grounding` table in which every row has a status and either an evidence citation or an explicit `OPEN`. Enforced by predicate, not by review.
- **M2 — Claims are proved, not asserted:** every row claiming `SHIPPED` names a locking test, and `cleargate wiki lint` executes it. Target: zero `SHIPPED` rows whose locking test is missing or failing.
- **M2b — Decay is detected:** `cleargate wiki lint` reports every grounding citation whose `file::symbol` no longer resolves in the tree. Target: zero unreported stale citations across the delivery corpus.
- **M3 — Awareness is answerable:** a reader can determine per-requirement shipped-state for any epic from the wiki alone, without opening the source tree. Measured by the story-digest bucket existing and carrying the grounding table.
- **M4 — No status contradiction:** re-running the originating audit finds zero items whose grounding rows claim SHIPPED for a symbol that does not exist.
- **M5 — Irrelevant citations surface:** the WS6 relevance judge runs across the grounded corpus and its findings are reviewed at retro. This metric is deliberately qualitative — the target is that the judge is *consulted*, not that it reports zero findings, since a judge that never fires is indistinguishable from one that is not running.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] **WS1 — Grounding table as template contract, with an explicit lifecycle.** Add a `## Grounding` section to **all five work-item templates** — `.cleargate/templates/{epic,story,CR,Bug,initiative}.md` (+ the `cleargate-planning/` mirrors), per D2. Row shape: requirement id (`R1`…), one-line statement, status from the closed set `SPECIFIED | SHIPPED | PARTIAL | OPEN | BLOCKED`, evidence citation (`path/to/file.ts::symbolName`), and the **locking test** — a test id or path that proves the requirement. Unnumbered heading, matching the `## Existing Surfaces` convention that EPIC-043 WS6 settled.

  **Bugs and Initiatives are included deliberately (D2).** A Bug's "fixed" claim is exactly the assertion that went stale in the originating field report — one Bug read `Triaged` while its fix was merged. For Bugs the requirement rows are the reproduction conditions and the fix; for Initiatives they are the stated outcomes. The lifecycle below applies unchanged.

  **Requirement IDs are STABLE, never renumbered, never reused (D7).** `R3` identifies the same requirement for the life of the document, so a Story may cite its parent's `EPIC-052::R3` and traceability runs epic → story → commit. Stability is maintained by a `next_requirement_id` counter in frontmatter: allocate, increment, never renumber existing rows when one is inserted or removed. This is a **convention plus a counter**, not a dependency on tooling — an allocator makes it ergonomic but the counter alone makes it correct. See the Prior work note on the separate ID-allocator item.

  **The table has two moments, and the contract must say so.** At *authoring* time almost nothing is built, so rows are `SPECIFIED` or `OPEN` and carry **no** citation — demanding one here would push authors to invent citations for unwritten code, which is the precise failure this epic exists to kill. Citations and locking tests become **required only when a row claims `SHIPPED` or `PARTIAL`**, which happens at story close. The template must carry this as instruction text, not leave it implicit, and WS2's predicate must enforce it asymmetrically (see WS2).
- [ ] **WS2 — `grounding-recorded` readiness predicate, enforced asymmetrically by status.** Extend the registry in `cleargate-cli/src/lib/readiness-predicates.ts`, mirroring the closed-set shape of `prior-work-recorded` (:124). Register it in `.cleargate/knowledge/readiness-gates.md` for the **epic, story, CR, bug, and initiative** gate blocks (+ mirror), per D2.

  **Advisory for exactly one sprint, then enforcing (D6)** — flipped at the retro where the corpus is reviewed. Landing it blocking against a corpus with zero grounding tables would wedge every in-flight promotion; leaving it advisory longer reproduces EPIC-043 WS8's failure class, a gate that never gates.

  The check follows WS1's two moments, so authoring is never blocked on evidence that cannot exist yet:
  - Row status `SPECIFIED` / `OPEN` / `BLOCKED` → **no citation required.** Passes.
  - Row status `SHIPPED` / `PARTIAL` → **citation and locking test both required.** Missing either fails, naming the requirement id.
  - `## Grounding` section present but empty, or rows with a status outside the closed set → fails.

  Path extraction and existence checking reuse the machinery `existing-surfaces-verified` already runs at `cleargate-cli/src/lib/readiness-predicates.ts:874-952` (sandbox-check + `fs.existsSync` per unique cited path) rather than introducing a second path-resolution implementation.
- [ ] **WS3 — Evidence verification in `wiki lint` — the locking test is the anchor, not the symbol.** Add a grounding check to `cleargate-cli/src/wiki/lint-checks.ts` with two tiers of evidence, deliberately ranked:

  **Tier 1 (proof) — execute the locking test.** For a row claiming `SHIPPED`, run the test it names. A passing named test is the only *mechanical* proof that the described behavior exists; it is the sole signal in this epic that survives refactors, renames, and deletions. A `SHIPPED` row whose locking test fails or cannot be found is the highest-severity grounding finding.

  **Execution is scoped to changed files (D4).** A locking test runs only when its cited file has changed since the last lint, reusing the git-SHA drift detection the wiki already performs. This keeps the proof honest without paying for it on every gate invocation. It is the most complex of the three options and was chosen over the simpler opt-in flag deliberately: `wiki lint` runs at Gate 1 and Gate 3, and a lint pass slow enough to discourage running is the exact failure this epic exists to prevent. If scoped execution still proves too slow in practice, the fallback is an opt-in flag with a citation-only default — a documented retreat, not a redesign.

  **The locking test column accepts a test id or path only — never a command (D5).** It is resolved through the repo's configured runner (`gates.test` in `.cleargate/config.yml`). A free-form command would turn a lint pass that runs at gates into an arbitrary-execution surface.

  **Tier 2 (liveness) — resolve the citation.** Assert the cited file exists and the symbol appears in it. This is a cheap staleness tripwire, not proof: it detects deletion and rename, and nothing else.

  **Resolution is a plain grep for the symbol name in the cited file (D3)** — not code-map extraction, not LSP. Downgraded from the code-map option once Tier 1 became the real proof: Tier 2 only needs to notice deletion and rename, so paying for symbol-resolution accuracy buys little. Path existence reuses the `fs.existsSync` machinery `existing-surfaces-verified` already runs at `cleargate-cli/src/lib/readiness-predicates.ts:874-952`.

  **State plainly what neither tier proves: that the citation is *relevant* to the requirement.** A live symbol in a live file supports no claim by itself. That gap is WS6's, and it is not closable by static analysis.

  This is the entire value a `cleargate research` command would have delivered, placed where the gates lint already guards run it automatically — because the failure mode being addressed is *forgetting to look*, which a new verb cannot fix.
- [ ] **WS4 — Story digests in the wiki.** Ingest stories as a bounded digest rather than a full page or nothing: id, parent, status, and the grounding table — nothing else. Adds the missing awareness layer at roughly 20 lines per story instead of the 25KB a full page would cost. Requires a digest render path in `cleargate-cli/src/commands/wiki-ingest.ts` and a config surface in `.cleargate/config.yml` (+ mirror) distinct from the existing all-or-nothing `wiki.ingest_buckets`.

  **The config surface is a NEW key, `wiki.digest_buckets: [stories]` (D1)** — not a mode added to `ingest_buckets` entries. This keeps `ingest_buckets` a plain list so no existing downstream config changes shape, and it reflects that digest-vs-full is a different axis from which-buckets-compile. Adding `stories` to `ingest_buckets` remains what it is today: full pages, which `feedback_wiki_no_story_ingest` deliberately excluded.
- [ ] **WS5 — Authoring guidance.** One short section in `.cleargate/knowledge/cleargate-protocol.md` defining what a good grounding row is, so the predicate is not the only specification of the contract. Must state the WS1 lifecycle (no citations at authoring time) and the WS3 evidence ranking (locking test beats symbol citation) explicitly.

- [ ] **WS6 — Relevance judge (advisory).** Extend the shipped `cleargate-wiki-contradict` agent (`.claude/agents/cleargate-wiki-contradict.md` + the `cleargate-planning/` mirror, driven by `cleargate-cli/src/commands/wiki-contradict.ts`) to read grounding rows: given a requirement statement and its cited symbol, judge whether the symbol plausibly supports the claim, and emit a finding when it does not.

  **This closes the one gap no static check can reach.** A row citing a live symbol in a live file with a passing test can still be citing the *wrong* symbol — `R3 | SHIPPED | cli.ts::main | test/cli.node.test.ts` passes every mechanical check in WS2 and WS3 while proving nothing about R3. Existence is not support.

  **Advisory only, permanently — never blocking.** It is a judgment call rendered by a model, and EPIC-043 WS8 is the standing precedent for what happens to a gate that emits findings people learn to waive. It reports; a human decides. Reuses the existing contradiction-finding output format so no new reporting surface is introduced.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- **A `cleargate research` command.** Evaluated and rejected during drafting: its chain decomposes into one existing command (`wiki query`), one file Read, one check that is WS3, and one existing subagent (`cleargate-wiki-query`). A new verb adds a thing to remember; the failure mode it targets is *forgetting*. WS3 in lint runs whether or not anyone remembers.
- **Any change to git-based status reconciliation.** `cleargate-cli/src/lib/lifecycle-reconcile.ts` and `cleargate-cli/src/commands/wiki-audit-status.ts` already ship this. Not extended, not unhidden, not duplicated.
- **Backfilling grounding tables into the ~150 archived items.** New and in-flight items only. A retro-fit pass is a separate decision with its own cost.
- **Full story pages in the wiki.** WS4 ships digests specifically because full pages were excluded for good reason (granularity, token cost). This does not reverse `feedback_wiki_no_story_ingest`; it adds a bounded middle.
- **Changing the MCP push payload, adapter surface, or `items` store schema.** Grounding is local.
- **Wiki page-body/index defects.** Owned by [[CR-103]]. This epic consumes that fix and must not re-open it.
- **Enforcing grounding at push time.** The predicate gates 🟢 promotion; `cleargate push` behavior is unchanged.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| **Sequencing** | Hard dependency on [[CR-103]]. The current page builder truncates at 200 chars, so a grounding table would never reach the wiki. WS4 cannot be verified before CR-103 merges. |
| **Mirror discipline** | Every `.cleargate/templates/**` and `.cleargate/knowledge/**` edit must land in `cleargate-planning/.cleargate/**` in the same commit. This is the single most-repeated failure in this repo (see the Dogfood split rule in CLAUDE.md). |
| **Predicate/template heading match** | EPIC-043 WS6 fixed a recurring bug where templates shipped numbered headings while predicates matched unnumbered ones. `## Grounding` must be unnumbered in the template and matched unnumbered in the predicate. |
| **Positional section indexing** | `readiness-gates.md` criteria use positional `section(N)` indices. Inserting `## Grounding` shifts every heading after it. Existing epic criteria `scope-in-populated: section(3)` and `affected-files-declared: section(5)` must be re-verified after insertion, or place `## Grounding` last among the unnumbered sections. |
| **False-positive cost** | WS3's symbol check must tolerate legitimate non-symbol citations (config keys, markdown anchors, file-level references). A lint that cries wolf gets waived, and a waived gate is EPIC-043 WS8's exact failure class. |
| **Lint wall-time** | WS3 Tier 1 executes tests, so `cleargate wiki lint` acquires a runtime cost proportional to the number of `SHIPPED` rows. Lint runs at Gate 1 and Gate 3; it cannot become slow enough that people stop running it. Execution must be scoped to the named test (never a full-suite run) and is a candidate for opt-in via flag if the scoped cost still proves too high. Interacts directly with EPIC-031 (test-suite wall-time reduction). |
| **Judgment is not a gate** | WS6 renders a model judgment and must stay advisory forever. EPIC-043 WS8 catalogues what happens to gates that emit findings people learn to waive; a non-deterministic blocking gate is strictly worse than that. |
| **Token budget** | WS4 digests are a wiki-size increase on every story. At ~20 lines each, the session-start read cost must stay materially below what full story pages would have cost — that ratio is the design constraint, not raw size. |
| **Advisory vs enforcing** | `grounding-recorded` starts `severity: advisory` for one sprint, then flips to `enforcing`. Landing a blocking predicate against a corpus with zero grounding tables would wedge every in-flight promotion. |
| **Test runner** | node:test only, `*.node.test.ts`, via `tsx --test`. vitest is forbidden. |

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:124` — `prior-work-recorded`, a closed-set no-parameter predicate. WS2's `grounding-recorded` is the same shape; this is the pattern to copy, not to redesign.
- **Surface:** `cleargate-cli/src/wiki/lint-checks.ts` — the existing wiki lint check set, already wired into Gate 1 and Gate 3 via `cleargate-cli/src/commands/wiki-lint.ts`. WS3 adds one check here and inherits the gate wiring for free.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts` — the ingest path and page writer. WS4 adds a digest render mode alongside the existing full-page path.
- **Surface:** `cleargate-cli/src/wiki/derive-bucket.ts` — maps a raw item to its wiki bucket; the insertion point for a story-digest bucket.
- **Surface:** `.cleargate/config.yml:12-18` — `wiki.ingest_buckets`, currently all-or-nothing per bucket and omitting `stories`. WS4 needs a digest-mode surface here rather than simply adding `stories` to this list.
- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts` — already computes status drift from git commit subjects (`parseCommitMessage`, `VERB_STATUS_MAP`). Cited as evidence for the OUT-OF-SCOPE decision, not as a modification target.
- **Surface:** `cleargate-cli/src/commands/wiki-audit-status.ts` — already audits and `--fix`es frontmatter status drift. Second piece of evidence that the status half of the original proposal is built.
- **Surface:** `.cleargate/templates/epic.md:117` — the `## Existing Surfaces` section, precedent for an unnumbered machine-checked section backed by a predicate. `## Grounding` follows this exact convention.
- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:874-952` — the path-extraction and `fs.existsSync` machinery behind `existing-surfaces-verified` (sandbox-check + stat per unique cited path). WS2 and WS3 Tier 2 reuse this rather than writing a second path resolver.
- **Surface:** `cleargate-cli/src/commands/wiki-contradict.ts` and `.claude/agents/cleargate-wiki-contradict.md` (+ `cleargate-planning/.claude/agents/cleargate-wiki-contradict.md`) — the shipped advisory contradiction-check agent, already exit-0-always with a `contradiction:` finding format. WS6 extends this agent with a grounding-relevance mode; it is not a new agent and not a new reporting surface.
- **Coverage of this epic's scope:** **partial — roughly 55%.** Every enforcement surface this epic needs already exists and is extended rather than rebuilt: the predicate registry (WS2), the path-resolution machinery (WS2, WS3 Tier 2), the lint pass and its gate wiring (WS3), the ingest render path (WS4), and the advisory judge agent (WS6). What does not exist anywhere is **the artifact itself** — no template asks for a requirement→status→evidence row, so there is nothing for any of that machinery to check. WS1 is the only genuinely net-new surface; WS3 Tier 1 (executing a named locking test from lint) is the only net-new *mechanism*. Everything else is extension.

## Prior work

- [[CR-103]] — Wiki Page & Index Fidelity. Hard upstream dependency; fixes the truncation and title resolution that would otherwise swallow the grounding table.
- [[PROPOSAL-002]] — original Knowledge Wiki design; established `ingest_buckets` and the wiki-query synthesis split that WS3/WS4 work within.
- [[EPIC-032]] / [[STORY-032-02]] — Code Map Awareness Layer and its page schema. Nearest prior art: it maps *code* into the wiki; this epic maps *requirements onto* code. Complementary, not overlapping — WS3's symbol check should reuse the code-map symbol extraction if it fits.
- [[EPIC-043]] — Framework Hygiene. WS5 (hidden plumbing commands) and WS6 (template/predicate heading match) both constrain this epic; WS8 is the cautionary precedent for gates that emit a false signal.
- [[STORY-043-07]] — Incremental Wiki Synthesis Recompile; adjacent work in `wiki-ingest.ts`.
- [[CR-063]] — Ingest Sprint Reports Into Wiki; precedent for adding a second render mode to the ingest path, which is structurally what WS4 does.
- No prior item defines requirement-level grounding, a citation-liveness check, or a story-digest bucket.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `cleargate-cli/src/lib/readiness-predicates.ts` carries WS2 outright, and `cleargate-cli/src/wiki/lint-checks.ts` carries WS3 outright. Neither can carry WS1 — a predicate can only check a section that a template asks authors to write.
- **Why isn't extension / parameterization / config sufficient?** For three of five workstreams it *is*, and the epic is deliberately written that way: WS2, WS3, and WS4 are extensions of shipped registries with no new abstraction and no new command. The irreducible net-new part is small and unavoidable — a `## Grounding` section in three templates, because the data does not exist anywhere today. The originating proposal asked for a new `cleargate research` command; that was rejected precisely on this test, since its value decomposed entirely into existing surfaces plus one lint check. What remains cannot be reduced further: without the template section there is nothing to check, and without the liveness check the section rots into confident lies, which is worse than absence. The epic is six workstreams rather than one because the contract, its enforcement, its proof, its decay detection, its publication, and its relevance check are genuinely separable and independently shippable — WS1+WS2 deliver value alone if WS3–WS6 slip.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**

- `.cleargate/templates/epic.md` — add `## Grounding` section + `next_requirement_id` frontmatter (WS1)
- `.cleargate/templates/story.md` — same (WS1)
- `.cleargate/templates/CR.md` — same (WS1)
- `.cleargate/templates/Bug.md` — same; requirement rows are repro conditions + fix (WS1, D2)
- `.cleargate/templates/initiative.md` — same; requirement rows are stated outcomes (WS1, D2)
- `cleargate-planning/.cleargate/templates/{epic,story,CR,Bug,initiative}.md` — canonical mirrors, same commit (WS1)
- `cleargate-cli/src/lib/readiness-predicates.ts` — add `grounding-recorded` to `ParsedPredicate` union, `parsePredicate`, and `evaluate` (WS2)
- `.cleargate/knowledge/readiness-gates.md` — register the criterion in the epic, story, CR, bug, and initiative gate blocks; re-verify positional `section(N)` indices for each (WS2, D2)
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — mirror (WS2)
- `cleargate-cli/src/wiki/lint-checks.ts` — add the two-tier evidence check: execute locking tests, resolve citations (WS3)
- `cleargate-cli/src/commands/wiki-lint.ts` — surface grounding findings in the lint report, ranked by tier (WS3)
- `.claude/agents/cleargate-wiki-contradict.md` + `cleargate-planning/.claude/agents/cleargate-wiki-contradict.md` — grounding-relevance mode, advisory (WS6)
- `cleargate-cli/src/commands/wiki-contradict.ts` — pass grounding rows to the judge (WS6)
- `cleargate-cli/src/commands/wiki-ingest.ts` — digest render path for stories (WS4)
- `cleargate-cli/src/wiki/derive-bucket.ts` — story-digest bucket routing (WS4)
- `.cleargate/config.yml` + `cleargate-planning/.cleargate/config.yml` — digest-mode config surface (WS4)
- `.cleargate/knowledge/cleargate-protocol.md` + mirror — authoring guidance (WS5)
- `cleargate-cli/test/wiki/*.node.test.ts`, `cleargate-cli/test/lib/*.node.test.ts` — coverage for WS2/WS3/WS4

**Data Changes:**

- No database or store changes. Grounding rows are markdown in raw work items; digests are files under `.cleargate/wiki/`. The MCP `items` store and push payload are untouched.

## 5. Acceptance Criteria

```gherkin
Feature: Requirement-Level Grounding

  Scenario: Grounding table blocks an ungrounded green promotion
    Given an Epic whose "## Grounding" section has a row with status "SHIPPED" and no evidence citation
    When the readiness gate evaluates the document for promotion to green
    Then the "grounding-recorded" criterion fails
    And the failure names the offending requirement id

  Scenario: Explicit OPEN status is accepted without a citation
    Given a Story whose "## Grounding" rows are all status "OPEN" with no evidence citations
    When the readiness gate evaluates the document
    Then the "grounding-recorded" criterion passes
    And no citation is fabricated on the document's behalf

  Scenario: Stale citation is reported by lint
    Given a merged Epic whose grounding row cites "cleargate-cli/src/foo.ts::handleThing"
    And that symbol no longer exists in the tree
    When "cleargate wiki lint" runs
    Then the run reports the item id, the requirement id, and the dead citation
    And the run exits non-zero in enforce mode

  Scenario: Live citation passes lint
    Given a grounding row citing a path and symbol that both resolve in the tree
    When "cleargate wiki lint" runs
    Then no grounding finding is emitted for that row

  Scenario: SHIPPED row whose locking test fails is the highest-severity finding
    Given a grounding row with status "SHIPPED" naming a locking test
    And that test fails when executed
    When "cleargate wiki lint" runs
    Then a Tier 1 grounding finding is emitted naming the requirement id and the test
    And the finding outranks any Tier 2 citation finding in the report
    And the run exits non-zero in enforce mode

  Scenario: SHIPPED row naming a test that does not exist
    Given a grounding row with status "SHIPPED" whose locking test cannot be located
    When "cleargate wiki lint" runs
    Then a Tier 1 grounding finding is emitted
    And the finding distinguishes "test not found" from "test failed"

  Scenario: Locking test execution is scoped, never a full-suite run
    Given a grounding row naming a single locking test
    When "cleargate wiki lint" executes it
    Then only that test is run
    And the surrounding suite is not invoked

  Scenario: Authoring-time row is never asked for evidence it cannot have
    Given a newly drafted Epic whose grounding rows are all "SPECIFIED"
    And no citation or locking test is present on any row
    When the readiness gate evaluates the document for promotion to green
    Then the "grounding-recorded" criterion passes

  Scenario: Error — malformed grounding row is rejected, not silently skipped
    Given a grounding row whose status is outside the closed set
    Or a row whose evidence cell cannot be parsed into a path
    When the readiness gate evaluates the document
    Then the "grounding-recorded" criterion fails naming the malformed row
    And the row is never treated as if it passed

  Scenario: Error — cited file is outside the repository sandbox
    Given a grounding row citing an absolute path outside the project root
    When lint resolves the citation
    Then the citation is rejected as out-of-sandbox
    And no file outside the project root is read or executed

  Scenario: Error — locking test execution fails to launch
    Given a grounding row whose locking test cannot be executed because the runner errors
    When "cleargate wiki lint" runs
    Then the failure is reported as a runner error, distinct from a failing test
    And lint does not report the requirement as proved

  Scenario: Relevance judge reports an irrelevant but live citation
    Given a grounding row whose requirement text is unrelated to its cited symbol
    And the cited file, symbol, and locking test all resolve and pass
    When the relevance judge runs
    Then an advisory finding is emitted naming the requirement id and the citation
    And the judge exits zero
    And no promotion is blocked

  Scenario: Non-symbol citation does not produce a false positive
    Given a grounding row whose evidence cites a config key or a file with no symbol suffix
    When "cleargate wiki lint" runs
    Then the file existence is checked
    And no symbol-resolution finding is emitted for that row

  Scenario: Story digest carries the grounding table and nothing else
    Given a Story with a populated "## Grounding" section
    When the story is ingested into the wiki
    Then a digest page is written containing id, parent, status, and the grounding table
    And the digest omits the story's remaining body sections

  Scenario: Advisory rollout does not wedge in-flight items
    Given the corpus contains items authored before this epic with no "## Grounding" section
    When the readiness gate evaluates them while the criterion severity is advisory
    Then promotion is not blocked
    And the absence is reported as advisory output
```

## 6. AI Interrogation Loop (Human Input Required)

_Empty — the loop is closed. All seven questions were answered by the owner on 2026-08-06 and their
decisions are integrated into §2 (workstreams), §3 (constraints), §4 (affected files), and §5
(acceptance criteria). The audit trail is preserved below under **Resolved Decisions**._

## Resolved Decisions

> Decision record. Each entry names the choice and what was rejected. Referenced from the
> workstreams as D1–D7.

| # | Decision | Chosen | Rejected |
|---|---|---|---|
| **D1** | Config surface for story digests | **New key `wiki.digest_buckets: [stories]`.** | A mode on `ingest_buckets` entries — would change the shape of every existing downstream config. |
| **D2** | Which types carry a grounding table | **All five: Epic, Story, CR, Bug, Initiative.** Owner widened this from the recommended Epic/Story/CR. | Epic/Story/CR only. A Bug's "fixed" claim is precisely what went stale in the originating field report. |
| **D3** | Tier 2 symbol resolution | **Plain grep for the symbol in the cited file.** | Code-map extraction; LSP. Tier 2 is a staleness tripwire, not proof — accuracy buys little once Tier 1 exists. |
| **D4** | When Tier 1 executes locking tests | **Always-on, scoped to rows whose cited file changed since the last lint**, reusing the wiki's git-SHA drift detection. | Always-on for every SHIPPED row (too slow at Gate 1/3); opt-in flag (retained only as a documented fallback). |
| **D5** | What the locking-test column accepts | **A test id or path only**, resolved through `gates.test`. | A free-form command — arbitrary execution inside a gate-time lint pass. |
| **D6** | Advisory duration for `grounding-recorded` | **Exactly one sprint**, flipped at the retro. | Immediate enforcement (wedges every in-flight promotion); indefinite advisory (EPIC-043 WS8's failure class). |
| **D7** | Requirement ID stability | **Stable, never renumbered, never reused**, maintained by a `next_requirement_id` frontmatter counter. Enables `EPIC-052::R3` cross-item citation. | Document-local IDs. The owner's ID-generator proposal dissolved the tradeoff — see below. |

**On D7 and the ID-generator idea.** The owner proposed generating IDs with a tool so agents do not
spend tokens managing them. That reframing is what made *stable* the cheap option rather than the
expensive one: stability needs a **convention plus a counter** (allocate, increment, never renumber),
which this epic ships, and a tool only makes it ergonomic. The tool itself is deliberately **not** in
this epic — it is cross-cutting, its larger value is allocating *work-item* IDs (EPIC/STORY/CR/BUG)
rather than requirement IDs, and there is direct evidence it is needed: on 2026-08-06 an agent
drafted a new EPIC-051 on top of the existing archived EPIC-051, because the free-ID scan covered
`pending-sync/` for epics but only `archive/` for CRs and Bugs. Verified absent: `cleargate story`
exposes only `start` and `complete`, and no next-id or allocator surface exists anywhere in
`cleargate-cli/src`. Filed separately.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Decomposition**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths. *(Every path was confirmed on disk during drafting; the `cleargate-planning/` mirrors and all `cleargate-cli/src/` targets were listed directly from the filesystem.)*
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec). *(Literally empty of questions — the seven were answered 2026-08-06, integrated into §2/§3/§4/§5, and the audit trail moved to a separate `## Resolved Decisions` section so §6 itself carries none.)*
- [x] 0 "to-be-determined" markers exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

**Note on the Proposal gate:** `parent_ref` is null. Waived per the recorded `proposal_gate_waiver`
frontmatter and `~/.claude` memory `feedback_proposal_gate_waiver.md` — direct human ask with sharp
intent, inline source references, and live scope narrowing across the preceding two turns.

**Decomposition note:** stories are not yet cut. On promotion this decomposes to roughly
STORY-052-01 (WS1 templates + lifecycle instruction text + mirrors), STORY-052-02 (WS2 predicate +
asymmetric status enforcement + gate registration), STORY-052-03 (WS3 Tier 1 — locking-test
execution in lint), STORY-052-04 (WS3 Tier 2 — citation resolution + finding rank),
STORY-052-05 (WS4 digest ingest + config), STORY-052-06 (WS5 protocol guidance),
STORY-052-07 (WS6 relevance judge). Run the Granularity Rubric at decomposition time. WS3 is
already split here because Tier 1 and Tier 2 differ in mechanism, cost, and severity — Tier 1
executes and proves, Tier 2 stats and warns.

**Value ordering if the epic is trimmed:** WS1 + WS2 deliver standalone value — the contract and
its enforcement — and are the minimum viable slice. WS3 Tier 1 is the highest-value single addition
after that, because it is the only mechanism in the epic that proves anything. WS4 and WS6 are
genuinely optional; WS5 is documentation that should follow whatever ships.
